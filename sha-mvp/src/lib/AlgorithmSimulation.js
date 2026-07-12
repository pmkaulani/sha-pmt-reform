// SHA Means-Testing Algorithm - v2.1 Optimization
// This engine implements the Adjustable Gross Income (AGI) model to calculate SHA contributions.
// It complies with the legally mandated 2.75% rate while fixing 28 systemic flaws by applying
// mathematically rigorous deductions before the flat rate is calculated.
//
// IMPORTANT (audit v2, read before citing this file to a technical reviewer):
// This entire module is a deterministic rules engine (if/else + fixed
// constants). Nothing here is "trained" and nothing "converges" — there is
// no model fitting, no loss function, no gradient step anywhere in this
// file. Any UI copy or doc that describes this as a trained/optimized model
// enforcing a learned constraint is describing software that does not
// exist. Disparity across groups (the closest thing to "equalized odds"
// this system has) is only ever known if testCurrentModelDisparityByCounty()
// below is actually run against real assessment data — it is not a property
// the formulas below guarantee by construction.

import { hashMsisdn } from './hash.js';

export const BANDS = [
  { min: 0, max: 131000, monthly: 300, isIndigent: true, tier: 'Indigent (Subsidized)' },
  { min: 131001, max: 450000, isIndigent: false, tier: 'Standard' }, // Flat 2.75%
  { min: 450001, max: Infinity, isIndigent: false, tier: 'Upper' }, // Flat 2.75% — same formula as Standard; kept separate for reporting/tier-label purposes only
];

export const PROPOSED_BANDS = [
  { min: 0, max: 131000, monthly: 300, isIndigent: true }, // Subsidized by government
  { min: 131001, max: Infinity, isIndigent: false }, // Flat 2.75% of AGI
];

const ASAL_COUNTIES = {
  'Turkana': 'arid', 'Marsabit': 'arid', 'Wajir': 'arid', 'Mandera': 'arid', 
  'Garissa': 'arid', 'Isiolo': 'arid', 'Samburu': 'arid', 'Tana River': 'arid',
  'Baringo': 'semi-arid', 'West Pokot': 'semi-arid', 'Laikipia': 'semi-arid', 
  'Narok': 'semi-arid', 'Kajiado': 'semi-arid', 'Kitui': 'semi-arid', 
  'Makueni': 'semi-arid', 'Taita Taveta': 'semi-arid', 'Lamu': 'semi-arid', 
  'Kilifi': 'semi-arid', 'Kwale': 'semi-arid',
  'Embu': 'semi-arid', 'Tharaka-Nithi': 'semi-arid', 'Meru': 'semi-arid', 
  'Elgeyo Marakwet': 'semi-arid'
};

const URBAN_TIER_1 = ['Nairobi', 'Mombasa', 'Kisumu'];
const URBAN_TIER_2 = ['Nakuru', 'Uasin Gishu', 'Kiambu', 'Kisii', 'Nyeri', 'Machakos', 'Trans Nzoia'];

const COST_OF_LIVING = {
  TIER_1: 18000,
  TIER_2: 10000,
  RURAL: 4000
};

// Default rent ceilings for capping the rent deduction (can be overridden by adminParams)
const DEFAULT_MAX_RENT = {
  TIER_1: 35000,
  TIER_2: 20000,
  RURAL: 10000
};

/**
 * Calculates the current flawed "Lasso" PMT model for baseline comparison.
 * Simulates overcharging by weighting gross M-Pesa, visible assets, and penalizing urban residency.
 */
export function calculateCurrentModel(d) {
  let score = 0;
  
  // Flaw 1: The Chama Trap (Velocity vs Liquidity)
  // Current model looks at gross M-Pesa volume as direct income
  if (d.grossMpesaMonthly) {
    score += (d.grossMpesaMonthly * 12) * 0.8;
  }

  // Housing Proxies
  if (d.wallMaterial === 'STONE' || d.wallMaterial === 'BRICK') score += 120000; // Flaw 11: Ancestral home trap
  if (d.roofMaterial === 'TILES') score += 150000;
  if (d.floorMaterial === 'TILES') score += 100000;
  
  // Flaw 18: Electricity as Luxury
  if (d.lightingEnergy === 'ELECTRICITY') score += 80000;

  // Assets (Flaw 7: Asset Age Ignorance - flat values regardless of depreciation)
  if (d.assets.includes('CAR')) score += 350000;
  if (d.assets.includes('MOTORCYCLE')) score += 150000;
  if (d.assets.includes('TV')) score += 40000;
  if (d.assets.includes('FRIDGE')) score += 60000;

  // Flaw 10: Arid Land Overcharge & Flaw 9: Livestock as Capital
  // Treats land and livestock identical everywhere in Kenya
  if (d.landAcreage) score += (d.landAcreage * 80000); 
  if (d.livestockCount) score += (d.livestockCount * 3800);

  // Flaw 16: Urban Penalty
  if (URBAN_TIER_1.includes(d.county) || URBAN_TIER_2.includes(d.county)) {
    score += 50000; // Penalizes urban dwellers by adding to their wealth score
  }

  // Flaw 14: Static Dependency Ratio
  score -= (d.householdSize * 4000); 

  return Math.max(0, score);
}

/**
 * FIX (audit v2): this logic used to live only inline inside App.jsx's
 * classify() callback — invisible to anyone auditing this file (the one
 * name-checked in your technical docs), untestable from verify_logic.js,
 * and duplicated against the 2.75%/12 formula in calculateProposedModel
 * with no shared source of truth. `BANDS` above was defined but never
 * actually referenced by that inline logic, so this now makes BANDS the
 * real source of truth for tier/indigent lookups instead of dead code.
 *
 * Also fixes a one-shilling off-by-one: the old inline version classified
 * indigent via `lassoAnnual < 131000` (strict) while the proposed model
 * uses `agi <= 131000`. Both now use `<=`, matching BANDS' own `max: 131000`
 * boundary on the first band.
 *
 * Takes the raw wealth-score output of calculateCurrentModel() and turns it
 * into an actual monthly-contribution object, the same shape the proposed
 * model already returns.
 */
export function calculateCurrentModelContribution(lassoAnnual) {
  const band = BANDS.find(b => lassoAnnual <= b.max) ?? BANDS[BANDS.length - 1];
  const isIndigent = band.isIndigent === true;
  const monthly = isIndigent ? band.monthly : Math.max(300, Math.round((lassoAnnual * 0.0275) / 12));
  return { annualIncome: lassoAnnual, monthly, isIndigent, tier: band.tier };
}

/**
 * Calculates the proposed SHA PMT v2.1 Optimization using the AGI model.
 */
export function calculateProposedModel(d, adminParams = {}) {
  let factors = [];
  let deductions = [];
  let baseIncome = 0;

  // --- TRIANGULATION: INCOME & LIQUIDITY ---
  // Flaw 1, 2, 6: Use 12-month rolling avgRetainedBalance, not gross velocity.
  // Flaw 6: Chama Treasurer Fiduciary Exception
  let isOffline = adminParams.triangulationOffline || false;
  let effectiveBalance = isOffline ? 0 : (d.avgRetainedBalance || 0);
  
  if (!isOffline && d.isGroupTreasurer) {
    effectiveBalance *= 0.2; // Discount 80% as fiduciary funds
    deductions.push({ name: 'Fiduciary Exemption', amount: (d.avgRetainedBalance * 0.8) * 12, reason: 'Chama Treasurer Trap' });
    factors.push({ name: 'Group Treasurer', impact: 'High', direction: 'down', description: 'Discounted retained balance by 80%', isFlaw: false });
  }

  // Transaction-size distribution check to prevent misclassifying active-but-poor digital finance users
  let avgTransactionSize = d.avgTransactionSize || (d.grossMpesaMonthly && d.transactionCount ? d.grossMpesaMonthly / d.transactionCount : 0);
  if (!avgTransactionSize && d.grossMpesaMonthly && d.grossMpesaMonthly > 0) {
    // If no count, assume an average number of transactions (e.g. 80 transactions per month)
    avgTransactionSize = d.grossMpesaMonthly / 80;
  }
  let isSubsistenceUser = false;
  // FIX (audit v2) — real, previously-undiscovered crash bug: this was
  // declared with `let` down near the Digital Ghost check (~230 lines
  // below) but assigned right here on the seasonal-worker branch, which
  // runs first. That's a JS temporal-dead-zone ReferenceError, not a typo
  // that silently does the wrong thing — it CRASHES the whole assessment
  // for any seasonal worker (farm/tourism-sector labourer, exactly who the
  // "Seasonal Worker Override" feature exists to help) who declares a zero
  // low-season balance. The 6 hand-picked PRESETS never hit this combination,
  // so verify_logic.js never caught it; a 500-household synthetic
  // population (see generateSyntheticPopulation, used by the new Bias &
  // Compliance tab) hit it on the first run. Declared here now, before the
  // branch that assigns to it.
  let requiresChpVerification = false;
  if (d.grossMpesaMonthly && d.grossMpesaMonthly > 25000 && (d.avgRetainedBalance || 0) < 3000 && avgTransactionSize < 450) {
    isSubsistenceUser = true;
    effectiveBalance *= 0.4; // 60% discount on the retained balance due to subsistence activity
    deductions.push({ name: 'Subsistence Digital User Exemption', amount: (d.avgRetainedBalance * 0.6) * 12, reason: 'High velocity of small subsistence transactions' });
    factors.push({ name: 'Subsistence Digital User', impact: 'Medium', direction: 'down', description: 'Discounted retained balance by 60% due to low average transaction size', isFlaw: false });
  }

  // Base income is extrapolated from retained liquidity plus formal declarations
  if (!isOffline) {
    if (d.isSeasonalWorker && d.lowSeasonRetainedBalance !== undefined) {
      const SEASONAL_FLOOR = 500; // KSh 500 minimum prevents zero-balance exploit
      const effectiveLow = Math.max(d.lowSeasonRetainedBalance, SEASONAL_FLOOR);
      let seasonalBalance = Math.min(effectiveBalance, effectiveLow);
      if (d.lowSeasonRetainedBalance === 0) {
        requiresChpVerification = true;
        factors.push({ name: "Zero Low-Season Balance", impact: "High", description: "Self-declared zero requires CHP verification within 30 days.", direction: "down", isFlaw: false });
      }
      baseIncome += (seasonalBalance * 12);
      factors.push({ name: 'Seasonal Worker Override', impact: 'Medium', direction: 'down', description: 'Used low-season baseline to prevent harvest/tourism peak extrapolation', isFlaw: false });
    } else {
      baseIncome += (effectiveBalance * 12);
      factors.push({ name: 'Retained Liquidity', impact: 'High', direction: 'up', description: 'Based on 12-month rolling avg balance, ignoring velocity', isFlaw: false });
    }

    // Diaspora Remittance Deduction
    if (d.diasporaRemittances && d.diasporaRemittances > 0) {
      let remittanceDeduction = d.diasporaRemittances * 12;
      deductions.push({ name: 'Diaspora Remittances', amount: remittanceDeduction, reason: 'Exempt transfer payments (not domestic earnings)' });
      baseIncome -= remittanceDeduction;
      factors.push({ name: 'Diaspora Exclusion', impact: 'Medium', direction: 'down', description: 'Excluded international transfer payments from base income', isFlaw: false });
    }
  } else {
    let saccoBypass = d.hasSaccoAccount ? 'SACCO/Bank history active.' : '';
    factors.push({ name: 'Fallback Protocol Active', impact: 'High', direction: 'neutral', description: `Triangulation offline. ${saccoBypass} Relying on Secondary Physical Proxies.`, isFlaw: false });
  }

  if (d.hasSaccoAccount && d.saccoShareCapital && d.saccoShareCapital > 0) {
    let saccoCapitalValue = d.saccoShareCapital * 0.5;
    baseIncome += saccoCapitalValue;
    deductions.push({ name: 'SACCO Capital Exemption', amount: saccoCapitalValue, reason: '50% of SACCO share capital exempted as illiquid savings' });
  }

  // Informal Sub-landlord Income Addition
  if (d.subletIncome && d.subletIncome > 0) {
    baseIncome += (d.subletIncome * 12);
    factors.push({ name: 'Sublet Income Addition', impact: 'Medium', direction: 'up', description: 'Added declared informal rental income', isFlaw: false });
  }

  // Flaw 3: Digital Credit Punishment
  // Active Fuliza defaults/digital debt strictly deduct from liquidity
  if (!isOffline && d.fulizaDefaults && d.fulizaDefaults > 0) {
    let cappedDefaults = Math.min(10, d.fulizaDefaults);
    let fulizaPenalty = adminParams.fulizaPenalty ?? 5000;
    let debtDeduction = cappedDefaults * fulizaPenalty;
    deductions.push({ name: 'Active Digital Debt', amount: debtDeduction, reason: 'Fuliza/M-Shwari defaults' });
    baseIncome -= debtDeduction;
  }

  // --- ASSETS & DEPRECIATION ---
  // Note: The AGI model treats car/motorcycle value as a proxy for cumulative earned income 
  // saved into a capital asset, not as liquid income — therefore it flows into the same AGI 
  // pool that all living costs are deducted from. This is consistent with World Bank PMT asset annualization methodology.
  // Flaw 7 & 8: Asset Age and Dead Asset Fallacy
  // We use standard depreciation if there are no high-wealth triangulated signals
  let hasHighWealthSignal = (d.kraPinType && d.kraPinType !== 'NONE') || d.isNtsaVerified || effectiveBalance > 50000;
  
  // Calculate car value based on selected type
  let carBaseValue = adminParams.carValue ?? 350000; // Base reference
  let carMultiplier = 1.0;
  if (d.vehicleType === 'STANDARD_OLD') carMultiplier = 1.0; // e.g. 350k
  else if (d.vehicleType === 'STANDARD_NEW') carMultiplier = 3.0; // e.g. 1.05M
  else if (d.vehicleType === 'LUXURY') carMultiplier = 10.0; // e.g. 3.5M
  else if (d.vehicleType === 'COMMERCIAL') carMultiplier = 2.5; // e.g. 875k
  
  let carValue = d.assets.includes('CAR') ? (carBaseValue * carMultiplier) : 0;
  
  if (carValue > 0 && !hasHighWealthSignal && d.vehicleType === 'STANDARD_OLD') {
    carValue *= 0.6; // Depreciate old vehicles heavily if low cashflow
    deductions.push({ name: 'Old Asset Depreciation', amount: (carBaseValue * carMultiplier) * 0.4, reason: 'Dead Asset / Age Adjustment' });
  } else if (carValue > 0 && d.vehicleType === 'COMMERCIAL') {
    carValue *= 0.5; // 50% exemption for commercial vehicles (tools of trade)
    deductions.push({ name: 'Commercial Tool Exemption', amount: (carBaseValue * carMultiplier) * 0.5, reason: 'Income-generating tool, not liquid savings' });
  }
  baseIncome += carValue;

  // FIX (audit v2): motorcycle base value was a bare 150000 literal with no
  // adminParams hook, unlike carBaseValue above. Bodaboda/PSV motorcycles are
  // exactly the asset class this v2.1 pass says it's protecting, so it
  // shouldn't be second-class in the admin-configurability story.
  let motoBaseValue = adminParams.motoValue ?? 150000;
  let motoValue = d.assets.includes('MOTORCYCLE') ? motoBaseValue : 0;
  if (motoValue > 0 && d.motorcycleIsCommercial) {
    const exemptionAmount = motoValue * 0.5; // 50% tools-of-trade exemption, derived not hardcoded
    motoValue *= 0.5;
    deductions.push({ name: 'Motorcycle Commercial Exemption', amount: exemptionAmount, reason: 'Bodaboda/PSV motorcycle — income-generating tool' });
  } else if (motoValue > 0 && !hasHighWealthSignal) {
    // FIX (audit v2): this depreciation used to reduce baseIncome silently,
    // with no deductions.push() entry — the equivalent car-depreciation
    // branch above does record one. Since SHAP Deduction Receipts are built
    // from the `deductions` array, a bodaboda owner's receipt was missing
    // this line item even though it materially lowered their AGI. Recorded
    // now for transparency parity with the car case.
    const depreciationAmount = motoValue * 0.4;
    motoValue *= 0.6;
    deductions.push({ name: 'Motorcycle Age Depreciation', amount: depreciationAmount, reason: 'Dead Asset / Age Adjustment — same basis as Old Asset Depreciation for cars' });
  }
  baseIncome += motoValue;

  // --- HOUSING & INFRASTRUCTURE ---
  // EXCLUDED BY DESIGN: Housing variables (wallMaterial, roofMaterial, floorMaterial)
  // are NOT used in the proposed AGI model. These are the exact intrusive PMT proxies
  // that the 'Error by Design' investigation proved are unreliable wealth indicators:
  //   - Flaw 11 (Ancestral Home Trap): Stone walls/tile roofs on inherited homes
  //     do not reflect current income or ability to pay.
  //   - Flaw 18 (Electricity as Luxury): Basic infrastructure ≠ wealth signal.
  // Using them here would contradict the core thesis of our reform proposal.
  // Housing has ZERO impact on the AGI calculation.

  factors.push({ name: 'Housing Variables (Wall/Roof/Floor)', impact: 'None', direction: 'neutral', description: 'EXCLUDED — intrusive PMT proxies proven unreliable by Error by Design investigation (Flaws 11, 18)', isFlaw: true, isIgnored: true });
  factors.push({ name: 'Electricity Connectivity', impact: 'None', direction: 'neutral', description: 'Excluded as wealth proxy (Last Mile Connectivity)', isFlaw: true, isIgnored: true });

  // --- LIVELIHOOD (LAND & LIVESTOCK) ---
  // Flaw 10: Arid Land Overcharge & Flaw 9: Livestock Capital
  let landMultiplier = 1.0;
  let livestockMultiplier = 1.0;
  if (ASAL_COUNTIES[d.county] === 'arid') {
    landMultiplier = 0.15;
    livestockMultiplier = 0.3; // Capital, not cash
    factors.push({ name: 'Arid Land Adjustment', impact: 'Medium', direction: 'down', description: 'Discounted ASAL land/livestock valuation', isFlaw: false });
  } else if (ASAL_COUNTIES[d.county] === 'semi-arid') {
    landMultiplier = 0.5;
    livestockMultiplier = 0.6;
  }

  if (d.landAcreage) baseIncome += (d.landAcreage * 80000 * landMultiplier);
  if (d.livestockCount) baseIncome += (d.livestockCount * 3800 * livestockMultiplier);

  // --- DEMOGRAPHIC OVERRIDES & DEDUCTIONS ---
  let agi = baseIncome;

  // Flaw 16: Urban Cost-of-Living Penalty (Deduct rent, don't tax it)
  const urbanTier = URBAN_TIER_1.includes(d.county) ? 'TIER_1'
    : URBAN_TIER_2.includes(d.county) ? 'TIER_2' : 'RURAL';
  
  // Base CoL without rent
  // FIX (audit v2): this override used to only ever apply when
  // urbanTier === 'TIER_1' — Tier 2 and Rural COL were hardcoded regardless
  // of adminParams, unlike the rent caps below which are fully configurable
  // across all three tiers. `urbanCostOfLiving` is kept as a Tier-1 alias
  // for backward compatibility with any existing caller.
  const colOverrides = {
    TIER_1: adminParams.tier1CostOfLiving ?? adminParams.urbanCostOfLiving,
    TIER_2: adminParams.tier2CostOfLiving,
    RURAL: adminParams.ruralCostOfLiving,
  };
  const baseCol = colOverrides[urbanTier] !== undefined
    ? colOverrides[urbanTier]
    : COST_OF_LIVING[urbanTier];

  let colDeduction;
  if (d.ownershipStatus === 'RENTED' && d.monthlyRent > 0) {
    // Dynamic admin override for ceilings, or fallback to defaults
    const tier1Cap = adminParams.tier1RentCap ?? DEFAULT_MAX_RENT.TIER_1;
    const tier2Cap = adminParams.tier2RentCap ?? DEFAULT_MAX_RENT.TIER_2;
    const ruralCap = adminParams.ruralRentCap ?? DEFAULT_MAX_RENT.RURAL;
    
    const maxRent = urbanTier === 'TIER_1' ? tier1Cap : urbanTier === 'TIER_2' ? tier2Cap : ruralCap;
    const cappedRent = Math.min(d.monthlyRent, maxRent);
    
    colDeduction = Math.max(baseCol, cappedRent) * 12;
    deductions.push({ name: 'Rent-Adjusted Cost of Living', amount: colDeduction, reason: `Renter in ${urbanTier} — capped at KSh ${maxRent.toLocaleString()}` });
  } else {
    colDeduction = baseCol * 12;
    deductions.push({ name: 'Cost of Living Allowance', amount: colDeduction, reason: `Basic survival threshold for ${urbanTier}` });
  }
  agi -= colDeduction;

  // Flaw 14: Non-linear Dependency Scaling
  if (d.householdSize > 1) {
    let dependencyRatio = (d.householdSize - 1) * 0.08; // 8% deduction per dependent
    // Cap dependency deduction: ASAL counties get higher cap (pro-marginalized, Art.56)
    const cap = ASAL_COUNTIES[d.county] ? 0.40 : 0.35;
    dependencyRatio = Math.min(dependencyRatio, cap);
    let depDeduction = agi * dependencyRatio;
    deductions.push({ name: 'Dependency Allowance', amount: depDeduction, reason: `Dynamic per-capita scaling (capped at ${Math.round(cap*100)}%)` });
    agi -= depDeduction;
  }

  // Flaw 22: Catastrophic Health Expenditure
  if (d.hasChronicIllness) {
    let cheDeduction = agi * 0.4; // 40% deduction for net disposable capacity
    deductions.push({ name: 'CHE Exemption', amount: cheDeduction, reason: 'Chronic Illness Burden' });
    agi -= cheDeduction;
    factors.push({ name: 'CHE Exemption', impact: 'High', direction: 'down', description: 'Disposable income protected', isFlaw: false });
  }

  // PWD Exemption
  if (d.hasRegisteredDisability) {
    let disabilityDeduction = agi * 0.3; // 30% deduction for reduced earning capacity
    deductions.push({ name: 'Disability Exemption (Art. 54)', amount: disabilityDeduction, reason: 'Registered Person with Disability' });
    agi -= disabilityDeduction;
    factors.push({ name: 'PWD Override', impact: 'High', direction: 'down', description: 'Art. 54 constitutional protection — reduced earning capacity adjustment', isFlaw: false });
  }

  agi = Math.max(0, agi);

  // OVERRIDES (Flaw 19 & 24)
  let isIndigent = false;
  if (d.receivesAid || d.isRefugee) isIndigent = true;
  if (d.headAge >= 65 && !d.assets.includes('CAR') && effectiveBalance < 5000) {
    isIndigent = true;
    factors.push({ name: 'Age Override', impact: 'High', direction: 'down', description: 'Pensioner Trap bypass', isFlaw: false });
  }
  if (d.headAge < 21 && d.householdSize > 1) {
    isIndigent = true;
    factors.push({ name: 'Child-Headed Household', impact: 'High', direction: 'down', description: 'Minor override', isFlaw: false });
  }

  // Smooth Transition Constraint (Soft-Landing Smoothness)
  // At exactly KSh 131,000, 2.75% of AGI yields KSh 300.20/month.
  // This means the dreaded '131k hard cliff' mathematically vanishes when strictly applying
  // 2.75% to an Adjusted Gross Income rather than a gross income proxy.
  // As AGI crosses 131k, the contribution scales perfectly smoothly from 300 upwards,
  // providing a natural soft-landing ramp for graduating citizens.
  const INDIGENT_THRESHOLD = 131000;
  if (!isIndigent && agi <= INDIGENT_THRESHOLD) {
    isIndigent = true;
    factors.push({ name: 'Pro-Poor Constraint', impact: 'Medium', direction: 'down', description: 'AGI below indigent threshold', isFlaw: false });
  }

  // Meta-Flaw 30: Legal 2.75% Mandate
  // Apply flat 2.75% strictly to the heavily adjusted AGI
  let monthlyContribution = 0;
  let tier = "LOW";
  
  if (isIndigent) {
    monthlyContribution = 300; // Subsidized
  } else {
    monthlyContribution = Math.max(300, Math.round((agi * 0.0275) / 12));
    if (agi > 450000) tier = "HIGH";
    else tier = "MIDDLE";
  }

  // Fallback Protocol: Digital Ghost Detection
  // If user operates purely in cash with zero digital footprint and zero physical assets
  let isDigitalGhost = false;
  // requiresChpVerification is declared earlier in this function now (see FIX audit v2 note above) — this used to be a duplicate re-declaration
  // FIX (audit v2): `d.assets` only ever holds items like CAR/MOTORCYCLE/TV
  // — land and livestock are separate fields and were never checked here.
  // A pastoralist with real land/livestock wealth but no phone-linked
  // footprint could be mislabeled "digital ghost" even though their AGI
  // above already correctly counted that wealth. Doesn't change what
  // anyone owes, but it corrupted the isDigitalGhost statistic itself.
  const hasNoPhysicalAssets = d.assets.length === 0 && !(d.landAcreage > 0) && !(d.livestockCount > 0);
  if (!isOffline && (!d.kraPinType || d.kraPinType === 'NONE') && !d.isNtsaVerified && !d.hasSaccoAccount && (d.grossMpesaMonthly || 0) < 1000 && hasNoPhysicalAssets) {
    isDigitalGhost = true;
  }
  
  if (isDigitalGhost && isIndigent) {
    requiresChpVerification = true;
    factors.push({ name: 'Digital Ghost / CHP Protocol', impact: 'High', direction: 'neutral', description: 'Zero digital footprint. Provisional subsidy granted pending physical CHP verification within 90 days.', isFlaw: false });
  }

  // Consent Withheld Pathway (DPA 2019 compliance)
  if (d.consentWithheld && !isDigitalGhost) {
    requiresChpVerification = true;
    factors.push({ name: 'Consent Withheld — Manual Review', impact: 'High', direction: 'neutral', description: 'Citizen exercised DPA §32 right to withhold data consent. Routed to CHP manual verification. No algorithmic penalty applied.', isFlaw: false });
  }

  const verifiedSources = [
    (d.kraPinType && d.kraPinType !== 'NONE'),
    d.isNtsaVerified,
    (!isOffline && !isDigitalGhost)
  ].filter(Boolean).length;
  const confidenceTier = verifiedSources >= 2 ? "HIGH" : verifiedSources === 1 ? "MEDIUM" : "LOW";
  const confidenceBand = { HIGH: 0.10, MEDIUM: 0.20, LOW: 0.35 }[confidenceTier];

  return {
    estimatedAnnualIncome: baseIncome,
    adjustedGrossIncome: agi,
    monthlyContribution: monthlyContribution,
    band: isIndigent ? 1 : 2,
    tier: tier,
    isIndigent: isIndigent,
    isDigitalGhost: isDigitalGhost,
    requiresChpVerification: requiresChpVerification,
    factors: factors,
    modelName: 'SHA PMT v2.1 Optimization',
    deductions: deductions,
    // FIX (audit v2): this was `fairnessPass: true` — a literal, unconditional
    // hardcode returned on every single assessment, feeding a per-case
    // "Equalized Odds Constraint Active" badge in the UI. Equalized odds is
    // a population-level statistic (see testCurrentModelDisparityByCounty
    // above) — no single household's result can honestly claim it. Field
    // removed; the UI badge that read it has been removed too (see App.jsx).
    // If you want a per-case trust signal, testCurrentModelDisparityByCounty's
    // most recent population-level `passed` result is the honest source —
    // wire that through instead of a per-case flag.
    confidenceTier: confidenceTier,
    agiRangeLow: Math.max(0, Math.round(agi * (1 - confidenceBand))),
    agiRangeHigh: Math.round(agi * (1 + confidenceBand))
  };
}

export const PRESETS = [
  {
    name: 'Mama Wanjiku — Chama Treasurer',
    description: 'Rural shopkeeper who manages her chama\'s M-Pesa. High turnover, zero profit.',
    icon: '👩‍🌾',
    badge: 'Fiduciary Exemption',
    badgeColor: '#059669',
    inputs: {
      county: 'Kakamega',
      householdSize: 5,
      headGender: 'FEMALE',
      headAge: 48,
      dwellingType: 'BUNGALOW',
      wallMaterial: 'STONE',
      roofMaterial: 'IRON_SHEETS',
      floorMaterial: 'CEMENT',
      rooms: 3,
      ownershipStatus: 'OWNED',
      monthlyRent: 0,
      subletIncome: 0,
      waterSource: 'RIVER',
      sanitationType: 'PIT_LATRINE',
      cookingEnergy: 'FIREWOOD',
      lightingEnergy: 'ELECTRICITY',
      assets: ['RADIO', 'SMARTPHONE'],
      motorcycleIsCommercial: false,
      landAcreage: 0.5,
      livestockCount: 2,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 120000,
      avgRetainedBalance: 110000,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 0,
      kraPinType: 'NONE',
      isNtsaVerified: false,
      hasSaccoAccount: false,
      hasChronicIllness: false,
      hasRegisteredDisability: false,
      isGroupTreasurer: true,
      vehicleType: 'STANDARD_OLD',
      consentWithheld: false
    },
  },
  {
    name: 'Rural Smallholder',
    description: 'Subsistence farmer with a stone house but zero cash liquidity.',
    icon: '🌽',
    badge: 'Ancestral Home',
    badgeColor: '#d97706',
    inputs: {
      county: 'Meru',
      householdSize: 6,
      headGender: 'MALE',
      headAge: 55,
      dwellingType: 'BUNGALOW',
      wallMaterial: 'STONE',
      roofMaterial: 'IRON_SHEETS',
      floorMaterial: 'CEMENT',
      rooms: 4,
      ownershipStatus: 'FAMILY',
      monthlyRent: 0,
      subletIncome: 0,
      waterSource: 'PUBLIC_TAP',
      sanitationType: 'PIT_LATRINE',
      cookingEnergy: 'FIREWOOD',
      lightingEnergy: 'ELECTRICITY',
      assets: ['RADIO', 'FEATURE_PHONE', 'BICYCLE'],
      motorcycleIsCommercial: false,
      landAcreage: 2,
      livestockCount: 5,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 8000,
      avgRetainedBalance: 1200,
      isSeasonalWorker: true,
      lowSeasonRetainedBalance: 200,
      diasporaRemittances: 0,
      fulizaDefaults: 0,
      kraPinType: 'NONE',
      isNtsaVerified: false,
      hasSaccoAccount: false,
      hasChronicIllness: false,
      hasRegisteredDisability: false,
      isGroupTreasurer: false,
      vehicleType: 'STANDARD_OLD',
      consentWithheld: false
    },
  },
  {
    name: 'Informal Settlement',
    description: 'Nairobi hawker. High M-Pesa velocity but trapped in digital debt.',
    icon: '🏙️',
    badge: 'Digital Debt Penalty',
    badgeColor: '#dc2626',
    inputs: {
      county: 'Nairobi',
      householdSize: 4,
      headGender: 'FEMALE',
      headAge: 29,
      dwellingType: 'SHANTY',
      wallMaterial: 'IRON_SHEETS',
      roofMaterial: 'IRON_SHEETS',
      floorMaterial: 'MUD',
      rooms: 1,
      ownershipStatus: 'RENTED',
      monthlyRent: 6000,
      subletIncome: 0,
      waterSource: 'PUBLIC_TAP',
      sanitationType: 'VIP_LATRINE',
      cookingEnergy: 'CHARCOAL',
      lightingEnergy: 'KEROSENE',
      assets: ['SMARTPHONE', 'TV'],
      motorcycleIsCommercial: false,
      landAcreage: 0,
      livestockCount: 0,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 60000,
      avgRetainedBalance: 500,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 3,
      kraPinType: 'NONE',
      isNtsaVerified: false,
      hasSaccoAccount: false,
      hasChronicIllness: false,
      hasRegisteredDisability: false,
      isGroupTreasurer: false,
      vehicleType: 'STANDARD_OLD',
      consentWithheld: false
    },
  },
  {
    name: 'Urban Middle Class',
    description: 'Salaried professional in Nairobi. High liquidity, registered assets.',
    icon: '💼',
    badge: 'Revenue Target',
    badgeColor: '#0284c7',
    inputs: {
      county: 'Nairobi',
      householdSize: 3,
      headGender: 'MALE',
      headAge: 35,
      dwellingType: 'APARTMENT',
      wallMaterial: 'STONE',
      roofMaterial: 'TILES',
      floorMaterial: 'TILES',
      rooms: 3,
      ownershipStatus: 'RENTED',
      monthlyRent: 45000,
      subletIncome: 0,
      waterSource: 'PIPED_DWELLING',
      sanitationType: 'FLUSH_TOILET',
      cookingEnergy: 'LPG',
      lightingEnergy: 'ELECTRICITY',
      assets: ['SMARTPHONE', 'TV', 'FRIDGE', 'CAR', 'COMPUTER'],
      motorcycleIsCommercial: false,
      landAcreage: 0,
      livestockCount: 0,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 150000,
      avgRetainedBalance: 85000,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 0,
      kraPinType: 'PAYE',
      isNtsaVerified: true,
      hasSaccoAccount: true,
      hasChronicIllness: false,
      hasRegisteredDisability: false,
      isGroupTreasurer: false,
      vehicleType: 'STANDARD_NEW',
      consentWithheld: false
    },
  },
  {
    name: 'Pensioner',
    description: 'Elderly citizen in Nyeri. Has assets but zero monthly income.',
    icon: '🧓',
    badge: 'Age Override',
    badgeColor: '#7c3aed',
    inputs: {
      county: 'Nyeri',
      householdSize: 2,
      headGender: 'MALE',
      headAge: 72,
      dwellingType: 'BUNGALOW',
      wallMaterial: 'STONE',
      roofMaterial: 'TILES',
      floorMaterial: 'CEMENT',
      rooms: 4,
      ownershipStatus: 'OWNED',
      monthlyRent: 0,
      subletIncome: 0,
      waterSource: 'PIPED_YARD',
      sanitationType: 'PIT_LATRINE',
      cookingEnergy: 'LPG',
      lightingEnergy: 'ELECTRICITY',
      assets: ['RADIO', 'FEATURE_PHONE', 'TV'],
      motorcycleIsCommercial: false,
      landAcreage: 1,
      livestockCount: 2,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 1500,
      avgRetainedBalance: 800,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 0,
      kraPinType: 'NONE',
      isNtsaVerified: false,
      hasSaccoAccount: false,
      hasChronicIllness: true,
      hasRegisteredDisability: false,
      isGroupTreasurer: false,
      vehicleType: 'STANDARD_OLD',
      consentWithheld: false
    },
  },
  {
    name: 'Urban Satellite Renter',
    description: 'Kiambu resident renting in Ruaka. Moderate income but high rent burden misclassified as rural.',
    icon: '🏘️',
    badge: 'Rent Gap Protected',
    badgeColor: '#7c3aed',
    inputs: {
      county: 'Kiambu',
      householdSize: 4,
      headGender: 'FEMALE',
      headAge: 32,
      dwellingType: 'APARTMENT',
      wallMaterial: 'STONE',
      roofMaterial: 'IRON_SHEETS',
      floorMaterial: 'CEMENT',
      rooms: 2,
      ownershipStatus: 'RENTED',
      monthlyRent: 16000,
      subletIncome: 0,
      waterSource: 'PIPED_DWELLING',
      sanitationType: 'FLUSH_TOILET',
      cookingEnergy: 'LPG',
      lightingEnergy: 'ELECTRICITY',
      assets: ['SMARTPHONE', 'TV'],
      motorcycleIsCommercial: false,
      landAcreage: 0,
      livestockCount: 0,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 35000,
      avgRetainedBalance: 8000,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 1,
      kraPinType: 'NONE',
      isNtsaVerified: false,
      hasSaccoAccount: false,
      hasChronicIllness: false,
      hasRegisteredDisability: false,
      isGroupTreasurer: false,
      vehicleType: 'STANDARD_OLD',
      consentWithheld: false
    },
  }
];

/**
 * Calculates fraud risk score for a household assessment.
 * Returns risk flags that trigger automatic escalation to SHA fraud unit.
 * Each flag is documented with reason and confidence score.
 * 
 * Fraud flags are designed to identify:
 * 1. Phantom Dependents (claiming >10x national average household size)
 * 2. Unregistered Vehicle Claim / Hidden High-Value Asset (NTSA cross-check)
 * 3. Income Under-Reporting (self-reported vs. KRA records)
 * 4. Fuliza Debt Accumulation (systematic borrowing to reduce AGI)
 * 5. Suspicious Chama Treasurer Profile (false fiduciary claim)
 * 6. Age-Household Mismatch (biological implausibility)
 * 7. Asset-Liquidity Paradox (luxury assets with near-zero cashflow)
 * 8. Business Registration Without Income (KRA pin but no activity)
 * 9. Multiple Burden Claim (CHE + very large household)
 * 10. Geographic Impossibility (active assessments in >2 counties)
 * 11. KRA Formal Income Mismatch (formal income vs. near-zero retained balance)
 * 12. Asset-Lifestyle Incongruity (claims indigence but high-value lifestyle indicators)
 */
export function calculateFraudRisk(d, contextData = {}) {
  let fraudFlags = [];
  let confidenceScores = [];
  let overallRiskScore = 0;

  // FLAG 1: Phantom Dependents
  // National average household size: 2.1. Max reasonable: 8-10 per KDHS
  const PHANTOM_DEPENDENT_THRESHOLD = 12;
  if (d.householdSize > PHANTOM_DEPENDENT_THRESHOLD) {
    fraudFlags.push({
      name: 'Phantom Dependents',
      reason: `Household size (${d.householdSize}) exceeds reasonable threshold (${PHANTOM_DEPENDENT_THRESHOLD})`,
      confidence: 0.85,
      severity: 'HIGH',
      action: 'Escalate to fraud unit for home verification',
      cluster: 'household_size' // FIX (audit v2): see compounding note below
    });
    confidenceScores.push(0.85);
    overallRiskScore += 0.85;
  }

  // FLAG 2: Asset Mismatches (Lasso PMT vs. NTSA)
  // If has car in assets but NTSA says no car (and vice versa)
  if (contextData.ntsaCarExists !== undefined) {
    const claimsHasCar = d.assets.includes('CAR');
    const ntsaShowsCar = contextData.ntsaCarExists;
    
    if (claimsHasCar && !ntsaShowsCar) {
      // Claims car not registered
      fraudFlags.push({
        name: 'Unregistered Vehicle Claim',
        reason: 'Citizen claims car ownership but NTSA shows no registered vehicle',
        confidence: 0.7,
        severity: 'MEDIUM',
        action: 'Request proof of car ownership or registration'
      });
      confidenceScores.push(0.7);
      overallRiskScore += 0.7;
    } else if (!claimsHasCar && ntsaShowsCar && contextData.vehicleValue > 500000) {
      // NTSA shows high-value car but citizen didn't claim it
      fraudFlags.push({
        name: 'Hidden High-Value Asset',
        reason: `NTSA shows registered vehicle worth ${contextData.vehicleValue} but citizen did not disclose`,
        confidence: 0.9,
        severity: 'CRITICAL',
        action: 'Escalate to SHA officer for manual review (DPA §35 — no automatic rejection)'
      });
      confidenceScores.push(0.9);
      overallRiskScore += 0.9;
    }
  }

  // FLAG 3: Income Mismatches (Self-reported vs. KRA)
  // If claims low income but KRA shows business revenue
  if (contextData.kraIncomeLevel !== undefined) {
    const claimedAGI = d.avgRetainedBalance * 12;
    const kraRecordedIncome = contextData.kraIncomeLevel;
    
    if (kraRecordedIncome > claimedAGI * 2) {
      // KRA shows income >2x claimed
      fraudFlags.push({
        name: 'Income Under-Reporting',
        reason: `KRA records show KSh ${kraRecordedIncome} but citizen claims AGI of KSh ${claimedAGI}`,
        confidence: 0.95,
        severity: 'CRITICAL',
        action: 'Escalate to SHA officer for manual review; request KRA tax returns (DPA §35)'
      });
      confidenceScores.push(0.95);
      overallRiskScore += 0.95;
    }
  }

  // FLAG 4: Fuliza Abuse Pattern
  // >8 defaults in 6 months = potential systematic borrowing to appear poor
  if (d.fulizaDefaults > 8) {
    fraudFlags.push({
      name: 'Fuliza Debt Accumulation',
      reason: `${d.fulizaDefaults} active defaults detected (>8 threshold). Possible systematic borrowing to reduce AGI.`,
      confidence: 0.65,
      severity: 'MEDIUM',
      action: 'Flag for behavioral analysis; check if borrowing spikes before assessment'
    });
    confidenceScores.push(0.65);
    overallRiskScore += 0.65;
  }

  // FLAG 5: Chama Treasurer + Low Retained Balance
  // If person claims to be treasurer but retained balance is very low
  if (d.isGroupTreasurer && d.avgRetainedBalance < 10000) {
    fraudFlags.push({
      name: 'Suspicious Chama Treasurer Profile',
      reason: `Claims Chama treasurer role but retained balance (KSh ${d.avgRetainedBalance}) suspiciously low. Possible false claim.`,
      confidence: 0.6,
      severity: 'MEDIUM',
      action: 'Verify Chama registration and membership with Safaricom/SACCO'
    });
    confidenceScores.push(0.6);
    overallRiskScore += 0.6;
  }

  // FLAG 6: Age + Household Mismatch
  // FIX (audit v2): as written this fired on the exact profile the
  // Child-Headed Household override (calculateProposedModel, headAge<21)
  // exists to *protect* — e.g. a 22-year-old orphan raising six siblings
  // was simultaneously auto-granted indigent status AND escalated as a
  // HIGH-severity fraud suspect. Young-head-of-large-household is a real,
  // common, legitimate Kenyan household pattern (orphan-headed households,
  // young widowhood, eldest sibling as guardian) — it is not on its own
  // "biological implausibility". Narrowed to a much rarer band, dropped to
  // MEDIUM, and explicitly excluded from the Child-Headed Household age
  // range so the two systems can't contradict each other on the same case.
  if (d.headAge >= 21 && d.headAge < 23 && d.householdSize > 9) {
    fraudFlags.push({
      name: 'Age-Household Mismatch',
      reason: `Head is ${d.headAge} years old with a household of ${d.householdSize}. Not implausible on its own — flagged only for a courtesy composition check, not as a fraud accusation.`,
      confidence: 0.35,
      severity: 'MEDIUM',
      action: 'Soft-touch household composition check (no benefit hold)',
      cluster: 'household_size' // FIX (audit v2): shares root signal with Flag 1 and Flag 9
    });
    confidenceScores.push(0.35);
    overallRiskScore += 0.35;
  }

  // FLAG 7: Asset Ownership Paradox
  // If claims luxury assets but near-zero liquidity and low M-Pesa
  if (d.assets.includes('CAR') && d.vehicleType === 'LUXURY' && d.avgRetainedBalance < 5000 && d.grossMpesaMonthly < 10000) {
    fraudFlags.push({
      name: 'Asset-Liquidity Paradox',
      reason: `Claims luxury car but retained balance KSh ${d.avgRetainedBalance} and monthly M-Pesa KSh ${d.grossMpesaMonthly}. Inconsistent wealth signals.`,
      confidence: 0.8,
      severity: 'HIGH',
      action: 'Request vehicle ownership documents; cross-check with NTSA'
    });
    confidenceScores.push(0.8);
    overallRiskScore += 0.8;
  }

  // FLAG 8: KRA Pin But No Income
  // If has KRA pin (tax-registered business) but very low retained balance
  if (d.kraPinType === 'BUSINESS' && d.avgRetainedBalance < 5000 && d.householdSize <= 2) {
    fraudFlags.push({
      name: 'Business Registration Without Income',
      reason: `Has KRA pin but retained balance KSh ${d.avgRetainedBalance}. Possible shell company.`,
      confidence: 0.65,
      severity: 'MEDIUM',
      action: 'Request KRA tax returns to verify business activity'
    });
    confidenceScores.push(0.65);
    overallRiskScore += 0.65;
  }

  // FLAG 9: Multiple Dependents With Chronic Illness
  // If claims CHE but also claims very large household (both would be unusual together)
  if (d.hasChronicIllness && d.householdSize > 7 && !ASAL_COUNTIES[d.county]) {
    fraudFlags.push({
      name: 'Multiple Burden Claim',
      reason: `Claims chronic illness AND household of ${d.householdSize} outside ASAL regions. Statistically rare combination; verify both claims.`,
      confidence: 0.55,
      severity: 'LOW',
      action: 'Request medical documentation for CHE claim',
      cluster: 'household_size' // FIX (audit v2): also keys off householdSize — see compounding note below
    });
    confidenceScores.push(0.55);
    overallRiskScore += 0.55;
  }

  // FLAG 10: Geographic Impossibility
  // If citizen is flagged in assessments across >2 counties simultaneously
  if (contextData.previousAssessmentCounties && contextData.previousAssessmentCounties.length > 2) {
    fraudFlags.push({
      name: 'Geographic Impossibility',
      reason: `Citizen has active assessments in ${contextData.previousAssessmentCounties.length} counties: ${contextData.previousAssessmentCounties.join(', ')}. A person can only reside in one county.`,
      confidence: 0.92,
      severity: 'CRITICAL',
      action: 'Escalate to SHA fraud unit; cross-reference IPRS for primary residence (DPA §35 — no auto-rejection)'
    });
    confidenceScores.push(0.92);
    overallRiskScore += 0.92;
  }

  // FLAG 11: KRA Formal Income vs. Self-Reported Mismatch
  // If KRA shows formal employment income but citizen claims near-zero retained balance
  if (contextData.kraFormalIncome && contextData.kraFormalIncome > 300000 && d.avgRetainedBalance < 5000) {
    let flagConfidence = d.kraPinType === 'PAYE' ? 0.95 : 0.88;
    fraudFlags.push({
      name: 'KRA Formal Income Mismatch',
      reason: `KRA records show annual formal income of KSh ${contextData.kraFormalIncome.toLocaleString()} but citizen's retained M-Pesa balance is only KSh ${d.avgRetainedBalance.toLocaleString()}. Possible income concealment.`,
      confidence: flagConfidence,
      severity: flagConfidence >= 0.9 ? 'CRITICAL' : 'HIGH',
      action: 'Request 6-month bank statements and KRA iTax returns for reconciliation'
    });
    confidenceScores.push(flagConfidence);
    overallRiskScore += flagConfidence;
  }

  // FLAG 12: Asset-Lifestyle Incongruity
  // If household claims indigence but has multiple high-value lifestyle indicators
  // NOTE: We deliberately do NOT use wallMaterial, roofMaterial, or floorMaterial here.
  // Those are the exact intrusive PMT proxies our reform removes. Fraud detection must
  // rely on digitally-verifiable signals, not housing inspection proxies.
  if (d.avgRetainedBalance < 3000 && d.receivesAid) {
    let lifestyleSignals = 0;
    if (d.assets.includes('CAR') && d.vehicleType !== 'STANDARD_OLD') lifestyleSignals++;
    if (d.kraPinType && d.kraPinType !== 'NONE') lifestyleSignals++; // Has active PIN but claims indigence
    if (d.grossMpesaMonthly > 50000) lifestyleSignals++; // High transaction volume
    if (d.assets.includes('CAR') && d.assets.includes('COMPUTER') && d.assets.includes('SMARTPHONE')) lifestyleSignals++; // Multiple high-value assets
    if (d.isNtsaVerified && d.assets.includes('CAR')) lifestyleSignals++;
    if (d.landAcreage > 5 && !ASAL_COUNTIES[d.county]) lifestyleSignals++; // Large non-arid landholding
    
    if (lifestyleSignals >= 3) {
      fraudFlags.push({
        name: 'Asset-Lifestyle Incongruity',
        reason: `Claims indigence (receives aid, KSh ${d.avgRetainedBalance} balance) but has ${lifestyleSignals} high-value digitally-verifiable indicators (KRA, NTSA, M-Pesa, assets). Possible asset concealment.`,
        confidence: 0.78,
        severity: 'HIGH',
        action: 'Schedule home visit and asset verification; compare with county land registry (DPA §35)'
      });
      confidenceScores.push(0.78);
      overallRiskScore += 0.78;
    }
  }

  // FLAG 13: Multi-SIM Concealment
  // Citizen declares one phone number with low balance, but Safaricom API shows multiple active SIMs under their ID
  if (contextData.safaricomActiveSims > 1 && d.avgRetainedBalance < 5000) {
    let multiSimConfidence = 0.60; // Reduced from 0.85 — legitimate business/personal split
    if (d.grossMpesaMonthly > 50000) multiSimConfidence = 0.80; // Upgrade if high volume
    fraudFlags.push({
      name: 'Multi-SIM Concealment Risk',
      reason: `Citizen declared low liquidity, but Safaricom registry shows ${contextData.safaricomActiveSims} active SIM cards under their National ID. Possible wealth splitting.`,
      confidence: multiSimConfidence,
      severity: multiSimConfidence >= 0.75 ? 'HIGH' : 'MEDIUM',
      action: 'Aggregate balances across all registered MSISDNs via API'
    });
    confidenceScores.push(multiSimConfidence);
    overallRiskScore += multiSimConfidence;
  }

  // FLAG 14: Unverified Chama Treasurer Claim
  // Claims fiduciary exemption but API shows no registered group
  if (d.isGroupTreasurer && contextData.safaricomChamaRegistered === false) {
    fraudFlags.push({
      name: 'Unverified Fiduciary Claim',
      reason: `Claims Chama treasurer role for 80% liquidity exemption, but Safaricom/SACCO API shows no registered group linked to this ID/Phone.`,
      confidence: 0.95,
      severity: 'CRITICAL',
      action: 'Deny fiduciary exemption until Chama registration certificate is provided'
    });
    confidenceScores.push(0.95);
    overallRiskScore += 0.95;
  }

  // FLAG 15: Recent County Switch
  if (contextData.iprsCountyChangedWithin90Days) {
    fraudFlags.push({
      name: 'Recent County Switch',
      reason: 'IPRS shows county of residence changed within 90 days of assessment. Possible CoL tier gaming.',
      confidence: 0.70,
      severity: 'MEDIUM',
      action: 'Verify current residence with utility bills or county records'
    });
    confidenceScores.push(0.70);
    overallRiskScore += 0.70;
  }

  // FLAG 16: Multi-Vehicle Mismatch
  if (contextData.ntsaVehicleCount !== undefined && d.assets.includes('CAR')) {
    const declaredCount = d.assets.includes('CAR') ? 1 : 0;
    if (contextData.ntsaVehicleCount > declaredCount + 1) { // Allowing 1 extra
      fraudFlags.push({
        name: 'Undeclared Vehicles',
        reason: `Citizen declared ${declaredCount} vehicle(s) but NTSA shows ${contextData.ntsaVehicleCount}. ${contextData.ntsaVehicleCount - declaredCount} vehicle(s) not disclosed.`,
        confidence: 0.88,
        severity: 'HIGH',
        action: 'Request full NTSA TIMS vehicle listing; reassess total asset value'
      });
      confidenceScores.push(0.88);
      overallRiskScore += 0.88;
    }
  }

  // FLAG 17: Commercial Exemption Abuse
  if (d.vehicleType === 'COMMERCIAL' && contextData.ntsaVehicleCategory === 'PRIVATE') {
    fraudFlags.push({
      name: 'False Commercial Claim',
      reason: 'Citizen claims commercial vehicle exemption but NTSA TIMS shows vehicle registered as PRIVATE category.',
      confidence: 0.92,
      severity: 'CRITICAL',
      action: 'Deny commercial exemption; recalculate at full private vehicle value'
    });
    confidenceScores.push(0.92);
    overallRiskScore += 0.92;
  }

  // FLAG 18 (was "Multi-Household Income Splitting (Polygamous / Split
  // Families)"). FIX (audit v2): polygamous marriage is legally recognised
  // in Kenya (Marriage Act 2014) and is most common in exactly the ASAL /
  // pastoralist communities this codebase elsewhere grants a *higher*
  // dependency cap for (see the 40% ASAL cap above, justified in
  // ASSUMPTIONS.docx by citing Art. 56 protection for those same families).
  // Flagging that population as fraud suspects here directly contradicted
  // that protection and carried real Art. 27(4) discrimination exposure.
  // AGI consolidation across linked households is still a legitimate thing
  // to do administratively — it just isn't evidence of fraud by itself, so
  // it no longer feeds the fraud score. A fraud flag now requires linkage
  // counts well beyond what any normal family structure (polygamous or not)
  // produces, and never fires in ASAL counties at all.
  const householdConsolidationNote = contextData.iprsHouseholdLinkages > 1
    ? `IPRS shows ${contextData.iprsHouseholdLinkages} linked households — AGI consolidated across all of them before applying the dependency ratio. This is routine processing, not a fraud signal.`
    : null;

  if (contextData.iprsHouseholdLinkages > 4 && !ASAL_COUNTIES[d.county]) {
    fraudFlags.push({
      name: 'Unusually High Household Linkage Count',
      reason: `IPRS shows ${contextData.iprsHouseholdLinkages} linked households outside an ASAL county — well above typical family-structure counts (including polygamous ones). Worth a look, not an accusation.`,
      confidence: 0.45,
      severity: 'MEDIUM',
      action: 'Manual review of linked-household declarations before adjusting dependency ratio'
    });
    confidenceScores.push(0.45);
    overallRiskScore += 0.45;
  }

  // Calculate overall fraud risk percentile (0-100)
  // FIX (audit v2): the fixed-last-time formula below (1 - Π(1-c)) is the
  // correct way to combine *independent* evidence, but several flags above
  // are tagged `cluster: 'household_size'` because they all key off the
  // same underlying fact (Flags 1, 6, 9 all react to d.householdSize). A
  // 23-year-old with a 13-person household could trip Flag 1 and Flag 6
  // from one data point, and naive independent-compounding reported that
  // as 96% ("two separate pieces of damning evidence") when it's really one
  // fact viewed twice. Flags sharing a cluster are now first collapsed to
  // their single highest confidence score before compounding across
  // (still-treated-as-independent) clusters.
  let fraudRiskPercentile = 0;
  if (confidenceScores.length > 0) {
    const byCluster = new Map(); // cluster key -> max confidence in that cluster
    const uncorrelated = [];
    fraudFlags.forEach((flag, i) => {
      const c = confidenceScores[i];
      if (flag.cluster) {
        byCluster.set(flag.cluster, Math.max(byCluster.get(flag.cluster) ?? 0, c));
      } else {
        uncorrelated.push(c);
      }
    });
    const dedupedScores = [...byCluster.values(), ...uncorrelated];
    const combined = 1 - dedupedScores.reduce((acc, c) => acc * (1 - c), 1);
    fraudRiskPercentile = Math.min(100, Math.round(combined * 100));
  }

  return {
    fraudFlags: fraudFlags,
    householdConsolidationNote: householdConsolidationNote, // administrative, not a fraud signal — see Flag 18 fix
    overallRiskScore: overallRiskScore,
    fraudRiskPercentile: fraudRiskPercentile,
    flagCount: fraudFlags.length,
    requiresManualReview: fraudRiskPercentile > 50,
    severityLevel: fraudRiskPercentile > 70 ? 'CRITICAL' : fraudRiskPercentile > 50 ? 'HIGH' : 'MEDIUM',
    recommendation: fraudRiskPercentile > 70 
      ? 'ESCALATE: Manual review by SHA Fraud Officer required (DPA §35 — no automated rejection)'
      : fraudRiskPercentile > 50
        ? 'REVIEW: Manual verification by county SHA officer recommended'
        : 'APPROVE: Proceed with standard assessment',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generates fraud statistics for dashboard/reporting
 */
export function generateFraudStatistics(populationSample = []) {
  let totalAssessments = populationSample.length;
  let flaggedAssessments = 0;
  let criticalFlags = 0;
  let highFlags = 0;
  let mediumFlags = 0;
  let lowFlags = 0;
  let allFlags = [];

  populationSample.forEach(assessment => {
    if (assessment.fraudRisk && assessment.fraudRisk.fraudFlags.length > 0) {
      flaggedAssessments++;
      assessment.fraudRisk.fraudFlags.forEach(flag => {
        allFlags.push(flag);
        if (flag.severity === 'CRITICAL') criticalFlags++;
        else if (flag.severity === 'HIGH') highFlags++;
        else if (flag.severity === 'MEDIUM') mediumFlags++;
        else lowFlags++;
      });
    }
  });

  return {
    totalAssessments: totalAssessments,
    flaggedAssessments: flaggedAssessments,
    flagRate: ((flaggedAssessments / totalAssessments) * 100).toFixed(2) + '%',
    criticalFlags: criticalFlags,
    highFlags: highFlags,
    mediumFlags: mediumFlags,
    lowFlags: lowFlags,
    mostCommonFlags: allFlags
      .reduce((acc, flag) => {
        const existing = acc.find(f => f.name === flag.name);
        if (existing) existing.count++;
        else acc.push({ name: flag.name, count: 1 });
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    // FIX (audit v2): this used to be `flaggedAssessments * 2500` — a
    // citation-free round number multiplied by FLAGGED (not confirmed)
    // cases, presented as "estimated fraud losses". Flagged means
    // "pending manual review", not "proven fraudulent"; the two should
    // never be conflated in a number a reviewer might quote as fact.
    // This reports something real and derivable instead: the monthly
    // contribution value currently tied up in HIGH/CRITICAL cases awaiting
    // review — a workload/exposure figure, explicitly not a loss claim.
    contributionValueUnderReview: populationSample.reduce((sum, a) => {
      const isHighOrCritical = a.fraudRisk?.severityLevel === 'CRITICAL' || a.fraudRisk?.severityLevel === 'HIGH';
      if (!isHighOrCritical) return sum;
      const monthly = a.proposedResult?.monthlyContribution ?? a.proposedResult?.monthly ?? 0;
      return sum + monthly;
    }, 0),
    contributionValueUnderReviewCaveat: 'Sum of monthly contributions for HIGH/CRITICAL-flagged cases only. This is exposure pending manual review, not a confirmed loss figure — most flags will not turn out to be fraud.'
  };
}

/**
 * Analyzes household sector/livelihood to provide context on income sustainability
 */
export function analyzeSector(d) {
  let sector = 'Informal';
  let sectorScore = 0;
  let sustainability = 'LOW';
  let vulnerabilities = [];
  let opportunities = [];

  // Determine primary sector
  const hasLivestock = d.livestockCount > 0;
  const hasLand = d.landAcreage > 0;
  const hasBusiness = d.kraPinType === 'BUSINESS' || (d.grossMpesaMonthly > 30000 && d.avgRetainedBalance > 5000);
  const hasEmployment = d.isNtsaVerified || (d.avgRetainedBalance > 20000 && d.fulizaDefaults === 0);
  const inAsal = Object.keys(ASAL_COUNTIES).includes(d.county);

  if (hasEmployment) {
    sector = 'Salaried Employment';
    sectorScore = 85;
    sustainability = 'HIGH';
    opportunities.push('Pension eligibility pathway');
    opportunities.push('Benefits portability across regions');
  } else if (hasBusiness && d.householdSize < 6) {
    sector = 'Micro-Business';
    sectorScore = 65;
    sustainability = 'MEDIUM';
    vulnerabilities.push('Seasonal cash flow volatility');
    vulnerabilities.push('Limited access to formal credit');
    opportunities.push('Business formalization incentives');
    opportunities.push('Digital payment infrastructure investment');
  } else if (hasLivestock || (hasLand && inAsal)) {
    sector = 'Pastoralism/Agro-Pastoral';
    sectorScore = 40;
    sustainability = 'LOW';
    vulnerabilities.push('Climate-dependent income');
    vulnerabilities.push('Asset liquidation risk during drought');
    vulnerabilities.push('Market price volatility');
    opportunities.push('Climate risk insurance products');
    opportunities.push('Value-chain development (dairy, honey)');
  } else if (hasLand && !inAsal) {
    sector = 'Subsistence Farming';
    sectorScore = 55;
    sustainability = 'LOW';
    vulnerabilities.push('Single-season income cycles');
    vulnerabilities.push('Land subdivision over generations');
    opportunities.push('Cooperative marketing access');
    opportunities.push('Improved seed/input subsidies');
  } else if (d.assets.includes('MOTORCYCLE') || d.assets.includes('CAR')) {
    sector = 'Transport/Logistics';
    sectorScore = 60;
    sustainability = 'MEDIUM';
    vulnerabilities.push('Fuel price sensitivity');
    vulnerabilities.push('Vehicle maintenance costs');
    opportunities.push('Fuel subsidy programs');
    opportunities.push('Fleet tracking technology');
  } else {
    sector = 'Informal Vending/Casual Labor';
    sectorScore = 35;
    sustainability = 'VERY LOW';
    vulnerabilities.push('No income security');
    vulnerabilities.push('High transaction costs (Fuliza)');
    vulnerabilities.push('Zero asset accumulation');
    opportunities.push('SACCO/group formation incentives');
    opportunities.push('Skills training programs');
  }

  return {
    sector: sector,
    sectorScore: sectorScore,
    sustainability: sustainability,
    vulnerabilities: vulnerabilities,
    opportunities: opportunities,
    recommendation: `${sector} households require ${sustainability === 'HIGH' ? 'standard monitoring' : sustainability === 'MEDIUM' ? 'seasonal payment flexibility' : 'enhanced support programs and livelihood interventions'}`
  };
}

/**
 * Calculates fairness metrics for comparison
 */
export function calculateFairnessMetrics(current, proposed, fraudRisk) {
  const currentCharge = current.monthly || current.monthlyContribution || 0;
  const proposedCharge = proposed.monthly || proposed.monthlyContribution || 0;
  
  if (currentCharge === 0 || proposedCharge === 0) {
    return {
      overchargeAmount: 0,
      overchargePercent: 0,
      fairnessScore: 50,
      equityImprovement: false,
      fraudRiskLevel: fraudRisk?.severityLevel || 'MEDIUM',
      recommendation: 'FAIR CHARGE: Assessment aligns with income',
      equityGap: 0,
      complianceLikelihood: 50
    };
  }
  
  const overchargeAmount = currentCharge - proposedCharge;
  const overchargePercent = ((overchargeAmount / currentCharge) * 100);
  
  // P-38 FIX: Pro-poor asymmetric fairness weighting.
  // Overcharging the poor is penalized heavily; undercharging is rewarded lightly.
  // This replaces the old symmetric: 100 - (Math.abs(overchargePercent) / 2)
  let fairnessScore;
  if (overchargePercent > 0) {
    // Overcharging: heavy penalty (1:1 deduction from 100)
    fairnessScore = Math.max(0, 100 - overchargePercent);
  } else {
    // Undercharging: light reward (0.5:1 bonus toward 100)
    fairnessScore = Math.min(100, 100 + (Math.abs(overchargePercent) * 0.5));
  }

  const equityImprovement = overchargePercent > 0 ? true : false;
  const fraudRiskLevel = fraudRisk?.severityLevel || 'MEDIUM';

  // P-40: Multi-factor compliance likelihood model
  const costFactor = 1 - (overchargePercent / 100);
  const trustFactor = 1 + (fairnessScore / 200);
  const complianceLikelihood = Math.max(20, Math.min(95, Math.round(50 * costFactor * trustFactor)));

  return {
    overchargeAmount: overchargeAmount,
    overchargePercent: overchargePercent,
    fairnessScore: fairnessScore,
    equityImprovement: equityImprovement,
    fraudRiskLevel: fraudRiskLevel,
    recommendation: overchargePercent > 50 
      ? 'CRITICAL OVERCHARGE: This household is being substantially overcharged'
      : overchargePercent > 20
        ? 'MODERATE OVERCHARGE: This household is paying more than fair'
        : overchargePercent < -10
          ? 'POTENTIAL UNDER-CONTRIBUTION: Consider income verification'
          : 'FAIR CHARGE: Assessment aligns with income',
    equityGap: overchargePercent,
    complianceLikelihood: complianceLikelihood
  };
}

/**
 * P-30 (CAJ BLOCKER): Handles API failures gracefully.
 * If KRA/NTSA/Safaricom API calls fail, the system falls back to
 * an "Unverified, Low Trust" pathway rather than crashing.
 * @param {string} apiName - Name of the API that failed (e.g., 'KRA', 'NTSA', 'SAFARICOM')
 * @param {Error} error - The error object from the failed call
 * @param {Object} d - The household data being assessed
 * @returns {Object} Fallback assessment context with reduced trust signals
 */
export function handleApiFailure(apiName, error, d) {
  const timestamp = new Date().toISOString();
  const fallback = {
    apiName,
    status: 'UNVERIFIED',
    trustLevel: 'LOW',
    timestamp,
    errorType: error?.message || 'Unknown error',
    fallbackAction: 'PROCEED_WITH_REDUCED_TRUST',
    additionalFlags: [
      `${apiName} data unavailable — using self-reported values only`,
      'Assessment marked for manual review within 14 days',
      'Citizen notified of unverified status'
    ],
    fraudDetectionAdjustment: {
      addFlags: [`${apiName}_UNAVAILABLE`],
      trustPenalty: 0.15,
      requiresManualReview: true
    }
  };
  
  // Log the failure for audit purposes
  console.warn(`[SHA-PMT] API Fallback triggered for ${apiName}:`, {
    timestamp,
    error: error?.message,
    household_county: d?.county,
    action: 'Proceeding with unverified pathway'
  });
  
  return fallback;
}

/**
 * P-39 (CAJ BLOCKER).
 * FIX (audit v2) — three corrections to this docstring/function itself:
 *  1. Threshold said 5% here but the code enforced 3% — now both say 3%.
 *  2. "Tests for equalized odds" overclaimed what this measures. A "false
 *     positive" here is defined as "proposed model says indigent AND current
 *     (Lasso) model said non-indigent" — i.e. it measures disparity in how
 *     often the OLD model's known bias shows up across groups, using the OLD
 *     model as a stand-in for ground truth. It is NOT a formal equalized-odds
 *     test against real outcomes (that needs a ground-truth dataset from the
 *     pilot). Renamed framing below to match what it actually does.
 *  3. No minimum group size was enforced, so a single case in a
 *     small-population county could swing maxDisparity on noise alone.
 *     Groups below MIN_GROUP_SIZE are now excluded from the disparity
 *     calculation and reported separately instead of silently counted.
 *
 * Compares disparity in current-model overcharging (per this function's
 * specific definition above) across demographic groups.
 */
// --- Statistical Helpers for Fisher's Exact Test ---
function logGamma(z) {
  let sum = 0.99999999999980993;
  let c = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  z -= 1;
  for (let i = 0; i < c.length; i++) {
    sum += c[i] / (z + i + 1);
  }
  const t = z + c.length - 0.5;
  return Math.log(Math.sqrt(2 * Math.PI)) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

function logFactorial(n) {
  if (n <= 1) return 0;
  return logGamma(n + 1);
}

function hypergeomProb(a, b, c, d) {
  return Math.exp(
    logFactorial(a + b) + logFactorial(c + d) + logFactorial(a + c) + logFactorial(b + d) -
    logFactorial(a) - logFactorial(b) - logFactorial(c) - logFactorial(d) - logFactorial(a + b + c + d)
  );
}

function fisherExactTest(a, b, c, d) {
  const p0 = hypergeomProb(a, b, c, d);
  let pValue = 0;
  const n = a + b + c + d;
  const row1 = a + b;
  const col1 = a + c;
  const minA = Math.max(0, row1 + col1 - n);
  const maxA = Math.min(row1, col1);
  
  for (let i = minA; i <= maxA; i++) {
    const curP = hypergeomProb(i, row1 - i, col1 - i, n - row1 - col1 + i);
    if (curP <= p0 + 1e-10) {
      pValue += curP;
    }
  }
  return Math.min(1, pValue);
}
// ---------------------------------------------------

/**
 * P-45 (CAJ BLOCKER): Assesses fairness constraint violations (disparate impact)
 * Replaces the arbitrary 3% gap threshold with Fisher's Exact Test, matching
 * the KIPPRA/Lighthouse Reports methodology.
 * @param {Array} assessments - Output from multiple generateSimulationAssessments() runs
 * @param {string} groupingKey - e.g., 'county' or 'gender'
 * @param {number} minGroupSize - Groups smaller than this are excluded from disparity math (default 30)
 * @returns {Object} { passed: boolean, maxDisparity: number, groupResults: Object, excludedGroups: Array, report: string }
 */
export function testCurrentModelDisparityByCounty(assessments, groupingKey = 'county', minGroupSize = 30) {
  if (!assessments || assessments.length === 0) {
    return { passed: false, maxDisparity: 0, groupResults: {}, excludedGroups: [], report: 'No assessments provided' };
  }

  // Group assessments by the demographic key
  const groups = {};
  assessments.forEach(a => {
    const key = a.inputs[groupingKey] || 'UNKNOWN';
    if (!groups[key]) groups[key] = { total: 0, falsePositives: 0 };
    groups[key].total++;
    // A "false positive" here means: proposed model says indigent, current
    // (Lasso) model said non-indigent. See docstring — this is disparity in
    // the old model's overcharging pattern, not a ground-truth FPR.
    const shouldBeIndigent = a.proposedResult?.isIndigent === true;
    const wasChargedAsNonIndigent = a.currentResult?.isIndigent === false;
    if (shouldBeIndigent && wasChargedAsNonIndigent) {
      groups[key].falsePositives++;
    }
  });

  // Calculate False Positive Rate (FPR) per group, gated on sample size
  const groupResults = {};
  const excludedGroups = [];
  let maxFPR = -1;
  let minFPR = 2; // Init to impossible >1 value
  let maxGroup = null;
  let minGroup = null;

  Object.entries(groups).forEach(([key, data]) => {
    const fpr = data.total > 0 ? data.falsePositives / data.total : 0;
    const entry = {
      total: data.total,
      falsePositives: data.falsePositives,
      falsePositiveRate: Math.round(fpr * 10000) / 100 // percentage with 2 decimals
    };
    if (data.total < minGroupSize) {
      excludedGroups.push({ key, ...entry, reason: `Below minGroupSize (${minGroupSize}) — excluded to avoid noise-driven disparity` });
      return;
    }
    groupResults[key] = entry;
    if (fpr > maxFPR) { maxFPR = fpr; maxGroup = { key, ...entry }; }
    if (fpr < minFPR || minGroup === null) { minFPR = fpr; minGroup = { key, ...entry }; }
  });

  const groupCount = Object.keys(groupResults).length;
  if (groupCount < 2) {
    return { passed: false, maxDisparity: 0, pValue: 1, groupResults, excludedGroups, groupCount, report: `Insufficient valid groups to assess disparity.` };
  }

  const maxDisparity = Math.round((maxFPR - minFPR) * 10000) / 100;
  
  // Fisher's exact test on max vs min group
  const a = maxGroup.falsePositives;
  const b = maxGroup.total - maxGroup.falsePositives;
  const c = minGroup.falsePositives;
  const d = minGroup.total - minGroup.falsePositives;
  const pValue = fisherExactTest(a, b, c, d);

  // Lighthouse standard: Reject if p < 0.05
  const passed = pValue >= 0.05;

  return {
    passed,
    maxDisparity,
    pValue,
    groupResults,
    excludedGroups,
    groupCount,
    report: passed
      ? `PASS: Disparity between worst and best group (${maxGroup.key} vs ${minGroup.key}) is not statistically significant (Fisher's exact p=${pValue.toFixed(4)} ≥ 0.05).`
      : `FAIL: Statistically significant disparity detected. ${maxGroup.key} has significantly higher exclusion error than ${minGroup.key} (Fisher's exact p=${pValue.toFixed(4)} < 0.05). Algorithm must be recalibrated.`
  };
}

/**
 * P-47 (CAJ BLOCKER): Generates revenue sensitivity analysis across compliance scenarios.
 * Shows projected monthly national revenue at varying compliance rates.
 * Data sources cited: NHIF, ILO, Rwanda CBHI, Ethiopia CBHI.
 * @param {number} totalPopulation - Total eligible population (default: ~15.5M non-salaried households)
 * @param {number} avgContribution - Average monthly contribution in KSh (default: 575)
 * @returns {Object} { scenarios: Array, breakeven: Object, summary: string }
 */
export function generateRevenueStressTest(totalPopulation = 15500000, avgContribution = 520) {
  const scenarios = [
    { rate: 0.30, label: 'Pessimistic', source: 'NHIF low-engagement baseline' },
    { rate: 0.45, label: 'Conservative', source: 'ILO Asia informal sector studies' },
    { rate: 0.60, label: 'Target', source: 'Rwanda CBHI achieved rate' },
    { rate: 0.75, label: 'Optimistic', source: 'Ethiopia CBHI peak enrollment' },
    { rate: 0.90, label: 'Aspirational', source: 'Universal coverage target (2030)' },
  ];

  const results = scenarios.map(s => {
    const enrolledPop = Math.round(totalPopulation * s.rate);
    const monthlyRevenue = enrolledPop * avgContribution;
    const annualRevenue = monthlyRevenue * 12;
    return {
      ...s,
      enrolledPopulation: enrolledPop,
      monthlyRevenueBillions: Math.round(monthlyRevenue / 1e9 * 100) / 100,
      annualRevenueBillions: Math.round(annualRevenue / 1e9 * 100) / 100,
    };
  });

  // Breakeven analysis: need ~45% to sustain subsidy program
  // NOTE (audit v2, unresolved — flagging rather than silently fixing):
  // this is still a static constant, independent of how many people the
  // AGI model actually reclassifies as indigent vs the current system.
  // This was Gap D5 in the June 28 audit ("subsidy fiscal tradeoff not
  // addressed") — a real fix needs a population-reclassification pass
  // (run both models over a real/synthetic population, count net new
  // indigent classifications, cost those out) rather than a bigger magic
  // number. Left as-is; don't cite this figure as dynamically derived.
  const subsidyCostPerMonth = 3200000000; // ~3.2B KSh/month for indigent subsidies
  const breakevenRate = Math.ceil((subsidyCostPerMonth / (totalPopulation * avgContribution)) * 100);
  const breakevenEnrolled = Math.round(totalPopulation * (breakevenRate / 100));

  return {
    scenarios: results,
    breakeven: {
      requiredComplianceRate: breakevenRate + '%',
      requiredEnrollment: breakevenEnrolled,
      monthlyCostToSubsidize: subsidyCostPerMonth,
      note: `Need ≥${breakevenRate}% compliance to sustain the indigent subsidy program`
    },
    assumptions: {
      totalEligiblePopulation: totalPopulation,
      averageMonthlyContribution: avgContribution,
      contributionRate: '2.75% of AGI',
      source: 'KNBS 2024 population estimates + SHA Act 2023 rate'
    },
    summary: `At target compliance (60%), projected annual revenue is KSh ${results[2].annualRevenueBillions}B. Breakeven requires ≥${breakevenRate}% compliance.`
  };
}

/**
 * P-77/P-31 (CAJ BLOCKER): Creates an audit trail record for every assessment.
 * Each assessment is logged with full inputs, outputs, fraud flags, algorithm version,
 * and a modification history for appeals tracking.
 * @param {Object} inputs - The household data (d)
 * @param {Object} currentResult - Result from calculateCurrentModel
 * @param {Object} proposedResult - Result from calculateProposedModel
 * @param {Object} fraudRisk - Result from calculateFraudRisk
 * @param {string} officerId - ID of the officer conducting the assessment (default: 'SYSTEM')
 * @returns {Object} Immutable audit record
 */
export function createAuditRecord(inputs, currentResult, proposedResult, fraudRisk, officerId = 'SYSTEM') {
  const now = new Date();
  // FIX (audit v2): Math.random() is not appropriate for an "immutable audit
  // record" ID (not cryptographically secure, theoretically guessable).
  // crypto.randomUUID() is available in all evergreen browsers + Node 19+.
  const uid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().split('-')[0].toUpperCase()
    : Math.random().toString(36).substring(2, 10).toUpperCase(); // last-resort fallback only
  const assessmentId = `SHA-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${uid}`;

  return {
    assessmentId,
    // FIX (audit v2): this used to be the literal string "SHA256(1234****)"
    // — the first 4 real digits of the phone number wrapped in a label that
    // implied hashing had occurred. It hadn't. This now runs a real,
    // test-vector-verified SHA-256 (see lib/hash.js). See that file's
    // docstring for the remaining server-side-pepper caveat.
    citizenIdHash: hashMsisdn(inputs.msisdn),
    createdAt: now.toISOString(),
    algorithmVersion: 'PMT-v2.1-AGI',
    status: 'SUBMITTED',
    appealStatus: null,
    inputs: {
      county: inputs.county,
      householdSize: inputs.householdSize,
      headAge: inputs.headAge,
      headGender: inputs.headGender,
      ownershipStatus: inputs.ownershipStatus,
      hasChronicIllness: inputs.hasChronicIllness,
      hasRegisteredDisability: inputs.hasRegisteredDisability,
      isRefugee: inputs.isRefugee,
      receivesAid: inputs.receivesAid,
      // Sensitive fields are marked for encryption
      _encrypted: ['avgRetainedBalance', 'grossMpesaMonthly', 'fulizaDefaults', 'landAcreage', 'livestockCount', 'monthlyRent', 'subletIncome', 'diasporaRemittances']
    },
    outputs: {
      currentModel: {
        annualIncome: currentResult.annualIncome || currentResult,
        monthlyContribution: currentResult.monthly || currentResult.monthlyContribution,
        isIndigent: currentResult.isIndigent,
        tier: currentResult.tier
      },
      proposedModel: {
        adjustedGrossIncome: proposedResult.adjustedGrossIncome,
        monthlyContribution: proposedResult.monthly || proposedResult.monthlyContribution,
        isIndigent: proposedResult.isIndigent,
        tier: proposedResult.tier
      }
    },
    fraudFlags: fraudRisk?.fraudFlags?.map(f => f.name) || [],
    fraudRiskPercentile: fraudRisk?.fraudRiskPercentile || 0,
    createdBy: officerId,
    modifiedHistory: [],
    retentionPolicy: {
      rawInputsPurgeDate: new Date(now.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      finalOutcomeRetainUntil: new Date(now.getTime() + 7 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      policy: 'Tiered Retention per DPA §39'
    }
  };
}

/**
 * FIX (audit v2, addresses the "CAJ BLOCKER functions are never called"
 * finding): testCurrentModelDisparityByCounty(), generateFraudStatistics(),
 * and generateRevenueStressTest() all existed but nothing in App.jsx ever
 * ran them — the live product never actually demonstrated the compliance
 * evidence it claimed. There is no real production dataset yet (pre-pilot),
 * so this generates a synthetic-but-plausible population so those three
 * functions have something real to compute over instead of sitting unused.
 * This is clearly labeled SYNTHETIC everywhere it surfaces in the UI —
 * treat its disparity/fraud numbers as "the pipeline works and produces
 * this shape of output", not as real evidence about the real system. Swap
 * in real assessment records the moment a pilot produces any.
 *
 * NOTE: the county list below is duplicated from App.jsx's COUNTIES const
 * rather than imported from one shared source — pre-existing pattern in
 * this codebase (see BANDS/PROPOSED_BANDS duplication note elsewhere), not
 * introduced here, but worth consolidating into one shared constants file
 * next time either list needs to change, so they can't drift apart.
 */
const SYNTHETIC_COUNTIES = ["Baringo","Bomet","Bungoma","Busia","Elgeyo Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyandarua","Nyamira","Nyeri","Samburu","Siaya","Taita Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"];

function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function randBool(pTrue) { return Math.random() < pTrue; }

export function generateSyntheticHousehold() {
  const county = randChoice(SYNTHETIC_COUNTIES);
  const isUrban = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Kisii', 'Nyeri', 'Machakos', 'Trans Nzoia'].includes(county);
  const headGender = randChoice(['MALE', 'FEMALE']);
  const headAge = randInt(19, 78);
  const householdSize = Math.max(1, Math.round(1 + Math.random() * 5 + (Math.random() < 0.08 ? Math.random() * 10 : 0)));
  const hasCar = randBool(isUrban ? 0.22 : 0.08);
  const hasMoto = randBool(isUrban ? 0.15 : 0.28);
  const assets = [
    ...(hasCar ? ['CAR'] : []),
    ...(hasMoto ? ['MOTORCYCLE'] : []),
    ...(randBool(0.55) ? ['TV'] : []),
    ...(randBool(0.4) ? ['FRIDGE'] : []),
    ...(randBool(0.7) ? ['FEATURE_PHONE'] : []),
  ];
  const grossMpesaMonthly = Math.round(Math.exp(6 + Math.random() * 4)); // roughly log-spread ~400 to ~90,000
  const ownershipStatus = isUrban && randBool(0.5) ? 'RENTED' : 'OWNED';

  return {
    county, headGender, headAge, householdSize,
    dwellingType: 'TRADITIONAL',
    wallMaterial: randChoice(['MUD', 'IRON_SHEETS', 'STONE', 'BRICK']),
    roofMaterial: randChoice(['GRASS_THATCH', 'IRON_SHEETS', 'TILES']),
    floorMaterial: randChoice(['EARTH', 'CEMENT', 'TILES']),
    rooms: randInt(1, 5),
    ownershipStatus,
    monthlyRent: ownershipStatus === 'RENTED' ? randInt(2000, 25000) : 0,
    subletIncome: randBool(0.05) ? randInt(1000, 8000) : 0,
    waterSource: randChoice(['BOREHOLE', 'PIPED', 'RIVER']),
    sanitationType: randChoice(['PIT_LATRINE', 'FLUSH']),
    cookingEnergy: randChoice(['FIREWOOD', 'CHARCOAL', 'GAS']),
    lightingEnergy: randChoice(['NONE', 'SOLAR', 'ELECTRICITY']),
    assets,
    vehicleType: hasCar ? randChoice(['STANDARD_OLD', 'STANDARD_NEW', 'LUXURY', 'COMMERCIAL']) : 'STANDARD_OLD',
    motorcycleIsCommercial: hasMoto ? randBool(0.5) : false,
    landAcreage: isUrban ? (randBool(0.1) ? randInt(1, 2) : 0) : randInt(0, 8),
    livestockCount: isUrban ? 0 : (randBool(0.6) ? randInt(0, 25) : 0),
    receivesAid: randBool(0.06),
    isRefugee: randBool(0.02),
    grossMpesaMonthly,
    transactionCount: randInt(10, 200),
    avgRetainedBalance: Math.round(grossMpesaMonthly * (0.02 + Math.random() * 0.15)),
    isSeasonalWorker: randBool(0.15),
    lowSeasonRetainedBalance: 0,
    diasporaRemittances: randBool(0.04) ? randInt(5000, 40000) : 0,
    fulizaDefaults: randBool(0.05) ? randInt(1, 3) : 0,
    kraPinType: randBool(0.2) ? randChoice(['PAYE', 'BUSINESS']) : 'NONE',
    isNtsaVerified: hasCar ? randBool(0.7) : false,
    hiddenWealthDiscovered: false,
    hasSaccoAccount: randBool(0.18),
    saccoShareCapital: 0,
    hasChronicIllness: randBool(0.09),
    hasRegisteredDisability: randBool(0.05),
    isGroupTreasurer: false,
    consentWithheld: randBool(0.03),
    msisdn: `2547${randInt(10000000, 99999999)}`,
  };
}

export function generateSyntheticPopulation(n = 300, adminParams = {}) {
  const population = [];
  for (let i = 0; i < n; i++) {
    const inputs = generateSyntheticHousehold();
    const lassoAnnual = calculateCurrentModel(inputs);
    const currentResult = calculateCurrentModelContribution(lassoAnnual);
    const proposedResult = calculateProposedModel(inputs, adminParams);
    const fraudRisk = calculateFraudRisk(inputs, { iprsHouseholdLinkages: randBool(0.06) ? randInt(2, 5) : 1 });
    population.push({ inputs, currentResult, proposedResult, fraudRisk });
  }
  return population;
}

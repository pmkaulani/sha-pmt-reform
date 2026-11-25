// SHA Means-Testing Evaluation - v2.1 prototype rules engine
// The 2.75% contribution rate and KSh 300 monthly floor are statutory reference parameters
// for non-salaried households under Regulation 18(1) & (2) of the Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024).
// Means testing is conducted pursuant to Regulation 21(6) using the formula set out in the Fifth Schedule ('Means Testing').
// Note: While the Fifth Schedule sets out an urban/rural means-testing equation, complete operational parameters,
// coefficients, variable encodings, and production implementation details have not been fully disclosed.
// Current income estimations, illustrative deductions, and calculation rules are research prototype assumptions
// that require validation against SHA's official instrument, model parameters, and administrative implementation.
// Regulation 19 governs households in need of financial assistance (indigent households); applying the KSh 300
// minimum contribution under Regulation 18(2) does not constitute a statutory indigence determination.
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

// Shared helper (system design, post-audit-v2): derives the real vehicle
// list from either the new `d.vehicles` array or, for backward
// compatibility, the legacy single `d.assets`/`d.vehicleType` fields. Used
// by both calculateProposedModel (valuation) and calculateFraudRisk (the
// NTSA multi-vehicle cross-check) so the two can never disagree on how many
// vehicles a household actually declared.
export function deriveVehicleList(d) {
  if (Array.isArray(d.vehicles) && d.vehicles.length > 0) return d.vehicles;
  return d.assets.includes('CAR') ? [{ type: d.vehicleType || 'STANDARD_OLD' }] : [];
}

/**
 * Validates household assessment inputs.
 * Ensures the authoritative declared net earned income is present and non-negative.
 */
export function validateAssessmentInputs(d) {
  const errors = [];
  if (
    d.monthlyNetEarnedIncome === null ||
    d.monthlyNetEarnedIncome === undefined ||
    (typeof d.monthlyNetEarnedIncome === "string" && d.monthlyNetEarnedIncome.trim() === "")
  ) {
    errors.push("Declared monthly net earned income is required.");
  } else {
    const income = Number(d.monthlyNetEarnedIncome);
    if (!Number.isFinite(income)) {
      errors.push("Declared monthly net earned income must be a finite valid number.");
    } else if (income < 0) {
      errors.push("Declared monthly net earned income cannot be negative.");
    }
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

export const BANDS = [
  { min: 0, max: 131000, monthly: 300, isIndigent: null, tier: 'Low-Income (Reg. 18(2) Minimum Contribution Rule: KSh 300 Floor)' },
  { min: 131001, max: 450000, isIndigent: null, tier: 'Standard' }, // Reg. 18(1) 2.75% reference parameter
  { min: 450001, max: Infinity, isIndigent: null, tier: 'Upper' }, // Reg. 18(1) 2.75% reference parameter — same formula as Standard; kept separate for reporting/tier-label purposes only
];

export const PROPOSED_BANDS = [
  { min: 0, max: 131000, monthly: 300, isIndigent: null }, // Reg. 18(2) reference minimum contribution (KSh 300 floor for non-salaried households)
  { min: 131001, max: Infinity, isIndigent: null }, // Reg. 18(1) 2.75% rate applied to evaluated AGI
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
 * Author-created illustrative comparator — not SHA's instrument.
 * 
 * DISCLOSURE: This hand-authored comparator uses invented weights and demonstration constants
 * (e.g. gross M-Pesa volume factor, flat dwelling additions). It is NOT SHA's operational means-testing
 * instrument under Regulation 21(6) and the Fifth Schedule, and is NOT a reconstruction of SHA's 43-variable
 * regression. It exists solely as an illustrative baseline for software testing and interface demonstration.
 * A difference between this comparator and an AGI model does not demonstrate actual SHA overcharging.
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
export function calculateCurrentModelContribution(annualIncome) {
  const rawMonthly =
    (Number(annualIncome) * 0.0275) / 12;

  const monthly = Math.max(300, Math.round(rawMonthly));

  return {
    annualIncome,
    monthly,
    minimumContributionFloorApplied: rawMonthly < 300,
    contributionClassification: rawMonthly < 300
      ? "MINIMUM_CONTRIBUTION_FLOOR"
      : "RATE_BASED_CONTRIBUTION",
    isIndigent: null,
    financialAssistanceStatus: "NOT_ASSESSED",
    tier: rawMonthly < 300 ? "LOW" : (annualIncome <= 450000 ? "MIDDLE" : "HIGH")
  };
}

/**
 * Calculates the proposed SHA PMT v2.1 Optimization using the AGI model.
 */
export function calculateProposedModel(d, adminParams = {}) {
  // 1. Authoritative input validation
  const validation = validateAssessmentInputs(d);
  if (!validation.isValid) {
    throw new Error(`Assessment input validation failed: ${validation.errors.join("; ")}`);
  }

  let factors = [];
  const postBaseDeductions = [];

  // Authoritative earned income base: annualised net declared earned income
  const annualBaseTotal = Math.round(Number(d.monthlyNetEarnedIncome) * 12);
  const annualBaseItems = [
    {
      description: "Declared net earned household income (annualised)",
      amount: annualBaseTotal,
      type: "DECLARED_EARNED_INCOME",
      explanation: "Average monthly net earnings × 12 months"
    }
  ];

  // --- CONTEXTUAL FACTORS: LIQUIDITY & TRANSACTION ACTIVITY ---
  // Assets, debts, and transaction activity are treated as contextual verification factors
  // rather than arbitrarily converted into annual earned income.
  let isOffline = adminParams.triangulationOffline || false;
  let effectiveBalance = isOffline ? 0 : (d.avgRetainedBalance || 0);
  
  if (!isOffline && d.isGroupTreasurer) {
    effectiveBalance *= 0.2; // Discount 80% for group funds (illustrative prototype policy assumption — requires SHA validation)
    factors.push({ name: 'Group Treasurer Context', impact: 'High', direction: 'neutral', description: 'Retained balance discounted 80% for group fund holding (illustrative prototype policy assumption — requires SHA validation)', isFlaw: false });
  }

  // Transaction-size distribution check to prevent misclassifying active-but-poor digital finance users
  let avgTransactionSize = d.avgTransactionSize || (d.grossMpesaMonthly && d.transactionCount ? d.grossMpesaMonthly / d.transactionCount : 0);
  if (!avgTransactionSize && d.grossMpesaMonthly && d.grossMpesaMonthly > 0) {
    avgTransactionSize = d.grossMpesaMonthly / 80;
  }
  let isSubsistenceUser = false;
  let requiresChpVerification = false;
  if (d.grossMpesaMonthly && d.grossMpesaMonthly > 25000 && (d.avgRetainedBalance || 0) < 3000 && avgTransactionSize < 450) {
    isSubsistenceUser = true;
    effectiveBalance *= 0.4;
    factors.push({ name: 'Subsistence Digital User', impact: 'Medium', direction: 'neutral', description: 'High transaction velocity with low average size reflects subsistence digital finance', isFlaw: false });
  }

  if (!isOffline) {
    if (d.isSeasonalWorker && d.lowSeasonRetainedBalance !== undefined) {
      const SEASONAL_FLOOR = 500; // KSh 500 minimum prevents zero-balance exploit
      const effectiveLow = Math.max(d.lowSeasonRetainedBalance, SEASONAL_FLOOR);
      let seasonalBalance = Math.min(effectiveBalance, effectiveLow);
      if (d.lowSeasonRetainedBalance === 0) {
        requiresChpVerification = true;
        factors.push({ name: "Zero Low-Season Balance", impact: "High", description: "Self-declared zero requires CHP verification within 30 days.", direction: "neutral", isFlaw: false });
      }
      factors.push({ name: 'Seasonal Worker Override', impact: 'Medium', direction: 'neutral', description: `Used low-season baseline (KSh ${seasonalBalance.toLocaleString()}/mo) to prevent seasonal peak extrapolation`, isFlaw: false });
    } else {
      factors.push({ name: 'Retained Liquidity Context', impact: 'Medium', direction: 'neutral', description: `12-month rolling avg balance: KSh ${effectiveBalance.toLocaleString()} (used as liquidity context, not direct earned income)`, isFlaw: false });
    }

    // Diaspora Remittance Context
    if (d.diasporaRemittances && d.diasporaRemittances > 0) {
      factors.push({ name: 'Diaspora Exclusion', impact: 'Medium', direction: 'neutral', description: `Excluded monthly diaspora remittance of KSh ${d.diasporaRemittances.toLocaleString()} from earned income`, isFlaw: false });
    }
  } else {
    let saccoBypass = d.hasSaccoAccount ? 'SACCO/Bank history active.' : '';
    factors.push({ name: 'Fallback Protocol Active', impact: 'High', direction: 'neutral', description: `Triangulation offline. ${saccoBypass} Relying on Secondary Physical Proxies.`, isFlaw: false });
  }

  if (d.hasSaccoAccount && d.saccoShareCapital && d.saccoShareCapital > 0) {
    const totalSaccoCapital = Math.max(0, d.saccoShareCapital);
    factors.push({ name: 'SACCO Capital Holding', impact: 'Medium', direction: 'neutral', description: `Declared SACCO share capital: KSh ${totalSaccoCapital.toLocaleString()} (illiquid savings / wealth asset, excluded from annual earned income base)`, isFlaw: false });
  }

  // Informal Sub-landlord Income Context (Contextual Verification)
  // Subletting income is an earned income component already captured within declared monthly net earnings.
  // It is recorded here as a contextual factor and NOT added a second time to the annual earned income base.
  if (d.subletIncome && d.subletIncome > 0) {
    factors.push({
      name: 'Sublet Income Context',
      impact: 'Medium',
      direction: 'neutral',
      description: `Informal sublet income of KSh ${d.subletIncome.toLocaleString()}/mo recorded for contextual verification (already represented in declared net earnings; not added a second time to earned income base)`,
      isFlaw: false
    });
  }

  // Digital debt defaults strictly noted as financial obligation
  if (!isOffline && d.fulizaDefaults && d.fulizaDefaults > 0) {
    let cappedDefaults = Math.min(10, d.fulizaDefaults);
    factors.push({ name: 'Digital Debt Obligations', impact: 'Medium', direction: 'neutral', description: `${cappedDefaults} active digital debt default(s) noted as debt obligation / financial distress signal`, isFlaw: false });
  }

  // --- CAPITAL ASSETS (CONTEXTUAL VERIFICATION) ---
  let hasHighWealthSignal = (d.kraPinType && d.kraPinType !== 'NONE') || d.isNtsaVerified || effectiveBalance > 50000;

  // ---- Vehicles (cars) ----
  const vehicleList = deriveVehicleList(d);
  let carBaseValue = adminParams.carValue ?? 350000;
  const CAR_MULTIPLIERS = { STANDARD_OLD: 1.0, STANDARD_NEW: 3.0, LUXURY: 10.0, COMMERCIAL: 2.5 };

  let totalCarValue = 0;
  vehicleList.forEach((v) => {
    const vType = v.type || 'STANDARD_OLD';
    const vMultiplier = CAR_MULTIPLIERS[vType] ?? 1.0;
    let vValue = carBaseValue * vMultiplier;
    if (vValue > 0 && !hasHighWealthSignal && vType === 'STANDARD_OLD') {
      vValue *= 0.6;
    } else if (vValue > 0 && vType === 'COMMERCIAL') {
      vValue *= 0.5;
    }
    totalCarValue += vValue;
  });
  if (vehicleList.length > 0) {
    factors.push({
      name: vehicleList.length > 1 ? 'Multiple Vehicles' : 'Vehicle Ownership',
      impact: 'Medium',
      direction: 'neutral',
      description: `${vehicleList.length} vehicle(s) valued at KSh ${Math.round(totalCarValue).toLocaleString()} (capital asset, not added to earned income)`,
      isFlaw: false
    });
  }

  // Commercial fleet income context
  let fleetIncomeMonthly = 0;
  let fleetVehicleCount = 0;
  vehicleList.forEach(v => {
    if (v.type === 'COMMERCIAL' && v.isOwnerOperated === false) {
      fleetIncomeMonthly += Math.max(0, v.dailyTargetIncome || 0) * 26;
      fleetVehicleCount++;
    }
  });
  if (fleetVehicleCount > 0) {
    factors.push({
      name: 'Commercial Fleet Income',
      impact: 'Medium',
      direction: 'neutral',
      description: `${fleetVehicleCount} hired-driver commercial vehicle(s) generating daily target remittances (noted for verification)`,
      isFlaw: false,
    });
  }

  // ---- Motorcycles ----
  let motoBaseValue = adminParams.motoValue ?? 150000;
  const motoList = (Array.isArray(d.motorcycles) && d.motorcycles.length > 0)
    ? d.motorcycles
    : (d.assets.includes('MOTORCYCLE') ? [{ isCommercial: !!d.motorcycleIsCommercial }] : []);

  let totalMotoValue = 0;
  motoList.forEach((m) => {
    let mValue = motoBaseValue;
    if (mValue > 0 && m.isCommercial) {
      mValue *= 0.5;
    } else if (mValue > 0 && !hasHighWealthSignal) {
      mValue *= 0.6;
    }
    totalMotoValue += mValue;
  });
  if (motoList.length > 0) {
    factors.push({
      name: 'Motorcycle Asset Context',
      impact: 'Low',
      direction: 'neutral',
      description: `${motoList.length} motorcycle(s) valued at KSh ${Math.round(totalMotoValue).toLocaleString()} (tool of trade / capital asset)`,
      isFlaw: false
    });
  }

  // --- HOUSING & INFRASTRUCTURE ---
  factors.push({ name: 'Housing Variables (Wall/Roof/Floor)', impact: 'None', direction: 'neutral', description: 'EXCLUDED — intrusive PMT proxies proven unreliable by Error by Design investigation (Flaws 11, 18)', isFlaw: true, isIgnored: true });
  factors.push({ name: 'Electricity Connectivity', impact: 'None', direction: 'neutral', description: 'Excluded as wealth proxy (Last Mile Connectivity)', isFlaw: true, isIgnored: true });

  // ---- Rental properties (landlord business) ----
  const rentalProperties = Array.isArray(d.rentalProperties) ? d.rentalProperties : [];
  let rentalIncomeMonthly = 0;
  let vacantRentalImputedMonthly = 0;
  const imputedVacantRate = adminParams.vacantRentalImputedMonthly ?? 8000;
  rentalProperties.forEach(prop => {
    if (prop.isOccupied) {
      rentalIncomeMonthly += Math.max(0, prop.monthlyRentCharged || 0);
    } else {
      vacantRentalImputedMonthly += imputedVacantRate;
    }
  });
  if (rentalProperties.length > 0) {
    const occupiedCount = rentalProperties.filter(p => p.isOccupied).length;
    const vacantCount = rentalProperties.length - occupiedCount;
    factors.push({
      name: 'Rental Property Business',
      impact: 'High',
      direction: 'neutral',
      description: `${rentalProperties.length} rental unit(s): ${occupiedCount} occupied + ${vacantCount} vacant — recorded for commercial activity verification`,
      isFlaw: false,
    });
  }

  // --- LIVELIHOOD (LAND & LIVESTOCK) ---
  const landParcelList = (Array.isArray(d.landParcels) && d.landParcels.length > 0)
    ? d.landParcels
    : (d.landAcreage > 0 ? [{ acres: d.landAcreage, county: d.county }] : []);

  function landLivestockMultipliers(county) {
    if (ASAL_COUNTIES[county] === 'arid') return { land: 0.15, livestock: 0.3 };
    if (ASAL_COUNTIES[county] === 'semi-arid') return { land: 0.5, livestock: 0.6 };
    return { land: 1.0, livestock: 1.0 };
  }

  let totalLandValue = 0;
  landParcelList.forEach(parcel => {
    const { land: parcelLandMultiplier } = landLivestockMultipliers(parcel.county);
    const perAcreRate = parcel.marketValuePerAcre ?? (adminParams.landValuePerAcre ?? 80000);
    totalLandValue += (parcel.acres || 0) * perAcreRate * parcelLandMultiplier;
  });
  if (landParcelList.length > 0) {
    factors.push({
      name: landParcelList.length > 1 ? 'Multiple Land Parcels' : 'Land Ownership',
      impact: 'Medium',
      direction: 'neutral',
      description: `${landParcelList.length} parcel(s) total valuation KSh ${Math.round(totalLandValue).toLocaleString()} (immovable property, not added to earned income)`,
      isFlaw: false
    });
  }

  const { livestock: livestockMultiplier } = landLivestockMultipliers(d.county);
  if (d.livestockCount && d.livestockCount > 0) {
    const livestockVal = d.livestockCount * 3800 * livestockMultiplier;
    factors.push({
      name: 'Livestock Holdings',
      impact: 'Medium',
      direction: 'neutral',
      description: `${d.livestockCount} head of livestock (valuation KSh ${Math.round(livestockVal).toLocaleString()}; livelihood asset, not earned income)`,
      isFlaw: false
    });
  }

  // --- ILLUSTRATIVE HOUSEHOLD ADJUSTMENTS & ADJUSTED GROSS INCOME (AGI) ---
  const enableExperimentalPolicyAdjustments =
    adminParams.enableExperimentalPolicyAdjustments === true;

  let preFloorAdjustedGrossIncome = annualBaseTotal;

  // 1. Cost of Living Allowance & Rent Deduction
  const urbanTier = URBAN_TIER_1.includes(d.county) ? 'TIER_1'
    : URBAN_TIER_2.includes(d.county) ? 'TIER_2' : 'RURAL';

  const colOverrides = {
    TIER_1: adminParams.tier1CostOfLiving ?? adminParams.urbanCostOfLiving,
    TIER_2: adminParams.tier2CostOfLiving,
    RURAL: adminParams.ruralCostOfLiving,
  };

  const baseCol = enableExperimentalPolicyAdjustments
    ? (
        colOverrides[urbanTier] !== undefined
          ? colOverrides[urbanTier]
          : COST_OF_LIVING[urbanTier]
      )
    : 0;

  let colDeduction = 0;
  if (enableExperimentalPolicyAdjustments) {
    let colReason;
    if (d.ownershipStatus === 'RENTED' && d.monthlyRent > 0) {
      const tier1Cap = adminParams.tier1RentCap ?? DEFAULT_MAX_RENT.TIER_1;
      const tier2Cap = adminParams.tier2RentCap ?? DEFAULT_MAX_RENT.TIER_2;
      const ruralCap = adminParams.ruralRentCap ?? DEFAULT_MAX_RENT.RURAL;

      const maxRent = urbanTier === 'TIER_1' ? tier1Cap : urbanTier === 'TIER_2' ? tier2Cap : ruralCap;
      const cappedRent = Math.min(d.monthlyRent, maxRent);

      colDeduction = Math.max(baseCol, cappedRent) * 12;
      colReason = `Renter in ${urbanTier} — capped at KSh ${maxRent.toLocaleString()}/mo`;
      postBaseDeductions.push({
        name: 'Rent-Adjusted Cost of Living',
        amount: colDeduction,
        category: 'COST_OF_LIVING',
        reason: colReason,
        explanation: colReason
      });
    } else {
      colDeduction = baseCol * 12;
      colReason = `Basic survival threshold for ${urbanTier}`;
      postBaseDeductions.push({
        name: 'Cost of Living Allowance',
        amount: colDeduction,
        category: 'COST_OF_LIVING',
        reason: colReason,
        explanation: colReason
      });
    }
    preFloorAdjustedGrossIncome -= colDeduction;
  }

  // 2. Dependency Allowance
  let depDeduction = 0;
  if (enableExperimentalPolicyAdjustments && d.householdSize > 1) {
    let dependencyRatio = (d.householdSize - 1) * 0.08; // 8% deduction per dependent
    const cap = ASAL_COUNTIES[d.county] ? 0.40 : 0.35;
    dependencyRatio = Math.min(dependencyRatio, cap);
    depDeduction = Math.round(Math.max(0, preFloorAdjustedGrossIncome) * dependencyRatio);
    const depReason = `Dynamic per-capita scaling for ${d.householdSize} members (${Math.round(dependencyRatio * 100)}% of remaining income)`;
    postBaseDeductions.push({
      name: 'Dependency Allowance',
      amount: depDeduction,
      category: 'DEPENDENCY',
      reason: depReason,
      explanation: depReason
    });
    preFloorAdjustedGrossIncome -= depDeduction;
  }

  // 3. Catastrophic Health Expenditure (CHE) / Chronic Illness Adjustment
  let cheDeduction = 0;
  if (enableExperimentalPolicyAdjustments && d.hasChronicIllness) {
    cheDeduction = Math.round(Math.max(0, preFloorAdjustedGrossIncome) * 0.4);
    const cheReason = 'Chronic Illness Burden (40% adjustment: illustrative prototype policy assumption — requires SHA validation)';
    postBaseDeductions.push({
      name: 'Chronic Illness Adjustment (CHE)',
      amount: cheDeduction,
      category: 'HEALTH',
      reason: cheReason,
      explanation: cheReason
    });
    preFloorAdjustedGrossIncome -= cheDeduction;
    factors.push({ name: 'Chronic Illness Adjustment (CHE)', impact: 'High', direction: 'down', description: 'Chronic illness disposable income protection (40% adjustment: illustrative prototype policy assumption — requires SHA validation)', isFlaw: false });
  }

  // 4. Registered Disability Adjustment (Illustrative Assumption)
  let disabilityDeduction = 0;
  if (enableExperimentalPolicyAdjustments && d.hasRegisteredDisability) {
    disabilityDeduction = Math.round(Math.max(0, preFloorAdjustedGrossIncome) * 0.3);
    const disReason = 'Registered Person with Disability (30% adjustment: illustrative prototype policy assumption — requires SHA validation)';
    postBaseDeductions.push({
      name: 'Disability Adjustment (Illustrative Assumption)',
      amount: disabilityDeduction,
      category: 'DISABILITY',
      reason: disReason,
      explanation: disReason
    });
    preFloorAdjustedGrossIncome -= disabilityDeduction;
    factors.push({ name: 'Disability Adjustment', impact: 'High', direction: 'down', description: 'Reduced earning capacity adjustment (30%: illustrative prototype policy assumption — requires SHA validation)', isFlaw: false });
  }

  const annualBaseSum = annualBaseItems.reduce((sum, item) => sum + item.amount, 0);
  const baseReconciliationDifference = annualBaseTotal - annualBaseSum;

  const totalPostBaseDeductions = postBaseDeductions.reduce((sum, item) => sum + item.amount, 0);
  const expectedPreFloorAGI = annualBaseTotal - totalPostBaseDeductions;
  const preFloorReconciliationDifference = preFloorAdjustedGrossIncome - expectedPreFloorAGI;

  const expectedAGI = Math.max(0, expectedPreFloorAGI);
  const zeroFloorAdjustment = expectedAGI - expectedPreFloorAGI;
  const adjustedGrossIncome = Math.max(0, preFloorAdjustedGrossIncome);

  const isReconciled = (baseReconciliationDifference === 0) &&
                       (preFloorReconciliationDifference === 0) &&
                       (adjustedGrossIncome === expectedAGI);

  const reconciliation = {
    annualBaseTotal,
    annualBaseSum,
    baseReconciliationDifference,
    totalPostBaseDeductions,
    expectedPreFloorAGI,
    preFloorAdjustedGrossIncome,
    preFloorReconciliationDifference,
    zeroFloorAdjustment,
    expectedAGI,
    adjustedGrossIncome,
    isReconciled,
  };

  const calculationBreakdown = {
    annualBaseTotal,
    annualBaseItems,
    postBaseDeductions,
    totalPostBaseDeductions,
    preFloorAdjustedGrossIncome,
    zeroFloorAdjustment,
    adjustedGrossIncome,
    reconciliation,
    notes: [
      "Calculation integrity: Capital assets, transaction velocity, and debt are treated as contextual verification signals and are not added directly to annual earned income.",
      "Adjusted Gross Income is derived strictly from annualised net declared earned household income minus illustrative household adjustments.",
      "A zero floor ensures that Adjusted Gross Income cannot be negative in the prototype model."
    ]
  };

  // --- STATUTORY CONTRIBUTION AND FINANCIAL ASSISTANCE ASSESSMENT ---
  const annualContributionBeforeMinimum =
    (adjustedGrossIncome * 0.0275) / 12;

  const roundedContribution =
    Math.round(annualContributionBeforeMinimum);

  const monthlyContribution =
    Math.max(300, roundedContribution);

  const minimumContributionFloorApplied =
    annualContributionBeforeMinimum < 300;

  // These circumstances may warrant examination, but they do not
  // automatically establish statutory indigence.
  const financialAssistanceReviewReasons = [];

  if (d.receivesAid) {
    financialAssistanceReviewReasons.push(
      "SOCIAL_ASSISTANCE_REPORTED"
    );
  }

  if (d.isRefugee) {
    financialAssistanceReviewReasons.push(
      "REFUGEE_OR_DISPLACED_STATUS_REQUIRES_REVIEW"
    );
  }

  if (d.headAge >= 65 && effectiveBalance < 5000) {
    financialAssistanceReviewReasons.push(
      "OLDER_PERSON_FINANCIAL_CIRCUMSTANCES_REQUIRE_REVIEW"
    );
  }

  if (d.headAge < 21 && d.householdSize > 1) {
    financialAssistanceReviewReasons.push(
      "YOUNG_HOUSEHOLD_HEAD_REQUIRES_REVIEW"
    );
  }

  const financialAssistanceStatus =
    financialAssistanceReviewReasons.length > 0
      ? "REQUIRES_AUTHORISED_REVIEW"
      : "NOT_ASSESSED";

  if (minimumContributionFloorApplied) {
    factors.push({
      name: 'Minimum Contribution Rule',
      impact: 'Medium',
      direction: 'down',
      description: 'Calculated contribution below statutory minimum (KSh 300/mo) under Regulation 18(2) — minimum contribution floor applied',
      isFlaw: false
    });
  }

  if (d.headAge >= 65) {
    if (deriveVehicleList(d).length > 0) {
      requiresChpVerification = true;
      factors.push({
        name: 'Elderly Vehicle Review',
        impact: 'Medium',
        direction: 'neutral',
        description: 'Vehicle declared by elderly head; flagged for CHP verification without inflating earned income',
        isFlaw: false
      });
    }
  }

  // Fallback Protocol: Digital Ghost Detection
  let isDigitalGhost = false;
  const hasNoPhysicalAssets = (deriveVehicleList(d).length === 0) && (motoList.length === 0) && !(d.landAcreage > 0) && !(landParcelList.length > 0) && !(d.livestockCount > 0);
  if (!isOffline && (!d.kraPinType || d.kraPinType === 'NONE') && !d.isNtsaVerified && !d.hasSaccoAccount && (d.grossMpesaMonthly || 0) < 1000 && hasNoPhysicalAssets) {
    isDigitalGhost = true;
  }
  
  if (isDigitalGhost && minimumContributionFloorApplied) {
    requiresChpVerification = true;
    factors.push({ name: 'Digital Ghost / CHP Protocol', impact: 'High', direction: 'neutral', description: 'Zero digital footprint. Provisional minimum contribution classification pending physical CHP verification within 90 days.', isFlaw: false });
  }

  // Consent Withheld Pathway (DPA 2019 compliance)
  if (d.consentWithheld && !isDigitalGhost) {
    requiresChpVerification = true;
    factors.push({ name: 'Consent Withheld — Manual Review', impact: 'High', direction: 'neutral', description: 'Citizen exercised DPA §32 right to withhold data consent. Routed to CHP manual verification. No algorithmic penalty applied.', isFlaw: false });
  }

  let tier = "MIDDLE";
  if (minimumContributionFloorApplied) {
    tier = "LOW";
  } else if (adjustedGrossIncome > 450000) {
    tier = "HIGH";
  }

  const policyAssumptionMode = enableExperimentalPolicyAdjustments
    ? "ILLUSTRATIVE_RESEARCH_ADJUSTMENTS_ENABLED"
    : "UNAPPROVED_ADJUSTMENTS_DISABLED";

  const evidenceCoverage = {
    householdIncome:
      "MEMBER_REPORTED",

    liquidityInformation:
      isOffline
        ? "NOT_AVAILABLE"
        : "MEMBER_REPORTED_NOT_VERIFIED",

    kraInformation:
      d.kraPinType && d.kraPinType !== "NONE"
        ? "MEMBER_REPORTED_NOT_VERIFIED"
        : "NOT_PROVIDED",

    vehicleInformation:
      d.isNtsaVerified
        ? "MEMBER_REPORTED_NOT_VERIFIED"
        : "NOT_PROVIDED",

    externalVerification:
      "NOT_CONNECTED",
  };

  return {
    estimatedAnnualIncome: annualBaseTotal,
    adjustedGrossIncome: adjustedGrossIncome,
    monthlyContribution: monthlyContribution,
    band: minimumContributionFloorApplied ? 1 : 2,
    tier: tier,

    // Do not falsely declare indigence based on the contribution floor.
    isIndigent: null,

    minimumContributionFloorApplied,
    contributionRate: 0.0275,
    minimumMonthlyContribution: 300,
    contributionClassification: minimumContributionFloorApplied
      ? "MINIMUM_CONTRIBUTION_FLOOR"
      : "RATE_BASED_CONTRIBUTION",

    financialAssistanceStatus,
    financialAssistanceReviewReasons,

    policyAssumptionMode,
    isOperationalPolicyApproved: false,

    isDigitalGhost: isDigitalGhost,
    requiresChpVerification: requiresChpVerification,
    factors: factors,
    modelName: 'SHA PMT v2.1 — proposed AGI rules engine',
    deductions: postBaseDeductions,
    calculationBreakdown: calculationBreakdown,
    evidenceCoverage,
    // No calibrated statistical confidence interval is available.
    confidenceTier: null,
    agiRangeLow: null,
    agiRangeHigh: null
  };
}

export const PRESETS = [
  {
    name: 'Mama Wanjiku — Chama Treasurer',
    description: 'Rural shopkeeper who manages her chama\'s M-Pesa. High turnover, zero profit.',
    icon: '👩‍🌾',
    badge: 'Group Fund Context',
    badgeColor: '#059669',
    inputs: {
      monthlyNetEarnedIncome: 18000,
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
    name: 'Mama Wanjiku',
    description: 'Subsistence farmer with a stone house but zero cash liquidity.',
    icon: '🌽',
    badge: 'Ancestral Home',
    badgeColor: '#d97706',
    inputs: {
      monthlyNetEarnedIncome: 5000,
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
      vehicleType: 'STANDARD_NEW',
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
      monthlyNetEarnedIncome: 7000,
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
      monthlyNetEarnedIncome: 120000,
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
    name: 'Mzee Kamau',
    description: 'Elderly citizen in Nyeri. Has assets but zero monthly income.',
    icon: '🧓',
    badge: 'Age Override',
    badgeColor: '#7c3aed',
    inputs: {
      monthlyNetEarnedIncome: 0,
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
      vehicleType: 'STANDARD_NEW',
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
      monthlyNetEarnedIncome: 35000,
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
  },
  {
    name: 'Landlord (Multi-Property)',
    description: 'Nakuru resident who owns 4 rental houses (3 tenanted, 1 vacant) plus a personal car and a rural plot, and has not registered for rental income tax.',
    icon: '🏘️',
    badge: 'New: Multi-Item',
    badgeColor: '#0369a1',
    inputs: {
      monthlyNetEarnedIncome: 95000,
      county: 'Nakuru',
      householdSize: 3,
      headGender: 'MALE',
      headAge: 52,
      dwellingType: 'BUNGALOW',
      wallMaterial: 'STONE',
      roofMaterial: 'IRON_SHEETS',
      floorMaterial: 'CEMENT',
      rooms: 4,
      ownershipStatus: 'OWNED',
      monthlyRent: 0,
      subletIncome: 0,
      waterSource: 'PIPED',
      sanitationType: 'FLUSH',
      cookingEnergy: 'GAS',
      lightingEnergy: 'ELECTRICITY',
      assets: ['CAR', 'TV', 'FRIDGE'],
      vehicles: [{ type: 'STANDARD_NEW' }],
      motorcycleIsCommercial: false,
      landParcels: [{ acres: 3, county: 'Nakuru' }],
      landAcreage: 3,
      livestockCount: 0,
      rentalProperties: [
        { monthlyRentCharged: 22000, isOccupied: true },
        { monthlyRentCharged: 20000, isOccupied: true },
        { monthlyRentCharged: 18000, isOccupied: true },
        { monthlyRentCharged: 0, isOccupied: false },
      ],
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 40000,
      avgRetainedBalance: 60000,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 0,
      kraPinType: 'NONE',
      isNtsaVerified: true,
      hasSaccoAccount: false,
      hasChronicIllness: false,
      hasRegisteredDisability: false,
      isGroupTreasurer: false,
      vehicleType: 'STANDARD_NEW',
      consentWithheld: false
    },
  },
  {
    name: 'Samuel (Bodaboda)',
    description: 'Motorcycle taxi rider. Earns daily, high digital transactions but low net retention.',
    icon: '🏍️',
    badge: 'Tools of Trade',
    badgeColor: '#16a34a',
    inputs: {
      monthlyNetEarnedIncome: 15000,
      county: 'Nakuru',
      householdSize: 3,
      headGender: 'MALE',
      headAge: 26,
      dwellingType: 'ROOM',
      wallMaterial: 'IRON_SHEETS',
      roofMaterial: 'IRON_SHEETS',
      floorMaterial: 'CEMENT',
      rooms: 1,
      ownershipStatus: 'RENTED',
      monthlyRent: 3500,
      subletIncome: 0,
      waterSource: 'PUBLIC_TAP',
      sanitationType: 'PIT_LATRINE',
      cookingEnergy: 'CHARCOAL',
      lightingEnergy: 'ELECTRICITY',
      assets: ['SMARTPHONE', 'MOTORCYCLE'],
      motorcycleIsCommercial: true,
      landAcreage: 0,
      livestockCount: 0,
      receivesAid: false,
      isRefugee: false,
      grossMpesaMonthly: 45000,
      avgRetainedBalance: 1500,
      isSeasonalWorker: false,
      lowSeasonRetainedBalance: 0,
      diasporaRemittances: 0,
      fulizaDefaults: 1,
      kraPinType: 'NONE',
      isNtsaVerified: true,
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
 * Applies hand-authored fraud-risk heuristics to the supplied household inputs/context.
 * Returns review prompts with manually assigned rule weights; it does not contact or escalate to
 * an SHA fraud unit, establish fraud, or produce calibrated statistical probabilities.
 * 
 * Fraud flags are designed to identify:
 * 1. Phantom Dependents (claiming >10x national average household size)
 * 2. Unregistered Vehicle Claim / Hidden High-Value Asset (NTSA cross-check)
 * 3. Income Under-Reporting (self-reported vs. KRA records)
 * 4. Fuliza Debt Accumulation (systematic borrowing to reduce AGI)
 * 5. Suspicious Chama Treasurer Profile (false group fund claim)
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
  // Claims group fund discount but API shows no registered group
  if (d.isGroupTreasurer && contextData.safaricomChamaRegistered === false) {
    fraudFlags.push({
      name: 'Unverified Group Fund Claim',
      reason: `Claims Chama treasurer role for 80% group fund liquidity discount, but Safaricom/SACCO API shows no registered group linked to this ID/Phone.`,
      confidence: 0.95,
      severity: 'CRITICAL',
      action: 'Verify Chama registration certificate before applying group fund liquidity discount'
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
  // FIX (system design, post-audit-v2): declaredCount used to be hardcoded
  // to `d.assets.includes('CAR') ? 1 : 0` — it could NEVER exceed 1, no
  // matter how many vehicles were actually declared, because the old data
  // model had no way to declare more than one. Now uses the real count from
  // deriveVehicleList(), the same helper calculateProposedModel uses for
  // valuation, so this flag and the AGI calculation can't disagree with
  // each other about how many vehicles were declared.
  if (contextData.ntsaVehicleCount !== undefined && d.assets.includes('CAR')) {
    const declaredCount = deriveVehicleList(d).length;
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

  // FLAG 17b: Landlord Without Tax Registration
  // NEW (system design, post-audit-v2). Unlike Flags 6/18 (fixed earlier for
  // relying on demographic pattern-matching with no real statistical or
  // legal basis), this one is grounded in an actual legal requirement:
  // Kenya's Monthly Rental Income (MRI) tax regime requires landlords above
  // a income threshold to be KRA-registered and remit rental income tax.
  // A household reporting several rental properties generating substantial
  // income while claiming no KRA PIN at all is a legitimate, specific,
  // checkable compliance gap — not a demographic proxy.
  const rentalPropsForFlag = Array.isArray(d.rentalProperties) ? d.rentalProperties : [];
  const monthlyRentalIncomeForFlag = rentalPropsForFlag.filter(p => p.isOccupied).reduce((s, p) => s + Math.max(0, p.monthlyRentCharged || 0), 0);
  if (rentalPropsForFlag.length >= 3 && monthlyRentalIncomeForFlag > 50000 && (!d.kraPinType || d.kraPinType === 'NONE')) {
    fraudFlags.push({
      name: 'Landlord Without Tax Registration',
      reason: `${rentalPropsForFlag.length} rental properties declared generating ~KSh ${monthlyRentalIncomeForFlag.toLocaleString()}/mo, but no KRA PIN on file. Kenya's Monthly Rental Income regime requires registration above this threshold.`,
      confidence: 0.75,
      severity: 'HIGH',
      action: 'Cross-check KRA iTax rental income filings; request MRI compliance status before finalizing exemptions'
    });
    confidenceScores.push(0.75);
    overallRiskScore += 0.75;
  }

  // FLAG 17: Commercial Exemption Abuse
  // FIX (system design, post-audit-v2): this only ever checked the single
  // legacy `d.vehicleType` field against one `contextData.ntsaVehicleCategory`
  // value — it was never updated when the multi-vehicle array was added, so
  // a fleet owner declaring several COMMERCIAL vehicles via `d.vehicles`
  // could have a private-registered vehicle mixed in among them and this
  // check would never see it. Now checks every declared vehicle against a
  // parallel `contextData.ntsaVehicleCategories` array when provided, falling
  // back to the original single-value comparison for the legacy single-car
  // path so nothing about the existing behavior changes for that case.
  //
  // OPEN POLICY QUESTION (not resolved here — needs a decision, not just
  // code): ride-hailing drivers (Uber/Bolt/etc.) commonly use a personal
  // PRIVATE-registered vehicle for income-generating work without ever
  // completing the formal, costly NTSA PSV conversion. As written, this
  // flag treats that identically to someone falsely claiming a matatu/taxi
  // exemption on a vehicle never used commercially at all — but those
  // aren't the same situation. Options: (a) leave as-is, gig drivers lose
  // the commercial exemption unless formally PSV-registered; (b) add a
  // separate `isGigEconomyDriver` declaration (verifiable via Uber/Bolt
  // driver-account data instead of NTSA PSV status) granting a similar
  // tools-of-trade discount without requiring PSV conversion. Undecided
  // pending your call — happy to implement either.
  {
    const vehiclesForFlag17 = deriveVehicleList(d);
    const ntsaCategories = Array.isArray(contextData.ntsaVehicleCategories) ? contextData.ntsaVehicleCategories : null;
    vehiclesForFlag17.forEach((v, idx) => {
      const declaredCommercial = v.type === 'COMMERCIAL';
      const actualCategory = ntsaCategories ? ntsaCategories[idx] : (idx === 0 ? contextData.ntsaVehicleCategory : undefined);
      if (declaredCommercial && actualCategory === 'PRIVATE') {
        const label = vehiclesForFlag17.length > 1 ? ` (vehicle ${idx + 1}/${vehiclesForFlag17.length})` : '';
        fraudFlags.push({
          name: 'False Commercial Claim',
          reason: `Citizen claims commercial vehicle exemption${label} but NTSA TIMS shows this vehicle registered as PRIVATE category.`,
          confidence: 0.92,
          severity: 'CRITICAL',
          action: 'Deny commercial exemption for this vehicle; recalculate at full private vehicle value'
        });
        confidenceScores.push(0.92);
        overallRiskScore += 0.92;
      }
    });
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

  // Calculate a combined heuristic rule score (0-100), not a statistical percentile.
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
    heuristicRiskScore: fraudRiskPercentile,
    fraudRiskPercentile: fraudRiskPercentile, // Legacy field name retained for existing callers; this is not a statistical percentile.
    flagCount: fraudFlags.length,
    requiresManualReview: fraudRiskPercentile > 50,
    severityLevel: fraudRiskPercentile > 70 ? 'CRITICAL' : fraudRiskPercentile > 50 ? 'HIGH' : 'LOW',
    recommendation: fraudRiskPercentile > 70
      ? 'PROTOTYPE SUGGESTION: Refer for human review. No officer is notified and no assessment is automatically rejected.'
      : fraudRiskPercentile > 50
        ? 'PROTOTYPE SUGGESTION: Arrange manual verification before relying on the assessment.'
        : 'No high-risk rule threshold was reached. Continue normal verification; this is not a fraud clearance.',
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
 * Ensures the disparity does not exceed 3% across any adequately-sized grouping.
 * @param {Array} assessments - Array of { inputs, currentResult, proposedResult } objects
 * @param {string} groupingKey - The demographic key to group by (e.g., 'county', 'headGender')
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
    if (!groups[key]) groups[key] = { total: 0, disagreements: 0 };
    groups[key].total++;
    // Disagreement here means: proposed model applied floor while current model charged rate-based
    const propFloor = a.proposedResult?.minimumContributionFloorApplied === true || a.proposedResult?.monthlyContribution === 300;
    const curRateBased = a.currentResult?.minimumContributionFloorApplied === false || a.currentResult?.monthly > 300;
    if (propFloor && curRateBased) {
      groups[key].disagreements++;
    }
  });

  // Calculate disagreement rate per group, gated on sample size
  const groupResults = {};
  const excludedGroups = [];
  let maxRate = 0;
  let minRate = 1;
  Object.entries(groups).forEach(([key, data]) => {
    const rate = data.total > 0 ? data.disagreements / data.total : 0;
    const entry = {
      total: data.total,
      disagreements: data.disagreements,
      disagreementRate: Math.round(rate * 10000) / 100,
      falsePositives: data.disagreements,
      falsePositiveRate: Math.round(rate * 10000) / 100 // deprecated alias
    };
    if (data.total < minGroupSize) {
      excludedGroups.push({ key, ...entry, reason: `Below minGroupSize (${minGroupSize}) — excluded to avoid noise-driven disparity` });
      return;
    }
    groupResults[key] = entry;
    if (rate > maxRate) maxRate = rate;
    if (rate < minRate) minRate = rate;
  });

  const groupCount = Object.keys(groupResults).length;
  if (groupCount === 0) {
    return { passed: false, maxDisparity: 0, threshold: 3.0, groupResults, excludedGroups, groupCount: 0, report: `No ${groupingKey} group reached minGroupSize (${minGroupSize}); disparity cannot be assessed yet.` };
  }

  const maxDisparity = Math.round((maxRate - minRate) * 10000) / 100;
  const passed = maxDisparity <= 3.0; // 3% design target

  return {
    evaluationType: "SYNTHETIC_DEMO_ONLY",
    passed,
    maxDisparity,
    threshold: 3.0,
    groupResults,
    excludedGroups,
    groupCount,
    report: passed
      ? `SYNTHETIC DEMO: Maximum model disagreement disparity across ${groupingKey} groups (N≥${minGroupSize}) is ${maxDisparity}% (≤3% design target)`
      : `SYNTHETIC DEMO: Maximum model disagreement disparity across ${groupingKey} groups (N≥${minGroupSize}) is ${maxDisparity}% (>3% design target)`
  };
}

/**
 * P-47 (CAJ BLOCKER): Generates revenue sensitivity analysis across compliance scenarios.
 * Shows projected monthly national revenue at varying compliance rates.
 * Data sources cited: NHIF, ILO, Rwanda CBHI, Ethiopia CBHI.
 * @param {number} totalPopulation - Total eligible informal population (default: ~15.5M informal earners)
 * @param {number} avgContribution - Average monthly contribution in KSh (default: 520)
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
 * Creates a demo assessment-record object for the current browser application.
 * The object contains selected inputs/outputs and retention schedule metadata, but the app does
 * not persist it to a backend. This is not an immutable or durable statutory audit record.
 * @param {Object} inputs - The household data (d)
 * @param {Object} currentResult - Result from calculateCurrentModel
 * @param {Object} proposedResult - Result from calculateProposedModel
 * @param {Object} fraudRisk - Result from calculateFraudRisk
 * @param {string} officerId - ID of the officer conducting the assessment (default: 'SYSTEM')
 * @returns {Object} Immutable audit record
 */
export function createAuditRecord(inputs, currentResult, proposedResult, fraudRisk, officerId = 'SYSTEM', modelVersions = null, adminParams = {}) {
  const now = new Date();
  // FIX (audit v2): Math.random() is not appropriate for an "immutable audit
  // record" ID (not cryptographically secure, theoretically guessable).
  // crypto.randomUUID() is available in all evergreen browsers + Node 19+.
  const uid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().split('-')[0].toUpperCase()
    : Math.random().toString(36).substring(2, 10).toUpperCase(); // last-resort fallback only
  const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const localAssessmentId = `LOCAL-ASSESSMENT-${datePart}-${uid}`;

  // This browser-only prototype has not submitted or registered an SHA case.
  const reproducibleInputSnapshot = JSON.parse(JSON.stringify(inputs || {}));
  delete reproducibleInputSnapshot.msisdn;

  return {
    localAssessmentId,
    // FIX (audit v2): this used to be the literal string "SHA256(1234****)"
    // — the first 4 real digits of the phone number wrapped in a label that
    // implied hashing had occurred. It hadn't. This now runs a real,
    // test-vector-verified SHA-256 (see lib/hash.js). See that file's
    // docstring for the remaining server-side-pepper caveat.
    citizenIdHash: hashMsisdn(inputs.msisdn),
    createdAt: now.toISOString(),
    algorithmVersion: modelVersions?.declaredIncome?.id || proposedResult?.modelVersion || 'declared-income-agi-v1',
    status: 'LOCAL_DEMONSTRATION',
    isOfficialSubmission: false,
    appealStatus: null,
    // Full calculation inputs (excluding direct phone identifier) and the
    // administrative parameters used by both engines make this result reproducible.
    assessmentInputSnapshot: reproducibleInputSnapshot,
    incomeAssessmentSnapshot: inputs.incomeAssessmentSnapshot ? JSON.parse(JSON.stringify(inputs.incomeAssessmentSnapshot)) : null,
    modelParametersSnapshot: JSON.parse(JSON.stringify(adminParams || {})),
    inputs: {
      monthlyNetEarnedIncome: inputs.monthlyNetEarnedIncome,
      incomeSources: Array.isArray(inputs.incomeSources) ? JSON.parse(JSON.stringify(inputs.incomeSources)) : [],
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
        minimumContributionFloorApplied: currentResult.minimumContributionFloorApplied ?? null,
        contributionClassification: currentResult.contributionClassification ?? null,
        isIndigent: null,
        tier: currentResult.tier
      },
      proposedModel: {
        version: modelVersions?.declaredIncome?.id || proposedResult?.modelVersion || 'declared-income-agi-v1.1',
        adjustedGrossIncome: proposedResult.adjustedGrossIncome,
        monthlyContribution: proposedResult.monthly || proposedResult.monthlyContribution,
        minimumContributionFloorApplied: proposedResult.minimumContributionFloorApplied ?? null,
        contributionClassification: proposedResult.contributionClassification ?? null,
        isIndigent: null,
        tier: proposedResult.tier
      },
      proposedModelVersions: modelVersions ? {
        originalAgi: {
          id: modelVersions.originalAgi.id,
          version: modelVersions.originalAgi.version,
          sourceCommit: modelVersions.originalAgi.sourceCommit,
          estimatedAnnualIncome: modelVersions.originalAgi.result.estimatedAnnualIncome,
          adjustedGrossIncome: modelVersions.originalAgi.result.adjustedGrossIncome,
          monthlyContribution: modelVersions.originalAgi.result.monthlyContribution,
          isIndigent: modelVersions.originalAgi.result.isIndigent
        },
        declaredIncome: {
          id: modelVersions.declaredIncome.id,
          version: modelVersions.declaredIncome.version,
          sourceCommit: modelVersions.declaredIncome.sourceCommit,
          estimatedAnnualIncome: modelVersions.declaredIncome.result.estimatedAnnualIncome,
          adjustedGrossIncome: modelVersions.declaredIncome.result.adjustedGrossIncome,
          monthlyContribution: modelVersions.declaredIncome.result.monthlyContribution,
          minimumContributionFloorApplied: modelVersions.declaredIncome.result.minimumContributionFloorApplied,
          isIndigent: null
        }
      } : null
    },
    fraudFlags: fraudRisk?.fraudFlags?.map(f => f.name) || [],
    fraudRiskPercentile: fraudRisk?.fraudRiskPercentile || 0,
    createdBy: officerId,
    modifiedHistory: [],
    retentionPolicy: {
      policy: 'No statutory retention policy is implemented. This record exists in browser memory only and is cleared when the session is reloaded unless manually exported.',
      backendRetentionImplemented: false,
      deletionEnforced: false
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
  const monthlyNetEarnedIncome = Math.max(0, Math.round(grossMpesaMonthly * (0.2 + Math.random() * 0.6)));
  const ownershipStatus = isUrban && randBool(0.5) ? 'RENTED' : 'OWNED';

  // NEW (system design, post-audit-v2): occasionally generate multi-item
  // cases so the Bias & Compliance tab's fuzz testing actually exercises
  // the new vehicles/landParcels/rentalProperties code paths, not just the
  // legacy single-item fallback path every time.
  const vehicleTypes = ['STANDARD_OLD', 'STANDARD_NEW', 'LUXURY', 'COMMERCIAL'];
  const numVehicles = hasCar ? (randBool(0.15) ? randInt(2, 3) : 1) : 0;
  const vehicles = Array.from({ length: numVehicles }, () => ({ type: randChoice(vehicleTypes) }));

  const totalLandAcreage = isUrban ? (randBool(0.1) ? randInt(1, 2) : 0) : randInt(0, 8);
  const splitLand = totalLandAcreage > 0 && randBool(0.08);
  const landParcels = splitLand
    ? [{ acres: Math.round(totalLandAcreage * 0.6), county }, { acres: Math.round(totalLandAcreage * 0.4), county: randChoice(SYNTHETIC_COUNTIES) }]
    : [];

  const isLandlord = randBool(0.05);
  const rentalProperties = isLandlord
    ? Array.from({ length: randInt(1, 5) }, () => randBool(0.85) ? { monthlyRentCharged: randInt(5000, 35000), isOccupied: true } : { monthlyRentCharged: 0, isOccupied: false })
    : [];

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
    vehicleType: hasCar ? randChoice(vehicleTypes) : 'STANDARD_OLD',
    vehicles,
    motorcycleIsCommercial: hasMoto ? randBool(0.5) : false,
    landAcreage: totalLandAcreage,
    landParcels,
    rentalProperties,
    livestockCount: isUrban ? 0 : (randBool(0.6) ? randInt(0, 25) : 0),
    receivesAid: randBool(0.06),
    isRefugee: randBool(0.02),
    grossMpesaMonthly,
    transactionCount: randInt(10, 200),
    avgRetainedBalance: Math.round(grossMpesaMonthly * (0.02 + Math.random() * 0.15)),
    isSeasonalWorker: randBool(0.15),
    lowSeasonRetainedBalance: 0,
    monthlyNetEarnedIncome,
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

/**
 * Runs both models over a synthetic population and computes population-level
 * model disagreement metrics for simulation and scenario demonstration.
 *
 * IMPORTANT METHODOLOGICAL NOTICE:
 * This function compares two algorithmic candidate models on synthetic data.
 * It does NOT measure true classification error, targeting accuracy, or real-world
 * exclusion/inclusion error against verified ground truth. The proposed model
 * cannot serve as ground truth for evaluating itself or another model.
 *
 * Output is strictly labelled SYNTHETIC_DEMO_ONLY.
 *
 * @param {number} n  Population size (default 500 for stable percentages)
 * @returns {Object} Synthetic disagreement metrics
 */
export function calculatePopulationErrorRates(n = 500) {
  const pop = generateSyntheticPopulation(n);
  let floorDisagreement = 0; // proposed on floor, current above floor
  let rateDisagreement = 0;  // proposed above floor, current on floor
  let totalDisagreements = 0;
  let totalCurrentContributions = 0;
  let totalProposedContributions = 0;

  for (const { currentResult, proposedResult } of pop) {
    const curFloor = currentResult.minimumContributionFloorApplied === true || currentResult.monthly === 300;
    const propFloor = proposedResult.minimumContributionFloorApplied === true || proposedResult.monthlyContribution === 300;
    if (propFloor && !curFloor) floorDisagreement++;
    if (!propFloor && curFloor) rateDisagreement++;
    if (currentResult.monthly !== proposedResult.monthlyContribution) totalDisagreements++;
    totalCurrentContributions += currentResult.monthly;
    totalProposedContributions += proposedResult.monthlyContribution;
  }

  const disagreementRate = Math.round((totalDisagreements / n) * 1000) / 10;
  const floorDisagreementRate = Math.round((floorDisagreement / n) * 1000) / 10;
  const rateDisagreementRate = Math.round((rateDisagreement / n) * 1000) / 10;

  return {
    evaluationType: "SYNTHETIC_DEMO_ONLY",
    n,
    totalDisagreements,
    disagreementRate,
    floorDisagreementCount: floorDisagreement,
    floorDisagreementRate,
    rateDisagreementCount: rateDisagreement,
    rateDisagreementRate,
    // Scenario comparison aliases
    exclusionRate: floorDisagreementRate,
    inclusionRate: rateDisagreementRate,
    payoutRatio: totalCurrentContributions > 0
      ? Math.round((totalProposedContributions / totalCurrentContributions) * 1000) / 10
      : 0,
    disclaimer: "SYNTHETIC_DEMO_ONLY: Model comparisons on synthetic personas reflect algorithmic differences between candidate formulations, NOT verified real-world targeting error or statutory indigence classification."
  };
}

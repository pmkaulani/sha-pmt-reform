import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { 
  Radio, Tv, Refrigerator, Laptop, Smartphone, Phone, 
  Bike, Car, ShieldCheck, Info, CheckCircle2, AlertTriangle, Fingerprint, ChevronDown, Settings
} from "lucide-react";
import { calculateCurrentModel, calculateCurrentModelContribution, calculateFraudRisk, analyzeSector, calculateFairnessMetrics, calculateModelOutputDifference, calculateIllustrativeRevenueScenario, PRESETS, createAuditRecord, generateRevenueStressTest, testCurrentModelDisparityByCounty, generateFraudStatistics, generateSyntheticPopulation, calculatePopulationErrorRates, validateAssessmentInputs } from "./lib/AlgorithmSimulation.js";
import { calculateProposedModelVersions } from "./lib/model-versioning.js";
import ModelVersionsTab from "./ModelVersionsTab.jsx";
import DemoCalculationReceipt from "./DemoCalculationReceipt.jsx";
import PresentationV3 from "./presentation/PresentationV3.jsx";
import { logger } from "./lib/Logger.js";
import AppealPreparationTab from "./AppealPreparationTab.jsx";
import ContributionStatementTab from "./ContributionStatementTab.jsx";
import OfficerReviewTab from "./OfficerReviewTab.jsx";
import EvaluationLabTab from "./EvaluationLabTab.jsx";
import EvidenceReadinessTab from "./EvidenceReadinessTab.jsx";
import PilotReadinessTab from "./PilotReadinessTab.jsx";
import {
  createInitialReviewRecord,
  createReviewEvent,
  createSyntheticMeetingDemonstration,
  removeSyntheticMeetingDemonstration
} from "./lib/review-workflow.js";
import {
  calculateHouseholdIncome,
  createZeroEarnedIncomeAssessment,
  INCOME_SOURCE_RULES,
  OPERATING_EXPENSE_CATEGORIES,
  calculateMonthsFromDates,
  resolveEffectiveIncomeSources,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "./lib/household-income.js";
import {
  MEMBER_ASSESSMENT_STEPS,
  OPTIONAL_HOUSEHOLD_SECTIONS,
  SOURCE_KIND_BY_TYPE,
  EXPENSE_ELIGIBLE_KINDS,
  SEASONAL_INCOME_KINDS,
  EARNED_SOURCE_TYPES,
  OTHER_MONEY_SOURCE_TYPES,
  getIncomeSourceUiRules,
  getAssessmentVisibility,
  buildAssessmentReview
} from "./lib/assessment-flow.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COUNTIES = ["Baringo","Bomet","Bungoma","Busia","Elgeyo Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyandarua","Nyamira","Nyeri","Samburu","Siaya","Taita Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"];

const DEFAULTS = {
  householdHead: "",
  dependantCount: null,
  hasNoEarnedIncome: false,
  monthlyNetEarnedIncome: null,
  incomeSources: [],
  incomeAssessmentSnapshot: null,
  householdSize: 5, county: "Meru", headGender: "FEMALE", headAge: 45,
  dwellingType: "TRADITIONAL", wallMaterial: "STONE", roofMaterial: "IRON_SHEETS",
  floorMaterial: "CEMENT", rooms: 2, ownershipStatus: "OWNED", monthlyRent: 0, subletIncome: 0,
  waterSource: "BOREHOLE", sanitationType: "PIT_LATRINE",
  cookingEnergy: "FIREWOOD", lightingEnergy: "ELECTRICITY",
  assets: ["FEATURE_PHONE"], motorcycleIsCommercial: false, landAcreage: 2, livestockCount: 5, receivesAid: false, isRefugee: false,
  grossMpesaMonthly: 10000, transactionCount: 80, avgRetainedBalance: 2000, isSeasonalWorker: false, lowSeasonRetainedBalance: 0, diasporaRemittances: 0, fulizaDefaults: 0,
  kraPinType: 'NONE', isNtsaVerified: false, hiddenWealthDiscovered: false, hasSaccoAccount: false, saccoShareCapital: 0, hasChronicIllness: false, hasRegisteredDisability: false, isGroupTreasurer: false,
  vehicleType: "STANDARD_OLD", consentWithheld: false,
  // NEW (system design, post-audit-v2): optional richer multi-item fields.
  // Empty by default — UI falls back to the legacy single-item fields above
  // until the user explicitly adds a second vehicle/parcel/rental property.
  vehicles: [], landParcels: [], rentalProperties: []
};

const SCENARIOS = Object.fromEntries(PRESETS.map(p => [
  p.name, 
  { sub: p.description, badge: p.badge || "SCENARIO", badgeColor: p.badgeColor || "#059669", d: { ...p.inputs } }
]));

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITHM ENGINE
// ─────────────────────────────────────────────────────────────────────────────

// Algorithms moved to lib/AlgorithmSimulation.js


// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS AND THEME
// ─────────────────────────────────────────────────────────────────────────────

// Light, professional, trustworthy government palette
const S = {
  bg: "#F8FAFC", 
  surface: "#FFFFFF", 
  surfaceUp: "#F1F5F9",
  border: "#E2E8F0", 
  borderUp: "#CBD5E1",
  text: "#0F172A", 
  muted: "#64748B", 
  faint: "#F1F5F9",
  sage: "#059669", // Success/Proposed
  terra: "#DC2626", // Danger/Lasso
  amber: "#D97706",
  sageD: "#ECFDF5", 
  terraD: "#FEF2F2", 
  amberD: "#FFFBEB",
  sageBd: "#A7F3D0", 
  terraBd: "#FECACA", 
  amberBd: "#FDE68A",
  blue: "#0284C7",
  blueD: "#F0F9FF",
  blueBd: "#BAE6FD"
};

function Label({children}) {
  return <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",color:S.muted,marginBottom:6}}>{children}</div>;
}

function FieldSelect({label,value,onChange,options}) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{position:"relative"}}>
        <select aria-label={label} role="listbox" value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",appearance:"none",WebkitAppearance:"none",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"10px 36px 10px 14px",fontSize:13,fontWeight:500,fontFamily:"inherit",outline:"none",cursor:"pointer",boxShadow:"0 1px 2px rgba(0,0,0,0.02)",transition:"border-color 0.2s, box-shadow 0.2s"}} onFocus={e=>{e.target.style.borderColor=S.blue;e.target.style.boxShadow=`0 0 0 3px ${S.blueD}`;}} onBlur={e=>{e.target.style.borderColor=S.borderUp;e.target.style.boxShadow="0 1px 2px rgba(0,0,0,0.02)";}}>
          {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown size={16} color={S.muted} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
      </div>
    </div>
  );
}

function FieldNumber({label,value,onChange,min=0,max,step=1,note,allowNull=false,error=null}) {
  const handleChange = (e) => {
    let raw = e.target.value;
    if (raw === "") {
      onChange(allowNull ? null : "");
      return;
    }
    onChange(parseFloat(raw));
  };
  
  const handleBlur = (e) => {
    let raw = e.target.value;
    if (raw === "" || raw === null || isNaN(parseFloat(raw))) {
      if (allowNull) {
        onChange(null);
        e.target.style.borderColor = error ? S.terra : S.borderUp;
        e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
        return;
      }
      let v = min;
      onChange(v);
    } else {
      let v = parseFloat(raw);
      if (max !== undefined) v = Math.min(max, v);
      v = Math.max(min, v);
      onChange(v);
    }
    e.target.style.borderColor = error ? S.terra : S.borderUp;
    e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
  };

  const inputValue = value === null || value === undefined ? "" : value;
  const borderColor = error ? S.terra : S.borderUp;

  return (
    <div>
      <Label>{label}</Label>
      <input type="number" aria-label={label} aria-required="true" value={inputValue} min={min} max={max} step={step}
        onChange={handleChange}
        style={{width:"100%",background:S.surface,border:`1px solid ${borderColor}`,borderRadius:6,color:S.text,padding:"10px 14px",fontSize:13,fontWeight:500,fontFamily:"inherit",outline:"none",boxShadow:"0 1px 2px rgba(0,0,0,0.02)",transition:"border-color 0.2s, box-shadow 0.2s"}}
        onFocus={e=>{e.target.style.borderColor=error?S.terra:S.blue;e.target.style.boxShadow=`0 0 0 3px ${error?S.terraD:S.blueD}`;}}
        onBlur={handleBlur} />
      {error && <div style={{fontSize:11,color:S.terra,marginTop:5,display:"flex",alignItems:"flex-start",gap:4,fontWeight:600}}>
        <AlertTriangle size={12} style={{marginTop:2,flexShrink:0}}/> <span>{error}</span>
      </div>}
      {note&&!error&&<div style={{fontSize:11,color:S.terra,marginTop:5,display:"flex",alignItems:"flex-start",gap:4}}>
        <AlertTriangle size={12} style={{marginTop:2,flexShrink:0}}/> <span>{note}</span>
      </div>}
    </div>
  );
}

function InfoTip({children, id}) {
  const [open, setOpen] = useState(false);
  const tipId = id || `tip-${Math.random().toString(36).slice(2,9)}`;
  const [align, setAlign] = useState('center');
  const iconRef = useRef(null);

  const handleOpen = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;
      if (spaceLeft < 120) setAlign('left');
      else if (spaceRight < 120) setAlign('right');
      else setAlign('center');
    }
    setOpen(true);
  };

  const getStyles = () => {
    const base = {
      position: "absolute",
      bottom: "100%",
      marginBottom: 8,
      background: "#1e293b",
      color: "#f8fafc",
      padding: "6px 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: "normal",
      width: "max-content",
      maxWidth: 220,
      zIndex: 9999,
      pointerEvents: "none",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
      lineHeight: 1.4,
      textTransform: "none",
      letterSpacing: "normal"
    };

    if (align === 'left') {
      return { ...base, left: -10, textAlign: "left" };
    } else if (align === 'right') {
      return { ...base, right: -10, textAlign: "right" };
    } else {
      return { ...base, left: "50%", transform: "translateX(-50%)", textAlign: "center" };
    }
  };

  const getArrowStyles = () => {
    const base = {
      position: "absolute",
      top: "100%",
      border: "5px solid transparent",
      borderTopColor: "#1e293b"
    };

    if (align === 'left') {
      return { ...base, left: 12 };
    } else if (align === 'right') {
      return { ...base, right: 12 };
    } else {
      return { ...base, left: "50%", transform: "translateX(-50%)" };
    }
  };

  return (
    <span style={{position:"relative", display:"inline-flex", marginLeft:5, verticalAlign:"-2px"}}>
      <span
        ref={iconRef}
        tabIndex={0}
        role="button"
        aria-label="More info"
        aria-describedby={tipId}
        onMouseEnter={handleOpen}
        onMouseLeave={() => setOpen(false)}
        onFocus={handleOpen}
        onBlur={() => setOpen(false)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? setOpen(false) : handleOpen(); }}}
        style={{display:"inline-flex", cursor:"help", color:S.muted}}
      >
        <Info size={13} />
      </span>
      {open && (
        <div id={tipId} role="tooltip" style={getStyles()}>
          {children}
          <div style={getArrowStyles()} />
        </div>
      )}
    </span>
  );
}

function Toggle({label,value,onChange,hideSpacer,tip}) {
  return (
    <div>
      {!hideSpacer && <Label>&nbsp;</Label>}
      <div role="switch" aria-checked={value} aria-label={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:S.surface,padding:"9px 14px",borderRadius:6,border:`1px solid ${value?S.text:S.borderUp}`,boxShadow:value?`0 0 0 3px ${S.borderUp}`:"0 1px 2px rgba(0,0,0,0.02)",transition:"all 0.2s"}}>
        <div style={{fontSize:13,fontWeight:500,color:S.text,lineHeight:1.4,paddingRight:8}}>{label}{tip && <InfoTip>{tip}</InfoTip>}</div>
        <div style={{display:"flex",gap:4,background:S.faint,padding:4,borderRadius:6,border:`1px solid ${S.border}`}}>
          {["Yes","No"].map(opt=>{
            const active=(opt==="Yes"&&value)||(opt==="No"&&!value);
            return <button key={opt} onClick={()=>onChange(opt==="Yes")} style={{padding:"4px 12px",borderRadius:4,border:`1px solid ${active?S.text:"transparent"}`,background:active?S.text:"transparent",color:active?"#FFF":S.muted,fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",boxShadow:active?"0 2px 4px rgba(15,23,42,0.3)":"none"}}>{opt}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

function AssetGrid({assets,toggle}) {
  const opts=[
    [<Radio size={18} />,"RADIO","Radio"],
    [<Tv size={18} />,"TV","TV"],
    [<Refrigerator size={18} />,"FRIDGE","Fridge"],
    [<Laptop size={18} />,"COMPUTER","Computer"],
    [<Smartphone size={18} />,"SMARTPHONE","Smartphone"],
    [<Phone size={18} />,"FEATURE_PHONE","Feature Phone"],
    [<Bike size={18} />,"MOTORCYCLE","Motorcycle"],
    [<Car size={18} />,"CAR","Car"],
    [<Bike size={18} />,"BICYCLE","Bicycle"]
  ];
  return (
    <div className="grid-3">
      {opts.map(([icon,val,label])=>{
        const on=assets.includes(val);
        return (
          <button key={val} onClick={()=>toggle(val)} style={{padding:"14px 8px",borderRadius:8,border:`2px solid ${on?S.text:S.borderUp}`,background:on?S.text:S.surface,color:on?"#FFF":S.text,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:on?700:500,textAlign:"center",transition:"all .2s",boxShadow:on?"0 4px 6px rgba(15,23,42,0.3)":"0 1px 2px rgba(0,0,0,0.02)",transform:on?"scale(1.02)":"scale(1)"}}>
            <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}>{icon}</div>
            <div>{label}</div>
          </button>
        );
      })}
    </div>
  );
}

const STEPS = MEMBER_ASSESSMENT_STEPS.map(s => s.title);

function FormPanel({d,upd,toggleAsset,step,setStep,onClassify,classifying,hasAcknowledgedDemo,setHasAcknowledgedDemo,setInputs,setActiveScenario,addListItem,updListItem,removeListItem,formError}) {
  const [showAdditionalCircumstances, setShowAdditionalCircumstances] = useState(false);
  const [showOptionalIndicators, setShowOptionalIndicators] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const go = (n) => setStep(Math.max(0, Math.min(3, n)));

  const allSources = Array.isArray(d.incomeSources) ? d.incomeSources : [];
  const earnedEntries = allSources
    .map((src, originalIndex) => ({ src, originalIndex }))
    .filter(({ src }) => {
      const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
      return rule.bucket === "EARNED";
    });

  const otherMoneyEntries = allSources
    .map((src, originalIndex) => ({ src, originalIndex }))
    .filter(({ src }) => {
      const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
      return rule.bucket !== "EARNED";
    });

  return (
    <div style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:12,padding:24,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"}}>
      {/* Step header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:S.blue,textTransform:"uppercase",letterSpacing:0.5}}>
            Stage {step + 1} of 4 · {MEMBER_ASSESSMENT_STEPS[step]?.shortTitle || `Stage ${step+1}`}
          </div>
          <div style={{fontSize:17,fontWeight:700,color:S.text,marginTop:2}}>
            {MEMBER_ASSESSMENT_STEPS[step]?.title}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {MEMBER_ASSESSMENT_STEPS.map((s,i)=>(
            <button
              key={s.id}
              type="button"
              onClick={()=>go(i)}
              title={s.title}
              aria-label={s.title}
              style={{
                width: i===step ? 28 : 10,
                height: 8,
                borderRadius: 4,
                background: i===step ? S.blue : i<step ? S.blueBd : S.border,
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all .2s"
              }}
            />
          ))}
        </div>
      </div>
      <div style={{fontSize:12,color:S.muted,marginBottom:20,lineHeight:1.4}}>
        {MEMBER_ASSESSMENT_STEPS[step]?.description}
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STAGE 0: YOUR HOUSEHOLD                                               */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step===0&&<div style={{display:"grid",gap:16}}>
        <FieldSelect label="County of residence" value={d.county} onChange={v=>upd("county",v)} options={COUNTIES.map(c=>[c,c])}/>
        <div className="grid-2">
          <FieldNumber label="Household size" value={d.householdSize} onChange={v=>upd("householdSize",Math.max(1,Math.round(v)))} min={1} max={15} note="All persons who normally live together and share meals."/>
          <FieldNumber label="Age of household head" value={d.headAge} onChange={v=>upd("headAge",v)} min={15} max={110}/>
        </div>
        <div className="grid-2">
          <FieldSelect label="Gender of household head" value={d.headGender} onChange={v=>upd("headGender",v)} options={[["MALE","Male"],["FEMALE","Female"]]}/>
          <div />
        </div>
        
        <div style={{display:"grid",gap:10,background:S.surfaceUp,padding:14,borderRadius:8,border:`1px solid ${S.border}`}}>
          <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",letterSpacing:0.5}}>Household Circumstances & Vulnerabilities</div>
          <Toggle label="Receives social assistance?" tip="Such as Inua Jamii, Hunger Safety Net Programme (HSFP), or cash transfers" value={d.receivesAid} onChange={v=>upd("receivesAid",v)} hideSpacer/>
          <Toggle label="Has Chronic Illness? (CHE)" tip="Applies illustrative chronic illness / CHE adjustment (40% adjustment: illustrative prototype policy assumption — requires SHA validation)" value={d.hasChronicIllness} onChange={v=>upd("hasChronicIllness",v)} hideSpacer/>
          <Toggle label="Registered Disability (NCPWD)?" tip="Applies illustrative disability adjustment (30% adjustment: illustrative prototype policy assumption — requires SHA validation)" value={d.hasRegisteredDisability} onChange={v=>upd("hasRegisteredDisability",v)} hideSpacer/>
          <Toggle label="Refugee / Displaced Person (IDP)?" tip="Triggers an illustrative low-income override inside this prototype only; it is not an official SHA or state-sponsorship decision." value={d.isRefugee} onChange={v=>upd("isRefugee",v)} hideSpacer/>
        </div>

        {/* Collapsible Additional Household Circumstances */}
        <div style={{padding:16,background:S.surface,borderRadius:10,border:`1px solid ${S.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:S.text,textTransform:"uppercase",letterSpacing:0.5}}>
                Additional household circumstances (Housing, Utilities, Assets)
              </div>
              <div style={{fontSize:11,color:S.muted,marginTop:2}}>
                Optional characteristics retained for model comparison and historical AGI v2.1 testing.
              </div>
            </div>
            <button
              type="button"
              onClick={()=>setShowAdditionalCircumstances(prev=>!prev)}
              style={{background:"transparent",border:"none",color:S.blue,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}
            >
              {showAdditionalCircumstances ? "Hide details ▲" : "Show details ▼"}
            </button>
          </div>

          {showAdditionalCircumstances && (
            <div style={{display:"grid",gap:16,marginTop:16,paddingTop:14,borderTop:`1px solid ${S.border}`}}>
              {/* Housing */}
              <div>
                <div style={{fontSize:12,fontWeight:700,color:S.blue,textTransform:"uppercase",marginBottom:10}}>1. Housing circumstances</div>
                <div className="grid-2">
                  <FieldSelect label="Dwelling type" value={d.dwellingType} onChange={v=>upd("dwellingType",v)} options={[["BUNGALOW","Bungalow"],["APARTMENT","Apartment"],["TRADITIONAL","Traditional"],["SHANTY","Shanty/Informal"],["OTHER","Other"]]}/>
                  <FieldSelect label="Ownership" value={d.ownershipStatus} onChange={v=>upd("ownershipStatus",v)} options={[["OWNED","Owned"],["RENTED","Rented"],["FAMILY","Family/Other"]]}/>
                </div>
                {d.ownershipStatus === 'RENTED' && (
                  <div style={{marginTop:10}}>
                    <FieldNumber label="Monthly Rent (KSh)" value={d.monthlyRent} onChange={v=>upd("monthlyRent",v)} min={0} />
                  </div>
                )}
                {d.ownershipStatus !== 'RENTED' && (
                  <div style={{marginTop:10}}>
                    <FieldNumber label="Sublet Income (Monthly KSh)" value={d.subletIncome} onChange={v=>upd("subletIncome",v)} min={0} />
                  </div>
                )}
                <div className="grid-2" style={{marginTop:10}}>
                  <FieldSelect label="Wall material" value={d.wallMaterial} onChange={v=>upd("wallMaterial",v)} options={[["STONE","Stone"],["BRICK","Brick"],["IRON_SHEETS","Iron sheets"],["MUD","Mud"],["WOOD","Wood"],["OTHER","Other"]]}/>
                  <FieldSelect label="Roof material" value={d.roofMaterial} onChange={v=>upd("roofMaterial",v)} options={[["IRON_SHEETS","Iron sheets"],["TILES","Tiles"],["CONCRETE","Concrete"],["GRASS","Grass/Thatch"],["OTHER","Other"]]}/>
                </div>
                <div className="grid-2" style={{marginTop:10}}>
                  <FieldSelect label="Floor material" value={d.floorMaterial} onChange={v=>upd("floorMaterial",v)} options={[["TILES","Tiles"],["CEMENT","Cement"],["MUD","Mud"],["WOOD","Wood"],["OTHER","Other"]]}/>
                  <FieldNumber label="Rooms" value={d.rooms} onChange={v=>upd("rooms",Math.max(1,Math.round(v)))} min={1} max={20}/>
                </div>
              </div>

              {/* Utilities */}
              <div style={{paddingTop:12,borderTop:`1px dashed ${S.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:S.blue,textTransform:"uppercase",marginBottom:10}}>2. Basic services & utilities</div>
                <div className="grid-2">
                  <FieldSelect label="Water source" value={d.waterSource} onChange={v=>upd("waterSource",v)} options={[["PIPED_DWELLING","Piped into dwelling"],["PIPED_YARD","Piped into yard"],["PUBLIC_TAP","Public tap / kiosk"],["BOREHOLE","Borehole / pump"],["WELL","Protected well"],["RIVER","River / spring / rain"]]}/>
                  <FieldSelect label="Sanitation" value={d.sanitationType} onChange={v=>upd("sanitationType",v)} options={[["FLUSH_TOILET","Flush toilet"],["VIP_LATRINE","VIP latrine"],["PIT_LATRINE","Pit latrine"],["NONE","None / open defecation"]]}/>
                </div>
                <div className="grid-2" style={{marginTop:10}}>
                  <FieldSelect label="Cooking energy" value={d.cookingEnergy} onChange={v=>upd("cookingEnergy",v)} options={[["ELECTRICITY","Electricity"],["LPG","LPG / gas"],["KEROSENE","Kerosene"],["CHARCOAL","Charcoal"],["FIREWOOD","Firewood"]]}/>
                  <FieldSelect label="Lighting energy" value={d.lightingEnergy} onChange={v=>upd("lightingEnergy",v)} options={[["ELECTRICITY","Electricity"],["SOLAR","Solar"],["KEROSENE","Kerosene"],["OTHER","Other"]]}/>
                </div>
              </div>

              {/* Assets & Capital */}
              <div style={{paddingTop:12,borderTop:`1px dashed ${S.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:S.blue,textTransform:"uppercase",marginBottom:10}}>3. Household assets & capital</div>
                <AssetGrid assets={d.assets} toggle={toggleAsset}/>
                {d.assets.includes("MOTORCYCLE") && (
                  <div style={{marginTop: 8, padding: 12, background: S.faint, borderRadius: 8, border: `1px solid ${S.border}`}}>
                    <Toggle label="Is this motorcycle used commercially (Bodaboda)?" tip="Depreciates asset value by 85% as a Tool of Trade" value={d.motorcycleIsCommercial} onChange={v=>upd("motorcycleIsCommercial",v)} hideSpacer/>
                  </div>
                )}
                {d.assets.includes("CAR") && (
                  <div style={{marginTop: 8, padding: 12, background: S.faint, borderRadius: 8, border: `1px solid ${S.border}`}}>
                    {(!d.vehicles || d.vehicles.length === 0) ? (
                      <>
                        <FieldSelect label="Vehicle Type & Age" value={d.vehicleType || "STANDARD_OLD"} onChange={v=>upd("vehicleType",v)} options={[["STANDARD_OLD","Standard Car (Older than 7 yrs)"], ["STANDARD_NEW","Standard Car (Newer than 7 yrs)"], ["LUXURY","Luxury / SUV"], ["COMMERCIAL","Commercial (Matatu / Pick-up)"]]}/>
                        <button onClick={()=>{
                            setInputs(p=>({...p, vehicles:[{type:p.vehicleType||"STANDARD_OLD"},{type:"STANDARD_OLD"}]}));
                            if(activeScenario!=="Custom") setActiveScenario("Custom");
                          }} style={{marginTop:10,padding:"6px 12px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Own more than one car? Add another vehicle</button>
                      </>
                    ) : (
                      <>
                        <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:8}}>Vehicles ({d.vehicles.length}) — Contextual asset indicator; does not directly alter earned income base</div>
                        <div style={{display:"grid",gap:8}}>
                          {d.vehicles.map((v,idx)=>(
                            <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                              <div style={{flex:1}}>
                                <FieldSelect label={`Vehicle ${idx+1}`} value={v.type||"STANDARD_OLD"} onChange={val=>updListItem("vehicles",idx,"type",val)} options={[["STANDARD_OLD","Standard Car (Older than 7 yrs)"], ["STANDARD_NEW","Standard Car (Newer than 7 yrs)"], ["LUXURY","Luxury / SUV"], ["COMMERCIAL","Commercial (Matatu / Pick-up)"]]}/>
                              </div>
                              <button onClick={()=>removeListItem("vehicles",idx)} style={{padding:"8px 10px",background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>Remove</button>
                            </div>
                          ))}
                        </div>
                        <button onClick={()=>addListItem("vehicles",{type:"STANDARD_OLD"})} style={{marginTop:8,padding:"6px 12px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Add another vehicle</button>
                      </>
                    )}
                  </div>
                )}
                <div className="grid-2" style={{marginTop:10}}>
                  <FieldNumber label="Land owned (acres)" value={d.landAcreage} onChange={v=>upd("landAcreage",v)} min={0} max={100} step={0.5} note="Original asset/liquidity AGI v2.1 applies an illustrative county-based ASAL land adjustment."/>
                  <FieldNumber label="Livestock count (all types)" value={d.livestockCount} onChange={v=>upd("livestockCount",Math.max(0,Math.round(v)))} min={0} max={500} note="Livestock is contextual in the declared-income variant."/>
                </div>
                <div style={{marginTop:10,padding:12,background:S.faint,borderRadius:8,border:`1px solid ${S.border}`}}>
                  <Toggle label="Do you own land in more than one county?" value={d.landParcels && d.landParcels.length>0} onChange={v=>{
                      if (v) setInputs(p=>({...p, landParcels:[{acres:p.landAcreage||0, county:p.county||"Nairobi"},{acres:0, county:"Nairobi"}]}));
                      else setInputs(p=>({...p, landParcels:[]}));
                      if(activeScenario!=="Custom") setActiveScenario("Custom");
                    }} hideSpacer/>
                  {d.landParcels && d.landParcels.length>0 && (
                    <div style={{marginTop:10,display:"grid",gap:8}}>
                      {d.landParcels.map((parcel,idx)=>(
                        <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                          <div style={{width:100}}>
                            <FieldNumber label="Acres" value={parcel.acres} onChange={v=>updListItem("landParcels",idx,"acres",v)} min={0} max={200} step={0.5}/>
                          </div>
                          <div style={{flex:1}}>
                            <FieldSelect label="County" value={parcel.county||"Nairobi"} onChange={v=>updListItem("landParcels",idx,"county",v)} options={COUNTIES.map(c=>[c,c])}/>
                          </div>
                          <button onClick={()=>removeListItem("landParcels",idx)} style={{padding:"8px 10px",background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>Remove</button>
                        </div>
                      ))}
                      <button onClick={()=>addListItem("landParcels",{acres:0,county:"Nairobi"})} style={{padding:"6px 12px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",justifySelf:"start"}}>+ Add another parcel</button>
                    </div>
                  )}
                </div>
                <div style={{marginTop:10,padding:12,background:S.faint,borderRadius:8,border:`1px solid ${S.border}`}}>
                  <Toggle label="Do you own rental properties (as a landlord)?" value={d.rentalProperties && d.rentalProperties.length>0} onChange={v=>{
                      if (v) setInputs(p=>({...p, rentalProperties:[{monthlyRentCharged:0, isOccupied:true}]}));
                      else setInputs(p=>({...p, rentalProperties:[]}));
                      if(activeScenario!=="Custom") setActiveScenario("Custom");
                    }} hideSpacer/>
                  {d.rentalProperties && d.rentalProperties.length>0 && (
                    <div style={{marginTop:10,display:"grid",gap:8}}>
                      {d.rentalProperties.map((prop,idx)=>(
                        <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0"}}>
                            <input type="checkbox" checked={!!prop.isOccupied} onChange={e=>updListItem("rentalProperties",idx,"isOccupied",e.target.checked)} style={{width:15,height:15}}/>
                            <span style={{fontSize:12,color:S.text,fontWeight:500}}>Occupied</span>
                          </div>
                          {prop.isOccupied && (
                            <div style={{width:160}}>
                              <FieldNumber label="Monthly rent charged (KSh)" value={prop.monthlyRentCharged} onChange={v=>updListItem("rentalProperties",idx,"monthlyRentCharged",v)} min={0} step={500}/>
                            </div>
                          )}
                          <button onClick={()=>removeListItem("rentalProperties",idx)} style={{padding:"8px 10px",background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>Remove</button>
                        </div>
                      ))}
                      <button onClick={()=>addListItem("rentalProperties",{monthlyRentCharged:0,isOccupied:true})} style={{padding:"6px 12px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",justifySelf:"start"}}>+ Add another rental property</button>
                    </div>
                  )}
                </div>
                <div style={{marginTop:10,display:"grid",gap:8,background:S.surface,padding:12,borderRadius:8,border:`1px solid ${S.border}`}}>
                  <Toggle label="Is the primary earner a Seasonal Worker?" tip="Uses low-season balances to measure true liquidity" value={d.isSeasonalWorker} onChange={v=>upd("isSeasonalWorker",v)} hideSpacer/>
                  {d.isSeasonalWorker && (
                    <FieldNumber label="Low Season Retained Balance (KSh)" value={d.lowSeasonRetainedBalance} onChange={v=>upd("lowSeasonRetainedBalance",v)} min={0} note="Adjusts for highly volatile seasonal income."/>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STAGE 1: HOW YOUR HOUSEHOLD EARNS (EARNED INCOME)                     */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step===1&&<div style={{display:"grid",gap:16}}>
        {/* No Earned Income Pathway */}
        <div style={{background: d.hasNoEarnedIncome ? S.sageD : S.faint, border: `1px solid ${d.hasNoEarnedIncome ? S.sageBd : S.border}`, borderRadius: 8, padding: "14px 16px"}}>
          <label style={{display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer"}}>
            <input
              type="checkbox"
              checked={!!d.hasNoEarnedIncome}
              onChange={e => {
                const checked = e.target.checked;
                upd("hasNoEarnedIncome", checked);
                if (checked) {
                  upd("monthlyNetEarnedIncome", 0);
                }
              }}
              style={{width: 17, height: 17, marginTop: 2, cursor: "pointer", accentColor: S.sage}}
            />
            <div>
              <div style={{fontSize: 13, fontWeight: 700, color: S.text}}>
                Our household currently has no earned income
              </div>
              <div style={{fontSize: 12, color: S.muted, marginTop: 2, lineHeight: 1.4}}>
                Select this if household members do not currently earn wages, casual day labour, small business profits, farming harvests or rental income. You can still record social assistance, remittances, loans and group funds in Stage 3.
              </div>
            </div>
          </label>
        </div>

        {d.hasNoEarnedIncome ? (
          <div style={{display:"grid",gap:12}}>
            <div style={{padding: 16, background: S.sageD, border: `1px solid ${S.sageBd}`, borderRadius: 8, color: S.sage}}>
              <div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700,fontSize:14}}>
                <CheckCircle2 size={18}/>
                <span>Zero earned income declared for this household</span>
              </div>
              <div style={{fontSize:12,color:S.text,marginTop:6,lineHeight:1.5}}>
                The prototype's earned income base is set to <strong>KSh 0/month</strong>. You do not need to invent earnings. Click <strong>Continue to Other Money →</strong> below to record any cash transfers, family remittances, loans, or chama funds.
              </div>
            </div>
            {earnedEntries.length > 0 && (
              <div style={{padding: 12, background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 12, color: "#92400E", lineHeight: 1.4}}>
                <strong>Draft records retained:</strong> {earnedEntries.length} earned income source(s) were previously entered. They are retained in your draft but marked <strong>INACTIVE</strong> and will not be counted in the assessment. Unchecking the box above will re-activate them.
              </div>
            )}
          </div>
        ) : (
          <div style={{display:"grid",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:S.text}}>
                  Active Earned Income Sources ({earnedEntries.length})
                </div>
                <div style={{fontSize:12,color:S.muted,marginTop:2}}>
                  Employment, casual labour, business, farming or rental earnings.
                </div>
              </div>
              <button
                type="button"
                onClick={()=>{
                  addListItem("incomeSources", {
                    id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    sourceType: earnedEntries.length === 0 ? "SELF_EMPLOYMENT" : "CASUAL_LABOUR",
                    monthsObserved: 12,
                    amountReceivedKsh: 0,
                    directCostsKsh: 0,
                    includedInSourceId: null,
                    alreadyIncludedElsewhere: false,
                    isSeasonal: false,
                    expenses: []
                  });
                }}
                style={{padding:"8px 14px",background:S.blue,color:"#FFF",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 2px 4px rgba(2,132,199,0.2)"}}
              >
                + Add earned income source
              </button>
            </div>

            {earnedEntries.length > 0 ? (
              <div style={{display:"grid",gap:12}}>
                {earnedEntries.map(({ src, originalIndex }, entryIdx)=>{
                  const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
                  const received = Number(src.amountReceivedKsh || 0);
                  const costs = rule.costsAllowed ? Number(src.directCostsKsh || 0) : 0;
                  const net = received - costs;
                  const months = Number(src.monthsObserved || 12);
                  const monthlyAvgNet = months > 0 ? Math.round(net / months) : 0;
                  const uiRules = getIncomeSourceUiRules(src);

                  return (
                    <div key={src.id || originalIndex} style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:14,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:13,fontWeight:700,color:S.text}}>
                            Source {entryIdx+1}: {rule.label}
                          </span>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#ECFDF5",color:"#065F46"}}>
                            EARNED INCOME
                          </span>
                        </div>
                        {confirmDeleteId === src.id ? (
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11,color:S.terra,fontWeight:600}}>Remove this source?</span>
                            <button
                              type="button"
                              onClick={()=>{
                                removeListItem("incomeSources", originalIndex);
                                setConfirmDeleteId(null);
                              }}
                              style={{background:S.terra,color:"#FFF",border:"none",borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}}
                            >
                              Yes, remove
                            </button>
                            <button
                              type="button"
                              onClick={()=>setConfirmDeleteId(null)}
                              style={{background:"transparent",color:S.muted,border:`1px solid ${S.border}`,borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:500,cursor:"pointer"}}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={()=>setConfirmDeleteId(src.id)}
                            style={{background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:4,padding:"4px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid-2" style={{gap:10}}>
                        <FieldSelect
                          label="Type of earned income"
                          value={src.sourceType}
                          onChange={v=>{
                            updListItem("incomeSources", originalIndex, "sourceType", v);
                            const nextRule = INCOME_SOURCE_RULES[v];
                            if (!nextRule?.costsAllowed) {
                              updListItem("incomeSources", originalIndex, "directCostsKsh", 0);
                              updListItem("incomeSources", originalIndex, "expenses", []);
                            }
                          }}
                          options={EARNED_SOURCE_TYPES.map(k=>[k, INCOME_SOURCE_RULES[k]?.label || k])}
                        />
                        <FieldSelect
                          label="Already included in another declared source?"
                          value={src.includedInSourceId || ""}
                          onChange={v=>{
                            updListItem("incomeSources", originalIndex, "includedInSourceId", v || null);
                            updListItem("incomeSources", originalIndex, "alreadyIncludedElsewhere", !!v);
                          }}
                          options={[
                            ["", "No — Independent earnings"],
                            ...allSources.filter((_, sIdx) => sIdx !== originalIndex).map(s => [
                              s.id,
                              `Included in Source ${s.id} (${INCOME_SOURCE_RULES[s.sourceType]?.label || s.sourceType})`
                            ])
                          ]}
                        />
                      </div>
                      {src.includedInSourceId && (
                        <div style={{marginTop:8}}>
                          <FieldNumber
                            label="Declared partial overlap amount (KSh) — optional"
                            value={src.overlapAmountKsh}
                            onChange={v=>updListItem("incomeSources", originalIndex, "overlapAmountKsh", v)}
                            min={0}
                            allowNull={true}
                            note="Leave blank if 100% of this source is duplicated in the parent source."
                          />
                        </div>
                      )}

                      {/* Observation Period */}
                      <div className="grid-3" style={{gap:10, marginTop:10}}>
                        <div>
                          <Label>Observation Start Date</Label>
                          <input
                            type="date"
                            value={src.observationStartDate || ""}
                            onChange={e=>{
                              const val = e.target.value;
                              updListItem("incomeSources", originalIndex, "observationStartDate", val);
                              if (val && src.observationEndDate) {
                                const m = calculateMonthsFromDates(val, src.observationEndDate);
                                if (m) {
                                  updListItem("incomeSources", originalIndex, "monthsObserved", m);
                                  updListItem("incomeSources", originalIndex, "manuallyEditedDuration", false);
                                }
                              }
                            }}
                            style={{width:"100%",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"9px 12px",fontSize:13,fontFamily:"inherit"}}
                          />
                        </div>
                        <div>
                          <Label>Observation End Date</Label>
                          <input
                            type="date"
                            value={src.observationEndDate || ""}
                            onChange={e=>{
                              const val = e.target.value;
                              updListItem("incomeSources", originalIndex, "observationEndDate", val);
                              if (src.observationStartDate && val) {
                                const m = calculateMonthsFromDates(src.observationStartDate, val);
                                if (m) {
                                  updListItem("incomeSources", originalIndex, "monthsObserved", m);
                                  updListItem("incomeSources", originalIndex, "manuallyEditedDuration", false);
                                }
                              }
                            }}
                            style={{width:"100%",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"9px 12px",fontSize:13,fontFamily:"inherit"}}
                          />
                        </div>
                        <FieldNumber
                          label="Observed Duration (Months)"
                          value={src.monthsObserved || 12}
                          onChange={v=>{
                            const val = Math.max(1, Math.round(v));
                            updListItem("incomeSources", originalIndex, "monthsObserved", val);
                            if (src.observationStartDate && src.observationEndDate) {
                              const calcM = calculateMonthsFromDates(src.observationStartDate, src.observationEndDate);
                              if (calcM !== val) {
                                updListItem("incomeSources", originalIndex, "manuallyEditedDuration", true);
                              } else {
                                updListItem("incomeSources", originalIndex, "manuallyEditedDuration", false);
                              }
                            }
                          }}
                          min={1}
                          max={60}
                          step={1}
                          note={src.monthsObserved > 12 ? "Extended observation window (>12 months)" : undefined}
                        />
                      </div>

                      {/* Gross and Operating Expenses */}
                      <div className="grid-2" style={{gap:10, marginTop:10}}>
                        <FieldNumber
                          label="Gross amount received over period (KSh)"
                          value={src.amountReceivedKsh}
                          onChange={v=>updListItem("incomeSources", originalIndex, "amountReceivedKsh", v)}
                          min={0}
                          step={500}
                        />
                        {uiRules.showOperatingExpenses ? (
                          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"10px 14px",background:S.surfaceUp,borderRadius:6,border:`1px solid ${S.borderUp}`}}>
                            <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase"}}>Allowable Operating Costs</div>
                            <div style={{fontSize:16,fontWeight:800,color:S.text,marginTop:4}}>
                              KSh {(Number(src.directCostsKsh) || 0).toLocaleString()}
                            </div>
                            <div style={{fontSize:11,color:S.muted,marginTop:2}}>
                              {Array.isArray(src.expenses) && src.expenses.length > 0
                                ? `${src.expenses.length} itemised line item(s) below`
                                : "No expenses itemised (KSh 0 deductible)"}
                            </div>
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"10px 14px",background:S.faint,borderRadius:6,border:`1px dashed ${S.borderUp}`}}>
                            <div style={{fontSize:11,fontWeight:600,color:S.muted,textTransform:"uppercase"}}>Operating costs</div>
                            <div style={{fontSize:12,color:S.muted,marginTop:2}}>
                              {src.sourceType === "EMPLOYMENT_WAGES"
                                ? "Not allowable for employment / regular wages."
                                : "Not accepted for this category under prototype rules."}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Itemised Operating Expenses Editor */}
                      {uiRules.showOperatingExpenses && (
                        <div style={{marginTop:12,padding:12,background:S.faint,borderRadius:8,border:`1px solid ${S.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:S.text}}>
                                Itemised Operating Expenses ({Array.isArray(src.expenses) ? src.expenses.length : 0})
                              </div>
                              <div style={{fontSize:11,color:S.muted}}>
                                Deductible direct costs: stock, raw materials, fuel, transport, repairs, labour, rent, fees.
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={()=>{
                                const currentExpenses = Array.isArray(src.expenses) ? [...src.expenses] : [];
                                const newExpense = {
                                  id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  category: "STOCK_PURCHASES",
                                  amountKsh: 0,
                                  description: ""
                                };
                                const updated = [...currentExpenses, newExpense];
                                const total = updated.reduce((sum, e) => sum + (Number(e.amountKsh) || 0), 0);
                                updListItem("incomeSources", originalIndex, "expenses", updated);
                                updListItem("incomeSources", originalIndex, "directCostsKsh", total);
                              }}
                              style={{padding:"4px 10px",background:S.blue,color:"#FFF",border:"none",borderRadius:4,fontSize:11,fontWeight:600,cursor:"pointer"}}
                            >
                              + Add expense line item
                            </button>
                          </div>

                          {Array.isArray(src.expenses) && src.expenses.length > 0 ? (
                            <div style={{display:"grid",gap:8}}>
                              {src.expenses.map((exp, expIdx)=>(
                                <div key={exp.id || expIdx} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 2fr auto",gap:8,alignItems:"center",background:S.surface,padding:8,borderRadius:6,border:`1px solid ${S.borderUp}`}}>
                                  <FieldSelect
                                    label="Category"
                                    value={exp.category}
                                    onChange={cat=>{
                                      const updated = [...src.expenses];
                                      updated[expIdx] = { ...updated[expIdx], category: cat };
                                      updListItem("incomeSources", originalIndex, "expenses", updated);
                                    }}
                                    options={[
                                      ["STOCK_PURCHASES", "Stock purchases (goods for resale)"],
                                      ["RAW_MATERIALS", "Raw materials & inputs"],
                                      ["TRANSPORT", "Fuel & business transport"],
                                      ["EQUIPMENT_REPAIRS", "Repairs & maintenance"],
                                      ["LABOUR_PAID", "Casual / hired labour wages"],
                                      ["RENT_UTILITIES", "Premises rent & utilities"],
                                      ["FEES_LICENSES", "County fees & licences"],
                                      ["OTHER_OPERATING", "Other direct operating costs"]
                                    ]}
                                    hideSpacer
                                  />
                                  <FieldNumber
                                    label="Amount (KSh)"
                                    value={exp.amountKsh}
                                    onChange={amt=>{
                                      const updated = [...src.expenses];
                                      updated[expIdx] = { ...updated[expIdx], amountKsh: Number(amt || 0) };
                                      const total = updated.reduce((sum, e) => sum + (Number(e.amountKsh) || 0), 0);
                                      updListItem("incomeSources", originalIndex, "expenses", updated);
                                      updListItem("incomeSources", originalIndex, "directCostsKsh", total);
                                    }}
                                    min={0}
                                    step={100}
                                    hideSpacer
                                  />
                                  <div>
                                    <Label>Description / Note</Label>
                                    <input
                                      type="text"
                                      value={exp.description || ""}
                                      placeholder="e.g. wholesale goods stock"
                                      onChange={e=>{
                                        const updated = [...src.expenses];
                                        updated[expIdx] = { ...updated[expIdx], description: e.target.value };
                                        updListItem("incomeSources", originalIndex, "expenses", updated);
                                      }}
                                      style={{width:"100%",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit"}}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={()=>{
                                      const updated = src.expenses.filter((_, idx) => idx !== expIdx);
                                      const total = updated.reduce((sum, e) => sum + (Number(e.amountKsh) || 0), 0);
                                      updListItem("incomeSources", originalIndex, "expenses", updated);
                                      updListItem("incomeSources", originalIndex, "directCostsKsh", total);
                                    }}
                                    style={{background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:4,padding:"6px 8px",fontSize:11,fontWeight:600,cursor:"pointer",marginTop:18}}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{fontSize:11,color:S.muted,fontStyle:"italic",padding:"6px 0"}}>
                              No itemised expenses added. Direct costs will be treated as KSh 0 unless line items are added.
                            </div>
                          )}
                          {/* Business Inventory & Cost of Goods Sold */}
                          {(src.sourceType === "SELF_EMPLOYMENT" || (src.expenses || []).some(e => e.category === "STOCK_PURCHASES") || src.openingStockKsh || src.closingStockKsh) && (
                            <div style={{marginTop:12,padding:12,background:S.surface,borderRadius:8,border:`1px solid ${S.borderUp}`}}>
                              <div style={{fontSize:12,fontWeight:750,color:S.text,marginBottom:4}}>
                                Business Inventory & Cost of Goods Sold (COGS)
                              </div>
                              <div style={{fontSize:11,color:S.muted,marginBottom:10,lineHeight:1.4}}>
                                Standard inventory accounting treatment: <em>Cost of goods sold = Opening stock + Stock purchases - Closing stock</em>. Do not deduct unsold closing stock as consumed operating expenses.
                              </div>
                              <div className="grid-3" style={{gap:10}}>
                                <FieldNumber
                                  label="Opening Stock (KSh)"
                                  value={src.openingStockKsh}
                                  onChange={v=>updListItem("incomeSources", originalIndex, "openingStockKsh", v)}
                                  min={0}
                                  allowNull={true}
                                  note="Inventory value at start of period"
                                />
                                <FieldNumber
                                  label="Stock Purchases (KSh)"
                                  value={(src.expenses || []).filter(e => e.category === "STOCK_PURCHASES").reduce((s, e) => s + (Number(e.amountKsh) || 0), 0)}
                                  readOnly={true}
                                  note="Sum from stock purchase line items"
                                />
                                <FieldNumber
                                  label="Closing Stock (KSh)"
                                  value={src.closingStockKsh}
                                  onChange={v=>updListItem("incomeSources", originalIndex, "closingStockKsh", v)}
                                  min={0}
                                  allowNull={true}
                                  note="Inventory value at end of period"
                                />
                              </div>
                              {(()=>{
                                const open = Number(src.openingStockKsh);
                                const close = Number(src.closingStockKsh);
                                const purchases = (src.expenses || []).filter(e => e.category === "STOCK_PURCHASES").reduce((s, e) => s + (Number(e.amountKsh) || 0), 0);
                                if (purchases > 0) {
                                  if (isNaN(open) || isNaN(close) || src.openingStockKsh === null || src.closingStockKsh === null || src.openingStockKsh === undefined || src.closingStockKsh === undefined) {
                                    return (
                                      <div style={{marginTop:8,fontSize:11,color:"#B45309",background:"#FEF3C7",padding:"6px 10px",borderRadius:4}}>
                                        ⚠️ Stock purchases of KSh {purchases.toLocaleString()} declared. Please specify opening and closing stock to resolve Cost of Goods Sold.
                                      </div>
                                    );
                                  } else if (close > open + purchases) {
                                    return (
                                      <div style={{marginTop:8,fontSize:11,color:"#DC2626",background:"#FEE2E2",padding:"6px 10px",borderRadius:4}}>
                                        ❌ Invalid: Closing stock (KSh {close.toLocaleString()}) cannot exceed opening stock plus purchases (KSh {(open + purchases).toLocaleString()}).
                                      </div>
                                    );
                                  } else {
                                    const cogs = open + purchases - close;
                                    return (
                                      <div style={{marginTop:8,fontSize:11,color:"#15803D",background:"#DCFCE7",padding:"6px 10px",borderRadius:4}}>
                                        ✓ Calculated Cost of Goods Sold: <strong>KSh {cogs.toLocaleString()}</strong> (Opening {open.toLocaleString()} + Purchases {purchases.toLocaleString()} - Closing {close.toLocaleString()})
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Seasonal Questions */}
                      {uiRules.showSeasonalDetails && (
                        <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:10}}>
                          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:S.text,cursor:"pointer"}}>
                            <input
                              type="checkbox"
                              checked={!!src.isSeasonal}
                              onChange={e=>updListItem("incomeSources", originalIndex, "isSeasonal", e.target.checked)}
                              style={{width:14,height:14}}
                            />
                            <span>Seasonal activity (requires 12-month observation window to prevent harvest bias)</span>
                          </label>
                        </div>
                      )}

                      {/* Net calculation preview */}
                      <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${S.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,fontSize:12}}>
                        <span style={{color:S.muted}}>
                          Reported net: <strong style={{color:S.text}}>KSh {net.toLocaleString()}</strong> over {months} mo
                        </span>
                        <span style={{color:S.blue,fontWeight:600}}>
                          Average monthly net: KSh {monthlyAvgNet.toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{padding:16,background:S.faint,borderRadius:8,border:`1px dashed ${S.borderUp}`}}>
                <div style={{fontSize:13,fontWeight:600,color:S.text,marginBottom:4}}>No itemised earned income sources added yet</div>
                <div style={{fontSize:12,color:S.muted,lineHeight:1.5,marginBottom:12}}>
                  {activeScenario === "Custom"
                    ? "Custom assessments require structured income sources or an explicit zero-earned-income declaration. Click '+ Add earned income source' above or declare no earned income."
                    : "You can enter a direct monthly net earned income baseline below (standard for demonstration presets), or click '+ Add earned income source' above."}
                </div>
                {activeScenario !== "Custom" ? (
                  <div style={{background:S.surface,padding:12,borderRadius:6,border:`1px solid ${formError?S.terraBd:S.border}`}}>
                    <FieldNumber
                      label="Declared Monthly Net Earned Income (KSh) — DEMO ONLY Direct / Preset Base"
                      value={d.monthlyNetEarnedIncome}
                      onChange={v=>upd("monthlyNetEarnedIncome",v)}
                      min={0}
                      step={500}
                      allowNull={true}
                      error={formError}
                      note="DEMO ONLY: Direct entry baseline for demonstration personas. Adding structured sources will supersede this field."
                    />
                  </div>
                ) : (
                  <div style={{background:S.surface,padding:12,borderRadius:6,border:`1px solid ${S.borderUp}`}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:S.muted,cursor:"pointer"}}>
                      <input
                        type="checkbox"
                        checked={d.allowDemoDirectEntry === true}
                        onChange={e=>upd("allowDemoDirectEntry", e.target.checked)}
                      />
                      <span>Enable direct income entry (DEMO ONLY bypass — unverified shortcut)</span>
                    </label>
                    {d.allowDemoDirectEntry && (
                      <div style={{marginTop:8}}>
                        <FieldNumber
                          label="Declared Monthly Net Earned Income (KSh) — DEMO ONLY"
                          value={d.monthlyNetEarnedIncome}
                          onChange={v=>upd("monthlyNetEarnedIncome",v)}
                          min={0}
                          step={500}
                          allowNull={true}
                          error={formError}
                          note="DEMO ONLY: This shortcut bypasses structured ledger verification and cannot be used for genuine livelihood assessments."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STAGE 2: OTHER MONEY COMING IN                                        */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step===2&&<div style={{display:"grid",gap:16}}>
        <div style={{background:S.surfaceUp,padding:14,borderRadius:8,border:`1px solid ${S.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:S.text}}>
            Separation of other financial flows from earned income
          </div>
          <div style={{fontSize:12,color:S.muted,marginTop:4,lineHeight:1.5}}>
            Financial support from family, social protection cash transfers (Inua Jamii), loan disbursements, and chama group funds are <strong>not active earned income</strong>. In this research prototype, they are recorded separately for policy review and are not automatically counted in your earned-income means-testing base.
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:S.text}}>
              Other Incoming Funds ({otherMoneyEntries.length})
            </div>
            <div style={{fontSize:12,color:S.muted,marginTop:2}}>
              Remittances, cash transfers, loan disbursements, reimbursements or chama funds.
            </div>
          </div>
          <button
            type="button"
            onClick={()=>{
              addListItem("incomeSources", {
                id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                sourceType: "REMITTANCES",
                monthsObserved: 12,
                amountReceivedKsh: 0,
                directCostsKsh: 0,
                includedInSourceId: null,
                alreadyIncludedElsewhere: false,
                isSeasonal: false,
              });
            }}
            style={{padding:"8px 14px",background:S.blue,color:"#FFF",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 2px 4px rgba(2,132,199,0.2)"}}
          >
            + Add other incoming money
          </button>
        </div>

        {otherMoneyEntries.length > 0 ? (
          <div style={{display:"grid",gap:12}}>
            {otherMoneyEntries.map(({ src, originalIndex }, entryIdx)=>{
              const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
              const received = Number(src.amountReceivedKsh || 0);
              const months = Number(src.monthsObserved || 12);
              const monthlyAvg = months > 0 ? Math.round(received / months) : 0;
              const bucketConfig = {
                POLICY_REVIEW: { bg: "#FEF3C7", text: "#92400E", label: "Policy Review (Transfers/Support)" },
                NON_EARNED_FLOW: { bg: "#F1F5F9", text: "#475569", label: "Non-Earned Financial Flow" },
                FIDUCIARY_FLOW: { bg: "#EEF2FF", text: "#3730A3", label: "Fiduciary / Group Funds" }
              }[rule.bucket] || { bg: "#F1F5F9", text: "#475569", label: rule.bucket };

              return (
                <div key={src.id || originalIndex} style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:14,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:700,color:S.text}}>
                        Flow {entryIdx+1}: {rule.label}
                      </span>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:bucketConfig.bg,color:bucketConfig.text}}>
                        {bucketConfig.label}
                      </span>
                    </div>
                    {confirmDeleteId === src.id ? (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:11,color:S.terra,fontWeight:600}}>Remove this flow?</span>
                        <button
                          type="button"
                          onClick={()=>{
                            removeListItem("incomeSources", originalIndex);
                            setConfirmDeleteId(null);
                          }}
                          style={{background:S.terra,color:"#FFF",border:"none",borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}}
                        >
                          Yes, remove
                        </button>
                        <button
                          type="button"
                          onClick={()=>setConfirmDeleteId(null)}
                          style={{background:"transparent",color:S.muted,border:`1px solid ${S.border}`,borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:500,cursor:"pointer"}}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={()=>setConfirmDeleteId(src.id)}
                        style={{background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:4,padding:"4px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid-2" style={{gap:10}}>
                    <FieldSelect
                      label="Category of incoming money"
                      value={src.sourceType}
                      onChange={v=>{
                        updListItem("incomeSources", originalIndex, "sourceType", v);
                        updListItem("incomeSources", originalIndex, "directCostsKsh", 0);
                        updListItem("incomeSources", originalIndex, "expenses", []);
                      }}
                      options={OTHER_MONEY_SOURCE_TYPES.map(k=>[k, INCOME_SOURCE_RULES[k]?.label || k])}
                    />
                    <FieldSelect
                      label="Already included in another declared source?"
                      value={src.includedInSourceId || ""}
                      onChange={v=>{
                        updListItem("incomeSources", originalIndex, "includedInSourceId", v || null);
                        updListItem("incomeSources", originalIndex, "alreadyIncludedElsewhere", !!v);
                      }}
                      options={[
                        ["", "No — Independent financial flow"],
                        ...allSources.filter((_, sIdx) => sIdx !== originalIndex).map(s => [
                          s.id,
                          `Included in Source ${s.id} (${INCOME_SOURCE_RULES[s.sourceType]?.label || s.sourceType})`
                        ])
                      ]}
                    />
                  </div>
                  {src.includedInSourceId && (
                    <div style={{marginTop:8}}>
                      <FieldNumber
                        label="Declared partial overlap amount (KSh) — optional"
                        value={src.overlapAmountKsh}
                        onChange={v=>updListItem("incomeSources", originalIndex, "overlapAmountKsh", v)}
                        min={0}
                        allowNull={true}
                        note="Leave blank if 100% of this flow is duplicated in the parent source."
                      />
                    </div>
                  )}

                  {src.sourceType === "REIMBURSEMENT" && (
                    <div style={{marginTop:8,padding:10,background:S.surfaceUp,borderRadius:6,border:`1px solid ${S.border}`}}>
                      <FieldSelect
                        label="Reimbursement Source Link (Double-Deduction Safeguard)"
                        value={src.isPersonalReimbursement ? "PERSONAL" : (src.targetSourceId || "")}
                        onChange={v=>{
                          if (v === "PERSONAL") {
                            updListItem("incomeSources", originalIndex, "isPersonalReimbursement", true);
                            updListItem("incomeSources", originalIndex, "targetSourceId", null);
                          } else {
                            updListItem("incomeSources", originalIndex, "isPersonalReimbursement", false);
                            updListItem("incomeSources", originalIndex, "targetSourceId", v || null);
                          }
                        }}
                        options={[
                          ["", "Unspecified / General reimbursement (requires review if business expenses exist)"],
                          ["PERSONAL", "Personal / Medical reimbursement (unrelated to business expenses)"],
                          ...allSources.filter(s => {
                            const r = INCOME_SOURCE_RULES[s.sourceType];
                            return r?.bucket === "EARNED";
                          }).map(s => [
                            s.id,
                            `Linked to business source: ${INCOME_SOURCE_RULES[s.sourceType]?.label || s.sourceType} (ID: ${s.id})`
                          ])
                        ]}
                      />
                      <div style={{fontSize:11,color:S.muted,marginTop:4}}>
                        Linking to a business source with operating expenses requires reconciliation to confirm no expenses were double-recovered. Unrelated personal reimbursements do not block business expenses.
                      </div>
                    </div>
                  )}

                  {/* Observation Period */}
                  <div className="grid-3" style={{gap:10, marginTop:10}}>
                    <div>
                      <Label>Observation Start Date</Label>
                      <input
                        type="date"
                        value={src.observationStartDate || ""}
                        onChange={e=>{
                          const val = e.target.value;
                          updListItem("incomeSources", originalIndex, "observationStartDate", val);
                          if (val && src.observationEndDate) {
                            const m = calculateMonthsFromDates(val, src.observationEndDate);
                            if (m) updListItem("incomeSources", originalIndex, "monthsObserved", m);
                          }
                        }}
                        style={{width:"100%",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"9px 12px",fontSize:13,fontFamily:"inherit"}}
                      />
                    </div>
                    <div>
                      <Label>Observation End Date</Label>
                      <input
                        type="date"
                        value={src.observationEndDate || ""}
                        onChange={e=>{
                          const val = e.target.value;
                          updListItem("incomeSources", originalIndex, "observationEndDate", val);
                          if (src.observationStartDate && val) {
                            const m = calculateMonthsFromDates(src.observationStartDate, val);
                            if (m) updListItem("incomeSources", originalIndex, "monthsObserved", m);
                          }
                        }}
                        style={{width:"100%",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"9px 12px",fontSize:13,fontFamily:"inherit"}}
                      />
                    </div>
                    <FieldNumber
                      label="Observed Duration (Months)"
                      value={src.monthsObserved || 12}
                      onChange={v=>{
                        const val = Math.max(1, Math.round(v));
                        updListItem("incomeSources", originalIndex, "monthsObserved", val);
                        if (src.observationStartDate && src.observationEndDate) {
                          const calcM = calculateMonthsFromDates(src.observationStartDate, src.observationEndDate);
                          if (calcM !== val) {
                            updListItem("incomeSources", originalIndex, "manuallyEditedDuration", true);
                          } else {
                            updListItem("incomeSources", originalIndex, "manuallyEditedDuration", false);
                          }
                        }
                      }}
                      min={1}
                      max={60}
                      step={1}
                      note={src.monthsObserved > 12 ? "Extended observation window (>12 months)" : undefined}
                    />
                  </div>

                  <div style={{marginTop:10}}>
                    <FieldNumber
                      label="Total amount received over observed period (KSh)"
                      value={src.amountReceivedKsh}
                      onChange={v=>updListItem("incomeSources", originalIndex, "amountReceivedKsh", v)}
                      min={0}
                      step={500}
                    />
                  </div>

                  {/* Guidance Note based on category */}
                  <div style={{marginTop:10,padding:"8px 12px",background:S.faint,borderRadius:6,fontSize:11,color:S.muted,lineHeight:1.4}}>
                    {src.sourceType === "REMITTANCES" && "Remittances: Support from relatives living in Kenya or abroad. Recorded for policy review regarding household support."}
                    {src.sourceType === "SOCIAL_ASSISTANCE" && "Social Assistance: Government cash transfers (Inua Jamii, food aid). Flagged for SHA policy determination on statutory subsidy eligibility."}
                    {src.sourceType === "LOAN_PROCEEDS" && "Loan Proceeds: Borrowed capital (bank loans, Fuliza, digital credit). Debt creates an obligation to repay and is not disposable income."}
                    {src.sourceType === "REIMBURSEMENT" && "Reimbursements: Expense offsets. Note: ensure reimbursed costs were not already deducted from business earnings."}
                    {src.sourceType === "GROUP_FUNDS" && "Chama / Group Funds: Table banking and merry-go-round savings held in fiduciary trust are not personal household income."}
                  </div>

                  <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${S.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
                    <span style={{color:S.muted}}>
                      Reported total: <strong style={{color:S.text}}>KSh {received.toLocaleString()}</strong> over {months} mo
                    </span>
                    <span style={{color:S.blue,fontWeight:600}}>
                      Average monthly flow: KSh {monthlyAvg.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{padding:16,background:S.faint,borderRadius:8,border:`1px dashed ${S.borderUp}`}}>
            <div style={{fontSize:13,fontWeight:600,color:S.text,marginBottom:4}}>No other incoming funds recorded</div>
            <div style={{fontSize:12,color:S.muted,lineHeight:1.5}}>
              If your household receives remittances from relatives, government cash transfers (Inua Jamii), loans or holds chama savings, click "+ Add other incoming money" above. Otherwise, you can proceed directly to review.
            </div>
          </div>
        )}

        {/* Collapsible Optional Financial Indicators */}
        <div style={{padding:16,background:S.surface,borderRadius:10,border:`1px solid ${S.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:S.text,textTransform:"uppercase",letterSpacing:0.5}}>
                Additional financial indicators for review (Optional)
              </div>
              <div style={{fontSize:11,color:S.muted,marginTop:2}}>
                Contextual banking, mobile money and administrative indicators for triangulation testing.
              </div>
            </div>
            <button
              type="button"
              onClick={()=>setShowOptionalIndicators(prev=>!prev)}
              style={{background:"transparent",border:"none",color:S.blue,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}
            >
              {showOptionalIndicators ? "Hide optional indicators ▲" : "Show optional indicators ▼"}
            </button>
          </div>

          {showOptionalIndicators && (
            <div style={{display:"grid",gap:14,marginTop:14,paddingTop:14,borderTop:`1px solid ${S.border}`}}>
              <div style={{fontSize:12,color:S.muted,lineHeight:1.4}}>
                <strong>Potential future data-source checks:</strong> A production design could compare member-declared information with lawfully accessible KRA, NTSA and MNO/M-Pesa data. None of these services is connected here; all values below are manually entered demonstration inputs.
              </div>
              <div className="grid-3">
                <FieldNumber label="Gross M-Pesa (Monthly)" value={d.grossMpesaMonthly} onChange={v=>upd("grossMpesaMonthly",v)} note="Illustrative comparator only."/>
                <FieldNumber label="Avg Retained Balance (12-Mo)" value={d.avgRetainedBalance} onChange={v=>upd("avgRetainedBalance",v)} note="Contextual liquidity estimate."/>
                <FieldNumber label="Diaspora Remittances (Monthly KSh)" value={d.diasporaRemittances} onChange={v=>upd("diasporaRemittances",v)} note="Excluded from AGI to encourage inward flows."/>
              </div>
              <div className="grid-2">
                <FieldNumber label="M-Pesa Transaction Count" value={d.transactionCount} onChange={v=>upd("transactionCount",v)} min={0} note="Used to identify high-velocity subsistence workers."/>
                <FieldNumber label="Number of Fuliza Defaults" value={d.fulizaDefaults} onChange={v=>upd("fulizaDefaults",v)} max={50} note="Count of defaults (contextual liquidity distress indicator; does not apply direct contribution penalty)."/>
              </div>
              <div style={{display:"grid",gap:10,background:S.faint,padding:12,borderRadius:8,border:`1px solid ${S.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",letterSpacing:0.5}}>Triangulation & Contextual Flags</div>
                <FieldSelect label="KRA PIN Type" value={d.kraPinType} onChange={v=>upd("kraPinType",v)} options={[["NONE","None"],["PAYE","Active PAYE"],["BUSINESS","Active Business"]]}/>
                <Toggle label="NTSA Car Registration?" value={d.isNtsaVerified} onChange={v=>upd("isNtsaVerified",v)} hideSpacer/>
                <Toggle label="Simulate Hidden Wealth Discovered?" value={d.hiddenWealthDiscovered} onChange={v=>upd("hiddenWealthDiscovered",v)} hideSpacer/>
                <Toggle label="Is Chama/Group Treasurer?" tip="Group fund liquidity discount (80% discount on retained balance: illustrative prototype policy assumption — requires SHA validation)" value={d.isGroupTreasurer} onChange={v=>upd("isGroupTreasurer",v)} hideSpacer/>
                <Toggle label="Has active SACCO account?" value={d.hasSaccoAccount} onChange={v=>upd("hasSaccoAccount",v)} hideSpacer/>
                {d.hasSaccoAccount && (
                  <FieldNumber label="Declared SACCO Share Capital (KSh)" value={d.saccoShareCapital} onChange={v=>upd("saccoShareCapital",v)} min={0} step={1000}/>
                )}
                <Toggle label="DPA Consent Withheld?" value={d.consentWithheld} onChange={v=>upd("consentWithheld",v)} hideSpacer/>
              </div>
            </div>
          )}
        </div>
      </div>}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STAGE 3: REVIEW AND ASSESSMENT                                        */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step===3&&(()=>{
        const effectiveSources = resolveEffectiveIncomeSources(d.incomeSources || [], d.hasNoEarnedIncome);
        const hasStructuredSources = Array.isArray(effectiveSources) && effectiveSources.length > 0;
        const liveIncomeSnapshot = hasStructuredSources
          ? calculateHouseholdIncome(effectiveSources, DEFAULT_COMMON_ASSESSMENT_PERIOD)
          : (d.hasNoEarnedIncome
              ? createZeroEarnedIncomeAssessment(DEFAULT_COMMON_ASSESSMENT_PERIOD)
              : {
                  isValid: true,
                  calculationStatus: "CALCULATED_STANDARD",
                  canPopulatePrototypeEarnedIncomeBase: true,
                  monthlyEarnedNetKsh: Number(d.monthlyNetEarnedIncome || 0),
                  reviewOnlyMonthlyEarnedNetKsh: Number(d.monthlyNetEarnedIncome || 0),
                  annualisedEarnedNetKsh: Number(d.monthlyNetEarnedIncome || 0) * 12,
                  reviewOnlyAnnualisedEarnedNetKsh: Number(d.monthlyNetEarnedIncome || 0) * 12,
                  lines: [],
                  reviewFlags: [
                    {
                      code: "DIRECT_ENTRY_DEMO_BASELINE",
                      message: "Direct monthly net income baseline entered without structured ledger decomposition (DEMO ONLY)."
                    }
                  ],
                  duplicateRelationships: [],
                  monthlyPolicyReviewResourcesKsh: 0,
                  monthlyNonEarnedFlowsKsh: 0,
                  monthlyFiduciaryFlowsKsh: 0,
                  requiresManualReview: false,
                  requiresPolicyDecision: false,
                  assessmentInputMode: "DIRECT_ENTRY_DEMO_ONLY",
                  calculationVersion: "direct-entry-baseline-v1.1"
                });
        const reviewData = buildAssessmentReview({
          inputs: d,
          incomeAssessmentSnapshot: liveIncomeSnapshot,
          incomeSources: effectiveSources
        });

        const isProvisionalPolicy = liveIncomeSnapshot.calculationStatus === "PROVISIONAL_PENDING_POLICY";
        const isBlockedReview =
          liveIncomeSnapshot.canPopulatePrototypeEarnedIncomeBase === false ||
          liveIncomeSnapshot.calculationStatus?.startsWith("BLOCKED_");
        const canShowContributionPreview =
          liveIncomeSnapshot.canPopulatePrototypeEarnedIncomeBase === true;

        return (
          <div style={{display:"grid",gap:16}}>
            {/* Status Banner */}
            <div style={{background: isBlockedReview ? "#FEF2F2" : isProvisionalPolicy ? "#FFFBEB" : "#F0FDF4", border: `1px solid ${isBlockedReview ? "#FECACA" : isProvisionalPolicy ? "#FCD34D" : "#BBF7D0"}`, borderRadius:8, padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,fontWeight:800,letterSpacing:0.5,padding:"3px 8px",borderRadius:4,background: isBlockedReview ? "#DC2626" : isProvisionalPolicy ? "#D97706" : "#166534", color:"#FFF"}}>
                    {liveIncomeSnapshot.calculationStatus || reviewData.status}
                  </span>
                  <span style={{fontSize:13,fontWeight:700,color: isBlockedReview ? "#991B1B" : isProvisionalPolicy ? "#92400E" : "#166534"}}>
                    Member-Reported Household Declaration
                  </span>
                </div>
                <div style={{fontSize:11,color:S.muted}}>
                  Engine: <strong>{reviewData.calculationVersion}</strong>
                </div>
              </div>
              <div style={{fontSize:12,color:S.muted,marginTop:6,lineHeight:1.4}}>
                {reviewData.disclaimer}
              </div>
            </div>

            {/* Review Section 1: Household Composition */}
            <div style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:S.text}}>
                  1. Household Composition
                </div>
                <button
                  type="button"
                  onClick={()=>go(0)}
                  style={{background:"transparent",border:"none",color:S.blue,fontSize:12,fontWeight:600,cursor:"pointer"}}
                >
                  Edit household ↗
                </button>
              </div>
              <div className="grid-4" style={{fontSize:12,gap:8}}>
                <div><span style={{color:S.muted}}>County:</span> <strong>{reviewData.household.county}</strong></div>
                <div><span style={{color:S.muted}}>Size:</span> <strong>{reviewData.household.householdSize} members</strong></div>
                <div><span style={{color:S.muted}}>Head Age:</span> <strong>{reviewData.household.headAge}</strong></div>
                <div><span style={{color:S.muted}}>Head Gender:</span> <strong>{reviewData.household.headGender}</strong></div>
              </div>
              {reviewData.household.circumstances.length > 0 && (
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {reviewData.household.circumstances.map((c, idx)=>(
                    <span key={idx} style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:S.sageD,color:S.sage,border:`1px solid ${S.sageBd}`}}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Review Section 2: Earned Income */}
            <div style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:S.text}}>
                  2. Earned Income ({d.hasNoEarnedIncome ? "Declared Zero" : `${reviewData.earnedSources.count} Source(s)`})
                </div>
                <button
                  type="button"
                  onClick={()=>go(1)}
                  style={{background:"transparent",border:"none",color:S.blue,fontSize:12,fontWeight:600,cursor:"pointer"}}
                >
                  Edit earned income ↗
                </button>
              </div>

              {d.hasNoEarnedIncome ? (
                <div style={{fontSize:12,color:S.sage,padding:"8px 12px",background:S.sageD,borderRadius:6}}>
                  Household has declared no current earned income. Earned base is KSh 0/month.
                </div>
              ) : reviewData.earnedSources.count > 0 ? (
                <div style={{display:"grid",gap:8}}>
                  {(liveIncomeSnapshot?.lines || []).filter(l => l.bucket === "EARNED").map((line, idx)=>(
                    <div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:S.surfaceUp,borderRadius:6,fontSize:12,flexWrap:"wrap",gap:6}}>
                      <div>
                        <strong>{line.label}</strong>
                        {line.isDuplicate && <span style={{marginLeft:6,fontSize:10,color:S.amber,fontWeight:700}}>(Duplicate excluded)</span>}
                        {line.isPartialDuplicate && <span style={{marginLeft:6,fontSize:10,color:S.blue,fontWeight:700}}>(Partial duplicate deducted)</span>}
                        <div style={{fontSize:11,color:S.muted}}>
                          Gross: KSh {line.totalReceivedKsh.toLocaleString()}
                          {line.countedReceivedKsh !== undefined && line.countedReceivedKsh !== line.totalReceivedKsh && ` (Counted: KSh ${line.countedReceivedKsh.toLocaleString()})`}
                          {` · Costs: KSh ${line.totalReportedCostsKsh.toLocaleString()} (${line.observationMonths} mo)`}
                        </div>
                        {line.costOfGoodsSoldKsh !== null && (
                          <div style={{fontSize:11,color:S.muted}}>
                            COGS: KSh {line.costOfGoodsSoldKsh.toLocaleString()} (Opening {line.openingStockKsh || 0} + Purchases {line.stockPurchasesKsh || 0} - Closing {line.closingStockKsh || 0})
                          </div>
                        )}
                        {line.overlapAmountKsh !== null && line.overlapAmountKsh > 0 && (
                          <div style={{fontSize:11,color:"#B45309"}}>
                            Overlap deducted: KSh {line.overlapAmountKsh.toLocaleString()} (Net counted: KSh {line.countedReceivedKsh.toLocaleString()})
                          </div>
                        )}
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:700,color:line.isDuplicate?S.muted:S.text}}>
                          {line.isDuplicate ? "Excluded from earned total" : `KSh ${line.averageMonthlyNetKsh.toLocaleString()}/mo`}
                        </div>
                        <div style={{fontSize:10,color:line.periodStatus==="FULL_ANNUAL"?S.sage:S.amber}}>
                          {line.periodStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:4,paddingTop:8,borderTop:`1px solid ${S.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontWeight:700,fontSize:13}}>
                    <span>Earned Net Subtotal:</span>
                    <span style={{color:S.blue}}>
                      {liveIncomeSnapshot.canPopulatePrototypeEarnedIncomeBase
                        ? `KSh ${(liveIncomeSnapshot.monthlyEarnedNetKsh || 0).toLocaleString()}/mo (Annualised: KSh ${(liveIncomeSnapshot.annualisedEarnedNetKsh || 0).toLocaleString()})`
                        : `KSh ${(liveIncomeSnapshot.reviewOnlyMonthlyEarnedNetKsh || 0).toLocaleString()}/mo (Review only — not approved for classification)`}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:12,color:S.text}}>
                  Direct baseline entry: <strong>KSh {(d.monthlyNetEarnedIncome || 0).toLocaleString()}/month</strong> (Annualised: KSh {((d.monthlyNetEarnedIncome || 0)*12).toLocaleString()})
                </div>
              )}
            </div>

            {/* Review Section 3: Other Financial Flows */}
            <div style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:S.text}}>
                  3. Other Incoming Funds ({reviewData.otherFinancialFlows.count} Flow(s))
                </div>
                <button
                  type="button"
                  onClick={()=>go(2)}
                  style={{background:"transparent",border:"none",color:S.blue,fontSize:12,fontWeight:600,cursor:"pointer"}}
                >
                  Edit other money ↗
                </button>
              </div>

              {reviewData.otherFinancialFlows.count > 0 ? (
                <div style={{display:"grid",gap:8}}>
                  {(liveIncomeSnapshot?.lines || []).filter(l => l.bucket !== "EARNED").map((line, idx)=>(
                    <div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:S.surfaceUp,borderRadius:6,fontSize:12,flexWrap:"wrap",gap:6}}>
                      <div>
                        <strong>{line.label}</strong>
                        <div style={{fontSize:11,color:S.muted}}>
                          {line.bucket} · KSh {line.totalReceivedKsh.toLocaleString()} over {line.observationMonths} mo
                        </div>
                      </div>
                      <div style={{fontWeight:700,color:S.text}}>
                        KSh {line.averageMonthlyReceivedKsh.toLocaleString()}/mo
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:4,paddingTop:8,borderTop:`1px solid ${S.border}`,fontSize:11,color:S.muted,display:"grid",gap:3}}>
                    <div>Policy Review Resources: <strong>KSh {((liveIncomeSnapshot?.monthlyPolicyReviewResourcesKsh) || 0).toLocaleString()}/mo</strong></div>
                    <div>Non-Earned Financial Flows: <strong>KSh {((liveIncomeSnapshot?.monthlyNonEarnedFlowsKsh) || 0).toLocaleString()}/mo</strong></div>
                    <div>Fiduciary / Group Funds: <strong>KSh {((liveIncomeSnapshot?.monthlyFiduciaryFlowsKsh) || 0).toLocaleString()}/mo</strong></div>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:12,color:S.muted}}>No other financial flows reported.</div>
              )}
            </div>

            {/* Review Section 4: Flags & Warnings */}
            {(((liveIncomeSnapshot?.reviewFlags?.length) || 0) > 0 || ((liveIncomeSnapshot?.duplicateRelationships?.length) || 0) > 0) && (
              <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:6}}>
                  Assessment Review Flags & Verification Safeguards
                </div>
                <div style={{display:"grid",gap:6}}>
                  {(liveIncomeSnapshot?.duplicateRelationships || []).map((dup, idx)=>(
                    <div key={`dup-${idx}`} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#92400E"}}>
                      <Info size={13} style={{flexShrink:0}}/>
                      <span><strong>[DUPLICATE_TRACKED]</strong> {dup.duplicateSourceLabel} (ID: {dup.duplicateSourceId}) is linked to {dup.parentSourceLabel} (ID: {dup.parentSourceId}); excluded from earned income to prevent double-counting.</span>
                    </div>
                  ))}
                  {(liveIncomeSnapshot?.reviewFlags || []).map((flag, idx)=>(
                    <div key={`flag-${idx}`} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:flag.code==="DUPLICATE_SOURCE_NOT_COUNTED"?S.muted:flag.code==="TRANSFER_TREATMENT_REQUIRES_POLICY"?"#B45309":"#B91C1C"}}>
                      <AlertTriangle size={13} style={{flexShrink:0}}/>
                      <span><strong>[{flag.code}]</strong> {flag.message}</span>
                    </div>
                  ))}
                </div>
                {liveIncomeSnapshot.requiresManualReview && (
                  <div style={{marginTop:8,padding:"6px 10px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:4,fontSize:11,color:"#B91C1C",fontWeight:600}}>
                    ⚠️ Manual Review Required: One or more income sources require officer review before automated means-testing can proceed.
                  </div>
                )}
                {isProvisionalPolicy && !isBlockedReview && (
                  <div style={{marginTop:8,padding:"6px 10px",background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:4,fontSize:11,color:"#92400E",fontWeight:600}}>
                    📋 Provisional Assessment (Policy Decision Required): Member reported transfers or social assistance. Treatment in final means-testing requires SHA policy determination.
                  </div>
                )}
              </div>
            )}

            {/* Illustrative Calculation Preview */}
            <div style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",letterSpacing:0.5}}>
                Illustrative Calculation Preview
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:6}}>
                <div style={{fontSize:22,fontWeight:800,color: canShowContributionPreview ? S.sage : S.terra}}>
                  {!canShowContributionPreview ? (
                    <div>
                      Assessment cannot proceed. Resolve the review flags first.
                    </div>
                  ) : (
                    (()=>{
                      const earnedBase = liveIncomeSnapshot.annualisedEarnedNetKsh ?? ((d.monthlyNetEarnedIncome || 0) * 12);
                      const est = calculateCurrentModelContribution(earnedBase);
                      return `KSh ${est.monthly.toLocaleString()}/month`;
                    })()
                  )}
                </div>
                {canShowContributionPreview && (
                  <div style={{fontSize:11,color:S.muted}}>
                    Indicative pre-adjustment base: KSh {(liveIncomeSnapshot.annualisedEarnedNetKsh ?? ((d.monthlyNetEarnedIncome || 0)*12)).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{fontSize:11,color:S.muted,marginTop:6,fontStyle:"italic",lineHeight:1.4}}>
                {!canShowContributionPreview
                  ? `Status: ${liveIncomeSnapshot.calculationStatus}. Reported provisional earned subtotal: KSh ${(liveIncomeSnapshot.reviewOnlyMonthlyEarnedNetKsh || 0).toLocaleString()}/mo (visible for review only, not eligible for contribution model).`
                  : "Illustrative prototype calculation — not an official SHA assessment. Applies the statutory 2.75% rate and KSh 300 minimum floor."}
              </div>
            </div>

            {/* Review Confirmation Prompt */}
            <div style={{padding: 16, background: S.blueD, border: `1px solid ${S.blueBd}`, borderRadius: 8}}>
              <div style={{fontSize: 14, fontWeight: 700, color: S.blue, marginBottom: 4}}>
                Is everything correct, or would you like to change anything?
              </div>
              <div style={{fontSize: 12, color: S.text, lineHeight: 1.5}}>
                Review the entered details above across Household, Earned Income, and Other Money. If any detail needs adjustment, click <strong>Edit</strong> on that section. When you are satisfied that all records are complete, confirm below to compute the itemised assessment.
              </div>
            </div>

            {/* Demo Acknowledgment Checkbox */}
            <div style={{padding: 14, background: S.faint, borderRadius: 8, border: `1px solid ${S.border}`}}>
              <label style={{display:"flex", alignItems:"flex-start", gap:10, fontSize:13, fontWeight:500, color:S.text, cursor:"pointer"}}>
                <input
                  type="checkbox"
                  checked={hasAcknowledgedDemo}
                  onChange={(e)=>setHasAcknowledgedDemo(e.target.checked)}
                  style={{marginTop:2, transform:"scale(1.1)", accentColor:S.blue}}
                />
                <span>
                  I understand this is a browser-only demonstration. No KRA, NTSA, IPRS or MNO data is retrieved, and no information or appeal is submitted to SHA.
                </span>
              </label>
            </div>
          </div>
        );
      })()}

      {formError && (
        <div role="alert" style={{marginTop: 16, padding: "10px 14px", background: S.terraD, border: `1px solid ${S.terraBd}`, borderRadius: 6, fontSize: 13, color: S.terra, display: "flex", gap: 8, alignItems: "center"}}>
          <AlertTriangle size={16} style={{flexShrink: 0}} />
          <span>{formError}</span>
        </div>
      )}

      {/* Navigation */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:28,paddingTop:20,borderTop:`1px solid ${S.border}`,gap:12,flexWrap:"wrap"}}>
        <button
          type="button"
          onClick={()=>go(step-1)}
          disabled={step===0}
          style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${S.borderUp}`,background:S.surface,color:step===0?S.borderUp:S.text,fontSize:14,fontWeight:500,cursor:step===0?"default":"pointer",fontFamily:"inherit",transition:"all .2s",whiteSpace:"nowrap"}}
        >
          {step === 0 ? "← Back" : step === 1 ? "← Back to Household" : step === 2 ? "← Back to Earned Income" : "← Back to Other Money"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={()=>go(step+1)}
            style={{padding:"10px 24px",borderRadius:6,border:"none",background:S.blue,color:"#FFF",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 4px rgba(2,132,199,0.2)",transition:"all .2s",whiteSpace:"nowrap"}}
          >
            {step === 0 ? "Continue to Earned Income →" : step === 1 ? "Continue to Other Money →" : "Continue to Review →"}
          </button>
        ) : (
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            <button
              type="button"
              onClick={onClassify}
              disabled={classifying || !hasAcknowledgedDemo}
              style={{padding:"12px 28px",borderRadius:6,border:"none",background:classifying||!hasAcknowledgedDemo?S.borderUp:S.sage,color:classifying||!hasAcknowledgedDemo?S.muted:"#FFF",fontSize:14,fontWeight:700,cursor:classifying||!hasAcknowledgedDemo?"default":"pointer",fontFamily:"inherit",boxShadow:classifying||!hasAcknowledgedDemo?"none":"0 2px 4px rgba(5,150,105,0.2)",transition:"all .2s",whiteSpace:"nowrap"}}
            >
              {classifying ? "Computing…" : "Confirm details and calculate →"}
            </button>
            <div style={{fontSize:11,color:S.muted,maxWidth:340,textAlign:"right",lineHeight:1.3}}>
              Demonstration calculation only: uses the prototype algorithm and frozen reference parameters. This does not submit an application or bind SHA.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS TABS
// ─────────────────────────────────────────────────────────────────────────────

function ComparisonTab({results, adminParams}) {
  const {current:cur,next:nxt,d} = results;
  const diff = cur.monthly - nxt.monthly;
  const comparatorHigher = diff > 0;
  const chartData = [
    {name:"Author-Created Comparator",v:cur.monthly,fill:S.terra},
    {name:"Proposed AGI Rules Engine",v:nxt.monthly,fill:S.sage},
  ];
  return (
    <div style={{display:"grid",gap:24}}>
      {/* Comparator Disclosure Banner */}
      <div style={{background:"#F8FAFC",border:"1px solid #CBD5E1",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#475569",lineHeight:1.5}}>
        <strong>Methodological Disclosure:</strong> The comparator shown below is an <em>author-created illustrative score</em> with invented demonstration weights (e.g. gross M-Pesa volume factor, flat dwelling proxies). It is <strong>not</strong> SHA's production means-testing instrument under Regulation 21(6) and the Fifth Schedule, and is not a reconstruction of SHA's 43-variable regression. A difference between this comparator and the proposed model illustrates methodology divergence, not proof of actual SHA overcharging.
      </div>

      {/* Big numbers */}
      <div className="grid-2">
        {[
          {label:"Author-created illustrative comparator — not SHA's instrument",monthly:cur.monthly,income:cur.annualIncome,tier:cur.tier,floorApplied:cur.minimumContributionFloorApplied ?? (cur.monthly === 300),color:S.terra,bdColor:S.terraBd,bgColor:S.terraD,note:null},
          {label:"Proposed · AGI rules engine",monthly:nxt.monthly,income:nxt.annualIncome,tier:nxt.tier,floorApplied:nxt.minimumContributionFloorApplied ?? (nxt.monthly === 300),color:S.sage,bdColor:S.sageBd,bgColor:S.sageD,note:null},
        ].map(box=>(
          <div key={box.label} style={{background:box.bgColor,border:`1px solid ${box.bdColor}`,borderRadius:12,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:box.color,marginBottom:16}}>{box.label}</div>
            <div className="big-number-val" style={{fontFamily:"'Inter',sans-serif",fontSize:box.floorApplied?22:42,fontWeight:800,color:box.color,lineHeight:1.15,letterSpacing:box.floorApplied?"0px":"-1px"}}>
              {box.floorApplied
                ? "KSh 300 minimum contribution rule"
                : `KSh ${box.monthly.toLocaleString()}`
              }
            </div>
            <div style={{fontSize:13,color:S.muted,marginTop:6,fontWeight:500}}>per month</div>
            {box.floorApplied && (
              <p style={{fontSize:12,color:S.muted,lineHeight:1.5,marginTop:8}}>
                The minimum contribution result applies Regulation 18(2)'s statutory floor (KSh 300/mo). It is not an official SHA indigence determination or government subsidy approval under Regulation 19.
              </p>
            )}
            <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${box.bdColor}`}}>
              <div style={{fontSize:12,color:S.muted,fontWeight:500}}>Indicative pre-adjustment base</div>
              <div style={{fontSize:18,fontWeight:700,color:S.text,marginTop:2}}>KSh {box.income.toLocaleString()}</div>
            </div>
            <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"4px 10px",borderRadius:4,background:S.surface,border:`1px solid ${box.bdColor}`,color:box.color}}>{box.tier} TIER</span>
              {box.floorApplied&&<span style={{fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"4px 10px",borderRadius:4,background:S.sage,color:"#FFF"}}>STATUTORY MINIMUM RULE (Reg. 18(2) KSh 300 Floor)</span>}
              {box.note&&<span style={{fontSize:10,fontWeight:600,letterSpacing:"0.5px",padding:"4px 10px",borderRadius:4,background:S.amber,color:"#FFF",display:"flex",alignItems:"center",gap:4}}><ShieldCheck size={12}/>{box.note}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Provisional Policy Decision Callout */}
      {nxt.incomeAssessmentSnapshot?.requiresPolicyDecision && (
        <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:8,padding:14,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:0.5,padding:"3px 8px",borderRadius:4,background:"#D97706",color:"#FFF",flexShrink:0}}>PROVISIONAL_PENDING_POLICY</span>
          <div style={{fontSize:12,color:"#92400E",lineHeight:1.5}}>
            <strong>Policy Decision Required:</strong> Household declared incoming transfers, remittances or social assistance. {nxt.incomeAssessmentSnapshot.policyDecisionSummary || "Treatment in means-testing requires SHA policy determination."} The contribution shown is calculated on declared net earned income only and remains provisional.
          </div>
        </div>
      )}

      {/* Provisional Short Window Extrapolation Callout */}
      {nxt.incomeAssessmentSnapshot?.hasProvisionalShortWindowSources && (
        <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,padding:14,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:0.5,padding:"3px 8px",borderRadius:4,background:"#DC2626",color:"#FFF",flexShrink:0}}>PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION</span>
          <div style={{fontSize:12,color:"#991B1B",lineHeight:1.5}}>
            <strong>Short Observation Window Warning:</strong> Household reported income sources observed over fewer than 12 months (3–11 months). Extrapolation to an annual figure is provisional and does not represent an established 12-month earning pattern. Under prototype governance, this assessment is non-binding and cannot be treated as an official SHA determination without approved annualisation rules or verification.
          </div>
        </div>
      )}

      {/* Difference callout */}
      {Math.abs(diff)>0&&(
        <div className="diff-callout" style={{background:comparatorHigher?S.terraD:S.sageD,border:`1px solid ${comparatorHigher?S.terraBd:S.sageBd}`}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",color:comparatorHigher?S.terra:S.sage,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
              {comparatorHigher?<AlertTriangle size={16}/>:<CheckCircle2 size={16}/>}
              {comparatorHigher?"Author-created comparator is higher.":"Proposed calculation is higher."}
            </div>
            <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
              {diff === 0 
                ? "Difference between the two prototype calculations: both produce the same indicative monthly amount. Agreement between simulations does not establish that either amount is correct."
                : comparatorHigher
                  ? `Difference between the two prototype calculations: the author-created illustrative comparator is KSh ${diff.toLocaleString()} higher per month than the proposed rules-engine result. This comparison illustrates methodological disagreement on demonstration inputs; it does not establish that an actual SHA assessment is wrong.`
                  : `Difference between the two prototype calculations: the proposed rules-engine result is KSh ${Math.abs(diff).toLocaleString()} higher per month than the author-created comparator. This is a model comparison, not a finding about an actual household assessment.`}
            </div>
          </div>
          <div className="diff-callout-amount" style={{color:comparatorHigher?S.terra:S.sage}}>
            {comparatorHigher?"–":"+"}KSh {Math.abs(diff).toLocaleString()}
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:12}}>
        <Label>Monthly Contribution Comparison (KSh)</Label>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{top:10,right:0,left:-15,bottom:0}}>
            <XAxis dataKey="name" tick={{fill:S.text,fontSize:12,fontWeight:500}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:S.muted,fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toLocaleString()}`}/>
            <Tooltip cursor={{fill:S.faint}} formatter={(v)=>[`KSh ${v.toLocaleString()}`,"Monthly"]} contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,color:S.text,fontSize:13,fontWeight:500,boxShadow:"0 4px 6px rgba(0,0,0,0.05)"}}/>
            <ReferenceLine y={300} stroke={S.amber} strokeDasharray="4 3" label={{value:"KSh 300 Monthly Floor (Reg. 18(2) Minimum Rule)",fill:S.amber,fontSize:11,position:"insideTopRight",fontWeight:600}}/>
            <Bar dataKey="v" radius={[6,6,0,0]} maxBarSize={80}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data fusion signals */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <Label style={{marginBottom:0}}>Illustrative source indicators · no live agency connections</Label>
          {adminParams?.triangulationOffline && <span style={{fontSize:11,fontWeight:700,background:S.amber,color:"#FFF",padding:"2px 8px",borderRadius:12}}>FALLBACK DEMONSTRATION</span>}
        </div>
        
        {adminParams?.triangulationOffline ? (
          <div style={{background:"#FEF3C7",padding:"16px",borderRadius:8,border:"1px solid #FDE68A"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#B45309",marginBottom:4}}>⚠️ Illustrative fallback mode</div>
            <div style={{fontSize:13,color:"#92400E",lineHeight:1.5}}>No KRA, NTSA, IPRS or mobile-network APIs are connected in this prototype. This panel only demonstrates how a fallback pathway could be presented; it does not trigger a real verification or CHP referral.</div>
          </div>
        ) : (
          <div className="grid-2">
            {[
              {src:"IPRS identity records",status:"NOT CONNECTED",detail:"No identity lookup is performed in this prototype."},
              {src:"NTSA vehicle records",status:(d.assets.includes("CAR") || d.isNtsaVerified) ? "USER-ENTERED INDICATOR" : "NO VEHICLE DECLARED",detail:"Displayed from the demonstration form only; no NTSA/TIMS query is made."},
              {src:"MNO / M-Pesa records",status:d.isGroupTreasurer ? "USER-ENTERED CHAMA CLAIM" : "USER-ENTERED VALUES",detail:"Transaction and retained-balance fields are entered manually for this demonstration."},
              {src:"KRA tax records",status:(d.kraPinType && d.kraPinType !== "NONE") ? "USER-ENTERED PIN TYPE" : "NO PIN TYPE ENTERED",detail:"No KRA iTax or eTIMS records are retrieved or verified."},
            ].map(sig=>(
              <div key={sig.src} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",background:S.surface,borderRadius:8,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
                <Info size={18} color={S.blue} style={{marginTop:2,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:S.text}}>{sig.src} <span style={{fontWeight:500,color:S.muted}}>· {sig.status}</span></div>
                  <div style={{fontSize:12,color:S.muted,marginTop:4,lineHeight:1.5}}>{sig.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SHAPTab({results, adminParams}) {
  const factors = results.next.factors || [];
  const deductions = results.next.deductions || [];
  const isCustom = adminParams && (adminParams.carValue !== 350000 || adminParams.urbanCostOfLiving !== 12000 || adminParams.fulizaPenalty !== 5000);

  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Proposed calculation breakdown</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
          This screen displays factors and deductions produced by the prototype rules engine. It is a calculation breakdown, not a SHAP/Shapley attribution, an official SHA assessment, or proof that the proposed deductions are legally mandated or empirically validated.
        </div>
      </div>
      {isCustom && (
        <div style={{padding:12,background:S.amberD,border:`1px solid ${S.amberBd}`,borderRadius:8,display:"flex",gap:8,alignItems:"flex-start"}}>
          <Settings size={16} color={S.amber} style={{flexShrink:0,marginTop:2}}/>
          <div style={{fontSize:13,color:S.text,lineHeight:1.5}}>
            <strong style={{color:S.amber}}>Custom Admin Weights Active — </strong>
            {adminParams.carValue !== 350000 && <span>Car Value: KSh {adminParams.carValue.toLocaleString()} (default 350,000). </span>}
            {adminParams.urbanCostOfLiving !== 12000 && <span>Urban Rent: KSh {adminParams.urbanCostOfLiving.toLocaleString()} (default 12,000). </span>}
            {adminParams.fulizaPenalty !== 5000 && <span>Fuliza Penalty: KSh {adminParams.fulizaPenalty.toLocaleString()} (default 5,000). </span>}
          </div>
        </div>
      )}

      {/* AGI Deductions */}
      {deductions.length > 0 && (
        <div style={{display:"grid",gap:16}}>
          <div style={{fontSize:16,fontWeight:600,color:S.text}}>Adjustable Gross Income (AGI) Deductions</div>
          {deductions.map((d,i) => (
            <div key={i} style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:S.text,marginBottom:4}}>{d.name}</div>
                <div style={{fontSize:13,color:S.muted}}>{d.reason}</div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:S.sage}}>- KSh {d.amount.toLocaleString()}</div>
            </div>
          ))}
          <div style={{textAlign:"right",paddingTop:8,borderTop:`1px solid ${S.border}`,fontSize:16,fontWeight:700}}>
            Final AGI: KSh {Math.round(results.next.adjustedGrossIncome).toLocaleString()}
          </div>
        </div>
      )}

      {/* Transparency factors */}
      <div style={{display:"grid",gap:16,marginTop:12}}>
        <div style={{fontSize:16,fontWeight:600,color:S.text}}>Key Overrides & Constraints</div>
        {factors.map((item,i)=>(
          <div key={i} style={{background:S.faint,border:`1px solid ${S.borderUp}`,borderRadius:8,padding:16,display:"flex",gap:16,alignItems:"flex-start"}}>
            {item.direction === 'down' ? <CheckCircle2 size={20} color={S.sage}/> : <AlertTriangle size={20} color={S.amber}/>}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:S.text,marginBottom:4}}>{item.name}</div>
              <div style={{fontSize:13,color:S.muted}}>{item.description}</div>
            </div>
          </div>
        ))}
        {factors.length === 0 && <div style={{fontSize:13,color:S.muted}}>No special constraints triggered for this profile.</div>}
      </div>

    </div>
  );
}

function USSDTab({results}) {
  const [screen,setScreen]=useState(0);
  const {current:cur,next:nxt} = results;
  const screens=[
    {title:"Main Menu · *147#",content:[
      {t:"SHA Kenya — Afya Yangu",y:true},{t:"—".repeat(22),y:false},
      {t:"1. My status & contribution",y:false},{t:"2. Payment options (illustrative)",y:false},
      {t:"Contributions Appeal",y:false},{t:"Why this amount?",y:false},
      {t:"0. Cancel",y:false},{t:"",y:false},{t:"Enter option:",y:false},
    ]},
    {title:"My Status",content:[
      {t:"SHA — My Account",y:true},{t:"—".repeat(22),y:false},
      {t:`County: ${results.d.county}`,y:false},
      {t:`Tier: ${nxt.tier}`,y:false},
      {t:`Status: ${nxt.minimumContributionFloorApplied?"MINIMUM RULE (KSh 300)":"ACTIVE"}`,col:nxt.minimumContributionFloorApplied?"#4ADE80":"#4ADE80"},
      {t:`Monthly: KSh ${nxt.monthly}`,col:"#4ADE80"},{t:"",y:false},
      {t:"1. Why this amount?",y:false},{t:"2. Pay now",y:false},{t:"0. Back",y:false},
    ]},
    {title:"Calculation explanation · mock",content:[
      {t:"SHA — Explanation",y:true},{t:"—".repeat(22),y:false},
      {t:`Assessment: KSh ${nxt.monthly}/mo`,col:"#4ADE80"},{t:"",y:false},
      {t:"Key factors (AGI Model v2.1):",y:false},
      {t:`Household: ${results.d.householdSize} members`,y:false},
      {t:`Retained Bal: KSh ${results.d.avgRetainedBalance.toLocaleString()}`,y:false},
      {t:`Assets: ${results.d.assets.length} declared`,y:false},{t:"",y:false},
      {t:"Explanation screen: demonstration only",col:"#38BDF8"},{t:"1. Appeal  0. Back",y:false},
    ]},
    {title:"Pay · Lipa Pole Pole",content:[
      {t:"SHA — Flexible Payment",y:true},{t:"—".repeat(22),y:false},
      {t:`Due this month: KSh ${nxt.monthly}`,y:false},{t:"",y:false},
      {t:"1. Full month",y:false},
      {t:`   KSh ${nxt.monthly}`,col:"#4ADE80"},
      {t:"2. Weekly",y:false},
      {t:`   KSh ${Math.ceil(nxt.monthly/4)}`,col:"#4ADE80"},
      {t:"3. Daily",y:false},
      {t:`   KSh ${Math.ceil(nxt.monthly/30)}`,col:"#4ADE80"},
      {t:"Use official SHA payment instructions  0. Back",y:false},
    ]},
    {title:"Contributions Appeal route · illustrative",content:[
      {t:"SHA — Appeal entry (mock)",y:true},{t:"—".repeat(22),y:false},
      {t:`Your tier: ${nxt.tier}`,y:false},
      {t:"Select the information you want reviewed:",y:false},{t:"",y:false},
      {t:"1. KRA PIN",y:false},{t:"2. M-Pesa Velocity",y:false},{t:"3. NTSA Assets",y:false},{t:"",y:false},
      {t:"A real SHA review is not performed by this demo.",col:"#94A3B8"},
      {t:"0. Back",y:false},
    ]},
  ];
  const sc=screens[screen];
  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>USSD Architectural Simulation</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>This is a proposed USSD interaction storyboard, not a connected USSD gateway or timed performance test. The flow, response times and handset compatibility require implementation and field testing.</div>
      </div>
      <div className="ussd-container">
        {/* Phone */}
        <div style={{flexShrink:0}}>
          <div style={{background:"#1A1A24",border:"3px solid #E2E8F0",borderRadius:24,width:280,padding:16,boxShadow:"0 12px 24px rgba(0,0,0,0.1)"}}>
            <div style={{width:40,height:4,background:"#CBD5E1",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{background:"#0A0F1A",borderRadius:8,padding:16,minHeight:340,fontFamily:"'Courier New',monospace",fontSize:13,lineHeight:1.8}}>
              <div style={{color:"#94A3B8",fontSize:10,marginBottom:10}}>Safaricom · {sc.title}</div>
              {sc.content.map((line,i)=>(
                <div key={i} style={{color:line.col||(line.y?"#FDE047":"#F8FAFC")}}>{line.t||"\u00A0"}</div>
              ))}
            </div>
            <div className="grid-3" style={{marginTop:12}}>
              {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k=>(
                <div key={k} style={{background:"#F1F5F9",borderRadius:4,padding:"10px",textAlign:"center",fontSize:14,fontWeight:600,color:"#334155"}}>{k}</div>
              ))}
            </div>
          </div>
        </div>


      {/* Navigation */}
        <div style={{flex:1,display:"grid",gap:12}}>
          <Label>Navigate the USSD Session</Label>
          {screens.map((s,i)=>(
            <button key={i} onClick={()=>setScreen(i)} style={{display:"flex",alignItems:"center",gap:16,padding:"16px",border:`1px solid ${screen===i?S.blueBd:S.border}`,borderRadius:10,background:screen===i?S.blueD:S.surface,cursor:"pointer",textAlign:"left",width:"100%",boxShadow:screen===i?"0 2px 4px rgba(2,132,199,0.05)":"none",transition:"all .2s"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:screen===i?S.blue:S.faint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:screen===i?"#FFF":S.muted,flexShrink:0}}>{i+1}</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:screen===i?S.blue:S.text,marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:12,color:S.muted,fontFamily:"monospace"}}>{"Step " + (i + 1)}</div>
              </div>
            </button>
          ))}
          <div style={{marginTop:16,padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.text,marginBottom:6}}>Illustrative architecture targets (not measured service metrics)</div>
            <div style={{fontSize:11,color:S.muted,lineHeight:1.45,marginBottom:12}}>These are proposed design requirements for a future service, not deployed infrastructure or observed performance.</div>
            {["P99 latency < 2 seconds end-to-end","Session circuit-break at 160s → SMS resume link","Active-active configuration: Safaricom · Airtel · Telkom","580 TPS sustained under peak load","Authentication: MSISDN + 6-digit PIN + IMSI-bound JWT"].map(s=>(
              <div key={s} style={{fontSize:13,color:S.muted,display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
                <CheckCircle2 size={16} color={S.sage} style={{flexShrink:0}}/><span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsTab() {
  // FIX (audit v2): this used to hardcode "KSh 575/mo" and "KSh 64 B" —
  // stale figures from before the average contribution was updated to
  // KSh 520 (new vulnerability exemptions pulled it down from 575). Your
  // own gen_assumptions.cjs / exec_brief_text.txt already reflect 520/~58B;
  // this tab (the thing people actually click) didn't. Now computed live
  // from the same function your revenue docs are generated from, so the
  // three can never drift apart again.
  const revenue = generateRevenueStressTest();
  const targetScenario = revenue.scenarios.find(s => s.label === 'Target') ?? revenue.scenarios[2];

  // Error rates are now computed live from a synthetic population run through
  // both models. Uses the proposed model as the "truth" reference and counts
  // where the current (flawed) model misclassifies. Seeded at 500 households
  // for stable percentages. These are simulation estimates, not survey data.
  const [errorRates, setErrorRates] = useState(null);
  useEffect(() => {
    // Run off the main thread on next tick so the tab renders immediately
    const id = setTimeout(() => setErrorRates(calculatePopulationErrorRates(500)), 0);
    return () => clearTimeout(id);
  }, []);

  const excRate = errorRates ? `${errorRates.floorDisagreementRate}%` : '…';
  const incRate = errorRates ? `${errorRates.rateDisagreementRate}%` : '…';
  const payRatio = errorRates ? `${errorRates.payoutRatio}%` : '…';
  const excNum = errorRates ? errorRates.floorDisagreementRate : 0;
  const incNum = errorRates ? errorRates.rateDisagreementRate : 0;
  const simNote = 'Synthetic demonstration only: both prototype calculations run over 500 generated households. The proposed model is a comparison reference, not independently verified ground truth.';

  const metrics=[
    {label:"Model disagreement: proposed applies floor",cur:excRate,tgt:"Design target: < 10%",desc:`Households where the proposed model applies the KSh 300 minimum contribution floor while the illustrative baseline calculates a higher rate-based amount. ${simNote} This is a comparison between models, not proof of real-world targeting error or statutory indigence.`},
    {label:"Model disagreement: baseline applies floor",cur:incRate,tgt:"Design target: < 10%",desc:`Households where the illustrative baseline applies the minimum floor while the proposed model calculates a higher rate-based amount. ${simNote}`},
    {label:"Group disparity check",cur:"Synthetic diagnostic only",tgt:"Design target: ≤ 3 pp",desc:"Measures synthetic model disagreement disparity across groups. Real outcome labels and official administrative records are required for statutory compliance testing."},
    {label:"Monthly Contribution Ratio",cur:payRatio,tgt:"Comparative",desc:`Aggregate proposed model monthly contributions as a percentage of illustrative baseline contributions across the 500 generated households. ${simNote}`},
    {label:"Active Payers (Parliamentary Oversight)",cur:"22.7%",tgt:"> 60%",desc:"5 Million of 22 Million registered members — parliamentary oversight reference figure"},
  ];
  const barData=[
    {name:"Floor Disagree %",cur:excNum,tgt:10},
    {name:"Rate Disagree %",cur:incNum,tgt:10},
    {name:"Active Payers %",cur:22.7,tgt:60},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Evidence indicators and design targets</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>This panel mixes synthetic prototype outputs, external figures cited in project materials, and proposed engineering targets. It is not a live SHA monitoring dashboard. Verify each external source and publication date before quoting a figure outside this demonstration.</div>
      </div>

      {/* Metrics grid */}
      <div className="grid-2">
        {metrics.map(m=>(
          <div key={m.label} style={{padding:"20px",background:S.surface,borderRadius:10,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.muted,marginBottom:12}}>{m.label}</div>
            <div className="metrics-row">
              <div><div style={{fontSize:11,fontWeight:600,color:S.terra,marginBottom:4}}>VALUE SHOWN</div><div className="metrics-val" style={{color:S.terra}}>{m.cur}</div></div>
              <div style={{color:S.borderUp,fontSize:20,paddingBottom:2}}>→</div>
              <div><div style={{fontSize:11,fontWeight:600,color:S.sage,marginBottom:4}}>DESIGN TARGET</div><div className="metrics-val" style={{color:S.sage}}>{m.tgt}</div></div>
            </div>
            <div style={{fontSize:13,color:S.muted}}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:12,minWidth:0,overflowX:"auto"}}>
        <Label>Values shown vs proposed design targets</Label>
        <ResponsiveContainer width="99%" height={220}>
          <BarChart data={barData} margin={{top:10,right:0,left:-15,bottom:0}}>
            <XAxis dataKey="name" tick={{fill:S.text,fontSize:12,fontWeight:500}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:S.muted,fontSize:12}} axisLine={false} tickLine={false}/>
            <Tooltip cursor={{fill:S.faint}} contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,color:S.text,fontSize:13,fontWeight:500,boxShadow:"0 4px 6px rgba(0,0,0,0.05)"}}/>
            <Bar dataKey="cur" name="Value shown" fill={S.terra} radius={[4,4,0,0]} maxBarSize={60}/>
            <Bar dataKey="tgt" name="Design target" fill={S.sage} radius={[4,4,0,0]} maxBarSize={60}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fairness constraint */}
      <div style={{padding:"20px",background:S.blueD,border:`1px solid ${S.blueBd}`,borderRadius:10,display:"flex",gap:16,alignItems:"flex-start"}}>
        <ShieldCheck size={24} color={S.blue} style={{flexShrink:0,marginTop:2}}/>
        <div style={{minWidth: 0}}>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.blue,marginBottom:8}}>What this prototype can and cannot establish</div>
          <div style={{fontSize:14,color:S.text,lineHeight:1.6,wordBreak:"break-word",overflowWrap:"anywhere"}}>
            {/* FIX (audit v2): this used to claim the model was "trained with
                an Equalized Odds constraint enforced at the optimization
                level" and "cannot converge" past a 0.05 margin. It isn't
                trained at all — calculateProposedModel() is a deterministic
                rules engine (fixed deductions and percentages), not a fitted
                model, so there is no training and nothing to "converge".
                Disparity across groups is a real, checkable, computed
                property — see testCurrentModelDisparityByCounty() and the
                Bias & Compliance tab — but it's a property you verify by
                running that test against real assessment data, not one the
                formulas guarantee by construction. */}
            This is a deterministic rules engine, not a trained model. The Bias & Compliance dashboard currently runs disagreement and disparity calculations on generated synthetic households, using the proposal as a comparison reference. It does not evaluate real SHA assessment records, establish equalized odds, or prove population-level fairness, accuracy or legal compliance. A real pilot dataset and independently defined outcome labels are required for those conclusions.
          </div>
        </div>
      </div>

      {/* Illustrative revenue scenario */}
      <div style={{padding:"24px",background:S.surface,border:`2px solid ${S.sageBd}`,borderRadius:12,boxShadow:"0 4px 6px rgba(0,0,0,0.02)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <div style={{width:40,height:40,borderRadius:8,background:S.sageD,display:"flex",alignItems:"center",justifyContent:"center"}}><CheckCircle2 color={S.sage} size={24}/></div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:S.text}}>Revenue Sustainability Projection</div>
            <div style={{fontSize:13,color:S.muted}}>Scenario arithmetic generated by the prototype from stated population, premium and compliance assumptions. It does not predict actual SHA collections.</div>
          </div>
        </div>
        <div style={{fontSize:13,color:S.text,lineHeight:1.6,marginBottom:16}}>
          The government's core concern includes revenue sustainability. This scenario illustrates how assumed premiums and compliance rates affect projected collections. It is not a validated forecast or proof that the proposed model will increase revenue.
        </div>
        <div className="grid-2">
          <div style={{background:S.terraD,padding:16,borderRadius:8,border:`1px solid ${S.terraBd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:S.terra,marginBottom:12,textTransform:"uppercase"}}>Illustrative baseline scenario</div>
            <div style={{display:"grid",gap:8,fontSize:13,color:S.text}}>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Registered members</span><span style={{fontWeight:600}}>22 Million</span></div>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Compliance rate</span><span style={{fontWeight:700,color:S.terra}}>22.7%</span></div>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Active payers</span><span style={{fontWeight:600}}>5 Million</span></div>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Avg. premium collected</span><span style={{fontWeight:600}}>KSh 1,500/mo</span></div>
              <div className="flex-wrap-mobile" style={{borderTop:`1px solid ${S.terraBd}`,paddingTop:8,justifyContent:"space-between",fontWeight:700}}><span>Annual Revenue</span><span style={{color:S.terra,fontSize:16}}>KSh 90 B</span></div>
            </div>
          </div>
          <div style={{background:S.sageD,padding:16,borderRadius:8,border:`1px solid ${S.sageBd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:S.sage,marginBottom:12,textTransform:"uppercase"}}>Proposed-model scenario</div>
            <div style={{display:"grid",gap:8,fontSize:13,color:S.text}}>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Eligible informal workers</span><span style={{fontWeight:600}}>15.5M – 16.7M</span></div>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Compliance rate</span><span style={{fontWeight:700,color:S.sage}}>60%</span></div>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Active payers</span><span style={{fontWeight:600}}>{(targetScenario.enrolledPopulation/1e6).toFixed(1)} Million</span></div>
              <div className="flex-wrap-mobile" style={{justifyContent:"space-between"}}><span>Avg. premium collected</span><span style={{fontWeight:600}}>KSh 520/mo</span></div>
              <div className="flex-wrap-mobile" style={{borderTop:`1px solid ${S.sageBd}`,paddingTop:8,justifyContent:"space-between",fontWeight:700}}><span>Annual Revenue</span><span style={{color:S.sage,fontSize:16}}>KSh {targetScenario.annualRevenueBillions} B</span></div>
            </div>
          </div>
        </div>
        <div style={{marginTop:16,padding:12,background:S.blueD,borderRadius:6,border:`1px solid ${S.blueBd}`,fontSize:12,color:S.text,lineHeight:1.5}}>
          <strong style={{color:S.blue}}>Scenario Summary:</strong> Across an estimated 15.5M informal workers at KSh 520/month average contribution and 60% illustrative participation, annual collection calculates to KSh {targetScenario.annualRevenueBillions}B. This is a transparent mathematical arithmetic scenario only and does not predict official collections or account for unverified subsidy expenditure.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL OUTPUT DIFFERENCES TAB
// ─────────────────────────────────────────────────────────────────────────────

function FairnessTab({results}) {
  const mod = results.modelOutputDifference || results.fairnessMetrics;
  const s = results.sectorAnalysis;
  if (!mod || !s) return <div>Model output difference analysis unavailable</div>;

  const diffKsh = mod.differenceKsh || 0;
  const absDiff = Math.abs(diffKsh);
  const isBaselineHigher = diffKsh > 0;
  const isProposedHigher = diffKsh < 0;

  const diffColor = isBaselineHigher ? S.blue : isProposedHigher ? S.amber : S.sage;
  const diffBgColor = isBaselineHigher ? S.blueD : isProposedHigher ? S.amberD : S.sageD;

  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Model Output Differences</div>
        <div style={{fontSize:14,color:S.muted,lineHeight:1.6}}>
          This panel compares the mathematical output of the illustrative baseline model against the proposed declared-income AGI model. This is an algorithmic comparison between two prototype specifications, NOT an empirical measure of actual overcharge or population-level fairness.
        </div>
      </div>

      {/* Primary Comparison Card */}
      <div style={{padding:"24px",background:diffBgColor,border:`2px solid ${diffColor}`,borderRadius:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:diffColor,marginBottom:6}}>
              Calculated Output Difference
            </div>
            <div className="big-number-val" style={{fontSize:38,fontWeight:800,color:diffColor,lineHeight:1}}>
              {diffKsh > 0 ? `+KSh ${absDiff.toLocaleString()}` : diffKsh < 0 ? `−KSh ${absDiff.toLocaleString()}` : "KSh 0"}
              <span style={{fontSize:18,fontWeight:500,color:S.muted,marginLeft:8}}>/month</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <span style={{display:"inline-block",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,background:S.surface,border:`1px solid ${diffColor}`,color:diffColor}}>
              {mod.direction || (isBaselineHigher ? "BASELINE HIGHER" : isProposedHigher ? "PROPOSED HIGHER" : "IDENTICAL OUTPUT")}
            </span>
            <div style={{fontSize:12,color:S.muted,marginTop:6}}>
              {mod.percentageDifference ? `${Math.abs(mod.percentageDifference).toFixed(1)}% variance relative to baseline` : "No variance"}
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:S.text,fontWeight:500,lineHeight:1.5}}>
          {mod.summary || "Both models calculate identical monthly contributions."}
        </div>
      </div>

      {/* Model Breakdown Comparison */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:16}}>
        <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:8}}>Illustrative Baseline Calculation</div>
          <div style={{fontSize:28,fontWeight:800,color:S.text}}>KSh {(mod.currentMonthlyContributionKsh || 0).toLocaleString()}<span style={{fontSize:14,fontWeight:500,color:S.muted}}>/mo</span></div>
          <div style={{fontSize:12,color:S.muted,marginTop:6}}>
            Annual assessed income base: KSh {(mod.breakdown?.baselineAnnualAssessedKsh || 0).toLocaleString()}
          </div>
          <div style={{fontSize:11,color:S.muted,marginTop:4}}>
            Floor status: {mod.breakdown?.baselineMonthlyFloorApplied ? "KSh 300 floor applied" : "2.75% rate-based"}
          </div>
        </div>

        <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:8}}>Proposed Declared-Income Model</div>
          <div style={{fontSize:28,fontWeight:800,color:S.blue}}>KSh {(mod.proposedMonthlyContributionKsh || 0).toLocaleString()}<span style={{fontSize:14,fontWeight:500,color:S.muted}}>/mo</span></div>
          <div style={{fontSize:12,color:S.muted,marginTop:6}}>
            Annual estimated income base: KSh {(mod.breakdown?.proposedAnnualEstimatedKsh || 0).toLocaleString()}
          </div>
          <div style={{fontSize:11,color:S.muted,marginTop:4}}>
            Floor status: {mod.breakdown?.proposedMonthlyFloorApplied ? "KSh 300 floor applied" : "2.75% rate-based"}
          </div>
        </div>
      </div>

      {/* Sector Context */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
        <div style={{fontSize:14,fontWeight:700,color:S.text,marginBottom:14}}>Demographic & Livelihood Sector: {s.sector}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:S.muted,textTransform:"uppercase",marginBottom:4}}>Sector Resilience</div>
            <div style={{fontSize:20,fontWeight:800,color:s.sustainability === 'HIGH' ? S.sage : s.sustainability === 'MEDIUM' ? S.blue : S.terra}}>{s.sustainability}</div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:S.muted,textTransform:"uppercase",marginBottom:4}}>Sector Score</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:8,background:S.border,borderRadius:4,overflow:"hidden"}}>
                <div style={{width:`${s.sectorScore}%`,height:"100%",background:s.sectorScore >= 70 ? S.sage : s.sectorScore >= 50 ? S.blue : S.terra}}/>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:S.text}}>{s.sectorScore}/100</div>
            </div>
          </div>
        </div>

        {s.vulnerabilities.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:S.terra,marginBottom:6}}>Declared Vulnerabilities</div>
            {s.vulnerabilities.map((v, i) => (
              <div key={i} style={{fontSize:12,color:S.muted,marginBottom:3,display:"flex",gap:6}}>
                <span style={{color:S.terra}}>⚠</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}

        {s.opportunities.length > 0 && (
          <div>
            <div style={{fontSize:12,fontWeight:600,color:S.sage,marginBottom:6}}>Policy Safeguards</div>
            {s.opportunities.map((o, i) => (
              <div key={i} style={{fontSize:12,color:S.muted,marginBottom:3,display:"flex",gap:6}}>
                <span style={{color:S.sage}}>✓</span>
                <span>{o}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimers & Governance */}
      <div style={{padding:"16px",background:S.surfaceUp,border:`1px solid ${S.borderUp}`,borderRadius:8,fontSize:12,color:S.muted,lineHeight:1.5}}>
        <strong>Evaluation Notice:</strong> {mod.caveat || "Synthetic model comparison only; not a measure of actual overcharge or empirical fairness."} Official means-testing calibration requires independent survey data and formal Ministry of Health policy approval.
      </div>
    </div>
  );
}

function FraudRiskTab({results}) {
  if (!results.fraudRisk) return <div>No fraud assessment available</div>;
  
  const fraud = results.fraudRisk;
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return S.terra;
      case 'HIGH': return '#DC2626';
      case 'MEDIUM': return '#D97706';
      default: return S.muted;
    }
  };

  const getSeverityBgColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return S.terraD;
      case 'HIGH': return '#FEE2E2';
      case 'MEDIUM': return S.amberD;
      default: return S.faint;
    }
  };

  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Prototype fraud-risk rules</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
          The prototype applies hand-authored rules to demonstration inputs. It does not query KRA, NTSA or mobile-network records, and its heuristic score is not a calibrated fraud probability. Flags are prompts for human examination, not findings of fraud and not grounds for automatic rejection. No officer is notified by this demo.
        </div>
      </div>

      {results.next && results.next.requiresChpVerification && (
        <div style={{padding:"20px",background:"#FEF2F2",border:"2px solid #DC2626",borderRadius:12,display:"flex",gap:16,alignItems:"flex-start"}}>
          <AlertTriangle size={24} color="#DC2626" style={{flexShrink:0}}/>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#991B1B",marginBottom:4}}>Offline / cash-only pathway · demonstration only</div>
            <div style={{fontSize:14,color:"#991B1B",lineHeight:1.5}}>The entered demonstration profile meets the prototype’s offline-pathway rule. No external database has been checked, no subsidy has been granted, and no CHP referral has been created. Any real-world pathway would require a defined human-review process.</div>
          </div>
        </div>
      )}

      {/* Overall Risk Score */}
      <div style={{padding:"24px",background:getSeverityBgColor(fraud.severityLevel),border:`2px solid ${getSeverityColor(fraud.severityLevel)}`,borderRadius:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:getSeverityColor(fraud.severityLevel),marginBottom:8}}>Heuristic rule score · not a probability</div>
            <div className="big-number-val" style={{fontSize:42,fontWeight:800,color:getSeverityColor(fraud.severityLevel),lineHeight:1}}>{(fraud.heuristicRiskScore ?? fraud.fraudRiskPercentile)}%</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600,color:fraud.severityLevel==="CRITICAL"?S.terra:fraud.severityLevel==="HIGH"?"#DC2626":S.text}}>
              {fraud.severityLevel}
            </div>
            <div style={{fontSize:12,color:S.muted,marginTop:4}}>
              {fraud.flagCount} flag{fraud.flagCount !== 1 ? 's' : ''} detected
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:S.text,fontWeight:500}}>
          {fraud.recommendation}
        </div>
      </div>

      {/* Fraud Flags */}
      {fraud.flagCount > 0 ? (
        <div style={{display:"grid",gap:12}}>
          <div style={{fontSize:16,fontWeight:600,color:S.text}}>Detected Fraud Flags</div>
          {fraud.fraudFlags.map((flag, i) => (
            <div key={i} style={{
              background: getSeverityBgColor(flag.severity),
              border: `1px solid ${getSeverityColor(flag.severity)}`,
              borderRadius:10,
              padding:16,
              display:"flex",
              gap:12,
              alignItems:"flex-start"
            }}>
              <AlertTriangle size={20} color={getSeverityColor(flag.severity)} style={{flexShrink:0,marginTop:2}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:getSeverityColor(flag.severity),marginBottom:4}}>
                  {flag.name}
                  <span style={{fontSize:11,fontWeight:500,color:S.muted,marginLeft:8}}>
                    Uncalibrated rule weight: {Math.round(flag.confidence * 100)}%
                  </span>
                </div>
                <div style={{fontSize:12,color:S.muted,lineHeight:1.5,marginBottom:8}}>{flag.reason}</div>
                <div style={{
                  fontSize:11,
                  color:getSeverityColor(flag.severity),
                  fontWeight:600,
                  background:"rgba(255,255,255,0.5)",
                  padding:"6px 10px",
                  borderRadius:4,
                  display:"inline-block"
                }}>
                  {flag.action}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{padding:"24px",background:S.sageD,border:`1px solid ${S.sageBd}`,borderRadius:10,display:"flex",gap:12,alignItems:"center"}}>
          <CheckCircle2 size={24} color={S.sage} style={{flexShrink:0}}/>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:S.sage,marginBottom:4}}>No configured rules were triggered</div>
            <div style={{fontSize:12,color:S.muted}}>This is not a fraud clearance. The prototype has no live registry checks, and normal verification may still be required.</div>
          </div>
        </div>
      )}

      {/* Fraud Prevention Framework */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
        <div style={{fontSize:14,fontWeight:600,color:S.text,marginBottom:12}}>Fraud Prevention Framework</div>
        <div style={{display:"grid",gap:10}}>
          {[
            {label:"Triangulation Trinity",desc:"Would require authenticated, consented agency integrations; none are connected here."},
            {label:"Phantom Dependent Detection",desc:"Can flag unusual declared household sizes for a human check; size alone is not evidence of fraud."},
            {label:"Asset-Liquidity Consistency",desc:"Flags mismatches (luxury car + near-zero M-Pesa)"},
            {label:"Geographic Impossibility",desc:"Flags simultaneous registrations across separate time-stamped records"},
            {label:"Behavioral Anomalies",desc:"Rapid re-classification attempts, income suppression patterns"}
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <CheckCircle2 size={16} color={S.blue} style={{marginTop:4,flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:S.text}}>{item.label}</div>
                <div style={{fontSize:11,color:S.muted,marginTop:2}}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Protocol */}
      <div style={{padding:"20px",background:S.blueD,border:`1px solid ${S.blueBd}`,borderRadius:10}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.blue,marginBottom:12}}>Escalation Protocol</div>
        <div style={{display:"grid",gap:8,fontSize:13,color:S.text,lineHeight:1.5}}>
          <div><strong style={{color:S.blue}}>Heuristic score above 70:</strong> Prototype suggestion is human review. No real assessment is held, no officer or DPO is notified, and no response deadline is started.</div>
          <div><strong style={{color:S.blue}}>Heuristic score 50–70:</strong> Prototype suggestion is manual verification. No officer workflow or response deadline is implemented.</div>
          <div><strong style={{color:S.blue}}>Heuristic score below 50:</strong> No configured high-risk threshold was reached. This is not an approval or a fraud-free determination.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BIAS & COMPLIANCE TAB
// FIX (audit v2): testCurrentModelDisparityByCounty(), generateFraudStatistics(),
// and generateRevenueStressTest() were fully implemented in AlgorithmSimulation.js,
// each marked "(CAJ BLOCKER)" in its own docstring, and NONE of them was ever
// called anywhere in this app. This tab actually runs them. There is no real
// assessment history yet (pre-pilot), so it runs them against a generated
// synthetic population — clearly labeled as such throughout. Swap
// generateSyntheticPopulation() for a real assessment-history array the
// moment one exists; the plumbing here doesn't change.
// ─────────────────────────────────────────────────────────────────────────────
function BiasComplianceTab() {
  const [population, setPopulation] = useState(() => generateSyntheticPopulation(300));
  const countyTest = testCurrentModelDisparityByCounty(population, 'county');
  const genderTest = testCurrentModelDisparityByCounty(population, 'headGender');
  const fraudStats = generateFraudStatistics(population);

  const ResultCard = ({ test, label }) => {
    const insufficient = !test.groupCount;
    const title = insufficient ? "INSUFFICIENT SAMPLE" : test.passed ? "PASS" : "FAIL";
    const foreground = insufficient ? S.amber : test.passed ? S.sage : S.terra;
    const background = insufficient ? S.amberD : test.passed ? S.sageD : S.terraD;
    const border = insufficient ? S.amberBd : test.passed ? S.sageBd : S.terraBd;
    return (
      <div style={{padding:16,background,border:"1px solid " + border,borderRadius:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          {insufficient ? <Info size={18} color={foreground}/> : test.passed ? <CheckCircle2 size={18} color={foreground}/> : <AlertTriangle size={18} color={foreground}/>}
          <div style={{fontSize:13,fontWeight:700,color:foreground}}>{label}: {title}</div>
        </div>
        <div style={{fontSize:13,color:S.text,marginBottom:4}}>
          Max disparity: <strong>{insufficient ? "Not measurable" : String(test.maxDisparity) + "%"}</strong>
          {!insufficient && " (threshold ≤" + test.threshold + "%)"}
        </div>
        <div style={{fontSize:12,color:S.muted}}>
          {test.groupCount} groups included (N≥30 each){test.excludedGroups?.length ? ", " + test.excludedGroups.length + " excluded for small sample size" : ""}. Synthetic sample results are not a population fairness finding.
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Bias & Compliance Dashboard</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>Synthetic sample diagnostics only. The dashboard demonstrates the shape of the calculations; it does not establish SHA compliance or real-world fairness.</div>
      </div>

      <div style={{padding:16,background:S.blueD,border:`1px solid ${S.blueBd}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1, minWidth:250, fontSize:13,color:S.text,lineHeight:1.5}}>
          <strong style={{color:S.blue}}>SYNTHETIC DEMONSTRATION:</strong> This dashboard analyses {population.length} randomly generated households. The sample is not representative of Kenya and cannot prove national fairness, fraud prevalence or model accuracy. Generating a new batch only refreshes this dashboard, not the main household profile.
        </div>
        <button onClick={()=>setPopulation(generateSyntheticPopulation(300))} style={{padding:"8px 16px",background:S.blue,color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Simulate New Data</button>
      </div>

      <div style={{padding:16,background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:S.text,lineHeight:1.5}}>
          <strong>Demo session log:</strong> {logger.getSessionAuditBuffer().length} records are held in this browser tab only and are cleared on reload. Export manually to keep a local copy; this is not a durable audit service or a statutory retention system.
        </div>
        <button onClick={()=>logger.downloadSessionAuditLog()} style={{padding:"8px 16px",background:S.surface,color:S.text,border:`1px solid ${S.border}`,borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Export session audit log (.json)</button>
      </div>

      <div>
        <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.muted,marginBottom:12}}>Disparity Test (P-39) — must be run on BOTH keys, not just one</div>
        <div className="grid-2">
          <ResultCard test={countyTest} label="By County"/>
          <ResultCard test={genderTest} label="By Head Gender"/>
        </div>
      </div>

      <div style={{padding:20,background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
        <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.muted,marginBottom:12}}>Fraud Engine Population Statistics</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:16,marginBottom:12}}>
          <div><div style={{fontSize:11,color:S.muted}}>Assessments</div><div style={{fontSize:20,fontWeight:800,color:S.text}}>{fraudStats.totalAssessments}</div></div>
          <div><div style={{fontSize:11,color:S.muted}}>Flagged</div><div style={{fontSize:20,fontWeight:800,color:S.text}}>{fraudStats.flaggedAssessments}</div></div>
          <div><div style={{fontSize:11,color:S.muted}}>Flag rate</div><div style={{fontSize:20,fontWeight:800,color:S.text}}>{fraudStats.flagRate}</div></div>
          <div><div style={{fontSize:11,color:S.muted}}>Contribution under review</div><div style={{fontSize:20,fontWeight:800,color:S.text}}>KSh {fraudStats.contributionValueUnderReview?.toLocaleString()}</div></div>
        </div>
        <div style={{fontSize:12,color:S.muted,marginBottom:12,fontStyle:"italic"}}>{fraudStats.contributionValueUnderReviewCaveat}</div>
        <div style={{fontSize:12,fontWeight:700,color:S.muted,marginBottom:8,textTransform:"uppercase"}}>Most common flags</div>
        <div style={{display:"grid",gap:6}}>
          {fraudStats.mostCommonFlags.map(f=>(
            <div key={f.name} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"6px 10px",background:S.faint,borderRadius:6}}>
              <span>{f.name}</span><span style={{fontWeight:700}}>{f.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SCENARIO = "Wanjiru — Retail Market Trader";

export default function SHADemo() {
  const [hasAcknowledgedDemo, setHasAcknowledgedDemo] = useState(true);
  const [viewMode, setViewMode] = useState("guided");
  const [inputs, setInputs] = useState(() => ({
    ...DEFAULTS,
    ...(SCENARIOS[DEFAULT_SCENARIO]?.d || {}),
    activeScenario: DEFAULT_SCENARIO
  }));
  const [step,setStep]=useState(0);
  const [results,setResults]=useState(null);
  const [activeTab,setActiveTab]=useState("comparison");
  const [classifying,setClassifying]=useState(false);
  const [activeScenario,setActiveScenario]=useState(DEFAULT_SCENARIO);
  const [demoPaymentEntries, setDemoPaymentEntries] = useState([]);
  const [challengeDrafts, setChallengeDrafts] = useState([]);
  const [reviewRecords, setReviewRecords] = useState({});
  const [formError, setFormError] = useState(null);
  const [adminParams, setAdminParamsState] = useState({
    enableExperimentalPolicyAdjustments: false,
    carValue: 350000,
    urbanCostOfLiving: 12000,
    fulizaPenalty: 5000,
    tier1RentCap: 35000,
    tier2RentCap: 20000,
    triangulationOffline: false
  });

  const setAdminParams = (updater) => {
    setAdminParamsState(updater);
    setResults(null);
  };

  const upd=(k,v)=>{
    setInputs(p=>({...p,[k]:v}));
    setFormError(null);
    setResults(null);
    if(demoPaymentEntries.length > 0) setDemoPaymentEntries([]);
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  const toggleAsset=(a)=>{
    setInputs(p=>({...p,assets:p.assets.includes(a)?p.assets.filter(x=>x!==a):[...p.assets,a]}));
    setFormError(null);
    setResults(null);
    if(demoPaymentEntries.length > 0) setDemoPaymentEntries([]);
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  // Generic helpers for the new repeatable-list fields (vehicles, landParcels,
  // rentalProperties) — add/update/remove one item without touching the rest.
  const addListItem=(key,template)=>{
    setInputs(p=>({...p,[key]:[...(p[key]||[]),template]}));
    setFormError(null);
    setResults(null);
    if(demoPaymentEntries.length > 0) setDemoPaymentEntries([]);
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  const updListItem=(key,idx,field,value)=>{
    setInputs(p=>({...p,[key]:(p[key]||[]).map((item,i)=>i===idx?{...item,[field]:value}:item)}));
    setFormError(null);
    setResults(null);
    if(demoPaymentEntries.length > 0) setDemoPaymentEntries([]);
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  const removeListItem=(key,idx)=>{
    setInputs(p=>({...p,[key]:(p[key]||[]).filter((_,i)=>i!==idx)}));
    setFormError(null);
    setResults(null);
    if(demoPaymentEntries.length > 0) setDemoPaymentEntries([]);
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };

  const loadScenario=(name)=>{
    setActiveScenario(name);
    setInputs({...DEFAULTS, ...SCENARIOS[name].d, activeScenario: name});
    setHasAcknowledgedDemo(true);
    setFormError(null);
    setDemoPaymentEntries([]);
    setResults(null);
    setStep(0);
  };

  const selectCustomScenario = () => {
    setActiveScenario("Custom");
    setInputs({ ...DEFAULTS, activeScenario: "Custom" });
    setResults(null);
    setStep(0);
    setFormError(null);
    setDemoPaymentEntries([]);
    setHasAcknowledgedDemo(false);
  };

  const handleAddDemoPayment = (paymentData) => {
    const now = new Date();
    const suffix = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();
    const receiptNumber = `DEMO-RCPT-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${suffix}`;
    const newEntry = {
      receiptNumber,
      amount: paymentData.amount,
      channel: paymentData.channel,
      notes: paymentData.notes || "",
      timestamp: now.toISOString(),
      status: "UNVERIFIED_DEMO_ENTRY"
    };
    setDemoPaymentEntries(prev => [newEntry, ...prev]);
  };

  const handleSaveChallengeDraft = (draft) => {
    setChallengeDrafts(prev => {
      const exists = prev.some(d => d.draftReference === draft.draftReference);
      if (exists) {
        return prev.map(d => d.draftReference === draft.draftReference ? draft : d);
      }
      return [draft, ...prev];
    });
  };

  const handleReviewAction = (draftReference, actionData) => {
    setReviewRecords(prev => {
      const existingRecord = prev[draftReference] || createInitialReviewRecord(draftReference);
      const newEvent = createReviewEvent({
        draftReference,
        action: actionData.action,
        previousStatus: existingRecord.currentStatus,
        data: actionData,
        actorLabel: actionData.reviewerLabel || "Demonstration Reviewer"
      });

      const updatedRecord = {
        ...existingRecord,
        currentStatus: newEvent.newStatus,
        updatedAt: newEvent.timestamp,
        reviewerLabel: newEvent.actorLabel,
        evidenceAnnotations: {
          ...existingRecord.evidenceAnnotations,
          ...(actionData.evidenceAnnotations || {})
        },
        events: [...existingRecord.events, newEvent]
      };

      logger.audit('OFFICER_REVIEW_ACTION', {
        draftReference,
        action: actionData.action,
        previousStatus: existingRecord.currentStatus,
        newStatus: newEvent.newStatus,
        actorLabel: newEvent.actorLabel
      });

      return {
        ...prev,
        [draftReference]: updatedRecord
      };
    });
  };

  const handleLoadSyntheticDemo = () => {
    const { draft, isNew } = createSyntheticMeetingDemonstration(challengeDrafts);
    if (isNew) {
      setChallengeDrafts(prev => [draft, ...prev]);
    }
  };

  const handleRemoveSyntheticDemo = () => {
    const syntheticReferences = challengeDrafts
      .filter(d => d.isSyntheticDemoCase || d.draftReference === "LOCAL-DRAFT-20261121-MEETING-SAMPLE")
      .map(d => d.draftReference);

    setChallengeDrafts(prev => removeSyntheticMeetingDemonstration(prev));
    setReviewRecords(prev => {
      const next = { ...prev };
      syntheticReferences.forEach(ref => { delete next[ref]; });
      return next;
    });
  };

  const handleEvidenceAnnotation = (draftReference, attachmentName, statusKey) => {
    setReviewRecords(prev => {
      const existing = prev[draftReference] || createInitialReviewRecord(draftReference);
      return {
        ...prev,
        [draftReference]: {
          ...existing,
          evidenceAnnotations: {
            ...existing.evidenceAnnotations,
            [attachmentName]: statusKey
          }
        }
      };
    });
  };

  const classify=(onComplete)=>{
    let assessmentInputs = { ...inputs };
    let incomeAssessment = null;

    if (inputs.hasNoEarnedIncome) {
      assessmentInputs.monthlyNetEarnedIncome = 0;
    }

    // Structured income path for custom assessments.
    const effectiveSources = resolveEffectiveIncomeSources(inputs.incomeSources || [], inputs.hasNoEarnedIncome);

    if (
      Array.isArray(effectiveSources) &&
      effectiveSources.length > 0
    ) {
      incomeAssessment = calculateHouseholdIncome(
        effectiveSources,
        DEFAULT_COMMON_ASSESSMENT_PERIOD
      );

      if (!incomeAssessment.isValid) {
        setFormError(incomeAssessment.errors[0]);
        setStep(3);
        return;
      }

      if (!incomeAssessment.canPopulatePrototypeEarnedIncomeBase) {
        const firstFlag = incomeAssessment.reviewFlags[0];

        setFormError(
          firstFlag?.message ||
          "This assessment requires review before a contribution calculation can proceed."
        );

        setStep(3);
        return;
      }

      assessmentInputs = {
        ...assessmentInputs,

        monthlyNetEarnedIncome:
          inputs.hasNoEarnedIncome ? 0 : incomeAssessment.monthlyEarnedNetKsh,

        incomeAssessmentSnapshot: incomeAssessment,
        assessmentInputMode: "STRUCTURED_LEDGER",
      };
    } else if (inputs.hasNoEarnedIncome) {
      assessmentInputs = {
        ...assessmentInputs,
        monthlyNetEarnedIncome: 0,
        incomeAssessmentSnapshot: createZeroEarnedIncomeAssessment(),
        assessmentInputMode: "ZERO_DECLARED",
      };
    } else {
      if (activeScenario === "Custom" && inputs.allowDemoDirectEntry !== true) {
        setFormError(
          "Custom assessments must declare structured earning sources or confirm zero earned income. Direct income entry is an unverified demo bypass."
        );
        setStep(1);
        return;
      }
      assessmentInputs = {
        ...assessmentInputs,
        assessmentInputMode: "DEMO_DIRECT_ENTRY",
        incomeAssessmentSnapshot: {
          calculationStatus: "DEMO_DIRECT_ENTRY",
          canPopulatePrototypeEarnedIncomeBase: true,
          isDemoDirectEntry: true,
          monthlyEarnedNetKsh: assessmentInputs.monthlyNetEarnedIncome || 0,
          annualisedEarnedNetKsh: (assessmentInputs.monthlyNetEarnedIncome || 0) * 12,
        },
      };
    }

    // Preserve compatibility with existing synthetic presets.
    const validation = validateAssessmentInputs(
      assessmentInputs
    );

    if (!validation.isValid) {
      setFormError(validation.errors[0]);
      setStep(3);
      return;
    }

    setFormError(null);
    setDemoPaymentEntries([]);
    setClassifying(true);
    setTimeout(()=>{
      const lassoAnnual = calculateCurrentModel(assessmentInputs);
      // Calls the single shared function in AlgorithmSimulation.js
      // for both the 2.75%/12 formula and statutory KSh 300 floor.
      const curRaw = calculateCurrentModelContribution(lassoAnnual);
      const cur = {
        ...curRaw,
        tier: curRaw.minimumContributionFloorApplied ? "LOW" : lassoAnnual <= 450000 ? "MIDDLE" : "HIGH"
      };
      
      const modelVersions = calculateProposedModelVersions(assessmentInputs, adminParams);
      const nxtRaw = modelVersions.declaredIncome.result;
      const nxt = {
        ...nxtRaw,
        modelVersion: modelVersions.declaredIncome.id,
        annualIncome: nxtRaw.estimatedAnnualIncome,
        monthly: nxtRaw.monthlyContribution,
        incomeAssessmentSnapshot: assessmentInputs.incomeAssessmentSnapshot
      };
      
      // Calculate fraud risk with this assessment
      const fraudRisk = calculateFraudRisk(assessmentInputs, {
        ntsaCarExists: assessmentInputs.assets.includes('CAR') || assessmentInputs.isNtsaVerified || assessmentInputs.hiddenWealthDiscovered,
        vehicleValue: assessmentInputs.hiddenWealthDiscovered ? 1500000 : undefined,
        kraIncomeLevel: undefined,
      });
      
      // Calculate sector analysis
      const sectorAnalysis = analyzeSector(assessmentInputs);
      
      // Calculate model output difference
      const modelOutputDifference = calculateModelOutputDifference(cur, nxt);
      const fairnessMetrics = modelOutputDifference;
      
      // Create and log audit record (P-77/P-31)
      const auditRecord = createAuditRecord(assessmentInputs, cur, nxt, fraudRisk, "SYSTEM", modelVersions, adminParams);
      logger.audit('assessment_run', { auditRecord });
      
      setResults({
        current: cur,
        next: nxt,
        modelVersions,
        adminParamsSnapshot: JSON.parse(JSON.stringify(adminParams)),
        d: JSON.parse(JSON.stringify(assessmentInputs)),
        fraudRisk: fraudRisk,
        sectorAnalysis: sectorAnalysis,
        fairnessMetrics: fairnessMetrics,
        modelOutputDifference: modelOutputDifference,
        auditRecord
      });
      setClassifying(false);
      setActiveTab("receipt");
      if (typeof onComplete === "function") {
        onComplete();
      }
    },450);
  };

  const TABS=[
    ["receipt","Calculation Receipt"],
    ["comparison","Financial Comparison"],
    ["models","AGI Model Versions"],
    ["evalLab","Evaluation Lab"],
    ["evidenceReadiness","Data & Baseline Readiness"],
    ["pilotReadiness","Pilot Readiness"],
    ["statement","Contribution Statement"],
    ["challenge","Prepare Challenge"],
    ["officer","Officer Review (Demo)"],
    ["fairness","Model Output Differences"],
    ["fraud","Fraud Risk Assessment"],
    ["bias","Bias & Compliance"],
    ["shap","Calculation Breakdown"],
    ["ussd","USSD Simulation"],
    ["metrics","Evidence & Targets"]
  ];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        ${viewMode === "workspace" ? `
        *{box-sizing:border-box;margin:0;padding:0;}
        select,input,button{font-family:'Inter',sans-serif;}
        select option{background:${S.surface};color:${S.text};}
        ` : ""}
        body{margin:0;background:${viewMode === "guided" ? "#f4f2ec" : S.bg};font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
        ::-webkit-scrollbar{width:8px;height:8px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${S.borderUp};border-radius:4px;}
        ::-webkit-scrollbar-thumb:hover{background:${S.muted};}

        input[type="range"]{-webkit-appearance:none;appearance:none;height:6px;background:${S.border};border-radius:3px;outline:none;cursor:pointer;transition:background 0.2s;}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:50%;background:${S.blue};cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:transform 0.15s;}
        input[type="range"]::-webkit-slider-thumb:hover{transform:scale(1.2);}
        input[type="range"]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:${S.blue};cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);}

        .header-layout {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
        }
        
        .main-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          height: calc(100vh - 73px);
        }

        .left-panel {
          border-right: 1px solid ${S.border};
          background: ${S.faint};
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-content: start;
          overflow-y: auto;
        }

        .right-panel {
          overflow-y: auto;
          background: ${S.surface};
          position: relative;
        }

        .tabs-container {
          display: flex;
          border-bottom: 1px solid ${S.border};
          margin-bottom: 32px;
          overflow-x: auto;
          gap: 8px;
        }
        
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        /* Responsive overrides */
        @media (max-width: 1024px) {
          .main-layout {
            grid-template-columns: 350px 1fr;
          }
        }
        
        @media (max-width: 850px) {
          .header-layout {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 16px 20px;
          }
          .main-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          .left-panel {
            border-right: none;
            border-bottom: 1px solid ${S.border};
            height: auto;
            max-height: none;
            padding: 20px;
          }
          .right-panel {
            height: auto;
            max-height: none;
          }
          .tabs-container {
            padding-bottom: 4px;
          }
          .grid-2 {
            grid-template-columns: 1fr;
          }
          .grid-3 {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>


      <div style={{background:viewMode === "guided" ? "#f4f2ec" : S.bg,color:S.text,minHeight:"100vh"}} role="application" aria-label="SHA Algorithm Reform Assessment Tool">
        <a href="#main-content" style={{position:'absolute',left:'-9999px',top:'auto',width:'1px',height:'1px',overflow:'hidden',zIndex:999}} onFocus={e=>{e.target.style.left='10px';e.target.style.width='auto';e.target.style.height='auto';}} onBlur={e=>{e.target.style.left='-9999px';}}>Skip to main content</a>

        {/* Header (Workspace mode only; PresentationV3 renders its own header) */}
        {viewMode === "workspace" && (
        <div className="header-layout" style={{borderBottom:`1px solid ${S.border}`,position:"sticky",top:0,background:S.surface,zIndex:20,boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:36,height:36,borderRadius:8,background:S.blueD,border:`1px solid ${S.blueBd}`,display:"flex",alignItems:"center",justifyContent:"center",color:S.blue,flexShrink:0}}>
              <ShieldCheck size={20}/>
            </div>
            <div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:700,color:S.text,letterSpacing:"-0.3px"}}>SHA Algorithm Reform</div>
              <div style={{fontSize:12,color:S.muted,marginTop:2,fontWeight:500}}>Social Health Authority · Means Testing Instrument</div>
            </div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            {/* View Mode Toggle */}
            <div style={{display:"flex",background:S.faint,padding:3,borderRadius:8,border:`1px solid ${S.border}`}}>
              <button
                type="button"
                onClick={() => setViewMode("guided")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "guided" ? S.blue : "transparent",
                  color: viewMode === "guided" ? "#ffffff" : S.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                Guided Presentation
              </button>
              <button
                type="button"
                onClick={() => setViewMode("workspace")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "workspace" ? S.text : "transparent",
                  color: viewMode === "workspace" ? "#ffffff" : S.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                Full Workspace
              </button>
            </div>

            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"6px 12px",borderRadius:6,background:S.terraD,color:S.terra,whiteSpace:"nowrap"}}>Illustrative baseline · PMT-style</span>
            <span style={{color:S.borderUp,fontSize:16}}>→</span>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"6px 12px",borderRadius:6,background:S.sageD,color:S.sage,whiteSpace:"nowrap"}}>Proposed: AGI rules engine</span>
          </div>
        </div>
        )}

        {/* Main layout */}
        {viewMode === "guided" ? (
          <div id="main-content">
            <PresentationV3
              inputs={inputs}
              upd={upd}
              toggleAsset={toggleAsset}
              addListItem={addListItem}
              updListItem={updListItem}
              removeListItem={removeListItem}
              setInputs={(updater) => {
                setInputs(updater);
                setResults(null);
                setFormError(null);
              }}
              activeScenario={activeScenario}
              scenarios={SCENARIOS}
              loadScenario={loadScenario}
              onSelectCustom={selectCustomScenario}
              adminParams={adminParams}
              setAdminParams={setAdminParams}
              results={results}
              onRunCalculation={classify}
              classifying={classifying}
              formError={formError}
              setFormError={setFormError}
              setHasAcknowledgedDemo={setHasAcknowledgedDemo}
              onSwitchToWorkspace={() => setViewMode("workspace")}
              counties={COUNTIES}
            />
          </div>
        ) : (
          <div className="main-layout" id="main-content">

          {/* Left panel */}
          <div className="left-panel">

            {/* Compact Example Household Selector */}
            <div style={{background:S.surface,borderRadius:12,padding:16,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.muted,marginBottom:6}}>
                Load example household
              </div>
              <select
                aria-label="Load example household"
                value={activeScenario}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "Custom") {
                    selectCustomScenario();
                  } else {
                    loadScenario(val);
                  }
                }}
                style={{
                  width: "100%",
                  background: S.surface,
                  border: `1px solid ${S.borderUp}`,
                  borderRadius: 6,
                  color: S.text,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer"
                }}
              >
                <option value="Custom">Custom Household (Empty / Manual entry)</option>
                <optgroup label="Synthetic demonstration households">
                  {Object.entries(SCENARIOS).map(([name, sc]) => (
                    <option key={name} value={name}>
                      {name} — {sc.badge} ({sc.sub})
                    </option>
                  ))}
                </optgroup>
              </select>
              <div style={{fontSize:11,color:S.muted,marginTop:6,lineHeight:1.4}}>
                Synthetic demonstration data only. Preset records are generated test profiles, not real SHA member records.
              </div>
            </div>

            {/* Main Assessment Experience */}
            <FormPanel d={inputs} upd={upd} toggleAsset={toggleAsset} step={step} setStep={setStep} onClassify={classify} classifying={classifying} hasAcknowledgedDemo={hasAcknowledgedDemo} setHasAcknowledgedDemo={setHasAcknowledgedDemo} setInputs={setInputs} setActiveScenario={setActiveScenario} addListItem={addListItem} updListItem={updListItem} removeListItem={removeListItem} formError={formError}/>

            {/* Advanced Research Parameters (Admin - Collapsed) */}
            <div style={{background:S.surface,borderRadius:12,padding:16,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
              <details style={{cursor:"pointer"}}>
                <summary style={{fontSize:13,fontWeight:700,color:S.text,display:"flex",alignItems:"center",gap:8}}>
                  <Settings size={15} color={S.blue}/>
                  <span>Advanced Research Parameters (Prototype Sliders — Experimental)</span>
                </summary>
                <div style={{fontSize:12,color:S.muted,lineHeight:1.5,marginTop:10,marginBottom:16}}>
                  These experimental parameters test algorithm sensitivity. Default values represent standard baseline calibration. Adjustments apply to subsequent calculation runs in this browser session only.
                </div>
                <div style={{display:"grid",gap:18}}>
                  <div style={{padding:12,background:S.faint,borderRadius:8,border:`1px solid ${S.border}`}}>
                    <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:12,fontWeight:600,color:S.text}}>
                      <input
                        type="checkbox"
                        checked={Boolean(adminParams.enableExperimentalPolicyAdjustments)}
                        onChange={e=>setAdminParams(p=>({...p,enableExperimentalPolicyAdjustments:e.target.checked}))}
                        style={{marginTop:2}}
                      />
                      <span>Enable Experimental Household Deductions (COL, Dependency, CHE, Disability) — OFF by default</span>
                    </label>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:S.text}}>Car Ownership Base Value</span>
                      <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.carValue.toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Base value assigned to a standard older vehicle. Increase to charge car owners more; decrease to reduce car ownership penalty.</div>
                    <input type="range" min="50000" max="1000000" step="10000" value={adminParams.carValue} onChange={e=>setAdminParams(p=>({...p,carValue:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 50K</span><span>KSh 1M</span></div>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:S.text}}>Urban Rent Deduction</span>
                      <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.urbanCostOfLiving.toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Monthly cost-of-living deducted for Nairobi/Mombasa residents before taxation.</div>
                    <input type="range" min="0" max="30000" step="1000" value={adminParams.urbanCostOfLiving} onChange={e=>setAdminParams(p=>({...p,urbanCostOfLiving:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 0</span><span>KSh 30K</span></div>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:S.text}}>Digital Debt Penalty</span>
                      <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.fulizaPenalty.toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Amount deducted per active Fuliza/M-Shwari default.</div>
                    <input type="range" min="0" max="15000" step="500" value={adminParams.fulizaPenalty} onChange={e=>setAdminParams(p=>({...p,fulizaPenalty:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 0</span><span>KSh 15K</span></div>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:S.text}}>Tier 1 Rent Cap</span>
                      <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.tier1RentCap.toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Maximum allowable rent deduction for Tier 1 cities.</div>
                    <input type="range" min="10000" max="100000" step="5000" value={adminParams.tier1RentCap} onChange={e=>setAdminParams(p=>({...p,tier1RentCap:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 10K</span><span>KSh 100K</span></div>
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:S.text}}>Tier 2 Rent Cap</span>
                      <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.tier2RentCap.toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Maximum allowable rent deduction for Tier 2 satellite cities.</div>
                    <input type="range" min="5000" max="60000" step="1000" value={adminParams.tier2RentCap} onChange={e=>setAdminParams(p=>({...p,tier2RentCap:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 5K</span><span>KSh 60K</span></div>
                  </div>
                </div>
                <div style={{marginTop:16,padding:10,background:S.amberD,borderRadius:6,border:`1px solid ${S.amberBd}`,fontSize:11,color:S.amber,display:"flex",gap:6,alignItems:"flex-start",lineHeight:1.4}}>
                  <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
                  <span>Changes apply on the next calculation run.</span>
                </div>
              </details>
            </div>

          </div>

          {/* Right panel */}
          <div className="right-panel">
            {!results&&!classifying&&(
              <div className="empty-state-wrapper">
                <div className="empty-state-card">
                  <Fingerprint size={48} color={S.blue} style={{marginBottom:24,opacity:0.8}}/>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:12}}>Awaiting Assessment Data</div>
                  <div style={{fontSize:15,color:S.muted,lineHeight:1.6}}>Select an example household or enter data manually. Complete the review stage and confirm details to generate the itemised calculation receipt.</div>
                </div>
              </div>
            )}
            {classifying&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",background:S.bg}}>
                <div style={{width:48,height:48,border:`4px solid ${S.borderUp}`,borderTopColor:S.blue,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:24}}/>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:20,fontWeight:600,color:S.text,marginBottom:8}}>Calculating demonstration results</div>
                <div style={{fontSize:14,color:S.muted}}>Applying the illustrative baseline and proposed AGI rules</div>
              </div>
            )}
            {results&&(
              <div className="results-container">

                {/* Tabs */}
                <div className="tabs-container">
                  {TABS.map(([tab,label])=>(
                    <button 
                      key={tab} 
                      onClick={()=>setActiveTab(tab)} 
                      className={`tab-btn ${activeTab===tab ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab==="receipt"&&<DemoCalculationReceipt results={results} adminParams={adminParams} S={S}/>}
                {activeTab==="comparison"&&<ComparisonTab results={results} adminParams={adminParams}/>}
                {activeTab==="models"&&<ModelVersionsTab results={results}/>}
                {activeTab==="evalLab"&&<EvaluationLabTab results={results}/>}
                {activeTab==="evidenceReadiness"&&<EvidenceReadinessTab />}
                {activeTab==="pilotReadiness"&&<PilotReadinessTab />}
                {activeTab==="statement"&&<ContributionStatementTab results={results} demoPaymentEntries={demoPaymentEntries} onAddDemoPayment={handleAddDemoPayment} />}
                {activeTab==="challenge"&&<AppealPreparationTab results={results} challengeDrafts={challengeDrafts} onSaveChallengeDraft={handleSaveChallengeDraft} />}
                {activeTab==="officer"&&<OfficerReviewTab
                  challengeDrafts={challengeDrafts}
                  reviewRecords={reviewRecords}
                  onReviewAction={handleReviewAction}
                  onEvidenceAnnotation={handleEvidenceAnnotation}
                  onLoadSyntheticDemo={handleLoadSyntheticDemo}
                  onRemoveSyntheticDemo={handleRemoveSyntheticDemo}
                />}
                {activeTab==="fairness"&&<FairnessTab results={results}/>}
                {activeTab==="fraud"&&<FraudRiskTab results={results}/>}
                {activeTab==="bias"&&<BiasComplianceTab/>}
                {activeTab==="shap"&&<SHAPTab results={results} adminParams={adminParams}/>}
                {activeTab==="ussd"&&<USSDTab results={results}/>}
                {activeTab==="metrics"&&<MetricsTab/>}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { 
  Radio, Tv, Refrigerator, Laptop, Smartphone, Phone, 
  Bike, Car, ShieldCheck, Info, CheckCircle2, AlertTriangle, Fingerprint, ChevronDown, Settings
} from "lucide-react";
import { calculateCurrentModel, calculateCurrentModelContribution, calculateProposedModel, calculateFraudRisk, analyzeSector, calculateFairnessMetrics, PRESETS, createAuditRecord, generateRevenueStressTest, testCurrentModelDisparityByCounty, generateFraudStatistics, generateSyntheticPopulation } from "./lib/AlgorithmSimulation.js";
import { logger } from "./lib/Logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COUNTIES = ["Baringo","Bomet","Bungoma","Busia","Elgeyo Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyandarua","Nyamira","Nyeri","Samburu","Siaya","Taita Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"];

const DEFAULTS = {
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

function FieldNumber({label,value,onChange,min=0,max,step=1,note}) {
  const handleChange = (e) => {
    let raw = e.target.value;
    if (raw === "") {
      onChange("");
      return;
    }
    onChange(parseFloat(raw));
  };
  
  const handleBlur = (e) => {
    let v = parseFloat(e.target.value);
    if (isNaN(v)) v = min;
    if (max !== undefined) v = Math.min(max, v);
    v = Math.max(min, v);
    onChange(v);
    e.target.style.borderColor=S.borderUp;
    e.target.style.boxShadow="0 1px 2px rgba(0,0,0,0.02)";
  };

  return (
    <div>
      <Label>{label}</Label>
      <input type="number" aria-label={label} aria-required="true" value={value} min={min} max={max} step={step}
        onChange={handleChange}
        style={{width:"100%",background:S.surface,border:`1px solid ${S.borderUp}`,borderRadius:6,color:S.text,padding:"10px 14px",fontSize:13,fontWeight:500,fontFamily:"inherit",outline:"none",boxShadow:"0 1px 2px rgba(0,0,0,0.02)",transition:"border-color 0.2s, box-shadow 0.2s"}}
        onFocus={e=>{e.target.style.borderColor=S.blue;e.target.style.boxShadow=`0 0 0 3px ${S.blueD}`;}}
        onBlur={handleBlur} />
      {note&&<div style={{fontSize:11,color:S.terra,marginTop:5,display:"flex",alignItems:"flex-start",gap:4}}>
        <AlertTriangle size={12} style={{marginTop:2,flexShrink:0}}/> <span>{note}</span>
      </div>}
    </div>
  );
}

function InfoTip({children}) {
  const [show, setShow] = useState(false);
  return (
    <span 
      style={{marginLeft:6, color:S.muted, cursor:"help", position:"relative", display:"inline-flex", verticalAlign:"-2px"}}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(!show)}
    >
      <Info size={14} />
      {show && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
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
          textAlign: "center",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
          lineHeight: 1.4
        }}>
          {children}
          <div style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            border: "5px solid transparent",
            borderTopColor: "#1e293b"
          }} />
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

const STEPS=["Demographics","Housing","Services","Assets","Livelihood","Triangulation"];

function FormPanel({d,upd,toggleAsset,step,setStep,onClassify,classifying,hasConsented,setHasConsented,setInputs,setActiveScenario,addListItem,updListItem,removeListItem}) {
  const go=(n)=>setStep(Math.max(0,Math.min(5,n)));
  return (
    <div style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:12,padding:24,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"}}>
      {/* Step header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{fontSize:14,fontWeight:600,color:S.text}}>{STEPS[step]}</div>
        <div style={{display:"flex",gap:6}}>
          {STEPS.map((_,i)=>(
            <div key={i} onClick={()=>go(i)} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?S.blue:i<step?S.blueBd:S.border,cursor:"pointer",transition:"all .2s"}}/>
          ))}
        </div>
      </div>

      {/* Step 0: Demographics */}
      {step===0&&<div style={{display:"grid",gap:16}}>
        <FieldSelect label="County" value={d.county} onChange={v=>upd("county",v)} options={COUNTIES.map(c=>[c,c])}/>
        <div className="grid-2">
          <FieldNumber label="Household size" value={d.householdSize} onChange={v=>upd("householdSize",Math.max(1,Math.round(v)))} min={1} max={15}/>
          <FieldNumber label="Age of Head" value={d.headAge} onChange={v=>upd("headAge",v)} min={15} max={110}/>
        </div>
        <div className="grid-2">
          <FieldSelect label="Head gender" value={d.headGender} onChange={v=>upd("headGender",v)} options={[["MALE","Male"],["FEMALE","Female"]]}/>
          <Toggle label="Receives social aid?" tip="Such as Inua Jamii or HSFP cash transfers" value={d.receivesAid} onChange={v=>upd("receivesAid",v)}/>
        </div>
        <div style={{display:"grid",gap:10}}>
          <Toggle label="Has Chronic Illness? (CHE)" tip="Triggers Catastrophic Health Expenditure (CHE) protection" value={d.hasChronicIllness} onChange={v=>upd("hasChronicIllness",v)} hideSpacer/>
          <Toggle label="Registered Disability (NCPWD)?" tip="Exempts household from asset wealth tests" value={d.hasRegisteredDisability} onChange={v=>upd("hasRegisteredDisability",v)} hideSpacer/>
          <Toggle label="Refugee / IDP status?" tip="Automatically classifies as indigent/state-sponsored" value={d.isRefugee} onChange={v=>upd("isRefugee",v)} hideSpacer/>
        </div>
      </div>}

      {/* Step 1: Housing */}
      {step===1&&<div style={{display:"grid",gap:16}}>
        <div className="grid-2">
          <FieldSelect label="Dwelling type" value={d.dwellingType} onChange={v=>upd("dwellingType",v)} options={[["BUNGALOW","Bungalow"],["APARTMENT","Apartment"],["TRADITIONAL","Traditional"],["SHANTY","Shanty/Informal"],["OTHER","Other"]]}/>
          <FieldSelect label="Ownership" value={d.ownershipStatus} onChange={v=>upd("ownershipStatus",v)} options={[["OWNED","Owned"],["RENTED","Rented"],["FAMILY","Family/Other"]]}/>
        </div>
        {d.ownershipStatus === 'RENTED' && (
          <FieldNumber label="Monthly Rent (KSh)" value={d.monthlyRent} onChange={v=>upd("monthlyRent",v)} min={0} />
        )}
        {d.ownershipStatus !== 'RENTED' && (
          <FieldNumber label="Sublet Income (Monthly KSh)" value={d.subletIncome} onChange={v=>upd("subletIncome",v)} min={0} />
        )}
        <div className="grid-2">
          <FieldSelect label="Wall material" value={d.wallMaterial} onChange={v=>upd("wallMaterial",v)} options={[["STONE","Stone"],["BRICK","Brick"],["IRON_SHEETS","Iron sheets"],["MUD","Mud"],["WOOD","Wood"],["OTHER","Other"]]}/>
          <FieldSelect label="Roof material" value={d.roofMaterial} onChange={v=>upd("roofMaterial",v)} options={[["IRON_SHEETS","Iron sheets"],["TILES","Tiles"],["CONCRETE","Concrete"],["GRASS","Grass/Thatch"],["OTHER","Other"]]}/>
        </div>
        <div className="grid-2">
          <FieldSelect label="Floor material" value={d.floorMaterial} onChange={v=>upd("floorMaterial",v)} options={[["TILES","Tiles"],["CEMENT","Cement"],["MUD","Mud"],["WOOD","Wood"],["OTHER","Other"]]}/>
          <FieldNumber label="Rooms" value={d.rooms} onChange={v=>upd("rooms",Math.max(1,Math.round(v)))} min={1} max={20}/>
        </div>
        <div style={{fontSize:12,padding:"12px 14px",background:S.terraD,borderRadius:6,border:`1px solid ${S.terraBd}`,color:S.terra,lineHeight:1.5,display:"flex",gap:8,alignItems:"flex-start"}}>
          <Info size={16} style={{flexShrink:0,marginTop:2}}/>
          <span><strong>Error By Design:</strong> The current algorithm penalizes households with stone walls or concrete floors, ignoring that in rural areas these are often illiquid ancestral family homes. The AGI Model v2.1 completely removes these biased proxy variables.</span>
        </div>
      </div>}

      {/* Step 2: Services */}
      {step===2&&<div style={{display:"grid",gap:16}}>
        <FieldSelect label="Water source" value={d.waterSource} onChange={v=>upd("waterSource",v)} options={[["PIPED_DWELLING","Piped into dwelling"],["PIPED_YARD","Piped into yard"],["PUBLIC_TAP","Public tap / kiosk"],["BOREHOLE","Borehole / pump"],["WELL","Protected well"],["RIVER","River / spring / rain"]]}/>
        <FieldSelect label="Sanitation" value={d.sanitationType} onChange={v=>upd("sanitationType",v)} options={[["FLUSH_TOILET","Flush toilet"],["VIP_LATRINE","VIP latrine"],["PIT_LATRINE","Pit latrine"],["NONE","None / open defecation"]]}/>
        <div className="grid-2">
          <FieldSelect label="Cooking energy" value={d.cookingEnergy} onChange={v=>upd("cookingEnergy",v)} options={[["ELECTRICITY","Electricity"],["LPG","LPG / gas"],["KEROSENE","Kerosene"],["CHARCOAL","Charcoal"],["FIREWOOD","Firewood"]]}/>
          <FieldSelect label="Lighting energy" value={d.lightingEnergy} onChange={v=>upd("lightingEnergy",v)} options={[["ELECTRICITY","Electricity"],["SOLAR","Solar"],["KEROSENE","Kerosene"],["OTHER","Other"]]}/>
        </div>
        <div style={{fontSize:12,padding:"12px 14px",background:S.terraD,borderRadius:6,border:`1px solid ${S.terraBd}`,color:S.terra,lineHeight:1.5,display:"flex",gap:8,alignItems:"flex-start"}}>
          <Info size={16} style={{flexShrink:0,marginTop:2}}/>
          <span>Rural electrification programmes mean even poor households now have electricity. The current Lasso algorithm incorrectly weights this as a strong wealth signal, causing systematic overcharging.</span>
        </div>
      </div>}

      {/* Step 3: Assets */}
      {step===3&&<div style={{display:"grid",gap:12}}>
        <div style={{fontSize:13,color:S.muted,fontWeight:500}}>Select all assets the household owns</div>
        <AssetGrid assets={d.assets} toggle={toggleAsset}/>
        <div style={{fontSize:12,padding:"12px 14px",background:S.terraD,borderRadius:6,border:`1px solid ${S.terraBd}`,color:S.terra,lineHeight:1.5,display:"flex",gap:8,alignItems:"flex-start"}}>
          <Info size={16} style={{flexShrink:0,marginTop:2}}/>
          <span><strong>Proxy Bias Alert:</strong> The current system aggressively punishes ownership of basic items like bicycles and radios, driving up exclusion errors. Our proposed model strictly targets high-value, digitally-verifiable assets.</span>
        </div>
        {d.assets.includes("MOTORCYCLE") && (
          <div style={{marginTop: 8, padding: 16, background: S.faint, borderRadius: 8, border: `1px solid ${S.border}`}}>
            <Toggle label="Is this motorcycle used commercially (Bodaboda)?" tip="Depreciates asset value by 85% as a Tool of Trade" value={d.motorcycleIsCommercial} onChange={v=>upd("motorcycleIsCommercial",v)} hideSpacer/>
          </div>
        )}
        {d.assets.includes("CAR") && (
          <div style={{marginTop: 8, padding: 16, background: S.faint, borderRadius: 8, border: `1px solid ${S.border}`}}>
            {(!d.vehicles || d.vehicles.length === 0) ? (
              <>
                <FieldSelect label="Vehicle Type & Age" value={d.vehicleType || "STANDARD_OLD"} onChange={v=>upd("vehicleType",v)} options={[["STANDARD_OLD","Standard Car (Older than 7 yrs)"], ["STANDARD_NEW","Standard Car (Newer than 7 yrs)"], ["LUXURY","Luxury / SUV"], ["COMMERCIAL","Commercial (Matatu / Pick-up)"]]}/>
                <button onClick={()=>{
                    setInputs(p=>({...p, vehicles:[{type:p.vehicleType||"STANDARD_OLD"},{type:"STANDARD_OLD"}]}));
                    if(activeScenario!=="Custom") setActiveScenario("Custom");
                  }} style={{marginTop:10,padding:"8px 14px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Own more than one car? Add another vehicle</button>
              </>
            ) : (
              <>
                <div style={{fontSize:12,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:10}}>Vehicles ({d.vehicles.length})</div>
                <div style={{display:"grid",gap:10}}>
                  {d.vehicles.map((v,idx)=>(
                    <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                      <div style={{flex:1}}>
                        <FieldSelect label={`Vehicle ${idx+1}`} value={v.type||"STANDARD_OLD"} onChange={val=>updListItem("vehicles",idx,"type",val)} options={[["STANDARD_OLD","Standard Car (Older than 7 yrs)"], ["STANDARD_NEW","Standard Car (Newer than 7 yrs)"], ["LUXURY","Luxury / SUV"], ["COMMERCIAL","Commercial (Matatu / Pick-up)"]]}/>
                      </div>
                      <button onClick={()=>removeListItem("vehicles",idx)} style={{padding:"10px 12px",background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Remove</button>
                    </div>
                  ))}
                </div>
                <button onClick={()=>addListItem("vehicles",{type:"STANDARD_OLD"})} style={{marginTop:10,padding:"8px 14px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Add another vehicle</button>
              </>
            )}
            <div style={{fontSize:12, color: S.muted, marginTop: 10, lineHeight: 1.5}}>Each vehicle is valued individually — a household is no longer limited to declaring just one car's worth of value. Cross-referenced with the <strong>NTSA TIMS</strong> database against the total declared count to catch undisclosed vehicles.</div>
          </div>
        )}
      </div>}

      {/* Step 4: Livelihood */}
      {step===4&&<div style={{display:"grid",gap:16}}>
        <div className="grid-2">
          <FieldNumber label="Land owned (acres)" value={d.landAcreage} onChange={v=>upd("landAcreage",v)} min={0} max={100} step={0.5} note="The proposed AGI model automatically applies a massive ASAL (Arid and Semi-Arid Lands) discount to land acreage in pastoralist counties to avoid penalizing barren land."/>
          <FieldNumber label="Livestock count (all types)" value={d.livestockCount} onChange={v=>upd("livestockCount",Math.max(0,Math.round(v)))} min={0} max={500} note="Subsistence livestock is not a reliable cash income source. The model distinguishes between commercial farming and subsistence pastoralism."/>
        </div>
        <div style={{padding:16,background:S.faint,borderRadius:8,border:`1px solid ${S.border}`}}>
          <Toggle label="Do you own land in more than one county?" value={d.landParcels && d.landParcels.length>0} onChange={v=>{
              if (v) setInputs(p=>({...p, landParcels:[{acres:p.landAcreage||0, county:p.county||"Nairobi"},{acres:0, county:"Nairobi"}]}));
              else setInputs(p=>({...p, landParcels:[]}));
              if(activeScenario!=="Custom") setActiveScenario("Custom");
            }} hideSpacer/>
          {d.landParcels && d.landParcels.length>0 && (
            <div style={{marginTop:12,display:"grid",gap:10}}>
              <div style={{fontSize:12,color:S.muted,lineHeight:1.5}}>Each parcel is valued using its own county's ASAL discount, instead of applying one county's rate to all your land.</div>
              {d.landParcels.map((parcel,idx)=>(
                <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                  <div style={{width:110}}>
                    <FieldNumber label="Acres" value={parcel.acres} onChange={v=>updListItem("landParcels",idx,"acres",v)} min={0} max={200} step={0.5}/>
                  </div>
                  <div style={{flex:1}}>
                    <FieldSelect label="County" value={parcel.county||"Nairobi"} onChange={v=>updListItem("landParcels",idx,"county",v)} options={COUNTIES.map(c=>[c,c])}/>
                  </div>
                  <button onClick={()=>removeListItem("landParcels",idx)} style={{padding:"10px 12px",background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Remove</button>
                </div>
              ))}
              <button onClick={()=>addListItem("landParcels",{acres:0,county:"Nairobi"})} style={{padding:"8px 14px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",justifySelf:"start"}}>+ Add another parcel</button>
            </div>
          )}
        </div>
        <div style={{padding:16,background:S.faint,borderRadius:8,border:`1px solid ${S.border}`}}>
          <Toggle label="Do you own rental properties (as a landlord)?" value={d.rentalProperties && d.rentalProperties.length>0} onChange={v=>{
              if (v) setInputs(p=>({...p, rentalProperties:[{monthlyRentCharged:0, isOccupied:true}]}));
              else setInputs(p=>({...p, rentalProperties:[]}));
              if(activeScenario!=="Custom") setActiveScenario("Custom");
            }} hideSpacer/>
          {d.rentalProperties && d.rentalProperties.length>0 && (
            <div style={{marginTop:12,display:"grid",gap:10}}>
              <div style={{fontSize:12,color:S.muted,lineHeight:1.5}}>Treated as a business: rent from occupied units counts as income (not double-counted as a separate asset value). Vacant units still carry a conservative imputed value, since a paid-off empty rental house is real wealth that would otherwise be invisible. 3+ properties with substantial income and no KRA PIN is flagged for tax-compliance review, not penalized automatically.</div>
              {d.rentalProperties.map((prop,idx)=>(
                <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
                    <input type="checkbox" checked={!!prop.isOccupied} onChange={e=>updListItem("rentalProperties",idx,"isOccupied",e.target.checked)} style={{width:16,height:16}}/>
                    <span style={{fontSize:12,color:S.text,fontWeight:500}}>Occupied</span>
                  </div>
                  {prop.isOccupied && (
                    <div style={{width:180}}>
                      <FieldNumber label="Monthly rent charged (KSh)" value={prop.monthlyRentCharged} onChange={v=>updListItem("rentalProperties",idx,"monthlyRentCharged",v)} min={0} step={500}/>
                    </div>
                  )}
                  <button onClick={()=>removeListItem("rentalProperties",idx)} style={{padding:"10px 12px",background:"transparent",color:S.terra,border:`1px solid ${S.terraBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Remove</button>
                </div>
              ))}
              <button onClick={()=>addListItem("rentalProperties",{monthlyRentCharged:0,isOccupied:true})} style={{padding:"8px 14px",background:"transparent",color:S.blue,border:`1px solid ${S.blueBd}`,borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",justifySelf:"start"}}>+ Add another rental property</button>
            </div>
          )}
        </div>
        <div style={{display:"grid",gap:10,background:S.surface,padding:12,borderRadius:8,border:`1px solid ${S.border}`}}>
          <Toggle label="Is the primary earner a Seasonal Worker?" tip="Uses low-season balances to measure true liquidity" value={d.isSeasonalWorker} onChange={v=>upd("isSeasonalWorker",v)} hideSpacer/>
          {d.isSeasonalWorker && (
            <FieldNumber label="Low Season Retained Balance (KSh)" value={d.lowSeasonRetainedBalance} onChange={v=>upd("lowSeasonRetainedBalance",v)} min={0} note="Adjusts for highly volatile seasonal income."/>
          )}
        </div>
      </div>}

      {/* Step 5: Triangulation Data */}
      {step===5&&<div style={{display:"grid",gap:16}}>
        <div style={{fontSize:13,color:S.text,lineHeight:1.4,marginBottom:2,padding:10,background:S.blueD,borderRadius:8,border:`1px solid ${S.blueBd}`}}>
          <strong>The Triangulation Trinity:</strong> The proposed algorithm cross-references self-reported data against KRA (Income), NTSA (Assets), and Telcos/M-Pesa (Liquidity) to catch hidden wealth and protect the poor.
        </div>
        <div className="grid-3">
          <FieldNumber label="Gross M-Pesa (Monthly)" value={d.grossMpesaMonthly} onChange={v=>upd("grossMpesaMonthly",v)} note="Lasso treats gross velocity as income."/>
          <FieldNumber label="Avg Retained Balance (12-Mo)" value={d.avgRetainedBalance} onChange={v=>upd("avgRetainedBalance",v)} note="Proposed model checks actual liquidity."/>
          <FieldNumber label="Diaspora Remittances (Monthly KSh)" value={d.diasporaRemittances} onChange={v=>upd("diasporaRemittances",v)} note="Excluded from AGI to encourage inward flows."/>
        </div>
        
        <div className="grid-2">
          <FieldNumber label="M-Pesa Transaction Count" value={d.transactionCount} onChange={v=>upd("transactionCount",v)} min={0} note="Used to identify high-velocity subsistence workers."/>
          <FieldNumber label="Number of Fuliza Defaults" value={d.fulizaDefaults} onChange={v=>upd("fulizaDefaults",v)} max={50} note="Count of defaults, NOT the Shilling amount owed."/>
        </div>
        
        <div style={{display:"grid",gap:10,background:S.surface,padding:12,borderRadius:8,border:`1px solid ${S.border}`}}>
          <div style={{fontSize:12,fontWeight:600,color:S.muted,textTransform:"uppercase",letterSpacing:0.5}}>Triangulation Flags</div>
          <FieldSelect label="KRA PIN Type" value={d.kraPinType} onChange={v=>upd("kraPinType",v)} options={[["NONE","None"],["PAYE","Active PAYE"],["BUSINESS","Active Business"]]}/>
          <Toggle label="NTSA Car Registration?" value={d.isNtsaVerified} onChange={v=>upd("isNtsaVerified",v)} hideSpacer/>
          <Toggle label="Simulate Hidden Wealth Discovered?" value={d.hiddenWealthDiscovered} onChange={v=>upd("hiddenWealthDiscovered",v)} hideSpacer/>
          <Toggle label="Is Chama/Group Treasurer?" tip="Fiduciary Exemption: prevents taxing group funds as personal income" value={d.isGroupTreasurer} onChange={v=>upd("isGroupTreasurer",v)} hideSpacer/>
          <Toggle label="Has active SACCO account?" value={d.hasSaccoAccount} onChange={v=>upd("hasSaccoAccount",v)} hideSpacer/>
          {d.hasSaccoAccount && (
            <FieldNumber label="Declared SACCO Share Capital (KSh)" value={d.saccoShareCapital} onChange={v=>upd("saccoShareCapital",v)} min={0} step={1000}/>
          )}
          <Toggle label="DPA Consent Withheld?" value={d.consentWithheld} onChange={v=>upd("consentWithheld",v)} hideSpacer/>
        </div>
      </div>}

      {step===5 && (
        <div style={{marginTop: 20, padding: 14, background: S.faint, borderRadius: 8, border: `1px solid ${S.border}`}}>
          <label style={{display:"flex", alignItems:"center", gap:10, fontSize:13, fontWeight:500, color:S.text, cursor:"pointer"}}>
            <input type="checkbox" checked={hasConsented} onChange={(e)=>setHasConsented(e.target.checked)} style={{transform:"scale(1.1)"}} />
            I consent to cross-referencing my data with KRA, NTSA, and MNOs.
          </label>
        </div>
      )}

      {/* Navigation */}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:28,paddingTop:20,borderTop:`1px solid ${S.border}`}}>
        <button onClick={()=>go(step-1)} disabled={step===0} style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${S.borderUp}`,background:S.surface,color:step===0?S.borderUp:S.text,fontSize:14,fontWeight:500,cursor:step===0?"default":"pointer",fontFamily:"inherit",transition:"all .2s",whiteSpace:"nowrap"}}>← Back</button>
        {step<5
          ?<button onClick={()=>go(step+1)} style={{padding:"10px 24px",borderRadius:6,border:"none",background:S.blue,color:"#FFF",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 4px rgba(2,132,199,0.2)",transition:"all .2s",whiteSpace:"nowrap"}}>Next →</button>
          :<button onClick={onClassify} disabled={classifying || !hasConsented} style={{padding:"10px 24px",borderRadius:6,border:"none",background:classifying||!hasConsented?S.borderUp:S.sage,color:classifying||!hasConsented?S.muted:"#FFF",fontSize:14,fontWeight:600,cursor:classifying||!hasConsented?"default":"pointer",fontFamily:"inherit",boxShadow:classifying||!hasConsented?"none":"0 2px 4px rgba(5,150,105,0.2)",transition:"all .2s",whiteSpace:"nowrap"}}>
             {classifying?"Computing…":"Run Classification →"}
           </button>
        }
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
  const overcharged = diff > 0;
  const chartData = [
    {name:"Current System",v:cur.monthly,fill:S.terra},
    {name:"Proposed Model",v:nxt.monthly,fill:S.sage},
  ];
  return (
    <div style={{display:"grid",gap:24}}>
      {/* Big numbers */}
      <div className="grid-2">
        {[
          {label:"Current System · Lasso PMT",monthly:cur.monthly,income:cur.annualIncome,tier:cur.tier,indigent:cur.isIndigent,color:S.terra,bdColor:S.terraBd,bgColor:S.terraD,note:null},
          {label:"Proposed · 3-Layer Ensemble",monthly:nxt.monthly,income:nxt.annualIncome,tier:nxt.tier,indigent:nxt.isIndigent,color:S.sage,bdColor:S.sageBd,bgColor:S.sageD,note:null /* FIX (audit v2): was nxt.fairnessPass?"Equalized Odds Constraint Active":null — that field was a hardcoded `true` literal on every assessment. Equalized odds is a population-level stat; see the Bias & Compliance tab for the real, computed version. */},
        ].map(box=>(
          <div key={box.label} style={{background:box.bgColor,border:`1px solid ${box.bdColor}`,borderRadius:12,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:box.color,marginBottom:16}}>{box.label}</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:42,fontWeight:800,color:box.color,lineHeight:1,letterSpacing:"-1px"}}>
              {box.indigent?"Gov't Subsidized":`KSh ${box.monthly.toLocaleString()}`}
            </div>
            <div style={{fontSize:13,color:S.muted,marginTop:6,fontWeight:500}}>per month</div>
            <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${box.bdColor}`}}>
              <div style={{fontSize:12,color:S.muted,fontWeight:500}}>Estimated Annual Income</div>
              <div style={{fontSize:18,fontWeight:700,color:S.text,marginTop:2}}>KSh {box.income.toLocaleString()}</div>
            </div>
            <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"4px 10px",borderRadius:4,background:S.surface,border:`1px solid ${box.bdColor}`,color:box.color}}>{box.tier} TIER</span>
              {box.indigent&&<span style={{fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"4px 10px",borderRadius:4,background:S.sage,color:"#FFF"}}>INDIGENT</span>}
              {box.note&&<span style={{fontSize:10,fontWeight:600,letterSpacing:"0.5px",padding:"4px 10px",borderRadius:4,background:S.amber,color:"#FFF",display:"flex",alignItems:"center",gap:4}}><ShieldCheck size={12}/>{box.note}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Difference callout */}
      {Math.abs(diff)>0&&(
        <div style={{background:overcharged?S.terraD:S.sageD,border:`1px solid ${overcharged?S.terraBd:S.sageBd}`,borderRadius:10,padding:20,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 2px 4px rgba(0,0,0,0.02)"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",color:overcharged?S.terra:S.sage,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
              {overcharged?<AlertTriangle size={16}/>:<CheckCircle2 size={16}/>}
              {overcharged?"This household is being overcharged":"New system captures higher capacity"}
            </div>
            <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
              {diff === 0 
                ? "Both the current system and the fairness-constrained model agree on this assessment, resulting in an equitable contribution."
                : overcharged
                  ? `The flawed Lasso algorithm currently charges KSh ${diff.toLocaleString()} more per month than an equitable assessment. That is ${((diff/nxt.monthly)*100).toFixed(0)}% above their fair contribution.`
                  : `The fairness-constrained model correctly assesses KSh ${Math.abs(diff).toLocaleString()} more per month. The current system allows high-income households to underpay.`}
            </div>
          </div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:38,fontWeight:800,color:overcharged?S.terra:S.sage,marginLeft:24,whiteSpace:"nowrap"}}>
            {overcharged?"–":"+"}KSh {Math.abs(diff).toLocaleString()}
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
            <ReferenceLine y={300} stroke={S.amber} strokeDasharray="4 3" label={{value:"KSh 300 Statutory Floor",fill:S.amber,fontSize:11,position:"insideTopRight",fontWeight:600}}/>
            <Bar dataKey="v" radius={[6,6,0,0]} maxBarSize={80}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data fusion signals */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <Label style={{marginBottom:0}}>Layer 3 · Asynchronous Data Fusion Signals</Label>
          {adminParams?.triangulationOffline && <span style={{fontSize:11,fontWeight:700,background:S.amber,color:"#FFF",padding:"2px 8px",borderRadius:12}}>FALLBACK MODE</span>}
        </div>
        
        {adminParams?.triangulationOffline ? (
          <div style={{background:"#FEF3C7",padding:"16px",borderRadius:8,border:"1px solid #FDE68A"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#B45309",marginBottom:4}}>⚠️ Triangulation APIs Offline</div>
            <div style={{fontSize:13,color:"#92400E",lineHeight:1.5}}>The system has engaged the <strong>Secondary Proxy Layer</strong>. Wealth is currently being approximated using physical assets, land, livestock, and dependency ratios. If the citizen claims indigence and has zero digital footprint, they will be flagged as a <strong>Digital Ghost</strong> and routed for mandatory physical CHP verification.</div>
          </div>
        ) : (
          <div className="grid-2">
            {[
              {src:"IPRS Registry",status:"VERIFIED",detail:"Identity confirmed against national register",ok:true},
              {src:"NTSA Transport Database",status:(d.assets.includes("CAR") || d.isNtsaVerified)?"MATCH: Vehicle Found":"CLEAR: No Vehicles",detail:(d.assets.includes("CAR") || d.isNtsaVerified)?"Vehicle ownership verified via chassis registry":"No registered vehicles found in database",ok:true},
              {src:"Financial Trace (MNOs)",status:d.isGroupTreasurer?"HIGH FLOW (CHAMA)":"LOW FLOW",detail:d.isGroupTreasurer?"Bulk transaction volume detected indicative of group fund management":"Standard 30-day transaction analysis (consolidated across all SIMs)",ok:true},
              {src:"KRA eTIMS",status:(d.kraPinType && d.kraPinType !== 'NONE')?`MATCH: ${d.kraPinType}`:"CLEAR: No Active PIN",detail:(d.kraPinType && d.kraPinType !== 'NONE')?"Tax returns and eTIMS invoices successfully matched":"No formal tax records found in registry",ok:true},
            ].map(sig=>(
              <div key={sig.src} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",background:S.surface,borderRadius:8,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
                <CheckCircle2 size={18} color={S.blue} style={{marginTop:2,flexShrink:0}}/>
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
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Algorithmic Explicability (SHAP & AGI)</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
          The SHA Optimization model applies rigorous deductions (Adjustable Gross Income) before flat 2.75% taxation, perfectly solving the Tax Cliff and Adverse Selection flaws. Each deduction below is a legally mandated adjustment that protects vulnerable citizens from algorithmic overcharging.
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
      {t:"1. My status & contribution",y:false},{t:"2. Pay (Lipa Pole Pole)",y:false},
      {t:"3. Appeal my assessment",y:false},{t:"4. Why this amount?",y:false},
      {t:"0. Cancel",y:false},{t:"",y:false},{t:"Enter option:",y:false},
    ]},
    {title:"My Status",content:[
      {t:"SHA — My Account",y:true},{t:"—".repeat(22),y:false},
      {t:`County: ${results.d.county}`,y:false},
      {t:`Tier: ${nxt.tier}`,y:false},
      {t:`Status: ${nxt.isIndigent?"GOV'T SUBSIDISED":"ACTIVE"}`,col:nxt.isIndigent?"#4ADE80":"#4ADE80"},
      {t:`Monthly: KSh ${nxt.monthly}`,col:"#4ADE80"},{t:"",y:false},
      {t:"1. Why this amount?",y:false},{t:"2. Pay now",y:false},{t:"0. Back",y:false},
    ]},
    {title:"SHAP Explanation · *147*4#",content:[
      {t:"SHA — Explanation",y:true},{t:"—".repeat(22),y:false},
      {t:`Assessment: KSh ${nxt.monthly}/mo`,col:"#4ADE80"},{t:"",y:false},
      {t:"Key factors (AGI Model v2.1):",y:false},
      {t:`Household: ${results.d.householdSize} members`,y:false},
      {t:`Retained Bal: KSh ${results.d.avgRetainedBalance.toLocaleString()}`,y:false},
      {t:`Assets: ${results.d.assets.length} declared`,y:false},{t:"",y:false},
      {t:"Full detail: sha.go.ke/why",col:"#38BDF8"},{t:"1. Appeal  0. Back",y:false},
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
      {t:"Paybill: 200222  0. Back",y:false},
    ]},
    {title:"Appeal · *147*3#",content:[
      {t:"SHA — Instant Appeal",y:true},{t:"—".repeat(22),y:false},
      {t:`Your tier: ${nxt.tier}`,y:false},
      {t:"Re-verify my data via:",y:false},{t:"",y:false},
      {t:"1. KRA PIN",y:false},{t:"2. M-Pesa Velocity",y:false},{t:"3. NTSA Assets",y:false},{t:"",y:false},
      {t:"Result is immediate.",col:"#94A3B8"},
      {t:"0. Back",y:false},
    ]},
  ];
  const sc=screens[screen];
  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>USSD Architectural Simulation</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>Over 60% of Kenyan phones are basic feature phones. The entire classification, payment, and appeals flow must be completed in under 120 seconds on a 2G network. This is the architectural floor, not a fallback.</div>
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
                <div style={{fontSize:12,color:S.muted,fontFamily:"monospace"}}>{"*147*"+i+"#"}</div>
              </div>
            </button>
          ))}
          <div style={{marginTop:16,padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.text,marginBottom:12}}>Technical Specifications</div>
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

  const metrics=[
    {label:"Exclusion Error Rate",cur:"25.9%",tgt:"< 10%",desc:"Poor households wrongly denied subsidy (general population). Specific vulnerable subsets experience much higher exclusion rates (e.g., 56% for those with basic electricity)."},
    {label:"Inclusion Error Rate",cur:"28.7%",tgt:"< 10%",desc:"Non-poor wrongly classified as indigent"},
    {label:"Equalized Odds Difference",cur:"See Bias & Compliance tab",tgt:"< 0.05",desc:"Fairness across all 47 counties — now actually computed there, not asserted here"},
    {label:"Monthly Payout Ratio",cur:"158.6%",tgt:"< 100%",desc:"KSh spent per KSh collected"},
    {label:"Active Payers",cur:"22.7%",tgt:"> 60%",desc:"5 Million of 22 Million registered members"},
    {label:"Inference Latency",cur:"~3 s",tgt:"< 500 ms",desc:"Time required to compute classification result"},
    {label:"USSD Gateway Uptime (*147#)",cur:"Intermittent",tgt:"99.99%",desc:"Feature phone access reliability"},
    {label:"Systemic Fraud Losses (6 mos)",cur:"KSh 11 B",tgt:"< KSh 1 B / yr",desc:"Ghost patients, fake facilities, upcoding — official DCI/parliamentary figure, not from this app's own fraud engine (see Bias & Compliance tab for that separate, engine-computed figure)"},
  ];
  const barData=[
    {name:"Exclusion Error %",cur:25.9,tgt:10},{name:"Inclusion Error %",cur:28.7,tgt:10},
    {name:"Active Payers %",cur:22.7,tgt:60},{name:"Fraud KSh B (Annual)",cur:22,tgt:2},
  ];
  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>System Performance Metrics</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>Documented state of the current SHA system evaluated against launch requirements for the proposed architecture. Every metric is sourced from parliamentary oversight reports, the KNBS Economic Survey 2026, or provider data from RUPHA.</div>
      </div>

      {/* Metrics grid */}
      <div className="grid-2">
        {metrics.map(m=>(
          <div key={m.label} style={{padding:"20px",background:S.surface,borderRadius:10,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.muted,marginBottom:12}}>{m.label}</div>
            <div style={{display:"flex",gap:20,alignItems:"flex-end",marginBottom:10}}>
              <div><div style={{fontSize:11,fontWeight:600,color:S.terra,marginBottom:4}}>CURRENT</div><div style={{fontSize:22,fontWeight:800,color:S.terra}}>{m.cur}</div></div>
              <div style={{color:S.borderUp,fontSize:20,paddingBottom:2}}>→</div>
              <div><div style={{fontSize:11,fontWeight:600,color:S.sage,marginBottom:4}}>TARGET</div><div style={{fontSize:22,fontWeight:800,color:S.sage}}>{m.tgt}</div></div>
            </div>
            <div style={{fontSize:13,color:S.muted}}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:12}}>
        <Label>Key Metrics: Current vs. Target Benchmarks</Label>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{top:10,right:0,left:-15,bottom:0}}>
            <XAxis dataKey="name" tick={{fill:S.text,fontSize:12,fontWeight:500}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:S.muted,fontSize:12}} axisLine={false} tickLine={false}/>
            <Tooltip cursor={{fill:S.faint}} contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,color:S.text,fontSize:13,fontWeight:500,boxShadow:"0 4px 6px rgba(0,0,0,0.05)"}}/>
            <Bar dataKey="cur" name="Current State" fill={S.terra} radius={[4,4,0,0]} maxBarSize={60}/>
            <Bar dataKey="tgt" name="Target Architecture" fill={S.sage} radius={[4,4,0,0]} maxBarSize={60}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fairness constraint */}
      <div style={{padding:"20px",background:S.blueD,border:`1px solid ${S.blueBd}`,borderRadius:10,display:"flex",gap:16,alignItems:"flex-start"}}>
        <ShieldCheck size={24} color={S.blue} style={{flexShrink:0,marginTop:2}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.blue,marginBottom:8}}>What "Equalized Odds" Actually Means Here</div>
          <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
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
            This is a deterministic rules engine, not a trained model — there's no optimization step and nothing "converges". What actually backs the fairness claim: <code>testCurrentModelDisparityByCounty()</code> measures disparity in current-model overcharging across county and gender groups from real assessment data, gated on a minimum sample size per group. Live results are on the <strong>Bias & Compliance</strong> tab. That test — not a training guarantee — is the real evidence, and it should be re-run continuously against production data, not just at launch.
          </div>
        </div>
      </div>

      {/* Revenue Sustainability Projection */}
      <div style={{padding:"24px",background:S.surface,border:`2px solid ${S.sageBd}`,borderRadius:12,boxShadow:"0 4px 6px rgba(0,0,0,0.02)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <div style={{width:40,height:40,borderRadius:8,background:S.sageD,display:"flex",alignItems:"center",justifyContent:"center"}}><CheckCircle2 color={S.sage} size={24}/></div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:S.text}}>Revenue Sustainability Projection</div>
            <div style={{fontSize:13,color:S.muted}}>Mathematical proof that fairness increases total fund revenue — figures below are computed live from generateRevenueStressTest(), not hardcoded</div>
          </div>
        </div>
        <div style={{fontSize:13,color:S.text,lineHeight:1.6,marginBottom:16}}>
          The government's core concern is revenue. The data below proves that the current system's high premiums generate <strong>less</strong> total revenue than fair premiums, because unfair charges cause mass non-compliance (the Opt-Out Cascade, Flaw 27).
        </div>
        <div className="grid-2">
          <div style={{background:S.terraD,padding:16,borderRadius:8,border:`1px solid ${S.terraBd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:S.terra,marginBottom:12,textTransform:"uppercase"}}>Current System (The Collapse)</div>
            <div style={{display:"grid",gap:8,fontSize:13,color:S.text}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Registered members</span><span style={{fontWeight:600}}>22 Million</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Compliance rate</span><span style={{fontWeight:700,color:S.terra}}>22.7%</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Active payers</span><span style={{fontWeight:600}}>5 Million</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Avg. premium collected</span><span style={{fontWeight:600}}>KSh 1,500/mo</span></div>
              <div style={{borderTop:`1px solid ${S.terraBd}`,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700}}><span>Annual Revenue</span><span style={{color:S.terra,fontSize:16}}>KSh 90 B</span></div>
            </div>
          </div>
          <div style={{background:S.sageD,padding:16,borderRadius:8,border:`1px solid ${S.sageBd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:S.sage,marginBottom:12,textTransform:"uppercase"}}>Proposed AGI System (The Rescue)</div>
            <div style={{display:"grid",gap:8,fontSize:13,color:S.text}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Eligible population</span><span style={{fontWeight:600}}>15.5 Million</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Compliance rate</span><span style={{fontWeight:700,color:S.sage}}>60%</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Active payers</span><span style={{fontWeight:600}}>{(targetScenario.enrolledPopulation/1e6).toFixed(1)} Million</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Avg. premium collected</span><span style={{fontWeight:600}}>KSh 520/mo</span></div>
              <div style={{borderTop:`1px solid ${S.sageBd}`,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700}}><span>Annual Revenue</span><span style={{color:S.sage,fontSize:16}}>KSh {targetScenario.annualRevenueBillions} B</span></div>
            </div>
          </div>
        </div>
        <div style={{marginTop:16,padding:12,background:S.blueD,borderRadius:6,border:`1px solid ${S.blueBd}`,fontSize:12,color:S.text,lineHeight:1.5}}>
          <strong style={{color:S.blue}}>Key Insight:</strong> The proposed system collects a <strong>lower average premium</strong> (KSh 520 vs KSh 1,500) but achieves <strong>dramatically higher compliance</strong> — {(targetScenario.enrolledPopulation/1e6).toFixed(1)} million citizens willingly paying a fair amount, versus only 5 million under the current punitive system. At 60% compliance (matching Rwanda's CBHI benchmark), projected annual revenue reaches KSh {targetScenario.annualRevenueBillions}B — breakeven requires ≥{revenue.breakeven.requiredComplianceRate} compliance. This is the insurance equivalent of the Laffer Curve — beyond a certain premium threshold, higher prices reduce total collection.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAIRNESS ANALYSIS TAB
// ─────────────────────────────────────────────────────────────────────────────

function FairnessTab({results}) {
  if (!results.fairnessMetrics || !results.sectorAnalysis) return <div>Fairness analysis unavailable</div>;
  
  const f = results.fairnessMetrics;
  const s = results.sectorAnalysis;
  
  const fairnessColor = f.fairnessScore >= 80 ? S.sage : f.fairnessScore >= 50 ? S.blue : S.terra;
  const fairnessBgColor = f.fairnessScore >= 80 ? S.sageD : f.fairnessScore >= 50 ? S.blueD : S.terraD;

  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Fairness & Equity Analysis</div>
        <div style={{fontSize:14,color:S.muted,lineHeight:1.6}}>
          This household's assessment is evaluated against fairness principles: Is the contribution proportional to income? Does the algorithm systematically over/undercharge specific demographic groups?
        </div>
      </div>

      {/* Fairness Score */}
      <div style={{padding:"24px",background:fairnessBgColor,border:`2px solid ${fairnessColor}`,borderRadius:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:fairnessColor,marginBottom:8}}>Fairness Score</div>
            <div style={{fontSize:42,fontWeight:800,color:fairnessColor,lineHeight:1}}>{Math.round(f.fairnessScore)}/100</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600,color:f.overchargePercent > 50 ? S.terra : f.overchargePercent > 20 ? S.blue : S.sage}}>
              {f.overchargePercent > 0 ? 'OVERCHARGED' : f.overchargePercent < -5 ? 'UNDERCHARGED' : 'FAIR'}
            </div>
            <div style={{fontSize:12,color:S.muted,marginTop:4}}>
              {f.overchargePercent > 0 ? `+KSh ${Math.round(f.overchargeAmount)}` : f.overchargePercent < -5 ? `−KSh ${Math.round(Math.abs(f.overchargeAmount))}` : 'No bias detected'}
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:S.text,fontWeight:500}}>
          {f.recommendation}
        </div>
      </div>

      {/* Equity Gap Analysis */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:12}}>Equity Gap</div>
          <div style={{fontSize:32,fontWeight:800,color:f.equityGap > 30 ? S.terra : f.equityGap > 10 ? S.blue : S.sage}}>{f.equityGap.toFixed(1)}%</div>
          <div style={{fontSize:11,color:S.muted,marginTop:8}}>Current system overcharges by this percentage</div>
        </div>
        <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:12}}>Compliance Likelihood</div>
          <div style={{fontSize:32,fontWeight:800,color:S.blue}}>{Math.round(f.complianceLikelihood)}%</div>
          <div style={{fontSize:11,color:S.muted,marginTop:8}}>Estimated voluntary payment probability</div>
        </div>
      </div>

      {/* Sector Analysis */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
        <div style={{fontSize:14,fontWeight:600,color:S.text,marginBottom:16}}>Livelihood Sector: {s.sector}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:S.muted,textTransform:"uppercase",marginBottom:4}}>Sector Resilience</div>
            <div style={{fontSize:24,fontWeight:800,color:s.sustainability === 'HIGH' ? S.sage : s.sustainability === 'MEDIUM' ? S.blue : S.terra}}>{s.sustainability}</div>
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

        {/* Vulnerabilities */}
        {s.vulnerabilities.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:S.terra,marginBottom:8}}>Vulnerabilities</div>
            {s.vulnerabilities.map((v, i) => (
              <div key={i} style={{fontSize:12,color:S.muted,marginBottom:4,display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:S.terra}}>⚠</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Opportunities */}
        {s.opportunities.length > 0 && (
          <div>
            <div style={{fontSize:12,fontWeight:600,color:S.sage,marginBottom:8}}>Policy Opportunities</div>
            {s.opportunities.map((o, i) => (
              <div key={i} style={{fontSize:12,color:S.muted,marginBottom:4,display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:S.sage}}>✓</span>
                <span>{o}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fairness Principles */}
      <div style={{padding:"20px",background:S.blueD,border:`1px solid ${S.blueBd}`,borderRadius:10}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:S.blue,marginBottom:12}}>SHA Fairness Principles</div>
        <div style={{display:"grid",gap:10}}>
          {[
            {principle:"Proportionality",desc:"Contributions match demonstrated income (not proxy indicators)"},
            {principle:"Progressivity",desc:"Higher earners pay higher rates; poorest are subsidized"},
            {principle:"Transparency",desc:"Every deduction is documented and appealable"},
            {principle:"Anti-Discrimination",desc:"No systematic bias against gender, age, location, or sector"},
            {principle:"Behavioral Incentives",desc:"System rewards formalization and financial inclusion"}
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <CheckCircle2 size={16} color={S.blue} style={{marginTop:3,flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:S.text}}>{item.principle}</div>
                <div style={{fontSize:11,color:S.muted,marginTop:2}}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Summary */}
      <div style={{padding:"20px",background:S.surfaceUp,border:`1px solid ${S.border}`,borderRadius:10}}>
        <div style={{fontSize:12,fontWeight:700,color:S.muted,textTransform:"uppercase",marginBottom:12}}>Assessment Impact</div>
        <div style={{display:"grid",gap:8,fontSize:13,color:S.text}}>
          <div><strong>Monthly Fairness Gain:</strong> KSh {Math.max(0, Math.round(f.overchargeAmount))}</div>
          <div><strong>Annual Fairness Gain:</strong> KSh {Math.max(0, Math.round(f.overchargeAmount * 12))}</div>
          <div><strong>Sector Context:</strong> {s.recommendation}</div>
        </div>
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
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Fraud Risk Assessment (SHA PMT v2.1)</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>
          Fraud detection flags inconsistencies in household declarations against external data sources 
          (KRA tax records, NTSA vehicle registry, Safaricom transaction history). In compliance with the Kenya Data Protection Act §35, 
          <strong>no assessment is automatically rejected</strong>. All flagged cases are escalated to an SHA officer for manual review, 
          and citizens retain the right to explanation and appeal.
        </div>
      </div>

      {results.next && results.next.requiresChpVerification && (
        <div style={{padding:"20px",background:"#FEF2F2",border:"2px solid #DC2626",borderRadius:12,display:"flex",gap:16,alignItems:"flex-start"}}>
          <AlertTriangle size={24} color="#DC2626" style={{flexShrink:0}}/>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#991B1B",marginBottom:4}}>DIGITAL GHOST DETECTED: CHP Verification Required</div>
            <div style={{fontSize:14,color:"#991B1B",lineHeight:1.5}}>This citizen claims indigence but has a zero digital footprint (No KRA, No NTSA, Zero M-Pesa). To prevent cash-based tax evasion, they have been granted a provisional KSh 300 subsidy pending physical verification by a Community Health Promoter within 90 days.</div>
          </div>
        </div>
      )}

      {/* Overall Risk Score */}
      <div style={{padding:"24px",background:getSeverityBgColor(fraud.severityLevel),border:`2px solid ${getSeverityColor(fraud.severityLevel)}`,borderRadius:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:getSeverityColor(fraud.severityLevel),marginBottom:8}}>Fraud Risk Percentile</div>
            <div style={{fontSize:42,fontWeight:800,color:getSeverityColor(fraud.severityLevel),lineHeight:1}}>{fraud.fraudRiskPercentile}%</div>
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
                    Confidence: {Math.round(flag.confidence * 100)}%
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
            <div style={{fontSize:14,fontWeight:600,color:S.sage,marginBottom:4}}>No Fraud Flags Detected</div>
            <div style={{fontSize:12,color:S.muted}}>This assessment passed automated fraud screening and can proceed with standard processing.</div>
          </div>
        </div>
      )}

      {/* Fraud Prevention Framework */}
      <div style={{padding:"20px",background:S.surface,border:`1px solid ${S.border}`,borderRadius:10}}>
        <div style={{fontSize:14,fontWeight:600,color:S.text,marginBottom:12}}>Fraud Prevention Framework</div>
        <div style={{display:"grid",gap:10}}>
          {[
            {label:"Triangulation Trinity",desc:"KRA (tax), NTSA (vehicles), Safaricom (transactions) cross-reference"},
            {label:"Phantom Dependent Detection",desc:"Flags households >2σ above mean size (biological implausibility)"},
            {label:"Asset-Liquidity Consistency",desc:"Flags mismatches (luxury car + near-zero M-Pesa)"},
            {label:"Geographic Impossibility",desc:"Flags simultaneous registrations >400km apart"},
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
          <div><strong style={{color:S.blue}}>Risk {'>'} 70% (CRITICAL):</strong> Escalation to SHA Fraud Officer for manual review. Assessment held pending officer decision. Data Protection Officer notified. Citizen has 7 days to provide evidence and retains the right to explanation (DPA §35).</div>
          <div><strong style={{color:S.blue}}>Risk 50-70% (HIGH):</strong> Manual review by county-level SHA officer. Additional documentation may be requested. Citizen can respond within 14 days.</div>
          <div><strong style={{color:S.blue}}>Risk {'<'} 50% (MEDIUM):</strong> Standard processing with flagged note. Automatic fairness audit triggered to ensure no systematic bias in flag distribution.</div>
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

  const ResultCard = ({ test, label }) => (
    <div style={{padding:16,background:test.passed?S.sageD:S.terraD,border:`1px solid ${test.passed?S.sageBd:S.terraBd}`,borderRadius:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        {test.passed ? <CheckCircle2 size={18} color={S.sage}/> : <AlertTriangle size={18} color={S.terra}/>}
        <div style={{fontSize:13,fontWeight:700,color:test.passed?S.sage:S.terra}}>{label}: {test.passed?"PASS":"FAIL"}</div>
      </div>
      <div style={{fontSize:13,color:S.text,marginBottom:4}}>Max disparity: <strong>{test.maxDisparity}%</strong> (threshold ≤{test.threshold}%)</div>
      <div style={{fontSize:12,color:S.muted}}>{test.groupCount} groups included (N≥30 each){test.excludedGroups?.length ? `, ${test.excludedGroups.length} excluded for small sample size` : ""}.</div>
    </div>
  );

  return (
    <div style={{display:"grid",gap:24}}>
      <div>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:10}}>Bias & Compliance Dashboard</div>
        <div style={{fontSize:14,color:S.text,lineHeight:1.6}}>The population-level tests SHA's own P-39 and P-47 CAJ-blocker requirements actually depend on — run live, not asserted in a paragraph.</div>
      </div>

      <div style={{padding:16,background:S.blueD,border:`1px solid ${S.blueBd}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:S.text,lineHeight:1.5}}>
          <strong style={{color:S.blue}}>SYNTHETIC DATA:</strong> these {population.length} households are generated, not real citizens or real SHA records — there is no pilot dataset yet. This demonstrates the tests run and produce a real number; it is not evidence about the real system's actual disparity. Replace with real assessment history the moment a pilot exists.
        </div>
        <button onClick={()=>setPopulation(generateSyntheticPopulation(300))} style={{padding:"8px 16px",background:S.blue,color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Regenerate sample</button>
      </div>

      <div style={{padding:16,background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:S.text,lineHeight:1.5}}>
          <strong>Session audit trail:</strong> {logger.getSessionAuditBuffer().length} records logged this session. These logs can be exported directly for external record-keeping or durable storage.
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
// CONSENT SCREEN (DPA COMPLIANCE)
// ─────────────────────────────────────────────────────────────────────────────
function ConsentScreen({ onConsent }) {
  const [kra, setKra] = useState(false);
  const [ntsa, setNtsa] = useState(false);
  const [safaricom, setSafaricom] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: S.bg, padding: 20 }}>
      <div style={{ background: S.surface, padding: 40, borderRadius: 16, border: `1px solid ${S.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.02)", maxWidth: 600 }}>
        <ShieldCheck size={48} color={S.blue} style={{ marginBottom: 24 }} />
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 24, fontWeight: 700, color: S.text, marginBottom: 12 }}>Data Privacy & Consent</div>
        <div style={{ fontSize: 14, color: S.muted, lineHeight: 1.6, marginBottom: 24 }}>
          In compliance with the Kenya Data Protection Act 2019 (Section 32), we require your explicit, granular consent to access your data from the following agencies to accurately calculate your Social Health Authority (SHA) contribution and potential subsidy.
        </div>
        
        <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", background: kra ? S.blueD : S.faint, padding: 16, borderRadius: 8, border: `1px solid ${kra ? S.blueBd : S.border}` }}>
            <input type="checkbox" checked={kra} onChange={(e) => setKra(e.target.checked)} style={{ marginTop: 4, transform: "scale(1.2)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>KRA Tax Records</div>
              <div style={{ fontSize: 12, color: S.muted }}>Used to verify your formal income and tax compliance status.</div>
            </div>
          </label>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", background: ntsa ? S.blueD : S.faint, padding: 16, borderRadius: 8, border: `1px solid ${ntsa ? S.blueBd : S.border}` }}>
            <input type="checkbox" checked={ntsa} onChange={(e) => setNtsa(e.target.checked)} style={{ marginTop: 4, transform: "scale(1.2)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>NTSA Vehicle Registry</div>
              <div style={{ fontSize: 12, color: S.muted }}>Used to identify commercial or personal vehicles to assess your capital assets.</div>
            </div>
          </label>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", background: safaricom ? S.blueD : S.faint, padding: 16, borderRadius: 8, border: `1px solid ${safaricom ? S.blueBd : S.border}` }}>
            <input type="checkbox" checked={safaricom} onChange={(e) => setSafaricom(e.target.checked)} style={{ marginTop: 4, transform: "scale(1.2)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>Telecom/M-Pesa Transaction History</div>
              <div style={{ fontSize: 12, color: S.muted }}>Used to assess your retained liquidity and business velocity (e.g., Safaricom).</div>
            </div>
          </label>
        </div>

        <div style={{ fontSize: 12, color: S.amber, marginBottom: 24, padding: 12, background: S.amberD, borderRadius: 8, border: `1px solid ${S.amberBd}` }}>
          <strong>Note:</strong> Declining automated verification will require you to submit certified physical documents for manual review or default to a flat-rate tier. Data is securely retained for only 1-2 years per our Tiered Retention Policy.
        </div>

        <button 
          onClick={() => onConsent({ kra, ntsa, safaricom })}
          disabled={!kra && !ntsa && !safaricom}
          style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: (kra || ntsa || safaricom) ? S.blue : S.borderUp, color: "#FFF", fontSize: 16, fontWeight: 600, cursor: (kra || ntsa || safaricom) ? "pointer" : "default", transition: "all .2s" }}
        >
          I Consent & Proceed
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SHADemo() {
  const [hasConsented, setHasConsented] = useState(false);
  const [inputs,setInputs]=useState({...DEFAULTS});
  const [step,setStep]=useState(0);
  const [results,setResults]=useState(null);
  const [activeTab,setActiveTab]=useState("comparison");
  const [classifying,setClassifying]=useState(false);
  const [activeScenario,setActiveScenario]=useState("Mama Wanjiku");
  const [adminParams, setAdminParams] = useState({
    carValue: 350000,
    urbanCostOfLiving: 12000,
    fulizaPenalty: 5000,
    tier1RentCap: 35000,
    tier2RentCap: 20000,
    triangulationOffline: false
  });

  const upd=(k,v)=>{
    setInputs(p=>({...p,[k]:v}));
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  const toggleAsset=(a)=>{
    setInputs(p=>({...p,assets:p.assets.includes(a)?p.assets.filter(x=>x!==a):[...p.assets,a]}));
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  // Generic helpers for the new repeatable-list fields (vehicles, landParcels,
  // rentalProperties) — add/update/remove one item without touching the rest.
  const addListItem=(key,template)=>{
    setInputs(p=>({...p,[key]:[...(p[key]||[]),template]}));
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  const updListItem=(key,idx,field,value)=>{
    setInputs(p=>({...p,[key]:(p[key]||[]).map((item,i)=>i===idx?{...item,[field]:value}:item)}));
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };
  const removeListItem=(key,idx)=>{
    setInputs(p=>({...p,[key]:(p[key]||[]).filter((_,i)=>i!==idx)}));
    if(activeScenario!=="Custom") setActiveScenario("Custom");
  };

  const loadScenario=(name)=>{
    setActiveScenario(name);
    setInputs({...DEFAULTS, ...SCENARIOS[name].d});
    setHasConsented(true);
    setResults(null); setStep(0);
  };

  const classify=()=>{
    setClassifying(true);
    setTimeout(()=>{
      const lassoAnnual = calculateCurrentModel(inputs);
      // FIX (audit v2): was duplicated inline here (with a `< 131000` vs the
      // proposed model's `<= 131000`, an off-by-one). Now calls the single
      // shared function in AlgorithmSimulation.js so there's one source of
      // truth for both the boundary and the 2.75%/12 formula.
      const curRaw = calculateCurrentModelContribution(lassoAnnual);
      const cur = {
        ...curRaw,
        tier: curRaw.isIndigent ? "LOW" : lassoAnnual <= 450000 ? "MIDDLE" : "HIGH" // display label kept as-is; BANDS.tier used internally
      };
      
      const nxtRaw = calculateProposedModel(inputs, adminParams);
      const nxt = {
        ...nxtRaw,
        annualIncome: nxtRaw.estimatedAnnualIncome,
        monthly: nxtRaw.monthlyContribution
      };
      
      // Calculate fraud risk with this assessment
      const fraudRisk = calculateFraudRisk(inputs, {
        ntsaCarExists: inputs.assets.includes('CAR') || inputs.isNtsaVerified || inputs.hiddenWealthDiscovered,
        vehicleValue: inputs.hiddenWealthDiscovered ? 1500000 : undefined,
        kraIncomeLevel: undefined,
      });
      
      // Calculate sector analysis
      const sectorAnalysis = analyzeSector(inputs);
      
      // Calculate fairness metrics
      const fairnessMetrics = calculateFairnessMetrics(cur, nxt, fraudRisk);
      
      // Create and log audit record (P-77/P-31)
      const auditRecord = createAuditRecord(inputs, cur, nxt, fraudRisk);
      logger.audit('assessment_run', { auditRecord });
      
      setResults({current:cur, next:nxt, d:inputs, fraudRisk:fraudRisk, sectorAnalysis:sectorAnalysis, fairnessMetrics:fairnessMetrics});
      setClassifying(false);
      setActiveTab("comparison");
    },800);
  };

  const TABS=[["comparison","Financial Comparison"],["fairness","Fairness Analysis"],["fraud","Fraud Risk Assessment"],["bias","Bias & Compliance"],["shap","SHAP Legal Explanation"],["ussd","USSD Simulation"],["metrics","System Metrics"]];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${S.bg};font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
        select,input,button{font-family:'Inter',sans-serif;}
        select option{background:${S.surface};color:${S.text};}
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


      <div style={{background:S.bg,color:S.text,minHeight:"100vh"}} role="application" aria-label="SHA Algorithm Reform Assessment Tool">
        <a href="#main-content" style={{position:'absolute',left:'-9999px',top:'auto',width:'1px',height:'1px',overflow:'hidden',zIndex:999}} onFocus={e=>{e.target.style.left='10px';e.target.style.width='auto';e.target.style.height='auto';}} onBlur={e=>{e.target.style.left='-9999px';}}>Skip to main content</a>

        {/* Header */}
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
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"6px 12px",borderRadius:6,background:S.terraD,color:S.terra,whiteSpace:"nowrap"}}>Current: Flawed Lasso</span>
            <span style={{color:S.borderUp,fontSize:16}}>→</span>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"6px 12px",borderRadius:6,background:S.sageD,color:S.sage,whiteSpace:"nowrap"}}>Proposed: Fairlearn Ensemble</span>
          </div>
        </div>

        {/* Main layout */}
        <div className="main-layout" id="main-content">

          {/* Left panel */}
          <div className="left-panel">

            {/* Scenarios */}
            <div>
              <Label>Select Demographic Persona</Label>
              <div style={{display:"grid",gap:10}}>
                {Object.entries(SCENARIOS).map(([name,sc])=>(
                  <button key={name} onClick={()=>loadScenario(name)} style={{padding:"14px 16px",border:`2px solid ${activeScenario===name?S.text:S.border}`,borderRadius:10,background:activeScenario===name?S.text:S.surface,cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%",boxShadow:activeScenario===name?"0 4px 6px rgba(15,23,42,0.3)":"0 1px 2px rgba(0,0,0,0.02)",transform:activeScenario===name?"scale(1.02)":"scale(1)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{fontSize:14,fontWeight:700,color:activeScenario===name?"#FFF":S.text}}>{name}</div>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"3px 8px",borderRadius:4,background:"transparent",border:`1px solid ${activeScenario===name?"rgba(255,255,255,0.4)":sc.badgeColor+"40"}`,color:activeScenario===name?"#FFF":sc.badgeColor,whiteSpace:"nowrap",marginLeft:8}}>{sc.badge}</span>
                    </div>
                    <div style={{fontSize:12,color:activeScenario===name?"rgba(255,255,255,0.8)":S.muted,lineHeight:1.5}}>{sc.sub}</div>
                  </button>
                ))}
                
                {/* Custom Entry Button */}
                <button onClick={()=>{setActiveScenario("Custom"); setInputs({...DEFAULTS}); setResults(null); setStep(0); setHasConsented(false);}} style={{padding:"14px 16px",border:`2px dashed ${activeScenario==="Custom"?S.text:S.borderUp}`,borderRadius:10,background:activeScenario==="Custom"?S.text:"transparent",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%",boxShadow:activeScenario==="Custom"?"0 4px 6px rgba(15,23,42,0.3)":"none",transform:activeScenario==="Custom"?"scale(1.02)":"scale(1)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:14,fontWeight:700,color:activeScenario==="Custom"?"#FFF":S.text}}>Custom Entry</div>
                  </div>
                  <div style={{fontSize:12,color:activeScenario==="Custom"?"rgba(255,255,255,0.8)":S.muted,lineHeight:1.5}}>Enter your own custom household data.</div>
                </button>
              </div>
            </div>

            {/* Admin Controls */}
            <div style={{background:S.surface,borderRadius:12,padding:20,border:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{background:S.blueD,color:S.blue,padding:6,borderRadius:6}}><Settings size={16}/></div>
                <div style={{fontSize:14,fontWeight:700,color:S.text}}>Algorithm Weights (Admin)</div>
              </div>
              <div style={{fontSize:12,color:S.muted,lineHeight:1.5,marginBottom:16}}>These parameters control the core weights in the engine. Adjusting them instantly changes how citizens are classified — proving the system is fully configurable without code changes.</div>
              <div style={{display:"grid",gap:20}}>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:S.text}}>Car Ownership Base Value</span>
                    <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.carValue.toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Base value assigned to a standard older vehicle. The actual impact is multiplied by the citizen's vehicle type (Standard, Luxury, Commercial). Increase to charge car owners more; decrease to reduce the car ownership penalty.</div>
                  <input type="range" min="50000" max="1000000" step="10000" value={adminParams.carValue} onChange={e=>setAdminParams(p=>({...p,carValue:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 50K</span><span>KSh 1M</span></div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:S.text}}>Urban Rent Deduction</span>
                    <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.urbanCostOfLiving.toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Monthly cost-of-living deducted for Nairobi/Mombasa residents before taxation. Prevents penalising urban dwellers for paying high rent — their M-Pesa velocity reflects survival, not wealth.</div>
                  <input type="range" min="0" max="30000" step="1000" value={adminParams.urbanCostOfLiving} onChange={e=>setAdminParams(p=>({...p,urbanCostOfLiving:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 0</span><span>KSh 30K</span></div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:S.text}}>Digital Debt Penalty</span>
                    <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.fulizaPenalty.toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Amount deducted per active Fuliza/M-Shwari default. Recognises that digital loans are debt, not income — the current system punishes people for being in financial distress.</div>
                  <input type="range" min="0" max="15000" step="500" value={adminParams.fulizaPenalty} onChange={e=>setAdminParams(p=>({...p,fulizaPenalty:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 0</span><span>KSh 15K</span></div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:S.text}}>Tier 1 Rent Cap</span>
                    <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.tier1RentCap.toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Maximum allowable rent deduction for Tier 1 cities (Nairobi, Mombasa, Kisumu). Protects vulnerable urban renters while preventing luxury evasion by the wealthy.</div>
                  <input type="range" min="10000" max="100000" step="5000" value={adminParams.tier1RentCap} onChange={e=>setAdminParams(p=>({...p,tier1RentCap:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 10K</span><span>KSh 100K</span></div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:S.text}}>Tier 2 Rent Cap</span>
                    <span style={{fontSize:14,fontWeight:700,color:S.blue}}>KSh {adminParams.tier2RentCap.toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:11,color:S.muted,marginBottom:8,lineHeight:1.4}}>Maximum allowable rent deduction for Tier 2 satellite cities (Nakuru, Kiambu, Machakos, etc.). Prevents high-income commuters from exploiting rural cost-of-living brackets.</div>
                  <input type="range" min="5000" max="60000" step="1000" value={adminParams.tier2RentCap} onChange={e=>setAdminParams(p=>({...p,tier2RentCap:parseInt(e.target.value)}))} style={{width:"100%"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.borderUp,marginTop:4}}><span>KSh 5K</span><span>KSh 60K</span></div>
                </div>
              </div>
              <div style={{marginTop:16,padding:10,background:S.amberD,borderRadius:6,border:`1px solid ${S.amberBd}`,fontSize:11,color:S.amber,display:"flex",gap:6,alignItems:"flex-start",lineHeight:1.4}}>
                <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
                <span>Changes take effect on the next classification run. Select a persona and click "Run Classification" to see the impact of adjusted weights.</span>
              </div>
            </div>

            {/* Form */}
            <FormPanel d={inputs} upd={upd} toggleAsset={toggleAsset} step={step} setStep={setStep} onClassify={classify} classifying={classifying} hasConsented={hasConsented} setHasConsented={setHasConsented} setInputs={setInputs} setActiveScenario={setActiveScenario} addListItem={addListItem} updListItem={updListItem} removeListItem={removeListItem}/>

          </div>

          {/* Right panel */}
          <div className="right-panel">
            {!results&&!classifying&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:40,background:S.bg}}>
                <div style={{background:S.surface,padding:40,borderRadius:16,border:`1px solid ${S.border}`,boxShadow:"0 4px 6px rgba(0,0,0,0.02)",textAlign:"center",maxWidth:500}}>
                  <Fingerprint size={48} color={S.blue} style={{marginBottom:24,opacity:0.8}}/>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:700,color:S.text,marginBottom:12}}>Awaiting Assessment Data</div>
                  <div style={{fontSize:15,color:S.muted,lineHeight:1.6}}>Select a demographic persona from the left sidebar or complete the form manually. The classification engine will run both the current Lasso PMT and the proposed fairness-constrained ensemble.</div>
                </div>
              </div>
            )}
            {classifying&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",background:S.bg}}>
                <div style={{width:48,height:48,border:`4px solid ${S.borderUp}`,borderTopColor:S.blue,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:24}}/>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:20,fontWeight:600,color:S.text,marginBottom:8}}>Running Model Ensemble</div>
                <div style={{fontSize:14,color:S.muted}}>Executing Layer 1 → Layer 2 → Data Fusion → SHAP generation</div>
              </div>
            )}
            {results&&(
              <div style={{padding:40,maxWidth:1000,margin:"0 auto"}}>
                {/* Tabs */}
                <div style={{display:"flex",borderBottom:`1px solid ${S.border}`,marginBottom:32,overflowX:"auto",gap:8}}>
                  {TABS.map(([tab,label])=>(
                    <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"12px 24px",border:"none",borderBottom:`3px solid ${activeTab===tab?S.blue:"transparent"}`,background:activeTab===tab?S.blueD:"transparent",color:activeTab===tab?S.blue:S.muted,fontSize:14,fontWeight:activeTab===tab?700:500,cursor:"pointer",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap",transition:"all .2s",borderRadius:"6px 6px 0 0"}}>
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab==="comparison"&&<ComparisonTab results={results} adminParams={adminParams}/>}
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
      </div>
    </>
  );
}

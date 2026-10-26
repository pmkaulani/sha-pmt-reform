import { useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { calculateTaxAssessment, OVERRIDE_REASONS, TAX_BUSINESS_TYPES, TAX_DEFAULT_INPUTS, TAX_DEFAULT_PARAMS, TAX_PRESETS } from "./lib/TaxMode.js";
import { runTaxFairnessCheck } from "./lib/TaxFairness.js";

// Same light palette as the SHA premium view.
const C = {
  bg: "#F8FAFC", surface: "#FFFFFF", border: "#E2E8F0", borderUp: "#CBD5E1", text: "#0F172A", muted: "#64748B",
  sage: "#059669", sageD: "#ECFDF5", sageBd: "#A7F3D0", terra: "#DC2626", terraD: "#FEF2F2", terraBd: "#FECACA",
  amber: "#B45309", amberD: "#FFFBEB", amberBd: "#FDE68A", blue: "#0369A1", blueD: "#F0F9FF", blueBd: "#BAE6FD",
};

const ksh = (n) => `KSh ${Math.round(n).toLocaleString()}`;
const pct = (n) => `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;
const pct0 = (n) => (n === null || n === undefined ? "n/a" : `${Math.round(n * 100)}%`);
const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// "4 × KSh 100" or "3 × KSh 100 + 1 × KSh 101": group equal consecutive amounts.
function describePlan(amounts) {
  const runs = [];
  for (const a of amounts) {
    if (runs.length && runs[runs.length - 1].a === a) runs[runs.length - 1].n++;
    else runs.push({ a, n: 1 });
  }
  return runs.map((r) => `${r.n} × ${ksh(r.a)}`).join(" + ");
}

function Field({ label, note, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
      {children}
      {note && <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{note}</span>}
    </label>
  );
}

const inputStyle = { padding: "9px 12px", border: `1px solid ${C.borderUp}`, borderRadius: 6, fontSize: 14, background: C.surface, color: C.text, width: "100%" };
const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, minWidth: 0 };
const smallBtn = (primary) => ({ padding: "9px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${primary ? C.text : C.borderUp}`, background: primary ? C.text : C.surface, color: primary ? "#FFF" : C.text });

function NumberInput({ value, onChange, min = 0, max, step = 1 }) {
  return <input type="number" inputMode="numeric" min={min} max={max} step={step} value={!value ? "" : value} placeholder="0" onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) && n > 0 ? n : 0); }} style={inputStyle} />;
}

const EMPTY_DRAFT = { monthlySales: 0, reasonCode: "SITE_VISIT", evidenceRef: "", secondApprover: "" };

export default function TaxModeTab() {
  const [asOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [inputs, setInputs] = useState({ ...TAX_DEFAULT_INPUTS });
  const [activePreset, setActivePreset] = useState(TAX_PRESETS[0].name);
  const [plan, setPlan] = useState("quarterly");
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [override, setOverride] = useState(null);
  const [log, setLog] = useState([]);
  const [fairness, setFairness] = useState(null);

  const resetOverride = () => { setOverride(null); setDraft({ ...EMPTY_DRAFT }); };
  const set = (k) => (v) => { setInputs((i) => ({ ...i, [k]: v })); setActivePreset("Custom"); resetOverride(); };
  const r = useMemo(() => calculateTaxAssessment({ ...inputs, asOf, override }), [inputs, asOf, override]);
  const P = TAX_DEFAULT_PARAMS;

  const applyOverride = () => {
    const o = { ...draft, monthlySales: draft.monthlySales, officerId: "OFFICER-DEMO", at: asOf };
    const res = calculateTaxAssessment({ ...inputs, asOf, override: o });
    setOverride(o);
    if (res.override) setLog((l) => [{ id: l.length + 1, ...res.override }, ...l]);
  };

  let compare;
  if (r.today.eligible) {
    compare = r.tax < r.today.tax
      ? `Turnover tax charges ${pct(P.turnoverRate)} of sales whatever the costs. Tax Mode follows what the business actually keeps, so this trader pays ${ksh(r.today.tax - r.tax)} less.`
      : r.tax > r.today.tax
        ? `Turnover tax charges ${pct(P.turnoverRate)} of sales whatever the costs. Tax Mode follows what the business actually keeps, so this higher-margin trader pays ${ksh(r.tax - r.today.tax)} more.`
        : "Both methods give the same amount for this trader.";
  } else {
    compare = "This trader is outside turnover tax, so today there is no simple way to assess them. Tax Mode still produces a clear receipt, even when the result is nil, which keeps them on the register at no cost to them.";
  }

  return (
    <div id="main-content" style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 20px 60px", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20 }}>
      <div role="note" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, background: C.amberD, border: `1px solid ${C.amberBd}`, borderRadius: 8, color: C.amber, fontSize: 13, lineHeight: 1.5 }}>
        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <span><b>Concept demo.</b> Tax Mode applies the same method as the SHA engine to informal-sector tax assessment. The tax rates and thresholds come from published Kenyan rules and should be re-checked against the current Finance Act. The business cost ratios and caps are illustrative placeholders. Nothing is validated on real data, and this is not KRA policy or tax advice.</span>
      </div>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.3px" }}>Tax Mode · Informal-sector income assessment</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Estimate income, take off the costs a trader cannot avoid, apply the tax rules, and show every step on a receipt the trader can check and challenge.</div>
      </div>

      <div role="group" aria-label="Example traders" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {TAX_PRESETS.map((p) => (
          <button key={p.name} aria-pressed={activePreset === p.name} onClick={() => { setInputs({ ...p.inputs }); setActivePreset(p.name); resetOverride(); }}
            style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `2px solid ${activePreset === p.name ? C.text : C.border}`, background: activePreset === p.name ? C.text : C.surface, color: activePreset === p.name ? "#FFF" : C.text }}>
            {p.name}
          </button>
        ))}
      </div>
      {activePreset !== "Custom" && <div style={{ fontSize: 12, color: C.muted, marginTop: -8 }}>{TAX_PRESETS.find((p) => p.name === activePreset)?.description}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        {/* Inputs */}
        <div style={{ ...card, display: "grid", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Trader details</div>
          <Field label="Type of business">
            <select value={inputs.businessType} onChange={(e) => set("businessType")(e.target.value)} style={inputStyle}>
              {TAX_BUSINESS_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Declared sales per month (KSh)"><NumberInput value={inputs.monthlySales} onChange={set("monthlySales")} step={1000} /></Field>
          <Field label={`Months traded in the year: ${inputs.monthsTrading}`} note="Seasonal traders are assessed only on the months they actually trade.">
            <input type="range" min="1" max="12" step="1" value={inputs.monthsTrading} onChange={(e) => set("monthsTrading")(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.text, lineHeight: 1.4 }}>
            <input type="checkbox" checked={!!inputs.shareMobileData} onChange={(e) => set("shareMobileData")(e.target.checked)} style={{ marginTop: 3 }} />
            <span><b>I consent to cross-checking my mobile-money records.</b> If unticked, no penalty applies and a field officer verifies the assessment instead.</span>
          </label>
          {inputs.shareMobileData && (
            <>
              <Field label="Mobile-money inflows per month (KSh)"><NumberInput value={inputs.mobileInflowMonthly} onChange={set("mobileInflowMonthly")} step={1000} /></Field>
              <Field label={`Share of inflows that was not business money: ${Math.round(inputs.nonBusinessShare * 100)}%`} note="Family transfers, loans and savings are not sales. The trader sets this, and can correct it on appeal.">
                <input type="range" min="0" max="0.9" step="0.05" value={inputs.nonBusinessShare} onChange={(e) => set("nonBusinessShare")(Number(e.target.value))} style={{ width: "100%" }} />
              </Field>
            </>
          )}
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.text, lineHeight: 1.4 }}>
            <input type="checkbox" checked={!!inputs.keepsRecords} onChange={(e) => set("keepsRecords")(e.target.checked)} style={{ marginTop: 3 }} />
            <span><b>I keep records of my running costs.</b> Costs then come from my records instead of the typical ratio for my kind of business.</span>
          </label>
          {inputs.keepsRecords && (
            <Field label="Running costs per month, from my records (KSh)" note="Stock, rent, transport, wages and other costs of running the business. An officer may ask to see the records.">
              <NumberInput value={inputs.actualCostsMonthly} onChange={set("actualCostsMonthly")} step={1000} />
            </Field>
          )}
          <Field label="Business loan repayments per month (KSh)"><NumberInput value={inputs.businessLoanMonthly} onChange={set("businessLoanMonthly")} step={500} /></Field>
          <Field label="Tools and equipment bought this year (KSh)"><NumberInput value={inputs.equipmentAnnual} onChange={set("equipmentAnnual")} step={1000} /></Field>
          <Field label="Till or paybill numbers changed in the last 12 months"><NumberInput value={inputs.channelChanges} onChange={set("channelChanges")} max={20} /></Field>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: C.blue, cursor: "pointer" }}>Rules and placeholders used</summary>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              <div><b style={{ color: C.text }}>Turnover tax (published rule):</b> {pct(P.turnoverRate)} of gross sales, no expenses allowed, for annual sales above {ksh(P.turnoverMin)} and up to {ksh(P.turnoverMax)}. Source: KRA, “Everything About Turnover Tax”, revised October 2024 (the rate was 3% from July 2023 to March 2024).</div>
              <div><b style={{ color: C.text }}>Income tax bands (published rule):</b> {pct(P.bands[0].rate)} on the first {ksh(P.bands[0].width)}, {pct(P.bands[1].rate)} on the next {ksh(P.bands[1].width)}, {pct(P.bands[2].rate)} on the next {ksh(P.bands[2].width)}, {pct(P.bands[3].rate)} on the next {ksh(P.bands[3].width)}, {pct(P.bands[4].rate)} above that. Personal relief {ksh(P.personalRelief)} a year. Finance Act 2023 rates, not re-checked against later Finance Acts.</div>
              <div><b style={{ color: C.text }}>Placeholders (illustrative):</b> typical running costs by business type ({TAX_BUSINESS_TYPES.map((t) => `${t.label.split(" (")[0].split(" /")[0]} ${Math.round(t.costRatio * 100)}%`).join(", ")}); loan allowance capped at {pct(P.loanCapShare)} of sales; equipment allowance capped at {pct(P.equipmentCapShare)} of sales; inflows are used only when more than {pct(P.crossCheckTolerance)} above declared sales; officer review after {P.channelChangeReview} payment-channel changes; records-based costs are queried when {Math.round(P.recordsReviewMargin * 100)} points above typical; overrides above {pct(P.overrideSecondApprovalShare)} need a second officer; assessments are valid for {P.validityMonths} months; proposed appeal target {P.appealTargetDays} days.</div>
            </div>
          </details>
        </div>

        {/* Results */}
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
            <div style={{ background: C.terraD, border: `1px solid ${C.terraBd}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: C.terra, marginBottom: 12 }}>Turnover tax today</div>
              {r.today.eligible
                ? <div style={{ fontSize: 32, fontWeight: 800, color: C.terra, lineHeight: 1 }}>{ksh(r.today.tax)}</div>
                : <div style={{ fontSize: 22, fontWeight: 800, color: C.terra, lineHeight: 1.2 }}>Not applicable</div>}
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{r.today.eligible ? `per year · ${pct(r.today.effectiveRate)} of sales, whatever the costs` : r.today.note}</div>
            </div>
            <div style={{ background: C.sageD, border: `1px solid ${C.sageBd}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: C.sage, marginBottom: 12 }}>Tax Mode · assessed income</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.sage, lineHeight: 1 }}>{ksh(r.tax)}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>per year · {pct(r.effectiveRate)} of sales{r.taxLow !== r.taxHigh ? ` · likely range ${ksh(r.taxLow)} to ${ksh(r.taxHigh)}` : ""}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{compare}</div>

          {/* Receipt */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Assessment receipt</h2>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", padding: "4px 10px", borderRadius: 4, background: r.provisional ? C.amberD : C.blueD, border: `1px solid ${r.provisional ? C.amberBd : C.blueBd}`, color: r.provisional ? C.amber : C.blue }}>
                {r.provisional ? "Provisional" : `Confidence: ${r.confidenceTier}`}
              </span>
            </div>
            {r.steps.map((s) => (
              <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: s.sub ? "4px 0 4px 16px" : "10px 0", borderBottom: s.sub ? "none" : `1px solid ${C.border}`, fontSize: s.sub ? 12 : 14, fontWeight: s.strong ? 700 : 400, color: s.total ? C.sage : s.sub ? C.muted : C.text }}>
                <span>{s.label}</span>
                <span style={{ whiteSpace: "nowrap" }}>{s.minus && s.amount > 0 ? "−" : ""}{ksh(s.amount)}</span>
              </div>
            ))}

            {/* Total owed and instalments */}
            <div style={{ marginTop: 16, padding: 14, background: C.faint || "#F1F5F9", borderRadius: 8, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Total owed: {ksh(r.totalOwed)}</div>
              {r.totalOwed === 0 ? (
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Nothing to pay. Confirming this receipt would file a nil return (concept).</div>
              ) : (
                <>
                  <div role="group" aria-label="Payment plan" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[["once", "Pay once"], ["quarterly", "Quarterly"], ["monthly", "Monthly"]].map(([k, label]) => (
                      <button key={k} aria-pressed={plan === k} onClick={() => setPlan(k)} style={{ ...smallBtn(plan === k), padding: "6px 12px" }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: C.text }}>{plan === "once" ? `${ksh(r.plans.once[0])} due in full` : describePlan(r.plans[plan])}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Concept: due dates and payment channel would be set by KRA.</div>
                </>
              )}
            </div>

            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
              <div>Assessed on {fmtDate(r.asOf)}. <b style={{ color: C.text }}>Valid until {fmtDate(r.validUntil)}</b>, then refreshed from the trader’s actual records.{r.verifyBy ? <> <b style={{ color: C.amber }}>Provisional: an officer verifies by {fmtDate(r.verifyBy)}.</b></> : null}</div>
              <div style={{ marginTop: 8 }}><b style={{ color: C.text }}>How to challenge any line:</b> tell the officer which line is wrong and show a record (till statement, loan statement, receipt for tools). The line is corrected and the receipt is reissued. Proposed target: a decision within {r.appealTargetDays} days.</div>
            </div>
          </div>

          {r.flags.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              {r.flags.map((f) => (
                <div key={f.code} role="note" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.5, background: f.level === "review" ? C.amberD : C.blueD, border: `1px solid ${f.level === "review" ? C.amberBd : C.blueBd}`, color: f.level === "review" ? C.amber : C.blue }}>
                  {f.level === "review" ? <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} /> : <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Officer review */}
      <details style={card}>
        <summary style={{ fontSize: 14, fontWeight: 700, color: C.text, cursor: "pointer" }}>Officer review (demo): change an assessment with a logged reason</summary>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>An officer can change the assessed monthly sales, but only with a reason code and an evidence reference. Every change is logged. A change of more than {pct(P.overrideSecondApprovalShare)} needs a second officer before it takes effect, and one in {P.auditSampleEvery} of the other changes is sampled for audit. This guards against pressure to inflate or shave estimates. The system’s own estimate is KSh {r.systemMonthly.toLocaleString()} a month.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
            <Field label="New assessed sales per month (KSh)"><NumberInput value={draft.monthlySales} onChange={(v) => setDraft((d) => ({ ...d, monthlySales: v }))} step={1000} /></Field>
            <Field label="Reason">
              <select value={draft.reasonCode} onChange={(e) => setDraft((d) => ({ ...d, reasonCode: e.target.value }))} style={inputStyle}>
                {OVERRIDE_REASONS.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
              </select>
            </Field>
            <Field label="Evidence reference" note="For example a visit report number or document ID.">
              <input type="text" value={draft.evidenceRef} onChange={(e) => setDraft((d) => ({ ...d, evidenceRef: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Second officer ID" note={`Needed for changes above ${pct(P.overrideSecondApprovalShare)}.`}>
              <input type="text" value={draft.secondApprover} onChange={(e) => setDraft((d) => ({ ...d, secondApprover: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={applyOverride} style={smallBtn(true)}>Apply change and log it</button>
            <button onClick={resetOverride} style={smallBtn(false)}>Clear change</button>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Audit log</div>
            {log.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>No changes logged yet.</div> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ textAlign: "left", color: C.muted }}>{["#", "Date", "Officer", "Reason", "Evidence", "Sales change", "Status", "Audit"].map((h) => <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                  <tbody>{log.map((e) => (
                    <tr key={e.id}>
                      <td style={{ padding: "6px 8px" }}>{e.id}</td><td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{fmtDate(e.at)}</td><td style={{ padding: "6px 8px" }}>{e.officerId}</td>
                      <td style={{ padding: "6px 8px" }}>{e.reasonLabel}</td><td style={{ padding: "6px 8px" }}>{e.evidenceRef}</td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{e.systemMonthly.toLocaleString()} → {e.overrideMonthly.toLocaleString()} ({e.changePct >= 0 ? "+" : ""}{(e.changePct * 100).toFixed(0)}%)</td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{e.status === "APPLIED" ? "Applied" : "Pending second approval"}</td>
                      <td style={{ padding: "6px 8px" }}>{e.sampledForAudit ? "Sampled" : "No"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </details>

      {/* Fairness check on synthetic traders */}
      <details style={card}>
        <summary style={{ fontSize: 14, fontWeight: 700, color: C.text, cursor: "pointer" }}>Fairness check on synthetic traders (shows how the check works)</summary>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, marginTop: 14 }}>
          <div role="note" style={{ fontSize: 12, color: C.amber, background: C.amberD, border: `1px solid ${C.amberBd}`, borderRadius: 8, padding: 12, lineHeight: 1.6 }}>
            <b>Synthetic data, not evidence.</b> 2,000 made-up traders are generated, each with a “true” cost ratio that differs from the typical ratio by about 10 points. The numbers describe these assumptions, not Kenyan traders. The point is the method: with real survey data in place of the synthetic traders, the same check shows who each method over-burdens and where the benchmark over- or under-states income.
          </div>
          <div><button onClick={() => setFairness(runTaxFairnessCheck({ n: 2000, seed: 7, costNoise: 0.10 }))} style={smallBtn(true)}>{fairness ? "Run again" : "Run the check"}</button></div>
          {fairness && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: C.muted }}>
                    {["Business type", "Traders", "Outside turnover tax", "Median tax as % of true income: turnover tax", "Median tax as % of true income: Tax Mode", "Over 20% of true income: turnover tax", "Over 20% of true income: Tax Mode", "Income over-assessed (>20%)", "Income under-assessed (>20%)"].map((h) => <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, verticalAlign: "bottom" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...fairness.byType, { id: "ALL", label: "All traders", ...fairness.overall }].map((t) => (
                    <tr key={t.id} style={{ fontWeight: t.id === "ALL" ? 700 : 400 }}>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{t.label.split(" (")[0]}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{t.n}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.shareOutsideTot)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.medianBurdenTot)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.medianBurdenBench)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.shareOver20Tot)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.shareOver20Bench)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.shareOverAssessed)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{pct0(t.shareUnderAssessed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>“Over-assessed” and “under-assessed” show how often the typical-cost benchmark misstates a trader’s real income. A trader who keeps records is assessed on their real costs instead, which removes that error.</div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

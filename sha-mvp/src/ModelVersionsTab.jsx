import React from "react";

const COLORS = {
  ink: "#102033",
  muted: "#5E6B78",
  border: "#DCE3EA",
  panel: "#FFFFFF",
  soft: "#F5F8FB",
  blue: "#176B87",
  green: "#287653",
  amber: "#9A6500"
};

const money = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `KSh ${Math.round(Number(value)).toLocaleString("en-KE")}`;
};

function Stat({ label, value, note, accent }) {
  return (
    <div style={{ background: COLORS.soft, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ color: COLORS.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ color: accent || COLORS.ink, fontSize: 21, fontWeight: 750, marginTop: 5 }}>{value}</div>
      {note && <div style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.45, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function ModelPanel({ model, original }) {
  if (!model?.result) return null;
  const result = model.result;
  const deductions = original
    ? (result.deductions || [])
    : (result.calculationBreakdown?.postBaseDeductions || result.deductions || []);
  const factors = (result.factors || []).filter((item) => item && item.description).slice(0, 5);

  return (
    <section style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: original ? COLORS.green : COLORS.blue, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {original ? "Recovered historical model" : "Current branch experiment"}
          </div>
          <h3 style={{ color: COLORS.ink, fontSize: 18, lineHeight: 1.25, margin: "6px 0" }}>{model.label}</h3>
          <div style={{ color: COLORS.muted, fontSize: 11 }}>Version {model.version} · {model.id}</div>
        </div>
        <span style={{ background: COLORS.soft, border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 20, padding: "5px 9px", fontSize: 10, fontWeight: 700 }}>
          Research prototype
        </span>
      </div>

      <p style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.55, margin: "13px 0 15px" }}>{model.methodology}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
        <Stat label="Monthly contribution" value={money(result.monthlyContribution)} accent={original ? COLORS.green : COLORS.blue} />
        <Stat label="Adjusted gross income" value={money(result.adjustedGrossIncome)} />
        <Stat label={original ? "Constructed annual base" : "Annualised declared earnings"} value={money(result.estimatedAnnualIncome)} />
        <Stat label="Classification" value={result.isIndigent ? "Low-income band" : "Standard / upper"} note="Illustrative classification" />
        <Stat
          label="Evidence status"
          value="User-reported"
          note="The prototype has no live agency verification or calibrated statistical confidence interval."
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ color: COLORS.ink, fontSize: 12, fontWeight: 750, marginBottom: 7 }}>What enters this model's base</div>
        <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.55 }}>{model.baseMeaning}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ color: COLORS.ink, fontSize: 12, fontWeight: 750, marginBottom: 7 }}>Adjustment / deduction record</div>
        {deductions.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 12 }}>No deduction entries were produced for this household.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {deductions.slice(0, 7).map((item, index) => (
              <div key={`${item.name || "adjustment"}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 6 }}>
                <span style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.4 }}>{item.name || "Adjustment"}</span>
                <strong style={{ color: COLORS.ink, fontSize: 11, whiteSpace: "nowrap" }}>{money(item.amount)}</strong>
              </div>
            ))}
            {deductions.length > 7 && <div style={{ color: COLORS.muted, fontSize: 10 }}>+ {deductions.length - 7} more entries in the calculation output</div>}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ color: COLORS.ink, fontSize: 12, fontWeight: 750, marginBottom: 7 }}>Context / verification signals</div>
        <div style={{ display: "grid", gap: 6 }}>
          {factors.map((item, index) => (
            <div key={`${item.name || "factor"}-${index}`} style={{ background: COLORS.soft, borderRadius: 6, padding: 8 }}>
              <div style={{ color: COLORS.ink, fontSize: 11, fontWeight: 700 }}>{item.name}</div>
              <div style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.45, marginTop: 2 }}>{item.description}</div>
            </div>
          ))}
          {factors.length === 0 && <div style={{ color: COLORS.muted, fontSize: 12 }}>No contextual signals recorded.</div>}
        </div>
      </div>
    </section>
  );
}

export default function ModelVersionsTab({ results }) {
  const versions = results?.modelVersions;
  if (!versions?.originalAgi?.result || !versions?.declaredIncome?.result) {
    return <div style={{ color: COLORS.muted, padding: 20 }}>Both model versions are not available for this assessment. Re-run the demonstration calculation.</div>;
  }

  const difference = versions.comparison.monthlyContributionDifference;
  const differenceLabel = difference === 0
    ? "Both models return the same monthly amount for this household."
    : `${difference > 0 ? "Declared-income variant is higher by" : "Declared-income variant is lower by"} ${money(Math.abs(difference))} per month.`;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ color: COLORS.ink, fontSize: 22, margin: "0 0 6px" }}>Proposed model versions</h2>
        <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Both engines receive the same household snapshot. They are two different policy hypotheses, not two stages of one formula.
        </p>
      </div>

      <div style={{ background: "#FFF8E8", border: "1px solid #EAD7A8", borderRadius: 9, padding: 13, color: "#6F520E", fontSize: 12, lineHeight: 1.55 }}>
        <strong>Important:</strong> These are research prototypes. Neither output is the member's official SHA assessment, an official SHA premium, or a reproduction of SHA's production Regulation 21(6) Fifth Schedule means-testing instrument. The models encode different research hypotheses and use different information fields. A difference between their outputs demonstrates disagreement between methodologies, not which methodology is more accurate. The 2.75% rate and KSh 300 floor reflect statutory reference parameters under Regulation 18(1) & (2) for non-salaried households (with salaried employment governed separately under Regulation 17(1)–(2)).
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 12, alignItems: "start" }}>
        <ModelPanel model={versions.originalAgi} original />
        <ModelPanel model={versions.declaredIncome} original={false} />
      </div>

      <div style={{ background: COLORS.soft, border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: 14 }}>
        <div style={{ color: COLORS.ink, fontSize: 13, fontWeight: 750 }}>Same household · different model assumptions</div>
        <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>{differenceLabel}</div>
        <div style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.5, marginTop: 7 }}>
          The models encode different research hypotheses and use different information fields. The original asset/liquidity AGI v2.1 builds its base from retained liquidity, selected financial flows, and adjusted capital/livelihood assets. The declared-income variant starts from annualised declared net earnings and keeps capital assets and balances as contextual signals. A difference between their outputs demonstrates disagreement between methodologies, not which methodology is more accurate.
        </div>
      </div>
    </div>
  );
}

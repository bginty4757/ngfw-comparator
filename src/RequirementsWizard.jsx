import { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENTS WIZARD
// Drop-in component for NGFW Comparator.
// Props:
//   appliances  – the APPLIANCES array from App.jsx
//   vendors     – the VENDORS object from App.jsx
//   onApply     – callback({ vendorFilter, tierFilter, ffFilter }) to push
//                 wizard results back into the main comparator filters
//   onClose     – callback to dismiss the wizard
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = ["deployment", "throughput", "interfaces", "ha", "results"];

const DEPLOYMENT_OPTIONS = [
  { id: "branch",     label: "Branch / SOHO",       desc: "Remote office, retail, small site",         tiers: ["soho", "smb"],                      icon: "🏪" },
  { id: "campus",     label: "Campus / Mid-Market",  desc: "HQ, mid-size campus, distributed org",      tiers: ["smb", "midmarket"],                  icon: "🏢" },
  { id: "enterprise", label: "Enterprise Edge",      desc: "Large org perimeter, data ingress/egress",  tiers: ["midmarket", "enterprise"],            icon: "🏗" },
  { id: "datacenter", label: "Data Center / Core",   desc: "East-west, high-availability DC traffic",   tiers: ["enterprise", "datacenter"],          icon: "🖥" },
];

const FORM_FACTOR_OPTIONS = [
  { id: "desktop", label: "Desktop",    desc: "No rack space available" },
  { id: "1u",      label: "1U Rack",    desc: "Standard rack deployment" },
  { id: "2u",      label: "2U Rack",    desc: "Higher-density rack" },
  { id: "chassis", label: "Chassis",    desc: "Modular chassis" },
  { id: "any",     label: "Any",        desc: "No form factor constraint" },
];

const THROUGHPUT_PRESETS = [
  { label: "< 1 Gbps",    minFw: 0,      maxFw: 999 },
  { label: "1–5 Gbps",    minFw: 1000,   maxFw: 4999 },
  { label: "5–20 Gbps",   minFw: 5000,   maxFw: 19999 },
  { label: "20–100 Gbps", minFw: 20000,  maxFw: 99999 },
  { label: "> 100 Gbps",  minFw: 100000, maxFw: Infinity },
];

const HA_OPTIONS = [
  { id: "required",    label: "Required",       desc: "Must support HA clustering" },
  { id: "preferred",   label: "Preferred",      desc: "Nice to have, not blocking" },
  { id: "notrequired", label: "Not Required",   desc: "Single-unit deployment" },
];

const REDPSU_OPTIONS = [
  { id: "required",    label: "Required" },
  { id: "notrequired", label: "Not Required" },
];

const fmt = (n) => {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.?0+$/, "") + " Tbps";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + " Gbps";
  return n + " Mbps";
};

const MONO = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";

// ── Sub-components ────────────────────────────────────────────────────────────

function StepHeader({ step, total, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: i < step ? "#1f6feb" : i === step ? "#58a6ff" : "#21262d",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.1em", marginBottom: 4 }}>
        STEP {step + 1} OF {total}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#e6edf3", marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>{subtitle}</div>}
    </div>
  );
}

function OptionCard({ selected, onClick, icon, label, desc, accent = "#58a6ff" }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? `${accent}12` : "#0d1117",
      border: `1px solid ${selected ? accent : "#21262d"}`,
      borderRadius: 8,
      padding: "14px 16px",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: MONO,
      color: selected ? "#e6edf3" : "#8b949e",
      transition: "all 0.15s",
      width: "100%",
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
    }}>
      {icon && <span style={{ fontSize: 20, marginTop: 1 }}>{icon}</span>}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: selected ? accent : "#c9d1d9", marginBottom: 2 }}>
          {label}
        </div>
        {desc && <div style={{ fontSize: 10, color: "#6e7681", lineHeight: 1.5 }}>{desc}</div>}
      </div>
      {selected && (
        <span style={{ marginLeft: "auto", color: accent, fontSize: 14, alignSelf: "center" }}>✓</span>
      )}
    </button>
  );
}

function NavButtons({ onBack, onNext, nextLabel = "Next →", nextDisabled = false, onReset }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 28, justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "transparent", border: "1px solid #30363d",
            color: "#8b949e", borderRadius: 6, padding: "8px 16px",
            cursor: "pointer", fontSize: 11, fontFamily: MONO,
          }}>← Back</button>
        )}
        {onReset && (
          <button onClick={onReset} style={{
            background: "transparent", border: "1px solid #30363d",
            color: "#6e7681", borderRadius: 6, padding: "8px 16px",
            cursor: "pointer", fontSize: 11, fontFamily: MONO,
          }}>↺ Reset</button>
        )}
      </div>
      <button onClick={onNext} disabled={nextDisabled} style={{
        background: nextDisabled ? "#21262d" : "#1f6feb",
        border: "none",
        color: nextDisabled ? "#484f58" : "#fff",
        borderRadius: 6, padding: "8px 20px",
        cursor: nextDisabled ? "not-allowed" : "pointer",
        fontSize: 11, fontFamily: MONO, fontWeight: 700,
        letterSpacing: "0.04em",
      }}>{nextLabel}</button>
    </div>
  );
}

// ── Match scoring ─────────────────────────────────────────────────────────────

function scoreAppliance(a, reqs) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  // Tier match
  if (reqs.tiers.includes(a.tier)) { score += 30; }
  else { warnings.push("Tier outside target range"); }

  // Form factor
  if (reqs.formFactor === "any" || a.formFactor === reqs.formFactor) { score += 20; }
  else { warnings.push(`Form factor is ${a.formFactor}, not ${reqs.formFactor}`); }

  // FW throughput
  const fw = a.fwThroughput;
  if (fw != null) {
    if (fw >= reqs.minFw) {
      score += 25;
      reasons.push(`FW throughput ${fmt(fw)} meets requirement`);
    } else {
      const gap = ((reqs.minFw - fw) / reqs.minFw) * 100;
      if (gap < 20) { score += 10; warnings.push(`FW throughput slightly below requirement (${Math.round(gap)}% gap)`); }
      else { warnings.push(`FW throughput ${fmt(fw)} is below ${fmt(reqs.minFw)} requirement`); }
    }
  }

  // Threat protection
  if (reqs.minThreat > 0) {
    const tp = a.threatProtection;
    if (tp != null && tp >= reqs.minThreat) {
      score += 15;
      reasons.push(`Threat protection ${fmt(tp)} meets requirement`);
    } else if (tp == null) {
      warnings.push("Threat protection not published");
    } else {
      warnings.push(`Threat protection ${fmt(tp)} below ${fmt(reqs.minThreat)}`);
    }
  } else {
    score += 10;
  }

  // TLS inspection
  if (reqs.minTls > 0) {
    const tls = a.tlsInspection;
    if (tls != null && tls >= reqs.minTls) {
      score += 10;
      reasons.push(`TLS inspection ${fmt(tls)} meets requirement`);
    } else if (tls == null) {
      warnings.push("TLS inspection not published");
    } else {
      warnings.push(`TLS ${fmt(tls)} below ${fmt(reqs.minTls)}`);
    }
  } else {
    score += 5;
  }

  // HA
  if (reqs.ha === "required" && !a.ha) {
    score -= 40;
    warnings.push("Does NOT support HA");
  } else if (reqs.ha === "required" && a.ha) {
    score += 10;
    reasons.push("HA supported");
  }

  // Redundant PSU
  if (reqs.redundantPsu === "required" && !a.redundantPower) {
    score -= 20;
    warnings.push("No redundant PSU");
  } else if (reqs.redundantPsu === "required" && a.redundantPower) {
    score += 5;
    reasons.push("Redundant PSU available");
  }

  // Vendor preference
  if (reqs.preferredVendors.length > 0) {
    if (reqs.preferredVendors.includes(a.vendor)) { score += 15; reasons.push("Preferred vendor"); }
    else { score -= 10; }
  }

  // Wi-Fi requirement
  if (reqs.needWifi) {
    const hasWifi = /W$/i.test(a.model) ||
      (a.ports && a.ports.toLowerCase().includes("wi-fi")) ||
      (a.ports && a.ports.toLowerCase().includes("wireless"));
    if (hasWifi) { score += 10; reasons.push("Wi-Fi support available"); }
    else { warnings.push("Wi-Fi not confirmed — verify model specifications"); }
  }

  // 10 GbE requirement
  if (reqs.need10G) {
    const has10G = a.ports && /sfp\+|10gbe|10g/i.test(a.ports);
    if (has10G) { score += 10; reasons.push("10 GbE port(s) available"); }
    else { warnings.push("10 GbE ports not confirmed — verify model specifications"); }
  }

  // RFC 2544 penalty flag
  if (a.rfc2544) {
    warnings.push("RFC 2544 methodology — throughput may be optimistic");
  }

  const pct = Math.min(100, Math.max(0, score));
  const matchLevel = pct >= 75 ? "strong" : pct >= 45 ? "partial" : "weak";
  return { score: pct, matchLevel, reasons, warnings };
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ appliance, scored, vendors, rank }) {
  const [expanded, setExpanded] = useState(false);
  const vendorColor = vendors[appliance.vendor]?.color || "#58a6ff";
  const matchColor = scored.matchLevel === "strong" ? "#4ade80" : scored.matchLevel === "partial" ? "#fbbf24" : "#f87171";
  const matchLabel = scored.matchLevel === "strong" ? "STRONG MATCH" : scored.matchLevel === "partial" ? "PARTIAL MATCH" : "WEAK MATCH";

  return (
    <div style={{
      background: "#0d1117",
      border: `1px solid ${scored.matchLevel === "strong" ? "#1f3a1f" : scored.matchLevel === "partial" ? "#3a3010" : "#21262d"}`,
      borderLeft: `3px solid ${matchColor}`,
      borderRadius: 8,
      marginBottom: 10,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", cursor: "pointer",
      }} onClick={() => setExpanded(!expanded)}>
        {/* Rank badge */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: rank <= 3 ? `${matchColor}22` : "#161b22",
          border: `1px solid ${rank <= 3 ? matchColor : "#30363d"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: rank <= 3 ? matchColor : "#484f58",
          flexShrink: 0,
        }}>#{rank}</div>

        {/* Vendor + model */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: vendorColor, fontWeight: 700, fontSize: 12 }}>
              {vendors[appliance.vendor]?.name}
            </span>
            <span style={{ color: "#e6edf3", fontSize: 13, fontWeight: 700 }}>
              {appliance.model}
            </span>
            <span style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.06em" }}>
              {appliance.tier?.toUpperCase()} · {appliance.formFactor?.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
            {[
              ["FW", appliance.fwThroughput],
              ["Threat", appliance.threatProtection],
              ["TLS", appliance.tlsInspection],
              ["IPSec", appliance.ipsecVPN],
            ].map(([label, val]) => (
              <span key={label} style={{ fontSize: 10, color: "#6e7681" }}>
                <span style={{ color: "#8b949e" }}>{label}:</span> {fmt(val)}
              </span>
            ))}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.08em", color: matchColor, fontWeight: 700 }}>
            {matchLabel}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: matchColor,
            lineHeight: 1.2,
          }}>{Math.round(scored.score)}</div>
          <div style={{ fontSize: 8, color: "#6e7681" }}>/ 100</div>
        </div>

        <div style={{ color: "#484f58", fontSize: 12 }}>{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div style={{
          borderTop: "1px solid #21262d",
          padding: "12px 16px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        }}>
          {scored.reasons.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: "#4ade80", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                ✓ STRENGTHS
              </div>
              {scored.reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, paddingLeft: 8,
                  borderLeft: "2px solid #1f3a1f" }}>
                  {r}
                </div>
              ))}
            </div>
          )}
          {scored.warnings.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: "#fbbf24", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                ⚠ CONSIDERATIONS
              </div>
              {scored.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, paddingLeft: 8,
                  borderLeft: "2px solid #3a3010" }}>
                  {w}
                </div>
              ))}
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 6 }}>PORTS & MODULES</div>
            <div style={{ fontSize: 10, color: "#8b949e" }}>{appliance.ports}</div>
            {appliance.moduleOptions && appliance.moduleOptions !== "None" && (
              <div style={{ fontSize: 10, color: "#6e7681", marginTop: 2 }}>Modules: {appliance.moduleOptions}</div>
            )}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <a href={appliance.datasheet} target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: "#58a6ff", textDecoration: "none" }}>
                📄 Datasheet ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export default function RequirementsWizard({ appliances, vendors, onApply, onClose }) {
  const [step, setStep] = useState(0);

  // Step 0 – Deployment
  const [deployment, setDeployment] = useState(null);

  // Step 1 – Throughput
  const [throughputPreset, setThroughputPreset] = useState(null);
  const [customFw, setCustomFw] = useState("");
  const [customThreat, setCustomThreat] = useState("");
  const [customTls, setCustomTls] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Step 2 – Interfaces
  const [formFactor, setFormFactor] = useState("any");
  const [needWifi, setNeedWifi] = useState(false);
  const [need10G, setNeed10G] = useState(false);

  // Step 3 – HA & Resilience
  const [haReq, setHaReq] = useState("required");
  const [psuReq, setPsuReq] = useState("required");
  const [preferredVendors, setPreferredVendors] = useState([]);

  const totalSteps = STEPS.length - 1; // last is results, no progress dot for it

  const reset = () => {
    setStep(0);
    setDeployment(null);
    setThroughputPreset(null);
    setCustomFw(""); setCustomThreat(""); setCustomTls("");
    setUseCustom(false);
    setFormFactor("any");
    setNeedWifi(false); setNeed10G(false);
    setHaReq("required"); setPsuReq("required");
    setPreferredVendors([]);
  };

  // Build requirements object for scoring
  const requirements = useMemo(() => {
    const dep = DEPLOYMENT_OPTIONS.find((d) => d.id === deployment);
    const tiers = dep?.tiers || [];

    let minFw = 0, minThreat = 0, minTls = 0;
    if (useCustom) {
      minFw     = parseFloat(customFw)     * 1000 || 0; // entered in Gbps
      minThreat = parseFloat(customThreat) * 1000 || 0;
      minTls    = parseFloat(customTls)    * 1000 || 0;
    } else if (throughputPreset != null) {
      minFw = THROUGHPUT_PRESETS[throughputPreset].minFw;
    }

    return { tiers, minFw, minThreat, minTls, formFactor, ha: haReq, redundantPsu: psuReq, preferredVendors, needWifi, need10G };
  }, [deployment, throughputPreset, useCustom, customFw, customThreat, customTls, formFactor, haReq, psuReq, preferredVendors, needWifi, need10G]);

  const scoredResults = useMemo(() => {
    if (step < 4) return [];
    return appliances
      .map((a) => ({ appliance: a, scored: scoreAppliance(a, requirements) }))
      .sort((a, b) => b.scored.score - a.scored.score);
  }, [step, appliances, requirements]);

  const strongMatches  = scoredResults.filter((r) => r.scored.matchLevel === "strong");
  const partialMatches = scoredResults.filter((r) => r.scored.matchLevel === "partial");
  const topResults     = [...strongMatches, ...partialMatches].slice(0, 12);

  const handleApply = () => {
    const dep = DEPLOYMENT_OPTIONS.find((d) => d.id === deployment);
    const tiers = dep?.tiers || [];
    const ffs = formFactor === "any"
      ? ["desktop", "1u", "2u", "3u", "5u", "chassis"]
      : [formFactor];
    const vKeys = preferredVendors.length > 0 ? preferredVendors : Object.keys(vendors);
    onApply({ vendorFilter: vKeys, tierFilter: tiers, ffFilter: ffs });
    onClose();
  };

  const toggleVendorPref = (v) =>
    setPreferredVendors((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );

  // ── Overlay shell ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200,
      backdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 12,
        width: "min(680px, 95vw)",
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: MONO,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }} onClick={(e) => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid #21262d",
          display: "flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, #161b22, #1a2235)",
        }}>
          <span style={{ fontSize: 20 }}>🧭</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>Requirements Wizard</div>
            <div style={{ fontSize: 10, color: "#6e7681" }}>Answer a few questions to find your best-fit appliances</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "transparent", border: "none",
            color: "#484f58", cursor: "pointer", fontSize: 18, lineHeight: 1,
            fontFamily: MONO,
          }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflow: "auto", flex: 1, padding: "24px" }}>

          {/* ── STEP 0: Deployment type ──────────────────────────────────── */}
          {step === 0 && (
            <>
              <StepHeader step={0} total={4} title="What's your deployment scenario?"
                subtitle="This sets the baseline tier range for filtering." />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DEPLOYMENT_OPTIONS.map((opt) => (
                  <OptionCard key={opt.id}
                    selected={deployment === opt.id}
                    onClick={() => setDeployment(opt.id)}
                    icon={opt.icon} label={opt.label} desc={opt.desc} />
                ))}
              </div>
              <NavButtons
                onNext={() => setStep(1)}
                nextDisabled={!deployment}
                onReset={reset}
              />
            </>
          )}

          {/* ── STEP 1: Throughput ───────────────────────────────────────── */}
          {step === 1 && (
            <>
              <StepHeader step={1} total={4} title="What throughput do you need?"
                subtitle="Select a range or enter custom values in Gbps. Note: vendor methodologies differ — see Methodology tab for caveats." />

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 8 }}>FIREWALL THROUGHPUT RANGE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {THROUGHPUT_PRESETS.map((p, i) => (
                    <OptionCard key={i}
                      selected={!useCustom && throughputPreset === i}
                      onClick={() => { setThroughputPreset(i); setUseCustom(false); }}
                      label={p.label}
                    />
                  ))}
                </div>
              </div>

              <div style={{
                border: "1px solid #21262d", borderRadius: 8, padding: "14px 16px",
                background: useCustom ? "#0d111799" : "transparent",
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={useCustom}
                    onChange={(e) => { setUseCustom(e.target.checked); if (e.target.checked) setThroughputPreset(null); }}
                    style={{ accentColor: "#58a6ff" }} />
                  <span style={{ fontSize: 11, color: "#c9d1d9", fontWeight: 700 }}>Custom minimums (Gbps)</span>
                </label>
                {useCustom && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      ["FW Throughput", customFw, setCustomFw],
                      ["Threat Protection", customThreat, setCustomThreat],
                      ["TLS Inspection", customTls, setCustomTls],
                    ].map(([label, val, setter]) => (
                      <div key={label}>
                        <div style={{ fontSize: 9, color: "#6e7681", marginBottom: 4, letterSpacing: "0.06em" }}>
                          MIN {label.toUpperCase()}
                        </div>
                        <input value={val} onChange={(e) => setter(e.target.value)}
                          placeholder="e.g. 5"
                          style={{
                            width: "100%", background: "#0d1117",
                            border: "1px solid #30363d", color: "#c9d1d9",
                            borderRadius: 6, padding: "6px 10px",
                            fontSize: 11, fontFamily: MONO, boxSizing: "border-box",
                          }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <NavButtons
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
                nextDisabled={!useCustom && throughputPreset == null}
                onReset={reset}
              />
            </>
          )}

          {/* ── STEP 2: Interfaces ───────────────────────────────────────── */}
          {step === 2 && (
            <>
              <StepHeader step={2} total={4} title="Any interface or form factor requirements?" />

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 8 }}>FORM FACTOR</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {FORM_FACTOR_OPTIONS.map((opt) => (
                    <OptionCard key={opt.id}
                      selected={formFactor === opt.id}
                      onClick={() => setFormFactor(opt.id)}
                      label={opt.label} desc={opt.desc}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 8 }}>INTERFACE REQUIREMENTS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    [needWifi, setNeedWifi, "Wi-Fi capability required", "Must support integrated or optional Wi-Fi"],
                    [need10G, setNeed10G, "10 GbE+ ports required", "Must include SFP+ or higher speed interfaces"],
                  ].map(([val, setter, label, desc]) => (
                    <label key={label} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      border: `1px solid ${val ? "#1f6feb" : "#21262d"}`,
                      borderRadius: 8, cursor: "pointer",
                      background: val ? "#1f6feb12" : "transparent",
                    }}>
                      <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)}
                        style={{ accentColor: "#58a6ff" }} />
                      <div>
                        <div style={{ fontSize: 11, color: val ? "#79c0ff" : "#c9d1d9", fontWeight: 700 }}>{label}</div>
                        <div style={{ fontSize: 10, color: "#6e7681" }}>{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <NavButtons
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                onReset={reset}
              />
            </>
          )}

          {/* ── STEP 3: HA & Vendors ─────────────────────────────────────── */}
          {step === 3 && (
            <>
              <StepHeader step={3} total={4} title="Resilience requirements & vendor preferences?" />

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 8 }}>HIGH AVAILABILITY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {HA_OPTIONS.map((opt) => (
                    <OptionCard key={opt.id}
                      selected={haReq === opt.id}
                      onClick={() => setHaReq(opt.id)}
                      label={opt.label} desc={opt.desc}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 8 }}>REDUNDANT POWER SUPPLY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {REDPSU_OPTIONS.map((opt) => (
                    <OptionCard key={opt.id}
                      selected={psuReq === opt.id}
                      onClick={() => setPsuReq(opt.id)}
                      label={opt.label}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em", marginBottom: 8 }}>
                  VENDOR PREFERENCE <span style={{ color: "#484f58", fontWeight: 400 }}>(optional — leave blank for all)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {Object.entries(vendors).map(([key, v]) => (
                    <button key={key} onClick={() => toggleVendorPref(key)} style={{
                      background: preferredVendors.includes(key) ? `${v.color}18` : "#0d1117",
                      border: `1px solid ${preferredVendors.includes(key) ? v.color : "#21262d"}`,
                      color: preferredVendors.includes(key) ? v.color : "#6e7681",
                      borderRadius: 6, padding: "8px 10px",
                      cursor: "pointer", fontSize: 10, fontFamily: MONO, fontWeight: 700,
                    }}>{v.name}</button>
                  ))}
                </div>
              </div>

              <NavButtons
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
                nextLabel="See Results →"
                onReset={reset}
              />
            </>
          )}

          {/* ── STEP 4: Results ──────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#e6edf3" }}>
                    Matching Appliances
                  </div>
                  <button onClick={() => setStep(0)} style={{
                    background: "transparent", border: "1px solid #30363d",
                    color: "#6e7681", borderRadius: 6, padding: "5px 12px",
                    cursor: "pointer", fontSize: 10, fontFamily: MONO,
                  }}>↺ Start Over</button>
                </div>

                {/* Summary pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {[
                    { label: DEPLOYMENT_OPTIONS.find((d) => d.id === deployment)?.label, color: "#58a6ff" },
                    { label: useCustom ? `FW ≥ ${customFw}G` : THROUGHPUT_PRESETS[throughputPreset]?.label, color: "#79c0ff" },
                    { label: formFactor === "any" ? "Any Form Factor" : formFactor.toUpperCase(), color: "#8b949e" },
                    { label: `HA: ${haReq}`, color: haReq === "required" ? "#4ade80" : "#6e7681" },
                    { label: `PSU: ${psuReq}`, color: psuReq === "required" ? "#4ade80" : "#6e7681" },
                    ...preferredVendors.map((v) => ({ label: vendors[v]?.name, color: vendors[v]?.color })),
                  ].filter((p) => p.label).map((p, i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: "3px 8px",
                      borderRadius: 4, border: `1px solid ${p.color}44`,
                      color: p.color, letterSpacing: "0.06em",
                    }}>{p.label}</span>
                  ))}
                </div>

                {/* Match stats */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16,
                }}>
                  {[
                    { label: "Strong Matches", count: strongMatches.length, color: "#4ade80" },
                    { label: "Partial Matches", count: partialMatches.length, color: "#fbbf24" },
                    { label: "Total Evaluated", count: scoredResults.length, color: "#6e7681" },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: "#0d1117", border: "1px solid #21262d",
                      borderRadius: 8, padding: "10px 12px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                      <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.06em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {topResults.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6e7681" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 13 }}>No strong or partial matches found.</div>
                  <div style={{ fontSize: 11, marginTop: 6 }}>Try relaxing your requirements.</div>
                  <button onClick={() => setStep(0)} style={{
                    marginTop: 16, background: "#1f6feb", border: "none",
                    color: "#fff", borderRadius: 6, padding: "8px 20px",
                    cursor: "pointer", fontSize: 11, fontFamily: MONO,
                  }}>Adjust Requirements</button>
                </div>
              )}

              {topResults.map(({ appliance, scored }, i) => (
                <ResultCard key={appliance.id} appliance={appliance} scored={scored}
                  vendors={vendors} rank={i + 1} />
              ))}

              {topResults.length > 0 && (
                <div style={{
                  marginTop: 20, padding: "14px 16px",
                  background: "#0d1117", border: "1px solid #21262d",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 10, lineHeight: 1.6 }}>
                    Apply these results to the main comparator to filter the table to the deployment tiers and form factor from your requirements.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleApply} style={{
                      flex: 1, background: "#1f6feb", border: "none",
                      color: "#fff", borderRadius: 6, padding: "9px",
                      cursor: "pointer", fontSize: 11, fontFamily: MONO, fontWeight: 700,
                    }}>Apply Filters to Comparator →</button>
                    <button onClick={onClose} style={{
                      background: "#21262d", border: "1px solid #30363d",
                      color: "#8b949e", borderRadius: 6, padding: "9px 16px",
                      cursor: "pointer", fontSize: 11, fontFamily: MONO,
                    }}>Close</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

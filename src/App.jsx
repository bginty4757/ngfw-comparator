import { useState, useMemo, useEffect } from "react";
import RequirementsWizard from "./RequirementsWizard";
import { VENDORS, APPLIANCES } from "./firewallData";



// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// Strips spaces, dashes, dots, underscores for fuzzy model matching
const normalize = (s) => s.toLowerCase().replace(/[\s\-_.]/g, "");

const fmt = (n) => {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.?0+$/, "") + " Tbps";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + " Gbps";
  return n + " Mbps";
};
const fmtSessions = (n) => {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return n;
};

const TIERS = [
  { id: "soho",       label: "SOHO / Branch" },
  { id: "smb",        label: "SMB" },
  { id: "midmarket",  label: "Mid-Market" },
  { id: "enterprise", label: "Enterprise" },
  { id: "datacenter", label: "Data Center" },
];
const FORM_FACTORS = [
  { id: "desktop", label: "Desktop" },
  { id: "1u",      label: "1U Rack" },
  { id: "2u",      label: "2U Rack" },
  { id: "3u",      label: "3U Rack" },
  { id: "5u",      label: "5U Rack" },
  { id: "chassis", label: "Chassis" },
];

const GENS = [...new Set(APPLIANCES.map((a) => a.gen).filter(Boolean))].sort();

const COLUMNS = [
  { key: "vendor",          label: "Vendor",        w: "100px", dv: true  },
  { key: "model",           label: "Model",         w: "120px", dv: true  },
  { key: "partNumber",      label: "Part #",        w: "140px", dv: false },
  { key: "tier",            label: "Tier",          w: "90px",  dv: true  },
  { key: "formFactor",      label: "Form",          w: "70px",  dv: true  },
  { key: "fwThroughput",    label: "FW Thruput ⓘ",  w: "125px", fmt: fmt, dv: true,  tooltip: "Each vendor uses a different test methodology. See Methodology tab for details. Numbers are NOT directly comparable across vendors." },
  { key: "ipsThroughput",   label: "IPS/Threat ⓘ",  w: "115px", fmt: fmt, dv: true,  tooltip: "IPS throughput where published. For Palo Alto, no standalone IPS figure exists — their 'Threat Prevention' number (App-ID + IPS + AV + AS + WildFire + DNS + logging all enabled) is shown instead, marked with TP. These are stricter bundled tests and are NOT equivalent to a standalone IPS figure from other vendors." },
  { key: "tlsInspection",   label: "TLS Inspect",   w: "100px", fmt: fmt, dv: true  },
  { key: "threatProtection",label: "Threat Prot.",  w: "100px", fmt: fmt, dv: false },
  { key: "ipsecVPN",        label: "IPSec VPN",     w: "100px", fmt: fmt, dv: true  },
  { key: "maxSessions",     label: "Max Sessions",  w: "110px", fmt: fmtSessions, dv: false },
  { key: "ports",           label: "Ports",         w: "185px", dv: false },
  { key: "moduleOptions",   label: "Modules",       w: "170px", dv: false },
  { key: "ha",              label: "HA",            w: "55px",  dv: true  },
  { key: "redundantPower",  label: "Redund. PSU",   w: "90px",  dv: false },
  { key: "rfc2544",         label: "RFC 2544",      w: "80px",  dv: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FirewallComparator() {
  const [vendorFilter, setVendorFilter] = useState(Object.keys(VENDORS));
  const [tierFilter, setTierFilter]     = useState(TIERS.map((t) => t.id));
  const [search, setSearch]             = useState("");
  const [sortKey, setSortKey]           = useState("fwThroughput");
  const [sortDir, setSortDir]           = useState("desc");
  const [customBench, setCustomBench]   = useState({});
  const [editingBench, setEditingBench] = useState(null);
  const [benchField, setBenchField]     = useState("fwThroughput");
  const [benchValue, setBenchValue]     = useState("");
  const [showNotes, setShowNotes]       = useState(null);
  const [activeTab, setActiveTab]       = useState("compare");
  const [showWizard, setShowWizard]     = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [showSideBySide, setShowSideBySide]       = useState(false);
  const [windowWidth, setWindowWidth]   = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("ngfw-theme") !== "light"; } catch { return true; }
  });
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    const v = isDark ? {
      "--c-bg":"#0d1117","--c-surface":"#161b22","--c-row2":"#111820","--c-hover":"#1c2333",
      "--c-border":"#21262d","--c-border2":"#30363d",
      "--c-text":"#c9d1d9","--c-text2":"#8b949e","--c-text3":"#6e7681",
      "--c-text4":"#484f58","--c-text5":"#444c56","--c-textbright":"#e6edf3",
      "--c-blue":"#58a6ff","--c-blue2":"#79c0ff","--c-blue-bg":"#1f6feb",
      "--c-blue-a1":"#1f6feb22","--c-blue-a2":"#1f6feb44","--c-blue-a3":"#1f6feb88",
      "--c-anchor":"#0f1e35","--c-match":"#0d160d","--c-pinned":"#0d1a2e",
      "--c-pinned-hdr":"#131a26","--c-wiz":"#1f3a1f","--c-warn":"#1a1200",
      "--c-deep":"#0f2c4a","--c-pin-btn":"#1f3a5f","--c-cell-border":"transparent",
    } : {
      "--c-bg":"#f6f8fa","--c-surface":"#ffffff","--c-row2":"#f0f4f8","--c-hover":"#e8edf3",
      "--c-border":"#d0d7de","--c-border2":"#c6cdd5",
      "--c-text":"#1f2328","--c-text2":"#57606a","--c-text3":"#6e7781",
      "--c-text4":"#8c959f","--c-text5":"#9ea3a9","--c-textbright":"#1f2328",
      "--c-blue":"#0969da","--c-blue2":"#218bff","--c-blue-bg":"#0969da",
      "--c-blue-a1":"#0969da22","--c-blue-a2":"#0969da44","--c-blue-a3":"#0969da88",
      "--c-anchor":"#dbeafe","--c-match":"#dcfce7","--c-pinned":"#eff6ff",
      "--c-pinned-hdr":"#dbeafe","--c-wiz":"#f0fff4","--c-warn":"#fff8e6",
      "--c-deep":"#dbeafe","--c-pin-btn":"#dbeafe","--c-cell-border":"#d0d7de",
    };
    Object.entries(v).forEach(([k, val]) => document.documentElement.style.setProperty(k, val));
    try { localStorage.setItem("ngfw-theme", isDark ? "dark" : "light"); } catch {}
  }, [isDark]);
  const isMobile = windowWidth < 768;

  // ── Competitive matchup ──
  const [matchupAnchor, setMatchupAnchor]         = useState(null);
  const [matchupVendors, setMatchupVendors]       = useState(new Set());
  const [matchupOverrides, setMatchupOverrides]   = useState({});
  const [expandedFallback, setExpandedFallback]   = useState(new Set());

  // ── Manual multi-pin ──
  const [pinnedIds, setPinnedIds] = useState(new Set());

  const [visCols, setVisCols] = useState(
    () => new Set(COLUMNS.filter((c) => c.dv).map((c) => c.key))
  );

  const toggleCol = (key) => {
    if (key === "vendor" || key === "model") return;
    setVisCols((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const activeCols = COLUMNS.filter((c) => visCols.has(c.key));

  // ── Matchup logic ──
  const searchedExact = useMemo(() => {
    if (!search.trim()) return null;
    const norm = normalize(search);
    const matches = APPLIANCES.filter((a) =>
      normalize(a.model).includes(norm) ||
      VENDORS[a.vendor]?.name.toLowerCase().includes(search.toLowerCase())
    );
    return matches.length === 1 ? matches[0] : null;
  }, [search]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const norm = normalize(search);
    return APPLIANCES.filter((a) =>
      normalize(a.model).includes(norm) ||
      normalize(VENDORS[a.vendor]?.name || "").includes(norm)
    ).slice(0, 10);
  }, [search]);

  const matchupResults = useMemo(() => {
    if (!matchupAnchor || matchupVendors.size === 0) return [];
    const anchor = APPLIANCES.find((a) => a.id === matchupAnchor);
    if (!anchor) return [];

    // Multi-metric log-scale distance scoring.
    // Log scale is used because throughput values span orders of magnitude —
    // a 10→20 Gbps gap is proportionally far more significant than 100→110 Gbps.
    // IPS is weighted highest as it's the most directly cross-vendor comparable metric.
    const MATCH_METRICS = [
      { key: "fwThroughput",                         weight: 1.0 },
      { key: "ipsThroughput",  fallback: "threatProtection", weight: 1.5 },
      { key: "tlsInspection",                        weight: 0.75 },
      { key: "ipsecVPN",                             weight: 0.5 },
    ];
    const logVal = (row, m) => {
      const v = row[m.key] ?? (m.fallback ? row[m.fallback] : null);
      return v != null && v > 0 ? Math.log(v) : null;
    };
    const anchorLogs = MATCH_METRICS.map((m) => logVal(anchor, m));

    return [...matchupVendors].map((vendorKey) => {
      const competitors = APPLIANCES.filter((a) => a.vendor === vendorKey);
      if (!competitors.length) return null;
      const scored = competitors.map((c) => {
        let totalDelta = 0;
        let weightUsed = 0;
        MATCH_METRICS.forEach((m, i) => {
          const aLog = anchorLogs[i];
          const cLog = logVal(c, m);
          if (aLog != null && cLog != null) {
            totalDelta += m.weight * Math.abs(aLog - cLog);
            weightUsed += m.weight;
          }
        });
        return { ...c, _score: weightUsed > 0 ? totalDelta / weightUsed : Infinity };
      }).sort((a, b) => a._score - b._score);

      const bestBySpec = scored[0];
      const formFactorPeer = scored.find((c) => c.formFactor === anchor.formFactor) || null;

      // Top 2 per form factor, ordered by FORM_FACTORS layout
      const groups = FORM_FACTORS.map((ff) => {
        const items = scored.filter((c) => c.formFactor === ff.id).slice(0, 2);
        return items.length ? { ff: ff.id, label: ff.label, items } : null;
      }).filter(Boolean);

      const suggested = bestBySpec;
      const chosen = matchupOverrides[vendorKey]
        ? competitors.find((c) => c.id === matchupOverrides[vendorKey]) || suggested
        : suggested;
      return {
        vendorKey, anchor, chosen, competitors, suggested,
        bestBySpec, formFactorPeer, groups, scored,
      };
    }).filter(Boolean);
  }, [matchupAnchor, matchupVendors, matchupOverrides]);

  const matchupRows = useMemo(() => {
    if (!matchupResults.length) return [];
    const applyCustom = (a) => ({ ...a, ...(customBench[a.id] || {}) });
    const anchor = matchupResults[0].anchor;
    return [
      { ...applyCustom(anchor), _role: "anchor" },
      ...matchupResults.map((r) => ({ ...applyCustom(r.chosen), _role: "match", _matchVendor: r.vendorKey })),
    ];
  }, [matchupResults, customBench]);

  const clearMatchup = () => {
    setMatchupAnchor(null);
    setMatchupVendors(new Set());
    setMatchupOverrides({});
    setExpandedFallback(new Set());
  };

  // ── Pin toggle ──
  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pinnedRows = useMemo(() =>
    APPLIANCES
      .filter((a) => pinnedIds.has(a.id))
      .map((a) => ({ ...a, ...(customBench[a.id] || {}) })),
    [pinnedIds, customBench]
  );

  // ── Filtered table rows (excludes matchup models and manually pinned) ──
  const filteredData = useMemo(() => {
    const matchupAnchorId = matchupResults[0]?.anchor?.id;
    const matchupChosenIds = new Set(matchupResults.map((r) => r.chosen?.id).filter(Boolean));

    let data = APPLIANCES.filter(
      (a) =>
        !pinnedIds.has(a.id) &&
        a.id !== matchupAnchorId &&
        !matchupChosenIds.has(a.id) &&
        vendorFilter.includes(a.vendor) &&
        tierFilter.includes(a.tier) &&
        (search === "" ||
          normalize(a.model).includes(normalize(search)) ||
          VENDORS[a.vendor]?.name.toLowerCase().includes(search.toLowerCase()))
    ).map((a) => ({
      ...a,
      ...(customBench[a.id] || {}),
    }));

    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "boolean") return sortDir === "asc" ? (av ? -1 : 1) : (av ? 1 : -1);
      if (typeof av === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return data;
  }, [vendorFilter, tierFilter, search, sortKey, sortDir, customBench, pinnedIds, matchupResults]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const resetFilters = () => {
    setVendorFilter(Object.keys(VENDORS));
    setTierFilter(TIERS.map((t) => t.id));
    setSearch("");
  };

  const exportCSV = () => {
    const headers = COLUMNS.map((c) => c.label).join(",");
    const rows = filteredData.map((row) =>
      COLUMNS.map((col) => {
        const v = row[col.key];
        if (col.key === "vendor") return VENDORS[v]?.name || v;
        if (col.key === "tier") return TIERS.find((t) => t.id === v)?.label || v;
        if (col.key === "formFactor") return FORM_FACTORS.find((f) => f.id === v)?.label || v;
        if (typeof v === "boolean") return v ? "Yes" : "No";
        if (v == null) return "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "firewall-comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveBench = () => {
    if (!editingBench || !benchValue) return;
    const parsed = parseFloat(benchValue);
    if (isNaN(parsed)) return;
    setCustomBench((prev) => ({
      ...prev,
      [editingBench]: { ...prev[editingBench], [benchField]: parsed },
    }));
    setEditingBench(null);
    setBenchValue("");
  };

  const tierLabel = (t) => TIERS.find((x) => x.id === t)?.label || t;
  const ffLabel   = (f) => FORM_FACTORS.find((x) => x.id === f)?.label || f;

  // Returns the metric type used in the IPS/Threat column for a given row
  const metricType = (row) => {
    if (row.vendor === "meraki") return null;
    if (row.vendor === "paloalto") return row.threatProtection != null ? "TP" : null;
    return row.ipsThroughput != null ? "IPS" : null;
  };

  const cellVal = (row, col) => {
    const v = row[col.key];
    if (col.key === "vendor") return (
      <span style={{ color: VENDORS[v]?.color, fontWeight: 700 }}>
        {VENDORS[v]?.name}
      </span>
    );
    if (col.key === "model") return (
      <span>
        {v}
        {row.gen && (
          <span style={{ marginLeft: 5, fontSize: 8, color: "#9a7fe0", background: "#1a1226", border: "1px solid #6e40c944", borderRadius: 3, padding: "1px 4px", letterSpacing: "0.03em", fontWeight: 400, verticalAlign: "middle" }}>
            {row.gen}
          </span>
        )}
      </span>
    );
    if (col.key === "tier") return tierLabel(v);
    if (col.key === "formFactor") return ffLabel(v);
    if (col.key === "ha" || col.key === "redundantPower") {
      return v ? <span style={{ color: "#4ade80" }}>✓</span> : <span style={{ color: "#f87171" }}>✗</span>;
    }
    if (col.key === "rfc2544") {
      return v ? <span title="RFC 2544 methodology" style={{ color: "#fbbf24", fontWeight: 700 }}>⚑ Yes</span> : "—";
    }
    if (col.key === "ipsThroughput") {
      if (v != null) return (
        <div style={{ lineHeight: 1.3 }}>
          <div>{col.fmt(v)}</div>
          <div style={{ fontSize: 9, color: "#4ade80", marginTop: 2, letterSpacing: "0.02em" }}>IPS</div>
        </div>
      );
      if (row.vendor === "paloalto" && row.threatProtection != null) {
        return (
          <div style={{ lineHeight: 1.3 }}>
            <div>{fmt(row.threatProtection)}</div>
            <div style={{ fontSize: 9, color: "#fa582d", marginTop: 2, letterSpacing: "0.02em" }}>TP (bundled)</div>
          </div>
        );
      }
      if (row.vendor === "meraki") return (
        <div style={{ lineHeight: 1.3 }}>
          <div>—</div>
          <div style={{ fontSize: 9, color: "var(--c-text4)", marginTop: 2, letterSpacing: "0.02em" }}>not published</div>
        </div>
      );
      return "—";
    }
    if (col.key === "fwThroughput") {
      const method = row.fwMethod;
      const methodColor =
        method?.includes("App-ID") ? "#fa582d" :
        method?.includes("L3 rule only") ? "#00bceb" :
        method?.includes("RFC 2544") ? "#fbbf24" :
        "var(--c-text2)";
      return (
        <div style={{ lineHeight: 1.3 }}>
          <div>{col.fmt(v)}</div>
          {method && (
            <div style={{ fontSize: 9, color: methodColor, marginTop: 2, letterSpacing: "0.02em" }}>
              {row.rfc2544 ? "⚑ " : ""}{method}
            </div>
          )}
        </div>
      );
    }
    if (col.key === "partNumber") {
      if (!v) return <span style={{ color: "var(--c-text3)", fontSize: 11 }}>—</span>;
      return (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--c-text2)", letterSpacing: "0.03em" }}>
          {v}
        </span>
      );
    }
    if (col.fmt) return col.fmt(v);
    return v ?? "—";
  };

  const hasCustom = (id) => !!customBench[id] && Object.keys(customBench[id]).length > 0;

  // ── Shared row renderer ──
  const renderDataRow = (row, bgColor, noteKey, extraNoteCell) => (
    <>
      <tr key={row.id}
        style={{ background: bgColor, borderBottom: "1px solid var(--c-blue-a1)", transition: "background 0.15s" }}
      >
        {activeCols.map((col) => {
          const isCustomizable = col.fmt && !["vendor","tier","formFactor"].includes(col.key);
          const isCustomized = customBench[row.id]?.[col.key] != null;
          return (
            <td key={col.key}
              onClick={() => {
                if (isCustomizable) {
                  setEditingBench(row.id);
                  setBenchField(col.key);
                  setBenchValue(row[col.key] ? String(row[col.key]) : "");
                }
              }}
              style={{
                padding: "8px 12px", whiteSpace: "nowrap",
                cursor: isCustomizable ? "pointer" : "default",
                color: isCustomized ? "#fbbf24" : "var(--c-text)",
              }}>
              {cellVal(row, col)}
            </td>
          );
        })}
        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
          <button onClick={() => setShowNotes(showNotes === noteKey ? null : noteKey)}
            style={{ background: "transparent", border: "1px solid var(--c-border2)", color: "var(--c-text2)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>
            {showNotes === noteKey ? "▲" : "▼"}
          </button>
          {extraNoteCell}
        </td>
      </tr>
      {showNotes === noteKey && (
        <tr key={`${noteKey}-note`} style={{ background: "var(--c-bg)" }}>
          <td colSpan={activeCols.length + 1} style={{ padding: "10px 16px" }}>
            <div style={{ background: "var(--c-surface)", borderLeft: `3px solid ${VENDORS[row.vendor]?.color}`, borderRadius: 4, padding: "10px 14px", fontSize: 11, color: "var(--c-text2)", lineHeight: 1.7 }}>
              <div style={{ marginBottom: 6 }}>
                <a href={row.datasheet} target="_blank" rel="noreferrer" style={{ color: "var(--c-blue)", fontSize: 10, textDecoration: "none" }}>📄 Datasheet / Source ↗</a>
                {row.gen && <span style={{ marginLeft: 12, color: "var(--c-text3)", fontSize: 10 }}>Gen: {row.gen}</span>}
              </div>
              {row.notes}
            </div>
          </td>
        </tr>
      )}
    </>
  );

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      background: "var(--c-bg)",
      minHeight: "100vh",
      color: "var(--c-text)",
    }}>
      {/* ── HEADER ── */}
      <div style={{
        background: isDark ? "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a2235 100%)" : "linear-gradient(135deg, #f0f4f8 0%, #ffffff 50%, #eef2f7 100%)",
        borderBottom: "1px solid var(--c-border)",
        padding: isMobile ? "12px 14px" : "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 16,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 8,
          background: "linear-gradient(135deg, #0073CF, #00a0e3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, boxShadow: "0 0 16px #0073CF55",
        }}>🛡</div>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 15 : 20, fontWeight: 800, letterSpacing: "0.02em",
            background: "linear-gradient(90deg, var(--c-blue), var(--c-blue2))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            NGFW Comparator
          </h1>
          {!isMobile && (
            <p style={{ margin: 0, fontSize: 11, color: "var(--c-text3)", letterSpacing: "0.05em" }}>
              SOPHOS XGS · FORTINET · PALO ALTO · MERAKI · WATCHGUARD · SONICWALL
            </p>
          )}
        </div>
        {!isMobile && (
          <div style={{ marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--c-blue)", letterSpacing: "0.08em", fontWeight: 600 }}>
              Performance · Specs · Competitive Intelligence
            </div>
            <div style={{ fontSize: 10, color: "var(--c-text5)", marginTop: 3, letterSpacing: "0.05em" }}>
              {Object.keys(VENDORS).length} vendors · {APPLIANCES.length}+ models · benchmark data current as of Q3 2026
            </div>
          </div>
        )}

        <div style={{ marginLeft: isMobile ? "auto" : undefined, display: "flex", gap: isMobile ? 5 : 8 }}>
          {[["compare", "Comparator"], ["methodology", "Methodology"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "var(--c-blue-bg)" : "transparent",
                border: `1px solid ${activeTab === tab ? "var(--c-blue-bg)" : "var(--c-border2)"}`,
                color: activeTab === tab ? "#fff" : "var(--c-text)",
                borderRadius: 6, padding: "5px 14px", cursor: "pointer",
                fontSize: 11, fontFamily: "inherit", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>{label}</button>
          ))}
          <button onClick={() => setIsDark(d => !d)} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{
            background: "var(--c-border)", border: "1px solid var(--c-border2)",
            color: "var(--c-text)", borderRadius: 6, padding: "5px 11px",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            letterSpacing: "0.04em", fontWeight: 600,
          }}>{isDark ? "☀ Light" : "🌙 Dark"}</button>
          <button onClick={exportCSV} style={{
            background: "var(--c-border)", border: "1px solid var(--c-border2)",
            color: "var(--c-blue2)", borderRadius: 6, padding: "5px 14px",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            letterSpacing: "0.04em",
          }}>⬇ Export CSV</button>
        </div>
      </div>

      {activeTab === "methodology" ? (
        <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 24px" }}>
          <h2 style={{ color: "var(--c-blue)", borderBottom: "1px solid var(--c-border)", paddingBottom: 12 }}>
            Performance Methodology Notes
          </h2>
          {[
            { vendor: "Sophos XGS", color: "#0073CF", text: `FW Throughput: HTTP 512KB response, no security features enabled (Keysight-Ixia BreakingPoint). Raw stateful inspection only.
IPS: Default IPS ruleset, 512 KB HTTP object size.
IPSec VPN: Multiple tunnels, 512 KB HTTP response.
TLS Inspection: IPS enabled + HTTPS, mixed cipher suites.
Threat Protection: FW + IPS + App Control + Malware Prevention, 200 KB HTTP (Enterprise Traffic Mix).
NGFW: IPS + App Control, 512 KB HTTP.
NOTE: Gen 2 desktop models (XGS 88–128) use virtual FastPath on SFOS v21+.` },
            { vendor: "Fortinet FortiGate", color: "#EE3124", text: `FW Throughput: UDP 1518/512/64 byte packets, no security features enabled. Raw stateful inspection only.
IPS / NGFW / Threat Protection: Enterprise Mix traffic with logging enabled.
SSL Inspection: Average HTTPS sessions, mixed ciphers, IPS enabled.
NGFW = FW + IPS + Application Control (Enterprise Mix).
Threat Protection = FW + IPS + App Control + Malware (Enterprise Mix).
IPSec VPN: AES256-SHA256, 512 byte packets.
Fortinet uses NP7/NP6 ASICs for hardware-accelerated flows.` },
            { vendor: "Palo Alto Networks", color: "#FA582D", text: `FW Throughput: 64KB HTTP/appmix — App-ID and logging ENABLED. This is effectively an NGFW number, NOT raw stateful.
⚠ Palo Alto's FW Throughput is NOT comparable to raw stateful numbers from Sophos, Fortinet, SonicWall, or Meraki. It is already a higher-bar, real-world-closer figure.
Threat Prevention: App-ID + IPS + AV + AS + WildFire + DNS Security + File Blocking + logging.
IPSec VPN: AES-256.
NOTE: Palo Alto does NOT publish a separate IPS-only or TLS-inspect throughput figure.` },
            { vendor: "Cisco Meraki MX", color: "#00BCEB", text: `FW Throughput: EMIX traffic, L3 firewall rule only — no IPS, no AV, no App-ID, no TLS inspection enabled.
⚠ Meraki FW Throughput is raw stateful L3 performance. It is NOT an NGFW number. IPS, TLS Inspection, and Threat Protection throughput figures are NOT published by Cisco Meraki for any MX model.
Meraki is cloud-managed only; detailed throughput metrics are intentionally abstracted from datasheets.` },
            { vendor: "WatchGuard Firebox", color: "#E31837", text: `⚑ FW Throughput: RFC 2544 methodology — unidirectional UDP, synthetic traffic, no security features. This produces significantly higher numbers than real-world mixed traffic or EMIX testing.
IPS and TLS Inspection: Measured with Total Security Suite enabled.
⚠ WatchGuard FW Throughput is the least comparable number in this tool — RFC 2544 synthetic traffic inflates the figure vs all other vendors.` },
            { vendor: "SonicWall NSa / NSsp / TZ", color: "#FF6600", text: `FW Throughput: RFC 2544 methodology for TZ series (synthetic UDP, flagged ⚑). NSa/NSsp use multi-core stateful inspection.
IPS: Industry-standard testing with DPI engine.
TLS Inspection: Full DPI-SSL with certificate inspection.
Threat Protection: GAV + IPS + Application Control + CFS + Bot Control.
NGFW: App Control + IPS.
NOTE: Max DPI and DPI-SSL session counts are significantly lower than SPI session counts — check Notes column per model.` },
          ].map((m) => (
            <div key={m.vendor} style={{
              background: "var(--c-surface)", border: "1px solid var(--c-border)",
              borderLeft: `3px solid ${m.color}`, borderRadius: 8,
              padding: "16px 20px", marginBottom: 16,
            }}>
              <h3 style={{ margin: "0 0 10px", color: m.color, fontSize: 13 }}>{m.vendor}</h3>
              <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.8, color: "var(--c-text2)", whiteSpace: "pre-wrap" }}>{m.text}</pre>
            </div>
          ))}
          <div style={{ background: "var(--c-surface)", border: "1px solid #f0883e44", borderRadius: 8, padding: 16 }}>
            <h3 style={{ margin: "0 0 8px", color: "#f0883e", fontSize: 13 }}>⚠ Comparison Caveat</h3>
            <p style={{ margin: 0, fontSize: 11, color: "var(--c-text2)", lineHeight: 1.8 }}>
              Different vendors use different test methodologies. Sophos uses Enterprise Traffic Mix (ETM) for Threat Protection; Fortinet uses Enterprise Mix; Palo Alto combines all services (App-ID + full threat prevention). Meraki does not publish threat throughput. WatchGuard uses RFC 2544 for FW throughput. Direct numeric comparisons across vendors should be treated as approximations. Always test in your own environment.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", height: isMobile ? "calc(100vh - 57px)" : "calc(100vh - 77px)" }}>
          {/* ── SIDEBAR ── */}
          {isMobile && showMobileSidebar && (
            <div onClick={() => setShowMobileSidebar(false)}
              style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 250 }} />
          )}
          <div style={{
            width: 250, flexShrink: 0, background: "var(--c-surface)",
            borderRight: "1px solid var(--c-border)", padding: "14px 12px",
            overflowY: "auto",
            ...(isMobile ? {
              position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 300,
              transform: showMobileSidebar ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s ease",
              boxShadow: showMobileSidebar ? "4px 0 32px #000000aa" : "none",
            } : {}),
          }}>
            {/* Mobile sidebar header */}
            {isMobile && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>
                <span style={{ fontSize: 10, color: "var(--c-blue)", fontWeight: 700, letterSpacing: "0.08em" }}>FILTERS & CONTROLS</span>
                <button onClick={() => setShowMobileSidebar(false)}
                  style={{ background: "transparent", border: "none", color: "var(--c-text3)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
              </div>
            )}

            {/* Requirements Wizard */}
            <button onClick={() => setShowWizard(true)} style={{
              width: "100%", background: "var(--c-wiz)", border: "1px solid #2ea043",
              color: "#4ade80", borderRadius: 6, padding: "9px 0",
              cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              letterSpacing: "0.04em", marginBottom: 14,
              fontWeight: 700, textAlign: "center", display: "block",
            }}>🧭 Requirements Wizard</button>

            {/* Search with autocomplete */}
            <div style={{ position: "relative", marginBottom: 6 }}>
              <input
                placeholder="🔍  Search model…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                style={{
                  width: "100%", background: "var(--c-bg)", border: "1px solid var(--c-border2)",
                  borderRadius: showSuggestions && suggestions.length > 0 ? "6px 6px 0 0" : 6,
                  color: "var(--c-text)", padding: "6px 10px",
                  fontSize: 11, fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 400,
                  background: "var(--c-surface)", border: "1px solid var(--c-border2)", borderTop: "none",
                  borderRadius: "0 0 6px 6px", overflow: "hidden",
                  boxShadow: "0 8px 24px #00000088",
                }}>
                  {suggestions.map((a, i) => (
                    <div key={a.id}
                      onMouseDown={() => { setSearch(a.model); setShowSuggestions(false); }}
                      style={{
                        padding: "7px 10px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        borderTop: i === 0 ? "none" : "1px solid var(--c-border)",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--c-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ color: VENDORS[a.vendor]?.color, fontSize: 9, fontWeight: 700, minWidth: 52, flexShrink: 0 }}>
                        {VENDORS[a.vendor]?.name}
                      </span>
                      <span style={{ color: "var(--c-textbright)", fontSize: 11 }}>{a.model}</span>
                      {a.gen && (
                        <span style={{ marginLeft: "auto", fontSize: 8, color: "#9a7fe0", flexShrink: 0 }}>{a.gen}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exact match → set as anchor */}
            {searchedExact && searchedExact.id !== matchupAnchor && (
              <button
                onClick={() => { setMatchupAnchor(searchedExact.id); setMatchupVendors(new Set()); setMatchupOverrides({}); }}
                style={{
                  width: "100%", background: "var(--c-deep)", border: "1px solid var(--c-blue-bg)",
                  borderRadius: 5, color: "var(--c-blue)", padding: "5px 8px",
                  fontSize: 10, fontFamily: "inherit", cursor: "pointer",
                  marginBottom: 10, textAlign: "left",
                }}>
                ⚔ Use <strong>{searchedExact.model}</strong> for competitive matchup
              </button>
            )}
            {!searchedExact && search.trim() && (
              <div style={{ fontSize: 9, color: "var(--c-text3)", marginBottom: 10 }}>
                Multiple results — narrow search to pin a model for competitive matchup
              </div>
            )}

            {/* Competitive matchup UI */}
            {matchupAnchor && (() => {
              const anchor = APPLIANCES.find((a) => a.id === matchupAnchor);
              return anchor ? (
                <div style={{ background: "var(--c-bg)", border: "1px solid var(--c-blue-bg)", borderRadius: 6, padding: "10px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: "var(--c-blue)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>⚔ COMPETITIVE MATCHUP</div>

                  {/* Anchor */}
                  <div style={{ fontSize: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 8, color: "var(--c-text3)", letterSpacing: "0.06em", marginBottom: 2 }}>ANCHOR MODEL</div>
                    <span style={{ color: VENDORS[anchor.vendor]?.color, fontWeight: 700 }}>{VENDORS[anchor.vendor]?.name}</span>
                    <span style={{ color: "var(--c-textbright)", marginLeft: 6, fontWeight: 700 }}>{anchor.model}</span>
                  </div>

                  {/* Vendor picker - multi-select */}
                  <div style={{ fontSize: 8, color: "var(--c-text3)", letterSpacing: "0.06em", marginBottom: 4 }}>COMPARE TO VENDORS (pick any)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                    {Object.entries(VENDORS)
                      .filter(([key]) => key !== anchor.vendor)
                      .map(([key, v]) => (
                        <FilterChip key={key} label={v.name} color={v.color}
                          active={matchupVendors.has(key)}
                          onClick={() => {
                            setMatchupVendors((prev) => {
                              const next = new Set(prev);
                              next.has(key) ? next.delete(key) : next.add(key);
                              return next;
                            });
                            setMatchupOverrides((prev) => { const n = { ...prev }; delete n[key]; return n; });
                          }} />
                      ))}
                  </div>

                  {/* Per-vendor matches — grouped by form factor with best-by-spec / form-factor-peer badges */}
                  {matchupResults.map((r) => {
                    const isExpanded = expandedFallback.has(r.vendorKey);
                    return (
                      <div key={r.vendorKey} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 8, color: VENDORS[r.vendorKey]?.color, letterSpacing: "0.06em", marginBottom: 4, fontWeight: 700 }}>
                          {VENDORS[r.vendorKey]?.name.toUpperCase()} MATCHES
                        </div>
                        {r.groups.map((g) => (
                          <div key={g.ff} style={{ marginBottom: 5 }}>
                            <div style={{ fontSize: 8, color: "var(--c-text3)", letterSpacing: "0.06em", marginBottom: 2 }}>
                              {g.label.toUpperCase()}
                            </div>
                            {g.items.map((c) => {
                              const isChosen = r.chosen?.id === c.id;
                              const isBestBySpec = r.bestBySpec?.id === c.id;
                              const isFFPeer = r.formFactorPeer?.id === c.id;
                              const methodDiffers = anchor.fwMethod && c.fwMethod && c.fwMethod !== anchor.fwMethod;
                              const ipsLike = c.ipsThroughput ?? c.threatProtection;
                              return (
                                <div key={c.id}
                                  onClick={() => setMatchupOverrides((prev) => ({ ...prev, [r.vendorKey]: c.id }))}
                                  style={{
                                    background: isChosen ? "var(--c-match)" : "var(--c-surface)",
                                    border: `1px solid ${isChosen ? VENDORS[r.vendorKey]?.color : "var(--c-border2)"}`,
                                    borderRadius: 5, padding: "5px 8px", marginBottom: 3, fontSize: 10,
                                    cursor: "pointer",
                                  }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 10, color: isChosen ? VENDORS[r.vendorKey]?.color : "var(--c-text3)", fontWeight: 700 }}>
                                      {isChosen ? "◉" : "○"}
                                    </span>
                                    <span style={{ color: VENDORS[r.vendorKey]?.color, fontWeight: 700 }}>{c.model}</span>
                                    {isBestBySpec && (
                                      <span style={{ fontSize: 8, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.04em" }} title="Closest by spec metrics (FW · IPS · TLS · VPN)">★ BEST BY SPEC</span>
                                    )}
                                    {isFFPeer && !isBestBySpec && (
                                      <span style={{ fontSize: 8, color: "var(--c-blue2)", fontWeight: 700, letterSpacing: "0.04em" }} title="Closest model in the same form factor as the anchor">◆ FORM-FACTOR PEER</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 9, color: "var(--c-text3)", marginTop: 2, marginLeft: 16 }}>
                                    FW {fmt(c.fwThroughput)} · IPS {fmt(ipsLike)} · VPN {fmt(c.ipsecVPN)}
                                  </div>
                                  {methodDiffers && (
                                    <div style={{ fontSize: 8, color: "#fbbf24", marginTop: 2, marginLeft: 16, letterSpacing: "0.02em" }}
                                      title={`Anchor (${anchor.model}): ${anchor.fwMethod}\nThis (${c.model}): ${c.fwMethod}`}>
                                      ⚠ FW test method differs — see tooltip
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        <button onClick={() => setExpandedFallback((prev) => {
                            const n = new Set(prev); n.has(r.vendorKey) ? n.delete(r.vendorKey) : n.add(r.vendorKey); return n;
                          })}
                          style={{ width: "100%", background: "transparent", border: "1px dashed var(--c-border2)", color: "var(--c-text3)", borderRadius: 4, padding: "3px 0", cursor: "pointer", fontSize: 9, fontFamily: "inherit", marginTop: 3 }}>
                          {isExpanded ? "▴ Hide all models" : `▾ Show all ${r.competitors.length} models`}
                        </button>
                        {isExpanded && (
                          <select value={r.chosen?.id || ""}
                            onChange={(e) => setMatchupOverrides((prev) => ({ ...prev, [r.vendorKey]: e.target.value || null }))}
                            style={{ width: "100%", background: "var(--c-bg)", border: "1px solid var(--c-border2)", color: "var(--c-text)", borderRadius: 5, padding: "4px 6px", fontSize: 10, fontFamily: "inherit", marginTop: 3 }}>
                            {r.scored.map((c) => {
                              const star = c.id === r.bestBySpec?.id ? " ★" : "";
                              const diamond = c.id === r.formFactorPeer?.id && c.id !== r.bestBySpec?.id ? " ◆" : "";
                              return <option key={c.id} value={c.id}>{c.model}{star}{diamond}</option>;
                            })}
                          </select>
                        )}
                      </div>
                    );
                  })}

                  <button onClick={clearMatchup}
                    style={{ width: "100%", background: "transparent", border: "1px solid var(--c-border2)", color: "var(--c-text3)", borderRadius: 4, padding: "3px 0", cursor: "pointer", fontSize: 9, fontFamily: "inherit" }}>
                    ✕ Clear matchup
                  </button>
                </div>
              ) : null;
            })()}

            {/* Manual pins list */}
            {pinnedIds.size > 0 && (
              <div style={{ marginBottom: 14, background: "var(--c-bg)", border: "1px solid #1f6feb33", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: "var(--c-blue)", letterSpacing: "0.08em", fontWeight: 700 }}>
                    📌 PINNED ({pinnedIds.size})
                  </span>
                  <button onClick={() => setPinnedIds(new Set())} style={{
                    background: "transparent", border: "none", color: "var(--c-text3)",
                    fontSize: 9, cursor: "pointer", fontFamily: "inherit", padding: 0,
                  }}>Clear all ✕</button>
                </div>
                {pinnedRows.map((row) => (
                  <div key={row.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "3px 0", borderTop: "1px solid var(--c-border)",
                  }}>
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <span style={{ color: VENDORS[row.vendor]?.color, fontSize: 9, fontWeight: 700 }}>{VENDORS[row.vendor]?.name}</span>
                      <span style={{ color: "var(--c-text)", fontSize: 10, marginLeft: 4 }}>{row.model}</span>
                    </div>
                    <button onClick={() => togglePin(row.id)} style={{
                      background: "transparent", border: "none", color: "var(--c-text4)",
                      cursor: "pointer", fontSize: 13, lineHeight: 1,
                      padding: "0 0 0 6px", flexShrink: 0,
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <Section label="VENDORS">
              {Object.entries(VENDORS).map(([key, v]) => (
                <FilterChip key={key} label={v.name} color={v.color}
                  active={vendorFilter.includes(key)}
                  onClick={() => setVendorFilter((prev) =>
                    prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
                  )} />
              ))}
            </Section>

            <Section label="TIER">
              {TIERS.map((t) => (
                <FilterChip key={t.id} label={t.label} color="var(--c-blue)"
                  active={tierFilter.includes(t.id)}
                  onClick={() => setTierFilter((prev) =>
                    prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                  )} />
              ))}
            </Section>

            <button onClick={resetFilters} style={{
              width: "100%", background: "transparent", border: "1px solid var(--c-border2)",
              color: "var(--c-text3)", borderRadius: 4, padding: "5px 0", fontSize: 9,
              fontFamily: "inherit", cursor: "pointer", marginBottom: 12,
              letterSpacing: "0.06em",
            }}>↺ Reset All Filters</button>

            <div style={{ padding: "10px 8px", background: "var(--c-bg)", borderRadius: 6, border: "1px solid var(--c-border)" }}>
              <div style={{ fontSize: 10, color: "var(--c-text3)", marginBottom: 4, letterSpacing: "0.06em" }}>SHOWING</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--c-blue)" }}>{filteredData.length}</div>
              <div style={{ fontSize: 10, color: "var(--c-text3)" }}>of {APPLIANCES.length} appliances</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 9, color: "var(--c-text5)", lineHeight: 1.8 }}>
              ⚑ = RFC 2544 methodology (synthetic)<br />
              — = Not published<br />
              <span style={{ color: "#fa582d" }}>■</span> FW method = App-ID on (Palo Alto)<br />
              <span style={{ color: "#00bceb" }}>■</span> FW method = L3 rule only (Meraki)<br />
              <span style={{ color: "#fbbf24" }}>■</span> FW method = RFC 2544 (synthetic)<br />
              <span style={{ color: "var(--c-text2)" }}>■</span> FW method = raw stateful<br />
              Click numeric cells to add custom benchmark.<br />
              Click 📌 on any row to pin it to the top.
            </div>
          </div>

          {/* ── MAIN TABLE ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Column toggles */}
            <div style={{ flexShrink: 0, padding: "6px 12px", borderBottom: "1px solid var(--c-border)",
              background: "var(--c-surface)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, color: "var(--c-text4)", letterSpacing: "0.07em", marginRight: 2 }}>COLS:</span>
              {COLUMNS.map((col) => {
                const on = visCols.has(col.key);
                const locked = col.key === "vendor" || col.key === "model";
                return (
                  <button key={col.key} onClick={() => toggleCol(col.key)} style={{
                    background: on ? "var(--c-border)" : "transparent",
                    border: `1px solid ${on ? "var(--c-border2)" : "var(--c-border)"}`,
                    color: on ? "var(--c-text)" : "var(--c-text3)",
                    borderRadius: 4, padding: "2px 7px", cursor: locked ? "default" : "pointer",
                    fontSize: 9, fontFamily: "inherit", opacity: locked ? 0.45 : 1,
                  }}>{col.label.replace(" ⓘ", "")}</button>
                );
              })}
              <button onClick={() => setVisCols(new Set(COLUMNS.map((c) => c.key)))}
                style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--c-border)",
                  color: "var(--c-text3)", borderRadius: 4, padding: "2px 7px",
                  cursor: "pointer", fontSize: 9, fontFamily: "inherit" }}>All</button>
              <button onClick={() => setVisCols(new Set(COLUMNS.filter((c) => c.dv).map((c) => c.key)))}
                style={{ background: "transparent", border: "1px solid var(--c-border)",
                  color: "var(--c-text3)", borderRadius: 4, padding: "2px 7px",
                  cursor: "pointer", fontSize: 9, fontFamily: "inherit" }}>Reset</button>
            </div>

            {/* Scrollable table */}
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "var(--c-surface)", position: "sticky", top: 0, zIndex: 10 }}>
                    {activeCols.map((col) => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        style={{
                          padding: "10px 12px", textAlign: "left",
                          color: sortKey === col.key ? "var(--c-blue)" : "var(--c-text3)",
                          cursor: "pointer", whiteSpace: "nowrap",
                          borderBottom: "2px solid var(--c-border)",
                          minWidth: col.w, letterSpacing: "0.04em", fontSize: 10,
                          userSelect: "none",
                        }}>
                        {col.tooltip ? (
                          <span>
                            {col.label.replace(" ⓘ", "")}
                            <span title={col.tooltip} style={{ cursor: "help", color: "var(--c-blue)", marginLeft: 3 }}>ⓘ</span>
                          </span>
                        ) : col.label}
                        {sortKey === col.key && (
                          <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </th>
                    ))}
                    <th style={{ padding: "10px 12px", color: "var(--c-text3)", borderBottom: "2px solid var(--c-border)", fontSize: 10, letterSpacing: "0.04em", minWidth: 80 }}>NOTES</th>
                  </tr>
                </thead>
                <tbody>

                  {/* ── COMPETITIVE MATCHUP SECTION ── */}
                  {matchupRows.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={activeCols.length + 1} style={{
                          background: "var(--c-anchor)", padding: "5px 16px", fontSize: 9,
                          color: "var(--c-blue)", letterSpacing: "0.1em", fontWeight: 700,
                          borderBottom: "1px solid var(--c-blue-a1)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span>
                              ⚔ COMPETITIVE MATCHUP
                              <span style={{ color: "var(--c-text3)", fontWeight: 400, marginLeft: 8 }}>
                                {matchupResults[0]?.anchor?.model}
                                {matchupResults.length > 0 && (
                                  <> <span style={{ color: "var(--c-border2)" }}>vs</span> {matchupResults.map((r) => r.chosen.model).join(", ")}</>
                                )}
                              </span>
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setShowSideBySide(true)} style={{
                                background: "var(--c-blue-bg)", border: "1px solid var(--c-blue-bg)",
                                color: "#fff", borderRadius: 4, padding: "2px 10px",
                                cursor: "pointer", fontSize: 9, fontFamily: "inherit", fontWeight: 700,
                                letterSpacing: "0.04em",
                              }}>⊞ Side-by-Side</button>
                              <button onClick={clearMatchup} style={{
                                background: "transparent", border: "1px solid var(--c-border2)",
                                color: "var(--c-text3)", borderRadius: 4, padding: "1px 8px",
                                cursor: "pointer", fontSize: 9, fontFamily: "inherit",
                              }}>Clear</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {matchupRows.map((row) => {
                        const vc = row._matchVendor ? VENDORS[row._matchVendor]?.color : null;
                        return renderDataRow(
                          row,
                          row._role === "anchor" ? "var(--c-anchor)" : "var(--c-match)",
                          `matchup-${row.id}`,
                          <span style={{
                            marginLeft: 8, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
                            color: row._role === "anchor" ? "var(--c-blue)" : (vc || "#4ade80"),
                            border: `1px solid ${row._role === "anchor" ? "var(--c-blue-bg)" : (vc ? vc + "66" : "#238636")}`,
                            borderRadius: 3, padding: "1px 5px",
                          }}>{row._role === "anchor" ? "ANCHOR" : "AUTO-MATCH"}</span>
                        );
                      })}
                      {/* Metric mismatch warning */}
                      {(() => {
                        const anchorRow = matchupRows[0];
                        const anchorMT = metricType(anchorRow);
                        const matchRows = matchupRows.slice(1);

                        const unpublished = matchRows.filter((r) => metricType(r) === null);
                        const methodMismatch = matchRows.filter((r) => metricType(r) !== null && metricType(r) !== anchorMT);

                        if (!unpublished.length && !methodMismatch.length) return null;

                        return (
                          <tr>
                            <td colSpan={activeCols.length + 1} style={{ background: "var(--c-warn)", padding: "7px 16px", borderBottom: "1px solid #f0883e22" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {methodMismatch.length > 0 && (
                                  <span style={{ fontSize: 9, color: "#f0883e", letterSpacing: "0.02em" }}>
                                    ⚠ Methodology gap — {anchorRow.model} reports <strong>{anchorMT}</strong> (standalone engine only)
                                    {methodMismatch.map((r) => (
                                      <span key={r.id}> · {r.model} reports <strong>{metricType(r)}</strong> (full threat stack — IPS + AV + App-ID + more running simultaneously)</span>
                                    ))}
                                    . The {methodMismatch.map((r) => r.model).join(", ")} figure is a stricter, harder test — a direct numeric comparison overstates {anchorRow.model}'s relative performance.
                                  </span>
                                )}
                                {unpublished.length > 0 && (
                                  <span style={{ fontSize: 9, color: "var(--c-text2)", letterSpacing: "0.02em" }}>
                                    ℹ {unpublished.map((r) => `${VENDORS[r.vendor]?.name} (${r.model})`).join(", ")} {unpublished.length === 1 ? "does" : "do"} not publish IPS or threat throughput figures — no comparison is possible for this metric.
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                      <tr><td colSpan={activeCols.length + 1} style={{ borderBottom: "2px solid var(--c-blue-a2)", padding: 0 }} /></tr>
                    </>
                  )}

                  {/* ── MANUALLY PINNED SECTION ── */}
                  {pinnedRows.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={activeCols.length + 1} style={{
                          background: "var(--c-pinned-hdr)", padding: "5px 16px", fontSize: 9,
                          color: "var(--c-blue)", letterSpacing: "0.1em", fontWeight: 700,
                          borderBottom: "1px solid var(--c-blue-a1)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span>📌 PINNED — {pinnedRows.length} MODEL{pinnedRows.length !== 1 ? "S" : ""}</span>
                            <button onClick={() => setPinnedIds(new Set())} style={{
                              background: "transparent", border: "1px solid var(--c-border2)",
                              color: "var(--c-text3)", borderRadius: 4, padding: "1px 8px",
                              cursor: "pointer", fontSize: 9, fontFamily: "inherit",
                            }}>Clear all</button>
                          </div>
                        </td>
                      </tr>
                      {pinnedRows.map((row) =>
                        renderDataRow(
                          row,
                          "var(--c-pinned)",
                          `pinned-${row.id}`,
                          <button onClick={() => togglePin(row.id)} title="Unpin"
                            style={{ marginLeft: 6, background: "var(--c-pin-btn)", border: "1px solid var(--c-blue-bg)", color: "var(--c-blue)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>📌</button>
                        )
                      )}
                      <tr><td colSpan={activeCols.length + 1} style={{ borderBottom: "2px solid var(--c-blue-a2)", padding: 0 }} /></tr>
                    </>
                  )}

                  {/* ── MAIN ROWS ── */}
                  {filteredData.map((row, i) => (
                    <>
                      <tr key={row.id}
                        style={{
                          background: i % 2 === 0 ? "var(--c-bg)" : "var(--c-row2)",
                          borderBottom: "1px solid var(--c-border)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--c-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "var(--c-bg)" : "var(--c-row2)"}
                      >
                        {activeCols.map((col) => {
                          const isCustomizable = col.fmt && !["vendor","tier","formFactor"].includes(col.key);
                          const isCustomized = customBench[row.id]?.[col.key] != null;
                          return (
                            <td key={col.key}
                              onClick={() => {
                                if (isCustomizable) {
                                  setEditingBench(row.id);
                                  setBenchField(col.key);
                                  setBenchValue(row[col.key] ? String(row[col.key]) : "");
                                }
                              }}
                              style={{
                                padding: "8px 12px", whiteSpace: "nowrap",
                                cursor: isCustomizable ? "pointer" : "default",
                                color: isCustomized ? "#fbbf24" : "var(--c-text)",
                              }}>
                              {cellVal(row, col)}
                            </td>
                          );
                        })}
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => setShowNotes(showNotes === row.id ? null : row.id)}
                            style={{ background: "transparent", border: "1px solid var(--c-border2)", color: "var(--c-text2)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>
                            {showNotes === row.id ? "▲" : "▼"}
                          </button>
                          {hasCustom(row.id) && (
                            <span title="Has custom benchmarks" style={{ marginLeft: 6, color: "#fbbf24", fontSize: 12 }}>★</span>
                          )}
                          <button title="Pin to top" onClick={() => togglePin(row.id)}
                            style={{ marginLeft: 6, background: "transparent", border: "1px solid var(--c-border2)", color: "var(--c-text3)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>📌</button>
                        </td>
                      </tr>
                      {showNotes === row.id && (
                        <tr key={`${row.id}-note`} style={{ background: "var(--c-bg)" }}>
                          <td colSpan={activeCols.length + 1} style={{ padding: "10px 16px" }}>
                            <div style={{ background: "var(--c-surface)", borderLeft: `3px solid ${VENDORS[row.vendor]?.color}`, borderRadius: 4, padding: "10px 14px", fontSize: 11, color: "var(--c-text2)", lineHeight: 1.7 }}>
                              <div style={{ marginBottom: 6 }}>
                                <a href={row.datasheet} target="_blank" rel="noreferrer" style={{ color: "var(--c-blue)", fontSize: 10, textDecoration: "none" }}>📄 Datasheet / Source ↗</a>
                                {row.gen && <span style={{ marginLeft: 12, color: "var(--c-text3)", fontSize: 10 }}>Gen: {row.gen}</span>}
                              </div>
                              {row.notes}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && pinnedRows.length === 0 && matchupRows.length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: "var(--c-text3)" }}>
                  No appliances match the current filters.
                </div>
              )}
              {filteredData.length === 0 && (pinnedRows.length > 0 || matchupRows.length > 0) && (
                <div style={{ textAlign: "center", padding: 30, color: "var(--c-text4)", fontSize: 11 }}>
                  No additional appliances match the current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM BENCHMARK MODAL ── */}
      {editingBench && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000aa",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }} onClick={() => setEditingBench(null)}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border2)", borderRadius: 10, padding: "24px 28px", width: 380 }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", color: "var(--c-blue)", fontSize: 14 }}>Custom Benchmark Entry</h3>
            <p style={{ margin: "0 0 16px", color: "var(--c-text3)", fontSize: 11 }}>
              {APPLIANCES.find((a) => a.id === editingBench)?.model} — {COLUMNS.find((c) => c.key === benchField)?.label}
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: "var(--c-text3)", display: "block", marginBottom: 4 }}>METRIC</label>
              <select value={benchField} onChange={(e) => setBenchField(e.target.value)}
                style={{ width: "100%", background: "var(--c-bg)", border: "1px solid var(--c-border2)", color: "var(--c-text)", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontFamily: "inherit" }}>
                {COLUMNS.filter((c) => c.fmt && !["vendor","tier","formFactor"].includes(c.key)).map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "var(--c-text3)", display: "block", marginBottom: 4 }}>VALUE (in Mbps, or sessions for Max Sessions)</label>
              <input value={benchValue} onChange={(e) => setBenchValue(e.target.value)} placeholder="e.g. 1500"
                style={{ width: "100%", background: "var(--c-bg)", border: "1px solid var(--c-border2)", color: "var(--c-text)", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveBench} style={{ flex: 1, background: "var(--c-blue-bg)", border: "none", color: "#fff", borderRadius: 6, padding: "8px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Save Benchmark ★</button>
              <button onClick={() => setEditingBench(null)} style={{ flex: 1, background: "var(--c-border)", border: "1px solid var(--c-border2)", color: "var(--c-text2)", borderRadius: 6, padding: "8px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
            </div>
            {customBench[editingBench] && (
              <button onClick={() => { setCustomBench((prev) => { const n = {...prev}; delete n[editingBench]; return n; }); setEditingBench(null); }}
                style={{ marginTop: 8, width: "100%", background: "transparent", border: "1px solid #f85149", color: "#f85149", borderRadius: 6, padding: "6px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                Clear all custom benchmarks for this model
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE FILTER FAB ── */}
      {isMobile && activeTab === "compare" && !showMobileSidebar && (
        <button onClick={() => setShowMobileSidebar(true)} style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 200,
          background: "linear-gradient(135deg, var(--c-blue-bg), #388bfd)",
          border: "none", borderRadius: "50%",
          width: 54, height: 54, fontSize: 22, cursor: "pointer",
          boxShadow: "0 4px 20px var(--c-blue-a3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>⚙</button>
      )}

      {showWizard && (
        <RequirementsWizard
          appliances={APPLIANCES}
          vendors={VENDORS}
          onApply={({ vendorFilter, tierFilter }) => {
            setVendorFilter(vendorFilter);
            setTierFilter(tierFilter);
          }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* ── SIDE-BY-SIDE MODAL ── */}
      {showSideBySide && matchupRows.length > 0 && (
        <SideBySideModal
          rows={matchupRows}
          vendors={VENDORS}
          onClose={() => setShowSideBySide(false)}
          fmt={fmt}
          fmtSessions={fmtSessions}
          tierLabel={tierLabel}
          ffLabel={ffLabel}
        />
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: "var(--c-text3)", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({ label, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}22` : "transparent",
      border: `1px solid ${active ? color : "var(--c-border2)"}`,
      color: active ? color : "var(--c-text3)",
      borderRadius: 4, padding: "4px 8px", cursor: "pointer",
      fontSize: 10, fontFamily: "inherit", textAlign: "left",
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDE-BY-SIDE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SideBySideModal({ rows, vendors, onClose, fmt, fmtSessions, tierLabel, ffLabel }) {
  // Each row is one appliance; first is anchor, rest are matches.
  const numCols = rows.length;

  // Helper: find the index(es) with the max numeric value for a given field
  const winnerIdx = (field) => {
    const vals = rows.map((r) => r[field]);
    const max = Math.max(...vals.filter((v) => v != null));
    if (!isFinite(max)) return new Set();
    return new Set(vals.reduce((acc, v, i) => { if (v === max) acc.push(i); return acc; }, []));
  };

  const specRowStyle = (idx, winners, isText) => ({
    padding: "7px 12px",
    background: (!isText && winners.has(idx) && winners.size < numCols) ? "rgba(74,222,128,0.13)" : "transparent",
    borderRadius: 4,
    border: (!isText && winners.has(idx) && winners.size < numCols) ? "1px solid rgba(74,222,128,0.4)" : "1px solid transparent",
    borderLeft: (!isText && winners.has(idx) && winners.size < numCols) ? "3px solid #4ade80" : "3px solid transparent",
  });

  const PERF_FIELDS = [
    { key: "fwThroughput",     label: "FW Throughput",      fmt: fmt,         note: "⚠ Methods differ — not directly comparable across vendors" },
    { key: "ipsThroughput",    label: "IPS Throughput",     fmt: fmt          },
    { key: "threatProtection", label: "Threat Protection",  fmt: fmt          },
    { key: "tlsInspection",    label: "TLS Inspection",     fmt: fmt          },
    { key: "ipsecVPN",         label: "IPSec VPN",          fmt: fmt          },
    { key: "maxSessions",      label: "Max Sessions",       fmt: fmtSessions  },
  ];
  const CONN_FIELDS = [
    { key: "ports",          label: "Ports",           isText: true },
    { key: "moduleOptions",  label: "Module Options",  isText: true },
    { key: "wifi",           label: "Wi-Fi",           isText: true },
    { key: "expansionSlots", label: "Expansion Slots", fmt: (v) => v != null ? String(v) : "—" },
  ];
  const PHYS_FIELDS = [
    { key: "formFactorDetail", label: "Form Factor",     isText: true },
    { key: "ha",               label: "HA Support",      isBool: true },
    { key: "redundantPower",   label: "Redundant PSU",   isBool: true },
    { key: "rfc2544",          label: "RFC 2544 Method", isBool: true, warnTrue: true },
  ];

  const renderVal = (row, field) => {
    const v = row[field.key];
    if (field.isBool) {
      if (field.warnTrue) return v ? <span style={{ color: "#fbbf24", fontWeight: 700 }}>⚑ Yes</span> : <span style={{ color: "#4ade80" }}>No</span>;
      return v ? <span style={{ color: "#4ade80" }}>✓ Yes</span> : <span style={{ color: "#f87171" }}>✗ No</span>;
    }
    if (v == null) return <span style={{ color: "var(--c-text4)" }}>—</span>;
    if (field.isText) return <span style={{ fontSize: 11 }}>{v}</span>;
    return field.fmt ? field.fmt(v) : String(v);
  };

  const SectionHeader = ({ label }) => (
    <div style={{
      fontSize: 9, letterSpacing: "0.1em", fontWeight: 700, color: "var(--c-text3)",
      textTransform: "uppercase", borderBottom: "1px solid var(--c-border)",
      paddingBottom: 6, marginBottom: 8, marginTop: 16,
    }}>{label}</div>
  );

  const FieldRow = ({ fields, fieldDef }) => {
    const winners = fieldDef.isText || fieldDef.isBool ? new Set() : winnerIdx(fieldDef.key);
    return (
      <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${numCols}, 1fr)`, gap: 4, marginBottom: 4, alignItems: "start" }}>
        <div style={{ fontSize: 10, color: "var(--c-text3)", paddingTop: 8, paddingRight: 8 }}>
          {fieldDef.label}
          {fieldDef.note && <div style={{ fontSize: 8, color: "#f0883e", marginTop: 2 }}>{fieldDef.note}</div>}
        </div>
        {rows.map((row, i) => {
          const isWinner = !fieldDef.isText && !fieldDef.isBool && winners.has(i) && winners.size < numCols;
          return (
            <div key={row.id} style={specRowStyle(i, winners, fieldDef.isText || fieldDef.isBool)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: isWinner ? 700 : 600, color: isWinner ? "#4ade80" : "var(--c-textbright)" }}>
                  {renderVal(row, fieldDef)}
                </div>
                {isWinner && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                    background: "#166534", color: "#4ade80",
                    border: "1px solid #4ade8066", borderRadius: 3,
                    padding: "1px 6px", whiteSpace: "nowrap",
                  }}>▲ WINNER</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--c-bg)", margin: "32px auto", borderRadius: 12,
          border: "1px solid var(--c-border2)", width: "min(96vw, 1200px)",
          fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)",
          padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--c-blue)", letterSpacing: "0.04em" }}>⊞ Side-by-Side Comparison</div>
            <div style={{ fontSize: 10, color: "var(--c-text3)", marginTop: 3 }}>
              {rows.map((r) => `${vendors[r.vendor]?.name} ${r.model}`).join("  vs  ")}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--c-border)", border: "1px solid var(--c-border2)",
            color: "var(--c-text)", borderRadius: 6, padding: "5px 14px",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit",
          }}>✕ Close</button>
        </div>

        <div style={{ padding: "20px 24px 32px" }}>
          {/* Device header cards */}
          <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${numCols}, 1fr)`, gap: 4, marginBottom: 4 }}>
            <div />
            {rows.map((row, i) => {
              const vc = vendors[row.vendor];
              return (
                <div key={row.id} style={{
                  background: "var(--c-surface)", border: `1px solid ${vc?.color}55`,
                  borderTop: `3px solid ${vc?.color}`, borderRadius: 8, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 10, color: vc?.color, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>
                    {vc?.name?.toUpperCase()}
                    {i === 0 && <span style={{ marginLeft: 8, fontSize: 8, background: "var(--c-blue-a1)", border: "1px solid var(--c-blue-a2)", color: "var(--c-blue)", borderRadius: 3, padding: "1px 5px" }}>ANCHOR</span>}
                    {i > 0 && <span style={{ marginLeft: 8, fontSize: 8, background: `${vc?.color}22`, border: `1px solid ${vc?.color}44`, color: vc?.color, borderRadius: 3, padding: "1px 5px" }}>AUTO-MATCH</span>}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--c-textbright)", marginBottom: 4 }}>{row.model}</div>
                  {row.gen && <div style={{ fontSize: 9, color: "#9a7fe0", marginBottom: 6 }}>{row.gen}</div>}
                  <div style={{ fontSize: 10, color: "var(--c-text3)", marginBottom: 4 }}>
                    {tierLabel(row.tier)} · {ffLabel(row.formFactor)}
                  </div>
                  {row.partNumber && (
                    <div style={{ fontSize: 9, color: "var(--c-text4)", marginBottom: 8 }}>P/N: {row.partNumber}</div>
                  )}
                  <a href={row.datasheet} target="_blank" rel="noreferrer" style={{
                    display: "inline-block", fontSize: 9, color: "#fff",
                    background: vc?.color, borderRadius: 4, padding: "3px 10px",
                    textDecoration: "none", letterSpacing: "0.04em", fontWeight: 700,
                  }}>📄 Vendor Datasheet ↗</a>
                </div>
              );
            })}
          </div>

          <SectionHeader label="Performance" />
          {PERF_FIELDS.map((f) => <FieldRow key={f.key} fields={rows} fieldDef={f} />)}

          <SectionHeader label="Connectivity" />
          {CONN_FIELDS.map((f) => <FieldRow key={f.key} fields={rows} fieldDef={f} />)}

          <SectionHeader label="Physical & Features" />
          {PHYS_FIELDS.map((f) => <FieldRow key={f.key} fields={rows} fieldDef={f} />)}

          <SectionHeader label="Notes" />
          <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${numCols}, 1fr)`, gap: 4 }}>
            <div />
            {rows.map((row) => {
              const vc = vendors[row.vendor];
              return (
                <div key={row.id} style={{
                  background: "var(--c-surface)", borderLeft: `3px solid ${vc?.color}`,
                  borderRadius: 4, padding: "10px 12px", fontSize: 10, color: "var(--c-text2)", lineHeight: 1.7,
                }}>
                  {row.notes || <span style={{ color: "var(--c-text4)" }}>No additional notes.</span>}
                </div>
              );
            })}
          </div>

          {/* Methodology caveat */}
          <div style={{
            marginTop: 20, background: "var(--c-warn)", border: "1px solid #f0883e33",
            borderRadius: 6, padding: "10px 14px", fontSize: 10, color: "#f0883e", lineHeight: 1.6,
          }}>
            <strong>⚠ Methodology Caveat:</strong> FW Throughput figures use different test methodologies across vendors
            (Sophos: HTTP 512KB no security · Fortinet: UDP 1518B stateful · Palo Alto: App-ID + logging enabled · WatchGuard/SonicWall TZ: RFC 2544 synthetic UDP).
            These numbers are <strong>not directly comparable</strong>. Use the IPS/Threat column for a closer cross-vendor comparison, and refer to the Methodology tab for full details.
          </div>
        </div>
      </div>
    </div>
  );
}

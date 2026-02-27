import { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA  (sourced from vendor-published datasheets; all throughput in Mbps)
// Performance methodology notes per vendor are flagged in notes field.
// RFC 2544 flag = vendor uses RFC 2544 methodology (synthetic, not IMIX mix).
// ─────────────────────────────────────────────────────────────────────────────

const VENDORS = {
  sophos:   { name: "Sophos",     color: "#0073CF", short: "XGS" },
  fortinet: { name: "Fortinet",   color: "#EE3124", short: "FG"  },
  paloalto: { name: "Palo Alto",  color: "#FA582D", short: "PA"  },
  meraki:   { name: "Meraki",     color: "#00BCEB", short: "MX"  },
  watchguard:{ name:"WatchGuard", color: "#E31837", short: "FBX" },
  sonicwall:{ name: "SonicWall",  color: "#FF6600", short: "NSa" },
};

// tier: "soho" | "smb" | "midmarket" | "enterprise" | "datacenter"
// formFactor: "desktop" | "1u" | "2u"
// rfc2544: true if vendor uses RFC 2544 (flag in UI)
// All throughput values in Mbps; null = not published.

const APPLIANCES = [
  // ── SOPHOS XGS – Gen 2 Desktop ──────────────────────────────────────────
  {
    id: "xgs-88", vendor: "sophos", model: "XGS 88",
    tier: "soho", formFactor: "desktop", gen: "Gen 2",
    fwThroughput: 9000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: null,
    ngfw: null, maxSessions: 1600000,
    ports: "5x 2.5GE RJ45", expansionSlots: 1,
    moduleOptions: "5G, Wi-Fi 6 (w-model)", wifi: "Wi-Fi 6 optional",
    ha: true, redundantPower: false, formFactorDetail: "Desktop fanless",
    notes: "Gen 2 single-CPU; virtual FastPath (SFOS v21+). XGS 88 lacks on-box reporting.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-smb-branch-office-firewalls",
  },
  {
    id: "xgs-108", vendor: "sophos", model: "XGS 108",
    tier: "soho", formFactor: "desktop", gen: "Gen 2",
    fwThroughput: 12500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: null,
    ngfw: null, maxSessions: 4190000,
    ports: "9x 2.5GE RJ45", expansionSlots: 1,
    moduleOptions: "5G, Wi-Fi 6 (w-model)", wifi: "Wi-Fi 6 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop fanless",
    notes: "Gen 2 single-CPU; virtual FastPath (SFOS v21+).",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-smb-branch-office-firewalls",
  },
  {
    id: "xgs-118", vendor: "sophos", model: "XGS 118",
    tier: "smb", formFactor: "desktop", gen: "Gen 2",
    fwThroughput: 15500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: null,
    ngfw: null, maxSessions: 5500000,
    ports: "9x 2.5GE RJ45", expansionSlots: 1,
    moduleOptions: "5G, Wi-Fi 6 (w-model)", wifi: "Wi-Fi 6 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "Gen 2 single-CPU; virtual FastPath (SFOS v21+). Optional 5G.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-smb-branch-office-firewalls",
  },
  {
    id: "xgs-128", vendor: "sophos", model: "XGS 128",
    tier: "smb", formFactor: "desktop", gen: "Gen 2",
    fwThroughput: 19100, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: null,
    ngfw: null, maxSessions: 6000000,
    ports: "14x 2.5GE RJ45, 1x SFP", expansionSlots: 1,
    moduleOptions: "5G, Wi-Fi 6 (w-model)", wifi: "Wi-Fi 6 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "Gen 2 single-CPU; virtual FastPath (SFOS v21+). Optional 5G.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-smb-branch-office-firewalls",
  },
  {
    id: "xgs-138", vendor: "sophos", model: "XGS 138",
    tier: "smb", formFactor: "desktop", gen: "Gen 2",
    fwThroughput: 19100, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: null,
    ngfw: null, maxSessions: 6550000,
    ports: "14x 2.5GE RJ45, 2x 10GE SFP+", expansionSlots: 1,
    moduleOptions: "5G", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "Desktop (dual-CPU)",
    notes: "Gen 2 dual-CPU + Xstream Flow NPU. 10 GE fiber built-in. Optional 5G.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-smb-branch-office-firewalls",
  },
  // ── SOPHOS XGS – Gen 1 Desktop ──────────────────────────────────────────
  {
    id: "xgs-87", vendor: "sophos", model: "XGS 87",
    tier: "soho", formFactor: "desktop", gen: "Gen 1",
    fwThroughput: 3850, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 375,
    threatProtection: 280, ipsecVPN: 3000,
    ngfw: null, maxSessions: null,
    ports: "5x GE RJ45", expansionSlots: 0,
    moduleOptions: "None", wifi: "Wi-Fi 5 optional",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Gen 1 (End of Sale Jan 2025). Dual-CPU + Xstream Flow NPU. Limited features vs Gen 2.",
    datasheet: "https://www.enterpriseav.com/xgs-87.asp",
  },
  {
    id: "xgs-107", vendor: "sophos", model: "XGS 107",
    tier: "soho", formFactor: "desktop", gen: "Gen 1",
    fwThroughput: 7000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 420,
    threatProtection: 370, ipsecVPN: 4000,
    ngfw: null, maxSessions: null,
    ports: "9x GE RJ45", expansionSlots: 0,
    moduleOptions: "2nd Power Supply", wifi: "Wi-Fi 5 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "Gen 1 (End of Sale Jan 2025).",
    datasheet: "https://www.enterpriseav.com/xgs-87.asp",
  },
  {
    id: "xgs-116", vendor: "sophos", model: "XGS 116",
    tier: "smb", formFactor: "desktop", gen: "Gen 1",
    fwThroughput: 7700, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 650,
    threatProtection: 720, ipsecVPN: 4800,
    ngfw: null, maxSessions: null,
    ports: "9x GE RJ45, 1x SFP, PoE", expansionSlots: 1,
    moduleOptions: "3G/4G, 5G, 2nd Wi-Fi, 2nd Power", wifi: "Wi-Fi 5 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "Gen 1 (End of Sale Jan 2025). PoE on all GE ports.",
    datasheet: "https://www.enterpriseav.com/xgs-87.asp",
  },
  {
    id: "xgs-126", vendor: "sophos", model: "XGS 126",
    tier: "smb", formFactor: "desktop", gen: "Gen 1",
    fwThroughput: 10500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 800,
    threatProtection: 900, ipsecVPN: 5500,
    ngfw: null, maxSessions: null,
    ports: "14x GE RJ45, 1x SFP, PoE", expansionSlots: 1,
    moduleOptions: "3G/4G, 5G, 2nd Wi-Fi, 2nd Power", wifi: "Wi-Fi 5 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "Gen 1 (End of Sale Jan 2025). PoE on all GE ports.",
    datasheet: "https://www.enterpriseav.com/xgs-87.asp",
  },
  {
    id: "xgs-136", vendor: "sophos", model: "XGS 136",
    tier: "smb", formFactor: "desktop", gen: "Gen 1",
    fwThroughput: 11500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 950,
    threatProtection: 1000, ipsecVPN: 6350,
    ngfw: null, maxSessions: null,
    ports: "14x GE RJ45, 1x 2.5GE SFP, PoE", expansionSlots: 1,
    moduleOptions: "3G/4G, 5G, 2nd Wi-Fi, 2nd Power", wifi: "Wi-Fi 5 optional",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "Gen 1 (End of Sale Jan 2025). PoE on all GE ports.",
    datasheet: "https://www.enterpriseav.com/xgs-87.asp",
  },
  // ── SOPHOS XGS – 1U Rackmount ────────────────────────────────────────────
  {
    id: "xgs-2100", vendor: "sophos", model: "XGS 2100",
    tier: "midmarket", formFactor: "1u", gen: "Gen 1",
    fwThroughput: 30000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 1100,
    threatProtection: 1250, ipsecVPN: 17000,
    ngfw: null, maxSessions: null,
    ports: "10x GE RJ45, 2x 10GE SFP+, 1x SFP", expansionSlots: 1,
    moduleOptions: "Flexi Port modules (GE/SFP/SFP+)", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U Short",
    notes: "Dual-CPU + Marvell NPU.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-1u-distributed-edge-firewalls",
  },
  {
    id: "xgs-2300", vendor: "sophos", model: "XGS 2300",
    tier: "midmarket", formFactor: "1u", gen: "Gen 1",
    fwThroughput: 39000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 1450,
    threatProtection: 1500, ipsecVPN: 20500,
    ngfw: null, maxSessions: null,
    ports: "10x GE RJ45, 2x 10GE SFP+, 1x SFP", expansionSlots: 1,
    moduleOptions: "Flexi Port modules", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U Short",
    notes: "Dual-CPU + Marvell NPU.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-1u-distributed-edge-firewalls",
  },
  {
    id: "xgs-3100", vendor: "sophos", model: "XGS 3100",
    tier: "midmarket", formFactor: "1u", gen: "Gen 1",
    fwThroughput: 47000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 2470,
    threatProtection: 2000, ipsecVPN: 25000,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 4x 10GE SFP+, 1x SFP", expansionSlots: 1,
    moduleOptions: "Flexi Port modules", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U Short",
    notes: "Dual-CPU + Marvell NPU.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-1u-distributed-edge-firewalls",
  },
  {
    id: "xgs-3300", vendor: "sophos", model: "XGS 3300",
    tier: "midmarket", formFactor: "1u", gen: "Gen 1",
    fwThroughput: 58000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 3130,
    threatProtection: 3000, ipsecVPN: 31100,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 4x 10GE SFP+, 1x SFP", expansionSlots: 1,
    moduleOptions: "Flexi Port modules", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U Short",
    notes: "Dual-CPU + Marvell NPU.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-1u-distributed-edge-firewalls",
  },
  {
    id: "xgs-4300", vendor: "sophos", model: "XGS 4300",
    tier: "enterprise", formFactor: "1u", gen: "Gen 1",
    fwThroughput: 75000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 8000,
    threatProtection: 6500, ipsecVPN: 62500,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 4x 10GE SFP+, 2x 25GE SFP28", expansionSlots: 2,
    moduleOptions: "Flexi Port modules (high-density)", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U Long",
    notes: "Dual-CPU + Marvell NPU ECC RAM.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-1u-distributed-edge-firewalls",
  },
  {
    id: "xgs-4500", vendor: "sophos", model: "XGS 4500",
    tier: "enterprise", formFactor: "1u", gen: "Gen 1",
    fwThroughput: 80000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 10600,
    threatProtection: 8650, ipsecVPN: 75550,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 4x 10GE SFP+, 2x 25GE SFP28", expansionSlots: 2,
    moduleOptions: "Flexi Port modules (high-density)", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U Long (dual SSD RAID)",
    notes: "Dual-CPU + Marvell NPU ECC RAM. Dual SSD RAID.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-1u-distributed-edge-firewalls",
  },
  // ── SOPHOS XGS – 2U Rackmount ────────────────────────────────────────────
  {
    id: "xgs-5500", vendor: "sophos", model: "XGS 5500",
    tier: "enterprise", formFactor: "2u", gen: "Gen 1",
    fwThroughput: 100000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 13500,
    threatProtection: 14000, ipsecVPN: 92500,
    ngfw: null, maxSessions: null,
    ports: "16x GE RJ45, 8x 10GE SFP+, 4x 25GE SFP28", expansionSlots: 3,
    moduleOptions: "Up to 48 ports total w/ Flexi modules", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U (redundant fans & PSU)",
    notes: "Dual-CPU + Xstream Flow NPU. Redundant fans, PSU, SSD.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-2u-enterprise-campus-edge-firewalls",
  },
  {
    id: "xgs-6500", vendor: "sophos", model: "XGS 6500",
    tier: "enterprise", formFactor: "2u", gen: "Gen 1",
    fwThroughput: 120000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 16000,
    threatProtection: 17850, ipsecVPN: 109800,
    ngfw: null, maxSessions: null,
    ports: "20x GE RJ45, 8x 10GE SFP+, 4x 25GE SFP28", expansionSlots: 4,
    moduleOptions: "Up to 68 ports total w/ Flexi modules", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U (redundant fans & PSU)",
    notes: "Dual-CPU + Xstream Flow NPU.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-2u-enterprise-campus-edge-firewalls",
  },
  {
    id: "xgs-7500", vendor: "sophos", model: "XGS 7500",
    tier: "datacenter", formFactor: "2u", gen: "Gen 1",
    fwThroughput: 160000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 19500,
    threatProtection: 26000, ipsecVPN: 117000,
    ngfw: null, maxSessions: null,
    ports: "22x GE RJ45, 8x 10GE SFP+, 4x 40GE QSFP+", expansionSlots: 4,
    moduleOptions: "Up to 70 ports total. 40G QSFP+", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U NVMe SSD",
    notes: "Dual-CPU + Xstream Flow NPU. Up to 40 Gbps ports.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-2u-enterprise-campus-edge-firewalls",
  },
  {
    id: "xgs-8500", vendor: "sophos", model: "XGS 8500",
    tier: "datacenter", formFactor: "2u", gen: "Gen 1",
    fwThroughput: 190000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: 24000,
    threatProtection: 34000, ipsecVPN: 117000,
    ngfw: null, maxSessions: null,
    ports: "22x GE RJ45, 8x 10GE SFP+, 4x 100GE QSFP28", expansionSlots: 4,
    moduleOptions: "Up to 70 ports total. 100G QSFP28", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U NVMe SSD",
    notes: "Dual-CPU + Xstream Flow NPU. Up to 100 Gbps ports.",
    datasheet: "https://www.sophos.com/en-us/products/next-gen-firewall/xgs-2u-enterprise-campus-edge-firewalls",
  },

  // ── FORTINET FORTIGATE ─────────────────────────────────────────────────
  // Source: Fortinet Product Matrix Feb 2026 (official PDF, verified above)
  {
    id: "fg-40f", vendor: "fortinet", model: "FortiGate 40F",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 5000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 1000, tlsInspection: 310,
    threatProtection: 600, ipsecVPN: 4400,
    ngfw: 800, maxSessions: 700000,
    ports: "5x GE RJ45", expansionSlots: 0,
    moduleOptions: "None", wifi: "Wi-Fi optional",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Fortinet NP7 + CP9 ASIC. Enterprise Mix traffic methodology. SSL Inspect = 310 Mbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-fortiwifi-40f-series",
  },
  {
    id: "fg-60f", vendor: "fortinet", model: "FortiGate 60F",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 10000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 1400, tlsInspection: 630,
    threatProtection: 700, ipsecVPN: 6500,
    ngfw: 1000, maxSessions: 700000,
    ports: "10x GE RJ45", expansionSlots: 0,
    moduleOptions: "Wi-Fi, DSL, SFP, PoE variants", wifi: "Wi-Fi optional",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Fortinet NP7 ASIC. SSL Inspect with IPS = 630 Mbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-fortiwifi-60f-series",
  },
  {
    id: "fg-80f", vendor: "fortinet", model: "FortiGate 80F",
    tier: "smb", formFactor: "desktop", gen: null,
    fwThroughput: 10000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 1400, tlsInspection: 715,
    threatProtection: 900, ipsecVPN: 6500,
    ngfw: 1000, maxSessions: 1500000,
    ports: "8x GE RJ45, 2x Shared Port Pairs", expansionSlots: 0,
    moduleOptions: "Wi-Fi, 3G4G, DSL, Bypass, Storage", wifi: "Wi-Fi optional",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Dual AC input. SSL Inspect = 715 Mbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-fortiwifi-80f-series",
  },
  {
    id: "fg-90g", vendor: "fortinet", model: "FortiGate 90G",
    tier: "smb", formFactor: "desktop", gen: null,
    fwThroughput: 28000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 4500, tlsInspection: 2600,
    threatProtection: 2200, ipsecVPN: 25000,
    ngfw: 2500, maxSessions: 3000000,
    ports: "8x GE RJ45, 2x 10GE Shared Port Pairs", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "Desktop",
    notes: "NP7 ASIC. 10GE shared port pairs. SSL Inspect = 2.6 Gbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-90g",
  },
  {
    id: "fg-120g", vendor: "fortinet", model: "FortiGate 120G",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 39000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 5300, tlsInspection: 3000,
    threatProtection: 2800, ipsecVPN: 35000,
    ngfw: 3100, maxSessions: 3000000,
    ports: "4x 10GE SFP+, 18x GE RJ45, 8x GE SFP", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "Dual PSU. 480 GB SSD. SSL Inspect = 3 Gbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-120g",
  },
  {
    id: "fg-200g", vendor: "fortinet", model: "FortiGate 200G",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 39000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 9000, tlsInspection: 7000,
    threatProtection: 6000, ipsecVPN: 36000,
    ngfw: 7000, maxSessions: 11000000,
    ports: "8x 10GE SFP+, 8x 5GE RJ45, 10x GE RJ45, 4x GE SFP", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "Dual PSU. 480 GB SSD. SSL Inspect = 7 Gbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-200g",
  },
  {
    id: "fg-400f", vendor: "fortinet", model: "FortiGate 400F",
    tier: "enterprise", formFactor: "1u", gen: null,
    fwThroughput: 79500, fwIMIX: null, rfc2544: false,
    ipsThroughput: 12000, tlsInspection: 8000,
    threatProtection: 9000, ipsecVPN: 55000,
    ngfw: 10000, maxSessions: 7800000,
    ports: "8x 10GE SFP+, 8x GE SFP, 18x GE RJ45", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "Dual PSU. 960 GB SSD. RSA-2048 for SSL. SSL Inspect = 8 Gbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-400f-series",
  },
  {
    id: "fg-700g", vendor: "fortinet", model: "FortiGate 700G",
    tier: "enterprise", formFactor: "1u", gen: null,
    fwThroughput: 164000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 38000, tlsInspection: 14000,
    threatProtection: 26000, ipsecVPN: 55000,
    ngfw: 29000, maxSessions: 16000000,
    ports: "4x 25GE SFP28, 4x 10GE SFP+, 16x GE SFP, 8x 5GE RJ45", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "Dual PSU. 960 GB SSD. SSL Inspect = 14 Gbps.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-700g",
  },
  {
    id: "fg-1000f", vendor: "fortinet", model: "FortiGate 1000F",
    tier: "datacenter", formFactor: "2u", gen: null,
    fwThroughput: 198000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 19000, tlsInspection: 10000,
    threatProtection: 13000, ipsecVPN: 55000,
    ngfw: 15000, maxSessions: 7500000,
    ports: "2x 100GE QSFP28, 8x 25GE SFP28, 16x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U",
    notes: "SSL Inspect = 10 Gbps. 960 GB SSD.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-1000f",
  },
  {
    id: "fg-1800f", vendor: "fortinet", model: "FortiGate 1800F",
    tier: "datacenter", formFactor: "2u", gen: null,
    fwThroughput: 198000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 22000, tlsInspection: 12000,
    threatProtection: 15000, ipsecVPN: 55000,
    ngfw: 17000, maxSessions: 12000000,
    ports: "4x 100GE QSFP28, 12x 25GE SFP28, 2x 10GE SFP+, 8x GE SFP, 18x GE", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U",
    notes: "Dual 960 GB SSD. SSL Inspect = 12 Gbps. 100G QSFP28 support req FortiOS 7.4+.",
    datasheet: "https://www.fortinet.com/resources/data-sheets/fortigate-1800f",
  },

  // ── PALO ALTO NETWORKS PA-SERIES ─────────────────────────────────────────
  // Source: PaloGuard compare-spec.asp (vendor-aggregated datasheet data)
  {
    id: "pa-440", vendor: "paloalto", model: "PA-440",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 2600, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 1250, ipsecVPN: 1600,
    ngfw: null, maxSessions: 198976,
    ports: "8x GE RJ45", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "Desktop fanless",
    notes: "ML-Powered NGFW. App-ID based throughput measurement. Fanless. Threat Prevention includes App-ID, IPS, AV, AS, WF, DNS.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-400-series",
  },
  {
    id: "pa-450", vendor: "paloalto", model: "PA-450",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 3300, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 2100, ipsecVPN: 2000,
    ngfw: null, maxSessions: 300000,
    ports: "8x GE RJ45, 2x SFP", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "Desktop fanless",
    notes: "ML-Powered NGFW. Fanless. 5G variant available (PA-455-5G).",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-400-series",
  },
  {
    id: "pa-460", vendor: "paloalto", model: "PA-460",
    tier: "smb", formFactor: "desktop", gen: null,
    fwThroughput: 4600, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 3000, ipsecVPN: 3000,
    ngfw: null, maxSessions: 400000,
    ports: "8x GE RJ45, 4x SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "Desktop fanless",
    notes: "ML-Powered NGFW. Fanless.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-400-series",
  },
  {
    id: "pa-1410", vendor: "paloalto", model: "PA-1410",
    tier: "smb", formFactor: "1u", gen: null,
    fwThroughput: 8500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 4500, ipsecVPN: 4300,
    ngfw: null, maxSessions: 945000,
    ports: "8x GE RJ45, 4x SFP+, 2x SFP, PoE", expansionSlots: 0,
    moduleOptions: "PoE built-in", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "ML-Powered NGFW. PoE support. VSYS support.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-1400-series",
  },
  {
    id: "pa-1420", vendor: "paloalto", model: "PA-1420",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 9500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 6200, ipsecVPN: 5100,
    ngfw: null, maxSessions: 1398646,
    ports: "8x GE RJ45, 8x SFP+, 4x SFP, PoE", expansionSlots: 0,
    moduleOptions: "PoE built-in", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "ML-Powered NGFW. PoE support.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-1400-series",
  },
  {
    id: "pa-3420", vendor: "paloalto", model: "PA-3420",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 19000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 10000, ipsecVPN: 9000,
    ngfw: null, maxSessions: 2200000,
    ports: "8x GE RJ45, 8x 10GE SFP+, 4x 25GE SFP28", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "ML-Powered NGFW. Multi-gig fiber.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-3400-series",
  },
  {
    id: "pa-3440", vendor: "paloalto", model: "PA-3440",
    tier: "enterprise", formFactor: "1u", gen: null,
    fwThroughput: 35000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 20000, ipsecVPN: 18000,
    ngfw: null, maxSessions: 2990000,
    ports: "8x GE RJ45, 8x 10GE SFP+, 4x 25GE SFP28", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "ML-Powered NGFW. 25G SFP28 ports.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-3400-series",
  },
  {
    id: "pa-5420", vendor: "paloalto", model: "PA-5420",
    tier: "enterprise", formFactor: "2u", gen: null,
    fwThroughput: 70000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 50000, ipsecVPN: 32000,
    ngfw: null, maxSessions: 6990000,
    ports: "4x 40GE QSFP+, 8x 25GE SFP28, 16x 10GE SFP+", expansionSlots: 2,
    moduleOptions: "NPC cards (Network/DPC)", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U modular",
    notes: "ML-Powered NGFW. Modular NPC/DPC cards.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-5400-series",
  },
  {
    id: "pa-5440", vendor: "paloalto", model: "PA-5440",
    tier: "datacenter", formFactor: "2u", gen: null,
    fwThroughput: 90000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: 70000, ipsecVPN: 50000,
    ngfw: null, maxSessions: 23990000,
    ports: "4x 100GE QSFP28, 8x 25GE SFP28, 16x 10GE SFP+", expansionSlots: 2,
    moduleOptions: "NPC/DPC cards", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U modular",
    notes: "ML-Powered NGFW. Modular high-density.",
    datasheet: "https://www.paloaltonetworks.com/resources/datasheets/pa-5400-series",
  },

  // ── CISCO MERAKI MX ────────────────────────────────────────────────────
  // Source: Meraki datasheets (noted: Meraki does NOT publish IPS/TLS throughput).
  {
    id: "mx-65", vendor: "meraki", model: "MX 65",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 500, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 500,
    ngfw: null, maxSessions: null,
    ports: "10x GE RJ45", expansionSlots: 0,
    moduleOptions: "PoE model available", wifi: "None",
    ha: false, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Cloud-managed only. Meraki does NOT publish IPS, TLS, or threat protection throughput. Stateful FW only.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx65-datasheet/",
  },
  {
    id: "mx-75", vendor: "meraki", model: "MX 75",
    tier: "smb", formFactor: "desktop", gen: null,
    fwThroughput: 1000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 500,
    ngfw: null, maxSessions: null,
    ports: "10x GE RJ45, 2x SFP", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Cloud-managed only. No published IPS/TLS throughput.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/",
  },
  {
    id: "mx-85", vendor: "meraki", model: "MX 85",
    tier: "smb", formFactor: "desktop", gen: null,
    fwThroughput: 1000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 500,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 2x SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "Cloud-managed only. No published IPS/TLS throughput.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/",
  },
  {
    id: "mx-95", vendor: "meraki", model: "MX 95",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 2000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 1000,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 4x SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "1U",
    notes: "Cloud-managed only.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/",
  },
  {
    id: "mx-105", vendor: "meraki", model: "MX 105",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 5000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 1000,
    ngfw: null, maxSessions: null,
    ports: "12x GE RJ45, 4x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "Cloud-managed only.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/",
  },
  {
    id: "mx-250", vendor: "meraki", model: "MX 250",
    tier: "enterprise", formFactor: "1u", gen: null,
    fwThroughput: 4000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 4000,
    ngfw: null, maxSessions: null,
    ports: "8x GE RJ45, 8x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "Cloud-managed only.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/",
  },
  {
    id: "mx-450", vendor: "meraki", model: "MX 450",
    tier: "enterprise", formFactor: "1u", gen: null,
    fwThroughput: 10000, fwIMIX: null, rfc2544: false,
    ipsThroughput: null, tlsInspection: null,
    threatProtection: null, ipsecVPN: 4000,
    ngfw: null, maxSessions: null,
    ports: "10x GE RJ45, 8x 10GE SFP+, 2x 40GE QSFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U",
    notes: "Cloud-managed only. 40GE uplinks.",
    datasheet: "https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/",
  },

  // ── WATCHGUARD FIREBOX ─────────────────────────────────────────────────
  // Source: WatchGuard datasheets (some models use RFC 2544 for FW throughput)
  {
    id: "t25", vendor: "watchguard", model: "Firebox T25",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 3180, fwIMIX: null, rfc2544: true,
    ipsThroughput: 475, tlsInspection: 294,
    threatProtection: null, ipsecVPN: 880,
    ngfw: null, maxSessions: 45000,
    ports: "5x GE RJ45", expansionSlots: 0,
    moduleOptions: "Wi-Fi variant (T25-W)", wifi: "Wi-Fi optional",
    ha: false, redundantPower: false, formFactorDetail: "Desktop",
    notes: "RFC 2544 for FW throughput. IPS/SSL values from Total Security Suite testing.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-t-series",
  },
  {
    id: "t45", vendor: "watchguard", model: "Firebox T45",
    tier: "soho", formFactor: "desktop", gen: null,
    fwThroughput: 4940, fwIMIX: null, rfc2544: true,
    ipsThroughput: 880, tlsInspection: 507,
    threatProtection: null, ipsecVPN: 1380,
    ngfw: null, maxSessions: 90000,
    ports: "5x GE RJ45, 1x SFP+", expansionSlots: 0,
    moduleOptions: "Wi-Fi variant", wifi: "Wi-Fi optional",
    ha: false, redundantPower: false, formFactorDetail: "Desktop",
    notes: "RFC 2544 for FW throughput.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-t-series",
  },
  {
    id: "t85", vendor: "watchguard", model: "Firebox T85",
    tier: "smb", formFactor: "desktop", gen: null,
    fwThroughput: 5200, fwIMIX: null, rfc2544: true,
    ipsThroughput: 1010, tlsInspection: 620,
    threatProtection: null, ipsecVPN: 1200,
    ngfw: null, maxSessions: 130000,
    ports: "8x GE RJ45, 2x SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "Desktop",
    notes: "RFC 2544 for FW throughput.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-t-series",
  },
  {
    id: "m290", vendor: "watchguard", model: "Firebox M290",
    tier: "smb", formFactor: "1u", gen: null,
    fwThroughput: 5300, fwIMIX: null, rfc2544: true,
    ipsThroughput: 2000, tlsInspection: 860,
    threatProtection: null, ipsecVPN: 1760,
    ngfw: null, maxSessions: 300000,
    ports: "8x GE RJ45", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "1U",
    notes: "RFC 2544 for FW throughput.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-m-series",
  },
  {
    id: "m390", vendor: "watchguard", model: "Firebox M390",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 8000, fwIMIX: null, rfc2544: true,
    ipsThroughput: 3200, tlsInspection: 1600,
    threatProtection: null, ipsecVPN: 2960,
    ngfw: null, maxSessions: 1600000,
    ports: "8x GE RJ45, 4x SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "1U",
    notes: "RFC 2544 for FW throughput.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-m-series",
  },
  {
    id: "m590", vendor: "watchguard", model: "Firebox M590",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 20000, fwIMIX: null, rfc2544: true,
    ipsThroughput: 4900, tlsInspection: 3800,
    threatProtection: null, ipsecVPN: 8300,
    ngfw: null, maxSessions: 3800000,
    ports: "8x GE RJ45, 8x SFP, 4x SFP+", expansionSlots: 2,
    moduleOptions: "Expansion modules", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "1U",
    notes: "RFC 2544 for FW throughput.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-m-series",
  },
  {
    id: "m690", vendor: "watchguard", model: "Firebox M690",
    tier: "enterprise", formFactor: "1u", gen: null,
    fwThroughput: 40000, fwIMIX: null, rfc2544: true,
    ipsThroughput: 6600, tlsInspection: 4700,
    threatProtection: null, ipsecVPN: 12600,
    ngfw: null, maxSessions: 4000000,
    ports: "8x GE, 8x SFP, 4x 10GE SFP+", expansionSlots: 2,
    moduleOptions: "Expansion modules", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "RFC 2544 for FW throughput.",
    datasheet: "https://www.watchguard.com/wgrd-products/firewall-appliances/firebox-m-series",
  },

  // ── SONICWALL NSa / NSsp ───────────────────────────────────────────────
  // Source: SonicWall datasheets
  {
    id: "nsa-2700", vendor: "sonicwall", model: "NSa 2700",
    tier: "smb", formFactor: "1u", gen: null,
    fwThroughput: 5500, fwIMIX: null, rfc2544: false,
    ipsThroughput: 3000, tlsInspection: 800,
    threatProtection: 900, ipsecVPN: 2000,
    ngfw: 1800, maxSessions: 750000,
    ports: "16x GE RJ45, 3x SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "1U",
    notes: "SonicOS 7.x. TLS Inspection with full DPI. IMIX traffic not separately published.",
    datasheet: "https://www.sonicwall.com/products/firewalls/nsa/",
  },
  {
    id: "nsa-3700", vendor: "sonicwall", model: "NSa 3700",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 5500, fwIMIX: null, rfc2544: false,
    ipsThroughput: 4000, tlsInspection: 1500,
    threatProtection: 1200, ipsecVPN: 3500,
    ngfw: 2400, maxSessions: 1000000,
    ports: "16x GE RJ45, 3x SFP+, 2x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: false, formFactorDetail: "1U",
    notes: "SonicOS 7.x.",
    datasheet: "https://www.sonicwall.com/products/firewalls/nsa/",
  },
  {
    id: "nsa-4700", vendor: "sonicwall", model: "NSa 4700",
    tier: "midmarket", formFactor: "1u", gen: null,
    fwThroughput: 18000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 8000, tlsInspection: 3000,
    threatProtection: 2500, ipsecVPN: 5500,
    ngfw: 5000, maxSessions: 2000000,
    ports: "16x GE RJ45, 4x SFP+, 2x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "1U",
    notes: "SonicOS 7.x.",
    datasheet: "https://www.sonicwall.com/products/firewalls/nsa/",
  },
  {
    id: "nsa-6700", vendor: "sonicwall", model: "NSa 6700",
    tier: "enterprise", formFactor: "2u", gen: null,
    fwThroughput: 36000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 14000, tlsInspection: 10000,
    threatProtection: 4500, ipsecVPN: 13300,
    ngfw: 8500, maxSessions: 6000000,
    ports: "4x 40GE QSFP+, 8x 10GE SFP+, 16x GE", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U",
    notes: "SonicOS 7.x. 40G QSFP+ built-in.",
    datasheet: "https://www.sonicwall.com/products/firewalls/nsa/",
  },
  {
    id: "nssp-10700", vendor: "sonicwall", model: "NSsp 10700",
    tier: "enterprise", formFactor: "2u", gen: null,
    fwThroughput: 54000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 26500, tlsInspection: 14500,
    threatProtection: 11500, ipsecVPN: 16500,
    ngfw: 15000, maxSessions: 25000000,
    ports: "4x 100GE QSFP28, 8x 25GE SFP28, 4x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U",
    notes: "SonicOS 7.x. Enterprise-class platform.",
    datasheet: "https://www.sonicwall.com/products/firewalls/high-end/",
  },
  {
    id: "nssp-13700", vendor: "sonicwall", model: "NSsp 13700",
    tier: "datacenter", formFactor: "2u", gen: null,
    fwThroughput: 60000, fwIMIX: null, rfc2544: false,
    ipsThroughput: 36000, tlsInspection: 19000,
    threatProtection: 16700, ipsecVPN: 22000,
    ngfw: 20000, maxSessions: 30000000,
    ports: "4x 100GE QSFP28, 8x 25GE SFP28, 12x 10GE SFP+", expansionSlots: 0,
    moduleOptions: "None", wifi: "None",
    ha: true, redundantPower: true, formFactorDetail: "2U",
    notes: "SonicOS 7.x.",
    datasheet: "https://www.sonicwall.com/products/firewalls/high-end/",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
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
];

const COLUMNS = [
  { key: "vendor",          label: "Vendor",        w: "100px" },
  { key: "model",           label: "Model",         w: "120px" },
  { key: "tier",            label: "Tier",          w: "100px" },
  { key: "formFactor",      label: "Form",          w: "80px"  },
  { key: "fwThroughput",    label: "FW Throughput", w: "120px", fmt: fmt },
  { key: "fwIMIX",          label: "FW IMIX",       w: "100px", fmt: fmt },
  { key: "ipsThroughput",   label: "IPS",           w: "100px", fmt: fmt },
  { key: "tlsInspection",   label: "TLS Inspect",   w: "110px", fmt: fmt },
  { key: "threatProtection",label: "Threat Protect",w: "130px", fmt: fmt },
  { key: "ipsecVPN",        label: "IPSec VPN",     w: "110px", fmt: fmt },
  { key: "ngfw",            label: "NGFW",          w: "90px",  fmt: fmt },
  { key: "maxSessions",     label: "Max Sessions",  w: "120px", fmt: fmtSessions },
  { key: "ports",           label: "Built-in Ports",w: "200px" },
  { key: "moduleOptions",   label: "Modules",       w: "180px" },
  { key: "ha",              label: "HA",            w: "60px"  },
  { key: "redundantPower",  label: "Redund. PSU",   w: "100px" },
  { key: "rfc2544",         label: "RFC 2544",      w: "90px"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FirewallComparator() {
  const [vendorFilter, setVendorFilter] = useState(Object.keys(VENDORS));
  const [tierFilter, setTierFilter]     = useState(TIERS.map((t) => t.id));
  const [ffFilter, setFfFilter]         = useState(FORM_FACTORS.map((f) => f.id));
  const [search, setSearch]             = useState("");
  const [sortKey, setSortKey]           = useState("fwThroughput");
  const [sortDir, setSortDir]           = useState("desc");
  const [customBench, setCustomBench]   = useState({});
  const [editingBench, setEditingBench] = useState(null);
  const [benchField, setBenchField]     = useState("fwThroughput");
  const [benchValue, setBenchValue]     = useState("");
  const [showNotes, setShowNotes]       = useState(null);
  const [activeTab, setActiveTab]       = useState("compare");

  const toggleVendor = (v) =>
    setVendorFilter((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  const toggleTier = (t) =>
    setTierFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  const toggleFF = (f) =>
    setFfFilter((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const filteredData = useMemo(() => {
    let data = APPLIANCES.filter(
      (a) =>
        vendorFilter.includes(a.vendor) &&
        tierFilter.includes(a.tier) &&
        ffFilter.includes(a.formFactor) &&
        (search === "" ||
          a.model.toLowerCase().includes(search.toLowerCase()) ||
          VENDORS[a.vendor].name.toLowerCase().includes(search.toLowerCase()))
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
  }, [vendorFilter, tierFilter, ffFilter, search, sortKey, sortDir, customBench]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
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

  const cellVal = (row, col) => {
    const v = row[col.key];
    if (col.key === "vendor") return (
      <span style={{ color: VENDORS[v]?.color, fontWeight: 700 }}>
        {VENDORS[v]?.name}
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
    if (col.fmt) return col.fmt(v);
    return v ?? "—";
  };

  const hasCustom = (id) => !!customBench[id] && Object.keys(customBench[id]).length > 0;

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      background: "#0d1117",
      minHeight: "100vh",
      color: "#c9d1d9",
    }}>
      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a2235 100%)",
        borderBottom: "1px solid #21262d",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 8,
          background: "linear-gradient(135deg, #0073CF, #00a0e3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, boxShadow: "0 0 16px #0073CF55",
        }}>🛡</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "0.02em",
            background: "linear-gradient(90deg, #58a6ff, #79c0ff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            NGFW Comparator
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#6e7681", letterSpacing: "0.05em" }}>
            SOPHOS XGS · FORTINET · PALO ALTO · MERAKI · WATCHGUARD · SONICWALL
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["compare", "methodology"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#1f6feb" : "transparent",
                border: `1px solid ${activeTab === tab ? "#1f6feb" : "#30363d"}`,
                color: activeTab === tab ? "#fff" : "#8b949e",
                borderRadius: 6, padding: "5px 14px", cursor: "pointer",
                fontSize: 11, fontFamily: "inherit", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>{tab}</button>
          ))}
          <button onClick={exportCSV} style={{
            background: "#21262d", border: "1px solid #30363d",
            color: "#79c0ff", borderRadius: 6, padding: "5px 14px",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            letterSpacing: "0.04em",
          }}>⬇ Export CSV</button>
        </div>
      </div>

      {activeTab === "methodology" ? (
        <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 24px" }}>
          <h2 style={{ color: "#58a6ff", borderBottom: "1px solid #21262d", paddingBottom: 12 }}>
            Performance Methodology Notes
          </h2>
          {[
            { vendor: "Sophos XGS", color: "#0073CF", text: `FW Throughput: HTTP traffic, 512 KB response size (Keysight-Ixia BreakingPoint).
FW IMIX: UDP using 66/570/1518 byte packet mix.
IPS: Default IPS ruleset, 512 KB HTTP object size.
IPSec VPN: Multiple tunnels, 512 KB HTTP response.
TLS Inspection: IPS enabled + HTTPS, mixed cipher suites.
Threat Protection: FW + IPS + App Control + Malware Prevention, 200 KB HTTP (Enterprise Traffic Mix).
NGFW: IPS + App Control, 512 KB HTTP.
NOTE: Gen 2 desktop models (XGS 88–128) use virtual FastPath on SFOS v21+; some detailed spec rows not yet published separately.` },
            { vendor: "Fortinet FortiGate", color: "#EE3124", text: `All performance measured with logging enabled.
IPS / NGFW / Threat Protection: Enterprise Mix traffic.
SSL Inspection: Average HTTPS sessions, mixed ciphers.
NGFW = FW + IPS + Application Control.
Threat Protection = FW + IPS + App Control + Malware.
IPSec VPN: AES256-SHA256, 512 byte packets.
Fortinet uses NP7/NP6 ASICs for hardware-accelerated flows.` },
            { vendor: "Palo Alto Networks", color: "#FA582D", text: `All throughput measured with App-ID and logging enabled.
FW Throughput: 64 KB HTTP/appmix transactions.
Threat Prevention: App-ID + IPS + AV + AS + WildFire + DNS Security + File Blocking + logging.
IPSec VPN: AES-256.
NOTE: Palo Alto does NOT publish a separate IPS-only or TLS-inspect throughput figure. Threat Prevention is the closest all-services metric.` },
            { vendor: "Cisco Meraki MX", color: "#00BCEB", text: `Meraki publishes only stateful FW throughput and VPN throughput. IPS, TLS Inspection, and Threat Protection throughput figures are NOT published by Cisco Meraki for any MX model. Meraki is a cloud-managed-only platform; hardware specs and throughput are intentionally abstracted.` },
            { vendor: "WatchGuard Firebox", color: "#E31837", text: `⚑ FW Throughput uses RFC 2544 methodology (unidirectional UDP, synthetic). This produces higher numbers than IMIX or real-world mixed traffic.
IPS and TLS Inspection: measured with Total Security Suite enabled.
Throughput figures sourced from WatchGuard datasheets.` },
            { vendor: "SonicWall NSa/NSsp", color: "#FF6600", text: `FW Throughput: Multi-core, stateful inspection.
IPS: Industry-standard testing.
TLS Inspection: Full DPI-SSL with certificate inspection.
Threat Protection: GAV + IPS + Application Control + CFS + Bot Control.
NGFW: App Control + IPS.` },
          ].map((m) => (
            <div key={m.vendor} style={{
              background: "#161b22", border: "1px solid #21262d",
              borderLeft: `3px solid ${m.color}`, borderRadius: 8,
              padding: "16px 20px", marginBottom: 16,
            }}>
              <h3 style={{ margin: "0 0 10px", color: m.color, fontSize: 13 }}>{m.vendor}</h3>
              <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.8, color: "#8b949e", whiteSpace: "pre-wrap" }}>{m.text}</pre>
            </div>
          ))}
          <div style={{ background: "#161b22", border: "1px solid #f0883e44", borderRadius: 8, padding: 16 }}>
            <h3 style={{ margin: "0 0 8px", color: "#f0883e", fontSize: 13 }}>⚠ Comparison Caveat</h3>
            <p style={{ margin: 0, fontSize: 11, color: "#8b949e", lineHeight: 1.8 }}>
              Different vendors use different test methodologies. Sophos uses Enterprise Traffic Mix (ETM) for Threat Protection; Fortinet uses Enterprise Mix; Palo Alto combines all services (App-ID + full threat prevention). Meraki does not publish threat throughput. WatchGuard uses RFC 2544 for FW throughput. Direct numeric comparisons across vendors should be treated as approximations. Always test in your own environment.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", height: "calc(100vh - 77px)" }}>
          {/* ── SIDEBAR ── */}
          <div style={{
            width: 220, flexShrink: 0, background: "#161b22",
            borderRight: "1px solid #21262d", padding: "16px 12px",
            overflowY: "auto",
          }}>
            <input
              placeholder="🔍  Search model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", background: "#0d1117", border: "1px solid #30363d",
                borderRadius: 6, color: "#c9d1d9", padding: "6px 10px",
                fontSize: 11, fontFamily: "inherit", marginBottom: 16,
                boxSizing: "border-box",
              }}
            />
            <Section label="VENDORS">
              {Object.entries(VENDORS).map(([key, v]) => (
                <FilterChip key={key} label={v.name} color={v.color}
                  active={vendorFilter.includes(key)}
                  onClick={() => toggleVendor(key)} />
              ))}
            </Section>
            <Section label="TIER">
              {TIERS.map((t) => (
                <FilterChip key={t.id} label={t.label} color="#58a6ff"
                  active={tierFilter.includes(t.id)}
                  onClick={() => toggleTier(t.id)} />
              ))}
            </Section>
            <Section label="FORM FACTOR">
              {FORM_FACTORS.map((f) => (
                <FilterChip key={f.id} label={f.label} color="#bc8cff"
                  active={ffFilter.includes(f.id)}
                  onClick={() => toggleFF(f.id)} />
              ))}
            </Section>
            <div style={{ marginTop: 16, padding: "10px 8px", background: "#0d1117",
              borderRadius: 6, border: "1px solid #21262d" }}>
              <div style={{ fontSize: 10, color: "#6e7681", marginBottom: 4, letterSpacing: "0.06em" }}>SHOWING</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#58a6ff" }}>{filteredData.length}</div>
              <div style={{ fontSize: 10, color: "#6e7681" }}>of {APPLIANCES.length} appliances</div>
            </div>
            <div style={{ marginTop: 12, fontSize: 9, color: "#444c56", lineHeight: 1.6 }}>
              ⚑ = RFC 2544 methodology<br />
              — = Not published<br />
              Click any row cell to add custom benchmark data.
            </div>
          </div>

          {/* ── MAIN TABLE ── */}
          <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
            <table style={{
              borderCollapse: "collapse", width: "max-content", minWidth: "100%",
              fontSize: 11,
            }}>
              <thead>
                <tr style={{ background: "#161b22", position: "sticky", top: 0, zIndex: 10 }}>
                  {COLUMNS.map((col) => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      style={{
                        padding: "10px 12px", textAlign: "left",
                        color: sortKey === col.key ? "#58a6ff" : "#6e7681",
                        cursor: "pointer", whiteSpace: "nowrap",
                        borderBottom: "2px solid #21262d",
                        minWidth: col.w,
                        letterSpacing: "0.04em", fontSize: 10,
                        userSelect: "none",
                      }}>
                      {col.label}
                      {sortKey === col.key && (
                        <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                  <th style={{ padding: "10px 12px", color: "#6e7681",
                    borderBottom: "2px solid #21262d", fontSize: 10,
                    letterSpacing: "0.04em", minWidth: 80 }}>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <>
                    <tr key={row.id}
                      style={{
                        background: i % 2 === 0 ? "#0d1117" : "#111820",
                        borderBottom: "1px solid #21262d",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#1c2333"}
                      onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "#0d1117" : "#111820"}
                    >
                      {COLUMNS.map((col) => {
                        const isCustomizable = col.fmt && col.key !== "vendor" && col.key !== "tier" && col.key !== "formFactor";
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
                              color: isCustomized ? "#fbbf24" : "#c9d1d9",
                              title: isCustomizable ? "Click to enter custom benchmark" : "",
                            }}>
                            {cellVal(row, col)}
                          </td>
                        );
                      })}
                      <td style={{ padding: "8px 12px" }}>
                        <button
                          onClick={() => setShowNotes(showNotes === row.id ? null : row.id)}
                          style={{
                            background: "transparent", border: "1px solid #30363d",
                            color: "#8b949e", borderRadius: 4, padding: "2px 8px",
                            cursor: "pointer", fontSize: 10, fontFamily: "inherit",
                          }}>
                          {showNotes === row.id ? "▲" : "▼"}
                        </button>
                        {hasCustom(row.id) && (
                          <span title="Has custom benchmarks" style={{ marginLeft: 6, color: "#fbbf24", fontSize: 12 }}>★</span>
                        )}
                      </td>
                    </tr>
                    {showNotes === row.id && (
                      <tr key={`${row.id}-note`} style={{ background: "#0d1117" }}>
                        <td colSpan={COLUMNS.length + 1} style={{ padding: "10px 16px" }}>
                          <div style={{
                            background: "#161b22", borderLeft: `3px solid ${VENDORS[row.vendor]?.color}`,
                            borderRadius: 4, padding: "10px 14px", fontSize: 11, color: "#8b949e",
                            lineHeight: 1.7,
                          }}>
                            <div style={{ marginBottom: 6 }}>
                              <a href={row.datasheet} target="_blank" rel="noreferrer"
                                style={{ color: "#58a6ff", fontSize: 10, textDecoration: "none" }}>
                                📄 Datasheet / Source ↗
                              </a>
                              {row.gen && <span style={{ marginLeft: 12, color: "#6e7681", fontSize: 10 }}>Gen: {row.gen}</span>}
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
            {filteredData.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#6e7681" }}>
                No appliances match the current filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOM BENCHMARK MODAL ── */}
      {editingBench && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000aa",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }} onClick={() => setEditingBench(null)}>
          <div style={{
            background: "#161b22", border: "1px solid #30363d", borderRadius: 10,
            padding: "24px 28px", width: 380,
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", color: "#58a6ff", fontSize: 14 }}>
              Custom Benchmark Entry
            </h3>
            <p style={{ margin: "0 0 16px", color: "#6e7681", fontSize: 11 }}>
              {APPLIANCES.find((a) => a.id === editingBench)?.model} — {COLUMNS.find((c) => c.key === benchField)?.label}
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: "#6e7681", display: "block", marginBottom: 4 }}>
                METRIC
              </label>
              <select value={benchField} onChange={(e) => setBenchField(e.target.value)}
                style={{
                  width: "100%", background: "#0d1117", border: "1px solid #30363d",
                  color: "#c9d1d9", borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, fontFamily: "inherit",
                }}>
                {COLUMNS.filter((c) => c.fmt && !["vendor","tier","formFactor"].includes(c.key)).map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "#6e7681", display: "block", marginBottom: 4 }}>
                VALUE (in Mbps, or sessions for Max Sessions)
              </label>
              <input value={benchValue} onChange={(e) => setBenchValue(e.target.value)}
                placeholder="e.g. 1500"
                style={{
                  width: "100%", background: "#0d1117", border: "1px solid #30363d",
                  color: "#c9d1d9", borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, fontFamily: "inherit", boxSizing: "border-box",
                }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveBench} style={{
                flex: 1, background: "#1f6feb", border: "none", color: "#fff",
                borderRadius: 6, padding: "8px", cursor: "pointer",
                fontSize: 12, fontFamily: "inherit",
              }}>Save Benchmark ★</button>
              <button onClick={() => setEditingBench(null)} style={{
                flex: 1, background: "#21262d", border: "1px solid #30363d",
                color: "#8b949e", borderRadius: 6, padding: "8px", cursor: "pointer",
                fontSize: 12, fontFamily: "inherit",
              }}>Cancel</button>
            </div>
            {customBench[editingBench] && (
              <button onClick={() => {
                setCustomBench((prev) => { const n = {...prev}; delete n[editingBench]; return n; });
                setEditingBench(null);
              }} style={{
                marginTop: 8, width: "100%", background: "transparent",
                border: "1px solid #f85149", color: "#f85149", borderRadius: 6,
                padding: "6px", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              }}>Clear all custom benchmarks for this model</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: "0.08em",
        marginBottom: 6, fontWeight: 700 }}>{label}</div>
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
      border: `1px solid ${active ? color : "#30363d"}`,
      color: active ? color : "#6e7681",
      borderRadius: 4, padding: "4px 8px", cursor: "pointer",
      fontSize: 10, fontFamily: "inherit", textAlign: "left",
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

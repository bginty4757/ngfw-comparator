# 🛡 NGFW Comparator

**A React web application for comparing Sophos XGS Series firewalls against Fortinet, Palo Alto Networks, Cisco Meraki, WatchGuard, and SonicWall — across hardware specs, connectivity, and vendor-published performance metrics.**

> **Live Demo:** [Deploy to GitHub Pages — instructions below]
> **Stack:** React + Vite + Tailwind (core utilities only), hosted on GitHub Pages

---

## Features

- **All Sophos XGS models** — Gen 1 and Gen 2 desktop, 1U and 2U rackmount (XGS 87 through XGS 8500)
- **Competitor coverage:** Fortinet FortiGate, Palo Alto PA-Series, Cisco Meraki MX, WatchGuard Firebox, SonicWall NSa/NSsp
- **Performance metrics:** FW Throughput, FW IMIX, IPS, TLS Inspection, Threat Protection, IPSec VPN, NGFW, Max Concurrent Sessions
- **Hardware specs:** Built-in ports, expansion/module options, HA support, redundant PSU, form factor
- **RFC 2544 flag:** Visually flagged for any vendor using RFC 2544 methodology (WatchGuard)
- **Filtering:** By vendor, deployment tier (SOHO → Data Center), and form factor (Desktop / 1U / 2U)
- **Sortable columns** — click any column header
- **Custom benchmark entry** — click any performance cell to input your own lab/test results (highlighted in gold ★)
- **Export to CSV** — entire filtered view
- **Methodology tab** — explains per-vendor test methodology and key caveats
- **GitHub Pages ready** — static build, zero backend

---

## Screenshots

| Table View | Filters + Notes |
|---|---|
| *(screenshot after deployment)* | *(screenshot after deployment)* |

---

## Data Sources

All performance data is sourced directly from vendor-published datasheets. Sources are linked in-app.

| Vendor | Source |
|---|---|
| Sophos XGS | [Sophos XGS Series Datasheet (PDF)](https://www.sophos.com/en-us/products/next-gen-firewall) |
| Fortinet FortiGate | [Fortinet Product Matrix — February 2026 (PDF)](https://www.fortinet.com/content/dam/fortinet/assets/data-sheets/Fortinet_Product_Matrix.pdf) |
| Palo Alto Networks | [PA-Series Datasheets](https://www.paloaltonetworks.com/resources/datasheets) |
| Cisco Meraki MX | [MX Product Family Datasheet](https://meraki.cisco.com/product-collateral/mx-product-family-datasheet/) |
| WatchGuard Firebox | [Firebox T/M/Firebox Series](https://www.watchguard.com/wgrd-products/firewall-appliances) |
| SonicWall NSa/NSsp | [SonicWall NSa / NSsp](https://www.sonicwall.com/products/firewalls/) |

> **Note:** Meraki does not publish IPS, TLS Inspection, or Threat Protection throughput. These cells show `—` by design.
> **Note:** WatchGuard uses RFC 2544 for firewall throughput — flagged with ⚑ in the UI.
> **Note:** All performance values represent vendor-claimed maximums under ideal test conditions. Methodology differences make direct cross-vendor comparisons approximate.

---

## Methodology Notes

Performance test methodologies vary significantly across vendors. See the **Methodology** tab in the app for full details. Summary:

| Vendor | FW Throughput | Threat Protection |
|---|---|---|
| Sophos | HTTP 512 KB (Ixia BreakingPoint) | ETM: FW+IPS+AppCtrl+AV, 200 KB |
| Fortinet | 1518/512/64 byte UDP, ASIC-accel | Enterprise Mix: FW+IPS+AppCtrl+AV |
| Palo Alto | 64 KB HTTP/appmix, App-ID on | All services: App-ID+IPS+AV+WF+DNS |
| Meraki | Not published | Not published |
| WatchGuard | **RFC 2544** (synthetic ⚑) | Total Security Suite enabled |
| SonicWall | Multi-core DPI | GAV+IPS+AppCtrl+CFS+Bot |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A GitHub account (free)

### 1. Clone or Fork

```bash
git clone https://github.com/YOUR_USERNAME/ngfw-comparator.git
cd ngfw-comparator
```

### 2. Install Vite + React

```bash
npm create vite@latest . -- --template react
npm install
```

### 3. Replace the App

Replace `src/App.jsx` with the `firewall-comparator.jsx` file from this repo.

Update `src/main.jsx`:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 4. Run Locally

```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

### 5. Deploy to GitHub Pages

```bash
npm install --save-dev gh-pages
```

Add to `vite.config.js`:
```js
export default {
  base: '/ngfw-comparator/',
}
```

Add to `package.json` scripts:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

Then deploy:
```bash
npm run deploy
```

Go to your repo → **Settings → Pages → Source: gh-pages branch** and your live URL will be:
`https://YOUR_USERNAME.github.io/ngfw-comparator/`

---

## Contributing / Updating Data

All firewall data lives in `firewall-comparator.jsx` in the `APPLIANCES` array. Each model is a plain JavaScript object. To add a new model:

```js
{
  id: "fg-200f",             // Unique ID (slug)
  vendor: "fortinet",        // Must match key in VENDORS object
  model: "FortiGate 200F",   // Display name
  tier: "midmarket",         // soho | smb | midmarket | enterprise | datacenter
  formFactor: "1u",          // desktop | 1u | 2u
  gen: null,                 // Optional generation label
  fwThroughput: 27000,       // Mbps; null if not published
  fwIMIX: null,              // Mbps IMIX figure; null if not published
  rfc2544: false,            // true if vendor uses RFC 2544 methodology
  ipsThroughput: 7000,       // Mbps
  tlsInspection: 4000,       // Mbps
  threatProtection: 3500,    // Mbps
  ipsecVPN: 13000,           // Mbps
  ngfw: 4200,                // Mbps
  maxSessions: 3300000,      // Integer; concurrent sessions
  ports: "16x GE, 4x 10GE SFP+",
  expansionSlots: 0,
  moduleOptions: "None",
  wifi: "None",
  ha: true,
  redundantPower: true,
  formFactorDetail: "1U",
  notes: "Source notes and methodology details.",
  datasheet: "https://...",  // Link to official datasheet
}
```

To add a new vendor, add it to the `VENDORS` object at the top of the file:
```js
const VENDORS = {
  newvendor: { name: "New Vendor", color: "#hex", short: "XX" },
  ...
}
```

---

## Project Structure

```
ngfw-comparator/
├── src/
│   ├── App.jsx              ← firewall-comparator.jsx (rename to App.jsx)
│   └── main.jsx
├── public/
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## Roadmap / Ideas

- [ ] Radar/spider chart for visual model comparison (select 2–4 models)
- [ ] "Match my XGS" wizard — enter throughput requirements, get closest competitors
- [ ] Per-generation filtering (Sophos Gen 1 vs Gen 2)
- [ ] Dark/light mode toggle
- [ ] Persistent custom benchmarks (localStorage)
- [ ] Community data validation / PR workflow for data updates

---

## License

MIT — free to use, modify, and distribute. Data sourced from publicly available vendor datasheets.

---

## Disclaimer

All performance figures are sourced from vendor-published marketing datasheets and represent maximum values under ideal conditions. Test methodologies differ between vendors. This tool is for informational comparison only. Always validate against your own environment and consult vendor representatives for accurate sizing.

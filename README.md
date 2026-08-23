<div align="center">

  <img src="public/logo.png" alt="Maarg Darshan Logo" width="130" />

  # मार्ग Darshan (Maarg Darshan)
  ### *Safer, Smarter & Inclusive Accessible Public Transit & Campus Navigation*

  [![Vercel](https://img.shields.io/badge/Live%20Demo-maargdarshan.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://maargdarshan.vercel.app)

  <br />

  [![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-20.x%20%2F%2024.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

  <p align="center">
    <b>Your Journey. Your Accessibility. Your Safety.</b><br />
    <i>Not just the fastest route — the SAFEST, most ACCESSIBLE and AFFORDABLE route for YOU.</i><br />
    🌐 <b>Live Production App:</b> <a href="https://maargdarshan.vercel.app" target="_blank"><b>maargdarshan.vercel.app</b></a>
  </p>

</div>

---

## 🌐 Live Production Deployment

Maarg Darshan is deployed and live in production on Vercel:
- 🔗 **Live URL**: [https://maargdarshan.vercel.app](https://maargdarshan.vercel.app)
- ⚡ **Continuous Deployment**: Automated CI/CD builds triggered on every commit to `main`.

---

## 📌 Overview & Core Value Proposition

**मार्ग Darshan (Maarg Darshan)** is an accessibility-first public transport, smart micro-transit, and intra-campus navigation ecosystem built for everyday commuters, students, elderly citizens, wheelchair users, and late-night travellers.

Unlike traditional navigation apps that exclusively optimize for raw vehicular speed, **Maarg Darshan** factors in human infrastructure reality:
1. ♿ **Zero-Step Accessibility**: Ramps, step-free sidewalks, low-floor electric buses, and elevator-equipped transit hubs.
2. ⚡ **Official Campus EV Shuttle Corridors**: Real-time matching with zero-emission campus electric buggies (₹0 Free transit) with strict forward-progress verification.
3. 🤝 **Smart Peer-to-Peer Corridor Carpooling**: Instant ride matching, broadcast requests, automatic co-rider acceptance notifications, and masked pricing (`Split on Match`) until confirmed.
4. 🗺️ **Ultra-HD Vector Cartography**: **CartoDB Voyager Retina HD @2x** tile rendering with an interactive style switcher (🗺️ HD Vector, 🛰️ Satellite, ⚪ Clean Minimal) and auto-zoom framing for small campus hops.
5. 🚖 **Multi-Modal Door-to-Door Transit**: Seamless combinations of walking, campus EV, shared autos, on-demand cabs (Uber Web Intent), and intercity rail (IRCTC).
6. 🛡️ **Proactive Safety Watchdog**: Background safety monitoring, 1-click **"I'm Safe"** verification, emergency SOS with live GPS broadcast, and automatic verified safe arrival detection.

---

## 🚀 Core Feature Modules

| Module | Key Capabilities | Status |
| :--- | :--- | :---: |
| **1. High-Precision Campus Navigation** | • Full directory of KIIT King's Palace (KP-1 to KP-25), Queen's Castle (QC-1 to QC-22), Campuses 1 to 25, KSOM, and KIMS.<br>• Instant single-letter & abbreviation autocomplete (`kp5`, `qc1`, `c3 oat`, `ksom`).<br>• Default route initialized to **Queen's Castle 1 (QC 1)** $\rightarrow$ **Campus 3 OAT**. | ✅ **Live** |
| **2. Free Campus EV Fleet Routing** | • Official EV corridors: Loop 0, EV-1, EV-2, EV-3, EV-4, EV-5.<br>• Verified GPS stops: QC 1, Campus 17, Campus 15A, Campus 3 OAT, Campus 25 Block C, Campus 13, Campus 14, Campus 11.<br>• Strict forward progress validation ($\ge 200\text{m}$ progress required; zero detour/backward loops).<br>• 100% Free transit (**₹0 Free**). | ✅ **Live** |
| **3. Smart Corridor Carpooling** | • Post & broadcast carpool requests with departure time and seats.<br>• Live simulated match acceptance notification toasts with co-rider contact details.<br>• Masked pricing (**`Split on Match`**) until ride confirmation.<br>• "Active Carpool Requests Applied" section with automated pruning of expired requests. | ✅ **Live** |
| **4. Ultra-HD Map Design & Switcher** | • **CartoDB Voyager Retina HD** base tiles with sharp vector clarity.<br>• Interactive style switcher (🗺️ HD Map, 🛰️ Esri Satellite, ⚪ Clean Light).<br>• Floating glassmorphic controls: Recenter on Route (`🎯`), Zoom (`+`/`−`), and Live Route Legend.<br>• High-detail auto-zoom framing for short intra-campus distances ($300\text{m} - 1.2\text{km}$). | ✅ **Live** |
| **5. Door-to-Door Multimodal Itineraries** | • Combines Walking $\rightarrow$ Campus EV $\rightarrow$ Shared Auto $\rightarrow$ On-Demand Cab (Uber) $\rightarrow$ Rail (IRCTC).<br>• Itemized price breakdown with step-free badges and booking deep links. | ✅ **Live** |
| **6. Turn-by-Turn GPS Navigation** | • Live movement simulation and step-by-step progress tracking.<br>• Community reporting for vehicle delays, crowding, and broken ramps.<br>• Verified Safe Arrival confirmation screen. | ✅ **Live** |
| **7. Operator Dispatch Portal** | • Operator dashboard (`/operator`) for managing fleet telemetry, injecting condition alerts, and reviewing crowd reports. | ✅ **Live** |

---

## 🗺️ Data Sources & Open-Source Tools

* **Map & Cartography Data**:
  * **OpenStreetMap (OSM)** — Global open-source road network and pedestrian pathway dataset (ODbL).
  * **CartoDB Voyager (CARTO)** — Open-access high-definition vector map tile service based on OSM data.
* **Road Routing & Geometry Engine**:
  * **Project OSRM (Open Source Routing Machine)** — High-performance routing engine using OSM road network graphs for real-world driving and walking navigation geometries.
* **Geocoding & Landmark Search**:
  * **Nominatim (OpenStreetMap Foundation)** — Open-source forward search and reverse geocoding engine.
* **Campus Ground-Truth Mapping**:
  * High-precision surveyed GPS dataset for all student hostels (KP 1–25, QC 1–22) and academic campuses (1–25).
* **Transit Integrations & Protocols**:
  * **Uber Web Intent Protocol** — Universal URI protocol for direct GPS point-to-point cab dispatch.
  * **IRCTC Portal Protocol** — Public integration gateway for long-distance Indian Railways ticket booking.
* **Mapping Framework**:
  * **Leaflet.js & React-Leaflet** — Open-source interactive JavaScript mapping framework.

---

## 🧠 Mathematical Algorithms

1. **Haversine Great-Circle Distance Metric**:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
   *Calculates accurate ground distances across coordinates without planar projection distortion.*

2. **Vector Compass Bearing & Directional Alignment**:
   $$\theta = \text{atan2}\left(\sin(\Delta\text{lng})\cos(\text{lat}_2), \cos(\text{lat}_1)\sin(\text{lat}_2) - \sin(\text{lat}_1)\cos(\text{lat}_2)\cos(\Delta\text{lng})\right)$$
   *Matches carpools and shared routes strictly moving along the same corridor vector ($\le 55^\circ$ angle difference).*

3. **EV Forward Progress & Journey Benefit Verification**:
   $$\text{Progress} = \text{dist}(\text{BoardStop}, \text{Destination}) - \text{dist}(\text{AlightStop}, \text{Destination}) \ge 200\text{ m}$$
   *Guarantees an EV option is only shown if it substantially moves the commuter closer to their destination.*

---

## 🛠️ Technology Stack

```
├── Frontend: React 19 • TypeScript 5.8 • Vite 6 • Tailwind CSS • Leaflet • Lucide Icons
├── Backend: Node.js (v20+ / v24+) • Express.js • TypeScript • Prisma ORM • SQLite / PostgreSQL
└── Routing & Geospatial: Project OSRM • OpenStreetMap • CartoDB Voyager • Nominatim
```

---

## 🏁 Quickstart & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ or v24+
- `npm` v9+
- `git`

### 1. Clone the Repository
```bash
git clone https://github.com/novonil-31/Travel.git
cd Travel
```

### 2. Setup & Start Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```
> Backend API will be active on **`http://localhost:3000`**

### 3. Setup & Start Frontend
In a new terminal window:
```bash
cd ..
npm install
npm run dev
```
> Frontend application will be live at **`http://localhost:5173`**

---

## 👥 Hackathon & Project Information

- **Project Name**: मार्ग Darshan (Maarg Darshan)
- **Problem Statement**: Accessible Public Transport & Smart Campus Micro-Transit Navigation
- **Live URL**: [https://maargdarshan.vercel.app](https://maargdarshan.vercel.app)
- **Repository**: [https://github.com/novonil-31/Travel](https://github.com/novonil-31/Travel)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

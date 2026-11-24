# GRIDTWIN — MASTER PROJECT RECREATION PROMPT
> **Comprehensive System Architecture, Reverse-Engineered Blueprint & Complete Recreation Guide**  
> *Target Workspace:* Antigravity AI Assistant / Full-Stack Autonomous Coding Agent  
> *Author:* Senior Software Architect & Reverse Engineering Engineer  
> *Document Version:* 1.0.0 (Production Blueprint)

---

## EXECUTIVE SUMMARY & SYSTEM OVERVIEW

**GRIDTWIN** is a multi-tier, real-time cyber-physical **Distribution Digital Twin Lab** designed for power systems engineering, educational simulation, live switchgear telemetry, and remote physical hardware control.

The system mirrors a real-world **110kV / 11kV / 415V five-section power distribution feeder corridor**, linking:
1. **Interactive 3D WebGL / Three.js Digital Twin**: A real-time 3D visualization showing transmission towers, conductor sag, substations, step-down transformers, switchgear, and architectural consumer loads with dynamic electrical flow particles, day/night lighting, and red air-gap isolation barriers.
2. **Deterministic Physics & Graph-Theoretic Simulation Engine**: Built on FastAPI and NetworkX, modeling electrical reachability, circuit breaker states, Kirchhoff/Ohm voltage drops, line losses, and unserved demand.
3. **Physical Hardware Bridge (ESP32 + Relays + INA219)**: An ESP32 microcontroller driving an 8-channel optoisolated relay board (controlling physical tower LEDs) and reading high-side voltage/current from an INA219 I2C sensor, communicating via MQTT (<20ms latency).
4. **Toll-Free Interactive Voice Response (IVR) Service**: A telecom-integrated hotline (+1 573 859 5176) powered by Twilio, Google Neural Text-to-Speech, and Edge-TTS in **Tamil**, **English**, and **Hindi**, allowing grid operators to dial in and audit or toggle tower isolation states over the telephone.
5. **Bidirectional State Synchronization**: Simultaneous real-time synchronization between the 3D web application, cloud database, telephone IVR hotline, and physical ESP32 relays via WebSockets and HiveMQ MQTT.

---

## COMPLETE TECHNOLOGY STACK & EXACT VERSIONS

### 1. Frontend Client
* **Framework**: React `19.3.1` with React DOM `19.3.1`
* **Build Tool**: Vite `8.3.4` (ESM module bundling, TypeScript compiler)
* **Language**: TypeScript `~6.0.3` (`tsconfig.app.json`, `tsconfig.node.json`)
* **3D Engine**: Three.js `0.186.1`
* **React 3D Bridge**: `@react-three/fiber` `^9.8.2`
* **3D Helper Suite**: `@react-three/drei` `^10.7.9` (OrbitControls, Billboard, Text, Line, CatmullRomCurve3)
* **State Management**: Zustand `^5.0.16` (authoritative client-side state store)
* **Styling**: Tailwind CSS `^4.3.3` with `@tailwindcss/vite` `^4.3.3`
* **UI Utilities**: `clsx` `^2.1.1`, `tailwind-merge` `^3.7.0`, `class-variance-authority` `^0.7.1`
* **Icons**: `lucide-react` `^1.61.0`
* **Charts**: Recharts `^3.10.1`
* **Data Fetching / Query**: `@tanstack/react-query` `^5.104.5`
* **Routing**: `react-router-dom` `^7.18.4`
* **Linter**: `oxlint` `^1.88.0`

### 2. Cloud Backend & Simulation Engine
* **Language & Runtime**: Python `3.11.9`
* **Web Framework**: FastAPI `^0.104.0`
* **ASGI Server**: Uvicorn `^0.24.0` (with standard workers)
* **Async Network Client**: `httpx` `^0.25.0`, `aiohttp` `^3.9.0`
* **Graph Modeling**: NetworkX `^3.2` (directed electrical graph traversal)
* **Numerical Computations**: NumPy `^1.26.0`
* **Database ORM**: SQLAlchemy `^2.0.23` (AsyncIO mode)
* **Database Drivers**: `aiosqlite` `^0.19.0` (SQLite async), `asyncpg` `^0.29.0` (PostgreSQL async), `psycopg2-binary` `^2.9.9`
* **Database Migrations**: Alembic `^1.13.0`
* **Validation & Settings**: Pydantic `^2.5.0`, `pydantic-settings` `^2.1.0`
* **IoT / MQTT Broker Client**: `paho-mqtt` `^1.6.1` (protocol MQTTv311)
* **Real-Time Streaming**: `websockets` `^12.0`
* **Security & Crypto**: `python-jose[cryptography]` `^3.3.0`, `passlib[bcrypt]` `^1.7.4`
* **Structured Logging**: `structlog` `^23.2.0`

### 3. Toll-Free IVR Service
* **Framework**: FastAPI `^0.104.0`
* **Telephony Gateway**: Twilio Voice Webhooks & TwiML (`twilio` `^8.10.0`)
* **Audio Synthesis (TTS)**: Microsoft Edge TTS (`edge-tts` `^7.0.0`) & Google Neural Speech (`gTTS`)
* **Audio Encoding**: WebM / MP3 neural voice cache
* **Local Persistence**: SQLite3 (`call_logs.db`)
* **Cross-Origin**: FastAPI `CORSMiddleware` (permits webphone dialpad integration)

### 4. Firmware & Physical Prototype
* **Microcontroller Target**: ESP32 DevKit V1 (38-pin / 30-pin)
* **IDE**: Arduino IDE 2.x
* **C++ Libraries**:
  * `WiFi.h` (ESP32 core)
  * `PubSubClient.h` by Nick O'Leary (MQTT client)
  * `ArduinoJson.h` by Benoit Blanchon (v6 or v7)
  * `Wire.h` (I2C bus master)
  * `Adafruit_INA219.h` by Adafruit
* **Physical Relays**: 8-Channel Optoisolated Relay Board (Active-LOW optocoupler trigger)
* **Current/Voltage Sensor**: INA219 High-Side I2C Sensor (Address `0x40`)
* **Public MQTT Broker**: `broker.hivemq.com:1883`

---

## COMPLETE REPOSITORY FILE STRUCTURE

```
gridtwin-workspace/
├── .gitignore
├── render.yaml                          # Render Blueprint deployment configuration
├── run_esp32_simulator.bat              # 1-click batch launcher for Python ESP32 emulator
├── MASTER_PROJECT_RECREATION_PROMPT.md  # Architectural blueprint & recreation prompt
│
├── gridtwin/
│   ├── .env.example                     # Environment template for backend, db, and hardware
│   ├── docker-compose.yml               # Container definition for PostgreSQL, Mosquitto, Backend
│   ├── HARDWARE_INTEGRATION_GUIDE.md    # Detailed electrical schematic and wiring instructions
│   ├── README.md                        # Project technical documentation
│   ├── render.yaml                      # Nested Render manifest
│   │
│   ├── backend/
│   │   ├── gridtwin.db                  # Local SQLite database file
│   │   ├── pyproject.toml               # Python project configuration
│   │   ├── requirements.txt             # Python dependencies
│   │   ├── test_hardware_integration.py # Automated integration tests for MQTT and API
│   │   │
│   │   └── app/
│   │       ├── __init__.py
│   │       ├── main.py                  # Core application entry, REST routes, WebSockets, Lifespan
│   │       │
│   │       ├── api/
│   │       │   └── __init__.py
│   │       │
│   │       ├── core/
│   │       │   ├── __init__.py
│   │       │   └── config.py            # Pydantic Settings, environment variables, defaults
│   │       │
│   │       ├── db/
│   │       │   ├── __init__.py
│   │       │   └── database.py          # SQLAlchemy async session factory & engine setup
│   │       │
│   │       ├── models/
│   │       │   ├── __init__.py
│   │       │   └── models.py            # Complete relational database models & enums
│   │       │
│   │       ├── mqtt/
│   │       │   ├── __init__.py
│   │       │   └── service.py           # Paho-MQTT client service, topic pub/sub handlers
│   │       │
│   │       ├── repositories/
│   │       │   └── __init__.py
│   │       │
│   │       ├── schemas/
│   │       │   ├── __init__.py
│   │       │   └── schemas.py           # Pydantic models for requests, responses, telemetry
│   │       │
│   │       ├── security/
│   │       │   └── __init__.py
│   │       │
│   │       ├── services/
│   │       │   └── __init__.py
│   │       │
│   │       ├── simulation/
│   │       │   ├── __init__.py
│   │       │   └── engine.py            # NetworkX graph topology & electrical physics solver
│   │       │
│   │       ├── tests/
│   │       │   ├── __init__.py
│   │       │   └── test_simulation.py   # Unit tests for electrical calculation engine
│   │       │
│   │       └── websocket/
│   │           ├── __init__.py
│   │           └── manager.py           # WebSocket connection manager & broadcast hub
│   │
│   ├── firmware/
│   │   ├── esp32_simulator.py           # Standalone Python hardware emulator over MQTT
│   │   │
│   │   ├── arduino_gridtwin/
│   │   │   └── arduino_gridtwin.ino     # Complete C++ ESP32 firmware for Arduino IDE
│   │   │
│   │   └── esp32_gridtwin/
│   │       └── (alternative C/C++ project sources)
│   │
│   ├── frontend/
│   │   ├── .gitignore
│   │   ├── .oxlintrc.json               # Oxlint configuration
│   │   ├── index.html                   # HTML5 shell with Google Fonts & responsive meta
│   │   ├── package.json                 # Node.js dependencies and build scripts
│   │   ├── package-lock.json
│   │   ├── README.md
│   │   ├── tsconfig.app.json            # Client TypeScript compiler settings
│   │   ├── tsconfig.json                # Root TypeScript reference config
│   │   ├── tsconfig.node.json           # Vite Node TypeScript config
│   │   ├── vercel.json                  # Vercel deployment & SPA routing rewrites
│   │   ├── vite.config.ts               # Vite configuration with React & Tailwind plugins
│   │   │
│   │   ├── public/
│   │   │   └── (static web assets)
│   │   │
│   │   └── src/
│   │       ├── App.css
│   │       ├── App.tsx                  # Main workspace layout, top header, routing & polling
│   │       ├── index.css                # Global Tailwind CSS definitions & custom scrollbars
│   │       ├── main.tsx                 # React DOM root render
│   │       │
│   │       ├── assets/
│   │       │   ├── hero.png
│   │       │   ├── react.svg
│   │       │   └── vite.svg
│   │       │
│   │       ├── types/
│   │       │   └── index.ts             # Complete TypeScript interfaces, enums, type definitions
│   │       │
│   │       ├── store/
│   │       │   └── useGridStore.ts       # Authoritative Zustand state store, optimistic actions
│   │       │
│   │       └── components/
│   │           ├── 3d/
│   │           │   ├── BypassSwitch3D.tsx         # Animated 3D bypass switchgear model
│   │           │   ├── CameraBookmarks.tsx        # Camera preset transitions (overview, top, side)
│   │           │   ├── ConsumerLoad3D.tsx         # Architectural buildings (Hospital, Industrial, Res)
│   │           │   ├── DistributionPole3D.tsx     # Wooden/concrete distribution poles
│   │           │   ├── GridCanvas.tsx             # Main React Three Fiber Canvas & HUD controls
│   │           │   ├── PowerLine3D.tsx            # Catenary conductor sag cables with flow particles
│   │           │   ├── SceneEnvironment.tsx       # Cyber grid ground plane, sky, lights, fog
│   │           │   ├── Substation3D.tsx           # 33kV primary substation gantry & busbars
│   │           │   ├── SwitchGear3D.tsx           # Disconnect breaker enclosure models
│   │           │   ├── Transformer3D.tsx          # 11kV/415V step-down distribution transformer
│   │           │   ├── TransmissionInterlink3D.tsx# Multi-span conductor lines connecting towers
│   │           │   ├── TransmissionTower3D.tsx    # Double-circuit steel lattice tower model
│   │           │   └── Trees3D.tsx                # Procedural vegetation along the corridor
│   │           │
│   │           └── dashboard/
│   │               ├── DashboardCenterCards.tsx   # Informational metric cards
│   │               ├── DashboardOperationsCenter.tsx # Main SCADA dispatch console
│   │               ├── ElementInspectorModal.tsx  # Detailed inspection dialog for clicked elements
│   │               ├── EventLogFeed.tsx           # Real-time event & audit log stream
│   │               ├── HardwareBridgePanel.tsx    # Live ESP32 connection & pin monitor
│   │               ├── Header.tsx                 # Top navigation bar, live clock, status pills
│   │               ├── KPIBar.tsx                 # 6-card grid performance indicator bar
│   │               ├── LeftSidebar.tsx            # Left navigation bar & project metadata widget
│   │               ├── MetricsChart.tsx           # Recharts real-time voltage/current charts
│   │               ├── RightSidebar.tsx           # Telemetry drawer & alert feed
│   │               ├── ScenarioLabPanel.tsx       # Storm, fault, and overload scenario injector
│   │               ├── SingleLineDiagram.tsx      # 2D interactive single-line electrical schematic
│   │               ├── SwitchControlPanel.tsx     # Manual breaker operating panel
│   │               └── TowerDetailsPanel.tsx      # In-depth tower technical specifications
│   │
│   └── infrastructure/
│       └── mosquitto/
│           └── mosquitto.conf           # Local MQTT broker configuration
│
└── gridtwin toll free/
    ├── .env                             # Local environment variables for IVR service
    ├── .env.example
    ├── app.py                           # FastAPI application for Twilio webhooks & webphone
    ├── audio_messages.py                # Multilingual IVR voice prompts (Ta, En, Hi)
    ├── call_logs.db                     # SQLite database storing call records & DTMF entries
    ├── config.py                        # Toll-free settings, languages, tower definitions
    ├── database.py                      # Call log persistence and audit functions
    ├── generate_all_ivr_audio.py        # Offline neural voice batch generation script
    ├── gridtwin_client.py               # Async HTTP client bridging IVR to 3D Twin backend
    ├── README.md                        # IVR setup instructions & Twilio webhook guide
    ├── requirements.txt                 # Dependencies: twilio, edge-tts, fastapi, uvicorn
    ├── run_tollfree.bat                 # Batch script to launch IVR server locally
    ├── SETUP_GUIDE.md                   # Step-by-step phone carrier configuration
    ├── simulate_call.py                 # CLI telephone call simulator
    ├── test_tollfree.py                 # Automated unit tests for IVR endpoints
    ├── tts_service.py                   # Neural text-to-speech audio synthesis service
    │
    └── static/
        ├── app.js                       # Interactive web dialpad UI logic
        ├── index.html                   # Virtual Toll-Free Webphone & Dialpad interface
        ├── style.css                    # Webphone dark theme styling
        ├── audio/                       # Pre-generated neural MP3 audio prompts
        └── audio_cache/                 # Dynamic runtime audio cache
```

---

## DETAILED COMPONENT ARCHITECTURAL SPECIFICATIONS

### SECTION 1: ELECTRICAL TOPOLOGY & SIMULATION ENGINE

The simulated network represents a **five-section electrical transmission and distribution corridor**:

```
[ Primary 33/11kV Substation (SS-01) ]
       │
   (Conductor E1)
       ▼
 [ Tower 1 (T1) ] ── (Breaker SW-T1) ── [ Transformer TX-01 ] ── [ Load: Residential Quarter ]
       │
   (Conductor E2)
       ▼
 [ Tower 2 (T2) ] ── (Breaker SW-T2) ── [ Transformer TX-02 ] ── [ Load: Commercial Center ]
       │
   (Conductor E3)
       ▼
 [ Tower 3 (T3) ] ── (Breaker SW-T3) ── [ Transformer TX-03 ] ── [ Load: Regional Trauma Hospital ]
       │
   (Conductor E4)
       ▼
 [ Tower 4 (T4) ] ── (Breaker SW-T4) ── [ Transformer TX-04 ] ── [ Load: Heavy Industrial Complex ]
       │
   (Conductor E5)
       ▼
 [ Tower 5 (T5) ] ── (Breaker SW-T5) ── [ Transformer TX-05 ] ── [ Load: Solar Farm & BESS Storage ]
       │
 ═══════════════════════════════════════════════════════════════════════
 [ BYPASS BUS (SW-BYPASS) ] ── Parallels T1 through T5 to feed healthy towers during isolation
```

#### Graph Representation (`engine.py`)
1. **Nodes (`SimNode`)**:
   * `SS-01`: Primary Substation (Voltage: 33.0 kV, Source node).
   * `BUS-11`: 11kV Main Distribution Busbar.
   * `N-01` to `N-05`: 11kV Feeder Junction Nodes at each tower.
   * `TX-01` to `TX-05`: Step-down transformers (11kV to 0.415kV).
   * `LOAD-01` to `LOAD-05`: Consumer connection terminals.
2. **Edges (`SimEdge`)**:
   * `E-SS-BUS`: Substation to Main Bus connection.
   * `E-BUS-N1`: Main Bus to Tower 1.
   * `E-N1-N2`, `E-N2-N3`, `E-N3-N4`, `E-N4-N5`: Inter-tower 11kV spans.
   * `E-N{x}-TX{x}`: Tower feeder drop lines to transformers.
   * `E-TX{x}-LOAD{x}`: Low-voltage (415V) service cables into buildings.
   * `E-BYPASS`: High-capacity redundant bypass conductor span.
3. **Connectivity Algorithm**:
   * Builds an active subgraph `G` where an edge is traversable if and only if:
     * `edge.is_active == True`
     * Associated switch (e.g., `SW-T{x}`) is in the `CLOSED` state.
   * Source node is `SS-01`.
   * Traversal evaluates `nx.has_path(G, source='SS-01', target=node_id)`.
   * Any node unreachable from the source is marked `is_energized = False`.
   * Any load whose connected node is de-energized is marked `is_energized = False`, and its load demand is moved to `unserved_demand_kw`.
4. **Educational Electrical Calculations**:
   * **Nominal Line Voltage**: $V_{LL} = 11.0\text{ kV}$
   * **Active Load Current**:
     $$I = \frac{P}{\sqrt{3} \times V \times \cos(\phi)}$$
   * **Conductor Impedance**:
     $$Z = R + jX = (\text{length\_km} \times r) + j(\text{length\_km} \times x)$$
   * **Voltage Drop**:
     $$\Delta V \approx \sqrt{3} \times I \times (R \cos\phi + X \sin\phi)$$
   * **Conductor Power Loss**:
     $$P_{\text{loss}} = 3 \times I^2 \times R$$

---

### SECTION 2: FRONTEND UI & 3D WEBGL GRAPHICS

#### Design Philosophy & Theme
* **Theme**: Deep Cybernetic SCADA Navy / Dark Space.
* **Palette**:
  * Background Canvas: `#050b18` / `#060a16`
  * Panels & Cards: `#071126` / `#0b132b` (with borders in `slate-800` / `slate-700`)
  * Energized Conductors & Live Towers: Electric Cyan `#38bdf8` / `#67e8f9` with glow intensity `1.2`.
  * Isolated Tower Structure: Bright Golden-Yellow / Amber (`#fbbf24`, core `#b45309`, glow `#f59e0b`).
  * Red Air-Gap Isolation Barriers: Vivid Crimson `#ef4444` (`XX BLOCKED (0 A) FLOW BLOCKED`).
  * Bypass Bus (Active): Emerald Green `#10b981`.
  * De-energized / Offline Elements: Slate Grey `#475569`.

#### Key UI Components
1. **Global Header (`Header.tsx`)**:
   * Left: GRIDTWIN logo icon, subtext *"Distribution Digital Twin Lab"*, animated pulse badge `● System Online`.
   * Center: Live digital clock with seconds and localized date (`HH:MM:SS AM/PM`).
   * Right: Mode switch (`REAL HARDWARE` vs `SIMULATION`), ESP32 connectivity pill (`ESP32 (18ms)` with green pulse dot / `ESP32 OFFLINE` with red dot), and operator avatar (*Madhu*).
2. **Left Navigation Sidebar (`LeftSidebar.tsx`)**:
   * Navigation links: *Home*, *3D Lab*, *2D Lab*, *Grid Overview*, *Monitoring*, *Devices*, *Alerts (badge: 2)*, *Analytics*, *Settings*.
   * Bottom widgets:
     * **Project Card**: Project name, *"Distribution Digital Twin Lab"*, version `v1.0.0`.
     * **System Status Card**: `● System Running`, *"ESP32 Connected"*, signal strength bars.
3. **3D Interactive Canvas (`GridCanvas.tsx`)**:
   * Uses `@react-three/fiber` Canvas with antialiasing, logarithmic depth buffers, and custom tone mapping.
   * OrbitControls with camera presets:
     * `3D View` (overview angle)
     * `Top View` (birds-eye orthogonal perspective)
     * `Side View` (elevation profile)
     * `Full Screen` toggle
   * **Bottom SCADA Command Dock**:
     * **Grid Master**: Batch controls `[ ALL ON ]` (energizes all 5 towers) and `[ ALL OFF ]` (isolates all 5 towers).
     * **Bypass Bus**: Toggle button `[ OPEN ]` / `[ CLOSED ]`.
     * **Individual Towers (T1–T5)**: Single dynamic pill button per tower:
       * When healthy: `ON` (emerald green `bg-emerald-500 text-slate-950`).
       * When isolated: `OFF` (crimson red `bg-rose-600 text-white ring-1 ring-rose-400`).
       * Clicking toggles isolation state via `isolateTower(tId)`.
     * **Bottom Status Strip**:
       * Left: `Alert: Isolated T4 (Unserved)` or `Normal Grid Operation`.
       * Right: Live mini status indicators: `T1 ● ON   T2 ● ON   T3 ● ON   T4 ● OFF   T5 ● ON`.
4. **Transmission Tower 3D Model (`TransmissionTower3D.tsx`)**:
   * Double-circuit galvanized steel lattice tower constructed via procedural line segments.
   * 4 elevation levels: Base Pad $\rightarrow$ Waist $\rightarrow$ Cage $\rightarrow$ Apex Spire.
   * Cantilever crossarms supporting 6-disc insulator strings with conductor clamps.
   * Flashing red aviation obstruction beacon at tower apex ($h = 14\text{m}$).
   * Circular cyber ground projection ring reflecting electrical status.
5. **Air-Gap Current Blocking Indicator (`IsolationBarrier3D`)**:
   * Billboarded 3D element flanking any isolated tower:
     * Bold red `XX` glyphs facing the camera.
     * Text: `BLOCKED (0 A)`
     * Subtext: `FLOW BLOCKED`

---

### SECTION 3: PHYSICAL HARDWARE & FIRMWARE (ESP32)

#### Pin Mapping & Connections
| Tower / Function | ESP32 GPIO Pin | Target Peripheral | Description |
| :--- | :--- | :--- | :--- |
| **Tower 1 (T1)** | **GPIO 13** | Relay Board IN1 | Residential Feeder LED |
| **Tower 2 (T2)** | **GPIO 14** | Relay Board IN2 | Commercial Feeder LED |
| **Tower 3 (T3)** | **GPIO 25** | Relay Board IN3 | Hospital Feeder / Main Isolation |
| **Tower 4 (T4)** | **GPIO 26** | Relay Board IN4 | Industrial Park Feeder LED |
| **Tower 5 (T5)** | **GPIO 27** | Relay Board IN5 | Solar Farm / BESS Storage LED |
| **I2C SDA** | **GPIO 21** | INA219 SDA | High-Side Bus Current/Voltage Sensor |
| **I2C SCL** | **GPIO 22** | INA219 SCL | High-Side Bus Current/Voltage Sensor |

#### Relay Operating Logic
* The optoisolated relay board uses **Active-LOW** driving logic:
  * **ENERGIZED (ON / Normal)**: Pin set to `OUTPUT`, driven `LOW (0V)` $\rightarrow$ Optocoupler conducts $\rightarrow$ Relay NO contacts close $\rightarrow$ Physical Tower LED illuminates.
  * **ISOLATED (OFF / Cut-off)**: Pin set to `OUTPUT`, driven `HIGH (3.3V)` $\rightarrow$ Optocoupler off $\rightarrow$ Relay opens $\rightarrow$ Physical Tower LED turns completely OFF.
* **Firmware Safety**: Tri-state High-Z protection prevents pin float during bootloader execution.

#### MQTT Messaging Architecture
* **Broker Host**: `broker.hivemq.com` (Port `1883`)
* **Client Device ID**: `esp32-gridtwin-001`
* **Topic Taxonomy**:
  * `gridtwin/devices/esp32-gridtwin-001/commands` (Incoming commands from backend)
  * `gridtwin/devices/esp32-gridtwin-001/ack` (Execution acknowledgements)
  * `gridtwin/devices/esp32-gridtwin-001/telemetry` (INA219 voltage, current, power readings)
  * `gridtwin/devices/esp32-gridtwin-001/status` (Periodic heartbeat & firmware status)
  * `gridtwin/devices/esp32-gridtwin-001/availability` (Last Will & Testament: `online`/`offline`)

---

### SECTION 4: TOLL-FREE TELEPHONE IVR SERVICE

#### Call Workflow & Twilio Integration
```
[ Incoming Call to +1 573 859 5176 ]
                  │
                  ▼
        [ /ivr/welcome ]
                  │
       Plays Multilingual Audio:
  - Tamil:   தமிழுக்கு 1ஐ அழுத்தவும்
  - English: For English, press 2
  - Hindi:   हिंदी के लिए 3 दबाएँ
                  │
         (Caller enters DTMF)
                  │
                  ▼
   [ /ivr/language-selected ]
                  │
     Prompt: "Press 1 to 5 to inspect Tower status"
                  │
         (Caller enters digit 1-5)
                  │
                  ▼
    [ /ivr/tower-selected ]
                  │
  Queries GridTwin backend /api/v1/hardware/status
                  │
    ┌─────────────┴─────────────┐
    ▼                           ▼
[ Tower is ACTIVE ]     [ Tower is ISOLATED ]
Voice: "Tower 4 is      Voice: "Alert! Tower 4 is
ACTIVE. Live current    ISOLATED. Breakers open.
passing: 320 Amps."     Zero current flow."
                  │
                  ▼
     [ /ivr/menu-options ]
  - Press 9 to check another tower
  - Press 0 to exit / hang up
```

#### Neural Voice Synthesis & Audio Caching
* Uses `edge-tts` to pre-render ultra-realistic neural speech files into `static/audio/`:
  * Tamil: `ta-IN-ValluvarNeural`
  * English: `en-IN-NeerjaNeural`
  * Hindi: `hi-IN-MadhurNeural`
* Twilio TwiML uses `<Play>` tags referencing the pre-rendered audio URLs on Render, providing **zero-latency, crystal-clear voice prompts** without runtime TTS lag.

---

### SECTION 5: COMPLETE API SPECIFICATION

#### 1. Hardware & Tower Control Endpoints
* `POST /api/v1/hardware/isolate/{tower_id}`
  * Description: Isolates specified tower (`T1` to `T5`), opens simulated breaker, drives physical relay OFF via MQTT.
  * Response:
    ```json
    {
      "status": "SUCCESS",
      "tower_id": "T4",
      "is_isolated": true,
      "output_state": "OFF",
      "output_states": { "T1": "ON", "T2": "ON", "T3": "ON", "T4": "OFF", "T5": "ON" }
    }
    ```
* `POST /api/v1/hardware/restore/{tower_id}`
  * Description: Restores isolated tower back to healthy energized transmission.
* `POST /api/v1/hardware/set-all`
  * Body: `{"state": "ON" | "OFF"}`
  * Description: Batch commands all 5 towers simultaneously.
* `POST /api/v1/hardware/sync`
  * Body: `{"isolated_towers": ["T3", "T4"]}`
  * Description: Batch bidirectional synchronization called by 3D Twin or Toll-Free service.
* `GET /api/v1/hardware/status`
  * Description: Returns device connection state, roundtrip latency, firmware version, and all relay states.
* `GET /api/v1/hardware/telemetry`
  * Description: Returns real-time INA219 bus voltage, shunt voltage, current (mA), and active power (mW).

#### 2. Electrical Simulation Endpoints
* `GET /api/v1/dashboard`
  * Description: Aggregates served demand, active power, unserved demand, active alerts, and network health.
* `GET /api/v1/topology`
  * Description: Returns all nodes, edges, towers, transformers, and 3D coordinates.
* `POST /api/v1/simulation/switch/{switch_id}`
  * Body: `{"requested_state": "OPEN" | "CLOSED"}`
  * Description: Operates modeled breaker and recalculates NetworkX reachability graph.
* `POST /api/v1/simulation/reset`
  * Description: Closes all switches and restores normal baseline transmission.

#### 3. Real-Time WebSocket
* `WebSocket /ws`
  * Event Types Broadcasted:
    * `tower_isolated`: Sent when a tower is cut off.
    * `tower_restored`: Sent when a tower is restored.
    * `telemetry`: Periodic sensor payload (voltage, current, power).
    * `device_status`: ESP32 heartbeat (`ONLINE` / `OFFLINE`).
    * `command_ack`: Physical roundtrip confirmation from ESP32.

---

## MASTER STEP-BY-STEP RECREATION INSTRUCTIONS

When recreating this project in a completely new workspace, execute the following implementation phases in exact sequence:

### PHASE 1: BACKEND INITIALIZATION & DATA MODELS
1. Create `gridtwin/backend/requirements.txt` with FastAPI, Uvicorn, SQLAlchemy, aiosqlite, asyncpg, paho-mqtt, networkx, numpy, pydantic-settings, websockets.
2. Implement `app/core/config.py` using `pydantic_settings.BaseSettings` with fallback defaults for HiveMQ (`broker.hivemq.com:1883`), SQLite (`sqlite+aiosqlite:///gridtwin.db`), and CORS.
3. Implement `app/db/database.py` with SQLAlchemy async engine and declarative base.
4. Implement `app/models/models.py` defining all tables: `Project`, `NetworkVersion`, `Node`, `Edge`, `Component`, `Switch`, `Load`, `SimulationSession`, `Device`, `OutputMapping`, `DeviceCommand`, `TelemetryRecord`, `Alert`, `EventLog`, `AuditLog`.
5. Implement `app/simulation/engine.py` building the default 5-section network topology graph using NetworkX and implementing the reachability/voltage drop solvers.
6. Implement `app/mqtt/service.py` wrapping Paho-MQTT with automatic reconnection, subscription to `gridtwin/devices/+/+`, and LWT handling.
7. Implement `app/websocket/manager.py` to track active browser clients and broadcast JSON events.
8. Implement `app/main.py` mounting all REST endpoints, startup lifespan initializing default data, and the WebSocket `/ws` route.

### PHASE 2: FRONTEND SETUP & 3D CANVASES
1. Initialize Vite React TypeScript project in `gridtwin/frontend`.
2. Configure Tailwind CSS v4 in `vite.config.ts` using `@tailwindcss/vite`.
3. Define complete TypeScript interfaces in `src/types/index.ts` matching the backend schemas.
4. Implement Zustand authoritative state store in `src/store/useGridStore.ts`:
   * Include optimistic UI state updates so clicking tower buttons gives 0ms latency feedback.
   * Protect isolated towers against background telemetry overrides.
   * Connect to backend REST endpoints and live WebSocket `/ws`.
5. Build 3D components in `src/components/3d/`:
   * `TransmissionTower3D.tsx`: Procedural double-circuit lattice tower geometry with color states (`#67e8f9` energized, `#fbbf24` isolated, `#475569` de-energized).
   * `PowerLine3D.tsx`: Catenary Bezier curve cables with animated current flow spheres.
   * `ConsumerLoad3D.tsx`: Procedural architectural buildings (Hospital with helipad, Metropolis commercial skyscraper, Industrial factory, Residential apartments, Solar farm).
   * `IsolationBarrier3D`: Billboarded red `XX BLOCKED (0 A)` warning indicators.
   * `GridCanvas.tsx`: R3F Canvas, camera presets (`3D View`, `Top View`, `Side View`), HUD compass, and bottom SCADA control toolbar with single toggle pills (`ON`/`OFF`) for T1–T5.
6. Build 2D dashboard panels in `src/components/dashboard/`:
   * `Header.tsx`: System Online pill, digital clock, hardware mode pill, ESP32 status pill.
   * `LeftSidebar.tsx`: Navigation menu with active blue pill, Project Card widget, and System Running card.
   * `SingleLineDiagram.tsx`: 2D SVG schematic with matching breaker toggle dock.
   * `KPIBar.tsx`: 6 grid telemetry metrics cards (Active Power, Current, Voltage, Grid Frequency, etc.).

### PHASE 3: FIRMWARE & HARDWARE SIMULATOR
1. Create `gridtwin/firmware/arduino_gridtwin/arduino_gridtwin.ino`:
   * Configure GPIO pins: T1=13, T2=14, T3=25, T4=26, T5=27, I2C=21/22.
   * Active-LOW relay driver logic (`digitalWrite(pin, LOW)` = ON, `HIGH` = OFF).
   * Non-blocking WiFi & MQTT reconnect timers in `loop()`.
   * Fast command parsing in `onMqttMessage` publishing instant ACK.
2. Create `gridtwin/firmware/esp32_simulator.py`:
   * Python script using `paho-mqtt` mimicking the ESP32 board over HiveMQ.
   * Publishes periodic heartbeats and INA219 current readings.
   * Responds to `ISOLATE` and `RESTORE` commands with ACK.
3. Create `run_esp32_simulator.bat` for 1-click execution.

### PHASE 4: TOLL-FREE IVR SERVICE
1. Create `gridtwin toll free/requirements.txt` with `twilio`, `fastapi`, `uvicorn`, `edge-tts`.
2. Implement `app.py` with routes:
   * `/ivr/welcome`: Initial greeting & language selection gather.
   * `/ivr/language-selected`: Tower selection gather.
   * `/ivr/tower-selected`: Queries 3D twin backend and speaks status.
   * `/ivr/menu-options`: Replay or exit.
   * `/api/status`, `/api/towers/sync`: HTTP synchronization endpoints.
3. Implement `tts_service.py` and `generate_all_ivr_audio.py` using `edge-tts` for Tamil, English, and Hindi neural voice prompts.
4. Implement `static/index.html` and `static/app.js` providing an in-browser virtual telephone dialpad with DTMF audio sounds.

---

## THE MASTER RECREATION PROMPT
*(Copy and paste the exact block below into a fresh Antigravity conversation to instruct the agent to build this entire project from scratch)*

```markdown
You are Antigravity, an elite Principal Full-Stack IoT & Power Systems Architect.

Your objective is to build GRIDTWIN from scratch in this workspace: a complete, production-ready, cyber-physical Distribution Digital Twin Lab with real-time 3D WebGL visualization, deterministic electrical simulation, physical ESP32 relay control over MQTT, and a multi-lingual Toll-Free telephone IVR helpline.

Follow these strict system specifications:

1. ARCHITECTURE & DIRECTORY STRUCTURE:
Create the exact repository layout:
- `gridtwin/backend/`: FastAPI backend with NetworkX simulation engine, SQLAlchemy async database, Paho-MQTT service, and WebSockets.
- `gridtwin/frontend/`: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Three.js + React Three Fiber + Zustand.
- `gridtwin/firmware/`: Arduino C++ ESP32 firmware (`arduino_gridtwin.ino`) and Python hardware simulator (`esp32_simulator.py`).
- `gridtwin toll free/`: FastAPI IVR phone service with Twilio webhooks, Edge-TTS multilingual audio (Tamil, English, Hindi), and virtual webphone dialpad.
- Root scripts: `render.yaml`, `run_esp32_simulator.bat`.

2. ELECTRICAL NETWORK MODEL:
Model a 5-section distribution corridor (Substation SS-01 at 33kV -> Main Bus 11kV -> Towers T1 to T5 -> Transformers TX-01 to TX-05 -> 415V Consumer Loads: Residential, Commercial Skyscraper, Hospital, Heavy Industrial, Solar/BESS).
Implement a redundant high-capacity Bypass Bus line paralleling T1 through T5.
Graph reachability must be evaluated with NetworkX: opening any breaker (e.g., SW-T3) de-energizes downstream unserved loads unless the Bypass Bus is closed.

3. FRONTEND & 3D VISUALIZATION:
Use React Three Fiber and Three.js with deep cyber navy theme (#050b18):
- Towers T1-T5: Double-circuit steel lattice pylon geometry with aviation beacons.
- When live: Electric Cyan (#67e8f9) with glowing conductor flow particles.
- When isolated: Vivid Crimson Red (#ef4444 lattice, #991b1b frame) flanked by billboarded red air-gap warning signs: "XX BLOCKED (0 A) FLOW BLOCKED".
- Reverse Feed (Backfeed Current Flow & Hazard Buzzer):
  - Dedicated "Reverse Feed" control button on the SCADA toolbar.
  - When Reverse Feed is switched ON:
    - Current flows through the corridor and towers even if isolated (all conductor spans and power particles remain active).
    - Isolated towers remain RED (#ef4444).
    - The red cross marks ("XX BLOCKED (0 A)") are hidden.
    - An audible dual-tone sawtooth hazard buzzer alarm (880 Hz -> 620 Hz sweep pulsing every 320ms via Web Audio API) sounds continuously.
  - When Reverse Feed is switched OFF:
    - System returns to normal: current is blocked through isolated towers, red cross marks reappear, and the buzzer stops.
- Bottom SCADA Toolbar:
  - Grid Master (ALL ON / ALL OFF buttons).
  - Bypass Bus (toggle switch).
  - Reverse Feed (toggle switch with backfeed hazard buzzer indicator).
  - Individual Towers: Single dynamic pill per tower (T1-T5): emerald green "ON" when energized, rose red "OFF" when isolated. Clicking toggles isolation.
  - Bottom status strip: Left alert pill ("Alert: Isolated T4 (Unserved)" or "⚡ REVERSE FEED DETECTED (🔊 BUZZER ACTIVE)"), right mini indicators ("T1 ● ON ... T4 ● OFF").
  - Camera preset buttons: "3D View", "Top View", "Side View", "Full Screen".
- Header & Sidebar:
  - Header: GRIDTWIN logo, "System Online" pill, live digital clock with seconds, "REAL HARDWARE" mode toggle, and ESP32 status pill ("ESP32 (18ms)" / "ESP32 OFFLINE").
  - Left Sidebar: Navigation tabs, "Project Distribution Digital Twin Lab v1.0.0" card, and "System Running - ESP32 Connected" status.

4. STATE STORE & PERSISTENCE (ZUSTAND):
Implement `useGridStore.ts` with optimistic local updates (0ms lag) that dispatches REST commands to `/api/v1/hardware/isolate/{id}` and `/restore/{id}`, and syncs to the toll-free hotline.
CRITICAL: Background polling and WebSocket heartbeats must NEVER auto-revert a user-isolated tower back to ON. Once isolated, a tower remains OFF until the user explicitly clicks ON.

5. PHYSICAL HARDWARE & MQTT:
ESP32 firmware on `broker.hivemq.com:1883` under `gridtwin/devices/esp32-gridtwin-001/`:
- GPIO pins: T1=13, T2=14, T3=25, T4=26, T5=27, I2C SDA=21, SCL=22.
- Active-LOW relay logic: 0V (LOW) = Relay ON (LED glows), 3.3V (HIGH) = Relay OFF (LED cuts off).
- Reads INA219 current/voltage sensor over I2C and publishes telemetry every 2.5s.
- Instant command ACK execution (<20ms latency).
- Provide `esp32_simulator.py` so the web twin can be tested with virtual hardware immediately.

6. TOLL-FREE IVR SERVICE:
Twilio webhook server supporting telephone calls:
- Entry `/ivr/welcome`: Multilingual greeting ("தமிழுக்கு 1ஐ அழுத்தவும்", "For English press 2", "हिंदी के लिए 3 दबाएँ").
- `/ivr/tower-selected`: Queries GridTwin backend and speaks whether the chosen tower is ACTIVE (with live current) or ISOLATED (power supply blocked).
- Standalone browser webphone dialpad in `static/index.html` with DTMF sounds.
- 24/7 keep-alive background worker preventing Render cold starts.

Do not simplify or omit components. Generate full, working, non-placeholder source code for all modules.
```

---
*End of Master Project Recreation Prompt.*

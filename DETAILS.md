# DETAILS.md

# 🔍 Pi Fan Dashboard — Architecture & File Breakdown

This document explains the modular layout, how each component works, and where files are located in the project.

---

## 🧠 System Architecture

Each Raspberry Pi runs two services:
- **Fan controller (Python)**
- **System status API (Flask)**

The dashboard (hosted on one Pi) polls each API every 10s and visualizes the data.

```plaintext
┌────────────────────────────┐
│   Raspberry Pi (per node)  │
├────────────────────────────┤
│ - Fan Controller           │ ← FanProportional.py
│ - Monitors CPU temp        │
│ - Sets fan PWM speed       │
│ - Writes status file       │
│ - Flask API Server         │ ← Serves /status JSON endpoint
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────────────────────────────┐
│          Web Dashboard (hosted on one Pi)          │
├────────────────────────────────────────────────────┤
│ - HTML + Bootstrap + Chart.js                      |
| - Flask API (pi_manager)                           │ ← Handles saving and updating of JSON file for Pis
│ - Polls each Pi for temperature, CPU, memory, fan  │
│ - Displays history graph per Pi                    │
│ - Mobile-friendly layout                           │
└────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
pifandashboard/
├── fandashboard/                # Dashboard website UI
│   ├── index.html
│   ├── script.js
│   └── js/chart.js              # Chart.js library
├── install_fan_control.sh       # Fan controller installer
├── install_fan_api.sh           # Flask API installer
├── install_pi_manager.sh        # Pi Manager (edit Pis via UI)
├── README.md                    # Main instructions
└── DETAILS.md                   # This file
```

---

## 🌀 Fan Controller: `FanProportional.py`

- Runs as a background service
- Uses GPIO pin 14 for PWM output
- Writes CPU temp and fan speed to `/var/log/fan_status.txt`
- Default path: `/mnt/dietpi_userdata/FanProportional.py`

---

## 🌡️ Fan API: `fan_status_api.py`

- Flask API served on port 10000
- Reads `/var/log/fan_status.txt`
- Adds current CPU and memory usage using `psutil`
- Returns JSON like:

```json
{
  "temperature": "43.2",
  "speed": "32",
  "cpu": 21.4,
  "memory": 35.1
}
```

---

## 🧠 Pi Manager: `pi_manager_api.py`

- Required and ran on Pi running web server
- Flask API served on port 10001
- Reads/writes `/var/www/fandashboard/pi_list.json`
- Provides endpoints to:
  - GET `/get_pi_list`
  - POST `/add_pi`
  - POST `/delete_pi`
  - POST `/edit_pi`

---

## 🖥️ Dashboard Frontend

All files live in `fandashboard/`, to be placed in `/var/www/` for Nginx.

### `index.html`
- Bootstrap layout
- Responsive Pi card grid
- Edit Pi modal (dynamically updated)

### `script.js`
- Fetches `/status` from each Pi
- Renders progress bars, pie charts, history graphs
- Detects online/offline state
- Adds/deletes/edits Pi entries via `pi_manager_api.py`

---

## 🔌 Ports Used

| Port     | Used By          | Description                 |
|----------|------------------|-----------------------------|
| 10000    | fan_status_api   | Status endpoint for each Pi |
| 10001    | pi_manager_api   | Add/edit/delete Pi entries  |
| 80       | Nginx            | Web dashboard access        |

---

## ✅ Design Goals

- Minimal dependencies
- Works offline (local only, all dependencies included instead of via CDN)
- Easily extendable
- Touchscreen and mobile-friendly

---

## 🚀 Future Ideas

- Alert notifications
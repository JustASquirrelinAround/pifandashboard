# Pi Fan Dashboard

🌬️ A multi-Pi dashboard to monitor and control CPU cooling fans using PWM, with real-time status, history graphs, and a responsive web interface.

---

## 📦 Overview

This project ties together:
- A **Python-based PWM fan control script** running on each Raspberry Pi
- A **Flask API** served from each Pi to provide real-time temperature, fan speed, CPU & memory usage
- A centralized **Bootstrap/JavaScript dashboard** that polls all Pis and renders the data using Chart.js

> ✅ This setup is designed for **DietPi**, but should also work with **Raspberry Pi OS** with some manual adjustments (not currently documented).

> 🛑 NOTE: Designed for **Raspberry Pi 3B** (including **3B+**) and **4B**, will <ins>**NOT**</ins> work with **Raspberry Pi 5** if you are using the fan header.

---

## 🧠 Architecture

This project uses a modular design where each Raspberry Pi manages its own fan and exposes system stats via a local API. A centralized dashboard fetches these stats and presents them in real time.

```plaintext
┌────────────────────────────┐
│   Raspberry Pi (per node)  │
├────────────────────────────┤
│ - Fan Controller           │ ← Python script (PWM based)
│ - Monitors CPU temp        │
│ - Sets fan PWM speed       │
│ - Writes status file       │
│ - Flask API Server         │ ← Serves /status JSON endpoint
└────────────┬───────────────┘
             │
             ▼  (HTTP JSON request every 10s)
┌────────────────────────────────────────────────────┐
│          Web Dashboard (hosted on one Pi)          │
├────────────────────────────────────────────────────┤
│ - HTML + Bootstrap + Chart.js                      │
│ - Polls each Pi for temperature, CPU, memory, fan  │
│ - Displays history graph per Pi                    │
│ - Mobile-friendly layout                           │
└────────────────────────────────────────────────────┘
```

---

## 🌀 FanProportional.py

A proportional PWM fan control script designed for 5V Noctua or similar fans using the Raspberry Pi GPIO pins.  
**NOTE: 5V PWM Fans only!**

### Features:
- Proportional speed control between a min/max temperature
- Writes the current temperature & fan speed to a local status file
- Designed to run as a systemd service

### Pins:
- **5V** – Power  
- **GND** – Ground  
- **GPIO14** – PWM signal pin

---

## 📥 Initial Setup (Clone Repo First)

Start by checking git is installed
```bash
sudo apt update
sudo apt install git
```

Then clone this repository to your Pi:

```bash
git clone https://github.com/JustASquirrelinAround/pifandashboard.git
cd pifandashboard
```

This will give you access to:
- `install_fan_control.sh`
- `install_fan_api.sh`
- `fandashboard/` folder containing the web interface

---

## 🔧 Install Fan Control Script (on each Pi)

From the repo directory:

```bash
bash install_fan_control.sh
```

This script installs:
- Python requirements
- `FanProportional.py` in `/mnt/dietpi_userdata/`
- Systemd service to auto-start the fan controller

---

## 🖥️ (Optional) Terminal Command to Check Fan Status

You can add a simple shell alias to quickly view the current CPU temperature and fan speed from the terminal:

```bash
echo "alias fanstatus='cat /var/log/fan_status.txt'" >> ~/.bashrc
source ~/.bashrc
```

Then just run:

```bash
fanstatus
```

Output:

```
CPU Temp: 40.9°C | Fan Speed: 28%
```

---

## 🌐 Install Flask API (on each Pi)

From the repo directory:

```bash
bash install_fan_api.sh
```

This script:
- Installs Flask
- Sets up a Flask app to serve `/status` with JSON info
- Installs it as a systemd service listening on port `10000`

---

## 📋 JSON Output from Flask API

Example response from each Pi:

```json
{
  "temperature": 43.2,
  "speed": 32,
  "cpu": 21.4,
  "memory": 35.1
}
```

This is polled every 10 seconds by the frontend dashboard.

---

## 🌐 Install Nginx

If you're using **DietPi**, you can install Nginx easily via the built-in software tool:

```bash
dietpi-software install 85
```

---

## 🖥️ Web Dashboard Setup

Move the dashboard folder into your web server root:

```bash
sudo cp -r fandashboard/ /var/www/
```

### 🔧 Nginx Configuration

If you're using **Nginx**, update your `sites-available/default` config:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/fandashboard;
    index index.html;

    server_name _;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Then reload Nginx:

```bash
sudo systemctl reload nginx
```

You can now access the dashboard via your Pi’s IP.

---

## 🖼️ Dashboard Features

- ✅ Live CPU Temp & Fan Speed per Pi
- ✅ Pie chart for CPU & Memory usage
- ✅ Colored online/offline status dot
- ✅ Toggle line chart for historical graph
- ✅ Red shading on chart when Pi is offline
- ✅ Mobile-friendly Bootstrap layout
- ✅ Summary: Online/Offline count and last updated time

---

## 📸 Screenshots

<img width="1315" alt="Screenshot 2025-04-15 at 11 33 50 PM" src="https://github.com/user-attachments/assets/78818538-5f25-4642-952f-2d031c5d7192" />
<img width="1323" alt="Screenshot 2025-04-15 at 11 33 34 PM" src="https://github.com/user-attachments/assets/a8df093d-8d24-488a-971e-a12cb5fc5cc4" />
<img width="815" alt="Screenshot 2025-04-15 at 11 37 17 PM" src="https://github.com/user-attachments/assets/38375dba-bcf3-49bd-83cd-017e46aea32a" />

---

## ⚙️ Configuration

Edit `script.js` to define the list of Pis:

```js
const pis = [
  { name: "Homebridge", ip: "192.168.1.101" },
  { name: "Adblock Pi", ip: "192.168.1.102" },
  ...
];
```

---

## Coming Soon

---

## 📜 License

MIT License. Free to use, modify, and contribute.

---

## 🙏 Credits

- Fan control logic originally by Michael Klements ([The DIY Life](https://www.the-diy-life.com/connecting-a-pwm-fan-to-a-raspberry-pi/)) & ([Github Direct Link](https://github.com/mklements/PWMFanControl))
- Chart.js ([chartjs.org](https://www.chartjs.org/)), Bootstrap ([getbootstrap.com](https://getbootstrap.com/)), and DietPi ([dietpi.com](https://dietpi.com/)) for tools & ecosystem

---

# Pi Fan Dashboard

🌬️ A multi-Pi dashboard to monitor and control CPU cooling fans using PWM, with real-time status, history graphs, and a responsive web interface.

---

## 📸 Screenshots

<img width="1315" alt="Dashboard Overview" src="https://github.com/user-attachments/assets/78818538-5f25-4642-952f-2d031c5d7192" />
<img width="1323" alt="Chart View" src="https://github.com/user-attachments/assets/a8df093d-8d24-488a-971e-a12cb5fc5cc4" />
<img width="815" alt="Edit Pi List Modal" src="https://github.com/user-attachments/assets/38375dba-bcf3-49bd-83cd-017e46aea32a" />

---

## 📚 Table of Contents

- Overview
- Initial Setup
- Install on All Raspberry Pis
  - Fan Control Script
  - Flask API for Fan Status
- Install on One Pi Only
  - Nginx Install
  - Web Dashboard Setup
  - Pi Manager API
  - Nginx Configuration
- Dashboard Features
- Optional Terminal Alias
- License
- Credits
- More Details

---

## 📦 Overview

This project lets you monitor and control CPU cooling fans across multiple Raspberry Pis. One Pi hosts a dashboard that polls all other Pis for temperature, fan speed, and resource usage.

> ✅ This setup is designed for **DietPi**, but it should also work with **Raspberry Pi OS** with minor adjustments (not currently documented).
> 🛑 Not compatible with **Raspberry Pi 5** if using the fan header.

---

## 📥 Initial Setup (On All Raspberry Pis)

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
---

# 🧰 Install on All Raspberry Pis

## 🔧 Install Fan Control Script

From the repo directory:

```bash
bash install_fan_control.sh
```

## 🌐 Install Flask API

From the repo directory:

```bash
bash install_fan_api.sh
```

---

# 💻 Install on One Pi Only

## 🌐 Install Nginx

If you're using **DietPi**:

```bash
dietpi-software install 85
```

## 🖥️ Web Dashboard Setup

Copy the dashboard folder into your web server root:

```bash
sudo cp -r fandashboard/ /var/www/
```

## 🔧 Install Pi Manager API (REQUIRED)

```bash
bash install_pi_manager.sh
```

## 🔧 Nginx Configuration

If you're using **Nginx**, update your `sites-available/default` config:

> Located at /etc/nginix/sites-available

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

## 🎉🎉 You can now access the dashboard via your Pi’s IP 🎉🎉

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

## 📜 License

MIT License. Free to use, modify, and contribute.

---

## 🙏 Credits

- Fan control logic originally by Michael Klements ([The DIY Life](https://www.the-diy-life.com/connecting-a-pwm-fan-to-a-raspberry-pi/)) & ([Github Direct Link](https://github.com/mklements/PWMFanControl))
- Chart.js ([chartjs.org](https://www.chartjs.org/)), Bootstrap ([getbootstrap.com](https://getbootstrap.com/)), and DietPi ([dietpi.com](https://dietpi.com/)) for tools & ecosystem

---

## 🧠 More Details

See [`DETAILS.md`](DETAILS.md) for a full explanation of how the system works, including:

- Architecture diagram  
- Description of each script and service

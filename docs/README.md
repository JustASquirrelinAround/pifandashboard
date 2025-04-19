# Pi Fan Dashboard

🌬️ A multi-Pi dashboard to monitor and control CPU cooling fans using PWM, with real-time status, history graphs, and a responsive web interface.

💡 **Recommended Hardware:**  
For best results, use **Noctua NF-A4x10 5V PWM Fans**. 
This setup is designed specifically for controlling fans via the Raspberry Pi's GPIO pins using PWM.

✅ Designed for **Raspberry Pi 3B and B+** along with **Raspberry Pi 4**

❌ Does not work with the **Raspberry 5** fan header

---

## 📸 Screenshots

<img width="1315" alt="Dashboard Overview" src="https://github.com/user-attachments/assets/78818538-5f25-4642-952f-2d031c5d7192" />
<img width="1323" alt="Chart View" src="https://github.com/user-attachments/assets/a8df093d-8d24-488a-971e-a12cb5fc5cc4" />
<img width="815" alt="Edit Pi List Modal" src="https://github.com/user-attachments/assets/38375dba-bcf3-49bd-83cd-017e46aea32a" />

---

## 📚 Table of Contents

- Wiring Guide
- Installer
- Dashboard Features
- Optional Terminal Alias
- Uninstaller
- License
- Credits
- More Details

---

### 🔌 Wiring Guide

Connect your 4-pin 5V PWM fan to the Raspberry Pi using the following pinout:

```plaintext
| Fan Wire           | Connects To (GPIO Header)      | Description             |
|--------------------|--------------------------------|-------------------------|
| **Red (5V)**       | Pin **2** or **4**             | 5V Power                |
| **Black (Ground)** | Pin **6**, **9**, **14**, etc. | Ground                  |
| **Yellow (Tach)**  | *(NOT USED)*                   | *(NOT USED)*            |
| **Blue (PWM)**     | Pin **8 (GPIO14)**             | PWM Control Signal      |
```

> ✅ Only **3 wires** are needed for this project: **Red, Black, Blue**

### 🔧 Fan Mounting

🛠️ A proper **fan mount** is required to securely attach your PWM fan to the Raspberry Pi or your case.  
There are many 3D-printable and off-the-shelf options available depending on your Pi model and enclosure.

🔎 **Tip:** Search online (e.g., Thingiverse or Printables) for "Raspberry Pi fan mount" to find one that suits your setup best.

---

## 📥 Installer

You can use the guided setup script to automatically install everything needed for your Pi Fan Dashboard.

Run this on any Raspberry Pi:

```bash
curl -O https://raw.githubusercontent.com/JustASquirrelinAround/pifandashboard/main/fandashboardsetup.sh

sudo bash fandashboardsetup.sh
```

The script will guide you through:

- 🌀 Installing the fan controller and API for Pis with fans
- 🖥️ Setting up the web dashboard (on a main Pi or web-only Pi)
- 📦 Cloning only the required files
- ✅ Automatically handle DietPi or Raspberry Pi OS
- 🧼 Optionally cleaning up install files

---

## 🔁 Updating the Dashboard

To update the web interface, simply run the **Web Only** option in the setup script again. This will refresh the frontend files without affecting existing settings or the Pi list.

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

## ❌ Uninstall Instructions

If you ever need to remove the Pi Fan Dashboard components, you can use the following uninstall script. This will allow you to selectively remove the fan scripts, Pi manager, and web interface depending on your setup.

Run this on the Pi you wish to uninstall from:

```bash
curl -O https://raw.githubusercontent.com/JustASquirrelinAround/pifandashboard/main/fandashboarduninstaller.sh

sudo bash fandashboarduninstaller.sh
```

This script will:

- 📋 Ask what you'd like to uninstall (Fan scripts, Pi manager, Web interface)
- ✅ Automatically handle DietPi or Raspberry Pi OS
- 🧼 Clean up related files and services

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

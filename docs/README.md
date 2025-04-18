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
- Dashboard Features
- Optional Terminal Alias
- License
- Credits
- More Details

---

## 📥 Initial Setup

You can use the guided setup script to automatically install everything needed for your Pi Fan Dashboard.

### 🚀 One-Line Installer

Run this on any Raspberry Pi:

```bash
curl -sSL https://raw.githubusercontent.com/JustASquirrelinAround/pifandashboard/main/fandashboardsetup.sh | bash
```

The script will guide you through:

- 🌀 Installing the fan controller and API for Pis with fans
- 🖥️ Setting up the web dashboard (on a main Pi or web-only Pi)
- 📦 Cloning only the required files
- ✅ Automatically handling DietPi or Raspberry Pi OS
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

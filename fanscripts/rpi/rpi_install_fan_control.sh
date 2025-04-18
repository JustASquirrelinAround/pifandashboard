#!/bin/bash

echo "Installing required Python GPIO package..."
apt update
apt install -y python3-rpi.gpio

echo "Creating Python fan control script..."
cat << 'EOF' > $HOME/pifandashboard/FanProportional.py
# This script provides proportional PWM control for a 5V PWM fan
# connected to a Raspberry Pi using GPIO14.
# Originally created by: Michael Klements
# Based on: https://www.the-diy-life.com/connecting-a-pwm-fan-to-a-raspberry-pi/
# Modified by JustASquirrelinAround for DietPi to log CPU temperature and fan speed.

import RPi.GPIO as IO
import time

# Disable warnings and use BCM GPIO numbering
IO.setwarnings(False)
IO.setmode(IO.BCM)

# Set GPIO14 as an output and initialize PWM
IO.setup(14, IO.OUT)
fan = IO.PWM(14, 100)
fan.start(0)

# Define temperature and fan speed range
minTemp = 25   # Minimum temperature (°C)
maxTemp = 80   # Maximum temperature (°C)
minSpeed = 0   # Minimum fan speed (%)
maxSpeed = 100 # Maximum fan speed (%)

# Path to store fan status text
status_file = "/var/log/fan_status.txt"

# Function to read CPU temperature
def get_temp():
    with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
        temp = int(f.read()) / 1000.0
    return round(temp, 1)

# Remap value from one range to another
def renormalize(n, range1, range2):
    delta1 = range1[1] - range1[0]
    delta2 = range2[1] - range2[0]
    return (delta2 * (n - range1[0]) / delta1) + range2[0]

# Main control loop
while True:
    temp = get_temp()

    # Clamp temperature to defined range
    if temp < minTemp:
        temp = minTemp
    elif temp > maxTemp:
        temp = maxTemp

    # Convert temperature to PWM speed
    speed = int(renormalize(temp, [minTemp, maxTemp], [minSpeed, maxSpeed]))
    fan.ChangeDutyCycle(speed)

    # Write current values to log file (stored in RAM if using DietPi defaults)
    with open(status_file, "w") as f:
        f.write(f"CPU Temp: {temp}°C | Fan Speed: {speed}%\n")

    time.sleep(5)
EOF

chmod +x $HOME/pifandashboard/FanProportional.py

echo "Creating systemd service..."
cat << EOF > /etc/systemd/system/fancontrol.service
[Unit]
Description=PWM Fan Control Service
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $HOME/pifandashboard/FanProportional.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and enabling service..."
systemctl daemon-reload
systemctl enable fancontrol.service
systemctl start fancontrol.service

echo ""
echo "PWM Fan Controller Installed & Running"
echo "To check service status: systemctl status fancontrol.service"

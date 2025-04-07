#!/bin/bash

echo "Installing required Python GPIO package..."
apt update
apt install -y python3-rpi.gpio

echo "Creating Python fan control script..."
cat << 'EOF' > /mnt/dietpi_userdata/FanProportional.py
import RPi.GPIO as IO
import time

IO.setwarnings(False)
IO.setmode(IO.BCM)
IO.setup(14, IO.OUT)
fan = IO.PWM(14, 100)
fan.start(0)

minTemp = 25
maxTemp = 80
minSpeed = 0
maxSpeed = 100

status_file = "/var/log/fan_status.txt"

def get_temp():
    with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
        temp = int(f.read()) / 1000.0
    return round(temp, 1)

def renormalize(n, range1, range2):
    delta1 = range1[1] - range1[0]
    delta2 = range2[1] - range2[0]
    return (delta2 * (n - range1[0]) / delta1) + range2[0]

while True:
    temp = get_temp()
    if temp < minTemp:
        temp = minTemp
    elif temp > maxTemp:
        temp = maxTemp
    speed = int(renormalize(temp, [minTemp, maxTemp], [minSpeed, maxSpeed]))
    fan.ChangeDutyCycle(speed)

    with open(status_file, "w") as f:
        f.write(f"CPU Temp: {temp}°C | Fan Speed: {speed}%\n")

    time.sleep(5)
EOF

chmod +x /mnt/dietpi_userdata/FanProportional.py

echo "Creating systemd service..."
cat << EOF > /etc/systemd/system/fancontrol.service
[Unit]
Description=PWM Fan Control Service
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /mnt/dietpi_userdata/FanProportional.py
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

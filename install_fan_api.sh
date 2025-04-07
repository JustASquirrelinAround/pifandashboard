#!/bin/bash

# Install required packages
apt update
apt install -y python3-flask python3-psutil python3-flask-cors

# Create the Python script
cat << 'EOF' > /mnt/dietpi_userdata/fan_status_api.py
import psutil
import socket
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

STATUS_FILE = "/var/log/fan_status.txt"

@app.route("/status", methods=["GET"])
def status():
    try:
        with open(STATUS_FILE, "r") as f:
            data = f.read().strip()
        # Parse for structured output
        parts = data.replace("°C", "").replace("%", "").split("|")
        temp = parts[0].split(":")[1].strip()
        speed = parts[1].split(":")[1].strip()

        cpu_usage = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        mem_usage = mem.percent
        hostname = socket.gethostname()

        return jsonify({
            "temperature": temp,
            "speed": speed,
            "cpu": cpu_usage,
            "memory": mem_usage,
            "hostname": hostname
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
EOF

# Make sure the script is executable
chmod +x /mnt/dietpi_userdata/fan_status_api.py

# Create the systemd service file
cat << 'EOF' > /etc/systemd/system/fanapi.service
[Unit]
Description=Fan Status API Service
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /mnt/dietpi_userdata/fan_status_api.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd, enable and start the service
systemctl daemon-reexec
systemctl daemon-reload
systemctl enable fanapi.service
systemctl start fanapi.service

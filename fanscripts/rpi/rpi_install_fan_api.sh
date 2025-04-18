#!/bin/bash

# Check if the service already exists
if [ -f /etc/systemd/system/fanapi.service ]; then
  echo "[INFO] fanapi.service already exists. Skipping installation."
  exit 0
fi

# Install required packages
apt update
apt install -y python3-flask python3-psutil python3-flask-cors

# Create the Python script that runs the Flask API on each Pi
cat << 'EOF' > $HOME/pifandashboard/fan_status_api.py
# fan_status_api.py
# -----------------
# A lightweight Flask API that serves real-time CPU temperature, fan speed,
# CPU usage, memory usage, and hostname for each Raspberry Pi in the dashboard setup.
# This is used by the central Pi Fan Dashboard frontend to poll data from each Pi.
#
# Created by JustASquirrelinAround — https://github.com/JustASquirrelinAround
# Part of the Pi Fan Dashboard project

import psutil               # For CPU and memory usage stats
import socket               # To retrieve the Pi's hostname
from flask import Flask, jsonify
from flask_cors import CORS # Allows cross-origin requests from the web dashboard

# Initialize the Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes (helps with frontend requests)

# Path to the fan status text file written by the fan control script
STATUS_FILE = "/var/log/fan_status.txt"

# Define an API endpoint that returns the fan and system status
@app.route("/status", methods=["GET"])
def status():
    try:
        # Read the most recent fan and temperature status
        with open(STATUS_FILE, "r") as f:
            data = f.read().strip()

        # Example format: "CPU Temp: 40.9°C | Fan Speed: 28%"
        # Clean and split into usable parts
        parts = data.replace("°C", "").replace("%", "").split("|")
        temp = parts[0].split(":")[1].strip()
        speed = parts[1].split(":")[1].strip()

        # Get real-time CPU and memory usage
        cpu_usage = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        mem_usage = mem.percent

        # Get the Pi's hostname for display on the frontend
        hostname = socket.gethostname()

        # Return everything as a structured JSON response
        return jsonify({
            "temperature": temp,
            "speed": speed,
            "cpu": cpu_usage,
            "memory": mem_usage,
            "hostname": hostname
        })
    except Exception as e:
        # Return an error message with status 500 if anything fails
        return jsonify({"error": str(e)}), 500

# Run the Flask app on all network interfaces, port 10000
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
EOF

# Make sure the script is executable
chmod +x $HOME/pifandashboard/fan_status_api.py

# Create the systemd service file
cat << 'EOF' > /etc/systemd/system/fanapi.service
[Unit]
Description=Fan Status API Service
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $HOME/pifandashboard/fan_status_api.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd, enable and start the service
systemctl daemon-reload
systemctl enable fanapi.service
systemctl start fanapi.service

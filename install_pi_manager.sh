#!/bin/bash

echo "Creating Pi Manager Flask API script..."

# Create the Python script in /mnt/dietpi_userdata
cat << 'EOF' > /mnt/dietpi_userdata/pi_manager_api.py
# pi_manager_api.py
# Flask API for dynamically managing a list of Raspberry Pis for dashboard use.
# Provides endpoints to read and update a JSON file with {name, ip} entries.
# Created by JustASquirrelinAround https://github.com/JustASquirrelinAround

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable cross-origin access for web dashboard

PI_LIST_FILE = "/var/www/fandashboard/pi_list.json"

# Create an empty file if it doesn't exist
def init_pi_list():
    if not os.path.exists(PI_LIST_FILE):
        with open(PI_LIST_FILE, "w") as f:
            json.dump([], f)

# Read the current Pi list
def load_pi_list():
    with open(PI_LIST_FILE, "r") as f:
        return json.load(f)

# Save the Pi list to disk
def save_pi_list(data):
    with open(PI_LIST_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.route("/pis", methods=["GET"])
def get_pis():
    try:
        init_pi_list()
        return jsonify(load_pi_list())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/pis", methods=["POST"])
def update_pis():
    try:
        pi_data = request.get_json()
        if not isinstance(pi_data, list):
            return jsonify({"error": "Expected a list of Pi entries"}), 400
        save_pi_list(pi_data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_pi_list()
    app.run(host="0.0.0.0", port=10001)
EOF

chmod +x /mnt/dietpi_userdata/pi_manager_api.py

echo "Creating systemd service file..."

# Create the systemd unit for the Flask API
cat << EOF > /etc/systemd/system/pimanager.service
[Unit]
Description=Pi List Manager Flask API
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /mnt/dietpi_userdata/pi_manager_api.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and starting service..."

systemctl daemon-reload
systemctl enable pimanager.service
systemctl start pimanager.service

echo ""
echo "Pi Manager Flask API is now running on port 10001"
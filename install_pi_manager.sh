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
CORS(app, supports_credentials=True)  # Enable CORS for dashboard access

PI_LIST_FILE = "/var/www/fandashboard/pi_list.json"

# Create an empty JSON file if not found
def init_pi_list():
    if not os.path.exists(PI_LIST_FILE):
        with open(PI_LIST_FILE, "w") as f:
            json.dump([], f)

# Read list from disk
def load_pi_list():
    with open(PI_LIST_FILE, "r") as f:
        return json.load(f)

# Save updated list to disk
def save_pi_list(data):
    with open(PI_LIST_FILE, "w") as f:
        json.dump(data, f, indent=2)

# GET: /get_pi_list - Return current list
@app.route("/get_pi_list", methods=["GET"])
def get_pi_list():
    try:
        init_pi_list()
        return jsonify(load_pi_list())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# POST: /add_pi - Add a new Pi
@app.route("/add_pi", methods=["POST"])
def add_pi():
    try:
        new_pi = request.get_json()
        if not new_pi.get("name") or not new_pi.get("ip"):
            return jsonify({"error": "Missing 'name' or 'ip'"}), 400

        init_pi_list()
        pis = load_pi_list()

        # Prevent duplicate IPs
        if any(p['ip'] == new_pi['ip'] for p in pis):
            return jsonify({"error": "IP already exists"}), 409

        pis.append(new_pi)
        save_pi_list(pis)
        return jsonify({"status": "added"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# POST: /delete_pi - Remove by IP
@app.route("/delete_pi", methods=["POST"])
def delete_pi():
    try:
        pi_to_delete = request.get_json()
        if not pi_to_delete.get("ip"):
            return jsonify({"error": "Missing 'ip' field"}), 400

        init_pi_list()
        pis = load_pi_list()
        pis = [p for p in pis if p['ip'] != pi_to_delete['ip']]
        save_pi_list(pis)
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# POST: /edit_pi - Edit a Pi's name or IP
@app.route("/edit_pi", methods=["POST"])
def edit_pi():
    try:
        data = request.get_json()
        old_ip = data.get("old_ip")
        new_name = data.get("name")
        new_ip = data.get("ip")

        if not old_ip or not new_name or not new_ip:
            return jsonify({"error": "Missing required fields"}), 400

        init_pi_list()
        pis = load_pi_list()

        for pi in pis:
            if pi["ip"] == old_ip:
                pi["name"] = new_name
                pi["ip"] = new_ip
                break
        else:
            return jsonify({"error": "Pi not found"}), 404

        save_pi_list(pis)
        return jsonify({"status": "updated"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the app
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
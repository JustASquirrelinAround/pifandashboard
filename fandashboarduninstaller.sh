#!/bin/bash

# fandashboarduninstaller.sh
# Uninstaller script for the Pi Fan Dashboard system
# Allows selective removal of services, Python scripts, and/or web interface
# Created by JustASquirrelinAround

set -e

# ===== Utility Functions =====
function detect_os() {
  if [ -f /DietPi/dietpi.txt ]; then
    echo "DietPi"
  elif grep -q "Raspbian" /etc/os-release; then
    echo "RaspberryPiOS"
  else
    echo "Unsupported"
  fi
}

function confirm() {
  whiptail --title "$1" --yesno "$2" 10 60
  return $?
}

function info_box() {
  whiptail --title "$1" --msgbox "$2" 10 60
}

function run_if_exists() {
  if systemctl list-units --type=service --all | grep -q "$1"; then
    echo "[INFO] Disabling and removing $1"
    systemctl stop "$1"
    systemctl disable "$1"
    rm -f "/etc/systemd/system/$1"
  fi
}

OS=$(detect_os)

if [[ "$OS" == "Unsupported" ]]; then
  info_box "Unsupported OS" "This uninstaller only supports DietPi and Raspberry Pi OS."
  exit 1
fi

# ===== Confirm What to Uninstall =====
REMOVE_FAN_SERVICE=false
REMOVE_API_SERVICE=false
REMOVE_PI_MANAGER_SERVICE=false
REMOVE_WEB_INTERFACE=false

CHOICE=$(whiptail --title "Select What to Uninstall" --checklist \
"Choose components to remove:" 15 60 5 \
"FanControlService" "Remove PWM fan control service" OFF \
"FanAPIService" "Remove fan status Flask API" OFF \
"PiManagerService" "Remove Pi Manager API" OFF \
"WebInterface" "Remove web interface from /var/www/fandashboard" OFF \
3>&1 1>&2 2>&3)

[[ $CHOICE == *"FanControlService"* ]] && REMOVE_FAN_SERVICE=true
[[ $CHOICE == *"FanAPIService"* ]] && REMOVE_API_SERVICE=true
[[ $CHOICE == *"PiManagerService"* ]] && REMOVE_PI_MANAGER_SERVICE=true
[[ $CHOICE == *"WebInterface"* ]] && REMOVE_WEB_INTERFACE=true

# ===== Perform Removals =====
if $REMOVE_FAN_SERVICE; then
  run_if_exists "fancontrol.service"
  rm -f /mnt/dietpi_userdata/FanProportional.py
  rm -f /home/*/FanProportional.py 2>/dev/null || true
  echo "[INFO] Fan control script and service removed"
fi

if $REMOVE_API_SERVICE; then
  run_if_exists "fanstatusapi.service"
  rm -f /mnt/dietpi_userdata/fan_status_api.py
  rm -f /home/*/fan_status_api.py 2>/dev/null || true
  echo "[INFO] Fan API script and service removed"
fi

if $REMOVE_PI_MANAGER_SERVICE; then
  run_if_exists "pimanagerapi.service"
  rm -f /mnt/dietpi_userdata/pi_manager_api.py
  rm -f /home/*/pi_manager_api.py 2>/dev/null || true
  echo "[INFO] Pi Manager script and service removed"
fi

if $REMOVE_WEB_INTERFACE; then
  rm -rf /var/www/fandashboard
  echo "[INFO] Web interface removed from /var/www/fandashboard"

  # Optionally reset nginx default site if needed
  DEFAULT_SITE="/etc/nginx/sites-available/default"
  if grep -q "fandashboard" "$DEFAULT_SITE"; then
    sed -i 's|/var/www/fandashboard|/var/www/html|g' "$DEFAULT_SITE"
    systemctl restart nginx
    echo "[INFO] Nginx default site restored to /var/www/html"
  fi
fi

info_box "Uninstall Complete" "Selected components have been removed."

exit 0

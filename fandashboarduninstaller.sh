#!/bin/bash

# fandashboarduninstaller.sh
# Uninstaller script for the Pi Fan Dashboard system
# Allows selective removal of services, Python scripts, and/or web interface
# Created by JustASquirrelinAround

# === Privilege Check ===
# DietPi typically runs scripts as root. Enforce only if not already root.
# Check if the script is run as root
if [[ "$EUID" -ne 0 ]]; then
  echo "[ERROR] This script must be run as root. Please use sudo or switch to the root user."
  exit 1
fi

set -e

# ===== Utility Functions =====
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
    systemctl.disable "$1"
    rm -f "/etc/systemd/system/$1"
  fi
}

# ===== Welcome Message =====
whiptail --title "Pi Fan Dashboard Uninstaller" --msgbox \
"Welcome to the Pi Fan Dashboard Uninstaller.\n\nThis tool will remove selected components of the Pi Fan Dashboard system.\n\nCreated by JustASquirrelinAround" 12 70

# ===== Select OS =====
OS=$(whiptail --title "Select OS" --radiolist \
"Choose the operating system of this Pi:" 12 68 2 \
"DietPi" "DietPi system (default for DietPi installs)" ON \
"RaspberryPiOS" "Standard Raspberry Pi OS" OFF \
3>&1 1>&2 2>&3)

if [ -z "$OS" ]; then
  info_box "Cancelled" "You cancelled the OS selection. Exiting..."
  exit 1
fi

# ===== Check for Python virtual environment usage on RaspberryPiOS =====
VENV_USED=false
if [[ "$OS" == "RaspberryPiOS" ]]; then
  if whiptail --title "Virtual Environment?" --yesno \
     "Did you install the Pi Fan Dashboard scripts using a Python virtual environment (venv) at \$HOME/pifandashboard/venv?" 10 70; then
    VENV_USED=true
  fi
fi

# ===== Confirm What to Uninstall =====
REMOVE_FAN_SERVICE=false
REMOVE_API_SERVICE=false
REMOVE_PI_MANAGER_SERVICE=false
REMOVE_WEB_INTERFACE=false

CHOICE=$(whiptail --title "Select What to Uninstall" --checklist \
"Choose components to remove:" 15 77 5 \
"FanControlService"    "Remove PWM fan control service" OFF \
"FanAPIService"        "Remove fan status Flask API"     OFF \
"PiManagerService"     "Remove Pi Manager API"          OFF \
"WebInterface"         "Remove web interface from /var/www/fandashboard" OFF \
3>&1 1>&2 2>&3)

[[ $CHOICE == *"FanControlService"* ]]    && REMOVE_FAN_SERVICE=true
[[ $CHOICE == *"FanAPIService"* ]]        && REMOVE_API_SERVICE=true
[[ $CHOICE == *"PiManagerService"* ]]     && REMOVE_PI_MANAGER_SERVICE=true
[[ $CHOICE == *"WebInterface"* ]]         && REMOVE_WEB_INTERFACE=true

# ===== Show Summary and Confirm =====
SUMMARY_MSG="You selected to uninstall:\n"
$REMOVE_FAN_SERVICE    && SUMMARY_MSG+="• Fan Control Service\n"
$REMOVE_API_SERVICE    && SUMMARY_MSG+="• Fan API Service\n"
$REMOVE_PI_MANAGER_SERVICE && SUMMARY_MSG+="• Pi Manager API Service\n"
$REMOVE_WEB_INTERFACE  && SUMMARY_MSG+="• Web Interface (/var/www/fandashboard)\n"

if ! whiptail --title "Confirm Uninstall" --yesno "$SUMMARY_MSG\n\nDo you want to proceed?" 15 70; then
  info_box "Uninstall Cancelled" "No changes have been made. Exiting..."
  exit 0
fi

# ===== Detect Present Services BEFORE Deletion =====
INITIAL_SERVICES=()
if systemctl list-units --type=service --all | grep -q "fancontrol.service"; then
  INITIAL_SERVICES+=("FanControlService")
fi
if systemctl list-units --type=service --all | grep -q "fanstatusapi.service"; then
  INITIAL_SERVICES+=("FanAPIService")
fi
if systemctl list-units --type=service --all | grep -q "pimanagerapi.service"; then
  INITIAL_SERVICES+=("PiManagerService")
fi

# ===== Perform Removals =====

if $REMOVE_FAN_SERVICE; then
  run_if_exists "fancontrol.service"
  if [[ "$OS" == "DietPi" ]]; then
    rm -f /mnt/dietpi_userdata/FanProportional.py
  else
    rm -f /home/*/FanProportional.py 2>/dev/null || true
  fi
  echo "[INFO] Fan control script and service removed"
fi

if $REMOVE_API_SERVICE; then
  run_if_exists "fanstatusapi.service"
  if [[ "$OS" == "DietPi" ]]; then
    rm -f /mnt/dietpi_userdata/fan_status_api.py
  else
    rm -f /home/*/fan_status_api.py 2>/dev/null || true
  fi
  echo "[INFO] Fan API script and service removed"
fi

if $REMOVE_PI_MANAGER_SERVICE; then
  run_if_exists "pimanagerapi.service"
  if [[ "$OS" == "DietPi" ]]; then
    rm -f /mnt/dietpi_userdata/pi_manager_api.py
  else
    rm -f /home/*/pi_manager_api.py 2>/dev/null || true
  fi
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

# ===== Conditionally Remove Python venv based on INITIAL_SERVICES =====
if [[ "$VENV_USED" == "true" ]]; then
  # Ensure user opted to remove every service that was initially present
  ALL_SELECTED=true
  for svc in "${INITIAL_SERVICES[@]}"; do
    case "$svc" in
      "FanControlService") [[ "$REMOVE_FAN_SERVICE" == "true" ]] || ALL_SELECTED=false ;;
      "FanAPIService")     [[ "$REMOVE_API_SERVICE" == "true" ]] || ALL_SELECTED=false ;;
      "PiManagerService")  [[ "$REMOVE_PI_MANAGER_SERVICE" == "true" ]] || ALL_SELECTED=false ;;
    esac
  done

  if $ALL_SELECTED && [ ${#INITIAL_SERVICES[@]} -gt 0 ]; then
    rm -rf "$HOME/pifandashboard/venv"
    echo "[INFO] Python virtual environment removed from \$HOME/pifandashboard/venv"
  else
    echo "[INFO] Skipping removal of Python virtual environment; not all present services were selected for removal."
  fi
fi

info_box "Uninstall Complete" "Selected components have been removed."

exit 0

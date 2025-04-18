#!/bin/bash

REPO="https://github.com/JustASquirrelinAround/pifandashboard.git"
DRY_RUN=false
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "[INFO] Dry run mode enabled – will not execute install scripts after cloning."
  fi
done
HOME_DIR="$HOME/pifandashboard"

# Ensure whiptail is available
if ! command -v whiptail &> /dev/null; then
  echo "Installing whiptail..."
  sudo apt update && sudo apt install -y whiptail
fi

# === Ensure Git is Installed ===
if ! command -v git &> /dev/null; then
  echo "[INFO] Git not found. Installing..."
  sudo apt update && sudo apt install -y git
fi

# === Welcome Message ===
whiptail --title "Pi Fan Dashboard Setup" \
--msgbox "Welcome to the Pi Fan Dashboard Setup.\n\nThis tool will help you clone and install the required scripts and files based on your Raspberry Pi's role in the fan monitoring setup.\n\nCreated by JustASquirrelinAround" 13 70

# === Choose Role ===
ROLE=$(whiptail --title "Select Pi Type" --menu "What type of Pi is this?" 15 75 3 \
"fanonly" "Pi that only needs Fan Control + API" \
"mainpi"  "Main Pi that runs Fan Control + Web Dashboard" \
"webonly" "Pi that only hosts the Web Dashboard (no fan scripts)" \
3>&1 1>&2 2>&3)

if [ $? -ne 0 ]; then
  echo "[INFO] Setup cancelled by user."
  exit 1
fi

# === Confirm OS ===
OS=$(whiptail --title "Select OS" --menu "Which OS is this Pi running?" 12 50 2 \
"dietpi" "DietPi" \
"rpi"    "Raspberry Pi OS" \
3>&1 1>&2 2>&3)

if [ $? -ne 0 ]; then
  echo "[INFO] Setup cancelled by user."
  exit 1
fi

# === Summary of Selections ===
if whiptail --title "Confirm Selections" --yesno "You selected:\n\nRole: $ROLE\nOS: $OS\n\nContinue with these options?" 12 60; then
  echo "[INFO] Proceeding with selected options..."
else
  echo "[INFO] Restarting setup..."
  exec "$0" "$@"  # Restart script with same arguments
fi


# === Setup Sparse Checkout ===

mkdir -p "$HOME_DIR"
cd "$HOME_DIR"
git init
git remote add origin "$REPO"
git config core.sparseCheckout true

# Set up sparse-checkout paths
SPARSE_FILE=".git/info/sparse-checkout"
echo "" > "$SPARSE_FILE"

if [[ "$ROLE" == "fanonly" || "$ROLE" == "mainpi" ]]; then
  if [ "$OS" == "dietpi" ]; then
    echo "fanscripts/dietpi/*" >> "$SPARSE_FILE"
  else
    echo "fanscripts/rpi/*" >> "$SPARSE_FILE"
  fi
fi

if [[ "$ROLE" == "mainpi" || "$ROLE" == "webonly" ]]; then
  echo "webinterface/fandashboard/*" >> "$SPARSE_FILE"
  if [ "$OS" == "dietpi" ]; then
    echo "webinterface/script/dietpi/*" >> "$SPARSE_FILE"
  else
    echo "webinterface/script/rpi/*" >> "$SPARSE_FILE"
  fi
fi

# Pull only necessary files
git pull origin main

echo ""
echo "[INFO] Cloned files:"
tree -L 2 "$HOME_DIR" || ls -R "$HOME_DIR"
echo ""

if whiptail --title "Continue Setup" --yesno "Files cloned successfully. Would you like to continue to the next part of the setup?" 10 60; then
  echo "[INFO] Proceeding to next setup step..."
  # Future install logic would go here
else
  echo "[INFO] Setup halted by user after cloning."
  exit 0
fi

# === Placeholder ===
echo "[INFO] Selected role: $ROLE"
echo "[INFO] Selected OS: $OS"
echo "[INFO] Repo: $REPO"
echo "[INFO] Will clone into: $HOME_DIR"

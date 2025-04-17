#!/bin/bash

# === Define Repo and Directory ===
REPO="https://github.com/JustASquirrelinAround/pifandashboard.git"
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
--ok-button "Continue" \
--msgbox "Welcome to the Pi Fan Dashboard Setup.\n\nThis tool will help you clone and install the required scripts and files.\nBased on your Raspberry Pi's role in the fan monitoring setup." 13 70

# === Choose Role ===
ROLE=$(whiptail --title "Select Pi Type" --menu "What type of Pi is this?" 15 75 3 \
"fanonly" "Pi that only needs Fan Control + API" \
"mainpi"  "Main Pi that runs Fan Control + Web Dashboard" \
"webonly" "Pi that only hosts the Web Dashboard (no fan scripts)" \
3>&1 1>&2 2>&3)

# === Confirm OS ===
OS=$(whiptail --title "Select OS" --menu "Which OS is this Pi running?" 12 50 2 \
"dietpi" "DietPi (optimized and lightweight)" \
"rpi"    "Raspberry Pi OS (Bullseye or later)" \
3>&1 1>&2 2>&3)

# === Show Summary ===
whiptail --title "Setup Summary" --msgbox "Role: $ROLE\nOS: $OS\n\nEverything will be cloned to:\n$HOME_DIR\n\nPress Continue to begin cloning." 12 60

# === Setup Sparse Checkout (to be implemented next) ===
# mkdir -p "$HOME_DIR"
# cd "$HOME_DIR"
# git init
# git remote add origin "$REPO"
# git config core.sparseCheckout true
# echo "<paths>" > .git/info/sparse-checkout
# git pull origin main

# === Placeholder ===
echo "[INFO] Selected role: $ROLE"
echo "[INFO] Selected OS: $OS"
echo "[INFO] Repo: $REPO"
echo "[INFO] Will clone into: $HOME_DIR"

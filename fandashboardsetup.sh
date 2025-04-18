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

confirmed=false
while [ "$confirmed" = false ]; do

  # === Choose Role ===
  ROLE=$(whiptail --title "Select Pi Type" --nocancel --menu "What type of Pi is this?" 15 75 3 \
    "fanonly" "Pi that only needs Fan Control + API" \
    "mainpi"  "Main Pi that runs Fan Control + Web Dashboard" \
    "webonly" "Pi that only hosts the Web Dashboard (no fan scripts)" \
    3>&1 1>&2 2>&3)

  if [ $? -ne 0 ]; then
    echo "[INFO] Setup cancelled by user."
    exit 1
  fi

  # === Confirm OS ===
  OS=$(whiptail --title "Select OS" --nocancel --menu "Which OS is this Pi running?" 12 50 2 \
    "dietpi" "DietPi" \
    "rpi"    "Raspberry Pi OS" \
    3>&1 1>&2 2>&3)

  if [ $? -ne 0 ]; then
    echo "[INFO] Setup cancelled by user."
    exit 1
  fi

  # === Summary of Selections ===
  if whiptail --title "Confirm Selections" --yesno "You selected:\n\nRole: $ROLE\nOS: $OS\n\nContinue with these options?" 12 60; then
    confirmed=true
  else
    echo "[INFO] Going back to selection menu..."
  fi

done


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
if [ $? -eq 0 ]; then
  whiptail --title "Clone Success" --msgbox "Files cloned successfully!\n\nProceeding to the next step." 10 60
  if whiptail --title "Continue Setup" --yesno "Do you want to continue with installation or quit?" 10 60; then
    echo "[INFO] Proceeding with installation..."
  else
    echo "[INFO] User chose to quit after cloning files."
    exit 0
  fi
else
  whiptail --title "Clone Error" --msgbox "There was an error cloning the repository.\n\nPlease check your internet connection and try again." 10 60
  exit 1
fi

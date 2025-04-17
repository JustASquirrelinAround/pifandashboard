#!/bin/bash

# Check for whiptail
if ! command -v whiptail &> /dev/null; then
  echo "whiptail not found. Please install it with: sudo apt install whiptail"
  exit 1
fi

# Resolve the base path (directory where setup.sh is)
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_DIR="$BASE_DIR/scripts"

# Confirm scripts exist
if [ ! -f "$SCRIPT_DIR/install_fan_control.sh" ] || [ ! -f "$SCRIPT_DIR/install_fan_api.sh" ]; then
  whiptail --title "Error" --msgbox "Could not find the install scripts in $SCRIPT_DIR" 10 60
  exit 1
fi

# Splash screen
whiptail --title "Pi Fan Bulk Installer" --msgbox \
"This tool will SSH into Raspberry Pis and install the fan controller and API scripts.\n\nYou will be prompted for each Pi's SSH password in the terminal." 12 60

while true; do
  # Get target IP or hostname
  PI_IP=$(whiptail --inputbox "Enter the IP address or hostname of the Raspberry Pi:" 10 60 3>&1 1>&2 2>&3) || exit

  # SSH user
  PI_USER=$(whiptail --inputbox "Enter the SSH username (default: pi):" 10 60 "pi" 3>&1 1>&2 2>&3) || exit

  # Confirm info
  whiptail --yesno "Connect to:\n\nUser: $PI_USER\nHost: $PI_IP\n\nProceed?" 12 60 || continue

  # Run install scripts one by one
  for SCRIPT_NAME in install_fan_control.sh install_fan_api.sh; do
    SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_NAME"
    whiptail --infobox "Sending and running $SCRIPT_NAME on $PI_IP...\nYou will be asked to enter the SSH password." 10 60

    # Copy the script to the Pi
    scp "$SCRIPT_PATH" "$PI_USER@$PI_IP:/tmp/$SCRIPT_NAME"
    if [ $? -ne 0 ]; then
      whiptail --msgbox "Failed to copy $SCRIPT_NAME to $PI_IP. Aborting this Pi." 8 50
      break
    fi

    # Run the script
    ssh "$PI_USER@$PI_IP" "bash /tmp/$SCRIPT_NAME"
    if [ $? -ne 0 ]; then
      whiptail --msgbox "Failed to run $SCRIPT_NAME on $PI_IP. Aborting this Pi." 8 50
      break
    fi
  done

  whiptail --msgbox "Fan controller and API successfully installed on $PI_IP!" 8 50

  # Ask if they want to install on another Pi
  whiptail --yesno "Would you like to install on another Pi?" 8 50 || break
done
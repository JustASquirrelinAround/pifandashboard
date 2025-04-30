#!/bin/bash

# === Privilege Check ===
# DietPi typically runs scripts as root. Enforce only if not already root.
# Check if the script is run as root
if [[ "$EUID" -ne 0 ]]; then
  echo "[ERROR] This script must be run as root. Please use sudo or switch to the root user."
  exit 1
fi

REPO="https://github.com/JustASquirrelinAround/pifandashboard.git"
HOME_DIR="$HOME/pifandashboard"

# Ensure whiptail is available
  if ! command -v whiptail &> /dev/null; then
    echo "Installing whiptail..."
    apt update && apt install -y whiptail
  fi

# === Ensure Git is Installed ===
  if ! command -v git &> /dev/null; then
    echo "[INFO] Git not found. Installing..."
    apt update && apt install -y git
  fi

# === Welcome Message ===
whiptail --title "Pi Fan Dashboard Setup" \
--msgbox "Welcome to the Pi Fan Dashboard Setup.\n\nThis tool will help you clone and install the required scripts and files based on your Raspberry Pi's role in the fan monitoring setup.\n\nCreated by JustASquirrelinAround" 13 70

confirmed=false
while [ "$confirmed" = false ]; do

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

  if [ "$OS" == "rpi" ]; then
    if whiptail --title "Python Virtual Environment Option" --yesno "Do you want to use a Python virtual environment (venv) for the Fan Dashboard scripts?\n\nRecommended for systems with Pi-hole or multiple Python environments.\n\nSelect 'No' to use the standard setup." 15 70; then
      USE_VENV=true
    else
      USE_VENV=false
    fi
  fi

  # === Port Selection ===
  is_port_in_use() {
    ss -ltn | awk '{print $4}' | grep -q ":$1$"
  }
  DEFAULT_FAN_PORT=10000
  DEFAULT_PI_PORT=10001

  if ! is_port_in_use $DEFAULT_FAN_PORT && ! is_port_in_use $DEFAULT_PI_PORT; then
    PORT_CHOICE=$(whiptail --title "Port Selection" --menu \
      "Default ports $DEFAULT_FAN_PORT (fan API) and $DEFAULT_PI_PORT (PI manager) are available. Choose:" \
      15 60 2 \
      "default" "Use default ports" \
      "custom"  "Enter custom ports" 3>&1 1>&2 2>&3)

    if [ "$PORT_CHOICE" = "default" ]; then
      FAN_API_PORT=$DEFAULT_FAN_PORT
      PI_MANAGER_PORT=$DEFAULT_PI_PORT
    else
      while true; do
        FAN_API_PORT=$(whiptail --inputbox "Enter Fan API port (1024-65535):" 10 60 "$DEFAULT_FAN_PORT" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ]; then
          echo "[INFO] Port entry cancelled, restarting setup..."
          confirmed=false
          continue 2
        fi
        PI_MANAGER_PORT=$(whiptail --inputbox "Enter PI Manager API port (1024-65535):" 10 60 "$DEFAULT_PI_PORT" 3>&1 1>&2 2>&3)
        if [ $? -ne 0 ]; then
          echo "[INFO] Port entry cancelled, restarting setup..."
          confirmed=false
          continue 2
        fi
        if [[ ! $FAN_API_PORT =~ ^[0-9]+$ ]] || [[ ! $PI_MANAGER_PORT =~ ^[0-9]+$ ]]; then
          whiptail --msgbox "Ports must be numeric." 8 40
          continue
        fi
        if [ $FAN_API_PORT -lt 1024 ] || [ $FAN_API_PORT -gt 65535 ] || \
           [ $PI_MANAGER_PORT -lt 1024 ] || [ $PI_MANAGER_PORT -gt 65535 ]; then
          whiptail --msgbox "Ports must be between 1024 and 65535." 8 50
          continue
        fi
        if is_port_in_use $FAN_API_PORT || is_port_in_use $PI_MANAGER_PORT; then
          MSG="Port status:\n"
          if is_port_in_use $FAN_API_PORT; then
            MSG="$MSG -> Fan API Port ($FAN_API_PORT) (in use)\n"
          else
            MSG="$MSG    Fan API Port ($FAN_API_PORT) (available)\n"
          fi
          if is_port_in_use $PI_MANAGER_PORT; then
            MSG="$MSG -> PI Manager Port ($PI_MANAGER_PORT) (in use)\n"
          else
            MSG="$MSG    PI Manager Port ($PI_MANAGER_PORT) (available)\n"
          fi
          whiptail --msgbox "$(echo -e "$MSG\nChoose different ports.")" 12 60
          continue
        fi
        break
      done
    fi
  else
    MSG="Default port status:\n"
    if is_port_in_use $DEFAULT_FAN_PORT; then
      MSG="$MSG -> Fan API Port ($DEFAULT_FAN_PORT) (in use)\n"
    else
      MSG="$MSG    Fan API Port ($DEFAULT_FAN_PORT) (available)\n"
    fi
    if is_port_in_use $DEFAULT_PI_PORT; then
      MSG="$MSG -> PI Manager Port ($DEFAULT_PI_PORT) (in use)\n"
    else
      MSG="$MSG    PI Manager Port ($DEFAULT_PI_PORT) (available)\n"
    fi
    whiptail --msgbox "$(echo -e "$MSG\nPlease enter custom ports.")" 12 60
    while true; do
      FAN_API_PORT=$(whiptail --inputbox "Enter Fan API port (1024-65535):" 10 60 "" 3>&1 1>&2 2>&3)
      if [ $? -ne 0 ]; then
        echo "[INFO] Port entry cancelled, restarting setup..."
        confirmed=false
        continue 2
      fi
      PI_MANAGER_PORT=$(whiptail --inputbox "Enter PI Manager API port (1024-65535):" 10 60 "" 3>&1 1>&2 2>&3)
      if [ $? -ne 0 ]; then
        echo "[INFO] Port entry cancelled, restarting setup..."
        confirmed=false
        continue 2
      fi
      if [[ ! $FAN_API_PORT =~ ^[0-9]+$ ]] || [[ ! $PI_MANAGER_PORT =~ ^[0-9]+$ ]]; then
        whiptail --msgbox "Ports must be numeric." 8 40; continue
      fi
      if [ $FAN_API_PORT -lt 1024 ] || [ $FAN_API_PORT -gt 65535 ] || \
         [ $PI_MANAGER_PORT -lt 1024 ] || [ $PI_MANAGER_PORT -gt 65535 ]; then
        whiptail --msgbox "Ports must be between 1024 and 65535." 8 50; continue
      fi
      if is_port_in_use $FAN_API_PORT || is_port_in_use $PI_MANAGER_PORT; then
        MSG="Port status:\n"
        if is_port_in_use $FAN_API_PORT; then
          MSG="$MSG -> Fan API Port ($FAN_API_PORT) (in use)\n"
        else
          MSG="$MSG    Fan API Port ($FAN_API_PORT) (available)\n"
        fi
        if is_port_in_use $PI_MANAGER_PORT; then
          MSG="$MSG -> PI Manager Port ($PI_MANAGER_PORT) (in use)\n"
        else
          MSG="$MSG    PI Manager Port ($PI_MANAGER_PORT) (available)\n"
        fi
        whiptail --msgbox "$(echo -e "$MSG\nChoose different ports.")" 12 60
        continue
      fi
      break
    done
  fi

  # === Summary of Selections ===
  SUMMARY="You selected:\n\nRole: $ROLE\nOS: $OS"
  if [ "$OS" == "rpi" ]; then
    if [ "$USE_VENV" == true ]; then
      SUMMARY="$SUMMARY\nVENV: YES (Python Virtual Environment)"
    else
      SUMMARY="$SUMMARY\nVENV: NO (Standard Install)"
    fi
  fi
  SUMMARY="$SUMMARY\nFan API Port: $FAN_API_PORT\nPI Manager Port: $PI_MANAGER_PORT"

  SUMMARY="$SUMMARY\n\nDo you want to continue and pull the required files?"

  if whiptail --title "Confirm Selections" --yesno "$(echo -e "$SUMMARY")" 15 70; then
    confirmed=true
  else
    echo "[INFO] Going back to selection menu..."
  fi

done


# === Setup Sparse Checkout ===

mkdir -p "$HOME_DIR"
cd "$HOME_DIR"
if [ ! -d "$HOME_DIR/.git" ]; then
  git init
  if ! git remote get-url origin &>/dev/null; then
    git remote add origin "$REPO"
  fi
  git config core.sparseCheckout true
fi

# Set up sparse-checkout paths
SPARSE_FILE=".git/info/sparse-checkout"
echo "" > "$SPARSE_FILE"

if [[ "$ROLE" == "fanonly" || "$ROLE" == "mainpi" ]]; then
  if [ "$OS" == "dietpi" ]; then
    echo "fanscripts/dietpi/*" >> "$SPARSE_FILE"
  else
    if [ "$USE_VENV" == true ]; then
      echo "fanscripts/rpi/venv/*" >> "$SPARSE_FILE"
    else
      echo "fanscripts/rpi/*" >> "$SPARSE_FILE"
    fi
  fi
fi

if [[ "$ROLE" == "mainpi" || "$ROLE" == "webonly" ]]; then
  echo "webinterface/fandashboard/*" >> "$SPARSE_FILE"
  if [ "$OS" == "dietpi" ]; then
    echo "webinterface/script/dietpi/*" >> "$SPARSE_FILE"
  else
    if [ "$USE_VENV" == true ]; then
      echo "webinterface/script/rpi/venv/*" >> "$SPARSE_FILE"
    else
      echo "webinterface/script/rpi/*" >> "$SPARSE_FILE"
    fi
  fi
fi

# Check internet connection before pulling from GitHub
if ! ping -c 1 github.com &>/dev/null; then
  whiptail --title "Network Error" --msgbox \
  "Unable to reach GitHub. Please check your internet connection and try again." 10 60
  exit 1
fi

# Pull only necessary files
git pull origin main

INSTALL_LOG="/tmp/fandashboard_install.log"
> "$INSTALL_LOG"

echo ""
if [ $? -eq 0 ]; then
  whiptail --title "Clone Success" --msgbox "Files cloned successfully!\n\nProceeding to the next step." 10 60
  if whiptail --title "Continue Setup" --yesno "Do you want to continue with installation or quit?" 10 60; then
    echo "[INFO] Proceeding with installation..."

    if [[ "$ROLE" == "fanonly" || "$ROLE" == "mainpi" ]]; then
      if [ "$OS" == "dietpi" ]; then
        bash "$HOME_DIR/fanscripts/dietpi/dietpi_install_fan_control.sh" 2>>"$INSTALL_LOG"
        bash "$HOME_DIR/fanscripts/dietpi/dietpi_install_fan_api.sh" "$FAN_API_PORT" 2>>"$INSTALL_LOG"
      else
        if [ "$USE_VENV" == true ]; then
          bash "$HOME_DIR/fanscripts/rpi/venv/rpi_install_fan_control_venv.sh" 2>>"$INSTALL_LOG"
          bash "$HOME_DIR/fanscripts/rpi/venv/rpi_install_fan_api_venv.sh" "$FAN_API_PORT" 2>>"$INSTALL_LOG"
        else
          bash "$HOME_DIR/fanscripts/rpi/rpi_install_fan_control.sh" 2>>"$INSTALL_LOG"
          bash "$HOME_DIR/fanscripts/rpi/rpi_install_fan_api.sh" "$FAN_API_PORT" 2>>"$INSTALL_LOG"
        fi
      fi
    fi

    if [[ "$ROLE" == "mainpi" || "$ROLE" == "webonly" ]]; then
      echo "[INFO] Ensuring rsync is installed..."
      if ! command -v rsync &> /dev/null; then
        echo "[INFO] Installing rsync..."
        apt update && apt install -y rsync 2>>"$INSTALL_LOG"
      fi

      if [ -d "/etc/pihole" ]; then
        if whiptail --title "Pi-hole Detected - Potential Conflict" --yesno \
          "Pi-hole is already installed on this system and uses its own built-in web server.\n\nInstalling another web server like Nginx may interfere with Pi-hole’s interface or functionality.\n\nIf you choose to continue and Pi-hole breaks, it will be up to you to fix or reinstall it.\n\nAre you sure you want to continue anyway?" 15 70; then
          echo "[WARNING] User chose to proceed despite Pi-hole conflict risk."
        else
          echo "[INFO] Installation aborted to avoid conflict with Pi-hole."
          exit 1
        fi
      fi

      echo "[INFO] Checking if Nginx is installed..."
      if ! command -v nginx &> /dev/null; then
        echo "[INFO] Nginx not found. Installing..."
        if [ "$OS" == "dietpi" ]; then
          dietpi-software install 85 2>>"$INSTALL_LOG"
        else
          apt update && apt install -y nginx 2>>"$INSTALL_LOG"
        fi
      else
        echo "[INFO] Nginx is already installed."
      fi
      
      # === Post-Install Setup for Raspberry Pi OS ===
      if [ "$OS" == "rpi" ]; then
        # Check if Nginx is enabled
        if ! systemctl is-enabled nginx &> /dev/null; then
          echo "[INFO] Nginx is not enabled. Enabling and starting..."
          systemctl enable nginx && systemctl start nginx 2>>"$INSTALL_LOG"
        else
          echo "[INFO] Nginx service is already enabled."
        
          # Check if Nginx is running
          if ! systemctl is-active nginx &> /dev/null; then
            echo "[INFO] Nginx is enabled but not running. Starting..."
            systemctl start nginx 2>>"$INSTALL_LOG"
          else
            echo "[INFO] Nginx is already running."
          fi
        fi
      
        # Adjust ownership and permissions of /var/www
        echo "[INFO] Setting web root permissions..."
        chown -R www-data:www-data /var/www 2>>"$INSTALL_LOG"
        chmod -R 755 /var/www 2>>"$INSTALL_LOG"
      
        # Open firewall for HTTP if UFW is installed and active
        if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
          echo "[INFO] Allowing Nginx traffic through UFW..."
          ufw allow 'Nginx Full' 2>>"$INSTALL_LOG" || true
        fi
      fi

      echo "[INFO] Syncing Web Dashboard to /var/www/fandashboard..."
      rsync -av "$HOME_DIR/webinterface/fandashboard/" /var/www/fandashboard/ 2>>"$INSTALL_LOG"
      
      echo "[INFO] Configuring Nginx default site..."
      NGINX_DEFAULT="/etc/nginx/sites-available/default"
      if grep -q "root /var/www/fandashboard;" "$NGINX_DEFAULT"; then
        echo "[INFO] Nginx already configured to use /var/www/fandashboard. Skipping update and restart."
      else
        sed -i 's|root .*|root /var/www/fandashboard;|' "$NGINX_DEFAULT" 2>>"$INSTALL_LOG"
        sed -i 's|index .*|index index.html index.htm;|' "$NGINX_DEFAULT" 2>>"$INSTALL_LOG"
        systemctl restart nginx 2>>"$INSTALL_LOG"
        echo "[INFO] Nginx configuration updated and service restarted."
      fi

      if [ "$OS" == "dietpi" ]; then
        bash "$HOME_DIR/webinterface/script/dietpi/dietpi_install_pi_manager.sh" "$PI_MANAGER_PORT" 2>>"$INSTALL_LOG"
      else
        if [ "$USE_VENV" == true ]; then
          bash "$HOME_DIR/webinterface/script/rpi/venv/rpi_install_pi_manager_venv.sh" "$PI_MANAGER_PORT" 2>>"$INSTALL_LOG"
        else
          bash "$HOME_DIR/webinterface/script/rpi/rpi_install_pi_manager.sh" "$PI_MANAGER_PORT" 2>>"$INSTALL_LOG"
        fi
      fi
    fi

    if [ -s "$INSTALL_LOG" ]; then
      ERROR_MSG=$(cat "$INSTALL_LOG")
      whiptail --title "Install Errors Detected" --msgbox "The following errors occurred during installation:\n\n$ERROR_MSG\n\nPlease review the output above to resolve issues." 20 70
      exit 1
    fi

    # === Final Success Confirmation ===
    whiptail --title "Setup Complete" --msgbox "Installation completed successfully!\n\nYour Pi has been set up based on the selected role." 10 60

    # === Ask if user wants to remove install files ===
    if whiptail --title "Clean Up Installer Files" --yesno "Do you want to delete the cloned install files from $HOME_DIR?" 10 60; then
      rm -rf "$HOME_DIR"
      echo "[INFO] Installer files removed."
    else
      echo "[INFO] Installer files retained at $HOME_DIR"
    fi

    # === Final Message Based on Role ===
    if [[ "$ROLE" == "mainpi" || "$ROLE" == "webonly" ]]; then
      IP_ADDR=$(hostname -I | awk '{print $1}')
      whiptail --title "Web Interface Ready" --msgbox "You can now access the Fan Dashboard from:\n\nhttp://$IP_ADDR\n\nUse any browser on the same network." 10 60
    else
      whiptail --title "Fan Controller Active" --msgbox "The Pi Fan Controller is now running and regulating your Pi's temperature using PWM." 10 60
    fi

  else
    echo "[INFO] User chose to quit after cloning files."
    exit 0
    fi
    
  else
  whiptail --title "Clone Error" --msgbox "There was an error cloning the repository.\n\nPlease check your internet connection and try again." 10 60
  exit 1
fi

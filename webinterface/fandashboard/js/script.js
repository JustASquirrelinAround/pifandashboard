/*
  Pi Fan Dashboard
  https://github.com/JustASquirrelinAround/pifandashboard

  Description:
  A responsive, real-time dashboard to monitor Raspberry Pi CPU temperature,
  fan PWM speed, memory, and CPU usage using data from a lightweight Flask API.

  Technologies:
  - Bootstrap 5 for layout
  - Chart.js for graphs
  - JavaScript (no frameworks)
  - Designed for DietPi but adaptable

  Author: JustASquirrelinAround
  License: MIT
*/

const flaskPort = ${PI_MANAGER_PORT}; // Port of your Flask Pi Manager API
let pis = []; // Global list for dashboard + modal
let justAddedOfflineIp = null;
let currentlyEditingItem = null;

// Auto-format IPv4 input: inserts dots after up to 3 digits per octet and restricts input, enforces 0-255 per octet and tracks previous value for correct dot handling
function formatIpInput(evt) {
  const input = evt.target;
  const prev = input.dataset.prevIp || '';
  // Remove non-digits/dots
  let v = input.value.replace(/[^\d.]/g, '');
  // Split into up to 4 parts
  let parts = v.split('.');
  parts = parts.slice(0, 4).map(p => {
    // Limit to 3 chars
    p = p.slice(0, 3);
    // Enforce numeric 0-255
    const num = parseInt(p, 10);
    if (!isNaN(num)) {
      return Math.min(num, 255).toString();
    }
    return p;
  });
  // Rebuild
  let formatted = parts.join('.');
  // Auto-insert dot on insertion when an octet reaches 3 digits
  if (v.length > prev.length) {
    const last = parts[parts.length - 1];
    if (last.length === 3 && parts.length < 4 && !formatted.endsWith('.')) {
      formatted += '.';
    }
  }
  // Update value and store
  input.value = formatted;
  input.dataset.prevIp = formatted;
}

// Load from Flask JSON endpoint
async function loadPiList() {
  try {
    const response = await fetch(`http://${window.location.hostname}:${flaskPort}/get_pi_list`);
    const data = await response.json();
    pis = data;
    renderPiList();
  } catch (err) {
    console.error("Failed to load Pi list:", err);
  }
}

// New Function: Switch a list item to edit mode with editable inputs
// This function replaces the Pi entry display with input fields and Save/Cancel buttons.
function handleEditMode(li, pi) {
  if (currentlyEditingItem && currentlyEditingItem !== li) {
    // Trigger cancel on previous edit
    const cancelBtn = currentlyEditingItem.querySelector(".cancel-btn");
    if (cancelBtn) cancelBtn.click();
  }
  currentlyEditingItem = li;
  // Create input fields pre-filled with current values (name, ip, port)
  li.innerHTML = `
  <div class="d-flex flex-wrap justify-content-between w-100 align-items-center">
    <div class="d-flex gap-1">
      <input type="text" class="form-control form-control-sm edit-name flex-grow-1" style="max-width: 200px;" value="${pi.name}" />
      <input type="text" class="form-control form-control-sm edit-ip flex-grow-1" style="max-width: 200px;" value="${pi.ip}" />
      <input type="number" class="form-control form-control-sm edit-port flex-grow-1" style="max-width: 100px;" min="1024" max="65535" value="${pi.port}" />
    </div>
    <div>
      <button class="btn btn-sm btn-success save-btn">
        <i class="bi bi-check-lg"></i>
      </button>
      <button class="btn btn-sm btn-danger cancel-btn">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  </div>
`;
  // Attach auto-format to the cloned IP input and initialize prevIp
  const editIpEl = li.querySelector(".edit-ip");
  if (editIpEl) {
    editIpEl.dataset.prevIp = pi.ip;
    editIpEl.addEventListener("input", formatIpInput);
  }

  li.querySelector(".save-btn").addEventListener("click", async () => {
    const updatedName = li.querySelector(".edit-name").value.trim();
    const updatedIp = li.querySelector(".edit-ip").value.trim();
    const updatedPort = parseInt(li.querySelector(".edit-port").value.trim(), 10);
    if (isNaN(updatedPort) || updatedPort < 1024 || updatedPort > 65535) {
      showAlert("Port must be a number between 1024 and 65535.", "warning", true);
      await loadPiList();
      return;
    }

    if (!updatedName || !updatedIp) {
      showAlert("Both fields are required to save.", "warning", true);
      await loadPiList();
      return;
    }

    const alertBox = document.getElementById("piAlert");

    // Show "checking" spinner
    alertBox.className = "alert alert-info";
    alertBox.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <span><i class="bi bi-search me-2"></i>Checking Pi status...</span>
      <div class="spinner-border spinner-border-sm text-primary ms-3" role="status"></div>
    </div>
  `;

    let apiReachable = false;
    try {
      const fanCheck = await fetchWithTimeout(`http://${updatedIp}:${updatedPort}/status`, { timeout: 2000 });
      if (!fanCheck.ok) {
        li.classList.add("bg-warning-subtle", "text-dark");
      } else {
        li.classList.remove("bg-warning-subtle", "text-dark");
        apiReachable = true;
      }
    } catch (err) {
      li.classList.add("bg-warning-subtle", "text-dark");
    }

    const updatedPi = { name: updatedName, ip: updatedIp, port: updatedPort };

    try {
      await editPi(pi.ip, updatedPi);
      if (apiReachable) {
        showAlert("Pi updated successfully and is reachable.", "success");
      } else {
        showAlert("Pi updated, but is not reachable (offline or fan API unavailable).", "warning", true);
      }
    } catch (err) {
      showAlert("Error updating Pi.", "danger", true);
    }

    // Update pi.ip to the new IP before re-rendering
    pi.ip = updatedIp;

    // Save to track offline status for re-render
    if (!apiReachable) justAddedOfflineIp = updatedIp;

    // Remove card so it is refreshed
    const oldCard = document.getElementById(`card-${pi.ip.replaceAll(".", "-")}`);
    if (oldCard) oldCard.remove();

    await loadPiList();
    await updateStatus();
  });

  li.querySelector(".cancel-btn").addEventListener("click", () => {
    currentlyEditingItem = null;
    li.innerHTML = `
      <span><strong>${pi.name}</strong> (${pi.ip}:${pi.port})</span>
      <div>
        <button class="btn btn-sm btn-primary edit-btn" data-ip="${pi.ip}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-btn" data-ip="${pi.ip}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    li.querySelector(".edit-btn").addEventListener("click", () => handleEditMode(li, pi));
    li.querySelector(".delete-btn").addEventListener("click", () => deletePi(pi.ip));
  });
}

// This function posts the updated Pi data to the '/edit_pi' endpoint.
async function editPi(originalIp, updatedPi) {
  try {
    const response = await fetch(`http://${window.location.hostname}:${flaskPort}/edit_pi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalIp, ...updatedPi })
    });
    if (!response.ok) {
      throw new Error("Failed to edit Pi");
    }
  } catch (err) {
    console.error("Edit Pi Error:", err);
    alert("Could not update Pi details.");
  }
}

// Display the Pi list in the modal
function renderPiList() {
  const list = document.getElementById("piListDisplay");
  list.innerHTML = "";

  pis.forEach((pi) => {
    const item = document.createElement("div");
    item.className = "list-group-item d-flex justify-content-between align-items-center mb-2 rounded";

    const safeId = pi.ip.replaceAll(".", "-");
    const header = document.querySelector(`#card-${safeId} .card-header`);

    // Priority check: was this just added as offline?
    if (pi.ip === justAddedOfflineIp) {
      item.classList.add("bg-warning-subtle", "text-dark");
    } else if (header && header.classList.contains("bg-danger")) {
      item.classList.add("bg-warning-subtle", "text-dark");
    } else {
      item.classList.add("bg-secondary", "text-white");
    }

    // Set up the list item with Pi info and Edit/Delete buttons
    item.innerHTML = `
      <span><strong>${pi.name}</strong> (${pi.ip}:${pi.port})</span>
      <div>
        <button class="btn btn-sm btn-primary edit-btn" data-ip="${pi.ip}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-btn" data-ip="${pi.ip}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    // Attach event handlers for edit and delete actions
    item.querySelector(".edit-btn").addEventListener("click", () => handleEditMode(item, pi));
    item.querySelector(".delete-btn").addEventListener("click", () => deletePi(pi.ip));
    list.appendChild(item);
  });

  // Reset after use
  justAddedOfflineIp = null;
}


// Utility: Fetch with timeout (default 2000ms)
async function fetchWithTimeout(resource, { timeout = 2000, ...options } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Main Add Pi function
async function addPi() {
  // Clear any previous alerts
  clearAlert();
  const nameInput = document.getElementById("piNameInput");
  const ipInput = document.getElementById("piIpInput");
  const alertBox = document.getElementById("piAlert");

  const name = nameInput.value.trim();
  const ip = ipInput.value.trim();
  const portInputVal = document.getElementById("piPortInput").value.trim();

  // Check for missing fields
  const missing = [];
  if (!name) missing.push("name");
  if (!ip) missing.push("IP");
  if (!portInputVal) missing.push("port");
  if (missing.length) {
    // Build a human-readable, bolded list of missing fields
    const bolded = missing.map(item => `<strong>${item}</strong>`);
    let listStr;
    if (bolded.length === 1) {
      listStr = bolded[0];
    } else if (bolded.length === 2) {
      listStr = `${bolded[0]} and ${bolded[1]}`;
    } else {
      listStr = `${bolded.slice(0, -1).join(', ')}, and ${bolded.slice(-1)}`;
    }
    showAlert(`Please enter ${listStr}.`, "warning", true);
    return;
  }

  // Validate port number
  const port = parseInt(portInputVal, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    showAlert("Port must be a number between 1024 and 65535.", "warning", true);
    return;
  }

  // Show "checking" spinner
  alertBox.className = "alert alert-info";
  alertBox.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <span><i class="bi bi-search me-2"></i>Checking Pi status...</span>
      <div class="spinner-border spinner-border-sm text-primary ms-3" role="status"></div>
    </div>
  `;

  // Check if the fan API is reachable
  let apiReachable = false;
  try {
    const fanCheck = await fetchWithTimeout(`http://${ip}:${port}/status`, { timeout: 2000 });
    if (fanCheck.ok) {
      apiReachable = true;
    } else {
      console.warn(`Fan API responded but not OK: ${fanCheck.status}`);
    }
  } catch (err) {
    console.warn("Fan API unreachable or timed out:", err);
  }

  // POST to add_pi regardless of reachability (UI will reflect error state)
  try {
    const response = await fetch(`http://${window.location.hostname}:${flaskPort}/add_pi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ip, port })
    });

    if (response.status === 409) {
      showAlert("That Pi IP already exists.", "danger", true);
      return;
    }

    if (!response.ok) throw new Error("Failed to add Pi");

    // Clear inputs
    nameInput.value = "";
    ipInput.value = "";
    document.getElementById("piPortInput").value = "";

    // Show success or warning
    if (apiReachable) {
      showAlert("Pi added and reachable.", "success");
    } else {
      showAlert("Pi added but not reachable (offline or fan API unavailable).", "warning");
      if (!apiReachable) {
        justAddedOfflineIp = ip;
      }
    }

    // Reload list and update cards
    await loadPiList();
    await updateStatus();
    currentlyEditingItem = null;

  } catch (err) {
    console.error("Add Pi Error:", err);
    showAlert("Failed to add Pi due to an unexpected error.", "danger", true);
  }
}

function showAlert(message, type = "success", persistent = false) {
  const alertBox = document.getElementById("piAlert");
  if (!alertBox) return;

  // Set content and styling
  alertBox.className = `alert alert-${type} fade show mt-2`;
  alertBox.innerHTML = persistent
    ? `${message} <button type="button" class="btn-close float-end" onclick="clearAlert()" aria-label="Close"></button>`
    : message;

  alertBox.classList.remove("d-none");

  if (!persistent) {
    // Fade out after 5s
    setTimeout(() => {
      alertBox.classList.remove("show"); // triggers fade out
      setTimeout(() => {
        clearAlert(); // remove completely after fade transition
      }, 300); // Bootstrap fade duration
    }, 5000);
  }
}

function clearAlert() {
  const alertBox = document.getElementById("piAlert");
  if (!alertBox) return; // avoid error if not found
  alertBox.className = "alert d-none";
  alertBox.innerHTML = "";
}

// Delete Pi by IP
async function deletePi(ip) {
  try {
    const response = await fetch(`http://${window.location.hostname}:${flaskPort}/delete_pi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip })
    });

    if (!response.ok) throw new Error("Failed to delete Pi");

    // Remove the card from the DOM if it exists
    const card = document.getElementById(`card-${sanitizeId(ip)}`);
    if (card) {
      card.remove();
    }

    await loadPiList();
  } catch (err) {
    console.error("Delete Pi Error:", err);
    alert("Could not delete Pi.");
  }
}

// Hook modal open to load data
document.getElementById("piListModal").addEventListener("shown.bs.modal", loadPiList);

// Add button event
document.getElementById("addPiButton").addEventListener("click", addPi);

const refreshInterval = 10;
let countdown = refreshInterval;
let countdownInterval;
const statusDiv = document.getElementById("fanStatus");

const piHistory = {};
const maxHistoryPoints = 120;

const pieCharts = {};

function sanitizeId(ip) {
  return ip.replaceAll('.', '-');
}

function updateCountdownDisplay() {
  document.getElementById("countdown-desktop-value").textContent = countdown;
  document.getElementById("countdown-mobile-value").textContent = countdown;
}

function startCountdown() {
  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      countdown = refreshInterval;
      updateStatus();
    }
    updateCountdownDisplay();
  }, 1000);
}

async function fetchStatus(pi) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`http://${pi.ip}:${pi.port}/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error("HTTP error");
    const data = await response.json();
    return { ...pi, data };
  } catch (err) {
    return { ...pi, data: { error: "Unavailable" } };
  }
}

function getTempClass(temp) {
  if (temp >= 70) return "bg-danger";
  if (temp >= 50) return "bg-warning text-dark";
  if (temp >= 40) return "bg-primary";
  return "bg-info text-dark";
}

function getSpeedClass(speed) {
  if (speed >= 80) return "bg-danger";
  if (speed >= 25) return "bg-success";
  return "bg-purple-subtle";
}

function getCpuColor(value) {
  if (value >= 75) return "#dc3545";
  if (value >= 50) return "#ffc107";
  return "#0d6efd";
}

function renderMultiPieChart(id, cpuValue, memValue) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  // Destroy existing chart if one exists
  if (pieCharts[id]) {
    pieCharts[id].destroy();
  }

  // Create and store the new chart
  pieCharts[id] = new Chart(ctx, {
    type: "pie",
    data: {
      datasets: [
        {
          label: "CPU",
          data: [cpuValue, 100 - cpuValue],
          backgroundColor: [getCpuColor(cpuValue), "#6c757d"],
          borderWidth: 1
        },
        {
          label: "Memory",
          data: [memValue, 100 - memValue],
          backgroundColor: ["#ffc107", "#6c757d"],
          borderWidth: 1
        }
      ]
    },
    options: {
      animation: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function updatePiHistoryChart(pi) {
  const safeId = sanitizeId(pi.ip);
  if (!piHistory[safeId]) {
    piHistory[safeId] = { labels: [], temp: [], speed: [], cpu: [], memory: [], chart: null };
  }
  const hist = piHistory[safeId];
  const timestamp = new Date().toLocaleTimeString();
  hist.labels.push(timestamp);
  hist.temp.push(parseFloat(pi.data.temperature));
  hist.speed.push(parseInt(pi.data.speed));
  hist.cpu.push(parseFloat(pi.data.cpu));
  hist.memory.push(parseFloat(pi.data.memory));
  if (hist.labels.length > maxHistoryPoints) {
    hist.labels.shift(); hist.temp.shift(); hist.speed.shift(); hist.cpu.shift(); hist.memory.shift();
  }
  const ctx = document.getElementById(`historyChart-${safeId}`);
  if (!ctx) return;
  if (!hist.chart) {
    hist.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: hist.labels,
        datasets: [
          { label: "Temp (°C)", data: hist.temp, borderColor: "#0d6efd", tension: 0.3 },
          { label: "Fan Speed (%)", data: hist.speed, borderColor: "#198754", tension: 0.3 },
          { label: "CPU (%)", data: hist.cpu, borderColor: "#6610f2", tension: 0.3 },
          { label: "Memory (%)", data: hist.memory, borderColor: "#ffc107", tension: 0.3 }
        ]
      },
      options: { animation: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
  } else {
    hist.chart.data.labels = hist.labels;
    hist.chart.data.datasets[0].data = hist.temp;
    hist.chart.data.datasets[1].data = hist.speed;
    hist.chart.data.datasets[2].data = hist.cpu;
    hist.chart.data.datasets[3].data = hist.memory;
    hist.chart.update();
  }
}

function updateCard(pi) {
  const safeId = sanitizeId(pi.ip);
  const cardEl = document.getElementById(`card-${safeId}`);

  // Determine if card was previously offline
  const wasOffline = cardEl.querySelector(".card-header.bg-danger") !== null;
  const isNowOffline = !!pi.data.error;

  // If online/offline state has changed, fully re-render card
  if (wasOffline !== isNowOffline) {
    cardEl.remove();
    createCard(pi);

    // Schedule a second update to render Chart.js properly
    setTimeout(() => updateCard(pi), 0);
    return;
  }

  // Update dot color
  const dot = cardEl.querySelector(".status-dot");
  if (dot) dot.style.backgroundColor = isNowOffline ? "#dc3545" : "#4be34b";

  const cardBody = cardEl.querySelector(".card-body");
  const overview = document.getElementById(`overview-${safeId}`);
  const chartview = document.getElementById(`chartview-${safeId}`);
  const errorBadge = cardBody.querySelector(".badge.bg-danger");

  if (isNowOffline) {
    // Hide everything else
    if (overview) overview.classList.add("d-none");
    if (chartview) chartview.classList.add("d-none");

    // Add error badge if missing
    if (!errorBadge) {
      const badge = document.createElement("span");
      badge.className = "badge bg-danger fs-6";
      badge.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${pi.data.error}`;
      cardBody.appendChild(badge);
    }

    return;
  }

  // Now online — make sure error badge is removed
  if (errorBadge) errorBadge.remove();

  const isChartVisible = chartview && !chartview.classList.contains("d-none");
  if (isChartVisible) {
    chartview.classList.remove("d-none");
    overview.classList.add("d-none");
  } else {
    chartview.classList.add("d-none");
    overview.classList.remove("d-none");
  }

  // Update bars
  const temp = parseFloat(pi.data.temperature);
  const speed = parseInt(pi.data.speed);
  const tempBar = cardEl.querySelector(".temp-bar");
  const speedBar = cardEl.querySelector(".speed-bar");
  if (tempBar) {
    tempBar.style.width = `${temp}%`;
    tempBar.textContent = `${temp}°C`;
    tempBar.className = `progress-bar progress-bar-striped ${getTempClass(temp)} temp-bar`;
  }
  if (speedBar) {
    speedBar.style.width = `${speed}%`;
    speedBar.textContent = `${speed}%`;
    speedBar.className = `progress-bar progress-bar-striped ${getSpeedClass(speed)} speed-bar`;
  }

  renderMultiPieChart(`multiChart-${safeId}`, pi.data.cpu, pi.data.memory);
  updatePiHistoryChart(pi);
}

function createCard(pi) {
  const safeId = sanitizeId(pi.ip);
  const temp = pi.data.error ? 0 : parseFloat(pi.data.temperature);
  const speed = pi.data.error ? 0 : parseInt(pi.data.speed);

  const statusDot = pi.data.error
    ? '<span class="status-dot" style="display:inline-block; width:12px; height:12px; background-color:#dc3545; border-radius:50%; margin-left:8px; vertical-align: middle;"></span>'
    : '<span class="status-dot" style="display:inline-block; width:12px; height:12px; background-color:#4be34b; border-radius:50%; margin-left:8px; vertical-align: middle;"></span>';

  const card = document.createElement("div");
  card.className = `pi-card col-sm-12 col-md-6 ${useThreeCol ? "col-lg-4" : "col-lg-6"}`;
  card.id = `card-${safeId}`;

  card.innerHTML = `
    <div class="card bg-secondary text-white shadow">
    ${pi.data.error ? `
      <div class="card-header bg-danger">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0 d-flex align-items-center gap-2">
            <i class="bi bi-motherboard"></i> ${pi.name}
          </h5>
          <div>
            <span class="badge bg-dark text-white"><i class="bi bi-hdd-network me-1"></i>${pi.ip}:${pi.port}</span>
            ${statusDot}
          </div>
        </div>
      </div>
    ` : `
      <div class="card-header" style="background-color: var(--bs-tertiary-color);">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0 d-flex align-items-center gap-2">
            <i class="bi bi-motherboard"></i> ${pi.name}
            <button id="back-btn-${safeId}" class="btn btn-outline-light btn-sm d-none" onclick="toggleChart('${safeId}', false)">
              <i class='bi bi-arrow-left'></i> Back
            </button>
          </h5>
          <div>
            <span class="badge bg-dark text-white"><i class="bi bi-hdd-network me-1"></i>${pi.ip}:${pi.port}</span>
            ${statusDot}
          </div>
        </div>
      </div>
    `}
      <div class="card-body">
        ${pi.data.error ? `
            <span class="badge bg-danger fs-6"><h5 class="mb-0"><i class="bi bi-exclamation-triangle me-1"></i> ${pi.data.error}</h5></span>
        ` : `
        <div id="overview-${safeId}">
          <div class="d-flex">
            <div class="w-75 pe-3">
              <span class="badge bg-light text-dark mb-3"><i class="bi bi-thermometer-half me-1"></i> CPU Temp</span>
              <div class="progress mb-2">
                <div class="progress-bar progress-bar-striped temp-bar ${getTempClass(temp)}" role="progressbar" style="width: ${temp}%" aria-valuenow="${temp}" aria-valuemin="0" aria-valuemax="80">${temp}°C</div>
              </div>
              <span class="badge bg-light text-dark mb-3 mt-1"><i class="bi bi-fan me-1"></i> Fan Speed</span>
              <div class="progress">
                <div class="progress-bar progress-bar-striped speed-bar ${getSpeedClass(speed)}" role="progressbar" style="width: ${speed}%" aria-valuenow="${speed}" aria-valuemin="0" aria-valuemax="100">${speed}%</div>
              </div>
              <button class="btn btn-light btn-sm mt-4" onclick="toggleChart('${safeId}', true)"><i class='bi bi-graph-up'></i> Show History</button>
            </div>
            <div class="w-25 d-flex flex-column align-items-center justify-content-center">
              <canvas id="multiChart-${safeId}" width="60" height="60" style="width:60px; height:60px;"></canvas>
              <span class="badge bg-dark small mt-2 text-center d-block">
                <div><i class="bi bi-cpu-fill me-1"></i>CPU</div>
                <hr class="mt-1 mb-1">
                <div><i class="bi bi-memory me-1"></i>Memory</div>
              </span>
            </div>
          </div>
        </div>
        <div id="chartview-${safeId}" class="d-none">
          <div class="bg-light rounded p-2">
            <canvas id="historyChart-${safeId}" height="185" style="max-height: 185px;"></canvas>
          </div>
        </div>
        `}
      </div>
    </div>
  `;
  const cards = Array.from(document.querySelectorAll(".pi-card"));
  const existingIndex = pis.findIndex(p => p.ip === pi.ip);
  
  // Insert card at the correct position
  if (existingIndex >= 0 && existingIndex < cards.length) {
    statusDiv.insertBefore(card, cards[existingIndex]);
  } else {
    statusDiv.appendChild(card); // fallback if index not found
  }
}

function toggleChart(safeId, showChart) {
  const overview = document.getElementById(`overview-${safeId}`);
  const chartview = document.getElementById(`chartview-${safeId}`);
  const backBtn = document.getElementById(`back-btn-${safeId}`);

  if (!overview || !chartview || !backBtn) return;

  if (showChart) {
    overview.classList.add("d-none");
    chartview.classList.remove("d-none");
    backBtn.classList.remove("d-none"); // show back button
  } else {
    chartview.classList.add("d-none");
    overview.classList.remove("d-none");
    backBtn.classList.add("d-none"); // hide back button
  }
}

// Check saved layout preference from localStorage (returns true if saved as "three")
let useThreeCol = localStorage.getItem("cardLayout") === "three";

// Apply the correct layout to all cards and update the toggle button
function applyCardLayout() {
  const cards = document.querySelectorAll(".pi-card");

  cards.forEach(card => {
    // Remove both possible col-lg classes first
    card.classList.remove("col-lg-6", "col-lg-4");

    // Add the appropriate one based on toggle state
    card.classList.add(useThreeCol ? "col-lg-4" : "col-lg-6");
  });

  // Update the toggle button icon and label
  const btn = document.getElementById("layoutToggleBtn");
  btn.innerHTML = useThreeCol
    ? '<i class="bi bi-grid-fill me-1"></i>Toggle 2 cards per row'   // current view = 3 → show option for 2
    : '<i class="bi bi-grid-3x2-gap-fill me-1"></i>Toggle 3 cards per row';  // current view = 2 → show option for 3
}

// Toggle the layout mode and save it in localStorage
function toggleCardLayout() {
  useThreeCol = !useThreeCol;

  // Save the preference for future page loads
  localStorage.setItem("cardLayout", useThreeCol ? "three" : "two");

  // Reapply layout changes to all cards and button
  applyCardLayout();
}

async function updateStatus() {
  const results = await Promise.all(pis.map(fetchStatus));
  let onlineCount = 0;

  results.forEach(freshPi => {
    const safeId = sanitizeId(freshPi.ip);

    // Create card if not already on page
    if (!document.getElementById(`card-${safeId}`)) {
      createCard(freshPi);
    }

    // Always update the card with fresh data
    updateCard(freshPi);

    // Track how many are online
    if (!freshPi.data.error) onlineCount++;
  });
  document.getElementById("online-count").innerHTML = `<i class="bi bi-check-circle me-1"></i>Online: ${onlineCount}`;
  document.getElementById("offline-count").innerHTML = `<i class="bi bi-x-circle me-1"></i>Offline: ${pis.length - onlineCount}`;
  document.getElementById("last-update").innerHTML = `<i class="bi bi-clock me-1"></i>Last update: ${new Date().toLocaleTimeString()}`;
}

// Initial load of Pis so dashboard can use them
window.addEventListener("DOMContentLoaded", async () => {
  await loadPiList();

  // Now pis[] is ready - and further logic can run
  updateStatus();
  startCountdown();
  updateCountdownDisplay();
  applyCardLayout();
  const addIpInput = document.getElementById("piIpInput");
  if (addIpInput) {
    addIpInput.value = '';
    addIpInput.dataset.prevIp = '';
    addIpInput.addEventListener("input", formatIpInput);
  }
});

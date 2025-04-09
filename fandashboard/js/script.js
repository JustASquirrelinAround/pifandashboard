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

// Define your Raspberry Pi devices with name and IP address
const pis = [
  { name: "Pi 1", ip: "192.168.1.101" },
  { name: "Pi 2", ip: "192.168.1.102" },
  { name: "Pi 3", ip: "192.168.1.103" },
  { name: "Pi 4", ip: "192.168.1.104" },
  { name: "Pi 5", ip: "192.168.1.105" }
  // Add more or remove some as needed
];

const refreshInterval = 10; // Seconds between each update
let countdown = refreshInterval;
let countdownInterval;
const statusDiv = document.getElementById("fanStatus"); // Container for Pi cards

const piHistory = {}; // Holds history data for each Pi's charts
const maxHistoryPoints = 120; // Limit history to last 20 minutes (10s interval)

const pieCharts = {}; // Store pie charts by ID so we can destroy and re-create them

// Convert IP to a safe HTML ID (replace dots)
function sanitizeId(ip) {
  return ip.replaceAll('.', '-');
}

// Update the countdown numbers on the page
function updateCountdownDisplay() {
  document.getElementById("countdown-desktop-value").textContent = countdown;
  document.getElementById("countdown-mobile-value").textContent = countdown;
}

// Start the countdown timer that triggers updates
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

// Fetch the status from each Pi's Flask server
async function fetchStatus(pi) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`http://${pi.ip}:10000/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error("HTTP error");
    const data = await response.json();
    return { ...pi, data };
  } catch (err) {
    return { ...pi, data: { error: "Unavailable" } };
  }
}

// Return a Bootstrap color class based on temperature
function getTempClass(temp) {
  if (temp >= 70) return "bg-danger";
  if (temp >= 50) return "bg-warning text-dark";
  if (temp >= 40) return "bg-primary";
  return "bg-info text-dark";
}

// Return a Bootstrap class for fan speed levels
function getSpeedClass(speed) {
  if (speed >= 80) return "bg-danger";
  if (speed >= 25) return "bg-success";
  return "bg-purple-subtle";
}

// Pick a color for CPU usage based on value
function getCpuColor(value) {
  if (value >= 75) return "#dc3545";
  if (value >= 50) return "#ffc107";
  return "#0d6efd";
}

// Render or update the donut pie chart for CPU and Memory
function renderMultiPieChart(id, cpuValue, memValue) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  // Destroy existing chart if one exists
  if (pieCharts[id]) {
    pieCharts[id].destroy(); // Prevent canvas reuse error
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

// Update the line history chart with rolling values
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
  // Trim if over history limit
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

// Update card values (bars, dot, charts) when status is refreshed
function updateCard(pi) {
  const safeId = sanitizeId(pi.ip);
  const temp = pi.data.error ? 0 : parseFloat(pi.data.temperature);
  const speed = pi.data.error ? 0 : parseInt(pi.data.speed);

  const dot = document.querySelector(`#card-${safeId} .status-dot`);
  if (dot) dot.style.backgroundColor = pi.data.error ? "#dc3545" : "#4be34b";

  const cardBody = document.querySelector(`#card-${safeId} .card-body`);
  const overview = document.getElementById(`overview-${safeId}`);
  const chartview = document.getElementById(`chartview-${safeId}`);
  const errorBadge = cardBody.querySelector(".badge.bg-danger");

  if (pi.data.error) {
    // Hide overview/chart, show error badge
    if (overview) overview.classList.add("d-none");
    if (chartview) chartview.classList.add("d-none");

    if (!errorBadge) {
      const badge = document.createElement("span");
      badge.className = "badge bg-danger fs-6";
      badge.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${pi.data.error}`;
      cardBody.appendChild(badge);
    }
  } else {
    // Hide error badge if present
    if (errorBadge) errorBadge.remove();

    // Show overview (or chart view if currently toggled)
    const isChartVisible = chartview && !chartview.classList.contains("d-none");
    
    if (isChartVisible) {
      // Stay on chart view
      if (chartview) chartview.classList.remove("d-none");
      if (overview) overview.classList.add("d-none");
    } else {
      // Default to overview
      if (overview) overview.classList.remove("d-none");
      if (chartview) chartview.classList.add("d-none");
    }
    // Update bars
    const tempBar = document.querySelector(`#card-${safeId} .temp-bar`);
    const speedBar = document.querySelector(`#card-${safeId} .speed-bar`);
    if (tempBar) {
      tempBar.style.width = `${temp}%`;
      tempBar.textContent = `${temp}°C`;
      tempBar.className = `progress-bar ${getTempClass(temp)} temp-bar`;
    }
    if (speedBar) {
      speedBar.style.width = `${speed}%`;
      speedBar.textContent = `${speed}%`;
      speedBar.className = `progress-bar ${getSpeedClass(speed)} speed-bar`;
    }

    renderMultiPieChart(`multiChart-${safeId}`, pi.data.cpu, pi.data.memory);
    updatePiHistoryChart(pi);
  }
}

// Create a card for a new Pi (called only once per Pi)
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
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="card-title mb-0 d-flex align-items-center gap-2">
            <i class="bi bi-motherboard"></i> ${pi.name}
            <button id="back-btn-${safeId}" class="btn btn-outline-light btn-sm d-none" onclick="toggleChart('${safeId}', false)">
              <i class='bi bi-arrow-left'></i> Back
            </button>
          </h5>
          <div>
            <span class="badge bg-dark text-white"><i class="bi bi-hdd-network me-1"></i>${pi.ip}</span>
            ${statusDot}
          </div>
        </div>
        <hr>
        ${pi.data.error ? `
          <span class="badge bg-danger fs-6"><i class="bi bi-exclamation-triangle me-1"></i> ${pi.data.error}</span>
        ` : `
        <div id="overview-${safeId}">
          <div class="d-flex">
            <div class="w-75 pe-3">
              <span class="badge bg-light text-dark mb-3"><i class="bi bi-thermometer-half me-1"></i> CPU Temp</span>
              <div class="progress mb-2">
                <div class="progress-bar temp-bar ${getTempClass(temp)}" role="progressbar" style="width: ${temp}%" aria-valuenow="${temp}" aria-valuemin="0" aria-valuemax="80">${temp}°C</div>
              </div>
              <span class="badge bg-light text-dark mb-3 mt-1"><i class="bi bi-fan me-1"></i> Fan Speed</span>
              <div class="progress">
                <div class="progress-bar speed-bar ${getSpeedClass(speed)}" role="progressbar" style="width: ${speed}%" aria-valuenow="${speed}" aria-valuemin="0" aria-valuemax="100">${speed}%</div>
              </div>
              <button class="btn btn-light btn-sm mt-3" onclick="toggleChart('${safeId}', true)"><i class='bi bi-graph-up'></i> Show History</button>
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
            <canvas id="historyChart-${safeId}" height="200" style="max-height:200px"></canvas>
          </div>
        </div>
        `}
      </div>
    </div>
  `;
  statusDiv.appendChild(card);
}

// Toggle chart display view inside a card
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

// Main update cycle: fetch status, update cards
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
  // Update summary stats
  document.getElementById("online-count").innerHTML = `<i class="bi bi-check-circle me-1"></i>Online: ${onlineCount}`;
  document.getElementById("offline-count").innerHTML = `<i class="bi bi-x-circle me-1"></i>Offline: ${pis.length - onlineCount}`;
  document.getElementById("last-update").innerHTML = `<i class="bi bi-clock me-1"></i>Last update: ${new Date().toLocaleTimeString()}`;
}

// Initial bootstrapping
updateStatus();
startCountdown();
updateCountdownDisplay();
applyCardLayout();

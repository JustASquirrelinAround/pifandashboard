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
    const response = await fetch(`http://${pi.ip}:10000/status`, { signal: controller.signal });
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
            <span class="badge bg-dark text-white"><i class="bi bi-hdd-network me-1"></i>${pi.ip}</span>
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
            <span class="badge bg-dark text-white"><i class="bi bi-hdd-network me-1"></i>${pi.ip}</span>
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
  statusDiv.appendChild(card);
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

updateStatus();
startCountdown();
updateCountdownDisplay();
applyCardLayout();

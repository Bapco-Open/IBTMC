// Toastmasters Points Dashboard - script.js
// Uses PapaParse to fetch CSVs from Google Sheets published CSV links
// and renders member details, leaderboard, and charts with filtering.

// Google Sheets CSV URLs for each tab
const sheets = {
  "Role Taking": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=23380471&single=true&output=csv",
  "Speeches": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=170161438&single=true&output=csv",
  "Evaluations": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=335593996&single=true&output=csv",
  "Level Completions": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1646576393&single=true&output=csv",
  "Awards": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=302763050&single=true&output=csv",
  "ExCom & Sub": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=710668362&single=true&output=csv",
  "Table Topics": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=618267332&single=true&output=csv",
  "Early Attendance": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1928408168&single=true&output=csv",
  "Summary": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1556398249&single=true&output=csv",
  "Total": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1939085341&single=true&output=csv",
  "Attendance": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1192815434&single=true&output=csv",
  "Last Minute Roles": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=10890228&single=true&output=csv"
};

// DOM Elements
const memberSelect = document.getElementById("memberSelect");
const periodSelect = document.getElementById("periodSelect");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const toggleMeetingNumbers = document.getElementById("toggleMeetingNumbers");
const memberDataDiv = document.getElementById("memberData");
const leaderboardView = document.getElementById("leaderboardView");
const top5ChartCanvas = document.getElementById("top5Chart");

const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const showChartBtn = document.getElementById("showChartBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

let allData = {};
let membersList = new Set();
let chartInstance = null;

// Helper: Parse date string in format "12-Jul-25" -> Date object (handle 21st century)
function parseMeetingDate(dateStr) {
  if (!dateStr) return null;
  // Format: "12-Jul-25" or similar
  // We'll parse with Date.parse after converting to full year
  let parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  let day = parts[0];
  let monthStr = parts[1];
  let year = parts[2];
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
  };
  if (!(monthStr in months)) return null;
  // Convert year, assuming 2000+ (e.g. 25 => 2025)
  let fullYear = parseInt(year,10);
  fullYear += fullYear < 50 ? 2000 : 1900; 
  return new Date(fullYear, months[monthStr], parseInt(day,10));
}

// Fetch CSV data with PapaParse, parse and store
async function fetchSheet(sheetName, url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: false,
      complete: function(results) {
        if (results.errors.length) {
          console.error(`Errors in sheet ${sheetName}:`, results.errors);
          reject(results.errors);
        } else {
          resolve(results.data);
        }
      },
      error: function(err) {
        reject(err);
      }
    });
  });
}

// Load all sheets
async function fetchAllSheets() {
  try {
    const promises = [];
    for (const [name, url] of Object.entries(sheets)) {
      promises.push(fetchSheet(name, url));
    }
    const results = await Promise.all(promises);
    let i = 0;
    for (const sheetName of Object.keys(sheets)) {
      allData[sheetName] = results[i];
      i++;
    }
    populateMembersDropdown();
  } catch (err) {
    console.error("Error loading sheets:", err);
    memberDataDiv.innerHTML = `<p style="color:red;">Failed to load data. Please try again later.</p>`;
  }
}

// Populate member dropdown from Summary sheet (row 3 onwards, col 0)
function populateMembersDropdown() {
  membersList.clear();
  const summarySheet = allData["Summary"];
  if (!summarySheet || summarySheet.length < 3) {
    console.warn("Summary sheet missing or too short");
    return;
  }

  for (let i = 2; i < summarySheet.length; i++) {  // start at row 3 (index 2)
    let name = summarySheet[i][0];
    if (name && name.trim().length > 0) {
      membersList.add(name.trim());
    }
  }
  // Clear and add options
  memberSelect.innerHTML = '<option value="">-- Select member --</option>';
  Array.from(membersList).sort().forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    memberSelect.appendChild(option);
  });
}

// Utility: Filter dates by periodSelect value or custom dates
function filterDatesByPeriod(dateStr) {
  const date = parseMeetingDate(dateStr);
  if (!date) return false;

  const now = new Date();
  now.setHours(0,0,0,0);

  if (periodSelect.value === "all") {
    return true;
  } else if (periodSelect.value === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  } else if (periodSelect.value === "quarter") {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const dateQuarter = Math.floor(date.getMonth() / 3);
    return date.getFullYear() === now.getFullYear() && dateQuarter === currentQuarter;
  } else if (periodSelect.value === "custom") {
    const start = startDateInput.value ? new Date(startDateInput.value) : null;
    const end = endDateInput.value ? new Date(endDateInput.value) : null;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  }
  return true;
}

// Render detailed member view (per sheet)
function renderMemberDetails(name) {
  memberDataDiv.innerHTML = "";
  leaderboardView.style.display = "none";
  top5ChartCanvas.style.display = "none";

  if (!name) {
    memberDataDiv.innerHTML = "<p>Please select a member to see details.</p>";
    return;
  }

  // Collect tables for each sheet
  for (const [sheetName, sheetData] of Object.entries(allData)) {
    // Skip empty or malformed sheets
    if (!sheetData || sheetData.length < 4) continue;

    // Find header row with dates (usually row 1)
    const headerRow = sheetData[1]; // 2nd row with date headers
    const meetingNumberRow = sheetData[2]; // 3rd row meeting numbers

    if (!headerRow || !meetingNumberRow) continue;

    // Find member's row (start from row 3, index 3)
    let memberRow = null;
    for (let i = 3; i < sheetData.length; i++) {
      if (sheetData[i][0] && sheetData[i][0].trim() === name) {
        memberRow = sheetData[i];
        break;
      }
    }
    if (!memberRow) continue;

    // Build table
    const section = document.createElement("section");
    const title = document.createElement("h2");
    title.textContent = sheetName;
    section.appendChild(title);

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");

    // Columns: Name, Total, then dates filtered by periodSelect/custom
    trHead.appendChild(document.createElement("th")).textContent = "Name";
    trHead.appendChild(document.createElement("th")).textContent = "Total";

    // Collect columns to display, based on date filter
    let colsToShow = [];
    for (let c = 2; c < headerRow.length; c++) {
      let dateStr = headerRow[c];
      if (filterDatesByPeriod(dateStr)) {
        colsToShow.push(c);
      }
    }
    // Add the date headers
    for (const c of colsToShow) {
      trHead.appendChild(document.createElement("th")).textContent = headerRow[c];
    }
    thead.appendChild(trHead);

    // Meeting numbers row (conditionally shown)
    const trMeetingNum = document.createElement("tr");
    trMeetingNum.classList.add("meeting-number-row");
    trMeetingNum.style.display = toggleMeetingNumbers.checked ? "table-row" : "none";
    trMeetingNum.appendChild(document.createElement("th")).textContent = "";
    trMeetingNum.appendChild(document.createElement("th")).textContent = "";

    for (const c of colsToShow) {
      const th = document.createElement("th");
      th.textContent = meetingNumberRow[c] || "";
      trMeetingNum.appendChild(th);
    }
    thead.appendChild(trMeetingNum);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const trMember = document.createElement("tr");

    // Name cell
    const tdName = document.createElement("td");
    tdName.textContent = memberRow[0];
    tdName.style.fontWeight = "600";
    trMember.appendChild(tdName);

    // Total cell (usually col 1)
    const tdTotal = document.createElement("td");
    tdTotal.textContent = memberRow[1] || "0";
    trMember.appendChild(tdTotal);

    // Points per meeting filtered by period
    for (const c of colsToShow) {
      const td = document.createElement("td");
      td.textContent = memberRow[c] || "0";
      trMember.appendChild(td);
    }
    tbody.appendChild(trMember);
    table.appendChild(tbody);

    section.appendChild(table);
    memberDataDiv.appendChild(section);
  }
}

// Render leaderboard using Summary sheet total points (row 3+)
function renderLeaderboard() {
  leaderboardView.style.display = "block";
  top5ChartCanvas.style.display = "none";
  memberDataDiv.innerHTML = "";

  const summarySheet = allData["Summary"];
  if (!summarySheet || summarySheet.length < 3) {
    leaderboardView.innerHTML = "<p>No summary data to display leaderboard.</p>";
    return;
  }

  // Header row is row 1 with dates
  const headerRow = summarySheet[1];
  // We will filter columns by date based on periodSelect/custom
  let colsToShow = [];
  for (let c = 2; c < headerRow.length; c++) {
    if (filterDatesByPeriod(headerRow[c])) {
      colsToShow.push(c);
    }
  }

  // Collect all members with their totals & per meeting points for filtered columns
  let leaderboardData = [];
  for (let i = 2; i < summarySheet.length; i++) {
    let row = summarySheet[i];
    let name = row[0];
    if (!name) continue;
    let totalPoints = 0;
    for (const c of colsToShow) {
      let val = parseFloat(row[c]);
      if (!isNaN(val)) totalPoints += val;
    }
    leaderboardData.push({name, totalPoints});
  }

  // Sort descending by totalPoints
  leaderboardData.sort((a,b) => b.totalPoints - a.totalPoints);

  // Build table
  const title = document.createElement("h2");
  title.textContent = "Leaderboard";
  leaderboardView.innerHTML = "";
  leaderboardView.appendChild(title);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");

  trHead.appendChild(document.createElement("th")).textContent = "Rank";
  trHead.appendChild(document.createElement("th")).textContent = "Member";
  trHead.appendChild(document.createElement("th")).textContent = "Points";
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  leaderboardData.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.appendChild(document.createElement("td")).textContent = idx+1;
    tr.appendChild(document.createElement("td")).textContent = item.name;
    tr.appendChild(document.createElement("td")).textContent = item.totalPoints.toFixed(2);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  leaderboardView.appendChild(table);
}

// Render top 5 chart (bar chart)
function renderTop5Chart() {
  leaderboardView.style.display = "none";
  memberDataDiv.innerHTML = "";
  top5ChartCanvas.style.display = "block";

  const summarySheet = allData["Summary"];
  if (!summarySheet || summarySheet.length < 3) {
    top5ChartCanvas.style.display = "none";
    alert("No summary data for chart.");
    return;
  }

  // Header row is row 1 with dates
  const headerRow = summarySheet[1];
  let colsToShow = [];
  for (let c = 2; c < headerRow.length; c++) {
    if (filterDatesByPeriod(headerRow[c])) {
      colsToShow.push(c);
    }
  }

  // Collect all members with totals
  let leaderboardData = [];
  for (let i = 2; i < summarySheet.length; i++) {
    let row = summarySheet[i];
    let name = row[0];
    if (!name) continue;
    let totalPoints = 0;
    for (const c of colsToShow) {
      let val = parseFloat(row[c]);
      if (!isNaN(val)) totalPoints += val;
    }
    leaderboardData.push({name, totalPoints});
  }

  // Sort descending by totalPoints, take top 5
  leaderboardData.sort((a,b) => b.totalPoints - a.totalPoints);
  const top5 = leaderboardData.slice(0, 5);

  // If chart exists destroy before redraw
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(top5ChartCanvas, {
    type: 'bar',
    data: {
      labels: top5.map(x => x.name),
      datasets: [{
        label: 'Points',
        data: top5.map(x => x.totalPoints),
        backgroundColor: '#772432',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {display: false},
        title: {
          display: true,
          text: 'Top 5 Members by Points',
          color: '#772432',
          font: {size: 18, weight: 'bold'}
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {stepSize: 1}
        }
      }
    }
  });
}

// Event handlers

memberSelect.addEventListener("change", () => {
  if (memberSelect.value) {
    renderMemberDetails(memberSelect.value);
  } else {
    memberDataDiv.innerHTML = "<p>Please select a member to see details.</p>";
  }
});

periodSelect.addEventListener("change", () => {
  // Show/hide custom date inputs
  if (periodSelect.value === "custom") {
    startDateInput.style.display = "inline-block";
    endDateInput.style.display = "inline-block";
  } else {
    startDateInput.style.display = "none";
    endDateInput.style.display = "none";
    startDateInput.value = "";
    endDateInput.value = "";
  }

  // Refresh data display for selected member or leaderboard/chart
  if (memberSelect.value) {
    renderMemberDetails(memberSelect.value);
  } else if (leaderboardView.style.display === "block") {
    renderLeaderboard();
  } else if (top5ChartCanvas.style.display === "block") {
    renderTop5Chart();
  }
});

startDateInput.addEventListener("change", () => {
  if (memberSelect.value) renderMemberDetails(memberSelect.value);
  else if (leaderboardView.style.display === "block") renderLeaderboard();
  else if (top5ChartCanvas.style.display === "block") renderTop5Chart();
});

endDateInput.addEventListener("change", () => {
  if (memberSelect.value) renderMemberDetails(memberSelect.value);
  else if (leaderboardView.style.display === "block") renderLeaderboard();
  else if (top5ChartCanvas.style.display === "block") renderTop5Chart();
});

toggleMeetingNumbers.addEventListener("change", () => {
  // Show/hide meeting number rows in tables
  const rows = document.querySelectorAll(".meeting-number-row");
  rows.forEach(row => {
    row.style.display = toggleMeetingNumbers.checked ? "table-row" : "none";
  });
});

showLeaderboardBtn.addEventListener("click", () => {
  renderLeaderboard();
});

showChartBtn.addEventListener("click", () => {
  renderTop5Chart();
});

clearFiltersBtn.addEventListener("click", () => {
  memberSelect.value = "";
  periodSelect.value = "all";
  startDateInput.value = "";
  endDateInput.value = "";
  startDateInput.style.display = "none";
  endDateInput.style.display = "none";
  toggleMeetingNumbers.checked = false;
  memberDataDiv.innerHTML = "<p>Please select a member to see details.</p>";
  leaderboardView.style.display = "none";
  top5ChartCanvas.style.display = "none";
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});

// On load
window.onload = () => {
  memberDataDiv.innerHTML = "<p>Loading data, please wait...</p>";
  fetchAllSheets();
};

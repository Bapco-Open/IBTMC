const SHEETS = [
  "Attendance",
  "Early Attendance",
  "Summary",
  "Total",
  "Role Taking",
  "Last Minute Roles",
  "Speeches",
  "Evaluations",
  "Level Completions",
  "Awards",
  "ExCom & Sub.",
  "Contests",
  "Other",
  "External",
  "Table Topics",
  "Last Minute Speeches/Evaluations"
];

// Your published Google Sheets CSV base URL (change sheetName dynamically)
const BASE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?output=csv&gid=';

// Since we only have a single published link, we'll fetch the CSV once as an example.
// Ideally, each sheet should be published separately and we get different CSV URLs.
// For demo, assume data is in one CSV for Summary or Total sheet.

const memberSelect = document.getElementById("memberSelect");
const periodSelect = document.getElementById("periodSelect");
const startDateInput = document.getElementById("startDateInput");
const endDateInput = document.getElementById("endDateInput");
const toggleMeetingNumbers = document.getElementById("toggleMeetingNumbers");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const showChartBtn = document.getElementById("showChartBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const errorMessageDiv = document.getElementById("errorMessage");
const memberDataDiv = document.getElementById("memberData");
const leaderboardView = document.getElementById("leaderboardView");
const top5ChartCanvas = document.getElementById("top5Chart");

let allData = {}; // Store data per sheet: { sheetName: [{...}, ...] }
let membersSet = new Set();
let chartInstance = null;

// Helper: parse date string like "12-Jul-25" to Date object (assume 20xx)
function parseMeetingDate(dateStr) {
  if (!dateStr) return null;
  // Parse format like 12-Jul-25 -> 2025-07-12
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const year = 2000 + parseInt(parts[2], 10);
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const month = monthMap[monthStr];
  if (month === undefined) return null;
  return new Date(year, month, day);
}

function formatDate(date) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

// Fetch and parse CSV for a single sheet from published URL by gid (sheet id)
async function fetchSheetByGID(gid) {
  const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?output=csv&gid=${gid}`;
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: false, // We will handle header manually
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}

// Mapping your sheet names to their GID (You must get these from your sheet URL or sheet info)
const SHEET_GIDS = {
  "Attendance": 1192815434,
  "Early Attendance": 1928408168,
  "Summary": 1556398249,
  "Total": 1939085341,
  "Role Taking": 23380471,
  "Last Minute Roles": 10890228,
  "Speeches": 170161438,
  "Evaluations": 335593996,
  "Level Completions": 1646576393,
  "Awards": 302763050,
  "ExCom & Sub.": 710668362,
  "Contests": 859627444,
  "Other": 209414951,
  "External": 1796501343,
  "Table Topics": 618267332,
  "Last Minute Speeches/Evaluations": null // GID missing
};


// *** IMPORTANT ***
// You must fill correct GIDs for your sheets in SHEET_GIDS above for the fetch to work

async function fetchAllSheets() {
  clearError();
  allData = {};

  // Fetch all sheets data in parallel, skip those without gid defined
  const promises = Object.entries(SHEET_GIDS).map(async ([sheetName, gid]) => {
    if (!gid) return;
    try {
      const data = await fetchSheetByGID(gid);
      allData[sheetName] = data;
    } catch (err) {
      showError(`Failed to load sheet "${sheetName}": ${err.message || err}`);
    }
  });

  await Promise.all(promises);

  buildMembersList();
}

function clearError() {
  errorMessageDiv.textContent = "";
}

function showError(msg) {
  errorMessageDiv.textContent = msg;
}

// Build members dropdown from all sheets (first column from row 3 onwards)
function buildMembersList() {
  membersSet.clear();

  for (const sheetName in allData) {
    const sheet = allData[sheetName];
    if (!sheet || sheet.length < 3) continue;

    for (let i = 2; i < sheet.length; i++) {
      const row = sheet[i];
      if (row.length < 1) continue;
      const name = row[0].trim();
      if (name) membersSet.add(name);
    }
  }

  const sortedMembers = Array.from(membersSet).sort((a, b) => a.localeCompare(b));

  memberSelect.innerHTML = '<option value="">-- Select a member --</option>';
  for (const m of sortedMembers) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    memberSelect.appendChild(option);
  }
}

function filterDatesByPeriod(dates, period) {
  const now = new Date();
  switch (period) {
    case "month": {
      return dates.filter(d => {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    case "quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      return dates.filter(d => {
        const q = Math.floor(d.getMonth() / 3);
        return d.getFullYear() === now.getFullYear() && q === currentQuarter;
      });
    }
    default:
      return dates;
  }
}

function getFilteredDateIndexes(sheetData, period, startDateStr, endDateStr) {
  // Dates start from column 2 (index 2), row 1 (index 1) for dates,
  // row 2 (index 2) for meeting numbers (optional)

  if (!sheetData || sheetData.length < 3) return [];

  const dateRow = sheetData[0];
  if (!dateRow) return [];

  // Parse dates from headers, starting from column 2
  let dateColumns = [];
  for (let c = 2; c < dateRow.length; c++) {
    const date = parseMeetingDate(dateRow[c]);
    if (date) dateColumns.push({ col: c, date });
  }

  // Filter dates by period (month/quarter)
  if (period && period !== "all") {
    dateColumns = dateColumns.filter(({ date }) => {
      if (period === "month") {
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (period === "quarter") {
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const dateQuarter = Math.floor(date.getMonth() / 3);
        return date.getFullYear() === now.getFullYear() && dateQuarter === currentQuarter;
      }
      return true;
    });
  }

  // Filter by custom date range if provided
  if (startDateStr || endDateStr) {
    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;

    dateColumns = dateColumns.filter(({ date }) => {
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }

  return dateColumns.map(d => d.col);
}

// Render member detailed view (points per sheet + per meeting filtered)
function renderMemberDetails(memberName) {
  if (!memberName) {
    memberDataDiv.innerHTML = "";
    return;
  }

  clearError();
  leaderboardView.innerHTML = "";
  top5ChartCanvas.style.display = "none";

  let html = `<h3>Details for <strong>${memberName}</strong></h3>`;

  // For each sheet
  for (const sheetName in allData) {
    const sheet = allData[sheetName];
    if (!sheet || sheet.length < 3) continue;

    // Find member row index in sheet (search column 0 from row 3)
    let memberRowIndex = -1;
    for (let r = 2; r < sheet.length; r++) {
      if (sheet[r][0] && sheet[r][0].trim() === memberName) {
        memberRowIndex = r;
        break;
      }
    }
    if (memberRowIndex === -1) continue;

    // Extract columns (dates start col 2)
    const dateRow = sheet[0];
    const meetingNumberRow = sheet[1] || [];
    const memberRow = sheet[memberRowIndex];

    if (!dateRow || dateRow.length < 3) continue;

    const showMeetingNumbers = toggleMeetingNumbers.checked;
    const period = periodSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Get filtered date columns
    const filteredCols = getFilteredDateIndexes(sheet, period, startDate, endDate);

    if (filteredCols.length === 0) {
      html += `<h5>${sheetName}</h5><p>No meetings in selected period.</p>`;
      continue;
    }

    html += `<h5>${sheetName}</h5>`;
    html += `<table class="table table-striped table-bordered member-details"><thead><tr><th>Meeting Date</th>`;
    if (showMeetingNumbers) html += "<th>Meeting Number</th>";
    html += `<th>Points</th></tr></thead><tbody>`;

    for (const col of filteredCols) {
      const dateStr = dateRow[col];
      const meetingNum = meetingNumberRow[col] || "";
      const pointsRaw = memberRow[col];
      let points = parseFloat(pointsRaw);
      if (isNaN(points)) points = 0;

      html += `<tr><td>${dateStr || "N/A"}</td>`;
      if (showMeetingNumbers) html += `<td>${meetingNum || "-"}</td>`;
      html += `<td>${points}</td></tr>`;
    }
    html += "</tbody></table>";
  }

  memberDataDiv.innerHTML = html;
}

// Render leaderboard: aggregate total points from Summary/Total sheets per member
function renderLeaderboard() {
  clearError();
  memberDataDiv.innerHTML = "";
  top5ChartCanvas.style.display = "none";

  // We'll use the "Total" sheet for aggregation as per your instruction
  const totalSheet = allData["Total"];
  if (!totalSheet || totalSheet.length < 3) {
    leaderboardView.innerHTML = "<p>No data available for leaderboard.</p>";
    return;
  }

  // Map member to total points (from 2nd col = "Total" column)
  let leaderboard = [];

  for (let r = 2; r < totalSheet.length; r++) {
    const row = totalSheet[r];
    const name = row[0]?.trim();
    if (!name) continue;

    let totalPoints = parseFloat(row[1]);
    if (isNaN(totalPoints)) totalPoints = 0;

    leaderboard.push({ name, total: totalPoints });
  }

  // Sort descending
  leaderboard.sort((a, b) => b.total - a.total);

  // Apply filtering by period/custom dates on per-meeting points if you want,
  // but Total sheet has just aggregated total - skipping filtering here for simplicity

  // Render HTML table
  let html = `<h3>Leaderboard</h3>`;
  html += `<table class="table table-striped table-bordered"><thead><tr><th>Rank</th><th>Member</th><th>Total Points</th></tr></thead><tbody>`;

  for (let i = 0; i < leaderboard.length; i++) {
    const { name, total } = leaderboard[i];
    html += `<tr><td>${i + 1}</td><td>${name}</td><td>${total}</td></tr>`;
  }

  html += "</tbody></table>";

  leaderboardView.innerHTML = html;
}

// Render Top 5 chart from leaderboard
function renderChart() {
  leaderboardView.innerHTML = "";
  memberDataDiv.innerHTML = "";
  top5ChartCanvas.style.display = "block";

  const totalSheet = allData["Total"];
  if (!totalSheet || totalSheet.length < 3) {
    showError("No data available for chart.");
    top5ChartCanvas.style.display = "none";
    return;
  }

  let leaderboard = [];

  for (let r = 2; r < totalSheet.length; r++) {
    const row = totalSheet[r];
    const name = row[0]?.trim();
    if (!name) continue;

    let totalPoints = parseFloat(row[1]);
    if (isNaN(totalPoints)) totalPoints = 0;

    leaderboard.push({ name, total: totalPoints });
  }

  leaderboard.sort((a, b) => b.total - a.total);

  const top5 = leaderboard.slice(0, 5);
  if (chartInstance) chartInstance.destroy();

  const ctx = top5ChartCanvas.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top5.map(d => d.name),
      datasets: [{
        label: "Total Points",
        data: top5.map(d => d.total),
        backgroundColor: "rgba(54, 162, 235, 0.7)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function clearFilters() {
  memberSelect.value = "";
  periodSelect.value = "all";
  startDateInput.value = "";
  endDateInput.value = "";
  toggleMeetingNumbers.checked = false;
  memberDataDiv.innerHTML = "";
  leaderboardView.innerHTML = "";
  top5ChartCanvas.style.display = "none";
  clearError();
}

// Event listeners
memberSelect.addEventListener("change", () => {
  const member = memberSelect.value;
  renderMemberDetails(member);
});

periodSelect.addEventListener("change", () => {
  const member = memberSelect.value;
  if (member) renderMemberDetails(member);
});

startDateInput.addEventListener("change", () => {
  const member = memberSelect.value;
  if (member) renderMemberDetails(member);
});

endDateInput.addEventListener("change", () => {
  const member = memberSelect.value;
  if (member) renderMemberDetails(member);
});

toggleMeetingNumbers.addEventListener("change", () => {
  const member = memberSelect.value;
  if (member) renderMemberDetails(member);
});

showLeaderboardBtn.addEventListener("click", () => {
  renderLeaderboard();
  top5ChartCanvas.style.display = "none";
  memberDataDiv.innerHTML = "";
});

showChartBtn.addEventListener("click", () => {
  renderChart();
});

clearFiltersBtn.addEventListener("click", () => {
  clearFilters();
});

// On load: fetch all data
(async () => {
  try {
    await fetchAllSheets();
  } catch (err) {
    showError("Error loading data: " + (err.message || err));
  }
})();

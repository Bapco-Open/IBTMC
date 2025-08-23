const publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pubhtml';

// Sheets you have
const summarySheets = ["Summary", "Total"];
const detailSheets = ["Attendance", "Early Attendance", "Role Taking", "Last Minute Roles", "Speeches", "Evaluations", "Level Completions", "Awards", "ExCom & Sub.", "Contests", "Other", "External", "Table Topics", "Last Minute Speeches/Evaluations"];

let allData = {};

window.addEventListener('DOMContentLoaded', () => {
  Tabletop.init({
    key: publicSpreadsheetUrl,
    callback: onDataLoad,
    simpleSheet: false,
    parseNumbers: true,
    wanted: [...summarySheets, ...detailSheets]
  });

  // Event listeners
  document.getElementById("periodSelect").addEventListener("change", refreshView);
  document.getElementById("startDate").addEventListener("change", refreshView);
  document.getElementById("endDate").addEventListener("change", refreshView);
  document.getElementById("toggleMeetingNumbers").addEventListener("change", refreshView);
  document.getElementById("memberSelect").addEventListener("change", refreshMemberView);
  document.getElementById("showLeaderboard").addEventListener("click", () => toggleView('leaderboard'));
  document.getElementById("showChart").addEventListener("click", () => { toggleView('chart'); renderTopChart(); });
});

function onDataLoad(data) {
  allData = data;
  populateMemberDropdown();
  renderLeaderboard();
}

// Populate member dropdown filtering out "Meeting Number" or empty rows
function populateMemberDropdown() {
  const sel = document.getElementById("memberSelect");
  const names = new Set();

  // Summary sheet with headers, straightforward
  if (allData["Summary"] && allData["Summary"].elements) {
    allData["Summary"].elements.forEach(r => {
      if (r.Name) names.add(r.Name.trim());
    });
  }

  // For other sheets, skip rows where name cell is empty or "Meeting Number"
  detailSheets.forEach(sheet => {
    if (!allData[sheet] || !allData[sheet].elements) return;
    allData[sheet].elements.forEach(row => {
      const nameVal = (row.Name || "").trim();
      if (nameVal && !nameVal.toLowerCase().includes('meeting') && nameVal !== '') {
        names.add(nameVal);
      }
    });
  });

  sel.innerHTML = '<option value="">-- Choose --</option>';
  Array.from(names).sort().forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sel.appendChild(option);
  });
}

function refreshView() {
  const member = document.getElementById("memberSelect").value;
  if (member) {
    renderMemberData(member);
  } else {
    renderLeaderboard();
  }
}

function refreshMemberView() {
  const member = document.getElementById("memberSelect").value;
  if (member) {
    renderMemberData(member);
  }
}

function toggleView(view) {
  const views = ['member', 'leaderboard', 'chart'];
  views.forEach(v => {
    const el = document.getElementById(v + 'View');
    if (v === view) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

// Parse date string like '12-Jul-25' to Date object
function parseDateStr(dateStr) {
  try {
    const parts = dateStr.split('-');
    if(parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = 2000 + parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months.indexOf(monthStr);
    if (month === -1) return null;
    return new Date(year, month, day);
  } catch {
    return null;
  }
}

// Get selected period for filtering points
function getSelectedPeriod() {
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  if (startVal && endVal) {
    const start = new Date(startVal);
    const end = new Date(endVal);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      return { start, end };
    }
  }

  const period = document.getElementById("periodSelect").value;
  const now = new Date();

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }
  if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    return { start, end: now };
  }

  return null; // all time
}

// Get filtered points from a row, skipping non-date columns and applying period filter
function getFilteredPoints(row, period) {
  const points = [];
  for (const key in row) {
    // Skip "Name" and "Total" columns
    if (key === "Name" || key === "Total") continue;

    // Match date columns only (e.g., "12-Jul-25")
    if (!key.match(/^\d{1,2}-[A-Za-z]{3}-\d{2}$/)) continue;

    const date = parseDateStr(key);
    if (!date) continue;

    if (period && (date < period.start || date > period.end)) continue;

    const val = parseInt(row[key]);
    if (!isNaN(val)) points.push(val);
  }
  return points;
}

// Render the detailed member data view
function renderMemberData(name) {
  toggleView('member');
  const container = document.getElementById("memberData");
  container.innerHTML = '';

  const period = getSelectedPeriod();
  const showMeetings = document.getElementById("toggleMeetingNumbers").checked;

  // Render detail sheets
  detailSheets.forEach(sheet => {
    if (!allData[sheet]) return;
    // Find rows for the member, ignoring non-member rows
    const rows = allData[sheet].elements.filter(r => {
      const n = (r.Name || "").trim();
      return n === name && !n.toLowerCase().includes('meeting') && n !== '';
    });
    if (rows.length) {
      const section = document.createElement("div");
      section.className = "member-section";
      // Calculate total points for filtered period
      const totalPoints = rows.reduce((sum, r) => {
        const pts = getFilteredPoints(r, period).reduce((a, b) => a + b, 0);
        return sum + pts;
      }, 0);

      let html = `<h3>${sheet}</h3><p><strong>Total Points (filtered):</strong> ${totalPoints}</p>`;

      if (showMeetings) {
        // Show dates and points for filtered dates only
        const firstRow = rows[0];
        const dateKeys = Object.keys(firstRow).filter(k => /^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(k));
        const filteredDates = dateKeys.filter(d => {
          const date = parseDateStr(d);
          if (!date) return false;
          if (period) {
            return date >= period.start && date <= period.end;
          }
          return true;
        });

        html += `<table border="1" style="border-collapse:collapse; margin-top:8px;">
          <thead><tr><th>Date</th><th>Points</th></tr></thead><tbody>`;

        filteredDates.forEach(dateKey => {
          const pts = rows.reduce((sum, r) => {
            const val = parseInt(r[dateKey]);
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
          html += `<tr><td>${dateKey}</td><td>${pts}</td></tr>`;
        });
        html += "</tbody></table>";
      }

      section.innerHTML = html;
      container.appendChild(section);
    }
  });

  // Render summary sheets (aggregated totals)
  summarySheets.forEach(sheet => {
    if (!allData[sheet]) return;
    const row = allData[sheet].elements.find(r => {
      const n = (r.Name || "").trim();
      return n === name && !n.toLowerCase().includes('meeting') && n !== '';
    });
    if (row) {
      const totalPoints = parseInt(row.Total || row.Points || row["Total Points"]) || 0;
      const section = document.createElement("div");
      section.className = "member-section";
      section.innerHTML = `<h3>${sheet}</h3><p><strong>Total Points:</strong> ${totalPoints}</p>`;
      container.appendChild(section);
    }
  });
}

// Render the leaderboard view
function renderLeaderboard() {
  toggleView('leaderboard');
  const leaderboardDiv = document.getElementById("leaderboard");
  leaderboardDiv.innerHTML = '';

  // Aggregate points from summary sheets
  const board = {};
  summarySheets.forEach(sheet => {
    if (!allData[sheet]) return;
    allData[sheet].elements.forEach(r => {
      const n = (r.Name || "").trim();
      if (!n || n.toLowerCase().includes('meeting') || n === '') return;
      const pts = parseInt(r.Total || r.Points || r["Total Points"]) || 0;
      board[n] = (board[n] || 0) + pts;
    });
  });

  const sortedEntries = Object.entries(board).sort((a, b) => b[1] - a[1]);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Rank</th><th>Member</th><th>Total Points</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  sortedEntries.forEach(([name, points], i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${name}</td><td>${points}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  leaderboardDiv.appendChild(table);
}

let chartInstance = null;

// Render bar chart of top 5 members
function renderTopChart() {
  toggleView('chart');

  // Aggregate points from summary sheets
  const board = {};
  summarySheets.forEach(sheet => {
    if (!allData[sheet]) return;
    allData[sheet].elements.forEach(r => {
      const n = (r.Name || "").trim();
      if (!n || n.toLowerCase().includes('meeting') || n === '') return;
      const pts = parseInt(r.Total || r.Points || r["Total Points"]) || 0;
      board[n] = (board[n] || 0) + pts;
    });
  });

  const top5 = Object.entries(board).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ctx = document.getElementById("topChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top5.map(e => e[0]),
      datasets: [{
        label: 'Points',
        data: top5.map(e => e[1]),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

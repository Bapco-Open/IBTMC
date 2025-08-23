// script.js

const publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pubhtml';

const tabs = [
  'Attendance', 'Early Attendance', 'Role Taking', 'Last Minute Roles', 'Speeches',
  'Evaluations', 'Level Completions', 'Awards', 'ExCom & Sub.', 'Contests',
  'Other', 'External', 'Table Topics', 'Last Minute Speeches/Evaluations'
];

// Summary/Total excluded for members list, but will be used for aggregation

let allData = {}; // tabName -> array of rows
let memberList = new Set();

const memberSelect = document.getElementById('memberSelect');
const periodSelect = document.getElementById('periodSelect');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const toggleMeetingNumbers = document.getElementById('toggleMeetingNumbers');
const showLeaderboardBtn = document.getElementById('showLeaderboard');
const showChartBtn = document.getElementById('showChart');
const clearFiltersBtn = document.getElementById('clearFilters');

const memberView = document.getElementById('memberView');
const memberDataDiv = document.getElementById('memberData');
const leaderboardView = document.getElementById('leaderboardView');
const leaderboardDiv = document.getElementById('leaderboard');
const chartView = document.getElementById('chartView');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');

let chartInstance = null;

// Helpers to parse dates from column headers, assumed format: DD-MMM-YY (e.g., 12-Jul-25)
function parseDateFromHeader(header) {
  if (!header) return null;
  // Try parsing with Date.parse - Google Sheets date headers may be consistent ISO strings, but your example is like '12-Jul-25'
  // Let's parse manually:
  // Expected format: DD-MMM-YY (e.g., 12-Jul-25)
  const parts = header.trim().split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const yearStr = parts[2];

  const monthMap = {
    jan: 0, feb:1, mar:2, apr:3, may:4, jun:5,
    jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
  };

  const month = monthMap[monthStr];
  if (month === undefined || isNaN(day)) return null;

  let year = parseInt(yearStr, 10);
  // fix 2-digit year
  year += (year < 50) ? 2000 : 1900;

  return new Date(year, month, day);
}

// Show/hide views helpers
function showView(viewId) {
  [memberView, leaderboardView, chartView].forEach(view => {
    view.classList.add('hidden');
  });
  viewId.classList.remove('hidden');
}

// Show loading spinner
function showLoading() {
  loadingIndicator.classList.remove('hidden');
  errorMessage.classList.add('hidden');
}

// Hide loading spinner
function hideLoading() {
  loadingIndicator.classList.add('hidden');
}

// Show error message
function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
  hideLoading();
}

// Clear error
function clearError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

// Fetch all data from all tabs via Tabletop
function fetchData() {
  showLoading();
  clearError();
  Tabletop.init({
    key: publicSpreadsheetUrl,
    simpleSheet: false,
    wanted: tabs,
    callback: (data, tabletop) => {
      try {
        allData = {};
        memberList.clear();

        tabs.forEach(tab => {
          if (!data[tab]) {
            // Tab missing
            allData[tab] = [];
            return;
          }
          let sheetData = data[tab].elements;
          // Each element corresponds to a row; 
          // but since your sheet uses headers only in row 2,
          // and member names start from row 3,
          // Tabletop normally parses with the first row as headers.
          // So rows with empty Name will have empty .Name property.

          // Filter rows that actually have member names
          let filtered = sheetData.filter(r => r['Name'] && r['Name'].trim() !== '');

          // Collect member names
          filtered.forEach(r => memberList.add(r['Name'].trim()));

          allData[tab] = filtered;
        });

        populateMemberDropdown();
        hideLoading();
        showView(leaderboardView);
        renderLeaderboard();

      } catch (e) {
        showError('Error processing data: ' + e.message);
        console.error(e);
      }
    },
    error: (err) => {
      showError('Failed to load spreadsheet data. Check your link and network.');
      console.error('Tabletop error:', err);
    }
  });
}

// Populate member dropdown sorted alphabetically
function populateMemberDropdown() {
  // Clear existing options except first
  while (memberSelect.options.length > 1) {
    memberSelect.remove(1);
  }
  const sorted = Array.from(memberList).sort((a,b) => a.localeCompare(b));
  sorted.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    memberSelect.appendChild(opt);
  });
}

// Utility: filter points by date range (inclusive)
function isDateInRange(date, start, end) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// Utility: parse date range from inputs & period filter
function getFilterDateRange() {
  let start = startDateInput.value ? new Date(startDateInput.value) : null;
  let end = endDateInput.value ? new Date(endDateInput.value) : null;

  if (start && end && end < start) {
    // Swap if invalid range
    [start, end] = [end, start];
  }

  // If no custom dates, fallback to period select
  if (!start && !end) {
    const now = new Date();
    const period = periodSelect.value;
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    } else {
      // all time
      start = null;
      end = null;
    }
  }

  return { start, end };
}

// Render detailed member data view
function renderMemberDetails(memberName) {
  if (!memberName) {
    memberDataDiv.innerHTML = 'Select a member to view details.';
    return;
  }

  showView(memberView);
  leaderboardView.classList.add('hidden');
  chartView.classList.add('hidden');

  const { start, end } = getFilterDateRange();

  // Build a table per tab showing totals and per-meeting points if toggled
  let html = '';

  tabs.forEach(tab => {
    if (!(tab in allData)) return;

    // Find member row in this tab
    const sheet = allData[tab];
    const memberRow = sheet.find(r => r['Name'].trim() === memberName);

    if (!memberRow) return; // no data in this tab for this member

    // Extract columns excluding 'Name' and 'Total' for dates
    const keys = Object.keys(memberRow);

    // Extract date columns (skip Name, Total)
    const dateCols = keys.filter(k => {
      if (k === 'Name' || k.toLowerCase() === 'total') return false;
      return parseDateFromHeader(k) !== null;
    });

    // Filter dateCols by date range if toggle is on
    const showMeetings = toggleMeetingNumbers.checked;

    // Header
    html += `<h3>${tab}</h3>`;

    html += '<table><thead><tr><th>Category</th><th>Total Points</th>';
    if (showMeetings) {
      dateCols.forEach(dc => {
        const dateObj = parseDateFromHeader(dc);
        if (isDateInRange(dateObj, start, end)) {
          // Show date & meeting number under
          html += `<th>${dc}</th>`;
        }
      });
    }
    html += '</tr></thead><tbody>';

    // Data row
    html += `<tr><td>${memberName}</td>`;

    // Total points in tab for this member (if missing, fallback to sum of visible meetings)
    let totalPoints = Number(memberRow['Total'] || 0);
    if (!totalPoints || isNaN(totalPoints)) {
      // sum filtered points
      totalPoints = 0;
      dateCols.forEach(dc => {
        const dateObj = parseDateFromHeader(dc);
        if (isDateInRange(dateObj, start, end)) {
          const val = Number(memberRow[dc] || 0);
          if (!isNaN(val)) totalPoints += val;
        }
      });
    }

    html += `<td>${totalPoints}</td>`;

    if (showMeetings) {
      dateCols.forEach(dc => {
        const dateObj = parseDateFromHeader(dc);
        if (isDateInRange(dateObj, start, end)) {
          let val = memberRow[dc];
          val = val ? val : 0;
          html += `<td>${val}</td>`;
        }
      });
    }

    html += '</tr></tbody></table>';
  });

  memberDataDiv.innerHTML = html || '<p>No detailed points available for this member in the selected range.</p>';
}

// Aggregate total points per member from Summary and Total tabs (prefer Summary if present)
function aggregateTotals() {
  let totalsData = [];

  // Check Summary first
  if (allData['Summary'] && allData['Summary'].length) {
    totalsData = allData['Summary'].map(r => ({
      name: r['Name'],
      total: Number(r['Total']) || 0
    }));
  } else if (allData['Total'] && allData['Total'].length) {
    totalsData = allData['Total'].map(r => ({
      name: r['Name'],
      total: Number(r['Total']) || 0
    }));
  } else {
    // Fallback: sum totals across all tabs per member
    let memberTotalsMap = {};
    memberList.forEach(name => memberTotalsMap[name] = 0);

    tabs.forEach(tab => {
      const sheet = allData[tab];
      if (!sheet) return;
      sheet.forEach(row => {
        let name = row['Name'];
        if (!name) return;
        let points = Number(row['Total']) || 0;
        if (!memberTotalsMap[name]) memberTotalsMap[name] = 0;
        memberTotalsMap[name] += points;
      });
    });

    totalsData = Object.entries(memberTotalsMap).map(([name,total]) => ({name, total}));
  }

  return totalsData;
}

// Render Leaderboard view
function renderLeaderboard() {
  clearError();
  showView(leaderboardView);
  memberView.classList.add('hidden');
  chartView.classList.add('hidden');

  const totalsData = aggregateTotals();
  if (!totalsData.length) {
    leaderboardDiv.innerHTML = '<p>No leaderboard data available.</p>';
    return;
  }

  // Sort descending by total points
  totalsData.sort((a,b) => b.total - a.total);

  // Build HTML table
  let html = `<table><thead><tr><th>Rank</th><th>Member</th><th>Total Points</th></tr></thead><tbody>`;
  totalsData.forEach((m, idx) => {
    html += `<tr><td>${idx + 1}</td><td>${m.name}</td><td>${m.total}</td></tr>`;
  });
  html += '</tbody></table>';

  leaderboardDiv.innerHTML = html;
}

// Render Top 5 Bar Chart
function renderChart() {
  clearError();
  showView(chartView);
  memberView.classList.add('hidden');
  leaderboardView.classList.add('hidden');

  const totalsData = aggregateTotals();
  if (!totalsData.length) {
    chartView.innerHTML = '<p>No chart data available.</p>';
    return;
  }

  // Sort descending by total points and take top 5
  const top5 = totalsData.sort((a,b) => b.total - a.total).slice(0, 5);

  const ctx = document.getElementById('topChart').getContext('2d');
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top5.map(m => m.name),
      datasets: [{
        label: 'Total Points',
        data: top5.map(m => m.total),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: ctx => `${ctx.parsed.y} points`
          }
        }
      }
    }
  });
}

// Event listeners
memberSelect.addEventListener('change', () => {
  const selected = memberSelect.value;
  if (selected) {
    renderMemberDetails(selected);
  } else {
    memberDataDiv.innerHTML = 'Select a member to view details.';
    showView(leaderboardView);
  }
});

periodSelect.addEventListener('change', () => {
  // Clear custom date inputs when period changes
  startDateInput.value = '';
  endDateInput.value = '';

  // If member selected, update member details else leaderboard
  if (memberSelect.value) {
    renderMemberDetails(memberSelect.value);
  } else {
    renderLeaderboard();
  }
});

startDateInput.addEventListener('change', () => {
  // If both dates entered, clear period select to custom mode
  if (startDateInput.value || endDateInput.value) {
    periodSelect.value = 'all';
  }
  if (memberSelect.value) {
    renderMemberDetails(memberSelect.value);
  } else {
    renderLeaderboard();
  }
});

endDateInput.addEventListener('change', () => {
  if (startDateInput.value || endDateInput.value) {
    periodSelect.value = 'all';
  }
  if (memberSelect.value) {
    renderMemberDetails(memberSelect.value);
  } else {
    renderLeaderboard();
  }
});

toggleMeetingNumbers.addEventListener('change', () => {
  if (memberSelect.value) {
    renderMemberDetails(memberSelect.value);
  }
});

showLeaderboardBtn.addEventListener('click', () => {
  memberSelect.value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  periodSelect.value = 'all';
  clearError();
  showView(leaderboardView);
  renderLeaderboard();
});

showChartBtn.addEventListener('click', () => {
  memberSelect.value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  periodSelect.value = 'all';
  clearError();
  renderChart();
});

clearFiltersBtn.addEventListener('click', () => {
  memberSelect.value = '';
  periodSelect.value = 'all';
  startDateInput.value = '';
  endDateInput.value = '';
  toggleMeetingNumbers.checked = false;
  clearError();
  memberDataDiv.innerHTML = 'Select a member to view details.';
  showView(leaderboardView);
  renderLeaderboard();
});

// Initial fetch and render
fetchData();

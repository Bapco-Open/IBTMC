// Global variables
const sheetUrls = {
  'Attendance': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1192815434&single=true&output=csv',
  'Early Attendance': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1928408168&single=true&output=csv',
  'Summary': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1556398249&single=true&output=csv',
  'Total': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1939085341&single=true&output=csv',
  'Role Taking': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=23380471&single=true&output=csv',
  'Speeches': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=170161438&single=true&output=csv',
  'Evaluations': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=335593996&single=true&output=csv',
  'Level Completions': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1646576393&single=true&output=csv',
  'Awards': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=302763050&single=true&output=csv',
  'ExCom & Sub.': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=710668362&single=true&output=csv',
  'Table Topics': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=618267332&single=true&output=csv',
  'Last Minute Roles': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=10890228&single=true&output=csv',
};

let allData = {}; // holds parsed CSV data per sheet
let chartInstance = null;

// Parse date string "12-Jul-25" -> Date object (assuming 20xx)
function parseDateString(dateStr) {
  // Format: dd-MMM-yy
  const parts = dateStr.split('-');
  if(parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1];
  const yearShort = parseInt(parts[2], 10);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = months.indexOf(monthStr);
  if(month === -1) return null;
  const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort; // simple cutoff
  return new Date(year, month, day);
}

// Load all CSV sheets using PapaParse
async function loadAllData() {
  const promises = Object.entries(sheetUrls).map(([sheetName, url]) => {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        skipEmptyLines: true,
        complete: (results) => {
          allData[sheetName] = results.data;
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  });
  await Promise.all(promises);
}

// Extract unique member names from Summary sheet, rows starting from 3rd row (index 2)
function getMemberNames() {
  const summaryData = allData['Summary'];
  if(!summaryData) return [];
  const names = [];
  for(let i=2; i < summaryData.length; i++) {
    const name = summaryData[i][0];
    if(name && name.trim() !== '') names.push(name.trim());
  }
  return names.sort();
}

// Build member dropdown
function populateMemberDropdown() {
  const select = document.getElementById('memberSelect');
  select.innerHTML = '<option value="" disabled selected>-- Choose Member --</option>';
  const members = getMemberNames();
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
}

// Extract meeting dates and meeting numbers (row 0 and 1 in each sheet)
// Returns array of {dateStr, meetingNum, dateObj}
function extractMeetingDates(sheetData) {
  if(!sheetData || sheetData.length < 2) return [];
  const headerRow = sheetData[0];
  const meetingNumRow = sheetData[1];
  const dates = [];
  for(let col=2; col < headerRow.length; col++) {
    const dateStr = headerRow[col];
    const meetingNum = meetingNumRow[col];
    const dateObj = parseDateString(dateStr);
    dates.push({dateStr, meetingNum, dateObj});
  }
  return dates;
}

// Given a member name and sheet data, get points total and per meeting (filtered by date)
function getMemberPoints(sheetData, memberName, dateFilterStart, dateFilterEnd) {
  if(!sheetData) return { total: 0, pointsByDate: [] };

  // Find member row index (starting from row 3 -> index 2)
  let memberRowIndex = -1;
  for(let i=2; i < sheetData.length; i++) {
    const nm = sheetData[i][0];
    if(nm && nm.trim() === memberName) {
      memberRowIndex = i;
      break;
    }
  }
  if(memberRowIndex === -1) return { total: 0, pointsByDate: [] };

  const meetingDates = extractMeetingDates(sheetData);

  let totalPoints = 0;
  const pointsByDate = [];

  meetingDates.forEach(({dateStr, meetingNum, dateObj}, idx) => {
    if(!dateObj) return; // skip if no valid date
    if(dateFilterStart && dateObj < dateFilterStart) return;
    if(dateFilterEnd && dateObj > dateFilterEnd) return;

    let val = sheetData[memberRowIndex][idx + 2]; // +2 offset for Name and Total columns
    let pts = parseFloat(val);
    if(isNaN(pts)) pts = 0;
    pointsByDate.push({dateStr, meetingNum, points: pts});
    totalPoints += pts;
  });

  return { total: totalPoints, pointsByDate };
}

// Render detailed member points view
function renderMemberDetails(memberName, startDate, endDate, showMeetingNums) {
  const container = document.getElementById('memberDetails');
  if(!memberName) {
    container.innerHTML = '<p>Please select a member.</p>';
    return;
  }

  // Build table header
  // We'll show all tabs (except Summary and Total separately)
  const tabs = Object.keys(sheetUrls).filter(s => s !== 'Summary' && s !== 'Total');

  let html = `<table class="details-table"><thead><tr><th>Category</th><th>Total Points</th>`;

  // Get unique dates union across all tabs for header, filtered by date
  const dateSet = new Set();
  tabs.forEach(tab => {
    const dates = extractMeetingDates(allData[tab]);
    dates.forEach(({dateStr, dateObj}) => {
      if(!dateObj) return;
      if(startDate && dateObj < startDate) return;
      if(endDate && dateObj > endDate) return;
      dateSet.add(dateStr);
    });
  });
  const sortedDates = Array.from(dateSet).sort((a,b) => {
    const da = parseDateString(a);
    const db = parseDateString(b);
    return da - db;
  });

  // Add dates headers
  sortedDates.forEach(dateStr => {
    html += `<th>${dateStr}</th>`;
  });
  html += '</tr>';

  // Meeting numbers row
  html += '<tr class="meeting-number-row">';
  html += '<td colspan="2">Meeting #</td>';
  sortedDates.forEach(dateStr => {
    // get meeting number from any sheet that has this date (first match)
    let meetingNum = '';
    for(let tab of tabs) {
      const dates = extractMeetingDates(allData[tab]);
      const found = dates.find(d => d.dateStr === dateStr);
      if(found) {
        meetingNum = found.meetingNum || '';
        break;
      }
    }
    html += `<td>${meetingNum}</td>`;
  });
  html += '</tr></thead><tbody>';

  // Rows per category
  tabs.forEach(tab => {
    const { total, pointsByDate } = getMemberPoints(allData[tab], memberName, startDate, endDate);

    html += `<tr><td>${tab}</td><td>${total.toFixed(2)}</td>`;

    sortedDates.forEach(dateStr => {
      const pt = pointsByDate.find(p => p.dateStr === dateStr);
      html += `<td>${pt ? pt.points.toFixed(2) : ''}</td>`;
    });

    html += '</tr>';
  });

  // Summary and Total Rows
  ['Summary','Total'].forEach(sheetName => {
    const { total } = getMemberPoints(allData[sheetName], memberName, startDate, endDate);
    html += `<tr style="font-weight:bold;background:#ffe6dc"><td>${sheetName}</td><td>${total.toFixed(2)}</td>`;
    sortedDates.forEach(dateStr => {
      // For summary/total we only show total column
      html += `<td></td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';

  container.innerHTML = html;

  // Toggle meeting number row visibility
  const toggle = document.getElementById('toggleMeetingNumbers');
  const meetingRow = container.querySelector('.meeting-number-row');
  if(meetingRow) {
    meetingRow.style.display = toggle.checked ? 'table-row' : 'none';
  }
}

// Render leaderboard (based on Total sheet)
function renderLeaderboard(startDate, endDate) {
  const leaderboardDiv = document.getElementById('leaderboard');
  const totalSheet = allData['Total'];
  if(!totalSheet) {
    leaderboardDiv.innerHTML = '<p>Leaderboard data not available.</p>';
    return;
  }

  // Extract members and scores from row 3 onwards (index 2)
  const membersScores = [];
  for(let i=2; i < totalSheet.length; i++) {
    const row = totalSheet[i];
    const name = row[0];
    if(!name) continue;

    // Total points in col 2 (index 1) or sum after filtering dates (if available)
    let totalPoints = parseFloat(row[1]);
    if(isNaN(totalPoints)) totalPoints = 0;

    membersScores.push({ name: name.trim(), totalPoints });
  }

  // Sort descending by score
  membersScores.sort((a,b) => b.totalPoints - a.totalPoints);

  // Build table html
  let html = `<table class="leaderboard-table"><thead><tr><th>Rank</th><th>Member</th><th>Points</th></tr></thead><tbody>`;
  membersScores.forEach((m, idx) => {
    html += `<tr><td>${idx + 1}</td><td>${m.name}</td><td>${m.totalPoints.toFixed(2)}</td></tr>`;
  });
  html += '</tbody></table>';

  leaderboardDiv.innerHTML = html;

  // Render top 5 chart
  renderTop5Chart(membersScores.slice(0,5));
}

// Render bar chart for top 5 members
function renderTop5Chart(top5Data) {
  const ctx = document.getElementById('top5Chart').getContext('2d');
  if(chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top5Data.map(m => m.name),
      datasets: [{
        label: 'Points',
        data: top5Data.map(m => m.totalPoints),
        backgroundColor: '#FF5733',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 5 }
        }
      }
    }
  });
}

// Parse date input (yyyy-mm-dd) to Date object or null
function parseDateInput(val) {
  if(!val) return null;
  return new Date(val + 'T00:00:00');
}

// Initialize app
async function init() {
  try {
    await loadAllData();
    populateMemberDropdown();

    const memberSelect = document.getElementById('memberSelect');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const toggleMeetingNumbers = document.getElementById('toggleMeetingNumbers');

    function updateViews() {
      const memberName = memberSelect.value;
      const startDate = parseDateInput(startDateInput.value);
      const endDate = parseDateInput(endDateInput.value);
      const showMeetingNums = toggleMeetingNumbers.checked;

      renderMemberDetails(memberName, startDate, endDate, showMeetingNums);
      renderLeaderboard(startDate, endDate);
    }

    // Listeners
    memberSelect.addEventListener('change', updateViews);
    startDateInput.addEventListener('change', updateViews);
    endDateInput.addEventListener('change', updateViews);
    toggleMeetingNumbers.addEventListener('change', () => {
      const meetingRow = document.querySelector('.meeting-number-row');
      if(meetingRow) {
        meetingRow.style.display = toggleMeetingNumbers.checked ? 'table-row' : 'none';
      }
    });

    // Initialize leaderboard (empty date filter)
    renderLeaderboard(null, null);
  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('memberDetails').innerHTML = '<p>Error loading data, please try again later.</p>';
  }
}

window.addEventListener('DOMContentLoaded', init);

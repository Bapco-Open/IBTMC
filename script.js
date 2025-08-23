// URLs of CSV tabs (Summary + others)
const CSV_SOURCES = {
  Summary: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1556398249&single=true&output=csv',
  Total: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1939085341&single=true&output=csv',
  Attendance: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1192815434&single=true&output=csv',
  'Early Attendance': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1928408168&single=true&output=csv',
  'Role Taking': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=23380471&single=true&output=csv',
  Speeches: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=170161438&single=true&output=csv',
  Evaluations: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=335593996&single=true&output=csv',
  'Level Completions': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=1646576393&single=true&output=csv',
  Awards: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=302763050&single=true&output=csv',
  'ExCom & Sub.': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=710668362&single=true&output=csv',
  Contests: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=...&single=true&output=csv', // add if needed
  Other: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=...&single=true&output=csv', // add if needed
  External: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=...&single=true&output=csv', // add if needed
  'Table Topics': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=618267332&single=true&output=csv',
  'Last Minute Roles': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=10890228&single=true&output=csv',
  'Last Minute Speeches/Evaluations': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?gid=...&single=true&output=csv' // add if needed
};

// Global state
let allData = {}; // will hold parsed CSV data keyed by tab name
let memberList = [];
let chartInstance = null;

function parseCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}

// Load members from Summary sheet, skipping 2 header rows
async function loadMembers() {
  try {
    const data = await parseCSV(CSV_SOURCES.Summary);
    // Skip first 2 rows, then get first column names
    memberList = data.slice(2).map(row => row[0]?.trim()).filter(n => n);
    populateMemberDropdown();
  } catch (error) {
    alert('Failed to load member list: ' + error);
    console.error(error);
  }
}

function populateMemberDropdown() {
  const select = document.getElementById('memberSelect');
  select.innerHTML = '<option value="">-- Choose a Member --</option>';
  memberList.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// Load all tabs
async function loadAllData() {
  const promises = Object.entries(CSV_SOURCES).map(async ([key, url]) => {
    try {
      const data = await parseCSV(url);
      allData[key] = data;
    } catch (e) {
      console.warn(`Failed to load ${key}:`, e);
      allData[key] = null;
    }
  });
  await Promise.all(promises);
}

// Format date strings like "12-Jul-25" into Date objects
function parseDateString(dateStr) {
  // format is like "12-Jul-25"
  // JS Date parsing is locale sensitive, so parse manually:
  const parts = dateStr.split('-');
  if(parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1];
  const year = 2000 + parseInt(parts[2], 10); // e.g. 25 => 2025

  const months = {
    Jan: 0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
  };

  const month = months[monthStr];
  if(month === undefined || isNaN(day)) return null;

  return new Date(year, month, day);
}

// Filter columns by date range
function getDateFilteredColumns(headerRow, startDate, endDate) {
  // headerRow example: ["Name", "Total", "12-Jul-25", "26-Jul-25", "9-Aug-25"]
  const indices = [];
  const dates = [];

  headerRow.forEach((col, idx) => {
    if(idx < 2) return; // Skip "Name" and "Total"
    const d = parseDateString(col);
    if(d && d >= startDate && d <= endDate) {
      indices.push(idx);
      dates.push(d);
    }
  });
  return { indices, dates };
}

function toggleMeetingNumbers(show) {
  const meetingRows = document.querySelectorAll('.meeting-number-row');
  meetingRows.forEach(row => {
    row.style.display = show ? 'table-row' : 'none';
  });
}

// Build detailed member view table
function buildMemberDetails(memberName, startDate, endDate) {
  const container = document.getElementById('memberDetails');
  container.innerHTML = '';

  if(!memberName) {
    container.innerHTML = '<p>Please select a member to see details.</p>';
    return;
  }

  // Aggregate points by category and dates for this member
  const categories = Object.keys(allData);
  const rows = [];
  const headerDates = new Set();

  categories.forEach(cat => {
    const sheet = allData[cat];
    if(!sheet) return; // skip if failed to load

    // Header is first row, meeting numbers in second row
    const header = sheet[0];
    const meetingNumbersRow = sheet[1];
    if(!header || !meetingNumbersRow) return;

    // Find member row by matching memberName in first column from row 3+
    let memberRowIndex = -1;
    for(let i=2; i<sheet.length; i++) {
      if(sheet[i][0]?.trim() === memberName) {
        memberRowIndex = i;
        break;
      }
    }
    if(memberRowIndex === -1) return;

    const memberRow = sheet[memberRowIndex];

    // Get columns to include by date filter
    const { indices: dateCols, dates } = getDateFilteredColumns(header, startDate, endDate);

    // Sum totals for filtered dates
    let totalPoints = 0;
    let pointsByDate = {};

    dateCols.forEach(idx => {
      let val = parseFloat(memberRow[idx]);
      if(isNaN(val)) val = 0;
      totalPoints += val;
      pointsByDate[header[idx]] = val;
      headerDates.add(header[idx]);
    });

    rows.push({
      category: cat,
      totalPoints,
      pointsByDate,
      meetingNumbers: meetingNumbersRow
    });
  });

  // Build HTML table
  const table = document.createElement('table');
  table.classList.add('details-table');

  // Header row: Category | Total | filtered dates
  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th')).textContent = 'Category';
  headerRow.appendChild(document.createElement('th')).textContent = 'Total Points';

  const sortedDates = Array.from(headerDates).sort((a,b) => parseDateString(a) - parseDateString(b));
  sortedDates.forEach(dateStr => {
    const th = document.createElement('th');
    th.textContent = dateStr;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Meeting numbers row (toggle show/hide)
  const meetingNumRow = document.createElement('tr');
  meetingNumRow.classList.add('meeting-number-row');
  meetingNumRow.appendChild(document.createElement('td')).textContent = 'Meeting #';
  meetingNumRow.appendChild(document.createElement('td')); // blank under total

  sortedDates.forEach(dateStr => {
    // Find meeting number index for this date from any category that has it
    let meetingNum = '';
    for(const r of rows) {
      const idx = r.meetingNumbers.findIndex(x => x === dateStr);
      if(idx > -1) {
        meetingNum = r.meetingNumbers[idx];
        break;
      }
    }
    meetingNumRow.appendChild(document.createElement('td')).textContent = meetingNum;
  });
  table.appendChild(meetingNumRow);

  // Data rows
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const catTd = document.createElement('td');
    catTd.textContent = r.category;
    tr.appendChild(catTd);

    const totalTd = document.createElement('td');
    totalTd.textContent = r.totalPoints.toFixed(2);
    tr.appendChild(totalTd);

    sortedDates.forEach(dateStr => {
      const td = document.createElement('td');
      td.textContent = r.pointsByDate[dateStr]?.toFixed(2) || '0';
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}

// Build leaderboard from Summary sheet
function buildLeaderboard(startDate, endDate) {
  const container = document.getElementById('leaderboard');
  container.innerHTML = '';

  const summarySheet = allData['Summary'];
  if(!summarySheet) {
    container.textContent = 'Summary data not loaded';
    return;
  }

  // Get member rows after skipping 2 header rows
  const membersData = summarySheet.slice(2)
    .map(row => ({
      name: row[0]?.trim(),
      score: parseFloat(row[1]) || 0
    }))
    .filter(m => m.name);

  // Sort descending by score
  membersData.sort((a,b) => b.score - a.score);

  // Filter by date range if possible: 
  // Summary sheet only has total scores, so we rely on Total sheet for detailed filtering

  // Top 5 for chart
  const top5 = membersData.slice(0,5);

  // Build leaderboard table
  const table = document.createElement('table');
  table.classList.add('leaderboard-table');

  const headerRow = document.createElement('tr');
  ['Rank', 'Member', 'Score'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  membersData.forEach((m,i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${m.name}</td><td>${m.score.toFixed(2)}</td>`;
    table.appendChild(tr);
  });

  container.appendChild(table);

  // Render bar chart for top 5
  renderTop5Chart(top5);
}

function renderTop5Chart(top5) {
  const ctx = document.getElementById('top5Chart').getContext('2d');
  if(chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top5.map(m => m.name),
      datasets: [{
        label: 'Top 5 Scores',
        data: top5.map(m => m.score),
        backgroundColor: 'rgba(255, 87, 51, 0.7)', // Toastmasters orange
        borderColor: 'rgba(255, 87, 51, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Event handlers for filtering
function onMemberChange() {
  const member = document.getElementById('memberSelect').value;
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);

  if(startDate > endDate) {
    alert('Start date must be before end date');
    return;
  }

  buildMemberDetails(member, startDate, endDate);
}

function onDateChange() {
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);
  if(startDate > endDate) {
    alert('Start date must be before end date');
    return;
  }
  buildLeaderboard(startDate, endDate);
}

function onToggleMeetingNumbers() {
  const show = document.getElementById('toggleMeetingNumbers').checked;
  toggleMeetingNumbers(show);
}

async function init() {
  await loadAllData();
  await loadMembers();

  // Set default dates (last 90 days)
  const today = new Date();
  const prior = new Date(); prior.setDate(today.getDate()-90);
  document.getElementById('startDate').valueAsDate = prior;
  document.getElementById('endDate').valueAsDate = today;

  // Initial render
  buildLeaderboard(prior, today);

  // Attach event listeners
  document.getElementById('memberSelect').addEventListener('change', onMemberChange);
  document.getElementById('startDate').addEventListener('change', onDateChange);
  document.getElementById('endDate').addEventListener('change', onDateChange);
  document.getElementById('toggleMeetingNumbers').addEventListener('change', onToggleMeetingNumbers);

  // Hide meeting numbers by default
  toggleMeetingNumbers(false);
}

window.addEventListener('DOMContentLoaded', init);

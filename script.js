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
  "Table Topics": 618267332
};

const BASE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdWUbjkeHCHq6fBUKFUmq8TJ_Mp0V3zhzmgm5Ds7Fed0dqdqR5c2oy2SzJuvVwwSJ6egCfB6FALPa/pub?output=csv&gid=';

let allData = {};
let membersSet = new Set();
let chartInstance = null;

const memberSelect = document.getElementById("memberSelect");
const memberDataDiv = document.getElementById("memberData");

async function fetchAllSheets() {
  const sheetNames = Object.keys(SHEET_GIDS);
  for (const sheet of sheetNames) {
    const gid = SHEET_GIDS[sheet];
    if (!gid) continue;

    const url = `${BASE_CSV_URL}${gid}`;
    try {
      const response = await fetch(url);
      const csv = await response.text();
      const parsed = Papa.parse(csv, { header: false });
      allData[sheet] = parsed.data;
    } catch (err) {
      console.error(`Error fetching ${sheet}:`, err);
    }
  }

  buildMemberList();
}

function buildMemberList() {
  for (const sheetName in allData) {
    const rows = allData[sheetName];
    if (!Array.isArray(rows)) continue;
    for (let i = 2; i < rows.length; i++) {
      const name = rows[i][0]?.trim();
      if (name) membersSet.add(name);
    }
  }

  [...membersSet].sort().forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    memberSelect.appendChild(option);
  });
}

memberSelect.addEventListener("change", () => {
  const name = memberSelect.value;
  memberDataDiv.innerHTML = name ? `<p>Loading data for <strong>${name}</strong>...</p>` : "";
  // Add your renderMemberDetails(name) function here
});

fetchAllSheets();

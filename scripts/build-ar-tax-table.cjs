#!/usr/bin/env node
/**
 * Converts Arkansas DFA city/county sales tax Excel table to JSON for use at checkout.
 * Run when you have a new cityCountyTaxTable_*.xls file:
 *   node scripts/build-ar-tax-table.cjs [path/to/cityCountyTaxTable_Jan_Mar_2026.xls]
 * Output: src/data/arTaxTable.json
 */
const fs = require('fs');
const path = require('path');

const defaultPath = path.join(process.env.HOME || '', 'Downloads', 'cityCountyTaxTable_Jan_Mar_2026.xls');
const xlsPath = process.argv[2] || defaultPath;
const outPath = path.join(__dirname, '..', 'src', 'data', 'arTaxTable.json');

let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  console.error('Run: npm install --save-dev xlsx');
  process.exit(1);
}

if (!fs.existsSync(xlsPath)) {
  console.error('File not found:', xlsPath);
  console.error('Usage: node scripts/build-ar-tax-table.cjs [path/to/cityCountyTaxTable_*.xls]');
  process.exit(1);
}

function norm(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
}

const wb = XLSX.readFile(xlsPath);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

// Arkansas state sales tax (always added to local rate at lookup).
const AR_STATE_RATE_PERCENT = 6.5;

// County list (rows 360-434): name (without " County") -> local rate (decimal)
const counties = {};
for (let i = 360; i <= 434; i++) {
  const row = data[i];
  if (!row || row[0] == null) continue;
  const full = String(row[0]).trim();
  const name = norm(full.replace(/\s*COUNTY\s*$/i, ''));
  const rate = Number(row[3]);
  if (!isNaN(rate) && rate >= 0) counties[name] = rate;
}

// City list (rows 9-358, "- CITY LIST -").
// - For rows where "Total % Rate" is numeric: cities[city] = that local rate (city + county).
// - For rows where "Total % Rate" is \"Varies\": we cannot know the local total until we know
//   which county the address is in, so we store just the city % (column D) and the list of
//   possible counties. At lookup time we will add the city % to the address's county rate.
const cities = {};
const citiesVaries = {};
for (let i = 9; i < 359; i++) {
  const row = data[i];
  if (!row || row[0] == null) continue;
  const cityName = norm(row[0]);
  if (!cityName) continue;
  const cityRate = Number(row[3]);
  const totalCell = row[6];
  if (typeof totalCell === 'number' && !isNaN(totalCell)) {
    const localRate = Math.round(totalCell * 10000) / 10000; // Total % Rate column (local only)
    cities[cityName] = localRate;
  } else if (totalCell === 'Varies' && !isNaN(cityRate)) {
    const countyLoc = String(row[4] ?? '').trim();
    const parts = countyLoc
      .split('/')
      .map((s) => norm(s.replace(/\s*$/, '')))
      .filter(Boolean);
    citiesVaries[cityName] = {
      cityRate: Math.round(cityRate * 10000) / 10000,
      counties: parts,
    };
  }
}

const output = {
  stateRatePercent: AR_STATE_RATE_PERCENT,
  cities,
  citiesVaries,
  counties,
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log('Wrote', outPath, '| Cities:', Object.keys(cities).length, '| Counties:', Object.keys(counties).length);

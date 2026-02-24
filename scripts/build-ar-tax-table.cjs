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

// County list (rows 360-434): name (without " County") -> rate
const counties = {};
for (let i = 360; i <= 434; i++) {
  const row = data[i];
  if (!row || row[0] == null) continue;
  const full = String(row[0]).trim();
  const name = norm(full.replace(/\s*COUNTY\s*$/i, ''));
  const rate = Number(row[3]);
  if (!isNaN(rate) && rate >= 0) counties[name] = rate;
}

// City list (rows 9-358): normalized city name -> combined local rate (city + county)
const cities = {};
for (let i = 9; i < 359; i++) {
  const row = data[i];
  if (!row || row[0] == null) continue;
  const cityName = norm(row[0]);
  if (!cityName) continue;
  const cityRate = Number(row[3]);
  const totalCell = row[6];
  let localRate;
  if (typeof totalCell === 'number' && !isNaN(totalCell)) {
    localRate = totalCell;
  } else if (totalCell === 'Varies' && !isNaN(cityRate)) {
    const countyLoc = String(row[4] ?? '').trim();
    const parts = countyLoc.split('/').map((s) => norm(s.replace(/\s*$/, '')));
    let maxCounty = 0;
    for (const p of parts) {
      const r = counties[p];
      if (r != null && r > maxCounty) maxCounty = r;
    }
    localRate = cityRate + maxCounty;
  } else continue;
  cities[cityName] = Math.round(localRate * 10000) / 10000;
}

// Arkansas state sales tax (added to local rate at lookup time)
const AR_STATE_RATE_PERCENT = 6.5;

const output = {
  stateRatePercent: AR_STATE_RATE_PERCENT,
  cities,
  counties,
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log('Wrote', outPath, '| Cities:', Object.keys(cities).length, '| Counties:', Object.keys(counties).length);

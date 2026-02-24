#!/usr/bin/env node
/**
 * Builds arZipToCounty.json for Arkansas sales tax fallback (ZIP → county when city doesn't match).
 * CSV format: zip,county (header optional). County can be "Pulaski" or "Pulaski County".
 *   node scripts/build-ar-zip-county.cjs [path/to/ar-zip-county.csv]
 * Output: src/data/arZipToCounty.json
 */
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
const outPath = path.join(__dirname, '..', 'src', 'data', 'arZipToCounty.json');

function norm(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s*COUNTY\s*$/i, '');
}

let zipToCounty = {};

if (csvPath && fs.existsSync(csvPath)) {
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  const first = lines[0].toLowerCase();
  const skipHeader = first.includes('zip') && first.includes('county');
  for (let i = skipHeader ? 1 : 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    const zip = String(parts[0] ?? '').replace(/\D/g, '').slice(0, 5);
    const county = norm(parts[1] ?? '');
    if (zip.length === 5 && county) zipToCounty[zip] = county;
  }
  console.log('Read', Object.keys(zipToCounty).length, 'ZIPs from', csvPath);
} else {
  console.log('No CSV path or file not found. Writing existing data or empty map.');
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    zipToCounty = existing;
  } catch (_) {
    zipToCounty = {};
  }
}

fs.writeFileSync(outPath, JSON.stringify(zipToCounty, null, 2), 'utf8');
console.log('Wrote', outPath);

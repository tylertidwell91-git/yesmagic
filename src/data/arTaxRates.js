/**
 * Arkansas sales tax lookup from city/county table (DFA cityCountyTaxTable).
 * Used at checkout when shipping address is in Arkansas.
 * Data source: src/data/arTaxTable.json (build from scripts/build-ar-tax-table.cjs).
 */

import arTaxTable from './arTaxTable.json'

const { stateRatePercent, cities, counties } = arTaxTable
const STATE_RATE_DECIMAL = stateRatePercent / 100

function normalizeCity(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function normalizeCounty(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s*COUNTY\s*$/i, '')
}

/**
 * Get combined Arkansas sales tax rate (state + local) for a city.
 * Optionally pass county for unincorporated areas (city lookup takes precedence).
 * @param {string} city - City name from shipping address
 * @param {string} [county] - County name (optional; used if city not in table)
 * @returns {number|null} Rate as decimal (e.g. 0.0975 for 9.75%), or null if not in AR table
 */
export function getArkansasTaxRateForAddress(city, county) {
  const cityKey = normalizeCity(city)
  if (!cityKey) {
    if (county) {
      const countyKey = normalizeCounty(county)
      const local = counties[countyKey]
      if (local != null) return STATE_RATE_DECIMAL + local
    }
    return null
  }

  let localRate = cities[cityKey]
  if (localRate == null) {
    // Try "CITY NAME (CITY)" for entries like "BENTON (CITY)"
    localRate = cities[cityKey + ' (CITY)']
  }
  if (localRate != null) return STATE_RATE_DECIMAL + localRate

  if (county) {
    const countyKey = normalizeCounty(county)
    const local = counties[countyKey]
    if (local != null) return STATE_RATE_DECIMAL + local
  }

  return null
}

/**
 * Get tax rate for Arkansas address. Uses city from shipping address; county not in form so only city is used.
 * @param {{ city: string, state?: string, zip?: string }} address - Shipping address fields
 * @returns {number|null} Rate as decimal, or null
 */
export function getArkansasTaxRateForShippingAddress(address) {
  if (!address || !address.city) return null
  const state = (address.state || '').trim().toUpperCase()
  if (state !== 'AR' && state !== 'ARKANSAS') return null
  return getArkansasTaxRateForAddress(address.city, address.county)
}

// Legacy: ZIP-based lookup not in table; kept for compatibility.
export const AR_TAX_RATES_BY_ZIP = {}
export function getArkansasTaxRateForZip(zip) {
  if (!zip) return null
  const key = String(zip).trim().slice(0, 5)
  const raw = AR_TAX_RATES_BY_ZIP[key]
  if (raw == null) return null
  const n = Number(raw)
  return !Number.isNaN(n) && n > 0 ? n / 100 : null
}

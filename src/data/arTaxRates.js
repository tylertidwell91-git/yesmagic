/**
 * Arkansas sales tax lookup for checkout (AR shipping addresses only).
 *
 * Logic:
 * 1. State rate 6.5% is always added to the local rate.
 * 2. Search the "- CITY LIST -" section: if the address city matches a row, use that row's
 *    "Total % Rate" column as the local rate. Total tax = 6.5% + Total % Rate.
 * 3. If there is no city match, determine the county from the address ZIP using arZipToCounty,
 *    then find that county in the "- COUNTY LIST -" section and use its % rate. Total tax = 6.5% + county rate.
 *
 * Data: arTaxTable.json (from build-ar-tax-table.cjs), arZipToCounty.json (from build-ar-zip-county.cjs or CSV).
 */

import arTaxTable from './arTaxTable.json'
import zipToCounty from './arZipToCounty.json'

const { stateRatePercent, cities, citiesVaries = {}, counties } = arTaxTable
const STATE_RATE_DECIMAL = stateRatePercent / 100

function normalizeCity(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function normalizeCounty(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s*COUNTY\s*$/i, '')
}

function getZip5(zip) {
  return String(zip ?? '').trim().replace(/\D/g, '').slice(0, 5)
}

/**
 * Get combined Arkansas sales tax rate (state 6.5% + local) for a shipping address.
 * Step 1: If city matches the City List, use that row's Total % Rate + 6.5%.
 * Step 2: Else if ZIP maps to a county (arZipToCounty), use that county's rate from County List + 6.5%.
 * @param {{ city?: string, state?: string, zip?: string, county?: string }} address - Shipping address
 * @returns {number|null} Rate as decimal (e.g. 0.0975 for 9.75%), or null
 */
export function getArkansasTaxRateForShippingAddress(address) {
  if (!address) return null
  const state = (address.state || '').trim().toUpperCase()
  if (state !== 'AR' && state !== 'ARKANSAS') return null

  // Step 1a: Try city match where Total % Rate is numeric (simple City List rows).
  const city = address.city
  if (city) {
    const cityKey = normalizeCity(city)
    let localRate = cities[cityKey]
    if (localRate == null) localRate = cities[cityKey + ' (CITY)']
    if (localRate != null) return STATE_RATE_DECIMAL + localRate

    // Step 1b: Handle \"Varies\" rows: use city % (col D) + county % (from County List for this address).
    let varies = citiesVaries[cityKey]
    if (!varies) varies = citiesVaries[cityKey + ' (CITY)']
    if (varies && typeof varies.cityRate === 'number') {
      const zip5ForCity = getZip5(address.zip)
      let countyKey = ''
      if (zip5ForCity && zipToCounty[zip5ForCity]) {
        countyKey = normalizeCounty(zipToCounty[zip5ForCity])
      } else if (address.county) {
        countyKey = normalizeCounty(address.county)
      }
      if (countyKey) {
        const countyRate = counties[countyKey]
        if (typeof countyRate === 'number') {
          const localFromCityAndCounty = varies.cityRate + countyRate
          return STATE_RATE_DECIMAL + localFromCityAndCounty
        }
      }
    }
  }

  // Step 2: No city match of any kind — determine county from ZIP and use County List rate
  const zip5 = getZip5(address.zip)
  if (zip5) {
    const countyName = zipToCounty[zip5]
    if (countyName) {
      const countyKey = normalizeCounty(countyName)
      const localRate = counties[countyKey]
      if (localRate != null) return STATE_RATE_DECIMAL + localRate
    }
  }

  // Optional: if address already has county (e.g. from another source), use it
  if (address.county) {
    const countyKey = normalizeCounty(address.county)
    const localRate = counties[countyKey]
    if (localRate != null) return STATE_RATE_DECIMAL + localRate
  }

  return null
}

/**
 * Get combined Arkansas rate for a given city and optional county/ZIP.
 * Used when you have city and optionally county or zip for fallback.
 */
export function getArkansasTaxRateForAddress(city, countyOrZip) {
  if (city) {
    const cityKey = normalizeCity(city)
    let localRate = cities[cityKey]
    if (localRate == null) localRate = cities[cityKey + ' (CITY)']
    if (localRate != null) return STATE_RATE_DECIMAL + localRate

    let varies = citiesVaries[cityKey]
    if (!varies) varies = citiesVaries[cityKey + ' (CITY)']
    if (varies && typeof varies.cityRate === 'number') {
      let countyKey = ''
      const zip5ForCity = getZip5(countyOrZip)
      if (zip5ForCity && zipToCounty[zip5ForCity]) {
        countyKey = normalizeCounty(zipToCounty[zip5ForCity])
      } else if (countyOrZip && typeof countyOrZip === 'string') {
        countyKey = normalizeCounty(countyOrZip)
      }
      if (countyKey) {
        const countyRate = counties[countyKey]
        if (typeof countyRate === 'number') {
          const localFromCityAndCounty = varies.cityRate + countyRate
          return STATE_RATE_DECIMAL + localFromCityAndCounty
        }
      }
    }
  }
  const zip5 = getZip5(countyOrZip)
  if (zip5 && zipToCounty[zip5]) {
    const countyKey = normalizeCounty(zipToCounty[zip5])
    const localRate = counties[countyKey]
    if (localRate != null) return STATE_RATE_DECIMAL + localRate
  }
  if (countyOrZip && typeof countyOrZip === 'string' && countyOrZip.length > 3) {
    const countyKey = normalizeCounty(countyOrZip)
    const localRate = counties[countyKey]
    if (localRate != null) return STATE_RATE_DECIMAL + localRate
  }
  return null
}

// Legacy
export const AR_TAX_RATES_BY_ZIP = {}
export function getArkansasTaxRateForZip(zip) {
  if (!zip) return null
  const key = getZip5(zip)
  const raw = AR_TAX_RATES_BY_ZIP[key]
  if (raw == null) return null
  const n = Number(raw)
  return !Number.isNaN(n) && n > 0 ? n / 100 : null
}

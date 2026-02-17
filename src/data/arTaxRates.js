// Arkansas local sales tax rates by ZIP code.
// Values are percentages (e.g. 9.75 means 9.75% total tax).
// Populate/maintain this map using the Arkansas DFA Local Tax Lookup Tool.
//
// IMPORTANT:
// - Keys should be 5‑digit ZIP codes as strings.
// - Values should be numeric percentages, WITHOUT the % sign.
// - Example:
//     "72701": 9.75,
//     "72703": 9.25,
//
// Any ZIP not listed here will fall back to VITE_SALES_TAX_RATE (if set),
// or 0 if neither is configured.

export const AR_TAX_RATES_BY_ZIP = {
  // TODO: Fill these with your actual DFA‑derived rates.
  // "72701": 9.75,
  // "72703": 9.25,
}

export function getArkansasTaxRateForZip(zip) {
  if (!zip) return null
  const key = String(zip).trim().slice(0, 5) // handle ZIP+4, etc.
  const raw = AR_TAX_RATES_BY_ZIP[key]
  if (raw == null) return null
  const n = Number(raw)
  return !Number.isNaN(n) && n > 0 ? n / 100 : null
}


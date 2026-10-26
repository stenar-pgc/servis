// Postal return rates supplied by the workshop. Slovenia keeps its domestic rate.
export function postalRate(country) {
  if (country === 'SI') return 5
  if (['AT', 'HR', 'HU'].includes(country)) return 10
  if (['BE', 'CZ', 'DK', 'DE', 'IT', 'NL', 'SK'].includes(country)) return 20
  // EU membership: https://european-union.europa.eu/principles-countries-history/eu-countries_en
  if (
    ['BG', 'CY', 'EE', 'FI', 'FR', 'GR', 'IE', 'LV', 'LT', 'LU', 'MT', 'PL', 'PT', 'RO', 'ES', 'SE'].includes(country)
  )
    return 30
  if (
    [
      'AL',
      'AD',
      'AM',
      'AZ',
      'BY',
      'BA',
      'FO',
      'GE',
      'GI',
      'GG',
      'IS',
      'IM',
      'JE',
      'XK',
      'LI',
      'MD',
      'MC',
      'ME',
      'MK',
      'NO',
      'RU',
      'SM',
      'RS',
      'SJ',
      'CH',
      'TR',
      'UA',
      'GB',
      'VA'
    ].includes(country)
  )
    return 40
  return 50
}

/**
 * Overrides applied on top of api-football's responses while generating the
 * 2026 World Cup seed. Each map exists because the API itself ships data
 * that is missing, ambiguous, or inconsistent for this tournament.
 *
 *   - VENUE_NAME_BY_API_FIXTURE_ID — patches fixtures where the API returned
 *     no venue at all (10 fixtures in the May 2026 snapshot, distributed
 *     between AT&T Stadium and Levi's Stadium).
 *   - CITY_BY_VENUE_NAME — canonical city per stadium. The API leaves
 *     fixture.venue.city null for most US/Canada venues and uses "Zapopan"
 *     for Estadio Akron (the actual municipality) where FIFA brands it as
 *     "Guadalajara". This map wins over both the API and openfootball so
 *     cities stay consistent across all 104 rows.
 *   - GROUND_TO_VENUE_NAME — maps openfootball/worldcup.json's FIFA host-
 *     city naming (e.g. "Dallas (Arlington)") to the actual stadium name
 *     used in match_schedules. The knockout-stage source pulls those slots
 *     from openfootball, so we need this translation layer.
 *   - COUNTRY_CODE_BY_API_TEAM_ID — overrides team.code where the API ships
 *     a non-standard or duplicated 3-letter code (e.g. "AUS" for *both*
 *     Australia and Austria, "IRA" for *both* Iran and Iraq). Values below
 *     follow FIFA's federation codes.
 */

// Keys here are api-football fixture IDs (fixture.id from /fixtures).
// The 10 entries below patch fixtures where the API returned no venue.
// Source: openfootball/worldcup.json (2026/worldcup.json).
export const VENUE_NAME_BY_API_FIXTURE_ID: Record<number, string> = {
  1489373: "Levi's Stadium", // Qatar vs Switzerland       (Group B, GS1)
  1489376: 'AT&T Stadium', // Netherlands vs Japan       (Group F, GS1)
  1489382: "Levi's Stadium", // Austria vs Jordan          (Group J, GS1)
  1489384: 'AT&T Stadium', // England vs Croatia         (Group L, GS1)
  1539006: "Levi's Stadium", // Türkiye vs Paraguay        (Group D, GS2)
  1489399: 'AT&T Stadium', // Argentina vs Austria       (Group J, GS2)
  1489400: "Levi's Stadium", // Jordan vs Algeria          (Group J, GS2)
  1539011: 'AT&T Stadium', // Japan vs Sweden            (Group F, GS3)
  1489411: "Levi's Stadium", // Paraguay vs Australia      (Group D, GS3)
  1489421: 'AT&T Stadium', // Jordan vs Argentina        (Group J, GS3)
};

// Keyed by venue_name as it appears in the generated SQL.
// CITY_BY_VENUE_NAME takes precedence over fixture.venue.city, so this
// also fixes the Estadio Akron / Zapopan ↔ Guadalajara mismatch.
export const CITY_BY_VENUE_NAME: Record<string, string> = {
  // USA
  'Mercedes-Benz Stadium': 'Atlanta',
  'Gillette Stadium': 'Foxborough',
  'AT&T Stadium': 'Arlington',
  'NRG Stadium': 'Houston',
  'Arrowhead Stadium': 'Kansas City',
  'SoFi Stadium': 'Inglewood',
  'Hard Rock Stadium': 'Miami Gardens',
  'MetLife Stadium': 'East Rutherford',
  'Lincoln Financial Field': 'Philadelphia',
  "Levi's Stadium": 'Santa Clara',
  'Lumen Field': 'Seattle',
  // Canada
  'BMO Field': 'Toronto',
  'BC Place': 'Vancouver',
  // Mexico
  'Estadio Akron': 'Guadalajara',
  'Estadio Azteca': 'Mexico City',
  'Estadio BBVA': 'Monterrey',
};

// Keyed by the "ground" field in openfootball/worldcup.json (which uses
// FIFA's host-city naming) → the actual stadium name we want in the seed.
export const GROUND_TO_VENUE_NAME: Record<string, string> = {
  // USA
  Atlanta: 'Mercedes-Benz Stadium',
  'Boston (Foxborough)': 'Gillette Stadium',
  'Dallas (Arlington)': 'AT&T Stadium',
  Houston: 'NRG Stadium',
  'Kansas City': 'Arrowhead Stadium',
  'Los Angeles (Inglewood)': 'SoFi Stadium',
  'Miami (Miami Gardens)': 'Hard Rock Stadium',
  'New York/New Jersey (East Rutherford)': 'MetLife Stadium',
  Philadelphia: 'Lincoln Financial Field',
  'San Francisco Bay Area (Santa Clara)': "Levi's Stadium",
  Seattle: 'Lumen Field',
  // Canada
  Toronto: 'BMO Field',
  Vancouver: 'BC Place',
  // Mexico
  Guadalajara: 'Estadio Akron',
  'Mexico City': 'Estadio Azteca',
  'Monterrey (Guadalupe)': 'Estadio BBVA',
};

// Maps openfootball's knockout round names to api-football's nomenclature
// so the `round` column stays consistent between group and knockout rows.
export const ROUND_NAME_BY_OPENFOOTBALL: Record<string, string> = {
  'Round of 32': 'Round of 32',
  'Round of 16': 'Round of 16',
  'Quarter-final': 'Quarter-finals',
  'Semi-final': 'Semi-finals',
  'Match for third place': '3rd Place Final',
  Final: 'Final',
};

// Keyed by api-football team.id. Fixes two duplicate-code cases that would
// otherwise break any UI that keys off country_code, plus normalises a
// handful of clearly non-standard codes the API returned.
export const COUNTRY_CODE_BY_API_TEAM_ID: Record<number, string> = {
  9: 'ESP', // Spain (API: SPA)
  12: 'JPN', // Japan (API: JAP)
  22: 'IRN', // Iran  (API: IRA — collides with Iraq)
  31: 'MAR', // Morocco (API: MOR)
  775: 'AUT', // Austria (API: AUS — collides with Australia)
  1113: 'BIH', // Bosnia & Herzegovina (API: BOS)
  1118: 'NED', // Netherlands (API: NET)
  1501: 'CIV', // Ivory Coast (API: IVO)
  1508: 'COD', // Congo DR (API: CON)
  1531: 'RSA', // South Africa (API: SOU)
  1533: 'CPV', // Cape Verde (API: CAP)
  1567: 'IRQ', // Iraq (API: IRA — collides with Iran)
  4673: 'NZL', // New Zealand (API: ZEA)
};

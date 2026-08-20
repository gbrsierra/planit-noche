/**
 * High-Precision Astronomical Calculation Engine for Astrophotography & Milky Way Planning
 */

const PI = Math.PI;
const RAD = PI / 180;
const DEG = 180 / PI;

// Galactic Center equatorial coordinates (J2000)
// Right Ascension: 17h 45m 40.04s => 266.41683 degrees
const GC_RA = (17 + 45 / 60 + 40.04 / 3600) * 15 * RAD;
// Declination: -29° 00' 28.1"
const GC_DEC = (-29 - (0 / 60) - (28.1 / 3600)) * RAD;

/**
 * Days since J2000.0 epoch (2000-01-01 12:00:00 UTC)
 */
export function toDays(date) {
  return (date.getTime() / 86400000) - 10957.5;
}

/**
 * Greenwich Mean Sidereal Time (GMST) in radians
 */
export function gmst(date) {
  const d = toDays(date);
  let gmstDeg = (280.46061837 + 360.98564736629 * d) % 360;
  if (gmstDeg < 0) gmstDeg += 360;
  return gmstDeg * RAD;
}

/**
 * Local Sidereal Time (LST) in radians
 */
export function lst(date, lng) {
  let l = (gmst(date) + lng * RAD) % (2 * PI);
  if (l < 0) l += 2 * PI;
  return l;
}

/**
 * Convert Equatorial coordinates (RA, Dec) to Horizontal coordinates (Altitude, Azimuth)
 * Azimuth is measured from North (0°) clockwise through East (90°), South (180°), West (270°).
 */
export function equatorialToHorizontal(ra, dec, latRad, lstRad) {
  const ha = lstRad - ra; // Hour Angle
  const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const y = -Math.cos(dec) * Math.sin(ha);
  const x = Math.sin(dec) * Math.cos(latRad) - Math.cos(dec) * Math.sin(latRad) * Math.cos(ha);
  let az = Math.atan2(y, x);
  if (az < 0) az += 2 * PI;

  return { altitude: alt, azimuth: az };
}

/**
 * Sun Position (Altitude & Azimuth in degrees)
 */
export function getSunPosition(date, lat, lng) {
  const d = toDays(date);
  const L = (280.460 + 0.9856474 * d) * RAD;
  const g = (357.528 + 0.9856003 * d) * RAD;
  const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * d) * RAD;

  const sinDec = Math.sin(epsilon) * Math.sin(lambda);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));

  const latRad = lat * RAD;
  const lstRad = lst(date, lng);
  const pos = equatorialToHorizontal(ra, dec, latRad, lstRad);

  return {
    altitude: pos.altitude * DEG,
    azimuth: pos.azimuth * DEG,
    altitudeRad: pos.altitude
  };
}

/**
 * Moon Position (Altitude & Azimuth in degrees)
 */
export function getMoonPosition(date, lat, lng) {
  const d = toDays(date);
  const L = (218.316 + 13.176396 * d) * RAD;
  const M = (134.963 + 13.064993 * d) * RAD;
  const F = (93.272 + 13.229350 * d) * RAD;

  const lambda = L + 6.289 * RAD * Math.sin(M);
  const beta = 5.128 * RAD * Math.sin(F);
  const epsilon = 23.439 * RAD;

  const sinDec = Math.sin(beta) * Math.cos(epsilon) + Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const y = Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon);
  const x = Math.cos(lambda);
  const ra = Math.atan2(y, x);

  const latRad = lat * RAD;
  const lstRad = lst(date, lng);
  const pos = equatorialToHorizontal(ra, dec, latRad, lstRad);

  return {
    altitude: pos.altitude * DEG,
    azimuth: pos.azimuth * DEG,
    altitudeRad: pos.altitude
  };
}

/**
 * Moon Phase & Illumination fraction
 */
export function getMoonIllumination(date) {
  const d = toDays(date);
  const sL = (280.460 + 0.9856474 * d) * RAD;
  const mL = (218.316 + 13.176396 * d) * RAD;
  const phi = mL - sL;
  const fraction = (1 - Math.cos(phi)) / 2;

  let phase = ((phi / (2 * PI)) % 1 + 1) % 1;

  let phaseName = 'Luna Nueva';
  let phaseIcon = '🌑';
  if (phase > 0.03 && phase < 0.22) { phaseName = 'Luna Creciente'; phaseIcon = '🌒'; }
  else if (phase >= 0.22 && phase <= 0.28) { phaseName = 'Cuarto Creciente'; phaseIcon = '🌓'; }
  else if (phase > 0.28 && phase < 0.47) { phaseName = 'Gibosa Creciente'; phaseIcon = '🌔'; }
  else if (phase >= 0.47 && phase <= 0.53) { phaseName = 'Luna Llena'; phaseIcon = '🌕'; }
  else if (phase > 0.53 && phase < 0.72) { phaseName = 'Gibosa Menguante'; phaseIcon = '🌖'; }
  else if (phase >= 0.72 && phase <= 0.78) { phaseName = 'Cuarto Menguante'; phaseIcon = '🌗'; }
  else if (phase > 0.78 && phase < 0.97) { phaseName = 'Luna Menguante'; phaseIcon = '🌘'; }

  return {
    fraction: Math.round(fraction * 100),
    phaseValue: phase,
    phaseName,
    phaseIcon
  };
}

/**
 * Galactic Center Position (Altitude & Azimuth in degrees)
 */
export function getGalacticCenterPosition(date, lat, lng) {
  const latRad = lat * RAD;
  const lstRad = lst(date, lng);
  const pos = equatorialToHorizontal(GC_RA, GC_DEC, latRad, lstRad);

  return {
    altitude: pos.altitude * DEG,
    azimuth: pos.azimuth * DEG,
    altitudeRad: pos.altitude
  };
}

/**
 * Analyze a specific night starting from sunset of date until sunrise of date+1
 */
export function analyzeNight(dateObj, lat, lng) {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  // Local noon of current day to local noon of next day
  const startNight = new Date(year, month, day, 12, 0, 0, 0);
  const endNight = new Date(year, month, day + 1, 12, 0, 0, 0);

  const stepMs = 5 * 60 * 1000; // 5 min interval
  const samples = [];

  let hasTotalDarkness = false;
  let hasGalacticCenter = false;
  let totalDarknessMinutes = 0;

  let gcMaxAltInDarkness = -90;
  let gcMaxAltTime = null;
  let gcMaxAzInDarkness = 0;

  let sunsetTime = null;
  let sunriseTime = null;
  let astroDuskTime = null;
  let astroDawnTime = null;
  let moonriseTime = null;
  let moonsetTime = null;

  let prevSunAlt = null;
  let prevMoonAlt = null;

  const totalDarknessIntervals = [];
  let currentDarknessInterval = null;

  const gcDarknessIntervals = [];
  let currentGcInterval = null;

  for (let t = startNight.getTime(); t <= endNight.getTime(); t += stepMs) {
    const curDate = new Date(t);
    const sun = getSunPosition(curDate, lat, lng);
    const moon = getMoonPosition(curDate, lat, lng);
    const gc = getGalacticCenterPosition(curDate, lat, lng);

    samples.push({
      time: curDate,
      sunAlt: sun.altitude,
      sunAz: sun.azimuth,
      moonAlt: moon.altitude,
      moonAz: moon.azimuth,
      gcAlt: gc.altitude,
      gcAz: gc.azimuth
    });

    const isAfternoon = curDate.getDate() === day && curDate.getHours() >= 12;
    const isNextMorning = curDate.getDate() !== day || curDate.getHours() < 12;

    // Detect sunset / sunrise (Sun crossing 0°)
    if (prevSunAlt !== null) {
      if (prevSunAlt >= 0 && sun.altitude < 0 && !sunsetTime && isAfternoon) {
        sunsetTime = curDate;
      }
      if (prevSunAlt < 0 && sun.altitude >= 0 && !sunriseTime && isNextMorning) {
        sunriseTime = curDate;
      }

      // Astro dusk / dawn (Sun crossing -18°)
      if (prevSunAlt >= -18 && sun.altitude < -18 && !astroDuskTime && isAfternoon) {
        astroDuskTime = curDate;
      }
      if (prevSunAlt < -18 && sun.altitude >= -18 && !astroDawnTime && isNextMorning) {
        astroDawnTime = curDate;
      }

      // Moonrise / Moonset (Moon crossing 0°)
      if (prevMoonAlt < 0 && moon.altitude >= 0 && !moonriseTime) {
        moonriseTime = curDate;
      }
      if (prevMoonAlt >= 0 && moon.altitude < 0 && !moonsetTime) {
        moonsetTime = curDate;
      }
    }

    prevSunAlt = sun.altitude;
    prevMoonAlt = moon.altitude;

    // Criteria:
    // 1. Total darkness: Sun <= -18° AND Moon <= 0°
    const isTotalDarkness = (sun.altitude <= -18) && (moon.altitude <= 0);
    // 2. Galactic Center visible: GC altitude > 0°
    const isGcVisible = gc.altitude > 0;

    if (isTotalDarkness) {
      hasTotalDarkness = true;
      totalDarknessMinutes += 5;

      if (!currentDarknessInterval) {
        currentDarknessInterval = { start: curDate, end: curDate };
      } else {
        currentDarknessInterval.end = curDate;
      }

      if (isGcVisible) {
        hasGalacticCenter = true;
        if (!currentGcInterval) {
          currentGcInterval = { start: curDate, end: curDate };
        } else {
          currentGcInterval.end = curDate;
        }

        if (gc.altitude > gcMaxAltInDarkness) {
          gcMaxAltInDarkness = gc.altitude;
          gcMaxAltTime = curDate;
          gcMaxAzInDarkness = gc.azimuth;
        }
      } else {
        if (currentGcInterval) {
          gcDarknessIntervals.push(currentGcInterval);
          currentGcInterval = null;
        }
      }
    } else {
      if (currentDarknessInterval) {
        totalDarknessIntervals.push(currentDarknessInterval);
        currentDarknessInterval = null;
      }
      if (currentGcInterval) {
        gcDarknessIntervals.push(currentGcInterval);
        currentGcInterval = null;
      }
    }
  }

  if (currentDarknessInterval) totalDarknessIntervals.push(currentDarknessInterval);
  if (currentGcInterval) gcDarknessIntervals.push(currentGcInterval);

  const moonIllum = getMoonIllumination(new Date(year, month, day, 22, 0, 0));

  return {
    date: dateObj,
    hasTotalDarkness,
    hasGalacticCenter,
    totalDarknessMinutes,
    totalDarknessIntervals,
    gcDarknessIntervals,
    gcMaxAltInDarkness: gcMaxAltInDarkness > -90 ? gcMaxAltInDarkness : null,
    gcMaxAltTime,
    gcMaxAzInDarkness,
    sunsetTime,
    sunriseTime,
    astroDuskTime,
    astroDawnTime,
    moonriseTime,
    moonsetTime,
    moonIllum,
    samples
  };
}

/**
 * Format time as HH:MM
 */
export function formatTime(date) {
  if (!date) return '--:--';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Format duration in hours and minutes
 */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Convert azimuth degrees into cardinal direction
 */
export function getAzimuthDirection(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

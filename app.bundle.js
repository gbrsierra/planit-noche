/**
 * Planit Noche - Standalone Single-File Bundle
 * Multi-Panel Application with Global Cross-Navigation:
 *   Panel 1: Plan (Map + Calendar)
 *   Panel 2: Details (Night Ephemeris & Timeline)
 *   Panel 3: NPF (Spot Stars Pinpoint Calculator)
 *   Panel 4: Hyperfocal (Hyperfocal Distance Calculator)
 *   Panel 5: Exposure (Exposure Calculator & EV Guide)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. ASTRONOMY ENGINE
  // =========================================================================
  const PI = Math.PI;
  const RAD = PI / 180;
  const DEG = 180 / PI;

  const GC_RA = (17 + 45 / 60 + 40.04 / 3600) * 15 * RAD;
  const GC_DEC = (-29 - 0 / 60 - 28.1 / 3600) * RAD;

  function toDays(date) {
    return (date.getTime() / 86400000) - 10957.5;
  }

  function gmst(date) {
    const d = toDays(date);
    let gmstDeg = (280.46061837 + 360.98564736629 * d) % 360;
    if (gmstDeg < 0) gmstDeg += 360;
    return gmstDeg * RAD;
  }

  function lst(date, lng) {
    let l = (gmst(date) + lng * RAD) % (2 * PI);
    if (l < 0) l += 2 * PI;
    return l;
  }

  function equatorialToHorizontal(ra, dec, latRad, lstRad) {
    const ha = lstRad - ra;
    const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

    const y = -Math.cos(dec) * Math.sin(ha);
    const x = Math.sin(dec) * Math.cos(latRad) - Math.cos(dec) * Math.sin(latRad) * Math.cos(ha);
    let az = Math.atan2(y, x);
    if (az < 0) az += 2 * PI;

    return { altitude: alt, azimuth: az };
  }

  function getSunPosition(date, lat, lng) {
    const d = toDays(date);
    const L = (280.460 + 0.9856474 * d) * RAD;
    const g = (357.528 + 0.9856003 * d) * RAD;
    const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    const epsilon = 23.439 * RAD;

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

  function getMoonPosition(date, lat, lng) {
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

  function getMoonIllumination(date) {
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

  function getGalacticCenterPosition(date, lat, lng) {
    const latRad = lat * RAD;
    const lstRad = lst(date, lng);
    const pos = equatorialToHorizontal(GC_RA, GC_DEC, latRad, lstRad);

    return {
      altitude: pos.altitude * DEG,
      azimuth: pos.azimuth * DEG,
      altitudeRad: pos.altitude
    };
  }

  function analyzeNight(dateObj, lat, lng) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    const startNight = new Date(year, month, day, 12, 0, 0, 0);
    const endNight = new Date(year, month, day + 1, 12, 0, 0, 0);

    const stepMs = 5 * 60 * 1000;
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

      if (prevSunAlt !== null) {
        if (prevSunAlt >= 0 && sun.altitude < 0 && !sunsetTime && isAfternoon) {
          sunsetTime = curDate;
        }
        if (prevSunAlt < 0 && sun.altitude >= 0 && !sunriseTime && isNextMorning) {
          sunriseTime = curDate;
        }
        if (prevSunAlt >= -18 && sun.altitude < -18 && !astroDuskTime && isAfternoon) {
          astroDuskTime = curDate;
        }
        if (prevSunAlt < -18 && sun.altitude >= -18 && !astroDawnTime && isNextMorning) {
          astroDawnTime = curDate;
        }
        if (prevMoonAlt < 0 && moon.altitude >= 0 && !moonriseTime) {
          moonriseTime = curDate;
        }
        if (prevMoonAlt >= 0 && moon.altitude < 0 && !moonsetTime) {
          moonsetTime = curDate;
        }
      }

      prevSunAlt = sun.altitude;
      prevMoonAlt = moon.altitude;

      const isTotalDarkness = (sun.altitude <= -18) && (moon.altitude <= 0);
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

  function formatTime(date) {
    if (!date) return '--:--';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function getAzimuthDirection(deg) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    const index = Math.round((deg % 360) / 22.5) % 16;
    return directions[index];
  }

  // =========================================================================
  // 2. MAP CONTROLLER
  // =========================================================================
  let mapInstance = null;
  let markerInstance = null;
  let locationChangeHandler = null;

  const redPinIcon = typeof L !== 'undefined' ? L.divIcon({
    className: 'custom-pin-container',
    html: `
      <div class="pin-ground-shadow"></div>
      <div class="pin-pulse"></div>
      <div class="pin-marker">
        <svg viewBox="0 0 40 52" width="40" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ppBallGrad" cx="38%" cy="28%" r="62%">
              <stop offset="0%" stop-color="#ff6b7a"/>
              <stop offset="45%" stop-color="#e8193c"/>
              <stop offset="100%" stop-color="#8b0f22"/>
            </radialGradient>
            <filter id="ppShadow" x="-25%" y="-15%" width="150%" height="145%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.5"/>
            </filter>
          </defs>
          <g filter="url(#ppShadow)">
            <!-- Pin balloon body: true circle top + narrow tail -->
            <circle cx="20" cy="18" r="16" fill="url(#ppBallGrad)"/>
            <!-- Tail (teardrop point at bottom) -->
            <polygon points="20,48 12,28 28,28" fill="#c01230"/>
            <!-- Overlap seam cover to merge tail into body smoothly -->
            <ellipse cx="20" cy="28" rx="8" ry="3.5" fill="url(#ppBallGrad)"/>
            <!-- White gloss highlight (top-left sphere feel) -->
            <ellipse cx="14.5" cy="12.5" rx="5.5" ry="4" fill="rgba(255,255,255,0.22)" transform="rotate(-20 14.5 12.5)"/>
            <!-- White ring inner circle -->
            <circle cx="20" cy="18" r="9.5" fill="white"/>
            <!-- Red center bull dot -->
            <circle cx="20" cy="18" r="4.5" fill="#e8193c"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [40, 52],
    iconAnchor: [20, 51],
    popupAnchor: [0, -50]
  }) : null;

  let currentMapType = 'streets';
  let currentBaseLayer = null;
  let labelsOverlayLayer = null;
  let isAzimuthVisible = true;
  let isLabelsVisible = true;

  function initMap(containerId, initialLat, initialLng, onLocationChange) {
    locationChangeHandler = onLocationChange;

    if (typeof L === 'undefined') {
      console.error('Leaflet library is not loaded');
      return null;
    }

    mapInstance = L.map(containerId, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    const MAP_LAYERS = {
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap',
        subdomains: 'abc',
        maxZoom: 17
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }),
      streets: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }),
      nightlights: L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
        attribution: 'Imagery &copy; NASA Earth Observatory',
        maxZoom: 14,
        maxNativeZoom: 8
      })
    };

    labelsOverlayLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Labels &copy; Esri',
      maxZoom: 19
    });

    // Read stored map type preference
    try {
      const saved = localStorage.getItem('planit_map_type');
      if (saved && MAP_LAYERS[saved]) currentMapType = saved;
    } catch (e) {}

    currentBaseLayer = MAP_LAYERS[currentMapType] || MAP_LAYERS.streets;
    currentBaseLayer.addTo(mapInstance);

    if (isLabelsVisible) {
      labelsOverlayLayer.addTo(mapInstance);
    }

    markerInstance = L.marker([initialLat, initialLng], {
      icon: redPinIcon,
      draggable: true
    }).addTo(mapInstance);

    markerInstance.on('dragend', () => {
      const pos = markerInstance.getLatLng();
      if (locationChangeHandler) locationChangeHandler(pos.lat, pos.lng);
    });

    mapInstance.on('click', (e) => {
      markerInstance.setLatLng(e.latlng);
      if (locationChangeHandler) locationChangeHandler(e.latlng.lat, e.latlng.lng);
    });

    // Wire Layer Picker Modal & Controls
    const mapLayerPickerBtn = document.getElementById('mapLayerPickerBtn');
    const mapLayersModal = document.getElementById('mapLayersModal');
    const closeLayersModalBtn = document.getElementById('closeLayersModalBtn');
    const layerCardBtns = document.querySelectorAll('#mapLayersGrid .layer-card-btn');
    const toggleAzimuthCheckbox = document.getElementById('toggleAzimuthLines');
    const toggleLabelsCheckbox = document.getElementById('toggleLabelsOverlay');

    function closeMapLayersModal() {
      if (mapLayersModal) mapLayersModal.classList.add('hidden');
      if (mapLayerPickerBtn) mapLayerPickerBtn.classList.remove('active');
    }

    function toggleMapLayersModal(e) {
      if (e) e.stopPropagation();
      if (!mapLayersModal) return;
      const isHidden = mapLayersModal.classList.toggle('hidden');
      if (mapLayerPickerBtn) {
        mapLayerPickerBtn.classList.toggle('active', !isHidden);
      }
    }

    if (mapLayerPickerBtn) {
      mapLayerPickerBtn.addEventListener('click', toggleMapLayersModal);
    }

    if (closeLayersModalBtn) {
      closeLayersModalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMapLayersModal();
      });
    }

    document.addEventListener('click', (e) => {
      if (mapLayersModal && !mapLayersModal.contains(e.target) && mapLayerPickerBtn && !mapLayerPickerBtn.contains(e.target)) {
        closeMapLayersModal();
      }
    });

    function switchLayer(type) {
      const newLayer = MAP_LAYERS[type];
      if (!newLayer) return;

      if (currentBaseLayer && mapInstance.hasLayer(currentBaseLayer)) {
        mapInstance.removeLayer(currentBaseLayer);
      }

      newLayer.addTo(mapInstance);
      currentBaseLayer = newLayer;
      currentMapType = type;

      if (isLabelsVisible && labelsOverlayLayer) {
        if (!mapInstance.hasLayer(labelsOverlayLayer)) {
          labelsOverlayLayer.addTo(mapInstance);
        }
        labelsOverlayLayer.bringToFront();
      }

      if (markerInstance) markerInstance.bringToFront();

      layerCardBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-map-type') === type);
      });

      try {
        localStorage.setItem('planit_map_type', type);
      } catch (e) {}
    }

    // Set initial active button
    layerCardBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-map-type') === currentMapType);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-map-type');
        switchLayer(type);
      });
    });

    // Azimuth toggle
    if (toggleAzimuthCheckbox) {
      toggleAzimuthCheckbox.checked = isAzimuthVisible;
      toggleAzimuthCheckbox.addEventListener('change', (e) => {
        isAzimuthVisible = e.target.checked;
        if (azimuthLinesLayer) {
          if (isAzimuthVisible) {
            azimuthLinesLayer.addTo(mapInstance);
          } else {
            mapInstance.removeLayer(azimuthLinesLayer);
          }
        }
      });
    }

    // Labels overlay toggle
    if (toggleLabelsCheckbox) {
      toggleLabelsCheckbox.checked = isLabelsVisible;
      toggleLabelsCheckbox.addEventListener('change', (e) => {
        isLabelsVisible = e.target.checked;
        if (labelsOverlayLayer) {
          if (isLabelsVisible) {
            labelsOverlayLayer.addTo(mapInstance);
            labelsOverlayLayer.bringToFront();
          } else {
            mapInstance.removeLayer(labelsOverlayLayer);
          }
        }
      });
    }

    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 250);

    return mapInstance;
  }

  function setMapPosition(lat, lng, zoom) {
    if (!mapInstance || !markerInstance) return;
    const numericLat = parseFloat(lat);
    const numericLng = parseFloat(lng);
    if (isNaN(numericLat) || isNaN(numericLng)) return;

    const latlng = L.latLng(numericLat, numericLng);
    markerInstance.setLatLng(latlng);

    if (zoom) {
      mapInstance.flyTo(latlng, zoom, { duration: 1.0 });
    } else {
      mapInstance.panTo(latlng);
    }

    if (locationChangeHandler) {
      locationChangeHandler(numericLat, numericLng);
    }
  }

  // Holds all currently drawn azimuth polylines & labels
  let azimuthLinesLayer = null;

  /**
   * Draws PhotoPills-style sun & moon rise/set azimuth lines radiating from the pin.
   * @param {number} lat  - latitude of the pin
   * @param {number} lng  - longitude of the pin
   * @param {Date}   date - date to compute azimuths for (defaults to today)
   */
  function updateAzimuthLines(lat, lng, date) {
    if (!mapInstance) return;
    const refDate = date || new Date();

    // Clear previous lines
    if (azimuthLinesLayer) {
      azimuthLinesLayer.clearLayers();
    } else {
      azimuthLinesLayer = L.layerGroup();
    }

    if (!isAzimuthVisible) {
      if (mapInstance.hasLayer(azimuthLinesLayer)) {
        mapInstance.removeLayer(azimuthLinesLayer);
      }
      return;
    }

    if (!mapInstance.hasLayer(azimuthLinesLayer)) {
      azimuthLinesLayer.addTo(mapInstance);
    }

    // Helper: convert azimuth (0=N, clockwise degrees) + distance km → LatLng endpoint
    function destFromAzimuth(originLat, originLng, azDeg, distKm) {
      const R = 6371;
      const az = azDeg * (Math.PI / 180);
      const d = distKm / R;
      const lat1 = originLat * (Math.PI / 180);
      const lng1 = originLng * (Math.PI / 180);
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(az));
      const lng2 = lng1 + Math.atan2(Math.sin(az) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
      return L.latLng(lat2 * (180 / Math.PI), lng2 * (180 / Math.PI));
    }

    // Line length in km (long enough to cross the viewport)
    const LINE_KM = 40;

    // Find azimuths at key solar/lunar events using 1-minute sampling around sunrise/set
    const year  = refDate.getFullYear();
    const month = refDate.getMonth();
    const day   = refDate.getDate();

    function findEventAzimuth(fromHour, toHour, bodyFn, risingWhen) {
      // risingWhen: 'rising' | 'setting'
      let prevAlt = null;
      let bestAz  = null;
      const start = new Date(year, month, day, fromHour, 0, 0);
      const end   = new Date(year, month, day, toHour, 0, 0);
      for (let t = start.getTime(); t <= end.getTime(); t += 60_000) {
        const pos = bodyFn(new Date(t), lat, lng);
        if (prevAlt !== null) {
          if (risingWhen === 'rising'  && prevAlt < 0 && pos.altitude >= 0) { bestAz = pos.azimuth; break; }
          if (risingWhen === 'setting' && prevAlt >= 0 && pos.altitude < 0) { bestAz = pos.azimuth; break; }
        }
        prevAlt = pos.altitude;
      }
      return bestAz;
    }

    const sunriseAz  = findEventAzimuth(3, 11,  getSunPosition,  'rising');
    const sunsetAz   = findEventAzimuth(14, 23, getSunPosition,  'setting');
    const moonriseAz = findEventAzimuth(0, 23,  getMoonPosition, 'rising');
    const moonsetAz  = findEventAzimuth(0, 23,  getMoonPosition, 'setting');

    const origin = [lat, lng];

    // --- Draw lines ---
    const lineConfig = [
      {
        azimuth: sunriseAz,
        color: '#f97316',     // orange – sunrise
        dashArray: null,
        weight: 2.5,
        label: '☀ Salida',
        labelColor: '#f97316'
      },
      {
        azimuth: sunsetAz,
        color: '#ef4444',     // red – sunset
        dashArray: null,
        weight: 2.5,
        label: '☀ Puesta',
        labelColor: '#ef4444'
      },
      {
        azimuth: moonriseAz,
        color: '#60a5fa',     // light blue – moonrise
        dashArray: '6 5',
        weight: 2.2,
        label: '🌙 Salida',
        labelColor: '#93c5fd'
      },
      {
        azimuth: moonsetAz,
        color: '#1d4ed8',     // dark blue – moonset
        dashArray: '6 5',
        weight: 2.2,
        label: '🌙 Puesta',
        labelColor: '#60a5fa'
      }
    ];

    lineConfig.forEach(({ azimuth, color, dashArray, weight, label, labelColor }) => {
      if (azimuth === null || azimuth === undefined) return;

      const endpoint = destFromAzimuth(lat, lng, azimuth, LINE_KM);

      // Line
      const poly = L.polyline([origin, endpoint], {
        color,
        weight,
        opacity: 0.85,
        dashArray,
        className: 'azimuth-line'
      });
      azimuthLinesLayer.addLayer(poly);

      // Small label marker 60% along the line
      const midEndpoint = destFromAzimuth(lat, lng, azimuth, LINE_KM * 0.6);
      const labelIcon = L.divIcon({
        className: '',
        html: `<div class="azimuth-label" style="color:${labelColor}">${label}<br><span class="azimuth-deg">${Math.round(azimuth)}°</span></div>`,
        iconAnchor: [26, 10]
      });
      const labelMarker = L.marker(midEndpoint, { icon: labelIcon, interactive: false });
      azimuthLinesLayer.addLayer(labelMarker);

      // Arrowhead tip at the end
      const arrowIcon = L.divIcon({
        className: '',
        html: `<div class="azimuth-arrow" style="background:${color};transform:rotate(${azimuth}deg)"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });
      const arrow = L.marker(endpoint, { icon: arrowIcon, interactive: false });
      azimuthLinesLayer.addLayer(arrow);
    });
  }


  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`);
      if (!res.ok) throw new Error('Geocode failed');
      const data = await res.json();
      let name = 'Ubicación seleccionada';
      if (data.address) {
        name = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || data.address.state || data.display_name.split(',')[0];
      }
      return { name, displayName: data.display_name };
    } catch (e) {
      return { name: 'Ubicación seleccionada', displayName: '' };
    }
  }

  async function searchLocations(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=6`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      return data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
    } catch (e) {
      return [];
    }
  }

  // =========================================================================
  // 3. CALENDAR
  // =========================================================================
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  class AstroCalendar {
    constructor(container, options = {}) {
      this.container = container;
      this.selectedDate = options.initialDate || new Date();
      this.viewYear = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
      this.lat = options.lat || 41.6148;
      this.lng = options.lng || 0.6268;
      this.onDateSelect = options.onDateSelect || (() => {});
      this.cache = new Map();
      this.render();
    }

    setLocation(lat, lng) {
      this.lat = lat;
      this.lng = lng;
      this.cache.clear();
      this.render();
    }

    getNightInfo(date) {
      const key = `${this.lat.toFixed(3)}_${this.lng.toFixed(3)}_${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (this.cache.has(key)) return this.cache.get(key);
      const info = analyzeNight(date, this.lat, this.lng);
      this.cache.set(key, info);
      return info;
    }

    setSelectedDate(date, shouldOpenScreen = true) {
      this.selectedDate = new Date(date);
      this.viewYear = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
      this.render();
      if (shouldOpenScreen) {
        const info = this.getNightInfo(this.selectedDate);
        this.onDateSelect(this.selectedDate, info);
      }
    }

    prevMonth() {
      this.viewMonth--;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear--;
      }
      this.render();
    }

    nextMonth() {
      this.viewMonth++;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear++;
      }
      this.render();
    }

    goToToday() {
      const today = new Date();
      this.selectedDate = new Date(today);
      this.viewYear = today.getFullYear();
      this.viewMonth = today.getMonth();
      this.render();
    }

    render() {
      this.container.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'calendar-card';

      // Header
      const header = document.createElement('div');
      header.className = 'calendar-header';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'cal-nav-btn';
      prevBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
      prevBtn.onclick = () => this.prevMonth();

      const title = document.createElement('div');
      title.className = 'cal-title';
      title.textContent = `${MONTH_NAMES[this.viewMonth]} De ${this.viewYear}`;

      const rightGroup = document.createElement('div');
      rightGroup.className = 'cal-right-group';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'cal-nav-btn';
      nextBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      nextBtn.onclick = () => this.nextMonth();

      const todayBtn = document.createElement('button');
      todayBtn.className = 'cal-today-btn';
      todayBtn.textContent = 'HOY';
      todayBtn.onclick = () => this.goToToday();

      rightGroup.appendChild(nextBtn);
      rightGroup.appendChild(todayBtn);
      header.appendChild(prevBtn);
      header.appendChild(title);
      header.appendChild(rightGroup);
      card.appendChild(header);

      // Weekdays
      const weekdaysGrid = document.createElement('div');
      weekdaysGrid.className = 'calendar-weekdays';
      WEEKDAY_NAMES.forEach(day => {
        const col = document.createElement('div');
        col.className = 'cal-weekday';
        col.textContent = day;
        weekdaysGrid.appendChild(col);
      });
      card.appendChild(weekdaysGrid);

      // Days Grid
      const daysGrid = document.createElement('div');
      daysGrid.className = 'calendar-days';

      const firstDayOfMonth = new Date(this.viewYear, this.viewMonth, 1);
      let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

      const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const cell = document.createElement('div');
        cell.className = 'cal-day other-month';
        cell.innerHTML = `<span class="day-number">${dayNum}</span>`;
        daysGrid.appendChild(cell);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const thisDate = new Date(this.viewYear, this.viewMonth, d);
        const isSelected = this.selectedDate.getFullYear() === this.viewYear &&
                           this.selectedDate.getMonth() === this.viewMonth &&
                           this.selectedDate.getDate() === d;

        const nightInfo = this.getNightInfo(thisDate);

        const cell = document.createElement('div');
        cell.className = `cal-day current-month ${isSelected ? 'selected' : ''}`;

        const badge = document.createElement('div');
        badge.className = 'day-badge';

        const numSpan = document.createElement('span');
        numSpan.className = 'day-number';
        numSpan.textContent = d;
        badge.appendChild(numSpan);

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'day-dots';

        if (nightInfo.hasTotalDarkness) {
          const redDot = document.createElement('span');
          redDot.className = 'dot dot-red';
          redDot.title = 'Oscuridad total disponible';
          dotsContainer.appendChild(redDot);
        }

        if (nightInfo.hasGalacticCenter) {
          const greenDot = document.createElement('span');
          greenDot.className = 'dot dot-green';
          greenDot.title = 'Centro Galáctico visible';
          dotsContainer.appendChild(greenDot);
        }

        badge.appendChild(dotsContainer);
        cell.appendChild(badge);

        cell.onclick = () => {
          this.setSelectedDate(new Date(this.viewYear, this.viewMonth, d), true);
        };

        daysGrid.appendChild(cell);
      }

      const totalCells = startDayOfWeek + daysInMonth;
      const remainingCells = (totalCells % 7 === 0) ? 0 : (7 - (totalCells % 7));
      for (let d = 1; d <= remainingCells; d++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day other-month';
        cell.innerHTML = `<span class="day-number">${d}</span>`;
        daysGrid.appendChild(cell);
      }

      card.appendChild(daysGrid);

      // Legend
      const legend = document.createElement('div');
      legend.className = 'calendar-legend';
      legend.innerHTML = `
        <div class="legend-item">
          <span class="dot dot-red"></span>
          <span>Oscuridad Total (Sol &le; -18&deg; y Luna &le; 0&deg;)</span>
        </div>
        <div class="legend-item">
          <span class="dot dot-green"></span>
          <span>Centro Galáctico visible (&gt; 0&deg;)</span>
        </div>
      `;
      card.appendChild(legend);

      this.container.appendChild(card);
    }
  }

  // =========================================================================
  // 4. NIGHT DETAILS SCREEN & TIMELINE
  // =========================================================================
  function renderNightDetailsScreen(container, date, nightInfo) {
    if (!container || !nightInfo) return;

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const dateTitle = `${dayNames[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;

    let darknessStr = 'No hay oscuridad total';
    let darknessDurationStr = '';
    if (nightInfo.hasTotalDarkness && nightInfo.totalDarknessIntervals.length > 0) {
      darknessStr = nightInfo.totalDarknessIntervals
        .map(i => `${formatTime(i.start)} - ${formatTime(i.end)}`)
        .join(', ');
      darknessDurationStr = formatDuration(nightInfo.totalDarknessMinutes);
    }

    let gcStr = 'No visible en oscuridad total';
    let gcDurationStr = '';
    if (nightInfo.hasGalacticCenter && nightInfo.gcDarknessIntervals.length > 0) {
      gcStr = nightInfo.gcDarknessIntervals
        .map(i => `${formatTime(i.start)} - ${formatTime(i.end)}`)
        .join(', ');
      const totalGcMins = nightInfo.gcDarknessIntervals.reduce((acc, cur) => {
        return acc + Math.round((cur.end.getTime() - cur.start.getTime()) / 60000);
      }, 0);
      gcDurationStr = formatDuration(totalGcMins);
    }

    const gcMaxAlt = nightInfo.gcMaxAltInDarkness !== null ? `${nightInfo.gcMaxAltInDarkness.toFixed(1)}°` : '--';
    const gcMaxDir = nightInfo.gcMaxAltInDarkness !== null ? `${getAzimuthDirection(nightInfo.gcMaxAzInDarkness)} (${Math.round(nightInfo.gcMaxAzInDarkness)}°)` : '--';
    const gcMaxTimeStr = nightInfo.gcMaxAltTime ? formatTime(nightInfo.gcMaxAltTime) : '';

    container.innerHTML = `
      <div class="details-card">
        <div class="details-header">
          <div class="details-title-row">
            <div class="details-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </div>
            <div>
              <h2 class="details-title">${dateTitle}</h2>
              <p class="details-subtitle">Noche del ${date.getDate()} al amanecer del ${nextDate.getDate()} de ${monthNames[nextDate.getMonth()]}</p>
            </div>
          </div>
        </div>

        <div class="status-cards-grid">
          <div class="status-card ${nightInfo.hasTotalDarkness ? 'active-darkness' : ''}">
            <div class="status-card-header">
              <div class="status-tag-group">
                <span class="status-badge-dot red-pulse"></span>
                <span class="status-label">Oscuridad Total</span>
              </div>
              ${darknessDurationStr ? `<span class="duration-badge">${darknessDurationStr}</span>` : ''}
            </div>
            <div class="status-value">${darknessStr}</div>
            <div class="status-hint">Sol &le; -18&deg; y Luna &le; 0&deg; (cielo astronómico puro)</div>
          </div>

          <div class="status-card ${nightInfo.hasGalacticCenter ? 'active-gc' : ''}">
            <div class="status-card-header">
              <div class="status-tag-group">
                <span class="status-badge-dot green-pulse"></span>
                <span class="status-label">Centro Galáctico (Vía Láctea)</span>
              </div>
              ${gcDurationStr ? `<span class="duration-badge green">${gcDurationStr}</span>` : ''}
            </div>
            <div class="status-value">${gcStr}</div>
            ${nightInfo.hasGalacticCenter ? `
              <div class="gc-stats">
                <span>Elevación máx: <strong>${gcMaxAlt}</strong> (${gcMaxDir})</span>
                ${gcMaxTimeStr ? `<span>a las <strong>${gcMaxTimeStr}</strong></span>` : ''}
              </div>
            ` : `
              <div class="status-hint">El núcleo de la Vía Láctea no coincide con cielo oscuro esa noche.</div>
            `}
          </div>
        </div>

        <div class="ephemeris-grid">
          <div class="ephem-item">
            <div class="ephem-title">☀️ Sol</div>
            <div class="ephem-row"><span>Puesta de sol:</span><strong>${formatTime(nightInfo.sunsetTime)}</strong></div>
            <div class="ephem-row"><span>Noche astronómica (-18&deg;):</span><strong>${formatTime(nightInfo.astroDuskTime)}</strong></div>
            <div class="ephem-row"><span>Fin noche astronómica:</span><strong>${formatTime(nightInfo.astroDawnTime)}</strong></div>
            <div class="ephem-row"><span>Salida de sol:</span><strong>${formatTime(nightInfo.sunriseTime)}</strong></div>
          </div>

          <div class="ephem-item">
            <div class="ephem-title">${nightInfo.moonIllum.phaseIcon} Luna (${nightInfo.moonIllum.fraction}%)</div>
            <div class="ephem-row"><span>Fase:</span><strong>${nightInfo.moonIllum.phaseName}</strong></div>
            <div class="ephem-row"><span>Puesta de luna:</span><strong>${formatTime(nightInfo.moonsetTime)}</strong></div>
            <div class="ephem-row"><span>Salida de luna:</span><strong>${formatTime(nightInfo.moonriseTime)}</strong></div>
            <div class="ephem-row"><span>Iluminación:</span><strong>${nightInfo.moonIllum.fraction}%</strong></div>
          </div>
        </div>

        <div class="chart-container-box">
          <div class="chart-header">
            <div class="chart-title">Curvas de Elevación a lo largo de la Noche</div>
            <div class="chart-legend">
              <span class="chart-legend-item"><span class="legend-color-line sun-line"></span> Sol</span>
              <span class="chart-legend-item"><span class="legend-color-line moon-line"></span> Luna</span>
              <span class="chart-legend-item"><span class="legend-color-line gc-line"></span> Vía Láctea</span>
              <span class="chart-legend-item"><span class="legend-color-box dark-box"></span> Oscuridad Total</span>
            </div>
          </div>
          <div class="canvas-wrapper">
            <canvas id="nightTimelineCanvas"></canvas>
            <div id="chartTooltip" class="chart-tooltip hidden"></div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      drawTimelineChart(nightInfo.samples);
    }, 60);
  }

  function drawTimelineChart(samples) {
    const canvas = document.getElementById('nightTimelineCanvas');
    const tooltip = document.getElementById('chartTooltip');
    if (!canvas || !samples || samples.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = 220;
    const padLeft = 36;
    const padRight = 16;
    const padTop = 18;
    const padBottom = 26;

    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    const minAlt = -50;
    const maxAlt = 70;

    function getY(alt) {
      const clamped = Math.max(minAlt, Math.min(maxAlt, alt));
      return padTop + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
    }

    function getX(idx) {
      return padLeft + (idx / (samples.length - 1)) * plotW;
    }

    function renderBaseChart() {
      ctx.clearRect(0, 0, W, H);

      // Dark band backgrounds
      samples.forEach((s, i) => {
        const isDark = (s.sunAlt <= -18) && (s.moonAlt <= 0);
        const isGcDark = isDark && (s.gcAlt > 0);

        if (isDark) {
          const x1 = getX(i);
          const x2 = getX(Math.min(samples.length - 1, i + 1));
          ctx.fillStyle = isGcDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(59, 130, 246, 0.14)';
          ctx.fillRect(x1, padTop, x2 - x1 + 1, plotH);
        }
      });

      // Horizontal reference lines (0° horizon & -18° astronomical twilight)
      ctx.lineWidth = 1;
      const yHorizon = getY(0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, yHorizon);
      ctx.lineTo(W - padRight, yHorizon);
      ctx.stroke();

      const yTwilight = getY(-18);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.moveTo(padLeft, yTwilight);
      ctx.lineTo(W - padRight, yTwilight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('0°', padLeft - 4, yHorizon);
      ctx.fillText('-18°', padLeft - 4, yTwilight);
      ctx.fillText('30°', padLeft - 4, getY(30));
      ctx.fillText('60°', padLeft - 4, getY(60));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const hourStep = Math.max(1, Math.floor(samples.length / 8));
      for (let i = 0; i < samples.length; i += hourStep) {
        const s = samples[i];
        const x = getX(i);
        ctx.fillText(`${String(s.time.getHours()).padStart(2, '0')}:00`, x, H - padBottom + 6);
      }

      // Sun curve
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#F59E0B';
      ctx.beginPath();
      samples.forEach((s, i) => {
        const x = getX(i);
        const y = getY(s.sunAlt);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Moon curve
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38BDF8';
      ctx.beginPath();
      samples.forEach((s, i) => {
        const x = getX(i);
        const y = getY(s.moonAlt);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Galactic Center curve
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#10B981';
      ctx.beginPath();
      samples.forEach((s, i) => {
        const x = getX(i);
        const y = getY(s.gcAlt);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    renderBaseChart();

    function drawScrubber(sampleIdx) {
      renderBaseChart();
      if (sampleIdx === null || sampleIdx === undefined) return;
      const s = samples[sampleIdx];
      if (!s) return;

      const x = getX(sampleIdx);

      // Draw vertical cursor line
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, H - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw indicator points on curves
      function drawDot(y, color, glowColor) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      drawDot(getY(s.sunAlt), '#F59E0B', 'rgba(245, 158, 11, 0.8)');
      drawDot(getY(s.moonAlt), '#38BDF8', 'rgba(56, 189, 248, 0.8)');
      drawDot(getY(s.gcAlt), '#10B981', 'rgba(16, 185, 129, 0.8)');
      ctx.restore();
    }

    function updateTooltipAt(clientX) {
      const cRect = canvas.getBoundingClientRect();
      const posX = clientX - cRect.left;
      if (posX < padLeft || posX > W - padRight) {
        hideScrubber();
        return;
      }

      const ratio = Math.max(0, Math.min(1, (posX - padLeft) / plotW));
      const sampleIdx = Math.round(ratio * (samples.length - 1));
      const s = samples[sampleIdx];
      if (!s || !tooltip) return;

      drawScrubber(sampleIdx);

      // Determine darkness status badge
      const isDark = (s.sunAlt <= -18) && (s.moonAlt <= 0);
      let badgeClass = 'state-twilight';
      let badgeText = 'Crepúsculo';

      if (s.sunAlt > -0.833) {
        badgeClass = 'state-twilight';
        badgeText = 'Día';
      } else if (isDark && s.gcAlt > 0) {
        badgeClass = 'state-gc';
        badgeText = '🌌 Vía Láctea';
      } else if (isDark) {
        badgeClass = 'state-dark';
        badgeText = '🌑 Oscuridad';
      } else if (s.moonAlt > 0) {
        badgeClass = 'state-moon';
        badgeText = '🌗 Luna';
      }

      const timeStr = `${String(s.time.getHours()).padStart(2, '0')}:${String(s.time.getMinutes()).padStart(2, '0')}`;
      tooltip.innerHTML = `
        <div class="tooltip-time-header">
          <span class="tooltip-time">${timeStr}</span>
          <span class="tooltip-state-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-row-label"><span class="dot-sun"></span> Sol</span>
          <span class="tooltip-row-val">${s.sunAlt >= 0 ? '+' : ''}${s.sunAlt.toFixed(1)}°</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-row-label"><span class="dot-moon"></span> Luna</span>
          <span class="tooltip-row-val">${s.moonAlt >= 0 ? '+' : ''}${s.moonAlt.toFixed(1)}°</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-row-label"><span class="dot-gc"></span> Vía Láctea</span>
          <span class="tooltip-row-val">${s.gcAlt >= 0 ? '+' : ''}${s.gcAlt.toFixed(1)}°</span>
        </div>
      `;

      tooltip.classList.remove('hidden');

      // Fluid positioning: keep within canvas bounds
      const tooltipW = tooltip.offsetWidth || 150;
      let leftPos = posX - tooltipW / 2;
      if (leftPos < 8) leftPos = 8;
      if (leftPos + tooltipW > W - 8) leftPos = W - tooltipW - 8;

      tooltip.style.left = `${leftPos}px`;
      tooltip.style.top = '10px';
    }

    function hideScrubber() {
      renderBaseChart();
      if (tooltip) tooltip.classList.add('hidden');
    }

    function onPointerMove(e) {
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      updateTooltipAt(clientX);
    }

    canvas.onpointerdown = onPointerMove;
    canvas.onpointermove = onPointerMove;
    canvas.onpointerup = hideScrubber;
    canvas.onpointercancel = hideScrubber;
    canvas.onmouseleave = hideScrubber;

    canvas.ontouchstart = onPointerMove;
    canvas.ontouchmove = onPointerMove;
    canvas.ontouchend = hideScrubber;
    canvas.ontouchcancel = hideScrubber;
  }

  // =========================================================================
  // 5. STAR PINPOINT CALCULATOR (NPF & 500 RULE)
  // =========================================================================
  const SENSOR_PRESETS = {
    'full-frame': { name: 'Full Frame (35mm)', width: 36.0, height: 24.0, crop: 1.0 },
    'apsc-sony': { name: 'APS-C (Sony / Nikon / Fuji)', width: 23.5, height: 15.6, crop: 1.52 },
    'apsc-canon': { name: 'APS-C (Canon)', width: 22.2, height: 14.8, crop: 1.61 },
    'm43': { name: 'Micro 4/3 (Olympus / Panasonic)', width: 17.3, height: 13.0, crop: 2.0 },
    'medium-format': { name: 'Formato Medio (44x33mm)', width: 43.8, height: 32.9, crop: 0.79 },
    '1inch': { name: 'Sensor 1"', width: 13.2, height: 8.8, crop: 2.7 }
  };

  function initStarCalculator() {
    const sensorSelect = document.getElementById('sensorTypeSelect');
    const mpInput = document.getElementById('mpInput');
    const focalSlider = document.getElementById('focalSlider');
    const focalNumberInput = document.getElementById('focalNumberInput');
    const focalDisplay = document.getElementById('focalDisplay');
    const apertureSlider = document.getElementById('apertureSlider');
    const apertureNumberInput = document.getElementById('apertureNumberInput');
    const apertureDisplay = document.getElementById('apertureDisplay');
    const npfResultValue = document.getElementById('npfResultValue');
    const rule500Value = document.getElementById('rule500Value');

    if (!sensorSelect || !npfResultValue) return;

    function calculateNPF() {
      const sensorKey = sensorSelect.value;
      const sensor = SENSOR_PRESETS[sensorKey] || SENSOR_PRESETS['full-frame'];

      let mp = parseFloat(mpInput.value) || 26;
      if (mp < 1) mp = 1;

      let focal = parseFloat(focalSlider.value) || 13;
      if (focal < 1) focal = 1;

      let aperture = parseFloat(apertureSlider.value) || 2.8;
      if (aperture < 0.5) aperture = 0.5;

      if (focalDisplay) focalDisplay.textContent = Math.round(focal);
      if (apertureDisplay) apertureDisplay.textContent = aperture.toFixed(1).replace('.0', '');

      const sensorArea = sensor.width * sensor.height;
      const pixelPitchUm = Math.sqrt(sensorArea / (mp * 1e6)) * 1000;

      const npfSeconds = (35 * aperture + 30 * pixelPitchUm) / focal;
      const rule500Seconds = 500 / (focal * sensor.crop);

      npfResultValue.textContent = npfSeconds.toFixed(2);
      if (rule500Value) rule500Value.textContent = `${rule500Seconds.toFixed(1)}s`;
    }

    sensorSelect.addEventListener('change', calculateNPF);
    mpInput.addEventListener('input', calculateNPF);

    focalSlider.addEventListener('input', () => {
      focalNumberInput.value = focalSlider.value;
      calculateNPF();
    });

    focalNumberInput.addEventListener('input', () => {
      const val = parseFloat(focalNumberInput.value);
      if (!isNaN(val) && val >= 8 && val <= 600) {
        focalSlider.value = val;
      }
      calculateNPF();
    });

    apertureSlider.addEventListener('input', () => {
      apertureNumberInput.value = parseFloat(apertureSlider.value).toFixed(1).replace('.', ',');
      calculateNPF();
    });

    apertureNumberInput.addEventListener('input', () => {
      const cleanVal = apertureNumberInput.value.replace(',', '.');
      const val = parseFloat(cleanVal);
      if (!isNaN(val) && val >= 0.5 && val <= 22) {
        apertureSlider.value = val;
      }
      calculateNPF();
    });

    calculateNPF();
  }

  // =========================================================================
  // 6. HYPERFOCAL DISTANCE CALCULATOR
  // =========================================================================
  function initHyperfocalCalculator() {
    const sensorSelect = document.getElementById('hyperSensorSelect');
    const focalSlider = document.getElementById('hyperFocalSlider');
    const focalNumberInput = document.getElementById('hyperFocalNumberInput');
    const focalDisplay = document.getElementById('hyperFocalDisplay');
    const apertureSlider = document.getElementById('hyperApertureSlider');
    const apertureNumberInput = document.getElementById('hyperApertureNumberInput');
    const apertureDisplay = document.getElementById('hyperApertureDisplay');

    const topFocusDistanceText = document.getElementById('topFocusDistanceText');
    const hyperDistanceValue = document.getElementById('hyperDistanceValue');
    const nearLimitBadge = document.getElementById('nearLimitBadge');
    const nearLimitText = document.getElementById('nearLimitText');

    if (!sensorSelect || !hyperDistanceValue) return;

    function calculateHyperfocal() {
      const coc = parseFloat(sensorSelect.value) || 0.030;

      let focal = parseFloat(focalSlider.value) || 35;
      if (focal < 1) focal = 1;

      let aperture = parseFloat(apertureSlider.value) || 1.4;
      if (aperture < 0.5) aperture = 0.5;

      if (focalDisplay) focalDisplay.textContent = Math.round(focal);
      if (apertureDisplay) apertureDisplay.textContent = aperture.toFixed(1).replace('.0', '');

      const H_mm = (Math.pow(focal, 2) / (aperture * coc)) + focal;
      const H_meters = H_mm / 1000;
      const nearLimit_meters = H_meters / 2;

      const formattedH = H_meters >= 10 ? H_meters.toFixed(1) : H_meters.toFixed(2);
      const formattedNear = nearLimit_meters >= 10 ? nearLimit_meters.toFixed(1) : nearLimit_meters.toFixed(2);

      if (topFocusDistanceText) topFocusDistanceText.textContent = `${formattedH} METROS`;
      hyperDistanceValue.textContent = formattedH;
      if (nearLimitBadge) nearLimitBadge.textContent = `${formattedNear}m`;
      if (nearLimitText) nearLimitText.textContent = `${formattedNear}m`;
    }

    sensorSelect.addEventListener('change', calculateHyperfocal);

    focalSlider.addEventListener('input', () => {
      focalNumberInput.value = focalSlider.value;
      calculateHyperfocal();
    });

    focalNumberInput.addEventListener('input', () => {
      const val = parseFloat(focalNumberInput.value);
      if (!isNaN(val) && val >= 8 && val <= 600) {
        focalSlider.value = val;
      }
      calculateHyperfocal();
    });

    apertureSlider.addEventListener('input', () => {
      apertureNumberInput.value = parseFloat(apertureSlider.value).toFixed(1).replace('.', ',');
      calculateHyperfocal();
    });

    apertureNumberInput.addEventListener('input', () => {
      const cleanVal = apertureNumberInput.value.replace(',', '.');
      const val = parseFloat(cleanVal);
      if (!isNaN(val) && val >= 0.5 && val <= 32) {
        apertureSlider.value = val;
      }
      calculateHyperfocal();
    });

    calculateHyperfocal();
  }

  // =========================================================================
  // 7. EXPOSURE CALCULATOR & COUNTDOWN TIMER
  // =========================================================================
  const ISO_STOPS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 102400];
  const APERTURE_STOPS = [1.0, 1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0];
  const SHUTTER_STOPS = [
    { text: '1/8000s', sec: 1/8000 },
    { text: '1/4000s', sec: 1/4000 },
    { text: '1/2000s', sec: 1/2000 },
    { text: '1/1000s', sec: 1/1000 },
    { text: '1/500s', sec: 1/500 },
    { text: '1/250s', sec: 1/250 },
    { text: '1/125s', sec: 1/125 },
    { text: '1/60s', sec: 1/60 },
    { text: '1/30s', sec: 1/30 },
    { text: '1/15s', sec: 1/15 },
    { text: '1/8s', sec: 1/8 },
    { text: '1/4s', sec: 0.25 },
    { text: '0.5s', sec: 0.5 },
    { text: '1s', sec: 1 },
    { text: '2s', sec: 2 },
    { text: '4s', sec: 4 },
    { text: '6s', sec: 6 },
    { text: '8s', sec: 8 },
    { text: '10s', sec: 10 },
    { text: '13s', sec: 13 },
    { text: '15s', sec: 15 },
    { text: '20s', sec: 20 },
    { text: '25s', sec: 25 },
    { text: '30s', sec: 30 },
    { text: '60s', sec: 60 },
    { text: '2m', sec: 120 },
    { text: '3m', sec: 180 },
    { text: '4m', sec: 240 },
    { text: '5m', sec: 300 }
  ];

  function initExposureCalculator() {
    let currentIsoIdx = 7; // ISO 12800
    let currentApertureIdx = 2; // f/1.4
    let currentSpeedIdx = 16; // 6s

    let lockedParam = 'speed';
    let currentTargetEV = Math.log2((100 * Math.pow(APERTURE_STOPS[currentApertureIdx], 2)) / (ISO_STOPS[currentIsoIdx] * SHUTTER_STOPS[currentSpeedIdx].sec));

    const expIsoValue = document.getElementById('expIsoValue');
    const expApertureValue = document.getElementById('expApertureValue');
    const expSpeedValue = document.getElementById('expSpeedValue');
    const calculatedEvValue = document.getElementById('calculatedEvValue');

    const lockIsoBtn = document.getElementById('lockIsoBtn');
    const lockApertureBtn = document.getElementById('lockApertureBtn');
    const lockSpeedBtn = document.getElementById('lockSpeedBtn');

    const isoMinusBtn = document.getElementById('isoMinusBtn');
    const isoPlusBtn = document.getElementById('isoPlusBtn');
    const apertureMinusBtn = document.getElementById('apertureMinusBtn');
    const aperturePlusBtn = document.getElementById('aperturePlusBtn');
    const speedMinusBtn = document.getElementById('speedMinusBtn');
    const speedPlusBtn = document.getElementById('speedPlusBtn');

    const toggleEvGuideBtn = document.getElementById('toggleEvGuideBtn');
    const evGuideBody = document.getElementById('evGuideBody');
    const evGuideChevron = document.getElementById('evGuideChevron');

    const timerSecondsText = document.getElementById('timerSecondsText');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');

    if (!expIsoValue || !calculatedEvValue) return;

    function getRawEV(iso, aperture, sec) {
      return Math.log2((100 * Math.pow(aperture, 2)) / (iso * sec));
    }

    function findClosestIsoIndex(targetIso) {
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < ISO_STOPS.length; i++) {
        const diff = Math.abs(Math.log2(ISO_STOPS[i]) - Math.log2(Math.max(1, targetIso)));
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return closestIdx;
    }

    function findClosestApertureIndex(targetAperture) {
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < APERTURE_STOPS.length; i++) {
        const diff = Math.abs(Math.log2(APERTURE_STOPS[i]) - Math.log2(Math.max(0.5, targetAperture)));
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return closestIdx;
    }

    function findClosestSpeedIndex(targetSec) {
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < SHUTTER_STOPS.length; i++) {
        const diff = Math.abs(Math.log2(SHUTTER_STOPS[i].sec) - Math.log2(Math.max(0.00001, targetSec)));
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return closestIdx;
    }

    function updateDisplay(keepTargetEV = false) {
      const iso = ISO_STOPS[currentIsoIdx];
      const aperture = APERTURE_STOPS[currentApertureIdx];
      const speedObj = SHUTTER_STOPS[currentSpeedIdx];
      const t = speedObj.sec;

      if (!keepTargetEV || lockedParam === null) {
        currentTargetEV = getRawEV(iso, aperture, t);
      }

      expIsoValue.textContent = iso;
      expApertureValue.textContent = `f/${aperture}`;
      expSpeedValue.textContent = speedObj.text;
      
      const displayEv = keepTargetEV && lockedParam !== null ? currentTargetEV : getRawEV(iso, aperture, t);
      calculatedEvValue.textContent = (displayEv >= 0 ? '+' : '') + displayEv.toFixed(1);

      const roundedSeconds = Math.max(1, Math.round(t));
      if (!isTimerRunning) {
        timerSecondsRemaining = roundedSeconds;
        initialTimerSeconds = roundedSeconds;
        if (timerSecondsText) timerSecondsText.textContent = roundedSeconds;
      }
    }

    function updateLocksUI() {
      const isoCard = lockIsoBtn ? lockIsoBtn.closest('.exp-param-card') : null;
      const apertureCard = lockApertureBtn ? lockApertureBtn.closest('.exp-param-card') : null;
      const speedCard = lockSpeedBtn ? lockSpeedBtn.closest('.exp-param-card') : null;

      [isoCard, apertureCard, speedCard].forEach(card => {
        if (card) card.classList.remove('locked-card');
      });

      [lockIsoBtn, lockApertureBtn, lockSpeedBtn].forEach(btn => {
        if (btn) {
          btn.classList.remove('active-lock');
          const sym = btn.querySelector('.lock-symbol');
          if (sym) sym.textContent = '🔓';
        }
      });

      // Enable all stepper buttons by default
      if (isoMinusBtn) isoMinusBtn.disabled = false;
      if (isoPlusBtn) isoPlusBtn.disabled = false;
      if (apertureMinusBtn) apertureMinusBtn.disabled = false;
      if (aperturePlusBtn) aperturePlusBtn.disabled = false;
      if (speedMinusBtn) speedMinusBtn.disabled = false;
      if (speedPlusBtn) speedPlusBtn.disabled = false;

      if (lockedParam === 'iso') {
        if (lockIsoBtn) {
          lockIsoBtn.classList.add('active-lock');
          const sym = lockIsoBtn.querySelector('.lock-symbol');
          if (sym) sym.textContent = '🔒';
        }
        if (isoCard) isoCard.classList.add('locked-card');
        if (isoMinusBtn) isoMinusBtn.disabled = true;
        if (isoPlusBtn) isoPlusBtn.disabled = true;
      } else if (lockedParam === 'aperture') {
        if (lockApertureBtn) {
          lockApertureBtn.classList.add('active-lock');
          const sym = lockApertureBtn.querySelector('.lock-symbol');
          if (sym) sym.textContent = '🔒';
        }
        if (apertureCard) apertureCard.classList.add('locked-card');
        if (apertureMinusBtn) apertureMinusBtn.disabled = true;
        if (aperturePlusBtn) aperturePlusBtn.disabled = true;
      } else if (lockedParam === 'speed') {
        if (lockSpeedBtn) {
          lockSpeedBtn.classList.add('active-lock');
          const sym = lockSpeedBtn.querySelector('.lock-symbol');
          if (sym) sym.textContent = '🔒';
        }
        if (speedCard) speedCard.classList.add('locked-card');
        if (speedMinusBtn) speedMinusBtn.disabled = true;
        if (speedPlusBtn) speedPlusBtn.disabled = true;
      }
    }

    if (lockIsoBtn) lockIsoBtn.addEventListener('click', () => {
      lockedParam = (lockedParam === 'iso') ? null : 'iso';
      if (lockedParam !== null) {
        currentTargetEV = getRawEV(ISO_STOPS[currentIsoIdx], APERTURE_STOPS[currentApertureIdx], SHUTTER_STOPS[currentSpeedIdx].sec);
      }
      updateLocksUI();
    });

    if (lockApertureBtn) lockApertureBtn.addEventListener('click', () => {
      lockedParam = (lockedParam === 'aperture') ? null : 'aperture';
      if (lockedParam !== null) {
        currentTargetEV = getRawEV(ISO_STOPS[currentIsoIdx], APERTURE_STOPS[currentApertureIdx], SHUTTER_STOPS[currentSpeedIdx].sec);
      }
      updateLocksUI();
    });

    if (lockSpeedBtn) lockSpeedBtn.addEventListener('click', () => {
      lockedParam = (lockedParam === 'speed') ? null : 'speed';
      if (lockedParam !== null) {
        currentTargetEV = getRawEV(ISO_STOPS[currentIsoIdx], APERTURE_STOPS[currentApertureIdx], SHUTTER_STOPS[currentSpeedIdx].sec);
      }
      updateLocksUI();
    });

    // ISO Stepper controls
    function adjustIso(delta) {
      if (lockedParam === 'iso') return;

      const targetIsoIdx = currentIsoIdx + delta;
      if (targetIsoIdx < 0 || targetIsoIdx >= ISO_STOPS.length) return;
      currentIsoIdx = targetIsoIdx;

      if (lockedParam === 'speed') {
        // Speed is locked: adjust Aperture to maintain constant EV
        // N = sqrt((ISO * t * 2^EV) / 100)
        const currentIso = ISO_STOPS[currentIsoIdx];
        const currentSpeed = SHUTTER_STOPS[currentSpeedIdx].sec;
        const targetAperture = Math.sqrt((currentIso * currentSpeed * Math.pow(2, currentTargetEV)) / 100);
        currentApertureIdx = findClosestApertureIndex(targetAperture);
        updateDisplay(true);
      } else if (lockedParam === 'aperture') {
        // Aperture is locked: adjust Speed to maintain constant EV
        // t = (100 * N^2) / (ISO * 2^EV)
        const currentIso = ISO_STOPS[currentIsoIdx];
        const currentAperture = APERTURE_STOPS[currentApertureIdx];
        const targetSpeedSec = (100 * Math.pow(currentAperture, 2)) / (currentIso * Math.pow(2, currentTargetEV));
        currentSpeedIdx = findClosestSpeedIndex(targetSpeedSec);
        updateDisplay(true);
      } else {
        // No lock: recalculate EV
        updateDisplay(false);
      }
    }

    // Aperture Stepper controls
    function adjustAperture(delta) {
      if (lockedParam === 'aperture') return;

      const targetApertureIdx = currentApertureIdx + delta;
      if (targetApertureIdx < 0 || targetApertureIdx >= APERTURE_STOPS.length) return;
      currentApertureIdx = targetApertureIdx;

      if (lockedParam === 'speed') {
        // Speed is locked: adjust ISO to maintain constant EV
        // ISO = (100 * N^2) / (t * 2^EV)
        const currentAperture = APERTURE_STOPS[currentApertureIdx];
        const currentSpeed = SHUTTER_STOPS[currentSpeedIdx].sec;
        const targetIso = (100 * Math.pow(currentAperture, 2)) / (currentSpeed * Math.pow(2, currentTargetEV));
        currentIsoIdx = findClosestIsoIndex(targetIso);
        updateDisplay(true);
      } else if (lockedParam === 'iso') {
        // ISO is locked: adjust Speed to maintain constant EV
        // t = (100 * N^2) / (ISO * 2^EV)
        const currentAperture = APERTURE_STOPS[currentApertureIdx];
        const currentIso = ISO_STOPS[currentIsoIdx];
        const targetSpeedSec = (100 * Math.pow(currentAperture, 2)) / (currentIso * Math.pow(2, currentTargetEV));
        currentSpeedIdx = findClosestSpeedIndex(targetSpeedSec);
        updateDisplay(true);
      } else {
        // No lock: recalculate EV
        updateDisplay(false);
      }
    }

    // Shutter Speed Stepper controls
    function adjustSpeed(delta) {
      if (lockedParam === 'speed') return;

      const targetSpeedIdx = currentSpeedIdx + delta;
      if (targetSpeedIdx < 0 || targetSpeedIdx >= SHUTTER_STOPS.length) return;
      currentSpeedIdx = targetSpeedIdx;

      if (lockedParam === 'iso') {
        // ISO is locked: adjust Aperture to maintain constant EV
        // N = sqrt((ISO * t * 2^EV) / 100)
        const currentIso = ISO_STOPS[currentIsoIdx];
        const currentSpeed = SHUTTER_STOPS[currentSpeedIdx].sec;
        const targetAperture = Math.sqrt((currentIso * currentSpeed * Math.pow(2, currentTargetEV)) / 100);
        currentApertureIdx = findClosestApertureIndex(targetAperture);
        updateDisplay(true);
      } else if (lockedParam === 'aperture') {
        // Aperture is locked: adjust ISO to maintain constant EV
        // ISO = (100 * N^2) / (t * 2^EV)
        const currentAperture = APERTURE_STOPS[currentApertureIdx];
        const currentSpeed = SHUTTER_STOPS[currentSpeedIdx].sec;
        const targetIso = (100 * Math.pow(currentAperture, 2)) / (currentSpeed * Math.pow(2, currentTargetEV));
        currentIsoIdx = findClosestIsoIndex(targetIso);
        updateDisplay(true);
      } else {
        // No lock: recalculate EV
        updateDisplay(false);
      }
    }

    if (isoMinusBtn) isoMinusBtn.addEventListener('click', () => adjustIso(-1));
    if (isoPlusBtn) isoPlusBtn.addEventListener('click', () => adjustIso(1));

    if (apertureMinusBtn) apertureMinusBtn.addEventListener('click', () => adjustAperture(-1));
    if (aperturePlusBtn) aperturePlusBtn.addEventListener('click', () => adjustAperture(1));

    if (speedMinusBtn) speedMinusBtn.addEventListener('click', () => adjustSpeed(-1));
    if (speedPlusBtn) speedPlusBtn.addEventListener('click', () => adjustSpeed(1));

    if (toggleEvGuideBtn && evGuideBody) {
      toggleEvGuideBtn.addEventListener('click', () => {
        const isHidden = evGuideBody.classList.toggle('hidden-drawer');
        if (evGuideChevron) {
          evGuideChevron.classList.toggle('rotate-180', !isHidden);
        }
      });

      const evRows = document.querySelectorAll('.ev-row');
      evRows.forEach(row => {
        row.addEventListener('click', () => {
          evRows.forEach(r => r.classList.remove('active-ev-row'));
          row.classList.add('active-ev-row');

          const evAttr = row.getAttribute('data-ev');
          if (evAttr !== null) {
            const evTarget = parseFloat(evAttr);
            currentTargetEV = evTarget;

            if (lockedParam === 'speed') {
              const currentSpeed = SHUTTER_STOPS[currentSpeedIdx].sec;
              // Solve for ISO with current Aperture
              let targetIso = (100 * Math.pow(APERTURE_STOPS[currentApertureIdx], 2)) / (currentSpeed * Math.pow(2, currentTargetEV));
              if (targetIso < 100) {
                // If ISO would be too low, adjust aperture
                const idealAperture = Math.sqrt((100 * currentSpeed * Math.pow(2, currentTargetEV)) / 100);
                currentApertureIdx = findClosestApertureIndex(idealAperture);
                targetIso = (100 * Math.pow(APERTURE_STOPS[currentApertureIdx], 2)) / (currentSpeed * Math.pow(2, currentTargetEV));
              }
              currentIsoIdx = findClosestIsoIndex(targetIso);
            } else if (lockedParam === 'iso') {
              const currentIso = ISO_STOPS[currentIsoIdx];
              let targetSpeedSec = (100 * Math.pow(APERTURE_STOPS[currentApertureIdx], 2)) / (currentIso * Math.pow(2, currentTargetEV));
              if (targetSpeedSec > 300) {
                const idealAperture = Math.sqrt((currentIso * 300 * Math.pow(2, currentTargetEV)) / 100);
                currentApertureIdx = findClosestApertureIndex(idealAperture);
                targetSpeedSec = (100 * Math.pow(APERTURE_STOPS[currentApertureIdx], 2)) / (currentIso * Math.pow(2, currentTargetEV));
              }
              currentSpeedIdx = findClosestSpeedIndex(targetSpeedSec);
            } else if (lockedParam === 'aperture') {
              const currentAperture = APERTURE_STOPS[currentApertureIdx];
              let targetSpeedSec = (100 * Math.pow(currentAperture, 2)) / (ISO_STOPS[currentIsoIdx] * Math.pow(2, currentTargetEV));
              currentSpeedIdx = findClosestSpeedIndex(targetSpeedSec);
            } else {
              // Default to ISO 100 and f/8.0 (standard daytime EV reference) or suitable astro settings if negative
              if (currentTargetEV <= 0) {
                currentIsoIdx = 5; // ISO 3200
                currentApertureIdx = 5; // f/2.8
              } else {
                currentIsoIdx = 0; // ISO 100
                currentApertureIdx = 8; // f/8.0
              }
              const targetSpeedSec = (100 * Math.pow(APERTURE_STOPS[currentApertureIdx], 2)) / (ISO_STOPS[currentIsoIdx] * Math.pow(2, currentTargetEV));
              currentSpeedIdx = findClosestSpeedIndex(targetSpeedSec);
            }

            updateDisplay(true);

            // Automatically close the dropdown after selecting a reference value
            setTimeout(() => {
              if (evGuideBody) {
                evGuideBody.classList.add('hidden-drawer');
                if (evGuideChevron) {
                  evGuideChevron.classList.remove('rotate-180');
                }
              }
            }, 180);
          }
        });
      });
    }

    // Timer Countdown
    let timerInterval = null;
    let isTimerRunning = false;
    let timerSecondsRemaining = 6;
    let initialTimerSeconds = 6;

    function playBeep(freq = 880, duration = 0.15) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    if (startTimerBtn) {
      startTimerBtn.addEventListener('click', () => {
        if (isTimerRunning) {
          clearInterval(timerInterval);
          isTimerRunning = false;
          startTimerBtn.textContent = 'Continuar';
          startTimerBtn.classList.remove('running');
        } else {
          if (timerSecondsRemaining <= 0) {
            timerSecondsRemaining = initialTimerSeconds;
          }
          isTimerRunning = true;
          startTimerBtn.textContent = 'Pausar';
          startTimerBtn.classList.add('running');

          timerInterval = setInterval(() => {
            timerSecondsRemaining--;
            if (timerSecondsText) timerSecondsText.textContent = timerSecondsRemaining;

            if (timerSecondsRemaining <= 3 && timerSecondsRemaining > 0) {
              playBeep(600, 0.1);
            }

            if (timerSecondsRemaining <= 0) {
              clearInterval(timerInterval);
              isTimerRunning = false;
              startTimerBtn.textContent = 'Iniciar';
              startTimerBtn.classList.remove('running');
              playBeep(1000, 0.4);
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
          }, 1000);
        }
      });
    }

    if (resetTimerBtn) {
      resetTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerSecondsRemaining = initialTimerSeconds;
        if (timerSecondsText) timerSecondsText.textContent = timerSecondsRemaining;
        if (startTimerBtn) {
          startTimerBtn.textContent = 'Iniciar';
          startTimerBtn.classList.remove('running');
        }
      });
    }

    updateLocksUI();
    updateDisplay(true);
  }

  // =========================================================================
  // 8. STAR TRAILS & CIRCUMPOLAR SIMULATOR & CALCULATOR
  // =========================================================================
  function initStarTrailsSimulator() {
    const canvas = document.getElementById('trailsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Controls
    const dirBtns = document.querySelectorAll('.trails-dir-btn');
    const cometBtn = document.getElementById('trailsCometBtn');
    const cometStatusText = document.getElementById('cometStatusText');
    const angleBadge = document.getElementById('trailsAngleBadge');
    const dirBadge = document.getElementById('trailsDirBadge');

    const durationSlider = document.getElementById('trailsDurationSlider');
    const durationDisplay = document.getElementById('trailsDurationValDisplay');
    const chipBtns = document.querySelectorAll('.trails-chip-btn');

    const expTimeSelect = document.getElementById('trailsExpTimeSelect');
    const intervalSelect = document.getElementById('trailsIntervalSelect');
    const formatBtns = document.querySelectorAll('.trails-format-toggle .format-btn');

    // Metric outputs
    const metricTotalPhotos = document.getElementById('metricTotalPhotos');
    const metricTrailAngle = document.getElementById('metricTrailAngle');
    const metricSdSpace = document.getElementById('metricSdSpace');
    const metricTimelapseDuration = document.getElementById('metricTimelapseDuration');
    const metricBatteries = document.getElementById('metricBatteries');

    // State
    let currentDir = 'north'; // 'north' | 'east' | 'south' | 'west'
    let isComet = false;
    let durationMinutes = 120;
    let expTimeSec = 30;
    let intervalSec = 1;
    let currentFormat = 'raw';

    // Generate fixed realistic star field
    const STAR_COUNT = 240;
    const STAR_COLORS = [
      '#ffffff', '#f0f4ff', '#dbeafe', '#93c5fd', '#bfdbfe',
      '#fed7aa', '#fde68a', '#fef08a', '#ffedd5', '#ffd8a8'
    ];

    const starField = [];
    // Pseudo-random deterministic generator for consistent stars
    let seed = 42;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    for (let i = 0; i < STAR_COUNT; i++) {
      starField.push({
        x: random() * 2.6 - 1.3,
        y: random() * 2.2 - 1.1,
        mag: random() * 4.5 + 0.8, // 0.8 to 5.3 magnitude
        color: STAR_COLORS[Math.floor(random() * STAR_COLORS.length)],
        offset: random() * Math.PI * 2
      });
    }

    function formatDurationString(mins) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m} min`;
      if (m === 0) return `${h}h 00m`;
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }

    function updateCalculations() {
      const cycleSec = expTimeSec + intervalSec;
      const totalPhotos = Math.max(1, Math.floor((durationMinutes * 60) / cycleSec));
      const trailAngleDeg = (durationMinutes / 60) * 15;
      
      const mbPerPhoto = (currentFormat === 'raw') ? 35 : 12;
      const totalGb = ((totalPhotos * mbPerPhoto) / 1024).toFixed(1);
      const timelapseSec = (totalPhotos / 24).toFixed(1);
      const batteries = Math.ceil(totalPhotos / 400);

      if (metricTotalPhotos) metricTotalPhotos.textContent = totalPhotos;
      if (metricTrailAngle) metricTrailAngle.textContent = trailAngleDeg.toFixed(1) + '°';
      if (metricSdSpace) metricSdSpace.textContent = totalGb;
      if (metricTimelapseDuration) metricTimelapseDuration.textContent = timelapseSec + 's';
      if (metricBatteries) {
        metricBatteries.textContent = `${batteries} ${batteries === 1 ? 'Batería' : 'Baterías'}`;
      }

      if (durationDisplay) durationDisplay.textContent = formatDurationString(durationMinutes);
      if (angleBadge) angleBadge.textContent = `📐 ${trailAngleDeg.toFixed(1)}° de rotación`;

      const dirNames = { north: 'Norte (Circumpolar)', east: 'Este', south: 'Sur', west: 'Oeste' };
      if (dirBadge) dirBadge.textContent = `Orientación: ${dirNames[currentDir] || 'Norte'}`;

      drawTrails();
    }

    function drawTrails() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 400;
      const cssH = cssW * (10 / 16);

      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = cssW;
      const H = cssH;

      ctx.clearRect(0, 0, W, H);

      // 1. Sky Gradient Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#030408');
      skyGrad.addColorStop(0.5, '#070a14');
      skyGrad.addColorStop(1, '#0e1322');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle atmospheric glow near horizon
      const horizonGlow = ctx.createRadialGradient(W / 2, H * 0.85, 10, W / 2, H * 0.85, W * 0.7);
      horizonGlow.addColorStop(0, 'rgba(30, 41, 69, 0.4)');
      horizonGlow.addColorStop(0.6, 'rgba(15, 20, 35, 0.15)');
      horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, W, H);

      // Calculate trail angle sweep in radians
      const sweepRad = ((durationMinutes / 60) * 15) * (Math.PI / 180);

      // 2. Render Star Trails by Orientation
      ctx.save();

      let centerPoint = { x: W * 0.5, y: H * 0.45 }; // North center (Polaris)

      if (currentDir === 'north') {
        centerPoint = { x: W * 0.5, y: H * 0.45 };
      } else if (currentDir === 'east') {
        centerPoint = { x: -W * 0.6, y: H * 1.5 };
      } else if (currentDir === 'west') {
        centerPoint = { x: W * 1.6, y: H * 1.5 };
      } else if (currentDir === 'south') {
        centerPoint = { x: W * 0.5, y: H * 1.6 };
      }

      starField.forEach(star => {
        const starBrightness = Math.max(0.15, (5.5 - star.mag) / 4.7);
        const lineWidth = Math.max(0.7, (5.5 - star.mag) * 0.45);

        if (currentDir === 'north') {
          // Circular concentric arcs around Polaris
          const rx = star.x * W * 0.75;
          const ry = star.y * H * 0.9;
          const r = Math.sqrt(rx * rx + ry * ry);
          if (r < 6 || r > W * 1.4) return;

          const baseAngle = Math.atan2(ry, rx) + star.offset * 0.05;
          const startAngle = baseAngle;
          const endAngle = baseAngle - sweepRad; // Counter-clockwise around North celestial pole

          if (isComet) {
            // Comet mode: segmented gradient arc
            const segments = Math.max(8, Math.min(32, Math.round(durationMinutes / 10)));
            const step = (endAngle - startAngle) / segments;
            for (let s = 0; s < segments; s++) {
              const a1 = startAngle + s * step;
              const a2 = a1 + step * 1.05;
              const t = s / segments; // 0 (tail) to 1 (head)
              const segAlpha = (t * t) * starBrightness * 0.95;

              ctx.beginPath();
              ctx.arc(centerPoint.x, centerPoint.y, r, a1, a2, true);
              ctx.strokeStyle = star.color;
              ctx.globalAlpha = segAlpha;
              ctx.lineWidth = lineWidth * (0.3 + t * 0.7);
              ctx.stroke();
            }
            // Bright head dot
            ctx.beginPath();
            ctx.arc(centerPoint.x + r * Math.cos(endAngle), centerPoint.y + r * Math.sin(endAngle), lineWidth * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = starBrightness;
            ctx.fill();
          } else {
            // Continuous standard trail
            ctx.beginPath();
            ctx.arc(centerPoint.x, centerPoint.y, r, startAngle, endAngle, true);
            ctx.strokeStyle = star.color;
            ctx.globalAlpha = starBrightness * 0.85;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

        } else if (currentDir === 'east' || currentDir === 'west') {
          // Rising/Setting diagonal linear/curved paths
          const startX = ((star.x + 1.3) / 2.6) * W * 1.4 - W * 0.2;
          const startY = ((star.y + 1.1) / 2.2) * H * 1.2 - H * 0.1;

          const isEast = currentDir === 'east';
          const dx = (isEast ? 1 : -1) * Math.sin(sweepRad * 0.9) * (W * 0.45);
          const dy = -Math.sin(sweepRad * 0.85) * (H * 0.4);

          const endX = startX + dx;
          const endY = startY + dy;

          if (isComet) {
            const grad = ctx.createLinearGradient(startX, startY, endX, endY);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.6, star.color);
            grad.addColorStop(1, '#ffffff');

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = grad;
            ctx.globalAlpha = starBrightness * 0.9;
            ctx.lineWidth = lineWidth * 1.1;
            ctx.lineCap = 'round';
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = star.color;
            ctx.globalAlpha = starBrightness * 0.8;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

        } else if (currentDir === 'south') {
          // South celestial equator & inverted celestial arcs
          const rx = star.x * W * 0.8;
          const ry = star.y * H * 0.9 + H * 0.5;
          const r = Math.sqrt(rx * rx + ry * ry);
          if (r < 10) return;

          const baseAngle = Math.atan2(-ry, rx);
          const startAngle = baseAngle;
          const endAngle = baseAngle + sweepRad; // Clockwise relative to horizon

          ctx.beginPath();
          ctx.arc(centerPoint.x, centerPoint.y, r, startAngle, endAngle, false);
          ctx.strokeStyle = star.color;
          ctx.globalAlpha = isComet ? starBrightness * 0.9 : starBrightness * 0.8;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });

      // Polaris Marker (if North)
      if (currentDir === 'north') {
        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd5a0';
        ctx.globalAlpha = 1.0;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 213, 160, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();

      // 3. Foreground Silhouette (Mountains & Pine Trees)
      ctx.save();
      ctx.fillStyle = '#040508';
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H * 0.76);

      // Mountains ridge line
      ctx.lineTo(W * 0.12, H * 0.71);
      ctx.lineTo(W * 0.25, H * 0.78);
      ctx.lineTo(W * 0.38, H * 0.69);
      ctx.lineTo(W * 0.52, H * 0.75);
      ctx.lineTo(W * 0.68, H * 0.67);
      ctx.lineTo(W * 0.82, H * 0.74);
      ctx.lineTo(W * 0.94, H * 0.70);
      ctx.lineTo(W, H * 0.73);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // Pine trees silhouette along mountain ridges
      function drawPineTree(tx, ty, h) {
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - h * 0.28, ty + h);
        ctx.lineTo(tx + h * 0.28, ty + h);
        ctx.closePath();
        ctx.fill();
      }

      const treePositions = [
        [0.08, 0.74, 18], [0.15, 0.73, 24], [0.21, 0.77, 16],
        [0.34, 0.72, 22], [0.46, 0.76, 19], [0.62, 0.70, 26],
        [0.76, 0.75, 17], [0.88, 0.72, 23], [0.96, 0.74, 20]
      ];

      treePositions.forEach(([rx, ry, th]) => {
        drawPineTree(W * rx, H * ry - th * 0.7, th);
      });

      ctx.restore();

      // 4. Subtle Viewfinder Crosshairs & Rule-of-Thirds Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 0.5;
      // Horizontal 1/3 and 2/3
      ctx.beginPath();
      ctx.moveTo(0, H / 3); ctx.lineTo(W, H / 3);
      ctx.moveTo(0, (2 * H) / 3); ctx.lineTo(W, (2 * H) / 3);
      // Vertical 1/3 and 2/3
      ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, H);
      ctx.moveTo((2 * W) / 3, 0); ctx.lineTo((2 * W) / 3, H);
      ctx.stroke();
      ctx.restore();
    }

    // Direction switcher buttons
    dirBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dirBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDir = btn.getAttribute('data-dir') || 'north';
        updateCalculations();
      });
    });

    // Comet mode toggle
    if (cometBtn) {
      cometBtn.addEventListener('click', () => {
        isComet = !isComet;
        cometBtn.classList.toggle('active', isComet);
        if (cometStatusText) cometStatusText.textContent = isComet ? 'ON' : 'OFF';
        drawTrails();
      });
    }

    // Duration slider
    if (durationSlider) {
      durationSlider.addEventListener('input', (e) => {
        durationMinutes = parseInt(e.target.value, 10);
        // Sync chips
        chipBtns.forEach(chip => {
          const chipMin = parseInt(chip.getAttribute('data-minutes'), 10);
          chip.classList.toggle('active', chipMin === durationMinutes);
        });
        updateCalculations();
      });
    }

    // Quick chips
    chipBtns.forEach(chip => {
      chip.addEventListener('click', () => {
        chipBtns.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const mins = parseInt(chip.getAttribute('data-minutes'), 10);
        if (!isNaN(mins)) {
          durationMinutes = mins;
          if (durationSlider) durationSlider.value = mins;
          updateCalculations();
        }
      });
    });

    // Exposure time select
    if (expTimeSelect) {
      expTimeSelect.addEventListener('change', (e) => {
        expTimeSec = parseInt(e.target.value, 10);
        updateCalculations();
      });
    }

    // Interval select
    if (intervalSelect) {
      intervalSelect.addEventListener('change', (e) => {
        intervalSec = parseInt(e.target.value, 10);
        updateCalculations();
      });
    }

    // Format toggle buttons
    formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.getAttribute('data-format') || 'raw';
        updateCalculations();
      });
    });

    // Handle resize
    window.addEventListener('resize', () => {
      drawTrails();
    });

    updateCalculations();
  }

  // =========================================================================
  // 9. TIMELAPSE CALCULATOR ENGINE
  // =========================================================================
  function initTimelapseCalculator() {
    const presetsContainer = document.getElementById('tlPresetsContainer');
    const modeBtns = document.querySelectorAll('.tl-mode-btn');

    const heroTag = document.getElementById('tlHeroTag');
    const fpsBadge = document.getElementById('tlFpsBadge');
    const mainResultVal = document.getElementById('tlMainResultVal');
    const mainResultSub = document.getElementById('tlMainResultSub');
    const barFill = document.getElementById('tlResultBarFill');
    const smartAlert = document.getElementById('tlSmartAlert');
    const smartAlertText = document.getElementById('tlSmartAlertText');

    // Controls
    const groupInterval = document.getElementById('tlGroupInterval');
    const groupShooting = document.getElementById('tlGroupShooting');
    const groupDesiredVideo = document.getElementById('tlGroupDesiredVideo');

    const intervalSlider = document.getElementById('tlIntervalSlider');
    const intervalDisplay = document.getElementById('tlIntervalDisplay');
    const intervalMinusBtn = document.getElementById('tlIntervalMinusBtn');
    const intervalPlusBtn = document.getElementById('tlIntervalPlusBtn');
    const intervalChips = document.querySelectorAll('#tlIntervalChips .tl-chip');

    const shootingSlider = document.getElementById('tlShootingSlider');
    const shootingDisplay = document.getElementById('tlShootingDisplay');
    const shootingMinusBtn = document.getElementById('tlShootingMinusBtn');
    const shootingPlusBtn = document.getElementById('tlShootingPlusBtn');
    const shootingChips = document.querySelectorAll('#tlShootingChips .tl-chip');

    const desiredVideoSlider = document.getElementById('tlDesiredVideoSlider');
    const desiredVideoDisplay = document.getElementById('tlDesiredVideoDisplay');
    const desiredVideoMinusBtn = document.getElementById('tlDesiredVideoMinusBtn');
    const desiredVideoPlusBtn = document.getElementById('tlDesiredVideoPlusBtn');
    const desiredVideoChips = document.querySelectorAll('#tlDesiredVideoChips .tl-chip');

    const fpsSelect = document.getElementById('tlFpsSelect');
    const formatSelect = document.getElementById('tlFormatSelect');
    const expTimeSelect = document.getElementById('tlExpTimeSelect');

    // Metric outputs
    const metricPhotos = document.getElementById('tlMetricPhotos');
    const metricSpeed = document.getElementById('tlMetricSpeed');
    const metricStorage = document.getElementById('tlMetricStorage');
    const metricBattery = document.getElementById('tlMetricBattery');
    const metricEndTime = document.getElementById('tlMetricEndTime');

    if (!mainResultVal) return;

    // Presets
    const PRESETS = {
      milkyway: { interval: 25, shooting: 150, exp: 20, fps: 24 },
      startrails: { interval: 30, shooting: 240, exp: 25, fps: 30 },
      holygrail: { interval: 5, shooting: 90, exp: 0.001, fps: 24 },
      'clouds-fast': { interval: 2, shooting: 30, exp: 0.001, fps: 30 },
      'clouds-slow': { interval: 8, shooting: 120, exp: 0.001, fps: 24 },
      city: { interval: 2, shooting: 45, exp: 1, fps: 24 },
      moon: { interval: 10, shooting: 180, exp: 0.001, fps: 30 }
    };

    // State
    let currentMode = 'video'; // 'video' | 'shooting' | 'interval'
    let intervalSec = 25;
    let shootingMin = 150;
    let desiredVideoSec = 15;
    let fps = 24;
    let photoMb = 25;
    let expSec = 20;

    function formatTimeMin(min) {
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      if (h === 0) return `${m} min`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m (${min} min)`;
    }

    function formatVideoDuration(sec) {
      const mins = Math.floor(sec / 60);
      const remSec = Math.floor(sec % 60);
      return `${String(mins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    }

    function updateCalculations() {
      let totalPhotos = 0;
      let finalVideoSec = 0;
      let finalShootingMin = shootingMin;
      let finalIntervalSec = intervalSec;

      if (currentMode === 'video') {
        finalIntervalSec = Math.max(1, intervalSec);
        totalPhotos = Math.max(1, Math.floor((shootingMin * 60) / finalIntervalSec));
        finalVideoSec = totalPhotos / fps;
      } else if (currentMode === 'shooting') {
        finalIntervalSec = Math.max(1, intervalSec);
        totalPhotos = Math.max(1, Math.round(desiredVideoSec * fps));
        finalShootingMin = Math.round((totalPhotos * finalIntervalSec) / 60);
        finalVideoSec = desiredVideoSec;
      } else if (currentMode === 'interval') {
        totalPhotos = Math.max(1, Math.round(desiredVideoSec * fps));
        finalIntervalSec = Math.max(0.5, (shootingMin * 60) / totalPhotos);
        finalVideoSec = desiredVideoSec;
      }

      // Update hero card display
      if (fpsBadge) fpsBadge.textContent = `@ ${fps} FPS`;

      if (currentMode === 'video') {
        heroTag.textContent = '🎬 DURACIÓN DEL VÍDEO FINAL';
        mainResultVal.textContent = formatVideoDuration(finalVideoSec);
        mainResultSub.textContent = `${finalVideoSec.toFixed(1)} segundos de metraje`;
        const barPct = Math.min(100, Math.max(8, (finalVideoSec / 60) * 100));
        barFill.style.width = `${barPct}%`;
      } else if (currentMode === 'shooting') {
        heroTag.textContent = '⏱️ TIEMPO DE DISPARO NECESARIO';
        mainResultVal.textContent = formatTimeMin(finalShootingMin);
        mainResultSub.textContent = `Para obtener ${desiredVideoSec}s de vídeo`;
        const barPct = Math.min(100, Math.max(8, (finalShootingMin / 360) * 100));
        barFill.style.width = `${barPct}%`;
      } else if (currentMode === 'interval') {
        heroTag.textContent = '📐 INTERVALO IDEAL RECOMENDADO';
        mainResultVal.textContent = `${finalIntervalSec.toFixed(1)} s`;
        mainResultSub.textContent = `Entre cada disparo consecutivo`;
        const barPct = Math.min(100, Math.max(8, (finalIntervalSec / 60) * 100));
        barFill.style.width = `${barPct}%`;
      }

      // Update input displays
      if (intervalDisplay) intervalDisplay.textContent = `${intervalSec} s`;
      if (intervalSlider) intervalSlider.value = intervalSec;
      if (shootingDisplay) shootingDisplay.textContent = formatTimeMin(shootingMin);
      if (shootingSlider) shootingSlider.value = shootingMin;
      if (desiredVideoDisplay) desiredVideoDisplay.textContent = `${desiredVideoSec} s (${formatVideoDuration(desiredVideoSec)})`;
      if (desiredVideoSlider) desiredVideoSlider.value = desiredVideoSec;

      // Update metrics
      if (metricPhotos) {
        metricPhotos.innerHTML = `${totalPhotos} <small>disparos</small>`;
      }

      const totalShootingSec = (currentMode === 'shooting' ? finalShootingMin : shootingMin) * 60;
      const speedFactor = finalVideoSec > 0 ? totalShootingSec / finalVideoSec : 1;
      if (metricSpeed) {
        metricSpeed.innerHTML = `${Math.round(speedFactor)}x <small>en tiempo real</small>`;
      }

      const totalStorageGb = (totalPhotos * photoMb) / 1024;
      if (metricStorage) {
        metricStorage.innerHTML = `${totalStorageGb.toFixed(1)} GB <small>(${photoMb}MB/foto)</small>`;
      }

      const batteries = Math.max(1, Math.ceil(totalPhotos / 400));
      if (metricBattery) {
        metricBattery.innerHTML = `${batteries} ${batteries === 1 ? 'Batería' : 'Baterías'} <small>(~400 disp/bat)</small>`;
      }

      if (metricEndTime) {
        const now = new Date();
        const end = new Date(now.getTime() + (currentMode === 'shooting' ? finalShootingMin : shootingMin) * 60000);
        const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        metricEndTime.innerHTML = `${endStr} <small>(si inicias ahora)</small>`;
      }

      // Smart Alert Check
      const effectiveInterval = currentMode === 'interval' ? finalIntervalSec : intervalSec;
      if (smartAlert && smartAlertText) {
        smartAlert.className = 'tl-smart-alert';
        if (expSec > 0.01 && effectiveInterval <= expSec) {
          smartAlert.classList.add('alert-danger');
          smartAlertText.innerHTML = `⚠️ <strong>¡Atención!</strong> El intervalo (${effectiveInterval}s) es menor o igual al tiempo de exposición (${expSec}s). Aumenta el intervalo o reduce la obturación para no perder disparos.`;
        } else if (expSec > 0.01 && effectiveInterval - expSec < 1.5) {
          smartAlert.classList.add('alert-warn');
          smartAlertText.innerHTML = `⚠️ <strong>Margen ajustado:</strong> Tienes solo ${(effectiveInterval - expSec).toFixed(1)}s de buffer. Asegúrate de que tu tarjeta SD sea rápida (V30 o superior).`;
        } else {
          smartAlert.classList.add('alert-ok');
          const buffer = expSec > 0.01 ? (effectiveInterval - expSec).toFixed(0) : effectiveInterval;
          smartAlertText.innerHTML = `✅ <strong>Configuración óptima:</strong> Buffer de ${buffer}s entre tomas para grabación continua sin saltos.`;
        }
      }
    }

    // Mode Switcher
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode') || 'video';

        if (currentMode === 'video') {
          groupInterval.style.display = 'flex';
          groupShooting.style.display = 'flex';
          groupDesiredVideo.style.display = 'none';
        } else if (currentMode === 'shooting') {
          groupInterval.style.display = 'flex';
          groupShooting.style.display = 'none';
          groupDesiredVideo.style.display = 'flex';
        } else if (currentMode === 'interval') {
          groupInterval.style.display = 'none';
          groupShooting.style.display = 'flex';
          groupDesiredVideo.style.display = 'flex';
        }

        updateCalculations();
      });
    });

    // Presets
    if (presetsContainer) {
      const presetBtns = presetsContainer.querySelectorAll('.tl-preset-btn');
      presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          presetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const key = btn.getAttribute('data-preset');
          const p = PRESETS[key];
          if (p) {
            intervalSec = p.interval;
            shootingMin = p.shooting;
            expSec = p.exp;
            fps = p.fps;

            if (fpsSelect) fpsSelect.value = String(fps);
            if (expTimeSelect) expTimeSelect.value = String(expSec);

            // Sync chips
            intervalChips.forEach(c => c.classList.toggle('active', parseInt(c.getAttribute('data-val'), 10) === intervalSec));
            shootingChips.forEach(c => c.classList.toggle('active', parseInt(c.getAttribute('data-val'), 10) === shootingMin));

            updateCalculations();
          }
        });
      });
    }

    // Interval Controls
    if (intervalSlider) {
      intervalSlider.addEventListener('input', (e) => {
        intervalSec = parseInt(e.target.value, 10);
        intervalChips.forEach(c => c.classList.toggle('active', parseInt(c.getAttribute('data-val'), 10) === intervalSec));
        updateCalculations();
      });
    }

    if (intervalMinusBtn) {
      intervalMinusBtn.addEventListener('click', () => {
        intervalSec = Math.max(1, intervalSec - 1);
        updateCalculations();
      });
    }

    if (intervalPlusBtn) {
      intervalPlusBtn.addEventListener('click', () => {
        intervalSec = Math.min(120, intervalSec + 1);
        updateCalculations();
      });
    }

    intervalChips.forEach(chip => {
      chip.addEventListener('click', () => {
        intervalChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        intervalSec = parseInt(chip.getAttribute('data-val'), 10);
        updateCalculations();
      });
    });

    // Shooting Duration Controls
    if (shootingSlider) {
      shootingSlider.addEventListener('input', (e) => {
        shootingMin = parseInt(e.target.value, 10);
        shootingChips.forEach(c => c.classList.toggle('active', parseInt(c.getAttribute('data-val'), 10) === shootingMin));
        updateCalculations();
      });
    }

    if (shootingMinusBtn) {
      shootingMinusBtn.addEventListener('click', () => {
        shootingMin = Math.max(5, shootingMin - 5);
        updateCalculations();
      });
    }

    if (shootingPlusBtn) {
      shootingPlusBtn.addEventListener('click', () => {
        shootingMin = Math.min(720, shootingMin + 5);
        updateCalculations();
      });
    }

    shootingChips.forEach(chip => {
      chip.addEventListener('click', () => {
        shootingChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        shootingMin = parseInt(chip.getAttribute('data-val'), 10);
        updateCalculations();
      });
    });

    // Desired Video Duration Controls
    if (desiredVideoSlider) {
      desiredVideoSlider.addEventListener('input', (e) => {
        desiredVideoSec = parseInt(e.target.value, 10);
        desiredVideoChips.forEach(c => c.classList.toggle('active', parseInt(c.getAttribute('data-val'), 10) === desiredVideoSec));
        updateCalculations();
      });
    }

    if (desiredVideoMinusBtn) {
      desiredVideoMinusBtn.addEventListener('click', () => {
        desiredVideoSec = Math.max(3, desiredVideoSec - 1);
        updateCalculations();
      });
    }

    if (desiredVideoPlusBtn) {
      desiredVideoPlusBtn.addEventListener('click', () => {
        desiredVideoSec = Math.min(180, desiredVideoSec + 1);
        updateCalculations();
      });
    }

    desiredVideoChips.forEach(chip => {
      chip.addEventListener('click', () => {
        desiredVideoChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        desiredVideoSec = parseInt(chip.getAttribute('data-val'), 10);
        updateCalculations();
      });
    });

    // Selects
    if (fpsSelect) {
      fpsSelect.addEventListener('change', (e) => {
        fps = parseInt(e.target.value, 10);
        updateCalculations();
      });
    }

    if (formatSelect) {
      formatSelect.addEventListener('change', (e) => {
        photoMb = parseInt(e.target.value, 10);
        updateCalculations();
      });
    }

    if (expTimeSelect) {
      expTimeSelect.addEventListener('change', (e) => {
        expSec = parseFloat(e.target.value);
        updateCalculations();
      });
    }

    updateCalculations();
  }

  // =========================================================================
  // 10. MULTI-SCREEN CONTROLLER & MAIN APP
  // =========================================================================
  function startPlanitApp() {
    let currentLat = 41.6148;
    let currentLng = 0.6268;
    let currentLocationName = 'Lleida';
    let selectedDate = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';

    // Screens
    const mainView      = document.getElementById('mainView');
    const detailsView   = document.getElementById('detailsView');
    const calcView      = document.getElementById('calcView');
    const hyperfocalView= document.getElementById('hyperfocalView');
    const exposureView  = document.getElementById('exposureView');
    const trailsView    = document.getElementById('trailsView');
    const timelapseView = document.getElementById('timelapseView');

    const screens = {
      mainView,
      detailsView,
      calcView,
      hyperfocalView,
      exposureView,
      trailsView,
      timelapseView
    };

    // Global Navbar & Dropdown Elements
    const navPlanBtn = document.getElementById('navPlanBtn');
    const calculatorsDropdownWrapper = document.getElementById('calculatorsDropdownWrapper');
    const calculatorsDropdownBtn = document.getElementById('calculatorsDropdownBtn');
    const calculatorsDropdownLabel = document.getElementById('calculatorsDropdownLabel');
    const calculatorsDropdownMenu = document.getElementById('calculatorsDropdownMenu');
    const dropdownMenuItems = document.querySelectorAll('.dropdown-menu-item');

    const calculatorNames = {
      exposureView: 'Exposición',
      calcView: 'Regla NPF',
      hyperfocalView: 'Hiperfocal',
      trailsView: 'Star Trails',
      timelapseView: 'Timelapse'
    };

    function closeCalculatorsDropdown() {
      if (calculatorsDropdownWrapper) {
        calculatorsDropdownWrapper.classList.remove('open');
      }
      if (calculatorsDropdownBtn) {
        calculatorsDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    }

    function toggleCalculatorsDropdown(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!calculatorsDropdownWrapper) return;
      const isOpen = calculatorsDropdownWrapper.classList.toggle('open');
      if (calculatorsDropdownBtn) {
        calculatorsDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }

    if (calculatorsDropdownBtn) {
      calculatorsDropdownBtn.addEventListener('click', toggleCalculatorsDropdown);
    }

    // Close dropdown on outside click or Escape key
    document.addEventListener('click', (e) => {
      if (calculatorsDropdownWrapper && !calculatorsDropdownWrapper.contains(e.target)) {
        closeCalculatorsDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCalculatorsDropdown();
      }
    });

    function updateNavbarActive(targetScreenId) {
      const isPlanner = targetScreenId === 'mainView' || targetScreenId === 'detailsView';
      
      if (navPlanBtn) {
        if (isPlanner) {
          navPlanBtn.classList.add('active');
        } else {
          navPlanBtn.classList.remove('active');
        }
      }

      if (calculatorsDropdownBtn) {
        if (!isPlanner && calculatorNames[targetScreenId]) {
          calculatorsDropdownBtn.classList.add('active');
          if (calculatorsDropdownLabel) {
            calculatorsDropdownLabel.textContent = calculatorNames[targetScreenId];
          }
        } else {
          calculatorsDropdownBtn.classList.remove('active');
          if (calculatorsDropdownLabel) {
            calculatorsDropdownLabel.textContent = 'Calculadoras';
          }
        }
      }

      dropdownMenuItems.forEach(item => {
        const itemTarget = item.getAttribute('data-target');
        if (itemTarget === targetScreenId) {
          item.classList.add('active-item');
        } else {
          item.classList.remove('active-item');
        }
      });
    }

    function switchScreen(activeScreenId) {
      closeCalculatorsDropdown();

      Object.keys(screens).forEach(id => {
        const s = screens[id];
        if (s) {
          if (id === activeScreenId) {
            s.classList.remove('hidden-screen');
            s.classList.add('active-screen');
          } else {
            s.classList.remove('active-screen');
            s.classList.add('hidden-screen');
          }
        }
      });

      updateNavbarActive(activeScreenId);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (activeScreenId === 'mainView') {
        setTimeout(() => {
          if (mapInstance) mapInstance.invalidateSize();
        }, 150);
      }
    }

    // Connect Plan button
    if (navPlanBtn) {
      navPlanBtn.addEventListener('click', () => {
        switchScreen('mainView');
      });
    }

    // Connect Dropdown Menu items
    dropdownMenuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = item.getAttribute('data-target');
        if (target) {
          switchScreen(target);
        }
      });
    });

    // Map & Calendar Snap Slide Navigation
    const scrollToCalendarBtn = document.getElementById('scrollToCalendarBtn');
    const scrollToMapBtn = document.getElementById('scrollToMapBtn');
    const mapSlide = document.getElementById('mapSlide');
    const calendarSlide = document.getElementById('calendarSlide');

    if (scrollToCalendarBtn && calendarSlide) {
      scrollToCalendarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        calendarSlide.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (scrollToMapBtn && mapSlide) {
      scrollToMapBtn.addEventListener('click', (e) => {
        e.preventDefault();
        mapSlide.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          if (mapInstance) mapInstance.invalidateSize();
        }, 250);
      });
    }

    // Auto resize map when scrolling between slides in mainView
    const mainViewEl = document.getElementById('mainView');
    if (mainViewEl) {
      let scrollTimeout = null;
      mainViewEl.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (mapInstance) mapInstance.invalidateSize();
        }, 150);
      }, { passive: true });
    }
    const bottomBackBtn = document.getElementById('bottomBackBtn');
    const detailsLocationBadge = document.getElementById('detailsLocationBadge');
    const prevNightBtn = document.getElementById('prevNightBtn');
    const nextNightBtn = document.getElementById('nextNightBtn');

    // Main view elements
    const coordsEl = document.getElementById('coordsText');
    const zoneEl = document.getElementById('zoneText');
    const locationBtn = document.getElementById('myLocationBtn');
    const searchInput = document.getElementById('locationSearchInput');
    const searchResults = document.getElementById('searchResults');
    const searchBtn = document.getElementById('searchBtn');
    const calendarContainer = document.getElementById('calendarContainer');
    const detailsContent = document.getElementById('detailsContent');

    function updateCoordsDisplay(lat, lng) {
      if (coordsEl) coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (zoneEl) zoneEl.textContent = timezone;
      if (detailsLocationBadge) detailsLocationBadge.textContent = `📍 ${currentLocationName}`;
    }

    function showDetailsScreen(date, nightInfo) {
      selectedDate = new Date(date);
      if (detailsLocationBadge) {
        detailsLocationBadge.textContent = `📍 ${currentLocationName} (${currentLat.toFixed(2)}, ${currentLng.toFixed(2)})`;
      }
      renderNightDetailsScreen(detailsContent, selectedDate, nightInfo);
      switchScreen('detailsView');
    }

    let calendarInstance = null;

    function handleLocationChanged(lat, lng) {
      currentLat = lat;
      currentLng = lng;
      updateCoordsDisplay(lat, lng);

      // Refresh azimuth lines for the current selected date
      updateAzimuthLines(lat, lng, selectedDate);

      if (calendarInstance) {
        calendarInstance.setLocation(lat, lng);
      }

      reverseGeocode(lat, lng).then(res => {
        if (res && res.name) {
          currentLocationName = res.name;
          if (searchInput && document.activeElement !== searchInput) {
            searchInput.placeholder = `📍 ${res.name}`;
          }
          if (detailsLocationBadge) {
            detailsLocationBadge.textContent = `📍 ${res.name}`;
          }
        }
      });
    }

    // Init Map
    initMap('map', currentLat, currentLng, handleLocationChanged);

    // Draw initial azimuth lines for today
    setTimeout(() => updateAzimuthLines(currentLat, currentLng, selectedDate), 400);

    // Init Calendar
    calendarInstance = new AstroCalendar(calendarContainer, {
      initialDate: selectedDate,
      lat: currentLat,
      lng: currentLng,
      onDateSelect: (date, nightInfo) => {
        // Update azimuth lines for the newly-selected date before switching screen
        updateAzimuthLines(currentLat, currentLng, date);
        showDetailsScreen(date, nightInfo);
      }
    });

    // Init Star Pinpoint Calculator
    initStarCalculator();

    // Init Hyperfocal Distance Calculator
    initHyperfocalCalculator();

    // Init Exposure Calculator
    initExposureCalculator();

    // Init Star Trails Simulator & Calculator
    initStarTrailsSimulator();

    // Init Timelapse Calculator
    initTimelapseCalculator();

    updateCoordsDisplay(currentLat, currentLng);

    // Back buttons
    function returnToCalendarView() {
      switchScreen('mainView');
      setTimeout(() => {
        if (calendarSlide) {
          calendarSlide.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 50);
    }

    if (backToCalendarBtn) backToCalendarBtn.addEventListener('click', returnToCalendarView);
    if (bottomBackBtn) bottomBackBtn.addEventListener('click', returnToCalendarView);

    // Date Switchers
    if (prevNightBtn) {
      prevNightBtn.addEventListener('click', () => {
        const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
        calendarInstance.setSelectedDate(prev, true);
      });
    }

    if (nextNightBtn) {
      nextNightBtn.addEventListener('click', () => {
        const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        calendarInstance.setSelectedDate(next, true);
      });
    }

    // Geolocation button
    if (locationBtn) {
      locationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocalización no disponible en tu navegador.');
          return;
        }
        locationBtn.classList.add('spinning');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            locationBtn.classList.remove('spinning');
            setMapPosition(pos.coords.latitude, pos.coords.longitude, 13);
          },
          (err) => {
            locationBtn.classList.remove('spinning');
            alert('No se pudo acceder a tu ubicación. Por favor permite el acceso al GPS en el navegador.');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    // Search Logic
    async function executeSearch(query) {
      if (!query || query.trim().length < 2) return;
      const results = await searchLocations(query);
      if (!searchResults) return;
      searchResults.innerHTML = '';

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'search-item no-results';
        empty.textContent = 'No se encontraron resultados';
        searchResults.appendChild(empty);
      } else {
        results.forEach(item => {
          const row = document.createElement('div');
          row.className = 'search-item';
          row.innerHTML = `<div class="search-item-icon">📍</div><div class="search-item-text">${item.name}</div>`;
          
          row.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchInput.value = item.name.split(',')[0];
            currentLocationName = item.name.split(',')[0];
            searchResults.classList.add('hidden');
            setMapPosition(item.lat, item.lng, 13);
          });

          searchResults.appendChild(row);
        });
      }
      searchResults.classList.remove('hidden');
    }

    if (searchInput && searchResults) {
      let searchTimer = null;
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        clearTimeout(searchTimer);
        if (q.length < 2) {
          searchResults.classList.add('hidden');
          searchResults.innerHTML = '';
          return;
        }
        searchTimer = setTimeout(() => {
          executeSearch(q);
        }, 250);
      });

      searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const q = searchInput.value.trim();
          if (!q) return;
          const results = await searchLocations(q);
          if (results.length > 0) {
            const first = results[0];
            searchInput.value = first.name.split(',')[0];
            currentLocationName = first.name.split(',')[0];
            searchResults.classList.add('hidden');
            setMapPosition(first.lat, first.lng, 13);
          }
        }
      });

      if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
          const q = searchInput.value.trim();
          if (!q) return;
          const results = await searchLocations(q);
          if (results.length > 0) {
            const first = results[0];
            searchInput.value = first.name.split(',')[0];
            currentLocationName = first.name.split(',')[0];
            searchResults.classList.add('hidden');
            setMapPosition(first.lat, first.lng, 13);
          }
        });
      }

      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.classList.add('hidden');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPlanitApp);
  } else {
    startPlanitApp();
  }
})();

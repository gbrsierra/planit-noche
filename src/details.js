/**
 * Details Card & Interactive Night Timeline Visualization
 */
import { formatTime, formatDuration, getAzimuthDirection } from './astro.js';

export function renderNightDetails(container, date, nightInfo, lat, lng) {
  if (!container || !nightInfo) return;

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dateTitle = `${dayNames[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;

  // Darkness intervals string
  let darknessStr = 'No hay oscuridad total';
  let darknessDurationStr = '';
  if (nightInfo.hasTotalDarkness && nightInfo.totalDarknessIntervals.length > 0) {
    darknessStr = nightInfo.totalDarknessIntervals
      .map(i => `${formatTime(i.start)} - ${formatTime(i.end)}`)
      .join(', ');
    darknessDurationStr = formatDuration(nightInfo.totalDarknessMinutes);
  }

  // Galactic Center intervals string
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
          <div>
            <h3 class="details-title">${dateTitle}</h3>
            <p class="details-subtitle">Noche del ${date.getDate()} al ${date.getDate() + 1} de ${monthNames[date.getMonth()]}</p>
          </div>
        </div>
      </div>

      <!-- Main Status Banners -->
      <div class="status-cards-grid">
        <!-- Darkness Card -->
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

        <!-- Galactic Center Card -->
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
            <div class="status-hint">El núcleo de la Vía Láctea no coincide con cielo oscuro.</div>
          `}
        </div>
      </div>

      <!-- Astronomical Ephemeris Grid -->
      <div class="ephemeris-grid">
        <!-- Sun Column -->
        <div class="ephem-item">
          <div class="ephem-title">
            <span class="ephem-icon sun-icon">☀️</span> Sol
          </div>
          <div class="ephem-row">
            <span>Puesta de sol:</span>
            <strong>${formatTime(nightInfo.sunsetTime)}</strong>
          </div>
          <div class="ephem-row">
            <span>Noche astronómica (Sol -18&deg;):</span>
            <strong>${formatTime(nightInfo.astroDuskTime)}</strong>
          </div>
          <div class="ephem-row">
            <span>Fin noche astronómica:</span>
            <strong>${formatTime(nightInfo.astroDawnTime)}</strong>
          </div>
          <div class="ephem-row">
            <span>Salida de sol:</span>
            <strong>${formatTime(nightInfo.sunriseTime)}</strong>
          </div>
        </div>

        <!-- Moon Column -->
        <div class="ephem-item">
          <div class="ephem-title">
            <span class="ephem-icon moon-icon">${nightInfo.moonIllum.phaseIcon}</span> Luna (${nightInfo.moonIllum.fraction}%)
          </div>
          <div class="ephem-row">
            <span>Fase lunar:</span>
            <strong>${nightInfo.moonIllum.phaseName}</strong>
          </div>
          <div class="ephem-row">
            <span>Puesta de luna:</span>
            <strong>${formatTime(nightInfo.moonsetTime)}</strong>
          </div>
          <div class="ephem-row">
            <span>Salida de luna:</span>
            <strong>${formatTime(nightInfo.moonriseTime)}</strong>
          </div>
          <div class="ephem-row">
            <span>Iluminación lunar:</span>
            <strong>${nightInfo.moonIllum.fraction}%</strong>
          </div>
        </div>
      </div>

      <!-- Interactive Elevation Chart -->
      <div class="chart-container-box">
        <div class="chart-header">
          <div class="chart-title">Curvas de Elevación a lo largo de la Noche</div>
          <div class="chart-legend">
            <span class="chart-legend-item"><span class="legend-color-line sun-line"></span> Sol</span>
            <span class="chart-legend-item"><span class="legend-color-line moon-line"></span> Luna</span>
            <span class="chart-legend-item"><span class="legend-color-line gc-line"></span> Vía Láctea (CG)</span>
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

  // Draw chart
  setTimeout(() => {
    drawTimelineChart(nightInfo.samples);
  }, 50);
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

    // Draw Background Dark Bands (Total Darkness & Galactic Center visible)
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

    // Time labels on X axis
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

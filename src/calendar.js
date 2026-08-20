/**
 * Interactive Astrophotography Calendar
 */
import { analyzeNight } from './astro.js';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export class AstroCalendar {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.currentDate = options.initialDate || new Date();
    this.selectedDate = new Date(this.currentDate);
    this.viewYear = this.selectedDate.getFullYear();
    this.viewMonth = this.selectedDate.getMonth();
    this.lat = options.lat || 41.6148;
    this.lng = options.lng || 0.6268;
    this.onDateSelect = options.onDateSelect || (() => {});

    this.cache = new Map(); // Cache calculated night info for performance
    this.render();
  }

  setLocation(lat, lng) {
    this.lat = lat;
    this.lng = lng;
    this.cache.clear();
    this.render();
    this.notifySelected();
  }

  setDate(date) {
    this.selectedDate = new Date(date);
    this.viewYear = this.selectedDate.getFullYear();
    this.viewMonth = this.selectedDate.getMonth();
    this.render();
    this.notifySelected();
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
    this.notifySelected();
  }

  notifySelected() {
    const nightInfo = this.getNightInfo(this.selectedDate);
    this.onDateSelect(this.selectedDate, nightInfo);
  }

  getNightInfo(date) {
    const key = `${this.lat.toFixed(4)}_${this.lng.toFixed(4)}_${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const info = analyzeNight(date, this.lat, this.lng);
    this.cache.set(key, info);
    return info;
  }

  render() {
    this.container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'calendar-card';

    // 1. Header with Month navigation and HOY button
    const header = document.createElement('div');
    header.className = 'calendar-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cal-nav-btn';
    prevBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    `;
    prevBtn.title = 'Mes anterior';
    prevBtn.onclick = () => this.prevMonth();

    const title = document.createElement('div');
    title.className = 'cal-title';
    title.textContent = `${MONTH_NAMES[this.viewMonth]} De ${this.viewYear}`;

    const rightGroup = document.createElement('div');
    rightGroup.className = 'cal-right-group';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cal-nav-btn';
    nextBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
    nextBtn.title = 'Mes siguiente';
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

    // 2. Weekday Names
    const weekdaysGrid = document.createElement('div');
    weekdaysGrid.className = 'calendar-weekdays';
    WEEKDAY_NAMES.forEach(day => {
      const col = document.createElement('div');
      col.className = 'cal-weekday';
      col.textContent = day;
      weekdaysGrid.appendChild(col);
    });
    card.appendChild(weekdaysGrid);

    // 3. Days Grid
    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-days';

    // Calculate start day of month (Monday = 0 ... Sunday = 6)
    const firstDayOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Convert Sun=0 to Mon=0

    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cell = document.createElement('div');
      cell.className = 'cal-day other-month';
      cell.innerHTML = `<span class="day-number">${dayNum}</span>`;
      daysGrid.appendChild(cell);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(this.viewYear, this.viewMonth, d);
      const isSelected = this.selectedDate.getFullYear() === this.viewYear &&
                         this.selectedDate.getMonth() === this.viewMonth &&
                         this.selectedDate.getDate() === d;
      
      const nightInfo = this.getNightInfo(thisDate);

      const cell = document.createElement('div');
      cell.className = `cal-day current-month ${isSelected ? 'selected' : ''}`;
      cell.dataset.day = d;

      // Inner container for circle badge
      const badge = document.createElement('div');
      badge.className = 'day-badge';

      const numSpan = document.createElement('span');
      numSpan.className = 'day-number';
      numSpan.textContent = d;
      badge.appendChild(numSpan);

      // Dot indicators container
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'day-dots';

      if (nightInfo.hasTotalDarkness) {
        const redDot = document.createElement('span');
        redDot.className = 'dot dot-red';
        redDot.title = 'Oscuridad total disponible esta noche';
        dotsContainer.appendChild(redDot);
      }

      if (nightInfo.hasGalacticCenter) {
        const greenDot = document.createElement('span');
        greenDot.className = 'dot dot-green';
        greenDot.title = 'Centro Galáctico visible en oscuridad total';
        dotsContainer.appendChild(greenDot);
      }

      badge.appendChild(dotsContainer);
      cell.appendChild(badge);

      cell.onclick = () => {
        this.selectedDate = new Date(this.viewYear, this.viewMonth, d);
        this.render();
        this.notifySelected();
      };

      daysGrid.appendChild(cell);
    }

    // Next month filler days (fill up to 35 or 42 cells)
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = (totalCells % 7 === 0) ? 0 : (7 - (totalCells % 7));
    for (let d = 1; d <= remainingCells; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day other-month';
      cell.innerHTML = `<span class="day-number">${d}</span>`;
      daysGrid.appendChild(cell);
    }

    card.appendChild(daysGrid);

    // 4. Legend
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

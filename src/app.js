/**
 * Main Application Orchestrator
 */
import { initMap, setMapLocation, reverseGeocode, searchLocation } from './map.js';
import { AstroCalendar } from './calendar.js';
import { renderNightDetails } from './details.js';

class PlanitApp {
  constructor() {
    this.currentLat = 41.6148;
    this.currentLng = 0.6268;
    this.selectedDate = new Date();
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';

    this.calendar = null;
    this.searchTimeout = null;

    this.initElements();
    this.initApp();
  }

  initElements() {
    this.coordsEl = document.getElementById('coordsText');
    this.zoneEl = document.getElementById('zoneText');
    this.locationBtn = document.getElementById('myLocationBtn');
    this.searchInput = document.getElementById('locationSearchInput');
    this.searchResults = document.getElementById('searchResults');
    this.calendarContainer = document.getElementById('calendarContainer');
    this.detailsContainer = document.getElementById('detailsContainer');
  }

  async initApp() {
    // 1. Initialize Map
    initMap('map', this.currentLat, this.currentLng, (lat, lng) => {
      this.onLocationChanged(lat, lng);
    });

    // 2. Initialize Calendar
    this.calendar = new AstroCalendar(this.calendarContainer, {
      initialDate: this.selectedDate,
      lat: this.currentLat,
      lng: this.currentLng,
      onDateSelect: (date, nightInfo) => {
        this.selectedDate = date;
        this.updateDetails(date, nightInfo);
      }
    });

    // Initial load info
    this.updateCoordsDisplay(this.currentLat, this.currentLng);
    this.calendar.notifySelected();

    // 3. Event Listeners
    this.initEvents();
  }

  initEvents() {
    // My location button
    if (this.locationBtn) {
      this.locationBtn.addEventListener('click', () => this.handleGeolocation());
    }

    // Search input with debounce
    if (this.searchInput && this.searchResults) {
      this.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(this.searchTimeout);
        if (query.length < 2) {
          this.searchResults.classList.add('hidden');
          this.searchResults.innerHTML = '';
          return;
        }

        this.searchTimeout = setTimeout(async () => {
          const results = await searchLocation(query);
          this.renderSearchResults(results);
        }, 350);
      });

      // Close search results when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
          this.searchResults.classList.add('hidden');
        }
      });
    }

    // Responsive resize chart handler
    window.addEventListener('resize', () => {
      if (this.calendar) {
        this.calendar.notifySelected();
      }
    });
  }

  renderSearchResults(results) {
    if (!this.searchResults) return;
    this.searchResults.innerHTML = '';

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-item no-results';
      empty.textContent = 'No se encontraron resultados';
      this.searchResults.appendChild(empty);
      this.searchResults.classList.remove('hidden');
      return;
    }

    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <div class="search-item-icon">📍</div>
        <div class="search-item-text">${res.name}</div>
      `;
      item.addEventListener('click', () => {
        this.searchInput.value = res.name.split(',')[0];
        this.searchResults.classList.add('hidden');
        setMapLocation(res.lat, res.lng, 13);
      });
      this.searchResults.appendChild(item);
    });

    this.searchResults.classList.remove('hidden');
  }

  async handleGeolocation() {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador.');
      return;
    }

    const originalText = this.locationBtn.innerHTML;
    this.locationBtn.classList.add('loading');
    this.locationBtn.innerHTML = `
      <span class="spinner"></span> Obteniendo ubicación...
    `;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locationBtn.classList.remove('loading');
        this.locationBtn.innerHTML = originalText;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapLocation(lat, lng, 13);
      },
      (err) => {
        this.locationBtn.classList.remove('loading');
        this.locationBtn.innerHTML = originalText;
        console.warn('Geolocation error:', err);
        alert('No se pudo acceder a tu ubicación actual. Revisa los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async onLocationChanged(lat, lng) {
    this.currentLat = lat;
    this.currentLng = lng;
    this.updateCoordsDisplay(lat, lng);

    if (this.calendar) {
      this.calendar.setLocation(lat, lng);
    }

    // Try to obtain place name for search input placeholder or title
    const place = await reverseGeocode(lat, lng);
    if (place && place.name && this.searchInput) {
      this.searchInput.placeholder = `📍 ${place.name}`;
    }
  }

  updateCoordsDisplay(lat, lng) {
    if (this.coordsEl) {
      this.coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    if (this.zoneEl) {
      // Estimate or display timezone
      this.zoneEl.textContent = this.timezone;
    }
  }

  updateDetails(date, nightInfo) {
    if (this.detailsContainer) {
      renderNightDetails(this.detailsContainer, date, nightInfo, this.currentLat, this.currentLng);
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new PlanitApp();
});

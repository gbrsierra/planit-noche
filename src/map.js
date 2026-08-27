/**
 * Map Integration using Leaflet
 */

let map = null;
let marker = null;
let onLocationChangeCallback = null;

// Custom Red Pin Marker SVG (PhotoPills style — round balloon + white ring + red dot)
const redPinIcon = L.divIcon({
  className: 'custom-pin-container',
  html: `
    <div class="pin-ground-shadow"></div>
    <div class="pin-pulse"></div>
    <div class="pin-marker">
      <svg viewBox="0 0 40 52" width="40" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ppBallGradSrc" cx="38%" cy="28%" r="62%">
            <stop offset="0%" stop-color="#ff6b7a"/>
            <stop offset="45%" stop-color="#e8193c"/>
            <stop offset="100%" stop-color="#8b0f22"/>
          </radialGradient>
          <filter id="ppShadowSrc" x="-25%" y="-15%" width="150%" height="145%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.5"/>
          </filter>
        </defs>
        <g filter="url(#ppShadowSrc)">
          <circle cx="20" cy="18" r="16" fill="url(#ppBallGradSrc)"/>
          <polygon points="20,48 12,28 28,28" fill="#c01230"/>
          <ellipse cx="20" cy="28" rx="8" ry="3.5" fill="url(#ppBallGradSrc)"/>
          <ellipse cx="14.5" cy="12.5" rx="5.5" ry="4" fill="rgba(255,255,255,0.22)" transform="rotate(-20 14.5 12.5)"/>
          <circle cx="20" cy="18" r="9.5" fill="white"/>
          <circle cx="20" cy="18" r="4.5" fill="#e8193c"/>
        </g>
      </svg>
    </div>
  `,
  iconSize: [40, 52],
  iconAnchor: [20, 51],
  popupAnchor: [0, -50]
});

export function initMap(containerId, initialLat = 41.6148, initialLng = 0.6268, onLocationChange) {
  onLocationChangeCallback = onLocationChange;

  map = L.map(containerId, {
    center: [initialLat, initialLng],
    zoom: 12,
    zoomControl: false,
    attributionControl: true
  });

  // Dark Map Tiles (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Add CartoDB Dark layer option (Dark theme)
  const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  });

  // Default to Dark layer
  darkLayer.addTo(map);

  // Create draggable marker
  marker = L.marker([initialLat, initialLng], {
    icon: redPinIcon,
    draggable: true
  }).addTo(map);

  // Handle marker drag
  marker.on('dragend', (e) => {
    const latlng = marker.getLatLng();
    triggerLocationChange(latlng.lat, latlng.lng);
  });

  // Handle map click
  map.on('click', (e) => {
    const latlng = e.latlng;
    marker.setLatLng(latlng);
    triggerLocationChange(latlng.lat, latlng.lng);
  });

  return { map, marker };
}

export function setMapLocation(lat, lng, zoom = null) {
  if (!map || !marker) return;
  const newLatLng = L.latLng(lat, lng);
  marker.setLatLng(newLatLng);
  if (zoom) {
    map.setView(newLatLng, zoom);
  } else {
    map.panTo(newLatLng);
  }
  triggerLocationChange(lat, lng);
}

function triggerLocationChange(lat, lng) {
  if (onLocationChangeCallback) {
    onLocationChangeCallback(lat, lng);
  }
}

/**
 * Reverse Geocode with Nominatim to find city / region name and timezone
 */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    
    let locationName = '';
    if (data.address) {
      locationName = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state || data.display_name.split(',')[0];
    } else {
      locationName = data.display_name ? data.display_name.split(',')[0] : 'Ubicación seleccionada';
    }

    return {
      name: locationName,
      fullName: data.display_name || ''
    };
  } catch (err) {
    console.warn('Geocode error:', err);
    return { name: 'Ubicación seleccionada', fullName: '' };
  }
}

/**
 * Geocode search query with Nominatim
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`);
    if (!res.ok) throw new Error('Search request failed');
    const data = await res.json();
    return data.map(item => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch (err) {
    console.warn('Search query error:', err);
    return [];
  }
}

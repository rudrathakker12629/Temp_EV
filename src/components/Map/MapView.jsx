import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const { BaseLayer } = LayersControl;

// ── Constants ─────────────────────────────────────────────────────────────────
const POI_MIN_ZOOM            = 15;    // no POI fetches below this zoom level
const POI_VIEWPORT_ZOOM       = 15;    // use live viewport bounds at this zoom+
const MOVE_DEBOUNCE_MS        = 3000;  // wait 3s after panning stops before fetching
                                       // (Overpass queries take 2–5s, so this avoids
                                       //  firing mid-pan and wasting the request)
const BOUNDS_CHANGE_THRESHOLD = 0.008; // ~880m minimum viewport shift to re-fetch
                                       // prevents duplicate calls on tiny pans
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5150';

// ── Shared AbortController ────────────────────────────────────────────────────
// ONE controller for the whole fetch batch (all 3 POI types together).
// When a new pan triggers a new fetch, we cancel the previous batch entirely.
// This is better than per-type controllers because it prevents a race where
// type A finishes but B/C are still in-flight from a stale pan position.
let currentFetchController = null;

// ── Helper Components ─────────────────────────────────────────────────────────

function ResizeHandler({ layoutMode }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [layoutMode, map]);
  return null;
}

function MapController({ center, onPOIUpdate, onBoundsChange, isPickingFromMap, onMapClick }) {
  const map           = useMap();
  const debounceRef   = useRef(null);
  const lastBoundsRef = useRef(null);

  // Fly to user location when it first arrives
const hasFlownRef = useRef(false);

useEffect(() => {
  if (center?.lat && center?.lon && !hasFlownRef.current) {
    hasFlownRef.current = true;
    map.flyTo([center.lat, center.lon], 13, { duration: 1.5 });
  }
}, [center, map]);

  // Crosshair cursor for pick-from-map mode
  useEffect(() => {
    if (!isPickingFromMap) return;
    map.getContainer().style.cursor = 'crosshair';
    const handler = (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.once('click', handler);
    return () => {
      map.off('click', handler);
      map.getContainer().style.cursor = '';
    };
  }, [isPickingFromMap, map, onMapClick]);

  // ── Core POI loader ───────────────────────────────────────────
  const loadPOIs = useCallback(async () => {
    const zoom = map.getZoom();

    // GUARD 1 – zoom gate: no requests below minimum zoom
    if (zoom < POI_MIN_ZOOM) {
      onPOIUpdate({ hospitals: [], restaurants: [], hotels: [] });
      return;
    }

    // Determine fetch bounds from current viewport
    let bounds;
    if (zoom >= POI_VIEWPORT_ZOOM) {
      const b = map.getBounds();
      bounds = { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
    } else {
      if (!center?.lat || !center?.lon) return;
      const delta = 0.05;
      bounds = {
        south: center.lat - delta, west:  center.lon - delta,
        north: center.lat + delta, east:  center.lon + delta,
      };
    }

    // GUARD 2 – bounds deduplication: skip if the viewport hasn't shifted enough
    if (lastBoundsRef.current) {
      const prev  = lastBoundsRef.current;
      const delta = Math.max(
        Math.abs(bounds.south - prev.south), Math.abs(bounds.north - prev.north),
        Math.abs(bounds.west  - prev.west),  Math.abs(bounds.east  - prev.east),
      );
      if (delta < BOUNDS_CHANGE_THRESHOLD) return;
    }
    lastBoundsRef.current = bounds;

    // Cancel any in-flight fetch batch from a previous pan
    if (currentFetchController) {
      currentFetchController.abort();
    }
    const controller = new AbortController();
    currentFetchController = controller;

    // ── Sequential fetching (NOT parallel) ───────────────────────
    // The backend semaphore allows only 1 Overpass call at a time.
    // Firing all 3 in parallel (Promise.all) causes 2 of them to either
    // wait 3s for the semaphore or get a 429. Sequential fetching
    // respects the backend queue and avoids wasting requests.
    try {
      const hospitals   = await fetchPOIFromBackend('hospital',   bounds, controller.signal);
      if (controller.signal.aborted) return;

      const restaurants = await fetchPOIFromBackend('restaurant', bounds, controller.signal);
      if (controller.signal.aborted) return;

      const hotels      = await fetchPOIFromBackend('hotel',      bounds, controller.signal);
      if (controller.signal.aborted) return;

      onPOIUpdate({ hospitals, restaurants, hotels });
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[POI] Batch fetch error:', e);
    }
  }, [map, onPOIUpdate, center]);

  // Debounced moveend listener
  useEffect(() => {
    const handleMoveEnd = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (onBoundsChange) {
          const b = map.getBounds();
          onBoundsChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
        }
        loadPOIs();
      }, MOVE_DEBOUNCE_MS);
    };
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
      clearTimeout(debounceRef.current);
    };
  }, [map, loadPOIs, onBoundsChange]);

  return null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const createMarkerIcon = (color, letter) => L.divIcon({
  className: '',
  html: `<div class="custom-marker ${color}"><span class="marker-letter">${letter}</span><div class="marker-pulse"></div></div>`,
  iconSize: [36, 42], iconAnchor: [18, 42], popupAnchor: [0, -44]
});

const availableIcon   = (letter) => createMarkerIcon('marker-available',   letter);
const unavailableIcon = (letter) => createMarkerIcon('marker-unavailable', letter);

// Teardrop pin icons — colored head (rotated circle) + downward pointing tail
const createPinIcon = (emoji, bgColor, borderColor) => L.divIcon({
  className: '',
  html: `
    <div class="poi-pin-wrapper">
      <div class="poi-pin-head" style="background:${bgColor};border-color:${borderColor};">
        <span class="poi-pin-emoji">${emoji}</span>
      </div>
      <div class="poi-pin-tail" style="border-top-color:${bgColor};"></div>
    </div>
  `,
  iconSize:    [38, 52],
  iconAnchor:  [19, 52],
  popupAnchor: [0, -54],
});

const hospitalIcon   = createPinIcon('🏥', '#ef4444', '#dc2626'); // red
const restaurantIcon = createPinIcon('🍽️', '#f97316', '#ea580c'); // orange
const hotelIcon      = createPinIcon('🏨', '#6366f1', '#4f46e5'); // indigo

const userIcon = L.divIcon({
  className: '',
  html: `<div class="user-marker"><div class="user-pulse"></div></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10]
});

const pickedStartIcon = L.divIcon({
  className: '',
  html: `<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #10b981;"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8]
});

// ── POI fetch: sequential, abort-aware, Retry-After-aware ────────────────────
async function fetchPOIFromBackend(type, bounds, signal) {
  const { south, west, north, east } = bounds;
  const url = `${API_BASE_URL}/api/poi/${type}?south=${south}&west=${west}&north=${north}&east=${east}`;

  try {
    const res = await fetch(url, { signal });

    if (!res.ok) {
      // Read Retry-After header if backend sent one (from semaphore 429)
      const retryAfter = res.headers.get('Retry-After');
      if (res.status === 429 && retryAfter) {
        console.warn(`[POI] ${type} → 429, server asked to retry after ${retryAfter}s`);
      } else {
        console.warn(`[POI] ${type} → HTTP ${res.status}`);
      }
      return [];
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`[POI] ${type} → unexpected content-type: ${contentType}`);
      return [];
    }

    const data = await res.json();
    return (data.elements || [])
      .filter(el => el.lat && el.lon)
      .map(el => ({
        id:      el.id,
        lat:     el.lat,
        lon:     el.lon,
        name:    el.tags?.name || (type.charAt(0).toUpperCase() + type.slice(1)),
        address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' ') || '',
      }));
  } catch (e) {
    if (e.name === 'AbortError') return [];
    console.error(`[POI] ${type} fetch error:`, e);
    return [];
  }
}

// ── POI Marker Component ──────────────────────────────────────────────────────
function POIMarkers({ pois, icon, label, badgeColor }) {
  return pois.map(poi => (
    <Marker key={`${label}-${poi.id}`} position={[poi.lat, poi.lon]} icon={icon}>
      <Popup>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{poi.name}</div>
          {poi.address && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>📍 {poi.address}</div>
          )}
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            background: badgeColor, color: '#fff',
            borderRadius: 4, padding: '2px 8px'
          }}>{label}</span>
        </div>
      </Popup>
    </Marker>
  ));
}

// ── Map UI Controls ───────────────────────────────────────────────────────────

function LocateMeButton({ onLocate }) {
  const map = useMap();
  const handleLocate = useCallback(() => {
    map.locate({ setView: true, maxZoom: 15 });
    map.once('locationfound', (e) => { if (onLocate) onLocate({ lat: e.latlng.lat, lon: e.latlng.lng }); });
  }, [map, onLocate]);

  useEffect(() => {
    const btn = L.DomUtil.create('button', 'locate-me-btn');
    btn.innerHTML = '📍';
    L.DomEvent.disableClickPropagation(btn);
    btn.onclick = handleLocate;
    const zoomControl = document.querySelector('.leaflet-control-zoom');
    if (zoomControl) {
      const wrapper = L.DomUtil.create('div', 'leaflet-control leaflet-bar locate-wrapper');
      wrapper.appendChild(btn);
      zoomControl.parentNode.appendChild(wrapper);
    }
    return () => document.querySelector('.locate-wrapper')?.remove();
  }, [handleLocate]);

  return null;
}

function FlyToHandler({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (!flyTo) return;
    if (flyTo.bbox) {
      const [minLon, minLat, maxLon, maxLat] = flyTo.bbox;
      if (isNaN(minLat) || isNaN(minLon) || isNaN(maxLat) || isNaN(maxLon)) return;
      map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [40, 40], maxZoom: 14 });
    } else {
      if (!flyTo.lat || !flyTo.lon || isNaN(flyTo.lat) || isNaN(flyTo.lon)) return;
      map.flyTo([flyTo.lat, flyTo.lon], 13, { duration: 1.2 });
    }
  }, [flyTo, map]);
  return null;
}

// ── Main MapView Component ────────────────────────────────────────────────────

function MapView({
  stations = [], userLocation, selectedStation,
  onSelectStation, onGetDirections,
  activeRoute,
  onBoundsChange,
  isPickingFromMap,
  onMapPickedStart,
  flyTo,
  layoutMode
}) {
  const defaultCenter = [20.5937, 78.9629];

  const [pois, setPOIs]                       = useState({ hospitals: [], restaurants: [], hotels: [] });
  const [showHospitals, setShowHospitals]     = useState(true);
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showHotels, setShowHotels]           = useState(true);
  const [pickedStart, setPickedStart]         = useState(null);
  const [currentZoom, setCurrentZoom]         = useState(5);

  const handlePOIUpdate = useCallback((newPOIs) => setPOIs(newPOIs), []);
  const handleMapClick  = useCallback((coords) => {
    setPickedStart(coords);
    if (onMapPickedStart) onMapPickedStart({ ...coords, label: 'Picked from Map' });
  }, [onMapPickedStart]);

  const routePolyline = activeRoute ? activeRoute.map(p => [p.latitude, p.longitude]) : null;

  // Tracks current zoom level to conditionally show POIs and hint
  function ZoomTracker() {
    const map = useMap();
    useEffect(() => {
      const onZoom = () => setCurrentZoom(map.getZoom());
      map.on('zoomend', onZoom);
      return () => map.off('zoomend', onZoom);
    }, [map]);
    return null;
  }

  const poiCount = pois.hospitals.length + pois.restaurants.length + pois.hotels.length;

  return (
    <div className="map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={5}
        minZoom={2}
        maxZoom={19}
        worldCopyJump={true}
        className="leaflet-map"
      >
        <ResizeHandler layoutMode={layoutMode} />
        <ZoomTracker />

        {/* ── Tile Layers ── */}
        <LayersControl position="topright">
          {/* Normal Map */}
          <BaseLayer checked name="Map (Light)">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
              minZoom={2}
              maxZoom={19}
            />
          </BaseLayer>

          {/* Dark Map */}
          <BaseLayer name="Map (Dark)">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CartoDB'
              minZoom={2}
              maxZoom={19}
            />
          </BaseLayer>

          {/* Terrain */}
          <BaseLayer name="Terrain">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenTopoMap'
              minZoom={2}
              maxZoom={17}
            />
          </BaseLayer>

          {/* Satellite + Labels */}
          <BaseLayer name="Satellite">
            <LayerGroup>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri'
                minZoom={2}
                maxZoom={19}
                maxNativeZoom={17}
              />
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayerGroup>
          </BaseLayer>
        </LayersControl>

        <MapController
          center={userLocation}
          onPOIUpdate={handlePOIUpdate}
          onBoundsChange={onBoundsChange}
          isPickingFromMap={isPickingFromMap}
          onMapClick={handleMapClick}
        />
        <FlyToHandler flyTo={flyTo} />
        <LocateMeButton onLocate={(coords) => console.log('Location Found:', coords)} />

        {/* User Location */}
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
              <Popup><strong>📍 Your Location</strong></Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lon]}
              radius={500}
              pathOptions={{ color: '#00c8ff', fillColor: '#00c8ff', fillOpacity: 0.08, weight: 1 }}
            />
          </>
        )}

        {/* Picked Start Point */}
        {pickedStart && (
          <Marker position={[pickedStart.lat, pickedStart.lng]} icon={pickedStartIcon}>
            <Popup><strong>🟢 Start Point</strong></Popup>
          </Marker>
        )}

        {/* Route */}
        {routePolyline && (
          <>
            <Polyline positions={routePolyline} pathOptions={{ color: '#1a56db', weight: 10, opacity: 0.25 }} />
            <Polyline positions={routePolyline} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
          </>
        )}

        {/* EV Stations */}
        {stations.map(station =>
          station.latitude && station.longitude && (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={station.isAvailable
                ? availableIcon(station.providerLogo?.charAt(0) || '⚡')
                : unavailableIcon(station.providerLogo?.charAt(0) || '⚡')}
            >
              <Popup className="station-popup-container">
                <div className="station-popup">
                  <div className={`popup-status ${station.isAvailable ? 'available' : 'unavailable'}`}>
                    {station.isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </div>
                  <h3 className="popup-name">{station.name}</h3>
                  <p className="popup-address">📍 {station.address}</p>
                  <div className="popup-stats">
                    <div className="popup-stat"><span className="stat-icon">🔌</span><span>{station.connectorType}</span></div>
                    <div className="popup-stat"><span className="stat-icon">⚡</span><span>{station.power} kW</span></div>
                  </div>
                  <div className="popup-actions">
                    <button className="popup-btn primary" onClick={() => onSelectStation?.(station)}>View Details</button>
                    {onGetDirections && (
                      <button className="popup-btn secondary" onClick={() => onGetDirections(station)}>Directions</button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        )}

        {/* POI Pin Markers — only when zoom >= POI_MIN_ZOOM */}
        {currentZoom >= POI_MIN_ZOOM && (
          <>
            {showHospitals   && <POIMarkers pois={pois.hospitals}   icon={hospitalIcon}   label="Hospital"   badgeColor="#ef4444" />}
            {showRestaurants && <POIMarkers pois={pois.restaurants} icon={restaurantIcon} label="Restaurant" badgeColor="#f97316" />}
            {showHotels      && <POIMarkers pois={pois.hotels}      icon={hotelIcon}      label="Hotel"      badgeColor="#6366f1" />}
          </>
        )}

      </MapContainer>

      {/* Zoom-out hint
      {currentZoom < POI_MIN_ZOOM && (
        <div className="zoom-hint-overlay">
          🔍 Zoom in to level {POI_MIN_ZOOM}+ to see nearby hospitals, restaurants & hotels
        </div>
      )} */}

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item"><div className="legend-dot green"></div><span>Available</span></div>
        <div className="legend-item"><div className="legend-dot red"></div><span>Unavailable</span></div>
        <div className="legend-item"><div className="legend-dot blue"></div><span>You</span></div>
        <div className="legend-divider"></div>
        <div className="legend-item">
          <div className="legend-pin" style={{ background: '#ef4444' }}>🏥</div><span>Hospital</span>
        </div>
        <div className="legend-item">
          <div className="legend-pin" style={{ background: '#f97316' }}>🍽️</div><span>Restaurant</span>
        </div>
        <div className="legend-item">
          <div className="legend-pin" style={{ background: '#6366f1' }}>🏨</div><span>Hotel</span>
        </div>
      </div>

      {/* POI Toggle Panel */}
      <div className="poi-toggle-panel">
        <span className="poi-toggle-title">Show Nearby</span>
        <label className="poi-toggle">
          <input type="checkbox" checked={showHospitals} onChange={e => setShowHospitals(e.target.checked)} />
          <span className="poi-toggle-dot" style={{ background: '#ef4444' }}></span> 🏥 Hospitals
          {showHospitals && currentZoom >= POI_MIN_ZOOM && (
            <span className="poi-count">{pois.hospitals.length}</span>
          )}
        </label>
        <label className="poi-toggle">
          <input type="checkbox" checked={showRestaurants} onChange={e => setShowRestaurants(e.target.checked)} />
          <span className="poi-toggle-dot" style={{ background: '#f97316' }}></span> 🍽️ Restaurants
          {showRestaurants && currentZoom >= POI_MIN_ZOOM && (
            <span className="poi-count">{pois.restaurants.length}</span>
          )}
        </label>
        <label className="poi-toggle">
          <input type="checkbox" checked={showHotels} onChange={e => setShowHotels(e.target.checked)} />
          <span className="poi-toggle-dot" style={{ background: '#6366f1' }}></span> 🏨 Hotels
          {showHotels && currentZoom >= POI_MIN_ZOOM && (
            <span className="poi-count">{pois.hotels.length}</span>
          )}
        </label>
        {currentZoom < POI_MIN_ZOOM && (
          <p className="poi-zoom-hint">Zoom to level {POI_MIN_ZOOM}+ to load POIs</p>
        )}
        {currentZoom >= POI_MIN_ZOOM && poiCount === 0 && (
          <p className="poi-zoom-hint">No POIs found in this area</p>
        )}
      </div>

      <div className="map-count-badge">⚡ {stations.length} stations nearby</div>
    </div>
  );
}

export default MapView;
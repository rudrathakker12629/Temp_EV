import React from 'react';
import './StationList.css';

function StationCard({ station, isActive, isFavorite, onSelect, onFavorite, onNavigate }) {
  const pct = Math.round((station.availablePlugs / station.totalPlugs) * 100);

  return (
    <div
      className={`cs-card${isActive ? ' active' : ''}`}
      onClick={() => onSelect(station)}
    >
      <div className={`cs-card-bar ${station.isAvailable ? '' : 'off'}`} />

      <div className="cs-card-head">
        <div className="cs-card-title-wrap">
          <div className="cs-card-title">{station.name}</div>
          <div className="cs-card-addr">📍 {station.address}</div>
        </div>
        <div className={`cs-badge ${station.isAvailable ? 'on' : 'off'}`}>
          {station.isAvailable ? 'Open' : 'Busy'}
        </div>
      </div>

      <div className="cs-prog-wrap">
        <div className="cs-prog-info">
          <span>Plugs available</span>
          <span>{station.availablePlugs}/{station.totalPlugs}</span>
        </div>
        <div className="cs-prog-track">
          <div className="cs-prog-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="cs-card-meta">
        <span className="cs-tag">⚡ {station.power} kW</span>
        <span className="cs-tag">⏱ {station.waitTime}</span>
        <span className="cs-tag">📍 {station.distance} km</span>
        <span className="cs-tag">{station.price}</span>
      </div>

      <div className="cs-card-foot">
        <div className="cs-rating">
          <span className="cs-stars">{'★'.repeat(Math.floor(station.rating))}</span>
          <span className="cs-rv"> {station.rating}</span>
          <span className="cs-rc"> ({station.totalReviews})</span>
        </div>
        <div className="cs-card-btns">
          <button
            className={`cs-btn-fav${isFavorite ? ' on' : ''}`}
            onClick={e => { e.stopPropagation(); onFavorite(station.id); }}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
          <button
            className="cs-btn-go"
            onClick={e => { e.stopPropagation(); onNavigate(station); }}
          >
            Go →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StationList({
  stations = [], activeStation, favorites = new Set(),
  onSelect, onFavorite, onNavigate
}) {
  const available = stations.filter(s => s.isAvailable).length;
  const avgDist = stations.length
    ? (stations.reduce((a, s) => a + s.distance, 0) / stations.length).toFixed(1)
    : 0;

  return (
    <aside className="cs-sidebar">

      <div className="cs-stats-row">
        <div className="cs-stat">
          <div className="cs-stat-n">{stations.length}</div>
          <div className="cs-stat-l">Total</div>
        </div>
        <div className="cs-stat">
          <div className="cs-stat-n green">{available}</div>
          <div className="cs-stat-l">Available</div>
        </div>
        <div className="cs-stat">
          <div className="cs-stat-n red">{stations.length - available}</div>
          <div className="cs-stat-l">Busy</div>
        </div>
        <div className="cs-stat">
          <div className="cs-stat-n">{avgDist}<small>km</small></div>
          <div className="cs-stat-l">Avg Dist</div>
        </div>
      </div>

      <div className="cs-sec-head">
        <div className="cs-sec-title">Nearby Stations</div>
        <div className="cs-sec-count">{stations.length} stations</div>
      </div>

      <div className="cs-list">
        {stations.length === 0 ? (
          <div className="cs-empty">
            <div className="cs-empty-icon">🔍</div>
            <div className="cs-empty-text">No stations match your filters</div>
          </div>
        ) : (
          stations.map(s => (
            <StationCard
              key={s.id}
              station={s}
              isActive={activeStation?.id === s.id}
              isFavorite={favorites.has(s.id)}
              onSelect={onSelect}
              onFavorite={onFavorite}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>

    </aside>
  );
}
import React, { useState } from 'react';
import './Header.css';

export default function Header({ onSearch, onViewChange, currentView }) {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="cs-header">

      <a className="cs-logo" href="/">
        <div className="cs-logo-bolt">⚡</div>
        <span className="cs-logo-text">Charge<em>Saathi</em></span>
      </a>

      <div className="cs-hero-wrap">
        <div className="cs-hero-search">
          <svg className="cs-hs-icon" width="15" height="15"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search location, area or EV station…"
            value={query}
            onChange={handleChange}
          />
          <span className="cs-hs-hint">⌘K</span>
        </div>
      </div>

      <div className="cs-header-right">
        <div className="cs-view-seg">
          {['map', 'both', 'list'].map(v => (
            <button
              key={v}
              className={`cs-view-btn${currentView === v ? ' active' : ''}`}
              onClick={() => onViewChange?.(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button className="cs-hdr-action" title="Favourites">
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

    </header>
  );
}
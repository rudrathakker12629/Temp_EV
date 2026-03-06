import React, { useState } from 'react';
import './SearchFilter.css';

const FILTERS = [
  { label: 'All',         key: 'all' },
  { label: '● Available', key: 'available' },
  { label: '⚡ 50+ kW',  key: 'fast' },
  { label: '🔌 CCS',     key: 'ccs' },
  { label: '🔌 Type 2',  key: 'type2' },
];

export default function SearchFilter({ onFilterChange, onStationSearch }) {
  const [query, setQuery]         = useState('');
  const [activeFilter, setFilter] = useState('all');

  const handleSearch = (e) => {
    setQuery(e.target.value);
    onStationSearch?.(e.target.value);
  };

  const handleFilter = (key) => {
    setFilter(key);
    onFilterChange?.(key);
  };

  const clearSearch = () => {
    setQuery('');
    onStationSearch?.('');
  };

  return (
    <div className="cs-sf">

      <div className="cs-sf-search">
        <svg className="cs-sf-icon" width="14" height="14"
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Filter stations by name or provider…"
          value={query}
          onChange={handleSearch}
        />
        {query && (
          <button className="cs-sf-clear" onClick={clearSearch}>✕</button>
        )}
      </div>

      <div className="cs-sf-chips">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`cs-chip${activeFilter === f.key ? ' active' : ''}`}
            onClick={() => handleFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

    </div>
  );
}
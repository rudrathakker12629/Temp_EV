import React, { useState } from 'react';
import { stationAPI } from '../../services/api';
import './StationDetails.css';

function StationDetails({ station, onClose, onToggleFavorite, isFavorite, userLocation, onGetDirections }) {
  const [reportStatus, setReportStatus] = useState(null);
  const [reporting, setReporting] = useState(false);

  if (!station) return null;

  // Report availability
  const handleReport = async (isAvailable) => {
    setReporting(true);
    try {
      const result = await stationAPI.reportAvailability(station.id, isAvailable);
      if (result.success) {
        setReportStatus(isAvailable ? 'available' : 'unavailable');
        setTimeout(() => setReportStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error reporting:', error);
    } finally {
      setReporting(false);
    }
  };

  // Opens the RoutePanel via Home.jsx (mirrors route.js setDestination flow)
  const handleGetDirections = () => {
    if (onGetDirections) {
      onGetDirections(station);
      onClose(); // close details so route panel is visible
    }
  };

  return (
    <div className="details-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close Button */}
        <button className="details-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="details-header">
          <div className="details-provider-badge">{station.providerLogo}</div>
          <div className="details-header-info">
            <span className="details-provider-name">{station.provider}</span>
            <h2 className="details-name">{station.name}</h2>
            <p className="details-address">📍 {station.address}</p>
          </div>
          <button
            className={`details-fav-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite && onToggleFavorite(station)}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Status Banner */}
        <div className={`details-status ${station.isAvailable ? 'available' : 'unavailable'}`}>
          <div className="status-left">
            <span className="status-dot"></span>
            <span className="status-text">
              {station.isAvailable ? 'Currently Available' : 'Currently Unavailable'}
            </span>
            <span className="status-plugs">
              {station.availablePlugs}/{station.totalPlugs} plugs free
            </span>
          </div>
          <span className="status-updated">Updated: {station.lastUpdated}</span>
        </div>

        {/* Details Grid */}
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-icon">🔌</span>
            <div>
              <span className="detail-label">Connector Types</span>
              <div className="detail-connectors">
                {(station.connectors || [station.connectorType]).map((c, i) => (
                  <span key={i} className="connector-tag">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">⚡</span>
            <div>
              <span className="detail-label">Power Output</span>
              <span className="detail-value highlight">{station.power} kW</span>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💰</span>
            <div>
              <span className="detail-label">Charging Price</span>
              <span className="detail-value">{station.price}</span>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🕐</span>
            <div>
              <span className="detail-label">Operating Hours</span>
              <span className="detail-value">{station.operatingHours}</span>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <div>
              <span className="detail-label">Distance</span>
              <span className="detail-value">{station.distance} km away</span>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">⏱</span>
            <div>
              <span className="detail-label">Wait Time</span>
              <span className="detail-value">{station.waitTime}</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="details-rating">
          <div className="rating-stars">
            {'⭐'.repeat(Math.floor(station.rating))}
            <span className="rating-number">{station.rating}</span>
          </div>
          <span className="rating-reviews">{station.totalReviews} reviews</span>
        </div>

        {/* Amenities */}
        {station.amenities?.length > 0 && (
          <div className="details-section">
            <h4 className="section-title">Amenities</h4>
            <div className="amenities-grid">
              {station.amenities.map((a, i) => (
                <div key={i} className="amenity-item">
                  <span>{getAmenityIcon(a)}</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Availability */}
        <div className="details-section">
          <h4 className="section-title">Report Availability</h4>
          <p className="report-desc">
            Help other EV drivers by updating this station's current status
          </p>
          {reportStatus && (
            <div className={`report-success ${reportStatus}`}>
              ✅ Thank you! Reported as {reportStatus}
            </div>
          )}
          <div className="report-buttons">
            <button
              className="report-btn available"
              onClick={() => handleReport(true)}
              disabled={reporting}
            >
              ✅ Available Now
            </button>
            <button
              className="report-btn unavailable"
              onClick={() => handleReport(false)}
              disabled={reporting}
            >
              ❌ Not Available
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="details-actions">
          <button
            className="action-btn primary full-width"
            onClick={handleGetDirections}
          >
            📍 Get Directions
          </button>
        </div>
      </div>
    </div>
  );
}

function getAmenityIcon(amenity) {
  const icons = {
    'WiFi': '📶', 'Restroom': '🚻', 'Cafe': '☕', 'Parking': '🅿️',
    'Security': '🔒', 'CCTV': '📹', 'ATM': '💳', 'Shopping': '🛍️',
    'Food Court': '🍔', 'Waiting Lounge': '💺', 'Waiting Area': '💺',
    'Convenience Store': '🪑', 'Petrol Pump': '⛽', 'Shopping Mall': '🏬'
  };
  return icons[amenity] || '✔';
}

export default StationDetails;
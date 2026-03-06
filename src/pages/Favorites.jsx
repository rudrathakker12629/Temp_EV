import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import StationList from '../components/StationList/StationList';
import { useFavorites } from '../hooks/useApp';
import './Favorites.css';

function Favorites() {
  const { favorites, favoriteIds, toggleFavorite, loadFavorites, loading } = useFavorites();

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <div className="favorites-page">
      <div className="favorites-inner">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">❤️ My Favorites</h1>
            <p className="page-subtitle">
              Your saved EV charging stations for quick access
            </p>
          </div>
          <div className="favorites-count-badge">
            {favoriteIds.length} saved
          </div>
        </div>

        {/* Empty State */}
        {!loading && favorites.length === 0 && (
          <div className="favorites-empty">
            <div className="empty-illustration">💛</div>
            <h2>No favorites yet</h2>
            <p>
              Browse charging stations and tap the heart icon
              to save your favorite spots for quick access.
            </p>
            <Link to="/" className="browse-btn">
              ⚡ Browse Stations
            </Link>
          </div>
        )}

        {/* Favorites List */}
        {(loading || favorites.length > 0) && (
          <StationList
            stations={favorites}
            onToggleFavorite={toggleFavorite}
            favoriteIds={favoriteIds}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

export default Favorites;

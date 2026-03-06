// ============================================================
// CUSTOM HOOKS
// Reusable logic for favorites and geolocation
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { favoritesAPI } from '../services/api';

// ─── useFavorites Hook ───────────────────────────────────────
export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ev_favorites') || '[]');
    setFavoriteIds(saved);
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (station) => {
    const isFav = favoriteIds.includes(station.id);
    try {
      if (isFav) {
        await favoritesAPI.remove(station.id);
        setFavoriteIds(prev => prev.filter(id => id !== station.id));
        setFavorites(prev => prev.filter(s => s.id !== station.id));
      } else {
        await favoritesAPI.add(station.id);
        setFavoriteIds(prev => [...prev, station.id]);
        setFavorites(prev => [...prev, station]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favoriteIds]);

  // Check if a station is favorited
  const isFavorite = useCallback((stationId) => {
    return favoriteIds.includes(stationId);
  }, [favoriteIds]);

  // Load full favorite stations data
  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const result = await favoritesAPI.getAll();
      if (result.success) {
        setFavorites(result.data);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    favoriteIds,
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    loadFavorites,
    favoritesCount: favoriteIds.length
  };
};

// ─── useGeolocation Hook ─────────────────────────────────────
export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError('Unable to get your location. Using default location (Rajkot).');
        setLoading(false);
        // Fallback to Rajkot center
        setLocation({
          lat: parseFloat(process.env.REACT_APP_DEFAULT_LAT) || 22.3039,
          lon: parseFloat(process.env.REACT_APP_DEFAULT_LON) || 70.8022
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { location, error, loading, getLocation };
};

// ─── useStationFilter Hook ────────────────────────────────────
export const useStationFilter = (stations) => {
  const [filters, setFilters] = useState({
    search: '',
    connectorType: 'all',
    availability: 'all',
    minPower: 0,
    sortBy: 'distance'
  });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      connectorType: 'all',
      availability: 'all',
      minPower: 0,
      sortBy: 'distance'
    });
  }, []);

  // Apply filters
  const filteredStations = stations.filter(station => {
    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        station.name.toLowerCase().includes(q) ||
        station.address.toLowerCase().includes(q) ||
        station.provider.toLowerCase().includes(q);
      if (!match) return false;
    }
    // Connector type filter
    if (filters.connectorType !== 'all') {
      const hasConnector = station.connectors.some(c =>
        c.toLowerCase().includes(filters.connectorType.toLowerCase())
      );
      if (!hasConnector) return false;
    }
    // Availability filter
    if (filters.availability === 'available' && !station.isAvailable) return false;
    if (filters.availability === 'unavailable' && station.isAvailable) return false;
    // Power filter
    if (filters.minPower > 0 && station.power < filters.minPower) return false;
    return true;
  });

  // Sort stations
  const sortedStations = [...filteredStations].sort((a, b) => {
    switch (filters.sortBy) {
      case 'distance': return a.distance - b.distance;
      case 'power': return b.power - a.power;
      case 'rating': return b.rating - a.rating;
      case 'price': return parseFloat(a.price) - parseFloat(b.price);
      default: return 0;
    }
  });

  return {
    filteredStations: sortedStations,
    filters,
    updateFilter,
    resetFilters,
    totalResults: sortedStations.length
  };
};

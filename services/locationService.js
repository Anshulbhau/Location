import * as Location from 'expo-location';
import { insertLocationData } from '../constants/supabaseConfig';
import { calculateDistance, calculateSpeed } from '../utils/haversine';

export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
};

export const getCurrentLocation = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return location;
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

export const calculateLocationSpeed = (previousLocation, currentLocation, timeMs) => {
  if (!previousLocation || !currentLocation || timeMs <= 0) {
    return 0;
  }

  const oldLat = previousLocation.coords.latitude;
  const oldLon = previousLocation.coords.longitude;
  const newLat = currentLocation.coords.latitude;
  const newLon = currentLocation.coords.longitude;

  const distanceKm = calculateDistance(oldLat, oldLon, newLat, newLon);
  const timeSeconds = timeMs / 1000;

  if (timeSeconds > 0) {
    return calculateSpeed(distanceKm, timeSeconds);
  }

  return 0;
};

export const sendLocationToSupabase = async (vehicleId, latitude, longitude, speed) => {
  try {
    const result = await insertLocationData(vehicleId, latitude, longitude, speed);
    return result.success;
  } catch (error) {
    console.error('Error sending to Supabase:', error);
    return false;
  }
};

export const startRealTimeTracking = async (callback, intervalMs = 5000) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: intervalMs,
      distanceInterval: 1, // Minimum change of 1 meter to trigger
    },
    callback
  );
};

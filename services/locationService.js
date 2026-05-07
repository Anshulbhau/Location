import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Alert, Linking } from 'react-native';
import { insertLocationData } from '../constants/supabaseConfig';
import { calculateDistance, calculateSpeed } from '../utils/haversine';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

let lastDbSyncTime = 0;

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Error:', error);
    return;
  }
  if (data) {
    const now = Date.now();
    if (now - lastDbSyncTime < 4500) { // Keep at least ~5 seconds between updates
      return;
    }
    lastDbSyncTime = now;

    const { locations } = data;
    const location = locations[0];

    try {
      const vehicleId = await AsyncStorage.getItem('tracking_vehicle_id');
      
      if (vehicleId) {
        // Calculate speed directly from OS (if available) or default to 0
        const speed = location.coords.speed && location.coords.speed >= 0 ? location.coords.speed * 3.6 : 0;
        
        // Push directly to DB so it works even if the app UI is killed
        await insertLocationData(vehicleId, location.coords.latitude, location.coords.longitude, speed);
      }

      // Emit to the foreground app to update UI (if it's running)
      DeviceEventEmitter.emit('onLocationUpdate', location);
    } catch (e) {
      console.error('Background Task Error:', e);
    }
  }
});

export const requestLocationPermission = async () => {
  try {
    const { status: fgStatus, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    
    if (fgStatus !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(
          "Permission Required",
          "Location permission is required to track trips. Please enable it in your device Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      } else {
        Alert.alert("Permission Required", "Please grant location access to track trips.");
      }
      return false;
    }

    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
         console.log('Background permission not granted, app will only track in foreground');
      }
    } catch (bgError) {
      console.log('Error requesting background permission (likely Android 11+ restriction):', bgError);
      // We still return true because foreground permission is granted
    }
    return true; 
  } catch (error) {
    console.error('Error requesting foreground permission:', error);
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

export const startRealTimeTracking = async (intervalMs = 5000) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: intervalMs,
    distanceInterval: 0, // Set to 0 to force updates based on time, rather than waiting for movement
    foregroundService: {
      notificationTitle: "GPS Tracking Active",
      notificationBody: "Monitoring vehicle location in the background",
      notificationColor: "#1e40af",
    },
    showsBackgroundLocationIndicator: true,
  });
  
  // Get initial location immediately so UI doesn't have to wait for the first interval
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (loc) {
      DeviceEventEmitter.emit('onLocationUpdate', loc);
      
      const vehicleId = await AsyncStorage.getItem('tracking_vehicle_id');
      if (vehicleId) {
        const speed = loc.coords.speed && loc.coords.speed >= 0 ? loc.coords.speed * 3.6 : 0;
        await insertLocationData(vehicleId, loc.coords.latitude, loc.coords.longitude, speed);
      }
    }
  } catch (err) {
    console.log("Error fetching immediate location:", err);
  }

  return true; // We don't return a watch subscription anymore
};

export const stopRealTimeTracking = async () => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (error) {
    console.error('Error stopping background tracking:', error);
  }
};

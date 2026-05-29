import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Services & Config
import { 
  fetchVehicles, 
  fetchRoutes, 
  insertLocationData,
  startTrip,
  endTrip
} from './constants/supabaseConfig';
import { requestLocationPermission, startRealTimeTracking, stopRealTimeTracking } from './services/locationService';
import { calculateDistance } from './utils/haversine';
import { DeviceEventEmitter } from 'react-native';

// Components
import { ControlButtons } from './components/ControlButtons';
import { LocationDataDisplay } from './components/LocationDataDisplay';
import { StatusDisplay, ErrorMessage } from './components/StatusComponents';

export default function App() {
  // App Mode State: 'setup' | 'driving'
  const [appMode, setAppMode] = useState('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Selection State
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [direction, setDirection] = useState('onward');
  const [currentTripId, setCurrentTripId] = useState(null);
  
  // Tracking Configuration
  const UPDATE_INTERVAL = 5000;
  
  // Driving State
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ 
    latitude: '--', 
    longitude: '--', 
    speed: '0.00' 
  });
  const [totalUpdates, setTotalUpdates] = useState(0);

  // Refs for tracking state
  const gpsSubscriptionRef = useRef(null);
  const lastUpdateRef = useRef(null); // { latitude, longitude, timestamp }

  useEffect(() => {
    initializeData();
    
    // Listen for background updates when app is open
    const subscription = DeviceEventEmitter.addListener('onLocationUpdate', (location) => {
      processLocationUpdate(location, true);
    });

    return () => {
      stopAllTracking();
      subscription.remove();
    };
  }, []);

  const initializeData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await requestLocationPermission();

      const [vRes, rRes] = await Promise.all([
        fetchVehicles(),
        fetchRoutes()
      ]);

      if (vRes.success) setVehicles(vRes.data);
      if (rRes.success) setRoutes(rRes.data);
      
      if (!vRes.success || !rRes.success) {
        setErrorMessage('Failed to fetch initial data. Check connection.');
      }

      // Restore active trip after app reopen (Part 5)
      const tripId = await AsyncStorage.getItem('active_trip_id');

      if (tripId) {
        const savedVehicle =
          await AsyncStorage.getItem('active_vehicle');

        const savedRoute =
          await AsyncStorage.getItem('active_route');

        const savedDirection =
          await AsyncStorage.getItem('active_direction');

        const trackingActive =
          await AsyncStorage.getItem('tracking_active');

        if (savedVehicle)
          setSelectedVehicle(JSON.parse(savedVehicle));

        if (savedRoute)
          setSelectedRoute(JSON.parse(savedRoute));

        if (savedDirection)
          setDirection(savedDirection);

        setCurrentTripId(tripId);

        setAppMode('driving');

        if (trackingActive === 'true') {
          setIsTracking(true);
          await startRealTimeTracking(UPDATE_INTERVAL);
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Critical error during initialization.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopAllTracking = () => {
    stopRealTimeTracking();
    setIsTracking(false);
  };

  const handleStartDriving = async () => {
    if (!selectedVehicle || !selectedRoute) return;

    setIsLoading(true);
    try {
      const validDirection = direction === 'backward' ? 'backward' : 'onward';
      // 1. Create trip in database
      const tripRes = await startTrip(selectedVehicle.id, selectedRoute.id, validDirection);
      if (!tripRes.success) {
        throw new Error('Failed to create trip in database.');
      }
      const tripId = tripRes.data.id;
      setCurrentTripId(tripId);
      
      // Save vehicle ID so background task knows which vehicle is moving
      await AsyncStorage.setItem('tracking_vehicle_id', selectedVehicle.id.toString());

      // Save active trip state (Part 4)
      await AsyncStorage.multiSet([
        ['active_trip_id', tripId],
        ['active_vehicle', JSON.stringify(selectedVehicle)],
        ['active_route', JSON.stringify(selectedRoute)],
        ['active_direction', validDirection],
        ['tracking_active', 'true']
      ]);

      setAppMode('driving');
    } catch (e) {
      setErrorMessage(e.message || 'Error starting trip.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Universal location update entry point
   * Handles noise filtering, speed calculation, and DB sync
   */
  const processLocationUpdate = async (location, isFromBackground = false) => {
    const { latitude, longitude, speed: rawSpeed } = location.coords || location;
    const now = Date.now();
    
    // --- NOISE FILTER & SPEED CALCULATION ---
    let currentSpeed = rawSpeed ? rawSpeed * 3.6 : 0; // Convert m/s to km/h

    if (lastUpdateRef.current) {
      const distKm = calculateDistance(
        lastUpdateRef.current.latitude, 
        lastUpdateRef.current.longitude,
        latitude,
        longitude
      );
      
      // If movement is less than 2 meters (0.002km), treat as stationary (GPS Drift Filter)
      if (distKm < 0.002) {
        currentSpeed = 0;
      } else if (!rawSpeed && rawSpeed !== 0) {
        // If speed wasn't provided directly (some simulators), calculate it
        const timeSec = (now - lastUpdateRef.current.timestamp) / 1000;
        currentSpeed = (distKm / timeSec) * 3600;
      }
    }

    // --- STATE UPDATE ---
    setCurrentLocation({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      speed: currentSpeed.toFixed(2)
    });
    lastUpdateRef.current = { latitude, longitude, timestamp: now };

    // --- DATABASE SYNC ---
    if (!isFromBackground) {
      try {
        const res = await insertLocationData(selectedVehicle.id, latitude, longitude, currentSpeed);
        if (res.success) {
          setTotalUpdates(prev => prev + 1);
        }
      } catch (e) {
        console.error('Sync Error:', e);
      }
    } else {
      // Background task already synced to DB, just increment UI counter
      setTotalUpdates(prev => prev + 1);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      stopAllTracking();
      await AsyncStorage.setItem('tracking_active', 'false');
    } else {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) {
        setErrorMessage('Location permissions are required to track trips.');
        return;
      }
      setErrorMessage('');
      setIsTracking(true);
      await startRealTimeTracking(UPDATE_INTERVAL);
      await AsyncStorage.setItem('tracking_active', 'true');
    }
  };

  const exitDriving = async () => {
    stopAllTracking();

    if (currentTripId) {
      await endTrip(currentTripId);
      setCurrentTripId(null);
    }
    
    await AsyncStorage.removeItem('tracking_vehicle_id');

    // Cleanup on trip end (Part 6)
    await AsyncStorage.multiRemove([
      'active_trip_id',
      'active_vehicle',
      'active_route',
      'active_direction',
      'tracking_active'
    ]);

    setAppMode('setup');
    setTotalUpdates(0);
    lastUpdateRef.current = null;
    setCurrentLocation({ latitude: '--', longitude: '--', speed: '0.00' });
  };

  // --- UI Renderers ---

  const renderSetup = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Select Vehicle</Text>
      <View style={styles.listContainer}>
        {vehicles.map(v => (
          <TouchableOpacity 
            key={v.id} 
            style={[styles.listItem, selectedVehicle?.id === v.id && styles.selectedItem]}
            onPress={() => setSelectedVehicle(v)}
          >
            <Text style={[styles.itemText, selectedVehicle?.id === v.id && styles.selectedItemText]}>
              {v.vehicle_number} ({v.vehicle_type})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Select Route</Text>
      <View style={styles.listContainer}>
        {routes.map(r => (
          <TouchableOpacity 
            key={r.id} 
            style={[styles.listItem, selectedRoute?.id === r.id && styles.selectedItem]}
            onPress={() => setSelectedRoute(r)}
          >
            <Text style={[styles.itemText, selectedRoute?.id === r.id && styles.selectedItemText]}>
              {r.route_name}: {r.start_location} ➔ {r.end_location}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Direction</Text>
      <View style={styles.modeContainer}>
        <View style={styles.toggleRow}>
          <Text style={[styles.modeLabel, direction === 'onward' && styles.activeMode]}>ONWARD</Text>
          <Switch
            value={direction === 'backward'}
            onValueChange={(val) => setDirection(val ? 'backward' : 'onward')}
            trackColor={{ false: '#cbd5e1', true: '#1e40af' }}
            thumbColor="white"
          />
          <Text style={[styles.modeLabel, direction === 'backward' && styles.activeMode]}>BACKWARD</Text>
        </View>
        <Text style={styles.modeInfo}>
          {direction === 'onward' 
            ? "From start location to end location" 
            : "From end location to start location"}
        </Text>
      </View>

      <ErrorMessage message={errorMessage} />

      <TouchableOpacity 
        style={[styles.mainButton, (!selectedVehicle || !selectedRoute) && styles.disabledButton]}
        onPress={handleStartDriving}
        disabled={!selectedVehicle || !selectedRoute || isLoading}
      >
        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.mainButtonText}>PREPARE TRIP</Text>}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderDriving = () => (
    <ScrollView contentContainerStyle={styles.drivingScrollContent}>
      <View style={styles.modeIndicator}>
        <Text style={styles.modeIndicatorText}>
          MODE: 🛰️ REAL GPS
        </Text>
      </View>
      
      <StatusDisplay status={isTracking ? 'Sending' : 'Stopped'} />
      
      <View style={styles.speedometerContainer}>
        <Text style={styles.speedLabel}>CURRENT SPEED</Text>
        <Text style={styles.speedValue}>{currentLocation.speed}</Text>
        <Text style={styles.speedUnit}>KM/H</Text>
      </View>

      <LocationDataDisplay 
        latitude={currentLocation.latitude}
        longitude={currentLocation.longitude}
        speed={currentLocation.speed}
        updates={totalUpdates}
      />

      <ControlButtons 
        isTracking={isTracking}
        isLoading={false}
        isPermissionGranted={true}
        onStart={toggleTracking}
        onStop={toggleTracking}
      />

      <TouchableOpacity style={styles.exitButton} onPress={exitDriving}>
        <Text style={styles.exitButtonText}>END & EXIT TRIP</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Portal</Text>
        {selectedVehicle && <Text style={styles.headerSub}>Active: {selectedVehicle.vehicle_number}</Text>}
      </View>

      {appMode === 'setup' ? renderSetup() : renderDriving()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#1e40af', padding: 20, paddingTop: 60 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#bfdbfe', fontSize: 12, marginTop: 4 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  modeContainer: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginVertical: 10 },
  modeLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  activeMode: { color: '#1e40af' },
  modeInfo: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  listContainer: { backgroundColor: 'white', borderRadius: 12, borderOuterWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', elevation: 2 },
  listItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  selectedItem: { backgroundColor: '#eff6ff' },
  itemText: { fontSize: 15, color: '#334155' },
  selectedItemText: { color: '#1e40af', fontWeight: 'bold' },
  mainButton: { backgroundColor: '#1e40af', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, elevation: 4 },
  disabledButton: { backgroundColor: '#94a3b8' },
  mainButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  drivingScrollContent: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  modeIndicator: { backgroundColor: '#e2e8f0', padding: 6, borderRadius: 20, alignSelf: 'center', marginBottom: 10 },
  modeIndicatorText: { fontSize: 10, fontWeight: 'bold', color: '#475569', paddingHorizontal: 10 },
  speedometerContainer: { backgroundColor: 'white', padding: 30, borderRadius: 24, alignItems: 'center', marginTop: 10, elevation: 5 },
  speedLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', marginBottom: 8 },
  speedValue: { fontSize: 72, fontWeight: '900', color: '#1e40af' },
  speedUnit: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  exitButton: { padding: 15, alignItems: 'center', marginTop: 20 },
  exitButtonText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
});

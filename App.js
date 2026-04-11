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
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';

// Services & Config
import { 
  fetchVehicles, 
  fetchRoutes, 
  fetchRouteStops, 
  insertLocationData 
} from './constants/supabaseConfig';
import { RouteSimulator } from './services/simulationService';
import { requestLocationPermission, startRealTimeTracking } from './services/locationService';
import { calculateDistance } from './utils/haversine';

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
  
  // Tracking Configuration
  const [trackingMode, setTrackingMode] = useState('gps'); // 'gps' | 'simulation'
  const UPDATE_INTERVAL = 5000;
  
  // Driving State
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ 
    latitude: '--', 
    longitude: '--', 
    speed: '0.00' 
  });
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [speedFactor, setSpeedFactor] = useState(1);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Refs for tracking state
  const simulatorRef = useRef(null);
  const gpsSubscriptionRef = useRef(null);
  const lastUpdateRef = useRef(null); // { latitude, longitude, timestamp }

  useEffect(() => {
    initializeData();
    return () => stopAllTracking();
  }, []);

  const initializeData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const hasPermission = await requestLocationPermission();
      setPermissionGranted(hasPermission);

      const [vRes, rRes] = await Promise.all([
        fetchVehicles(),
        fetchRoutes()
      ]);

      if (vRes.success) setVehicles(vRes.data);
      if (rRes.success) setRoutes(rRes.data);
      
      if (!vRes.success || !rRes.success) {
        setErrorMessage('Failed to fetch initial data. Check connection.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Critical error during initialization.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopAllTracking = () => {
    simulatorRef.current?.stop();
    if (gpsSubscriptionRef.current) {
      gpsSubscriptionRef.current.remove();
      gpsSubscriptionRef.current = null;
    }
    setIsTracking(false);
  };

  const handleStartDriving = async () => {
    if (!selectedVehicle || !selectedRoute) return;

    setIsLoading(true);
    try {
      if (trackingMode === 'simulation') {
        const stopsRes = await fetchRouteStops(selectedRoute.id);
        if (stopsRes.success && stopsRes.data.length > 1) {
          simulatorRef.current = new RouteSimulator(
            stopsRes.data,
            (update) => processLocationUpdate(update),
            { speedFactor, updateInterval: UPDATE_INTERVAL }
          );
        } else {
          throw new Error('This route has no stops defined.');
        }
      }
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
  const processLocationUpdate = async (location) => {
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
      if (distKm < 0.002 && trackingMode === 'gps') {
        currentSpeed = 0;
        // Don't update coordinate display if stationary to avoid "jitter"
        setCurrentLocation(prev => ({ ...prev, speed: '0.00' }));
        return; 
      }

      // If speed wasn't provided directly (some simulators), calculate it
      if (!rawSpeed && rawSpeed !== 0) {
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
    try {
      const res = await insertLocationData(selectedVehicle.id, latitude, longitude, currentSpeed);
      if (res.success) {
        setTotalUpdates(prev => prev + 1);
      }
    } catch (e) {
      console.error('Sync Error:', e);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      stopAllTracking();
    } else {
      setIsTracking(true);
      if (trackingMode === 'gps') {
        gpsSubscriptionRef.current = await startRealTimeTracking(processLocationUpdate, UPDATE_INTERVAL);
      } else {
        simulatorRef.current?.start();
      }
    }
  };

  const exitDriving = () => {
    stopAllTracking();
    setAppMode('setup');
    setTotalUpdates(0);
    lastUpdateRef.current = null;
    setCurrentLocation({ latitude: '--', longitude: '--', speed: '0.00' });
  };

  // --- UI Renderers ---

  const renderSetup = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.modeContainer}>
        <Text style={styles.sectionTitle}>Tracking Mode</Text>
        <View style={styles.toggleRow}>
          <Text style={[styles.modeLabel, trackingMode === 'gps' && styles.activeMode]}>REAL GPS</Text>
          <Switch
            value={trackingMode === 'simulation'}
            onValueChange={(val) => setTrackingMode(val ? 'simulation' : 'gps')}
            trackColor={{ false: '#cbd5e1', true: '#1e40af' }}
            thumbColor="white"
          />
          <Text style={[styles.modeLabel, trackingMode === 'simulation' && styles.activeMode]}>SIMULATION</Text>
        </View>
        <Text style={styles.modeInfo}>
          {trackingMode === 'gps' 
            ? "Uses your phone's actual location with drift filtering." 
            : "Follows a database route (good for room testing)."}
        </Text>
      </View>

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
    <View style={styles.drivingContainer}>
      <View style={styles.modeIndicator}>
        <Text style={styles.modeIndicatorText}>
          MODE: {trackingMode === 'gps' ? '🛰️ REAL GPS' : '🤖 SIMULATION'}
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

      {trackingMode === 'simulation' && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Simulation Speed: {speedFactor}x</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={speedFactor}
            onValueChange={(val) => {
              setSpeedFactor(val);
              simulatorRef.current?.setSpeed(val);
            }}
            minimumTrackTintColor="#1e40af"
            maximumTrackTintColor="#cbd5e1"
            thumbTintColor="#1e40af"
          />
        </View>
      )}

      <ControlButtons 
        isTracking={isTracking}
        isLoading={false}
        isPermissionGranted={permissionGranted}
        onStart={toggleTracking}
        onStop={toggleTracking}
      />

      <TouchableOpacity style={styles.exitButton} onPress={exitDriving}>
        <Text style={styles.exitButtonText}>END & EXIT TRIP</Text>
      </TouchableOpacity>
    </View>
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
  drivingContainer: { flex: 1, padding: 16 },
  modeIndicator: { backgroundColor: '#e2e8f0', padding: 6, borderRadius: 20, alignSelf: 'center', marginBottom: 10 },
  modeIndicatorText: { fontSize: 10, fontWeight: 'bold', color: '#475569', paddingHorizontal: 10 },
  speedometerContainer: { backgroundColor: 'white', padding: 30, borderRadius: 24, alignItems: 'center', marginTop: 10, elevation: 5 },
  speedLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', marginBottom: 8 },
  speedValue: { fontSize: 72, fontWeight: '900', color: '#1e40af' },
  speedUnit: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  sliderContainer: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginTop: 20 },
  sliderLabel: { fontSize: 14, color: '#444', marginBottom: 10, fontWeight: '600' },
  exitButton: { padding: 15, alignItems: 'center', marginTop: 20 },
  exitButtonText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
});

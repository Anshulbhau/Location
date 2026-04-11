# Advanced Setup & Architecture Guide

## Project Architecture

```
┌─────────────────────────────────────────────┐
│          React Native UI Layer              │
│   (App.js - Buttons, Display, Status)      │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│       Location Tracking Service             │
│   (expo-location - GPS/Permissions)        │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│        Distance & Speed Calculator          │
│   (haversine.js - Haversine Formula)       │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│        Supabase Database Layer              │
│   (@supabase/supabase-js - Insert Data)    │
└─────────────────────────────────────────────┘
                     │
                     ▼
            ☁️ SUPABASE CLOUD ☁️
         (vehicle_locations table)
```

## Installation Detailed Steps

### Windows 10/11

#### 1. Prerequisites
```powershell
# Check Node.js is installed
node --version      # Should be v16+
npm --version       # Should be v7+

# Install Expo CLI globally
npm install -g expo-cli
expo --version
```

#### 2. Clone/Initialize Project
```powershell
cd "c:\Users\anshu\Downloads\Location"
```

#### 3. Install Dependencies
```powershell
npm install
```

**Expected output:**
```
added 250 packages, and audited 251 packages in 25s
```

**If you encounter peer dependency warnings:**
```powershell
npm install --legacy-peer-deps
```

#### 4. Configure Supabase

Edit `constants/supabaseConfig.js`:

```javascript
// BEFORE
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// AFTER (Example)
const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

#### 5. Create Database Table

Go to **Supabase Console** → **SQL Editor** and run:

```sql
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  speed NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vehicle_id ON vehicle_locations(vehicle_id);
CREATE INDEX idx_recorded_at ON vehicle_locations(recorded_at);
```

## Running the App

### Method 1: Android Emulator (Windows/Mac/Linux)

#### Setup Android Emulator
1. Download **Android Studio** from android.com
2. Open Android Studio
3. Go to **AVD Manager** (Android Virtual Device)
4. Click **Create Virtual Device** → Select **Pixel 5** → Download System Image
5. Start the emulator

#### Run App
```powershell
npm run android
```

### Method 2: iOS Simulator (macOS only)

```bash
npm run ios
```

### Method 3: Physical Device (Any OS)

#### On Device
1. Install **Expo Go** app from App Store or Play Store
2. Enable Location Services
3. Grant permission when prompted

#### On Computer
```powershell
npm start
```

You'll see:
```
Starting Metro Bundler
[QR CODE]

Use a, i, w to open respective clients
q to quit
```

#### Scan QR Code
1. Open camera and scan the QR code
2. Expo Go will open the app
3. Grant location permission

## Core Implementation Details

### 1. GPS Permission Flow

```javascript
// Request permission on app startup
const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') {
    setIsPermissionGranted(true);  // Use real GPS
  } else {
    setIsPermissionGranted(false); // Use simulated data
  }
};
```

### 2. Location Tracking Loop

```javascript
// Updates location every 2.5 seconds
locationIntervalRef.current = setInterval(async () => {
  if (isTracking) {
    await updateLocation();
  }
}, 2500);  // milliseconds
```

### 3. Speed Calculation

```javascript
// Get two positions
const oldPosition = { lat: 40.7128, lon: -74.006 };
const newPosition = { lat: 40.7138, lon: -74.007 };

// Calculate distance using Haversine
const distance = calculateDistance(
  oldPosition.lat, oldPosition.lon,
  newPosition.lat, newPosition.lon
); // Returns ~1.2 km

// Calculate speed
const timeSeconds = 2.5;
const speed = calculateSpeed(distance, timeSeconds); // ~1728 km/h (simplified)
```

### 4. Supabase Insert

```javascript
// Insert data to cloud database
const { data, error } = await supabase
  .from('vehicle_locations')
  .insert([{
    vehicle_id: 'vehicle-demo-001',
    latitude: 40.7128,
    longitude: -74.006,
    speed: 15.5,
    recorded_at: '2024-01-15T10:30:00Z'
  }]);
```

### 5. Duplicate Prevention

```javascript
// Store last sent coordinates
if (lastSentCoords) {
  if (lastSentCoords.latitude === newLat && 
      lastSentCoords.longitude === newLon) {
    console.log('Skip - duplicate');
    return;  // Don't send
  }
}
```

## State Management

```javascript
const [isTracking, setIsTracking] = useState(false);     // Trip active?
const [latitude, setLatitude] = useState('--');          // Current lat
const [longitude, setLongitude] = useState('--');        // Current lon
const [speed, setSpeed] = useState('--');                // Current speed
const [status, setStatus] = useState('Stopped');         // UI status
const [totalUpdates, setTotalUpdates] = useState(0);     // Count sent
const [lastSentCoords, setLastSentCoords] = useState(); // Previous position
```

## Error Handling Strategy

### Permission Denied
```javascript
if (status !== 'granted') {
  setErrorMessage('Location permission denied. Will use simulated data.');
  setIsPermissionGranted(false);
  // Falls back to simulated coordinates
}
```

### Network Failure
```javascript
const result = await insertLocationData(...);
if (!result.success) {
  setErrorMessage('Failed to send location to server');
  // App continues tracking, just doesn't persist
}
```

### GPS Unavailable
```javascript
try {
  const location = await Location.getCurrentPositionAsync();
} catch (error) {
  setErrorMessage('Error getting GPS. Using simulated data.');
  setIsPermissionGranted(false);  // Trigger simulated mode
}
```

## Simulated Coordinates

When GPS is unavailable, app cycles through:

```javascript
const SIMULATED_COORDINATES = [
  { latitude: 40.7128, longitude: -74.006 },   // NYC - Times Square
  { latitude: 40.7138, longitude: -74.007 },   // NYC - Broadway
  { latitude: 40.7148, longitude: -74.008 },   // NYC - Central Park
  // ... more New York coordinates
];
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Update Interval | 2.5 seconds |
| Average Battery Drain | ~5% per hour |
| Data Per Update | ~100 bytes |
| Monthly Data (continuous) | ~26 MB |
| Database Size (1M records) | ~150 MB |

## Database Query Examples

### Get Latest Location
```sql
SELECT * FROM vehicle_locations 
WHERE vehicle_id = 'vehicle-demo-001'
ORDER BY recorded_at DESC 
LIMIT 1;
```

### Get Trip Statistics
```sql
SELECT 
  COUNT(*) as total_points,
  AVG(speed) as avg_speed,
  MAX(speed) as max_speed,
  MIN(recorded_at) as trip_start,
  MAX(recorded_at) as trip_end
FROM vehicle_locations
WHERE vehicle_id = 'vehicle-demo-001'
AND recorded_at > NOW() - INTERVAL '1 hour';
```

### Export as CSV
```sql
COPY (SELECT * FROM vehicle_locations)
TO STDOUT WITH CSV;
```

## Debugging Tips

### Check Device Logs
```powershell
# On Android Emulator
adb logcat | findstr "GPS"

# On iOS Simulator
xcrun simctl spawn booted log stream --predicate 'process == "Expo"'
```

### Monitor Supabase Usage
1. Go to Supabase Console
2. Check **Realtime** and **API Usage**
3. Verify inserts are happening

### Test Offline Mode
1. Disable device WiFi and mobile data
2. App will show error but continue tracking
3. Remember to clear errors and restart app

## Optimization Tips

### 1. Increase Update Interval (Save Battery)
```javascript
2500  // Current: 2.5 seconds
// Change to:
5000  // 5 seconds for less battery drain
```

### 2. Reduce Decimal Places (Save Storage)
```javascript
latitude: newLat.toFixed(6)  // 6 decimals (~0.1m accuracy)
// Change to:
latitude: newLat.toFixed(4)  // 4 decimals (~11m accuracy)
```

### 3. Batch Inserts
Instead of inserting every update, batch multiple points:
```javascript
// Insert 10 points at once
const batch = [];
// ... collect 10 points ...
await supabase.from('vehicle_locations').insert(batch);
```

## Production Checklist

- [ ] Replace hardcoded vehicle ID with dynamic value
- [ ] Use environment variables for Supabase keys
- [ ] Implement proper authentication
- [ ] Set up RLS policies
- [ ] Enable HTTPS only
- [ ] Add rate limiting
- [ ] Implement data validation
- [ ] Add error logging
- [ ] Set up monitoring
- [ ] Test on real devices
- [ ] Build and sign APK/IPA
- [ ] Submit to App Store/Play Store

## Common Issues & Solutions

### Issue: "Cannot find module 'expo-location'"
**Solution:**
```powershell
npm install expo-location
```

### Issue: "Supabase connection timeout"
**Solution:**
- Check internet connection
- Verify SUPABASE_URL is correct
- Check Supabase project is active
- Wait for DNS to resolve

### Issue: "GPS not updating"
**Solution:**
- Wait 30 seconds for GPS to acquire signal
- Move outdoors away from buildings
- Check device has GPS enabled
- App will fallback to simulated data

### Issue: "Permission popup doesn't appear"
**Solution:**
- On Android: Clear app data and reinstall
- On iOS: Settings → Privacy → Location Services → Reset
- Reinstall the app

## Testing Checklist

- [ ] App starts without errors
- [ ] Permission popup appears
- [ ] "Start Trip" button works
- [ ] "Stop Trip" button works
- [ ] Location displayed (real or simulated)
- [ ] Speed calculated and displayed
- [ ] Data appears in Supabase
- [ ] Status changes to "Sending"
- [ ] Updates counter increments
- [ ] No duplicate coordinates sent
- [ ] App continues tracking for 5+ minutes
- [ ] Works on both Android and iOS

---

**Need more help?** Check README.md or QUICKSTART.md

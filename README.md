# GPS Tracking Mobile App

A minimal React Native (Expo) app that continuously tracks GPS location and sends live bus/vehicle location data to Supabase.

## Features

✅ **Real GPS Tracking** - Uses expo-location for accurate GPS coordinates  
✅ **Speed Calculation** - Haversine formula-based speed calculation  
✅ **Supabase Integration** - Stores location data in Supabase database  
✅ **Automatic Permission Handling** - Requests location permission on startup  
✅ **Duplicate Prevention** - Skips sending duplicate coordinates  
✅ **Simulated Fallback** - Uses predefined coordinates if GPS unavailable  
✅ **Error Handling** - Graceful handling of network/permission errors  
✅ **Minimal UI** - Start/Stop buttons with live location display  

## Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Managed React Native development platform
- **expo-location** - GPS tracking and permissions
- **@supabase/supabase-js** - Supabase client library
- **Haversine Formula** - Speed calculation between coordinates

## Prerequisites

Before you start, ensure you have:

1. **Node.js** (v16+) - [Download from nodejs.org](https://nodejs.org/)
2. **Expo CLI** - Install globally: `npm install -g expo-cli`
3. **Supabase Project** - [Create at supabase.com](https://supabase.com/)
4. **iOS/Android Simulator** OR **Expo Go App** on your phone

## Project Structure

```
Location/
├── App.js                          # Main app component
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
├── constants/
│   └── supabaseConfig.js           # Supabase client setup
├── utils/
│   └── haversine.js                # Distance & speed calculation
```

## Installation

### 1. Clone/Navigate to Project

```bash
cd "c:\Users\anshu\Downloads\Location"
```

### 2. Install Dependencies

```bash
npm install
```

If you encounter issues, use:
```bash
npm install --legacy-peer-deps
```

### 3. Configure Supabase

Open `constants/supabaseConfig.js` and replace with your credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

**How to get your Supabase credentials:**

1. Go to [supabase.com](https://supabase.com/) and log in
2. Open your project
3. Click **Settings** → **API**
4. Copy the **Project URL** (SUPABASE_URL)
5. Copy the **anon public** key (SUPABASE_ANON_KEY)

### 4. Create Database Table

In Supabase, go to **SQL Editor** and run:

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

### Option 1: On Simulator (Recommended for testing)

#### iOS Simulator (macOS only)
```bash
npm run ios
```

#### Android Emulator (Windows/Mac/Linux)
```bash
npm run android
```

### Option 2: On Physical Device

```bash
npm start
```

This will show a QR code. Install **Expo Go** app on your phone and scan the QR code.

### Option 3: Web Browser (Limited GPS support)

```bash
npm run web
```

## Usage

1. **Grant Permissions** - App will ask for location permission on startup
2. **Tap "Start Trip"** - Begin tracking and sending location to Supabase
3. **Monitor Display** - View live latitude, longitude, and speed
4. **Tap "Stop Trip"** - Stop tracking

## How It Works

### 1. **GPS Tracking Flow**
```
Request Permission → Get Current Location → Calculate Speed → Send to Supabase (Every 2-3 sec)
```

### 2. **Speed Calculation**
- Uses Haversine formula to calculate distance between two coordinates
- Formula: `speed = distance / time`
- Result: km/h

### 3. **Duplicate Prevention**
- Stores last sent coordinates
- Skips sending if current location matches previous location

### 4. **Error Handling**
- If permission denied → Uses simulated data
- If GPS unavailable → Uses predefined coordinates
- Network errors logged and handled gracefully

### 5. **Simulated Mode**
If real GPS fails, app uses predefined coordinates:
```javascript
{latitude: 40.7128, longitude: -74.006}  // New York
{latitude: 40.7138, longitude: -74.007}
// ... and more
```

## Hardware Integration (ESP32 GPS Tracker)

In addition to the mobile app tracking, this system supports dedicated hardware-based GPS tracking using an **ESP32** microcontroller coupled with a **GPS module** (e.g., NEO-6M / NEO-M8N).

> [!IMPORTANT]
> **Complete End-to-End Trip Tracking Workflow:**
> 1. **Admin Starts Trip:** The administrator initiates/starts the trip via the **Admin Website/Dashboard**.
> 2. **Hardware Activation:** Once the trip is active, if the **ESP32 GPS Tracker** is powered on and has a valid satellite fix, it continuously updates the vehicle's location.
> 3. **Real-time User View:** The **User Mobile App** listens to these updates from Supabase and renders the live, moving vehicle on the map in real-time.

---

### ESP32 Arduino Firmware Code

Below is the complete C++ firmware code to be flashed onto your ESP32. It reads serial NMEA data from the GPS, filters the GPS signal for quality, prevents impossible location "jumps", and uploads the coordinates directly to the Supabase Edge Function.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ======================
// WiFi Credentials
// ======================
const char* ssid = "ENTER-YOUR-SSID";
const char* password = "ENTER PASSWORD";

// ======================
// Supabase Edge Function & Vehicle Setup
// ======================
const char* serverURL =
  "https://rpqeavqoidtwfxzmdplb.supabase.co/functions/v1/update-location";

// The vehicle ID is taken directly from your Supabase Database (e.g., vehicles table)
const char* VEHICLE_ID =
  "997d05b5-0a0b-4e88-8a99-000354a8763d";

const char* API_SECRET =
  "gps_safarsetu_x9k2m7p4q1";

// ======================
// GPS
// ======================
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

// ======================
// Timing
// ======================
unsigned long lastSent = 0;
const unsigned long INTERVAL = 2000;

// ======================
// WiFi Reconnect
// ======================
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 5000;

// ======================
// Previous Coordinates
// ======================
float lastLat = 0;
float lastLng = 0;
bool hasPreviousLocation = false;

// ======================
// Setup
// ======================
void setup() {

  Serial.begin(115200);

  // GPS RX, TX
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  connectWiFi();

  Serial.println("GPS Tracking Started");
}

// ======================
// Main Loop
// ======================
void loop() {

  // Continuously parse GPS
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // Reconnect WiFi if needed
  if (millis() - lastWifiCheck >= WIFI_CHECK_INTERVAL) {

    lastWifiCheck = millis();

    if (WiFi.status() != WL_CONNECTED) {

      Serial.println("WiFi disconnected. Reconnecting...");
      connectWiFi();
    }
  }

  // Process valid GPS updates
  if (
    gps.location.isValid() &&
    gps.location.isUpdated()
  ) {

    float lat = gps.location.lat();
    float lng = gps.location.lng();
    float speed = gps.speed.kmph();
    float heading = gps.course.deg();

    int satellites = gps.satellites.value();
    float hdop = gps.hdop.hdop();

    Serial.println("--------------------------------");
    Serial.println("Latitude: " + String(lat, 6));
    Serial.println("Longitude: " + String(lng, 6));
    Serial.println("Speed: " + String(speed));
    Serial.println("Heading: " + String(heading));
    Serial.println("Satellites: " + String(satellites));
    Serial.println("HDOP: " + String(hdop));
    Serial.println("Age: " + String(gps.location.age()));

    // ======================
    // GPS Quality Filtering
    // ======================
    bool gpsQualityGood =
      satellites >= 4 &&
      hdop > 0 &&
      hdop < 3 &&
      gps.location.age() < 3000;

    if (!gpsQualityGood) {

      Serial.println("Poor GPS quality. Skipping upload.");
      delay(10);
      return;
    }

    // ======================
    // Jump Protection
    // ======================
    if (hasPreviousLocation) {

      double distance =
        TinyGPSPlus::distanceBetween(
          lastLat,
          lastLng,
          lat,
          lng
        );

      // Reject impossible jump > 2km
      if (distance > 2000) {

        Serial.println("GPS jump detected!");
        Serial.println("Distance: " + String(distance));

        delay(10);
        return;
      }
    }

    // ======================
    // Send Every 2 sec
    // ======================
    if (millis() - lastSent >= INTERVAL) {

      sendLocation(
        lat,
        lng,
        speed,
        heading
      );

      lastLat = lat;
      lastLng = lng;
      hasPreviousLocation = true;

      lastSent = millis();
    }
  }

  delay(10);
}

// ======================
// WiFi Connect
// ======================
void connectWiFi() {

  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");

  unsigned long startAttempt = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startAttempt < 10000
  ) {

    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("\nWiFi connected!");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println("\nWiFi connection failed");
  }
}

// ======================
// Send GPS Data
// ======================
void sendLocation(
  float lat,
  float lng,
  float speed,
  float heading
) {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("No WiFi. Upload skipped.");
    return;
  }

  HTTPClient http;

  http.begin(serverURL);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-secret", API_SECRET);

  // Reduced timeout
  http.setTimeout(3000);

  // ======================
  // JSON Payload
  // ======================
  String payload = "{";

  payload += "\"vehicle_id\":\"" + String(VEHICLE_ID) + "\",";
  payload += "\"latitude\":" + String(lat, 6) + ",";
  payload += "\"longitude\":" + String(lng, 6) + ",";
  payload += "\"speed\":" + String(speed, 1) + ",";
  payload += "\"heading\":" + String(heading, 1);

  payload += "}";

  Serial.println("Sending Location...");
  Serial.println(payload);

  int responseCode = http.POST(payload);

  Serial.println("Response Code: " + String(responseCode));

  if (responseCode > 0) {

    String response = http.getString();

    Serial.println("Response:");
    Serial.println(response);

  } else {

    Serial.println("HTTP Request Failed");
  }

  http.end();
}
```

---

### Code Explanation & Key Features

This firmware is optimized for battery-operated or vehicle-connected IoT hardware. Below is a breakdown of how the logic operates:

1. **Hardware Serial Setup & GPS Parsing (`setup()` & `loop()`)**:
   - `gpsSerial.begin(9600, SERIAL_8N1, 16, 17)` configures pin `16` as RX and `17` as TX to listen to raw NMEA sentences from the GPS module.
   - The `gps.encode()` stream parser processes GPS data in real-time as it arrives.
2. **Robust WiFi Auto-Reconnect**:
   - In `loop()`, a background check is executed every 5 seconds (`WIFI_CHECK_INTERVAL = 5000`).
   - If the connection drops (e.g. vehicle moves temporarily out of cellular/WiFi range), it non-blockingly attempts reconnection without freezing the GPS parsing thread.
3. **GPS Quality & Signal Filtering**:
   - Before uploading coordinates, the firmware evaluates whether the location fix is reliable:
     - **Satellite Count (`satellites >= 4`)**: Ensures enough satellite locks for stable 3D trilateration.
     - **HDOP (`0 < hdop < 3`)**: Horizontal Dilution of Precision must be low, preventing drift.
     - **Data Freshness (`gps.location.age() < 3000` ms)**: Ensures coordinates aren't stale buffer remnants.
4. **GPS Jump Protection**:
   - To avoid anomalous GPS glitches (where the module temporarily reports coordinates thousands of miles away), the firmware uses `TinyGPSPlus::distanceBetween(lastLat, lastLng, lat, lng)`.
   - If the distance from the last known good coordinate exceeds **2,000 meters (2 km)** within a 2-second interval, the point is treated as a glitch and rejected.
5. **Rate-Limited Uploads**:
   - The device checks `millis() - lastSent >= INTERVAL` before dispatching. This guarantees data uploads occur at most once every **2 seconds** (`INTERVAL = 2000`), protecting bandwidth and preventing database bloat.
6. **Supabase Secure Communication (`sendLocation`)**:
   - An HTTP POST request is sent to the Supabase Edge Function endpoint (`update-location`).
   - A custom security token header `x-api-secret` is passed to authenticate the IoT hardware against the database/API layer.
7. **Vehicle ID Mapping (`VEHICLE_ID`)**:
   - The tracking code uses a unique `VEHICLE_ID` UUID. This ID is taken directly from your **Supabase Database** (e.g., from your `vehicles` or `trips` table) to ensure that incoming live coordinates are correctly mapped to the appropriate vehicle record in the system.

## Database Schema

```
vehicle_locations
├── id (uuid) - Primary key
├── vehicle_id (uuid) - Vehicle identifier (hardcoded: "vehicle-demo-001-xxx")
├── latitude (numeric) - GPS latitude
├── longitude (numeric) - GPS longitude
├── speed (numeric) - Speed in km/h
├── recorded_at (timestamp) - When data was recorded
└── created_at (timestamp) - When data was inserted
```

## Debugging

### Check Permissions
Device Settings → App Permissions → GPS/Location

### View Logs
In Expo terminal, you'll see all logs including:
- Permission requests
- Location updates
- Supabase insert success/failures
- Errors

### Test on Real Device
Ensure GPS is enabled and app has permission to access location.

## Configuration

### Adjust Tracking Interval
In `App.js`, modify the interval (currently 2500ms = 2.5 seconds):

```javascript
setInterval(async () => {
  await updateLocation();
}, 2500);  // Change this value
```

### Change Hardcoded Vehicle ID
In `App.js`, modify:

```javascript
const VEHICLE_ID = 'your-vehicle-id-here';
```

### Modify Simulated Coordinates
In `App.js`, update `SIMULATED_COORDINATES` array:

```javascript
const SIMULATED_COORDINATES = [
  { latitude: YOUR_LAT, longitude: YOUR_LON },
  // ... add more points
];
```

## Troubleshooting

### "Permission Denied" on Android
1. Go to **Settings** → **Apps** → **[Your App]** → **Permissions** → **Location**
2. Select **Allow all the time** or **Allow while using the app**

### "Permission Denied" on iOS
1. Go to **Settings** → **Privacy** → **Location Services**
2. Find your app and set to **Always** or **While Using**

### Supabase Connection Error
- Check SUPABASE_URL and SUPABASE_ANON_KEY in `supabaseConfig.js`
- Verify database table `vehicle_locations` exists
- Check Supabase RLS policies allow anonymous inserts

### GPS Not Working
- Ensure device has GPS enabled
- Wait a few seconds for GPS to acquire signal
- Move outdoors for better signal
- App will automatically fallback to simulated data

### App Crashes
- Check terminal for error messages
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Performance Optimization

- **Duplicate Prevention** - Reduces unnecessary database writes
- **2.5s Interval** - Balances accuracy with battery usage
- **Async Operations** - Non-blocking location updates
- **Indexed Queries** - Fast database lookups by vehicle_id

## Security Notes

⚠️ **For Production:**
- Replace hardcoded vehicle ID with proper user/auth system
- Use environment variables for Supabase credentials
- Implement proper RLS (Row Level Security) policies
- Add rate limiting to prevent abuse
- Use server tokens instead of anon keys
- Encrypt sensitive data in transit

## API Reference

### `insertLocationData(vehicleId, latitude, longitude, speed)`
Inserts a location record into Supabase.

**Parameters:**
- `vehicleId` (string) - Vehicle identifier
- `latitude` (number) - GPS latitude
- `longitude` (number) - GPS longitude
- `speed` (number) - Speed in km/h

**Returns:**
```javascript
{ success: true, data: [...] }  // On success
{ success: false, error: {...} }  // On failure
```

### `calculateDistance(lat1, lon1, lat2, lon2)`
Calculates distance between two coordinates using Haversine formula.

**Returns:** Distance in kilometers (number)

### `calculateSpeed(distanceKm, timeSeconds)`
Calculates speed given distance and time.

**Returns:** Speed in km/h (number)

## File Structure Details

### App.js
Main component containing:
- Location tracking logic
- UI components (buttons, displays)
- Supabase integration
- State management
- Permission handling

### constants/supabaseConfig.js
Supabase setup:
- Client initialization
- `insertLocationData()` function
- Error handling

### utils/haversine.js
Math utilities:
- `calculateDistance()` - Haversine formula
- `calculateSpeed()` - Speed calculation

### app.json
Expo configuration:
- App metadata
- Location permissions
- Platform-specific settings
- Splash screen config

### package.json
Project dependencies and scripts

## Deployment

### Build APK (Android)
```bash
expo build:android
```

### Build IPA (iOS)
```bash
expo build:ios
```

### Deploy to Expo
```bash
expo publish
```

## Contributing

Feel free to modify and extend this app for your needs!

## License

MIT - Use freely for personal and commercial projects

## Support

- **Expo Docs:** https://docs.expo.dev/
- **React Native Docs:** https://reactnative.dev/
- **Supabase Docs:** https://supabase.com/docs
- **Location API:** https://docs.expo.dev/versions/latest/sdk/location/

---

**Happy Tracking! 🚗📍**

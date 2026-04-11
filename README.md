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

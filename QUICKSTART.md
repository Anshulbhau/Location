# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd "c:\Users\anshu\Downloads\Location"
npm install
```

### Step 2: Get Supabase Credentials
1. Login to https://supabase.com
2. Create a new project (or use existing)
3. Navigate to Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - Anon Key → `SUPABASE_ANON_KEY`

### Step 3: Configure App
Edit `constants/supabaseConfig.js`:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';  // Your URL
const SUPABASE_ANON_KEY = 'your-anon-key';               // Your Key
```

### Step 4: Create Database Table
In Supabase SQL Editor, paste:
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

### Step 5: Run App
```bash
npm start
```

**For Android Emulator:**
```bash
npm run android
```

**For iOS Simulator (macOS):**
```bash
npm run ios
```

**For Physical Device:**
- Scan QR code with Expo Go app

## Features in the App

| Feature | Status |
|---------|--------|
| Start/Stop Tracking | ✅ Buttons |
| Live Location Display | ✅ Real-time Lat/Lon |
| Speed Calculation | ✅ Haversine formula |
| Supabase Sync | ✅ Auto send every 2-3s |
| Duplicate Prevention | ✅ Skip same coords |
| Simulated GPS | ✅ Fallback when unavailable |
| Permission Handling | ✅ Auto request |
| Error Messages | ✅ User feedback |

## File Sizes

```
App.js (~6KB)              - Main app
constants/supabaseConfig.js (~1KB) - DB config
utils/haversine.js (~1KB)  - Math utils
package.json (~1KB)        - Dependencies
app.json (~1KB)            - Expo config
README.md (~12KB)          - Full documentation
```

## Common Commands

```bash
# Start development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios

# Run on web
npm run web

# Clear cache and restart
npm start -- -c

# Install specific package
npm install package-name
```

## Vehicle ID

The app uses a hardcoded vehicle ID:
```
vehicle-demo-001-[random-string]
```

To change, edit in `App.js`:
```javascript
const VEHICLE_ID = 'your-bus-id';
```

## Testing on Real Device

1. Install **Expo Go** app from App Store/Play Store
2. Enable location services on device
3. Run `npm start`
4. Scan QR code with phone
5. Grant location permission when prompted
6. Tap "Start Trip"

## Checking Data in Supabase

1. Go to Supabase console
2. Navigate to **vehicle_locations** table
3. See live data being inserted
4. Check columns: latitude, longitude, speed, recorded_at

## Monitoring Logs

All updates are logged to terminal:
```
Location inserted successfully
UpdateLocation.coords: 40.7128, -74.006
Speed calculated: 15.43 km/h
```

## Stopping the App

- **Dev Server:** Press `q` or `Ctrl+C` in terminal
- **On Device:** Close Expo Go app or swipe up
- **Emulator:** Use close button

## Next Steps

1. ✅ Get Supabase credentials
2. ✅ Create database table
3. ✅ Update supabaseConfig.js
4. ✅ Run npm install
5. ✅ Start tracking!

---

**Need help?** Check README.md for troubleshooting

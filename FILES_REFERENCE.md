# Project Files Reference

## Core Application Files

### `App.js` (Main Application)
**Purpose:** Main React Native component  
**Size:** ~6 KB  
**Content:**
- UI components (buttons, displays, status bar)
- GPS tracking logic with intervals
- Location permission handling
- Speed calculation integration
- Supabase data insertion
- Real GPS + Simulated fallback mode

**Key Functions:**
- `startTracking()` - Begin GPS tracking
- `stopTracking()` - Stop GPS tracking
- `updateLocation()` - Fetch location and send to Supabase
- `requestLocationPermission()` - Ask for GPS permission

**Tech:** React Native, expo-location, Supabase

---

## Configuration Files

### `package.json`
**Purpose:** Project dependencies and scripts  
**Contains:**
- All npm packages needed
- Scripts: start, android, ios, web
- Expo, React Native, Supabase packages
- Build tools configuration

**Key Dependencies:**
- `expo` - Development platform
- `expo-location` - GPS/geolocation API
- `@supabase/supabase-js` - Database client
- `react-native` - Mobile framework
- `react` - UI library

---

### `app.json`
**Purpose:** Expo application configuration  
**Contains:**
- App name and version
- Platform-specific settings (iOS/Android/Web)
- Permission requirements
- Splash screen config
- Location permission descriptions

**Important:**
- iOS needs NSLocationWhenInUseUsageDescription
- Android needs ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
- Plugins define expo-location integration

---

### `babel.config.js`
**Purpose:** JavaScript transpiler configuration  
**Content:** Babel preset setup for Expo  
**Note:** Usually auto-generated but included for completeness

---

### `metro.config.js`
**Purpose:** Metro bundler configuration  
**Content:** Webpack-like bundler settings for React Native  
**Note:** Uses Expo's default configuration

---

## Database & Environment

### `constants/supabaseConfig.js`
**Purpose:** Supabase client setup  
**Exports:**
- `supabase` - Initialized Supabase client
- `insertLocationData()` - Function to insert locations

**Configuration:**
- `SUPABASE_URL` - Your project URL (must be updated)
- `SUPABASE_ANON_KEY` - Anonymous access key (must be updated)

**Usage:**
```javascript
import { insertLocationData } from './constants/supabaseConfig';
```

---

### `.env.example`
**Purpose:** Template for environment variables  
**Content:**
- SUPABASE_URL
- SUPABASE_ANON_KEY
- VEHICLE_ID
- TRACKING_INTERVAL_MS

**Note:** Copy to `.env` and fill in values (optional - can be hardcoded too)

---

### `database/setup.sql`
**Purpose:** Database schema initialization script  
**Contains:**
- CREATE TABLE vehicle_locations
- CREATE INDEXES for performance
- RLS policies for security
- Grant statements for permissions
- Example queries

**How to use:**
1. Open Supabase Console
2. Go to SQL Editor
3. Copy entire SQL into editor
4. Click Run

---

## Utility Files

### `utils/haversine.js`
**Purpose:** GPS distance and speed calculations  
**Exports:**
- `calculateDistance(lat1, lon1, lat2, lon2)` - Distance in km
- `calculateSpeed(distanceKm, timeSeconds)` - Speed in km/h

**Formula:** Haversine formula for great-circle distance  
**Accuracy:** ~100m for normal use

**Usage:**
```javascript
import { calculateDistance, calculateSpeed } from './utils/haversine';
const dist = calculateDistance(40.7128, -74.006, 40.7138, -74.007);
const speed = calculateSpeed(dist, 2.5);
```

---

## Documentation Files

### `README.md` (Main Documentation)
**Purpose:** Complete project guide  
**Sections:**
- Features overview
- Tech stack
- Prerequisites
- Installation steps
- Running the app
- How it works
- Database schema
- Configuration
- Troubleshooting
- Deployment
- API reference

**Length:** ~12 KB

---

### `QUICKSTART.md` (5-Minute Setup)
**Purpose:** Fast track to get app running  
**Content:**
- 5-step installation
- Environment setup
- Running commands
- Testing checklist

---

### `ADVANCED_SETUP.md` (Deep Dive)
**Purpose:** In-depth technical guide  
**Covers:**
- Project architecture diagram
- Detailed installation for Windows/Mac/Linux
- Running on Android/iOS devices
- Core implementation details
- State management
- Error handling strategy
- Performance metrics
- Database queries
- Production checklist
- Optimization tips

---

### `TROUBLESHOOTING.md` (Problem Solving)
**Purpose:** Debug and fix common issues  
**Sections:**
- Installation issues
- Running problems
- Location/GPS issues
- Supabase connection issues
- UI/Display issues
- Database issues
- Performance issues
- Platform-specific (iOS/Android)
- Error messages table
- Getting help strategies

---

### `.gitignore`
**Purpose:** Git ignore patterns  
**Ignores:**
- node_modules/
- .expo/ (development files)
- Build outputs
- Environment variables (.env)
- Log files
- Credentials (keys, certificates)

---

## Directory Structure

```
Location/
├── App.js                          # 🎯 Main app (START HERE)
├── app.json                        # Expo config
├── package.json                    # Dependencies
├── babel.config.js                 # JS transpiler
├── metro.config.js                 # Bundler config
├── .gitignore                      # Git ignore
├── .env.example                    # Environment template
│
├── constants/
│   └── supabaseConfig.js           # 🗄️ Database setup (FILL WITH CREDENTIALS)
│
├── utils/
│   └── haversine.js                # 📐 Math calculations
│
├── database/
│   └── setup.sql                   # 📋 Database schema (RUN IN SUPABASE)
│
└── Documentation/
    ├── README.md                   # 📖 Full guide
    ├── QUICKSTART.md               # ⚡ Quick setup
    ├── ADVANCED_SETUP.md           # 🔧 Advanced guide
    └── TROUBLESHOOTING.md          # 🐛 Debug guide
```

---

## File Modification Guide

### Files to Modify (⚠️ REQUIRED)

1. **`constants/supabaseConfig.js`**
   ```javascript
   // Replace these:
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

2. **`App.js` (Optional - Change vehicle ID)**
   ```javascript
   // Optional - customize:
   const VEHICLE_ID = 'vehicle-demo-001-xxx';
   ```

### Files to Execute (⚠️ REQUIRED)

1. **`database/setup.sql`**
   - Copy content
   - Run in Supabase SQL Editor
   - Creates table and indexes

### Files to Reference (📖 READ-ONLY)

- README.md
- QUICKSTART.md
- ADVANCED_SETUP.md
- TROUBLESHOOTING.md

### Files for Git (📝 AUTO-MANAGED)

- .gitignore - Prevents committing node_modules, .env, build files

---

## File Size Summary

| File | Size | Purpose |
|------|------|---------|
| App.js | 6 KB | Main app logic |
| README.md | 12 KB | Documentation |
| ADVANCED_SETUP.md | 10 KB | Technical guide |
| TROUBLESHOOTING.md | 8 KB | Debug guide |
| utils/haversine.js | 1 KB | Math functions |
| constants/supabaseConfig.js | 1 KB | DB config |
| package.json | 0.5 KB | Dependencies |
| app.json | 1 KB | Expo config |
| database/setup.sql | 1 KB | DB schema |
| **Total** | **~40 KB** | (excluding node_modules) |

**node_modules size:** ~250 MB (auto-installed via npm)

---

## Quick Navigation

### 🚀 I want to start right now
→ Go to QUICKSTART.md (5 minutes)

### 📖 I need complete setup guide
→ Go to README.md (Comprehensive)

### 🔧 I need technical details
→ Go to ADVANCED_SETUP.md (Deep dive)

### 🐛 I'm getting errors
→ Go to TROUBLESHOOTING.md (Problem solving)

### 💾 I'm setting up database
→ Use database/setup.sql (Copy to Supabase)

### 📝 I'm configuring credentials
→ Edit constants/supabaseConfig.js (Add your keys)

---

## Development Workflow

### Initial Setup (One-time)
1. `npm install` - Install dependencies
2. Edit `supabaseConfig.js` - Add Supabase credentials
3. Run `database/setup.sql` - Create database table
4. `npm start` - Start development server

### Development (Repeated)
1. Make changes to `App.js` or utility files
2. Save file - Auto-reload in Expo
3. Test on device or emulator
4. Check Supabase console for data

### Debugging
1. Check terminal for error messages
2. Look at TROUBLESHOOTING.md
3. Add console.log statements
4. Use Expo DevTools (press `d` in terminal)

---

## Version Information

- React Native: 0.76.5+
- Expo: 52.0.0+
- Node.js: 16+
- Supabase: Latest
- Target Platforms: iOS 12+, Android 6+

---

## License & Credits

- React Native: MIT License
- Expo: MIT License
- Supabase: Open Source
- Haversine Formula: Public Domain Mathematical Formula

---

**Last Updated:** 2024
**Maintained For:** Expo CLI 52.x and React Native 0.76.x

For file-specific questions, check the comments at the top of each file.

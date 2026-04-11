# Troubleshooting Guide

## Installation Issues

### npm install fails

**Problem:** `npm ERR! 404 Not Found`

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Try installing again
npm install

# If still fails, use legacy peer deps
npm install --legacy-peer-deps
```

### Node version incompatible

**Problem:** `error: Node version 12 detected`

**Solution:**
```powershell
# Check Node version
node --version

# Need v16+. Download from nodejs.org if needed
# Verify:
node --version  # Should be v16.13+
```

---

## Running the App

### Expo CLI not found

**Problem:** `expo: command not found`

**Solution:**
```powershell
# Install globally
npm install -g expo-cli

# Verify
expo --version  # Should show version like 7.x.x
```

### Port 8081 already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::8081`

**Solution:**
```powershell
# Windows - Find process using port 8081
netstat -ano | findstr :8081

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or use different port
expo start --clear
```

### Android Emulator won't start

**Problem:** `Emulator is not running`

**Solution:**
1. Open **Android Studio**
2. Go to **AVD Manager**
3. Click **Play** button on device
4. Wait 1-2 minutes for emulator to boot
5. Run `npm run android` again

### iOS Simulator not available

**Problem:** `Fatal: Unable to create an iOS simulator`

**Solution:**
```bash
# macOS only - need to install iOS dev tools
xcode-select --install

# Or use physical device with Expo Go
```

---

## Location/GPS Issues

### GPS not showing coordinates

**Problem:** Latitude and longitude show `--`

**Possible Causes:**

1. **Permission not granted**
   - App shows "Permission Denied" message
   - Check device settings:
     - Android: Settings → Apps → [App] → Permissions → Location
     - iOS: Settings → Privacy → Location Services
   - Grant "Allow while using this app" or "Always"

2. **GPS signal not acquired**
   - Time to fix: 10-60 seconds on first run
   - Solution: Move outdoors, away from buildings
   - Try near a window if indoors

3. **GPS disabled on device**
   - Android: Settings → Location → Turn on
   - iOS: Settings → Privacy → Location Services → Toggle on

4. **Simulated mode (fallback)**
   - If GPS fails, app automatically uses predefined coordinates
   - Check if error message shows: "Using simulated data"
   - This is normal behavior - app gracefully degrades

**Debug Logs:**
```
✅ Correct - Shows "Sending" status
❌ Wrong - Shows "Stopped" after starting
❌ Wrong - Shows error about permissions
```

### Speed showing 0 km/h

**Problem:** Speed always shows 0 instead of movement speed

**Cause:** App needs 2+ location points to calculate speed

**Solution:**
1. Start trip
2. Wait 3-5 seconds for initial location
3. Move device 5-10 meters (walk toward window if indoors)
4. Speed will show on next update

**Note:** Speed calculation requires distance AND time between points.

### Updates counter not increasing

**Problem:** "Updates Sent" shows 0

**Causes:**
1. Tracking not started - tap "Start Trip"
2. Location permission denied
3. Duplicate coordinates being skipped (normal)
4. Supabase connection failed

**Check:**
- Is status showing "Sending"?
- Are lat/lon showing numbers or `--`?
- Any error messages visible?

---

## Supabase Connection Issues

### "Failed to send location" error

**Problem:** Error message appears instead of data saving

**Solution:**

1. **Verify Supabase credentials**
   ```javascript
   // In constants/supabaseConfig.js
   const SUPABASE_URL = 'https://your-project.supabase.co';      // ✅ Must start with https://
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI...';  // ✅ Must be 180+ chars
   ```

2. **Check database table exists**
   - Supabase Console → Tables
   - Look for `vehicle_locations` table
   - If missing, run SQL setup from `database/setup.sql`

3. **Verify permissions (RLS)**
   - Supabase Console → Authentication → Policies
   - Ensure anonymous can INSERT
   - Or disable RLS temporarily for testing:
     ```sql
     ALTER TABLE vehicle_locations DISABLE ROW LEVEL SECURITY;
     ```

4. **Check network connection**
   - Ensure device is connected to WiFi/mobile data
   - Try opening browser to google.com
   - Restart WiFi/mobile

5. **Look at browser console** (on web)
   ```javascript
   // Open DevTools (F12) and check Console tab for errors
   ```

### Cannot find Supabase credentials

**Problem:** "Where do I get SUPABASE_URL?"

**Solution:**

1. Go to https://supabase.com/
2. Log in to your account
3. Click on your project
4. Navigate to **Settings** (bottom left)
5. Click **API** tab
6. Copy values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`

**Example:**
```
Project URL: https://abcdefgh.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase project inactive

**Problem:** Error: `404 Not Found`

**Solution:**
1. Supabase projects pause after 7 days of inactivity
2. Go to supabase.com/projects
3. Click on project
4. Click **Resume** button
5. Wait 1 minute for startup
6. Try again

### Database table doesn't exist

**Problem:** Error: `relation "vehicle_locations" does not exist`

**Solution:**

1. Go to Supabase Console
2. Click **SQL Editor**
3. Paste SQL from `database/setup.sql`
4. Click **Run**
5. Verify table appears in **Tables** list

---

## UI/Display Issues

### App shows blank screen

**Problem:** White/black screen, no buttons visible

**Cause:** Likely a JavaScript error during startup

**Solution:**
1. Check terminal for red error messages
2. Look for line numbers in error
3. Common causes:
   - Supabase config is wrong
   - Wrong import paths
   - Missing dependencies

**Debug:**
```powershell
# Clear cache and restart
expo start -c

# Watch for errors in terminal
```

### Buttons don't respond

**Problem:** Clicking "Start Trip" does nothing

**Cause:** App might be frozen or state issue

**Solution:**
1. Check status shows "Sending" (blue dot)
2. Look at terminal for error messages
3. Try stopping and restarting:
   - Tap "Stop Trip"
   - Wait 2 seconds
   - Tap "Start Trip"
4. If still frozen, restart app:
   - Close app completely
   - Restart Expo Go or emulator
   - Reopen app

### Status dot not changing color

**Problem:** Dot stays red even after tapping Start

**Cause:** Tracking didn't actually start

**Check:**
- Is location permission granted?
- Any error messages?
- Are lat/lon showing values?

**Solution:**
1. Grant location permission
2. Ensure GPS is on
3. Restart app
4. Try "Start Trip" again

---

## Database/Data Issues

### No data appearing in Supabase

**Problem:** Tap "Start Trip" but data doesn't appear in table

**Troubleshooting:**

1. **Verify app is actually tracking**
   - Is status showing "Sending"?
   - Is Updates counter > 0?
   - Can you see lat/lon values?

2. **Check Supabase console**
   - Supabase Console → Tables
   - Click `vehicle_locations`
   - Refresh if needed (F5)
   - Look for recent rows

3. **Verify credentials are correct**
   ```javascript
   // constants/supabaseConfig.js - check values
   console.log('URL:', SUPABASE_URL);
   console.log('Key exists:', SUPABASE_ANON_KEY.length > 0);
   ```

4. **Check permissions**
   - Supabase Console → Authentication → Policies
   - Ensure policy allows anonymous INSERT

5. **Try manual insert**
   - Supabase Console → SQL Editor
   - Run:
   ```sql
   INSERT INTO vehicle_locations (vehicle_id, latitude, longitude, speed)
   VALUES ('test-vehicle', 40.7128, -74.006, 0);
   ```
   - If this works, issue is with app connection

### Data appearing but with wrong vehicle_id

**Problem:** Different vehicle_id than expected

**Cause:** Hardcoded vehicle ID generates random suffix

**Solution:**

1. Edit `App.js`:
   ```javascript
   // Current (random)
   const VEHICLE_ID = 'vehicle-demo-001-' + Math.random().toString(36).substring(7);
   
   // Change to (fixed)
   const VEHICLE_ID = 'bus-route-5-vehicle-1';
   ```

2. Restart app
3. New data will use fixed ID

### Duplicate data in database

**Problem:** Same coordinates appear multiple times

**This is normal** if:
- Device is stationary (same location)
- Updates happen too frequently
- Simulated mode is cycling through same points

**To prevent:**
- App already has duplicate prevention logic
- Checks if coordinates match last sent
- Skips send if duplicate

**To clean up database:**
```sql
-- Keep only latest unique locations
DELETE FROM vehicle_locations a
WHERE id NOT IN (
  SELECT MAX(id) FROM vehicle_locations b
  WHERE a.vehicle_id = b.vehicle_id
  GROUP BY b.latitude, b.longitude
);
```

---

## Performance Issues

### App is slow/laggy

**Problem:** App freezes when tracking

**Cause:** Likely too many re-renders or heavy calculations

**Solution:**
```javascript
// Increase update interval (track less frequently)
2500    // Current: every 2.5 seconds
5000    // Try 5 seconds

// Or reduce decimal precision
.toFixed(6)  // Current: 6 decimals
.toFixed(4)  // Try 4 decimals
```

### App crashes after 10 minutes

**Problem:** App closes unexpectedly

**Cause:** Memory leak or permission issue

**Solution:**
1. Check terminal for error messages
2. Restart app
3. Check device storage (need ~100MB free)
4. Clear app cache:
   - Android: Settings → Apps → [App] → Storage → Clear Cache
   - iOS: Settings → [App] → Offload App (then reinstall)

### Battery draining fast

**Problem:** Battery drops 10%+ per hour

**Solution:**
```javascript
// Increase tracking interval
2500   // Current: uses ~5% per hour
5000   // 5 seconds: uses ~2-3% per hour
10000  // 10 seconds: uses ~1-2% per hour
```

Edit `App.js`:
```javascript
setInterval(async () => {
  await updateLocation();
}, 5000);  // Change from 2500 to 5000
```

---

## iOS Specific Issues

### "App requires location permission"

**Problem:** Can't track on iOS

**Solution:**
1. Settings → Privacy → Location Services
2. Find app in list
3. Ensure toggle is **ON**
4. Select **Always** or **While Using the App**
5. Restart app

### Build fails on Mac

**Problem:** `Error: XCode not installed`

**Solution:**
```bash
# Install Xcode command line tools
xcode-select --install

# Wait for installation to complete
xcode-select -p  # Verify installation
```

---

## Android Specific Issues

### Permission denied on Android 12+

**Problem:** Can't get GPS even with permission granted

**Solution:**
1. Go to Settings
2. Apps & notifications → [Your App]
3. Permissions
4. Location
5. Select **Allow all the time** (not just "During app use")
6. Restart app

### Emulator GPS not working

**Problem:** Coordinates always 0,0 or invalid

**Solution:**
1. Android Studio → Extended Controls (Emulator toolbar)
2. Location
3. Set coordinates manually (e.g., 40.7128, -74.006)
4. Click **Send**
5. App should receive location

---

## Getting Help

### Enable Debug Mode

Add to `App.js` top:
```javascript
const DEBUG = true;

// Then log everything
if (DEBUG) {
  console.log('Location:', latitude, longitude);
  console.log('Status:', status);
  console.log('Updates sent:', totalUpdates);
}
```

### Export Logs

```powershell
# Save all console output
expo start > app-logs.txt 2>&1

# View logs
type app-logs.txt
```

### Check File Permissions

```powershell
# Verify files exist
ls -la App.js
ls -la constants/supabaseConfig.js
ls -la utils/haversine.js
```

### Factory Reset

If all else fails:
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse node_modules
npm install

# Clear Expo cache
expo start -c --clear

# Clear device app data
# Android: Settings → Apps → [App] → Storage → Clear All Data
# iOS: Settings → [App] → Offload App, then Reinstall
```

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'expo-location'` | Missing dependency | `npm install expo-location` |
| `Supabase connection timeout` | No internet or wrong URL | Check WiFi, verify SUPABASE_URL |
| `Permission denied` | User rejected GPS permission | Grant permission in device settings |
| `Table "vehicle_locations" does not exist` | Database not set up | Run SQL from `database/setup.sql` |
| `RLS Policy error` | Wrong Supabase policy | Disable RLS or check policy permissions |
| `App keeps crashing` | Memory leak | Restart device or clear cache |
| `Coordinates not updating` | Duplicate prevention or permission issue | Check status, wait for movement |

---

## Still Having Issues?

1. **Check logs**: Look at terminal output for error messages
2. **Restart everything**: Close app → Stop terminal → Start fresh
3. **Verify setup**: Double-check Supabase credentials
4. **Test connectivity**: Ensure device has working internet
5. **Clear cache**: `expo start -c --clear`
6. **Check docs**: See README.md or ADVANCED_SETUP.md

**For Expo support:** https://docs.expo.dev/  
**For Supabase support:** https://supabase.com/docs  
**For React Native help:** https://reactnative.dev/docs

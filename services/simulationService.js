import { calculateDistance } from '../utils/haversine';

/**
 * Simulation Engine Class
 * Simulates realistic vehicle movement over real road networks using OSRM.
 */
export class RouteSimulator {
  constructor(stops, onUpdate, options = {}) {
    this.stops = stops;
    this.onUpdate = onUpdate;
    this.speedFactor = options.speedFactor || 1;
    this.updateInterval = options.updateInterval || 3000;
    
    // Polyline routing state
    this.polyline = [];
    this.currentPolylineIndex = 0;
    this.currentDistanceOnSegment = 0;
    
    // Stop behavior state
    this.nextStopIndex = 1;
    this.stopDelayTicks = 0;
    
    this.timer = null;
    this.isRunning = false;
    this.isFetchingRoute = false;
  }

  async start() {
    if (this.isRunning) return;
    
    if (this.polyline.length === 0) {
      this.isFetchingRoute = true;
      try {
        await this.fetchRoute();
      } catch (error) {
        console.error("Failed to fetch route:", error);
        this.isFetchingRoute = false;
        return; // Don't start if routing failed
      }
      this.isFetchingRoute = false;
    }

    if (this.polyline.length < 2) return;

    this.isRunning = true;
    
    // Decouple interval from speed factor to send updates much faster.
    // Minimum 100ms interval to prevent overwhelming the database.
    this.currentIntervalDelay = Math.max(100, 2000 / this.speedFactor);
    this.timer = setInterval(() => this.tick(), this.currentIntervalDelay);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setSpeed(factor) {
    this.speedFactor = factor;
    if (this.isRunning) {
      // Restart the timer with new interval to reflect speed change
      this.stop();
      this.start();
    }
  }

  /**
   * Immediately finishes the simulation by jumping to the end of the route.
   */
  endTrip() {
    if (this.polyline.length > 0) {
      this.currentPolylineIndex = this.polyline.length - 1;
      this.currentDistanceOnSegment = 0;
      this.emitCurrentLocation(0); // Emit final location with 0 speed
    }
    this.stop();
  }

  /**
   * Fetches the real road-based route polyline from OSRM.
   */
  async fetchRoute() {
    // Build OSRM coordinate string: lng,lat;lng,lat...
    // OSRM has a URL limit, so cap at 100 coordinates if necessary
    const coordsStr = this.stops
        .slice(0, 100)
        .map(s => `${s.longitude},${s.latitude}`)
        .join(';');
        
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }
    
    // OSRM geojson geometry returns array of [longitude, latitude]
    const coordinates = data.routes[0].geometry.coordinates;
    this.polyline = coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    
    this.currentPolylineIndex = 0;
    this.currentDistanceOnSegment = 0;
    this.nextStopIndex = 1; // Start looking forward to the second stop
    this.stopDelayTicks = 0;
  }

  /**
   * Advances the vehicle along the polyline based on dynamic speed and interval.
   */
  tick() {
    // Stop if we reached the end of the route
    if (this.currentPolylineIndex >= this.polyline.length - 1) {
      this.stop();
      return;
    }

    // Handle pausing at stops
    if (this.stopDelayTicks > 0) {
      this.stopDelayTicks--;
      this.emitCurrentLocation(0); // 0 km/h while stopped
      return;
    }

    // Check distance to the next intended stop
    let distToNextStop = Infinity;
    if (this.nextStopIndex < this.stops.length) {
      const nextStop = this.stops[this.nextStopIndex];
      const currentLat = this.polyline[this.currentPolylineIndex].latitude;
      const currentLng = this.polyline[this.currentPolylineIndex].longitude;
      distToNextStop = calculateDistance(currentLat, currentLng, nextStop.latitude, nextStop.longitude);
      
      // If within 30 meters of the stop, simulate a passenger stop
      if (distToNextStop < 0.03) {
        // Random pause between 5-15 seconds
        const delaySeconds = 5 + Math.random() * 10;
        this.stopDelayTicks = Math.ceil((delaySeconds * 1000) / this.updateInterval);
        this.nextStopIndex++;
        
        this.emitCurrentLocation(0);
        return;
      }
    }

    // 1. Calculate current speed in km/h
    // Base speed varies between 40-50 km/h with random +/- 5 noise
    let currentSpeedKmh = 45 + (Math.random() * 10 - 5);
    
    // Slow down near stops (within 150 meters)
    if (distToNextStop < 0.15) {
      // Smooth deceleration down to ~15 km/h
      const slowFactor = distToNextStop / 0.15;
      currentSpeedKmh = Math.max(15, currentSpeedKmh * slowFactor);
    }

    // Slow down near the very end of the polyline
    const pointsLeft = this.polyline.length - this.currentPolylineIndex;
    if (pointsLeft < 5) {
      currentSpeedKmh = Math.max(10, currentSpeedKmh * 0.5);
    }

    // 2. Convert speed to distance to advance (in km)
    // The simulated time passed is real time (currentIntervalDelay) * speedFactor
    // Fallback to updateInterval / speedFactor if currentIntervalDelay isn't set
    const interval = this.currentIntervalDelay || (this.updateInterval / this.speedFactor);
    const simulatedTimeMs = interval * this.speedFactor;
    const timeHours = (simulatedTimeMs / 1000) / 3600;
    const distanceToMove = currentSpeedKmh * timeHours;

    // 3. Move exactly `distanceToMove` along the polyline segments
    let movedDistance = 0;
    let lat = this.polyline[this.currentPolylineIndex].latitude;
    let lng = this.polyline[this.currentPolylineIndex].longitude;

    while (movedDistance < distanceToMove && this.currentPolylineIndex < this.polyline.length - 1) {
      const startPoint = this.polyline[this.currentPolylineIndex];
      const endPoint = this.polyline[this.currentPolylineIndex + 1];
      
      const segmentDistance = calculateDistance(
        startPoint.latitude, startPoint.longitude,
        endPoint.latitude, endPoint.longitude
      );

      // Handle duplicate/zero-distance points
      if (segmentDistance === 0) {
        this.currentPolylineIndex++;
        this.currentDistanceOnSegment = 0;
        continue;
      }

      const remainingDistanceOnSegment = segmentDistance - this.currentDistanceOnSegment;
      const distanceNeeded = distanceToMove - movedDistance;

      if (distanceNeeded >= remainingDistanceOnSegment) {
        // Distance needed consumes the rest of this segment, jump to next point
        movedDistance += remainingDistanceOnSegment;
        this.currentPolylineIndex++;
        this.currentDistanceOnSegment = 0;
        lat = endPoint.latitude;
        lng = endPoint.longitude;
      } else {
        // Stop partway along the current segment, interpolate exact location
        this.currentDistanceOnSegment += distanceNeeded;
        movedDistance += distanceNeeded;
        
        const fraction = this.currentDistanceOnSegment / segmentDistance;
        lat = startPoint.latitude + (endPoint.latitude - startPoint.latitude) * fraction;
        lng = startPoint.longitude + (endPoint.longitude - startPoint.longitude) * fraction;
      }
    }

    this.emitCurrentLocation(currentSpeedKmh, lat, lng);
  }

  /**
   * Formats and emits the location update with simulated GPS noise.
   */
  emitCurrentLocation(speedKmh, lat = null, lng = null) {
    // Fallback if coordinates weren't directly provided by interpolation
    if (lat === null || lng === null) {
      if (this.currentPolylineIndex >= this.polyline.length) {
        lat = this.polyline[this.polyline.length - 1].latitude;
        lng = this.polyline[this.polyline.length - 1].longitude;
      } else {
        const startPoint = this.polyline[this.currentPolylineIndex];
        if (this.currentDistanceOnSegment > 0 && this.currentPolylineIndex < this.polyline.length - 1) {
          const endPoint = this.polyline[this.currentPolylineIndex + 1];
          const segmentDistance = calculateDistance(
            startPoint.latitude, startPoint.longitude,
            endPoint.latitude, endPoint.longitude
          );
          if (segmentDistance > 0) {
            const fraction = this.currentDistanceOnSegment / segmentDistance;
            lat = startPoint.latitude + (endPoint.latitude - startPoint.latitude) * fraction;
            lng = startPoint.longitude + (endPoint.longitude - startPoint.longitude) * fraction;
          } else {
            lat = startPoint.latitude;
            lng = startPoint.longitude;
          }
        } else {
          lat = startPoint.latitude;
          lng = startPoint.longitude;
        }
      }
    }

    // 4. Add small GPS noise (approx 1-2 meters variance)
    // Keeps it very small to maintain realism but stay on road
    const noiseFactor = 0.000015; 
    const noisyLat = lat + (Math.random() * noiseFactor - noiseFactor / 2);
    const noisyLng = lng + (Math.random() * noiseFactor - noiseFactor / 2);

    // App.js multiplies rawSpeed by 3.6 to get km/h, so we must emit in m/s
    const speedMs = speedKmh / 3.6;

    this.onUpdate({
      latitude: noisyLat,
      longitude: noisyLng,
      speed: speedMs, 
      timestamp: new Date().toISOString()
    });
  }
}

import { calculateDistance, calculateSpeed } from '../utils/haversine';

/**
 * Interpolates points between two coordinates at a fixed distance to maintain realistic speed.
 */
export const interpolatePath = (stops, targetSpeedKmh = 40, updateIntervalMs = 3000) => {
  const points = [];
  const distancePerStep = (targetSpeedKmh / 3600) * (updateIntervalMs / 1000); // km

  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i];
    const end = stops[i + 1];
    const totalDist = calculateDistance(start.latitude, start.longitude, end.latitude, end.longitude);
    const steps = Math.max(1, Math.floor(totalDist / distancePerStep));

    for (let j = 0; j < steps; j++) {
      const lat = start.latitude + (end.latitude - start.latitude) * (j / steps);
      const lon = start.longitude + (end.longitude - start.longitude) * (j / steps);
      points.push({ latitude: lat, longitude: lon, baseSpeed: targetSpeedKmh });
    }
  }
  
  // Add final stop
  const lastStop = stops[stops.length - 1];
  points.push({ latitude: lastStop.latitude, longitude: lastStop.longitude, baseSpeed: 0 });
  
  return points;
};

/**
 * Simulation Engine Class
 */
export class RouteSimulator {
  constructor(stops, onUpdate, options = {}) {
    this.stops = stops;
    this.onUpdate = onUpdate;
    this.speedFactor = options.speedFactor || 1;
    this.updateInterval = options.updateInterval || 3000;
    this.targetSpeedKmh = options.targetSpeed || 50; // default target speed
    
    this.currentIndex = 0;
    this.path = interpolatePath(this.stops, this.targetSpeedKmh, this.updateInterval);
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning || this.path.length < 2) return;
    this.isRunning = true;
    this.timer = setInterval(() => this.tick(), this.updateInterval / this.speedFactor);
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
      this.stop();
      this.start();
    }
  }

  tick() {
    if (this.currentIndex >= this.path.length - 1) {
      this.stop();
      return;
    }

    const currentPoint = this.path[this.currentIndex];
    this.currentIndex++;

    // For simulation, we report the base speed multiplied by the factor
    // This ensures consistency regardless of segment length
    const currentSpeed = currentPoint.baseSpeed * this.speedFactor;

    this.onUpdate({
      ...currentPoint,
      speed: currentSpeed,
      timestamp: new Date().toISOString()
    });
  }
}

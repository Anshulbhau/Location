// Haversine formula to calculate distance between two coordinates
// Returns distance in kilometers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// Calculate speed in km/h given distance in km and time in seconds
export const calculateSpeed = (distanceKm, timeSeconds) => {
  if (timeSeconds === 0) return 0;
  const speedKmPerHour = (distanceKm / timeSeconds) * 3600;
  return Math.round(speedKmPerHour * 100) / 100; // Round to 2 decimals
};

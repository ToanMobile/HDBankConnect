/**
 * Haversine formula to calculate great-circle distance between two GPS coordinates.
 * @returns distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const EARTH_RADIUS_METERS = 6_371_000;

  const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if a GPS coordinate is within a radius (meters) of a center point.
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusMeters: number,
): boolean {
  return (
    haversineDistance(centerLat, centerLon, pointLat, pointLon) <= radiusMeters
  );
}

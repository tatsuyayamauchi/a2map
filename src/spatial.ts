import type { Feature, Geometry, Point, Polygon, LineString } from "geojson";

const EARTH_RADIUS_METERS = 6371008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates geodesic distance between two [lng, lat] coordinates using the Haversine formula.
 */
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number],
  unit: "km" | "m" = "km"
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = EARTH_RADIUS_METERS * c;

  if (unit === "m") {
    return Math.round(distanceMeters * 10) / 10;
  }
  return Math.round((distanceMeters / 1000) * 1000) / 1000;
}

/**
 * Generates a geodesic circular polygon buffer (GeoJSON Polygon) around a center [lng, lat].
 */
export function createBuffer(
  center: [number, number],
  radiusMeters: number,
  steps: number = 64
): Feature<Polygon> {
  const [lng, lat] = center;
  const radLat = toRadians(lat);
  const radLng = toRadians(lng);
  const angularDist = radiusMeters / EARTH_RADIUS_METERS;

  const ring: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i++) {
    const bearing = (i * 2 * Math.PI) / steps;
    const ptLat = Math.asin(
      Math.sin(radLat) * Math.cos(angularDist) +
        Math.cos(radLat) * Math.sin(angularDist) * Math.cos(bearing)
    );
    const ptLng =
      radLng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDist) * Math.cos(radLat),
        Math.cos(angularDist) - Math.sin(radLat) * Math.sin(ptLat)
      );

    ring.push([Number(toDegrees(ptLng).toFixed(6)), Number(toDegrees(ptLat).toFixed(6))]);
  }

  return {
    type: "Feature",
    properties: {
      center,
      radiusMeters,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

/**
 * Extracts all coordinates from a GeoJSON geometry or feature into a flat array of [lng, lat].
 */
function extractCoordinates(
  input: Geometry | Feature | Array<[number, number]>
): Array<[number, number]> {
  if (Array.isArray(input)) {
    return input;
  }

  const geom: Geometry = "geometry" in input ? input.geometry : input;
  const coords: Array<[number, number]> = [];

  const traverse = (val: unknown) => {
    if (!Array.isArray(val)) return;
    if (val.length >= 2 && typeof val[0] === "number" && typeof val[1] === "number") {
      coords.push([val[0], val[1]]);
    } else {
      for (const item of val) {
        traverse(item);
      }
    }
  };

  if ("coordinates" in geom) {
    traverse(geom.coordinates);
  }

  return coords;
}

/**
 * Computes bounding box [minLng, minLat, maxLng, maxLat] from a geometry, feature, or array of coordinates.
 */
export function computeBBox(
  input: Geometry | Feature | Array<[number, number]>
): [number, number, number, number] {
  const coords = extractCoordinates(input);
  if (coords.length === 0) {
    return [0, 0, 0, 0];
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Calculates the geometric centroid [lng, lat] of a geometry, feature, or array of coordinates.
 */
export function getCentroid(input: Geometry | Feature | Array<[number, number]>): [number, number] {
  const coords = extractCoordinates(input);
  if (coords.length === 0) {
    return [0, 0];
  }

  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }

  return [Number((sumLng / coords.length).toFixed(6)), Number((sumLat / coords.length).toFixed(6))];
}

/**
 * Creates a GeoJSON Point feature.
 */
export function createPointFeature(
  coordinates: [number, number],
  properties: Record<string, unknown> = {}
): Feature<Point> {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates,
    },
  };
}

/**
 * Creates a GeoJSON LineString feature.
 */
export function createLineFeature(
  coordinates: Array<[number, number]>,
  properties: Record<string, unknown> = {}
): Feature<LineString> {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

export function toWktPoint(lat: number, lng: number): string {
  return `POINT(${lat} ${lng})`;
}

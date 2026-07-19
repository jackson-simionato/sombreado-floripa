export function formatNearbyRouteDistance(distanceMeters: number): string {
  if (distanceMeters < 50) {
    return "a menos de 50 m";
  }

  if (distanceMeters < 1000) {
    return `a cerca de ${new Intl.NumberFormat("pt-BR").format(
      Math.round(distanceMeters / 50) * 50
    )} m`;
  }

  return `a cerca de ${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.round(distanceMeters / 100) / 10)} km`;
}

export function formatNearbyRouteMeta(distanceMeters?: number): string {
  return distanceMeters === undefined
    ? "perto de você"
    : formatNearbyRouteDistance(distanceMeters);
}

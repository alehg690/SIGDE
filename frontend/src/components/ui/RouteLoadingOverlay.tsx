export default function RouteLoadingOverlay() {
  // Las cargas de ruta se muestran con app/loading.tsx. No interceptamos fetch:
  // una solicitud de datos puede permanecer abierta y no representa una navegación.
  return null;
}

import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Destination } from '../data/destinations';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

interface DestinationsMapProps {
  destinations: Destination[];
  selectedDestinationId?: string | null;
  userLocation?: UserCoords | null;
  routeTarget?: UserCoords | null;
  focusMode?: 'destination' | 'user' | 'route';
  onSelectDestination?: (
    destinationId: string,
    options?: { openModal?: boolean }
  ) => void;
}

export default function DestinationsMap({
  destinations,
  selectedDestinationId,
  userLocation = null,
  routeTarget = null,
  focusMode = 'destination',
  onSelectDestination,
}: DestinationsMapProps) {
  const focusedDestination =
    destinations.find((item) => item.id === selectedDestinationId) ??
    destinations[0];

  const shouldFocusUser = focusMode === 'user' && Boolean(userLocation);
  const shouldFocusRoute =
    focusMode === 'route' && Boolean(userLocation) && Boolean(routeTarget);

  const centerLat =
    shouldFocusUser && userLocation
      ? userLocation.latitude
      : shouldFocusRoute && routeTarget
        ? routeTarget.latitude
        : focusedDestination
          ? focusedDestination.latitude
          : 4.6486;

  const centerLng =
    shouldFocusUser && userLocation
      ? userLocation.longitude
      : shouldFocusRoute && routeTarget
        ? routeTarget.longitude
        : focusedDestination
          ? focusedDestination.longitude
          : -74.106;

  const zoomLevel =
    shouldFocusUser || shouldFocusRoute || selectedDestinationId ? 13 : 11;

  const markersJson = JSON.stringify(
    destinations.map((item) => ({
      id: item.id,
      name: item.name,
      locality: item.locality,
      category: item.category,
      lat: item.latitude,
      lng: item.longitude,
      isSelected: item.id === selectedDestinationId,
    }))
  );

  const userLocationJson = JSON.stringify(userLocation);
  const routeTargetJson = JSON.stringify(routeTarget);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!onSelectDestination) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'selectDestination' && typeof data.id === 'string') {
        onSelectDestination(data.id, { openModal: Boolean(data.openModal) });
      }
    } catch {
      // Ignorar mensajes no JSON
    }
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .route-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 999;
            background: rgba(27, 67, 50, 0.92);
            color: #ffffff;
            padding: 6px 10px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 12px;
            font-weight: 700;
            display: none;
          }
          .popup-btn {
            margin-top: 8px;
            display: inline-block;
            background: #1b4332;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 5px 9px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div id="routeInfo" class="route-badge"></div>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoomLevel});

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);

          function postToRN(payload) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(payload));
            }
          }

          window.openDestinationModal = function(id) {
            postToRN({ type: 'selectDestination', id: id, openModal: true });
          };

          const places = ${markersJson};
          const boundsPoints = [];

          places.forEach((place) => {
            const safeId = String(place.id).replace(/'/g, "\\\\'");
            const popupContent =
              '<b>' + place.name + '</b><br/>' +
              place.locality + ' • ' + place.category + '<br/>' +
              '<button class="popup-btn" onclick="window.openDestinationModal(\\'' + safeId + '\\')">Ver detalle y ruta</button>';

            const marker = L.marker([place.lat, place.lng])
              .addTo(map)
              .bindPopup(popupContent);

            marker.on('click', function() {
              postToRN({ type: 'selectDestination', id: place.id, openModal: false });
            });

            if (place.isSelected) {
              marker.openPopup();
            }
          });

          const userPos = ${userLocationJson};
          if (
            userPos &&
            typeof userPos.latitude === 'number' &&
            typeof userPos.longitude === 'number'
          ) {
            L.circleMarker([userPos.latitude, userPos.longitude], {
              radius: 9,
              color: '#ffffff',
              weight: 3,
              fillColor: '#1d4ed8',
              fillOpacity: 1
            })
              .addTo(map)
              .bindPopup('<b>Tu ubicación actual</b>');
            boundsPoints.push([userPos.latitude, userPos.longitude]);
          }

          const targetPos = ${routeTargetJson};
          const badgeEl = document.getElementById('routeInfo');

          if (
            userPos &&
            targetPos &&
            typeof userPos.latitude === 'number' &&
            typeof userPos.longitude === 'number' &&
            typeof targetPos.latitude === 'number' &&
            typeof targetPos.longitude === 'number'
          ) {
            boundsPoints.push([targetPos.latitude, targetPos.longitude]);

            const url =
              'https://router.project-osrm.org/route/v1/driving/' +
              userPos.longitude + ',' + userPos.latitude + ';' +
              targetPos.longitude + ',' + targetPos.latitude +
              '?overview=full&geometries=geojson';

            fetch(url)
              .then((res) => res.json())
              .then((data) => {
                if (data.routes && data.routes.length > 0) {
                  const route = data.routes[0];
                  const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
                  const polyline = L.polyline(coords, {
                    color: '#1b4332',
                    weight: 5,
                    opacity: 0.88
                  }).addTo(map);

                  const km = (route.distance / 1000).toFixed(1);
                  const mins = Math.max(1, Math.round(route.duration / 60));
                  badgeEl.textContent = km + ' km • ~' + mins + ' min';
                  badgeEl.style.display = 'block';

                  map.fitBounds(polyline.getBounds(), { padding: [28, 28] });
                } else {
                  L.polyline(
                    [
                      [userPos.latitude, userPos.longitude],
                      [targetPos.latitude, targetPos.longitude]
                    ],
                    { color: '#1b4332', weight: 3, dashArray: '6, 6' }
                  ).addTo(map);
                }
              })
              .catch(() => {
                L.polyline(
                  [
                    [userPos.latitude, userPos.longitude],
                    [targetPos.latitude, targetPos.longitude]
                  ],
                  { color: '#1b4332', weight: 3, dashArray: '6, 6' }
                ).addTo(map);
              });
          } else if (boundsPoints.length === 1) {
            map.setView(boundsPoints[0], 14);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.mapContainer}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 270,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e9ecef',
    marginBottom: 16,
  },
  webview: {
    flex: 1,
  },
});
import React from 'react';
import { MapContainer, Polygon, Polyline, Popup, useMap, Marker, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import customLayoutConfig from './config/floorPlanConfig.json';

// Helper to fit bounds to all features on mount
function FitBoundsOnLoad({ rooms, corridors, source, target, paths }) {
  const map = useMap();
  React.useEffect(() => {
    const allPoints = [];
    rooms.forEach(room => room.polygon.forEach(pt => allPoints.push(pt)));
    if (corridors) corridors.forEach(corr => corr.polygon.forEach(pt => allPoints.push(pt)));
    if (paths) paths.forEach(path => path.points.forEach(pt => allPoints.push(pt)));
    if (source) allPoints.push(source);
    if (target) allPoints.push(target);
    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [40, 40] });
    }
  }, [map, rooms, corridors, source, target, paths]);
  return null;
}

function ClickLogger() {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    console.log('Clicked coordinates:', [lat, lng]);
  });
  return null;
}

function RoomCoordsLabels({ polygon }) {
  // No longer used; coordinate labels are not shown by default
  return null;
}

function CustomLayoutMap() {
  const { center, zoom, rooms, corridors, paths, source, target } = customLayoutConfig;

  // Compute navigation path if source and target are present
  let navPath = null;
  if (source && target) {
    navPath = [source, target];
  }

  // Only render additional paths if they are not the same as navPath
  const showPaths = !navPath && paths;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: '#f8fafd', width: '100vw', height: '100vh', minHeight: 0, minWidth: 0 }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100vw', height: '100vh', minHeight: 0, minWidth: 0 }}
        whenReady={map => map.target.invalidateSize()}
      >
        <FitBoundsOnLoad rooms={rooms} corridors={corridors} source={source} target={target} paths={paths} />
        <ClickLogger />
        {/* No TileLayer, just custom layout */}
        {rooms.map(room => (
          <Polygon
            key={room.id}
            positions={room.polygon}
            pathOptions={{ color: room.color || '#3388ff', fillOpacity: 0.7, weight: 3 }}
            eventHandlers={{
              click: () => {
                console.log(`Room ${room.name || room.id} polygon:`, room.polygon);
              }
            }}
          >
            <Popup>Room {room.name || room.id}</Popup>
          </Polygon>
        ))}
        {corridors && corridors.map((corr, idx) => (
          <Polygon
            key={`corridor-${idx}`}
            positions={corr.polygon}
            pathOptions={{ color: corr.color || '#ff9800', fillOpacity: 0.4, weight: 2, dashArray: '6 6' }}
          >
            <Popup style={{background:"red"}}>Corridor</Popup>
          </Polygon>
        ))}
        {/* Only show Polyline if source and target are present */}
        {navPath && (
          <Polyline
            positions={navPath}
            pathOptions={{ color: '#43a047', weight: 6, dashArray: '10 10' }}
          />
        )}
        {/* Only render additional paths if not showing navPath */}
        {showPaths && paths.map((path, idx) => (
          <Polyline
            key={`path-${idx}`}
            positions={path.points}
            pathOptions={{ color: path.color || '#43a047', weight: 4, dashArray: '6 6' }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

export default CustomLayoutMap;

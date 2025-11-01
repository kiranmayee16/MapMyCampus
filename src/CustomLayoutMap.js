import React from 'react';
import { MapContainer, useMap, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import customLayoutConfig from './config/floorPlanConfig.json';
import RoomDropdown from './components/RoomDropdown';
import RoomPolygon from './components/RoomPolygon';
import CorridorPolygon from './components/CorridorPolygon';
import NavPathPolyline from './components/NavPathPolyline';
import OtherPathsPolylines from './components/OtherPathsPolylines';

// Helper to fit bounds to all features on mount
const FitBoundsOnLoad = React.memo(function FitBoundsOnLoad({ rooms, corridors, source, target, paths }) {
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
});

const ClickLogger = React.memo(function ClickLogger() {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    // For production, comment out or remove debug logs
    // console.log('Clicked coordinates:', [lat, lng]);
  });
  return null;
});

// RoomCoordsLabels removed (unused)

// Helper: get center of a polygon
function getPolygonCenter(polygon) {
  const l = polygon.length;
  const [sumLat, sumLng] = polygon.reduce(
    ([accLat, accLng], [lat, lng]) => [accLat + lat, accLng + lng],
    [0, 0]
  );
  return [sumLat / l, sumLng / l];
}

function getCorridorCenters(corridors) {
  if (!corridors) return [];
  return corridors.map(corr => getPolygonCenter(corr.polygon));
}

function findNearestPoint(point, points) {
  let minDist = Infinity, nearest = null;
  points.forEach(pt => {
    const d = Math.hypot(pt[0] - point[0], pt[1] - point[1]);
    if (d < minDist) {
      minDist = d;
      nearest = pt;
    }
  });
  return nearest;
}


function CustomLayoutMap() {
  const { center, zoom, rooms, corridors, paths } = customLayoutConfig;
  const [sourceRoomId, setSourceRoomId] = React.useState('');
  const [targetRoomId, setTargetRoomId] = React.useState('');

  const sourceRoom = rooms.find(r => r.id === sourceRoomId);
  const targetRoom = rooms.find(r => r.id === targetRoomId);

  // Compute navigation path if both source and target are selected
  let navPath = null;
  if (sourceRoom && targetRoom) {
    const srcCenter = getPolygonCenter(sourceRoom.polygon);
    const tgtCenter = getPolygonCenter(targetRoom.polygon);
    const corridorCenters = getCorridorCenters(corridors);
    const srcCorr = findNearestPoint(srcCenter, corridorCenters);
    const tgtCorr = findNearestPoint(tgtCenter, corridorCenters);
    navPath = [srcCenter];
    if (srcCorr) navPath.push(srcCorr);
    if (tgtCorr && tgtCorr !== srcCorr) navPath.push(tgtCorr);
    navPath.push(tgtCenter);
  }
  const showPaths = !navPath && paths;
  const roomOptions = rooms.map(room => ({ id: room.id, name: room.name || room.id }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: '#f8fafd', width: '100vw', height: '100vh', minHeight: 0, minWidth: 0 }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 6000, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px #0002' }}>
        <RoomDropdown
          label="Source"
          value={sourceRoomId}
          onChange={setSourceRoomId}
          options={roomOptions}
          excludeId={targetRoomId}
        />
        &nbsp;&nbsp;
        <RoomDropdown
          label="Destination"
          value={targetRoomId}
          onChange={setTargetRoomId}
          options={roomOptions}
          excludeId={sourceRoomId}
        />
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100vw', height: '100vh', minHeight: 0, minWidth: 0 }}
        whenReady={map => map.target.invalidateSize()}
      >
        <FitBoundsOnLoad
          rooms={rooms}
          corridors={corridors}
          source={sourceRoom && getPolygonCenter(sourceRoom.polygon)}
          target={targetRoom && getPolygonCenter(targetRoom.polygon)}
          paths={paths}
        />
        <ClickLogger />
        {rooms.map(room => (
          <RoomPolygon key={room.id} room={room} onClick={r => {}} />
        ))}
        {corridors && corridors.map((corr, idx) => (
          <CorridorPolygon key={`corridor-${idx}`} corridor={corr} />
        ))}
        <NavPathPolyline navPath={navPath} />
        {showPaths && <OtherPathsPolylines paths={paths} />}
      </MapContainer>
    </div>
  );
}

export default CustomLayoutMap;

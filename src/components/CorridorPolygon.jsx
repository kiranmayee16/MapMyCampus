import React from 'react';
import { Polygon, Popup } from 'react-leaflet';

function CorridorPolygon({ corridor }) {
  return (
    <Polygon
      positions={corridor.polygon}
      pathOptions={{ color: corridor.color || '#ff9800', fillOpacity: 0.4, weight: 2, dashArray: '6 6' }}
    >
      <Popup>Corridor</Popup>
    </Polygon>
  );
}

export default React.memo(CorridorPolygon);

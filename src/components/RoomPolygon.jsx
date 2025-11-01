import React from 'react';
import { Polygon, Popup } from 'react-leaflet';

function RoomPolygon({ room, onClick }) {
  return (
    <Polygon
      positions={room.polygon}
      pathOptions={{ color: room.color || '#3388ff', fillOpacity: 0.7, weight: 3 }}
      eventHandlers={{ click: () => onClick(room) }}
    >
      <Popup>Room {room.name || room.id}</Popup>
    </Polygon>
  );
}

export default React.memo(RoomPolygon);

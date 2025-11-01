import React from 'react';
import { Polyline } from 'react-leaflet';

function OtherPathsPolylines({ paths }) {
  if (!paths) return null;
  return (
    <>
      {paths.map((path, idx) => (
        <Polyline
          key={`path-${idx}`}
          positions={path.points}
          pathOptions={{ color: path.color || '#43a047', weight: 4, dashArray: '6 6' }}
        />
      ))}
    </>
  );
}

export default React.memo(OtherPathsPolylines);

import React from 'react';
import { Polyline } from 'react-leaflet';

function NavPathPolyline({ navPath }) {
  if (!navPath) return null;
  return (
    <Polyline
      positions={navPath}
      pathOptions={{ color: '#43a047', weight: 6, dashArray: '10 10' }}
    />
  );
}

export default React.memo(NavPathPolyline);

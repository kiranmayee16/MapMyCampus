import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import mapConfig from './config/mapConfig.json';
import L from 'leaflet';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.js';
import CustomLayoutMap from './CustomLayoutMap';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationSelector({ locations, selectedLocation, onSelect, onCoordinateSubmit, label }) {
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const handleCoordinateSubmit = (e) => {
    e.preventDefault();
    if (customLat && customLng) {
      const lat = parseFloat(customLat);
      const lng = parseFloat(customLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        onCoordinateSubmit({
          coordinates: { lat, lng },
          name: `Custom ${label} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        });
      }
    }
  };

  return (
    <div className="location-control">
      <div className="location-dropdown">
        <select 
          value={selectedLocation ? selectedLocation.id : ''} 
          onChange={(e) => {
            const location = locations.find(loc => loc.id === e.target.value);
            onSelect(location);
          }}
          className="location-selector"
        >
          <option value="">{`Select ${label}`}</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      <div className="coordinate-inputs">
        <form onSubmit={handleCoordinateSubmit} className="coordinate-form">
          <input
            type="number"
            step="0.000001"
            placeholder="Latitude"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            className="coordinate-input"
          />
          <input
            type="number"
            step="0.000001"
            placeholder="Longitude"
            value={customLng}
            onChange={(e) => setCustomLng(e.target.value)}
            className="coordinate-input"
          />
          <button type="submit" className="coordinate-submit">Set</button>
        </form>
      </div>
    </div>
  );
}

function FloorPlanOverlay({ building, selectedFloor }) {
  const map = useMap();
  const [opacity, setOpacity] = useState(0.7);
  
  useEffect(() => {
    if (!building || !selectedFloor) return;

    const floor = building.floors.find(f => f.level === selectedFloor);
    if (!floor) return;

    const imageUrl = floor.imageUrl;
    const bounds = L.latLngBounds(building.bounds);
    
    const overlay = L.imageOverlay(imageUrl, bounds, {
      opacity: opacity,
      zIndex: 1000
    }).addTo(map);

    // Add opacity control
    const opacityControl = L.control({ position: 'topright' });
    opacityControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'opacity-control');
      div.innerHTML = `
        <div class="opacity-slider-container">
          <label>Floor Plan Opacity</label>
          <input type="range" min="0" max="1" step="0.1" value="${opacity}"
            onInput="this.nextElementSibling.value = this.value"
            onChange="this.dispatchEvent(new CustomEvent('opacity-change', { detail: this.value }))"
          />
          <span>${opacity}</span>
        </div>
      `;
      
      div.querySelector('input').addEventListener('opacity-change', (e) => {
        const newOpacity = parseFloat(e.detail);
        setOpacity(newOpacity);
        overlay.setOpacity(newOpacity);
      });

      return div;
    };

    map.fitBounds(bounds);
    return () => {
      map.removeLayer(overlay);
    };
  }, [map, building, selectedFloor]);

  return null;
}

function BuildingControl({ building, onFloorSelect }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!building) return null;

  return (
    <div className="building-control">
      <div className="building-header" onClick={() => setExpanded(!expanded)}>
        <h3>{building.name}</h3>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div className="floor-list">
          {building.floors.map(floor => (
            <button
              key={floor.level}
              className="floor-button"
              onClick={() => onFloorSelect(floor.level)}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapComponent({ source, destination, onBuildingClick }) {
  const map = useMap();
  const [routingControl, setRoutingControl] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);

  const zoomToLocation = () => {
    const targetLocation = {
      lat: 13.168000,
      lng: 77.558353
    };
    
    // Find building at target location
    const building = mapConfig.buildings?.find(b => {
      const bounds = L.latLngBounds(b.bounds);
      return bounds.contains(targetLocation);
    });

    if (building) {
      // Set building and default floor
      setSelectedBuilding(building);
      setSelectedFloor(building.floors[0].level);
      
      // Zoom to building bounds
      const bounds = L.latLngBounds(building.bounds);
      map.fitBounds(bounds, {
        maxZoom: 21,
        padding: [50, 50]
      });
    } else {
      map.setView([targetLocation.lat, targetLocation.lng], 22, {
        animate: true,
        duration: 1
      });
    }

    // Add a marker at the location
    L.marker([targetLocation.lat, targetLocation.lng])
      .addTo(map)
      .bindPopup('Target Location')
      .openPopup();
  };

  // Add indoor level control when zoomed in
  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();
      if (currentZoom >= 19) {
        // Show indoor controls only at high zoom levels
        const buildingControl = document.querySelector('.building-control');
        if (buildingControl) {
          buildingControl.style.display = 'block';
        }
      } else {
        const buildingControl = document.querySelector('.building-control');
        if (buildingControl) {
          buildingControl.style.display = 'none';
        }
        setSelectedBuilding(null);
        setSelectedFloor(null);
      }
    };

    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  // Add zoom control button
  useEffect(() => {
    const ZoomControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control zoom-max-button');
        container.innerHTML = `<a href="#" title="Zoom to Target" style="font-weight: bold;">🎯</a>`;
        container.onclick = function(e) {
          e.preventDefault();
          zoomToLocation();
        };
        return container;
      }
    });

    const zoomControl = new ZoomControl();
    map.addControl(zoomControl);

    return () => {
      map.removeControl(zoomControl);
    };
  }, [map]);

  // Add click handler to map
  useEffect(() => {
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const currentZoom = map.getZoom();
      console.log('Clicked Location:', {
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        zoomLevel: currentZoom
      });

      // Check if click is within any building bounds
      const building = mapConfig.buildings?.find(b => {
        const bounds = L.latLngBounds(b.bounds);
        return bounds.contains(e.latlng);
      });

      if (building) {
        console.log('Clicked on building:', building.name);
        if (onBuildingClick) onBuildingClick(building);
        // Zoom in to building
        const bounds = L.latLngBounds(building.bounds);
        map.fitBounds(bounds, {
          maxZoom: 20,
          padding: [50, 50]
        });
      } else {
        if (onBuildingClick) onBuildingClick(null);
      }
    });

    return () => {
      map.off('click');
    };
  }, [map]);

  useEffect(() => {
    if (routingControl) {
      map.removeControl(routingControl);
    }

    if (source && destination) {
      const control = L.Routing.control({
        waypoints: [
          L.latLng(source.coordinates.lat, source.coordinates.lng),
          L.latLng(destination.coordinates.lat, destination.coordinates.lng)
        ],
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'foot' // Use walking profile
        }),
        lineOptions: {
          styles: [{ color: '#6FA1EC', weight: 4 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        show: true,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true
      }).addTo(map);

      setRoutingControl(control);
    }

    return () => {
      if (routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, source, destination]);

  useEffect(() => {
    // Add layer control
    const layerControl = L.control.layers(
      mapConfig.mapLayers.reduce((acc, layer) => {
        acc[layer.name] = L.tileLayer(layer.url, {
          attribution: layer.attribution,
          maxZoom: layer.maxZoom,
        });
        return acc;
      }, {})
    ).addTo(map);

    return () => {
      layerControl.remove();
    };
  }, [map]);

  return null;
}

function ModalMapComponent({ source, destination }) {
  const map = useMap();
  const [routingControl, setRoutingControl] = useState(null);

  useEffect(() => {
    if (routingControl) {
      map.removeControl(routingControl);
    }

    if (source && destination) {
      const control = L.Routing.control({
        waypoints: [
          L.latLng(source.coordinates.lat, source.coordinates.lng),
          L.latLng(destination.coordinates.lat, destination.coordinates.lng)
        ],
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'foot' // Use walking profile
        }),
        lineOptions: {
          styles: [{ color: '#FF6B6B', weight: 4 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        show: true,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        createMarker: () => null // Don't create default markers, we have our own
      }).addTo(map);

      setRoutingControl(control);
    }

    return () => {
      if (routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, source, destination]);

  return null;
}

function App() {
  const [modalBuilding, setModalBuilding] = useState(null);
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [showInputs, setShowInputs] = useState(true);
  const [showCustomLayout, setShowCustomLayout] = useState(false);
  const locations = mapConfig.predefinedLocations || [];

  const handleCustomSource = (customLocation) => {
    setSource({
      id: 'custom-source',
      name: customLocation.name,
      coordinates: customLocation.coordinates
    });
  };

  const handleCustomDestination = (customLocation) => {
    setDestination({
      id: 'custom-destination',
      name: customLocation.name,
      coordinates: customLocation.coordinates
    });
    setShowInputs(false); // Hide inputs after destination is set
  };

  const handleReset = () => {
    setSource(null);
    setDestination(null);
    setShowInputs(true);
  };

  return (
    <div className="map-container">
      <BuildingModal building={modalBuilding} onClose={() => setModalBuilding(null)} />
      {showInputs && (
        <div className="controls-container">
          <LocationSelector
            locations={locations}
            selectedLocation={source}
            onSelect={setSource}
            onCoordinateSubmit={handleCustomSource}
            label="Source"
          />
          {source && (
            <LocationSelector
              locations={locations}
              selectedLocation={destination}
              onSelect={setDestination}
              onCoordinateSubmit={handleCustomDestination}
              label="Destination"
            />
          )}
        </div>
      )}
      {!showInputs && (
        <button className="reset-button" onClick={handleReset}>
          Reset Route
        </button>
      )}
      <MapContainer
        center={[mapConfig.defaultCenter.lat, mapConfig.defaultCenter.lng]}
        zoom={mapConfig.defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={mapConfig.mapLayers[0].url}
          attribution={mapConfig.mapLayers[0].attribution}
        />
        {source && (
          <Marker position={[source.coordinates.lat, source.coordinates.lng]}>
            <Popup>Source: {source.name}</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.coordinates.lat, destination.coordinates.lng]}>
            <Popup>Destination: {destination.name}</Popup>
          </Marker>
        )}
        <MapComponent source={source} destination={destination} onBuildingClick={setModalBuilding} />
      </MapContainer>
      <button onClick={() => setShowCustomLayout(true)} style={{ position: 'absolute', top: 10, right: 10, zIndex: 3000 }}>
        Open Custom Layout Map
      </button>
      {showCustomLayout && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000 }}>
          <CustomLayoutMap />
          <button onClick={() => setShowCustomLayout(false)} style={{ position: 'fixed', top: 24, right: 24, zIndex: 7000, fontSize: 24, background: '#fff', border: '2px solid #3388ff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>✖</button>
        </div>
      )}
    </div>

  );
}

// Simple Modal Overlay
function BuildingModal({ building, onClose }) {
  const [selectedFloor, setSelectedFloor] = useState(building?.floors?.[0]?.level || null);

  if (!building || !building.bounds) return null;

  // Sample indoor navigation points
  const sampleSource = {
    id: 'sample-source',
    name: 'Entrance',
    coordinates: {
      lat: 13.16791,
      lng: 77.558363
    }
  };
  const sampleDestination = {
    id: 'sample-destination',
    name: 'Room 101',
    coordinates: {
      lat: 13.16806,
      lng: 77.558283
    }
  };
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '24px',
        minWidth: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>{building.name} - Indoor Navigation</h2>
          <button style={{ fontSize: 18, border: 'none', background: 'none', cursor: 'pointer' }} onClick={onClose}>✖</button>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <p>Sample walking path from <strong>{sampleSource.name}</strong> to <strong>{sampleDestination.name}</strong></p>
          <div style={{ marginTop: '8px' }}>
            <label style={{ marginRight: '8px' }}>Select Floor:</label>
            <select 
              value={selectedFloor || ''} 
              onChange={(e) => setSelectedFloor(e.target.value)}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {building.floors.map(floor => (
                <option key={floor.level} value={floor.level}>
                  {floor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, height: '400px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <MapContainer
            center={[
              (building.bounds[0][0] + building.bounds[1][0]) / 2,
              (building.bounds[0][1] + building.bounds[1][1]) / 2
            ]}
            zoom={20}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url={mapConfig.mapLayers[0].url}
              attribution={mapConfig.mapLayers[0].attribution}
            />
            <Marker position={[sampleSource.coordinates.lat, sampleSource.coordinates.lng]}>
              <Popup>{sampleSource.name}</Popup>
            </Marker>
            <Marker position={[sampleDestination.coordinates.lat, sampleDestination.coordinates.lng]}>
              <Popup>{sampleDestination.name}</Popup>
            </Marker>
            <RoomOverlay building={building} selectedFloor={selectedFloor} />
            <ModalMapComponent source={sampleSource} destination={sampleDestination} />
            <RoomOverlay building={building} selectedFloor={selectedFloor} />
          </MapContainer>
        </div>
        
        {selectedFloor && building.floors.find(f => f.level === selectedFloor)?.imageUrl && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <h4>{building.floors.find(f => f.level === selectedFloor)?.name} Layout</h4>
            <img 
              src={building.floors.find(f => f.level === selectedFloor).imageUrl} 
              alt={building.floors.find(f => f.level === selectedFloor).name} 
              style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd', borderRadius: '4px' }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RoomOverlay({ building, selectedFloor }) {
  const map = useMap();

  useEffect(() => {
    if (!building || !selectedFloor) return;

    const floor = building.floors.find(f => f.level === selectedFloor);
    if (!floor || !floor.rooms) return;

    const roomLayers = [];

    floor.rooms.forEach(room => {
      const polygon = L.polygon(room.polygon, {
        color: 'black',
        weight: 2,
        fillColor: room.color,
        fillOpacity: 0.5
      }).addTo(map);

      // Add label
      const center = L.latLngBounds(room.polygon).getCenter();
      const label = L.marker(center, {
        icon: L.divIcon({
          className: 'room-label',
          html: `<div style="background: white; padding: 2px 4px; border: 1px solid black; border-radius: 3px; font-size: 10px;">${room.name}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        })
      }).addTo(map);

      roomLayers.push(polygon, label);
    });

    return () => {
      roomLayers.forEach(layer => map.removeLayer(layer));
    };
  }, [map, building, selectedFloor]);

  return null;
}

export default App;
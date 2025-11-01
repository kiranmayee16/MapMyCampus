# React Leaflet Map Application

This is a React application that implements a full-screen map centered around Bangalore using Leaflet. The application includes a search bar to find locations in and around Bangalore.

## Features

- Full-screen interactive map
- Location search functionality
- Multiple map layers (OpenStreetMap and Satellite)
- Centered around Bangalore
- Responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Running the Application

Start the development server:
```bash
npm start
```

The application will open in your default browser at `http://localhost:3000`.

## Configuration

Map configuration can be found in `src/config/mapConfig.json`. You can modify:
- Default center coordinates
- Default zoom level
- Map layers and their properties

## Built With

- React
- Leaflet
- React-Leaflet
- OpenStreetMap
- Nominatim API for location search
# Todmorden Ferns Map

A GitHub-hosted web map displaying ferns and geographic data for the Todmorden area.

## Directory Structure

- **data/** - Geographic data files
  - `shapefiles/` - GIS shapefiles (.shp, .shx, .dbf, etc.)
  - `geojson/` - GeoJSON format data
  - `points/` - Point data (CSV, JSON, or GeoJSON)
- **public/** - Web assets served directly
  - `css/` - Stylesheets
  - `js/` - JavaScript files
  - `images/` - Map graphics and images
- **src/** - Source code for map application
- **docs/** - Documentation and guides
- **.github/workflows/** - GitHub Actions CI/CD workflows

## Setup

1. Copy data files into the `data/` directory
2. Configure map layers and styling in `src/`
3. Build and test the map application
4. Deploy via GitHub Pages

## Data Files

Place your geographic data files in the appropriate subdirectories:
- Shapefiles → `data/shapefiles/`
- GeoJSON data → `data/geojson/`
- Point data (CSV/JSON) → `data/points/`

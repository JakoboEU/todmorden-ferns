import { useEffect, useRef } from 'react'

const MapComponent = () => {
  const mapContainer = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return

    // Access Leaflet from global scope (loaded via CDN)
    const L = window.L
    if (!L) {
      console.error('Leaflet not loaded')
      return
    }

    // Initialize map
    mapInstance.current = L.map(mapContainer.current).setView([53.715, -2.088], 12)

    // Add layers from GeoJSON files
    loadLayers()
  }, [])

  const loadLayers = async () => {
    const L = window.L
    const layers = [
      { name: 'contours', color: '#404040', weight: 1.5, opacity: 0.8 },
      { name: 'roads', color: '#666666', weight: 1, opacity: 0.6 },
      { name: 'water', color: '#4a90e2', weight: 1.5, opacity: 0.5, fillOpacity: 0.2, fillColor: '#4a90e2' },
      { name: 'railway', color: '#888888', weight: 1, opacity: 0.7 },
      { name: 'woodland', color: '#6b8e23', weight: 1.5, opacity: 0.4, fillOpacity: 0.15, fillColor: '#6b8e23' },
      { name: 'placenames', color: '#333333', weight: 0.5, opacity: 0.6 }
    ]

    let allBounds = null

    for (const layer of layers) {
      try {
        const response = await fetch(`/${layer.name}.geojson`)
        if (!response.ok) {
          console.warn(`Skipping ${layer.name} - file not found`)
          continue
        }

        const geojsonData = await response.json()
        console.log(`✓ Loaded ${layer.name}: ${geojsonData.features.length} features`)

        const geoJsonLayer = L.geoJSON(geojsonData, {
          style: {
            color: layer.color,
            weight: layer.weight,
            opacity: layer.opacity,
            fillOpacity: layer.fillOpacity || 0,
            fillColor: layer.fillColor || layer.color
          },
          onEachFeature: (feature, leafletLayer) => {
            if (feature.properties && Object.keys(feature.properties).length > 0) {
              const popupText = Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br>')
              leafletLayer.bindPopup(popupText)
            }
          }
        }).addTo(mapInstance.current)

        // Track bounds for all layers
        const bounds = geoJsonLayer.getBounds()
        if (allBounds) {
          allBounds.extend(bounds)
        } else {
          allBounds = bounds
        }
      } catch (error) {
        console.error(`Error loading ${layer.name}:`, error)
      }
    }

    // Fit map to all layers
    if (allBounds) {
      mapInstance.current.fitBounds(allBounds, { padding: [50, 50] })
    }
  }

  return (
    <main>
      <div ref={mapContainer} className="map-container" />
    </main>
  )
}

export default MapComponent

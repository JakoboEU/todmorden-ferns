import { useEffect, useRef } from 'react'

const MapComponent = () => {
  const mapContainer = useRef(null)
  const mapInstance = useRef(null)
  
  // Towns to display as labels
  const allowedPlaces = [
    'Todmorden', 'Hebden Bridge', 'Walsden', 'Mytholmroyd', 
    'Cornholme', 'Portsmouth', 'Old Town', 'Worstholme', 
    'Cliviger', 'Holme Chapel', 'Bacup', 'Cragg Vale'
  ]

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
    const BASE_URL = import.meta.env.BASE_URL
    const layers = [
      { name: 'contours', color: '#ffb3b3', weight: 1.2, opacity: 0.7 },
      { name: 'roads', color: '#666666', weight: 1, opacity: 0.6 },
      { name: 'water', color: '#4a90e2', weight: 1.5, opacity: 0.5, fillOpacity: 0.2, fillColor: '#4a90e2' },
      { name: 'railway', color: '#888888', weight: 1, opacity: 0.7 },
      { name: 'woodland', color: '#6b8e23', weight: 1.5, opacity: 0.4, fillOpacity: 0.15, fillColor: '#6b8e23' }
    ]

    let allBounds = null

    for (const layer of layers) {
      try {
        const response = await fetch(`${BASE_URL}${layer.name}.geojson`)
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

    // Load filtered placenames
    await loadPlacenames(L, allBounds)

    // Fit map to all layers
    if (allBounds) {
      mapInstance.current.fitBounds(allBounds, { padding: [50, 50] })
    }
  }

  const loadPlacenames = async (L, allBounds) => {
    const BASE_URL = import.meta.env.BASE_URL
    try {
      const response = await fetch(`${BASE_URL}placenames.geojson`)
      if (!response.ok) {
        console.warn('Skipping placenames - file not found')
        return
      }

      const geojsonData = await response.json()
      
      // Filter to only allowed places (case-insensitive)
      // Note: placenames use 'name1' field
      const filteredFeatures = geojsonData.features.filter(feature => {
        const name = feature.properties?.name1 || ''
        return allowedPlaces.some(place => 
          name.toLowerCase().includes(place.toLowerCase())
        )
      })

      console.log(`✓ Loaded placenames: ${filteredFeatures.length} of ${geojsonData.features.length} features (filtered to ${allowedPlaces.length} towns)`)

      if (filteredFeatures.length === 0) {
        console.warn('No matching places found in dataset')
        return
      }

      const filteredGeoJSON = {
        type: 'FeatureCollection',
        features: filteredFeatures
      }

      L.geoJSON(filteredGeoJSON, {
        style: {
          color: '#333333',
          weight: 0.5,
          opacity: 0.6
        },
        pointToLayer: (feature, latlng) => {
          const name = feature.properties?.name1 || 'Unknown'
          return L.circleMarker(latlng, {
            radius: 5,
            fillColor: '#ff6b6b',
            color: '#c92a2a',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${name}</strong>`)
        },
        onEachFeature: (feature, leafletLayer) => {
          const name = feature.properties?.name1 || 'Unknown'
          // Add text labels for each place
          const coords = leafletLayer.getLatLng ? leafletLayer.getLatLng() : null
          if (coords) {
            L.marker(coords, {
              icon: L.divIcon({
                className: 'place-label',
                html: `<div style="font-size: 13px; font-weight: 700; color: #333; white-space: nowrap; pointer-events: none; text-shadow: 1px 1px 1px white;">${name}</div>`,
                iconSize: [120, 25],
                iconAnchor: [60, 5]
              })
            }).addTo(mapInstance.current)
          }
          leafletLayer.bindPopup(`<strong>${name}</strong>`)
        }
      }).addTo(mapInstance.current)

      // Update bounds if we have places
      if (filteredFeatures.length > 0) {
        const placeBounds = L.geoJSON(filteredGeoJSON).getBounds()
        if (allBounds) {
          allBounds.extend(placeBounds)
        }
      }
    } catch (error) {
      console.error('Error loading placenames:', error)
    }
  }

  return (
    <main>
      <div ref={mapContainer} className="map-container" />
    </main>
  )
}

export default MapComponent

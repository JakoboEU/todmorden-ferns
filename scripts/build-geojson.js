import shapefile from 'shapefile'
import fs from 'fs'
import path from 'path'
import proj4 from 'proj4'

// British National Grid to WGS84 transformation
const bng = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.060,0.15,0.247,0.842,-20.489 +units=m +no_defs'
const wgs84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'

const transformCoordinates = (coords, geometryType) => {
  if (geometryType === 'Point') {
    return proj4(bng, wgs84, coords).reverse()
  } else if (geometryType === 'LineString') {
    return coords.map(coord => proj4(bng, wgs84, coord).reverse())
  } else if (geometryType === 'Polygon') {
    return coords.map(ring => ring.map(coord => proj4(bng, wgs84, coord).reverse()))
  } else if (geometryType === 'MultiPoint') {
    return coords.map(coord => proj4(bng, wgs84, coord).reverse())
  } else if (geometryType === 'MultiLineString') {
    return coords.map(line => line.map(coord => proj4(bng, wgs84, coord).reverse()))
  } else if (geometryType === 'MultiPolygon') {
    return coords.map(polygon => polygon.map(ring => ring.map(coord => proj4(bng, wgs84, coord).reverse())))
  }
  return coords
}

const convertShapefileToGeoJSON = async (shapefilePath, outputPath) => {
  try {
    console.log(`Converting ${shapefilePath}...`)
    
    const source = await shapefile.open(shapefilePath)
    const collection = { type: 'FeatureCollection', features: [] }
    
    let result = await source.read()
    while (!result.done) {
      const feature = result.value
      
      // Transform geometry coordinates from BNG to WGS84
      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry.coordinates = transformCoordinates(
          feature.geometry.coordinates,
          feature.geometry.type
        )
      }
      
      collection.features.push(feature)
      result = await source.read()
    }
    
    // Write to public folder
    fs.writeFileSync(outputPath, JSON.stringify(collection))
    console.log(`✓ ${path.basename(outputPath)} (${collection.features.length} features)`)
  } catch (error) {
    console.warn(`⚠ Skipped ${shapefilePath}: ${error.message}`)
  }
}

const main = async () => {
  const shapefilesDir = 'data/shapefiles'
  const publicDir = 'public'

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  console.log('Converting shapefiles to GeoJSON...\n')

  // Find all .shp files and convert them
  const shapefiles = fs.readdirSync(shapefilesDir).filter(f => f.endsWith('.shp'))
  
  if (shapefiles.length === 0) {
    console.warn('No shapefiles found in data/shapefiles/')
    return
  }

  for (const file of shapefiles) {
    const name = file.replace('.shp', '')
    const inputPath = path.join(shapefilesDir, file)
    const outputPath = path.join(publicDir, `${name}.geojson`)
    await convertShapefileToGeoJSON(inputPath, outputPath)
  }

  console.log('\n✓ Build complete!')
}

main().catch(console.error)

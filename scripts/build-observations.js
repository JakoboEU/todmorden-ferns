import fs from 'fs'
import shapefile from 'shapefile'
import buffer from '@turf/buffer'
import { featureCollection, point } from '@turf/helpers'
import union from '@turf/union'

const parseCsv = text => {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const character = text[i]
    const nextCharacter = text[i + 1]

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"'
      i++
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') i++
      row.push(value)
      if (row.some(cell => cell.trim())) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  if (value || row.length) {
    row.push(value)
    if (row.some(cell => cell.trim())) rows.push(row)
  }

  const headers = rows.shift().map(header => header.replace(/^\uFEFF/, '').trim())
  return rows.map(cells => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()])))
}

const buildHistoric = async () => {
  const records = parseCsv(fs.readFileSync('data/locations.csv', 'utf8'))
  const recordsByPolygon = new Map()
  const metadata = new Map()

  for (const record of records) {
    if (record.Species) {
      const speciesMetadata = metadata.get(record.Species) || { locations: [], rarity: [], common: false }
      if (record['Location Name']) speciesMetadata.locations.push(record['Location Name'])
      if (record.Rarity) speciesMetadata.rarity.push(record.Rarity)
      if (record.Common === 'Y') speciesMetadata.common = true
      speciesMetadata.locations = [...new Set(speciesMetadata.locations)]
      speciesMetadata.rarity = [...new Set(speciesMetadata.rarity)]
      metadata.set(record.Species, speciesMetadata)
    }
    if (!record.Polygon) continue
    const polygonRecords = recordsByPolygon.get(record.Polygon) || []
    polygonRecords.push(record)
    recordsByPolygon.set(record.Polygon, polygonRecords)
  }

  const source = await shapefile.open('data/locations_shapefiles/locations.shp')
  const features = []
  let result = await source.read()
  while (!result.done) {
    const polygonName = result.value.properties?.name
    const polygonRecords = recordsByPolygon.get(polygonName) || []
    for (const record of polygonRecords) {
      const feature = {
        type: 'Feature',
        geometry: {
          type: result.value.geometry.type,
          coordinates: result.value.geometry.coordinates
        },
        properties: {
          species: record.Species,
          commonName: record.Common,
          locationName: record['Location Name'],
          rarity: record.Rarity,
          page: record.Page
        }
      }
      features.push(feature)
    }
    result = await source.read()
  }

  const mergedFeatures = mergeBySpecies(features)
  fs.writeFileSync('public/historic.geojson', JSON.stringify({
    type: 'FeatureCollection',
    features: mergedFeatures,
    metadata: Object.fromEntries(metadata)
  }))
  console.log(`✓ historic.geojson (${mergedFeatures.length} merged species features)`)
}

const buildContemporary = () => {
  const files = ['data/inaturalist_ferns.csv', 'data/inaturalist_clubmosses.csv']
  const features = files.flatMap(file => parseCsv(fs.readFileSync(file, 'utf8')).flatMap(record => {
    const latitude = Number(record.latitude)
    const longitude = Number(record.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !record.scientific_name) return []

    const observation = buffer(point([longitude, latitude], {
      species: record.scientific_name,
      commonName: record.common_name,
      observedAt: record.time_observed_at,
      imageUrl: record.image_url
    }), 150, { units: 'meters' })

    return observation ? [observation] : []
  }))

  const mergedFeatures = mergeBySpecies(features)
  fs.writeFileSync('public/contemporary.geojson', JSON.stringify({
    type: 'FeatureCollection',
    features: mergedFeatures
  }))
  console.log(`✓ contemporary.geojson (${mergedFeatures.length} merged species features)`)
}

const mergeBySpecies = features => {
  const grouped = new Map()
  for (const feature of features) {
    const speciesFeatures = grouped.get(feature.properties.species) || []
    speciesFeatures.push(feature)
    grouped.set(feature.properties.species, speciesFeatures)
  }

  return [...grouped.values()].map(speciesFeatures => {
    const merged = speciesFeatures.length === 1
      ? speciesFeatures[0]
      : union(featureCollection(speciesFeatures))
    return {
      ...merged,
      properties: {
        ...speciesFeatures[0].properties,
        locations: [...new Set(speciesFeatures.flatMap(feature => feature.properties.locations || []))],
        common: speciesFeatures.some(feature => feature.properties.common),
        recordCount: speciesFeatures.length
      }
    }
  })
}

const mode = process.argv[2]
if (mode === 'historic') {
  await buildHistoric()
} else if (mode === 'contemporary') {
  buildContemporary()
} else {
  throw new Error('Expected "historic" or "contemporary"')
}

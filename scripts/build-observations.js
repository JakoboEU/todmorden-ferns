import fs from 'fs'
import shapefile from 'shapefile'
import buffer from '@turf/buffer'
import { featureCollection, point } from '@turf/helpers'
import union from '@turf/union'

const normalizeSpeciesName = name => name.trim().split(/\s+/).slice(0, 2).join(' ')

const parseCsv = (text, delimiter = ',') => {
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
    } else if (character === delimiter && !quoted) {
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
  const locationFeatures = new Map()

  for (const record of records) {
    const speciesName = normalizeSpeciesName(record.Species || '')
    if (speciesName) {
      const speciesMetadata = metadata.get(speciesName) || { locations: [], rarity: [], common: false }
      if (record['Location Name']) speciesMetadata.locations.push(record['Location Name'])
      if (record.Rarity) speciesMetadata.rarity.push(record.Rarity)
      if (record.Common === 'Y') speciesMetadata.common = true
      speciesMetadata.locations = [...new Set(speciesMetadata.locations)]
      speciesMetadata.rarity = [...new Set(speciesMetadata.rarity)]
      metadata.set(speciesName, speciesMetadata)
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
          species: normalizeSpeciesName(record.Species || ''),
          commonName: record.Common,
          locationName: record['Location Name'],
          rarity: record.Rarity,
          page: record.Page
        }
      }
      features.push(feature)
      const speciesName = feature.properties.species
      const speciesLocations = locationFeatures.get(speciesName) || []
      speciesLocations.push(feature)
      locationFeatures.set(speciesName, speciesLocations)
    }
    result = await source.read()
  }

  const mergedFeatures = mergeBySpecies(features)
  fs.writeFileSync('public/historic.geojson', JSON.stringify({
    type: 'FeatureCollection',
    features: mergedFeatures,
    metadata: Object.fromEntries(metadata),
    locationFeatures: Object.fromEntries(locationFeatures)
  }))
  console.log(`✓ historic.geojson (${mergedFeatures.length} merged species features)`)
}

const buildContemporary = () => {
  const gbifFile = fs.readdirSync('data/gbif')
    .filter(file => file.endsWith('.csv'))
    .map(file => ({
      file,
      modifiedAt: fs.statSync(`data/gbif/${file}`).mtimeMs
    }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]

  if (!gbifFile) throw new Error('No GBIF CSV file found in data/gbif')

  const records = parseCsv(fs.readFileSync(`data/gbif/${gbifFile.file}`, 'utf8'), '\t')
  const requiredHeaders = ['coordinateUncertaintyInMeters', 'taxonRank', 'year', 'species', 'decimalLatitude', 'decimalLongitude', 'rightsHolder']
  const missingHeaders = requiredHeaders.filter(header => !records[0]?.[header] && !Object.hasOwn(records[0] || {}, header))
  if (missingHeaders.length > 0) {
    throw new Error(`GBIF file is missing required columns: ${missingHeaders.join(', ')}`)
  }

  const filteredRecords = records.filter(record => {
    const coordinateUncertainty = Number(record.coordinateUncertaintyInMeters)
    const year = Number(record.year)
    return record.coordinateUncertaintyInMeters.trim() !== '' &&
      record.year.trim() !== '' &&
      Number.isFinite(coordinateUncertainty) &&
      Number.isFinite(year) &&
      coordinateUncertainty <= 100 &&
      (record.taxonRank === 'SPECIES' || record.taxonRank === 'SUBSPECIES') &&
      year >= 2020
  })
  const rightsHolders = [...new Set(filteredRecords.map(record => record.rightsHolder).filter(Boolean))].sort()
  const features = filteredRecords.flatMap(record => {
    const latitude = Number(record.decimalLatitude)
    const longitude = Number(record.decimalLongitude)
    const speciesName = normalizeSpeciesName(record.species || '')
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !speciesName) return []

    const observation = buffer(point([longitude, latitude], {
      species: speciesName
    }), 150, { units: 'meters' })

    return observation ? [observation] : []
  })

  const mergedFeatures = mergeBySpecies(features)
  fs.writeFileSync('public/contemporary.geojson', JSON.stringify({
    type: 'FeatureCollection',
    features: mergedFeatures
  }))
  fs.writeFileSync('src/rightsHolders.js', `const rightsHolders = ${JSON.stringify(rightsHolders, null, 2)}

export default rightsHolders
`)
  console.log(`✓ contemporary.geojson (${mergedFeatures.length} merged species features from ${filteredRecords.length} records in ${gbifFile.file})`)
  console.log(`✓ rightsHolders.js (${rightsHolders.length} rights holders)`)
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

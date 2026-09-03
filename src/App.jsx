import { useState } from 'react'
import MapComponent from './components/MapComponent'
import species from './species'

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState(null)
  const [observationData, setObservationData] = useState(null)

  const historicFeature = observationData?.historic.features.find(
    feature => feature.properties?.species === selectedSpecies
  )
  const historicMetadata = observationData?.historic.metadata?.[selectedSpecies]
  const contemporaryFeature = observationData?.contemporary.features.find(
    feature => feature.properties?.species === selectedSpecies
  )

  return (
    <div className="app">
      <header>
        <h1>Todmorden Ferns Map</h1>
      </header>
      <main className="content">
        <aside className="species-menu" aria-label="Fern species">
          <h2>Species</h2>
          <nav>
            <ul>
              {species.map(name => (
                <li key={name}>
                  <a
                    href="#map"
                    className={selectedSpecies === name ? 'selected' : ''}
                    onClick={() => setSelectedSpecies(name)}
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <section id="map" className="map-panel" aria-label="Todmorden fern map">
          <MapComponent selectedSpecies={selectedSpecies} onDataLoaded={setObservationData} />
        </section>
        <aside className="data-panels" aria-label="Species data information">
          <div className="data-dialog historic-dialog">
            <strong>Historic</strong>
            <p>Compiled from Abraham Stansfield&apos;s book <em>The Flora of Todmorden</em>, published in 1911, using data from 1860.</p>
            {selectedSpecies ? (
              historicFeature || historicMetadata ? (
                <>
                  {historicMetadata?.common && <p>This species was common in the area.</p>}
                  {historicMetadata?.rarity?.length > 0 && (
                    <p>Historic rarity: {historicMetadata.rarity.join('; ')}.</p>
                  )}
                  {historicMetadata?.locations?.length > 0 && (
                    <p>Locations noted: {historicMetadata.locations.join('; ')}.</p>
                  )}
                </>
              ) : <p>No records are present in this data set.</p>
            ) : <p>Select a species to see historic presence information.</p>}
          </div>
          <div className="data-dialog contemporary-dialog">
            <strong>Contemporary</strong>
            <p>Research grade observations from iNaturalist.</p>
            {selectedSpecies ? (
              contemporaryFeature
                ? <p>{contemporaryFeature.properties.recordCount} research grade observation{contemporaryFeature.properties.recordCount === 1 ? '' : 's'} recorded.</p>
                : <p>No records are present in this data set.</p>
            ) : <p>Select a species to see contemporary presence information.</p>}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App

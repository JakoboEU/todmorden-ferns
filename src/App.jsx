import { useState } from 'react'
import MapComponent from './components/MapComponent'
import species from './species'
import rightsHolders from './rightsHolders'

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState(null)
  const [observationData, setObservationData] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [acknowledgementOpen, setAcknowledgementOpen] = useState(false)

  const historicFeature = observationData?.historic.features.find(
    feature => feature.properties?.species === selectedSpecies
  )
  const historicMetadata = observationData?.historic.metadata?.[selectedSpecies]
  const historicLocationFeatures = observationData?.historic.locationFeatures?.[selectedSpecies] || []
  const historicLocationNames = new Set(
    historicLocationFeatures.map(feature => feature.properties?.locationName)
  )
  const contemporaryFeature = observationData?.contemporary.features.find(
    feature => feature.properties?.species === selectedSpecies
  )
  const contemporaryRightsHolders = rightsHolders
    .filter(record => record.species === selectedSpecies)
    .map(record => record.rightsHolder)

  return (
    <div className="app" onClick={() => setSelectedLocation(null)}>
      <header>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="species-menu"
          onClick={() => setMenuOpen(open => !open)}
        >
          Browse species
        </button>
        <div className="header-title">
          <h1>Todmorden Ferns Map</h1>
          <p>{selectedSpecies || 'Select a species'}</p>
        </div>
      </header>
      <main className="content">
        {menuOpen && <button className="menu-backdrop" type="button" aria-label="Close species menu" onClick={() => setMenuOpen(false)} />}
        <aside id="species-menu" className={`species-menu${menuOpen ? ' open' : ''}`} aria-label="Fern species">
          <h2>Species</h2>
          <nav>
            <ul>
              {species.map(name => (
                <li key={name}>
                  <a
                    href="#map"
                    className={selectedSpecies === name ? 'selected' : ''}
                    onClick={() => {
                      setSelectedSpecies(name)
                      setSelectedLocation(null)
                      setMenuOpen(false)
                    }}
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <section id="map" className="map-panel" aria-label="Todmorden fern map">
          <MapComponent
            selectedSpecies={selectedSpecies}
            selectedLocation={selectedLocation}
            onDataLoaded={setObservationData}
            onResetMap={() => setSelectedLocation(null)}
          />
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
                    <p>
                      Locations noted:{' '}
                      {historicMetadata.locations.map((location, index) => (
                        <span key={location}>
                          {index > 0 && '; '}
                          {historicLocationNames.has(location) ? (
                            <button
                              className="location-link"
                              type="button"
                              onClick={event => {
                                event.stopPropagation()
                                setSelectedLocation(location)
                              }}
                            >
                              {location}
                            </button>
                          ) : location}
                        </span>
                      ))}
                      .
                    </p>
                  )}
                </>
              ) : <p>No records are present in this data set.</p>
            ) : <p>Select a species to see historic presence information.</p>}
          </div>
          <div className="data-dialog contemporary-dialog">
            <strong>Contemporary</strong>
            <p>Records from GBIF.</p>
            {selectedSpecies ? (
              contemporaryFeature
                ? (
                  <p>
                    <button
                      className="record-count-link"
                      type="button"
                      onClick={event => {
                        event.stopPropagation()
                        setAcknowledgementOpen(true)
                      }}
                    >
                      {contemporaryFeature.properties.recordCount}
                    </button>
                    {' '}record{contemporaryFeature.properties.recordCount === 1 ? '' : 's'} recorded.
                  </p>
                )
                : <p>No records are present in this data set.</p>
            ) : <p>Select a species to see contemporary presence information.</p>}
          </div>
        </aside>
      </main>
      {acknowledgementOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setAcknowledgementOpen(false)}
        >
          <section
            className="acknowledgement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="acknowledgement-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="acknowledgement-title">Record acknowledgement</h2>
              <button
                className="modal-close"
                type="button"
                aria-label="Close acknowledgement"
                onClick={() => setAcknowledgementOpen(false)}
              >
                &times;
              </button>
            </div>
            <p>
              We acknowledge the following rights holders for the {selectedSpecies} records:
            </p>
            {contemporaryRightsHolders.length > 0 ? (
              <ul>
                {contemporaryRightsHolders.map(rightsHolder => (
                  <li key={rightsHolder}>{rightsHolder}</li>
                ))}
              </ul>
            ) : <p>No rights-holder information is available for these records.</p>}
          </section>
        </div>
      )}
    </div>
  )
}

export default App

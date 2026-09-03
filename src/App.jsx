import { useState } from 'react'
import MapComponent from './components/MapComponent'
import species from './species'

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState(null)

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
          <MapComponent selectedSpecies={selectedSpecies} />
        </section>
      </main>
    </div>
  )
}

export default App

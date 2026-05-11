import './App.css'

function App() {
  return (
    <main className="app-shell">
      <section className="status-panel" aria-labelledby="app-title">
        <div className="status-copy">
          <p className="eyebrow">Inicialización técnica</p>
          <h1 id="app-title">RFM Core</h1>
          <p className="lead">
            Sistema administrativo para pre-cotización, gestión comercial y
            análisis de rentabilidad de eventos.
          </p>
        </div>

        <div className="status-grid" aria-label="Estado técnico inicial">
          <article>
            <span>Backend</span>
            <strong>Django inicializado</strong>
          </article>
          <article>
            <span>Frontend</span>
            <strong>React/Vite inicializado</strong>
          </article>
          <article>
            <span>Documentación</span>
            <strong>Fase 1 en curso</strong>
          </article>
        </div>
      </section>
    </main>
  )
}

export default App

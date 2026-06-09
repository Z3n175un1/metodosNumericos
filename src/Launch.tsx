import { useState, useRef, useEffect, useCallback } from 'react'
import './Launch.css'

interface SimState {
  t: number
  y: number
  v: number
  a: number
}

const DT = 0.05
const MAX_STEPS = 4000

function rk4Simulate(
  mass: number,
  thrust: number,
  g: number,
  cd: number,
): SimState[] {
  const result: SimState[] = []
  let y = 0, v = 0, t = 0
  result.push({ t, y, v, a: (thrust - cd * v * Math.abs(v)) / mass - g })

  if (thrust <= mass * g) {
    return result
  }

  for (let i = 0; i < MAX_STEPS; i++) {
    const accel = (v: number) => (thrust - cd * v * Math.abs(v)) / mass - g

    const k1v = accel(v)
    const k1y = v

    const k2v = accel(v + DT / 2 * k1v)
    const k2y = v + DT / 2 * k1v

    const k3v = accel(v + DT / 2 * k2v)
    const k3y = v + DT / 2 * k2v

    const k4v = accel(v + DT * k3v)
    const k4y = v + DT * k3v

    const newV = v + DT / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
    const newY = y + DT / 6 * (k1y + 2 * k2y + 2 * k3y + k4y)

    t = +(t + DT).toFixed(6)
    y = newY
    v = newV

    result.push({ t, y, v, a: accel(v) })

    if (y < 0 && i > 50) break
    if (v < 0 && y <= 0) break
  }

  return result
}

function drawChart(
  data: SimState[],
  progress: number,
  canvas: HTMLCanvasElement,
) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const W = rect.width
  const H = rect.height

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  const pad = { t: 36, b: 44, l: 64, r: 24 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b

  const sliced = data.slice(0, progress + 1)
  if (sliced.length < 2) return

  const tMin = sliced[0].t
  const tMax = sliced[sliced.length - 1].t || 1
  const yMax = Math.max(...sliced.map(d => d.y), 1) * 1.12

  const xS = (t: number) => pad.l + ((t - tMin) / (tMax - tMin)) * cw
  const yS = (y: number) => pad.t + ch - (y / yMax) * ch

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const yy = pad.t + (i / 5) * ch
    ctx.beginPath()
    ctx.moveTo(pad.l, yy)
    ctx.lineTo(W - pad.r, yy)
    ctx.stroke()
    const xx = pad.l + (i / 5) * cw
    ctx.beginPath()
    ctx.moveTo(xx, pad.t)
    ctx.lineTo(xx, pad.t + ch)
    ctx.stroke()
  }

  // Axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i <= 5; i++) {
    const t = tMin + (i / 5) * (tMax - tMin)
    ctx.fillText(`${t.toFixed(1)}`, xS(t), H - 26)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 5; i++) {
    const y = (i / 5) * yMax
    ctx.fillText(formatDist(y), pad.l - 10, pad.t + ch - (i / 5) * ch)
  }

  // Fill under curve
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch)
  grad.addColorStop(0, 'rgba(0, 200, 255, 0.15)')
  grad.addColorStop(1, 'rgba(0, 200, 255, 0.01)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(xS(sliced[0].t), yS(0))
  for (const d of sliced) {
    ctx.lineTo(xS(d.t), yS(d.y))
  }
  ctx.lineTo(xS(sliced[sliced.length - 1].t), yS(0))
  ctx.closePath()
  ctx.fill()

  // Trajectory line
  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i < sliced.length; i++) {
    const x = xS(sliced[i].t)
    const y = yS(sliced[i].y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Current position dot
  if (sliced.length > 0) {
    const last = sliced[sliced.length - 1]
    const px = xS(last.t)
    const py = yS(last.y)

    ctx.fillStyle = '#0ea5e9'
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(px, py, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Zero line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.l, yS(0))
  ctx.lineTo(W - pad.r, yS(0))
  ctx.stroke()

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('Tiempo (s)', pad.l + cw / 2, H - 12)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.save()
  ctx.translate(14, pad.t + ch / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Altitud (m)', 0, 0)
  ctx.restore()
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  if (m >= 1) return `${m.toFixed(1)} m`
  return `${(m * 100).toFixed(1)} cm`
}

export default function Launch({ onBack }: { onBack: () => void }) {
  const [mass, setMass] = useState(500)
  const [thrust, setThrust] = useState(8000)
  const [gravity, setGravity] = useState(9.81)
  const [drag, setDrag] = useState(0.3)
  const [results, setResults] = useState<SimState[] | null>(null)
  const [progress, setProgress] = useState(0)
  const [simulating, setSimulating] = useState(false)
  const [paused, setPaused] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const netForce = thrust - mass * gravity
  const initAccel = netForce / mass
  const canLiftOff = netForce > 0

  const launch = useCallback(() => {
    const sim = rk4Simulate(mass, thrust, gravity, drag)
    setResults(sim)
    setProgress(0)
    setSimulating(true)
    setPaused(false)
  }, [mass, thrust, gravity, drag])

  const togglePause = useCallback(() => {
    setPaused(prev => !prev)
  }, [])

  const draw = useCallback(() => {
    if (results && canvasRef.current) {
      drawChart(results, progress, canvasRef.current)
    }
  }, [results, progress])

  useEffect(() => {
    if (!simulating || !results || paused) return
    draw()
    if (progress >= results.length - 1) {
      setSimulating(false)
      return
    }
    const id = setInterval(() => {
      setProgress(p => {
        const next = p + 3
        return next >= results.length - 1 ? results.length - 1 : next
      })
    }, 33)
    return () => clearInterval(id)
  }, [simulating, results, draw, paused])

  useEffect(() => {
    if (results) draw()
  }, [results, progress, draw])

  useEffect(() => {
    if (!results) return
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [results, draw])

  const currentState = results && results.length > 0
    ? results[Math.min(progress, results.length - 1)]
    : null

  const maxY = results ? Math.max(...results.map(d => d.y)) : 0
  const maxV = results ? Math.max(...results.map(d => d.v)) : 0
  const maxA = results ? Math.max(...results.map(d => d.a)) : 0
  const totalT = results ? results[results.length - 1].t : 0

  return (
    <div className="launch">
      <header className="lch-header">
        <button className="lch-back" onClick={onBack}>← Volver</button>
        <div>
          <h1 className="lch-title">Simulador de Lanzamiento</h1>
          <p className="lch-subtitle">Método de Runge-Kutta (RK4)</p>
        </div>
      </header>

      <section className="lch-intro">
        <p>
          Resolvé la ecuación diferencial del movimiento de un cohete
          usando el método de <strong>Runge-Kutta de 4º orden</strong>.
          Ajustá los parámetros, despegá y observá la trayectoria en tiempo real.
        </p>
      </section>

      <section className="lch-controls">
        <div className="lch-card">
          <h2>Parámetros del Cohete</h2>

          <div className="lch-sliders">
            <div className="lch-slider-group">
              <label>
                <span className="lch-slider-label">Masa</span>
                <span className="lch-slider-val lch-val-mass">{mass} kg</span>
              </label>
              <input
                type="range" min={50} max={3000} step={10}
                value={mass}
                onChange={e => setMass(Number(e.target.value))}
                disabled={simulating}
              />
              <div className="lch-slider-range"><span>50</span><span>3000</span></div>
            </div>

            <div className="lch-slider-group">
              <label>
                <span className="lch-slider-label">Empuje</span>
                <span className="lch-slider-val lch-val-thrust">{thrust.toLocaleString()} N</span>
              </label>
              <input
                type="range" min={500} max={50000} step={100}
                value={thrust}
                onChange={e => setThrust(Number(e.target.value))}
                disabled={simulating}
              />
              <div className="lch-slider-range"><span>500</span><span>50000</span></div>
            </div>

            <div className="lch-slider-group">
              <label>
                <span className="lch-slider-label">Gravedad</span>
                <span className="lch-slider-val lch-val-grav">{gravity.toFixed(2)} m/s²</span>
              </label>
              <input
                type="range" min={0} max={30} step={0.05}
                value={gravity}
                onChange={e => setGravity(Number(e.target.value))}
                disabled={simulating}
              />
              <div className="lch-slider-range"><span>0</span><span>30</span></div>
            </div>

            <div className="lch-slider-group">
              <label>
                <span className="lch-slider-label">Arrastre</span>
                <span className="lch-slider-val lch-val-drag">{drag.toFixed(2)}</span>
              </label>
              <input
                type="range" min={0} max={2} step={0.01}
                value={drag}
                onChange={e => setDrag(Number(e.target.value))}
                disabled={simulating}
              />
              <div className="lch-slider-range"><span>0</span><span>2</span></div>
            </div>
          </div>

          <div className="lch-info">
            <span className={`lch-info-tag ${canLiftOff ? 'lch-info-ok' : 'lch-info-bad'}`}>
              Fuerza neta: {netForce >= 0 ? '+' : ''}{netForce.toFixed(1)} N
            </span>
            <span className="lch-info-tag">
              Acel. inicial: {initAccel.toFixed(2)} m/s²
            </span>
          </div>

          <button
            className={`lch-launch-btn ${!canLiftOff ? 'lch-launch-disabled' : ''}`}
            onClick={launch}
            disabled={simulating || !canLiftOff}
          >
            {simulating && !paused ? '⏳ Volando...' : simulating && paused ? '⏸️ Pausado' : canLiftOff ? '🚀 Despegar' : '⚠️ Sin empuje suficiente'}
          </button>
        </div>
      </section>

      {results && (
        <>
          <section className="lch-visual">
            <h2>Trayectoria de Vuelo</h2>
            <div className="lch-chart-wrap">
              <canvas ref={canvasRef} className="lch-canvas" />
            </div>
            {currentState && (
              <>
                <div className="lch-telemetry">
                  <div className="lch-tele-item">
                    <span className="lch-tele-label">Tiempo</span>
                    <span className="lch-tele-val">{currentState.t.toFixed(2)} s</span>
                  </div>
                  <div className="lch-tele-item">
                    <span className="lch-tele-label">Altitud</span>
                    <span className="lch-tele-val">{formatDist(currentState.y)}</span>
                  </div>
                  <div className="lch-tele-item">
                    <span className="lch-tele-label">Velocidad</span>
                    <span className="lch-tele-val">{currentState.v.toFixed(2)} m/s</span>
                  </div>
                  <div className="lch-tele-item">
                    <span className="lch-tele-label">Aceleración</span>
                    <span className="lch-tele-val">{currentState.a.toFixed(2)} m/s²</span>
                  </div>
                </div>
                <div className="lch-pause-row">
                  <button className="lch-pause-btn" onClick={togglePause}>
                    {paused ? '▶️ Reanudar' : '⏸️ Pausar'}
                  </button>
                </div>
              </>
            )}
          </section>

          {(!simulating || paused) && (
            <section className="lch-results">
              <h2>{paused ? 'Resultados Parciales' : 'Resultados del Vuelo'}</h2>
              <div className="lch-result-grid">
                <article className="lch-result-card">
                  <h3>Altura Máxima</h3>
                  <div className="lch-result-val">{formatDist(maxY)}</div>
                </article>
                <article className="lch-result-card">
                  <h3>Velocidad Máxima</h3>
                  <div className="lch-result-val">{maxV.toFixed(2)} m/s</div>
                </article>
                <article className="lch-result-card">
                  <h3>Aceleración Máxima</h3>
                  <div className="lch-result-val">{maxA.toFixed(2)} m/s²</div>
                </article>
                <article className="lch-result-card">
                  <h3>Tiempo de Vuelo</h3>
                  <div className="lch-result-val">{totalT.toFixed(2)} s</div>
                </article>
              </div>

              <div className="lch-insight">
                <strong>¿Por qué RK4?</strong> El método de Runge-Kutta de 4º orden
                aproxima la solución de ecuaciones diferenciales ordinarias con un
                error de O(h⁴), mucho menor que métodos como Euler (O(h)).
                Para la trayectoria de un cohete, esto significa que la simulación
                es precisa incluso con pasos de tiempo relativamente grandes.
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

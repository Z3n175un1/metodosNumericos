import { useState, useRef, useEffect, useCallback } from 'react'
import { compile } from 'mathjs'
import { useCanvasPan, type Transform } from './useCanvasPan'
import './Telemetria.css'

interface DataPoint {
  id: number
  x: number
  fx: number
}

let nextId = 1

const PRESETS = [
  { label: '📈 Cuadrática', eq: 'x^2' },
  { label: '🌊 Senoidal', eq: 'sin(x)' },
  { label: '📉 Raíz cuadrada', eq: 'sqrt(x)' },
  { label: '🔥 Polinómica', eq: 'x^3 - 6*x^2 + 11*x - 6' },
  { label: '🎢 Exponencial', eq: 'exp(0.3*x)' },
]

function evalFx(expr: string, x: number): number {
  try {
    const node = compile(expr)
    const scope = { x, sin: Math.sin, cos: Math.cos, sqrt: Math.sqrt, exp: Math.exp, abs: Math.abs, pi: Math.PI, log: Math.log }
    const result = node.evaluate(scope)
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return Math.round(result * 10000) / 10000
  } catch {
    return 0
  }
}

function generateData(eq: string, a: number, b: number, n: number): DataPoint[] {
  const data: DataPoint[] = []
  const dx = (b - a) / n
  for (let i = 0; i <= n; i++) {
    const x = a + i * dx
    const fx = evalFx(eq, x)
    data.push({ id: nextId++, x: Math.round(x * 10000) / 10000, fx })
  }
  return data
}

function calcRectangle(data: DataPoint[]): number {
  let sum = 0
  for (let i = 0; i < data.length - 1; i++) {
    sum += data[i].fx * (data[i + 1].x - data[i].x)
  }
  return sum
}

function calcTrapezoid(data: DataPoint[]): number {
  let sum = 0
  for (let i = 0; i < data.length - 1; i++) {
    sum += ((data[i].fx + data[i + 1].fx) / 2) * (data[i + 1].x - data[i].x)
  }
  return Math.round(sum * 10000) / 10000
}

function chart(
  data: DataPoint[],
  eq: string,
  a: number,
  b: number,
  canvas: HTMLCanvasElement,
  t: Transform
) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const W = rect.width
  const H = rect.height

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)
  ctx.translate(t.x, t.y)
  ctx.scale(t.scale, t.scale)

  const pad = { top: 24, right: 24, bottom: 44, left: 56 }
  const cw = W - pad.left - pad.right
  const ch = H - pad.top - pad.bottom

  const maxY = Math.max(...data.map(d => d.fx), 1) * 1.15
  const minY = Math.min(...data.map(d => d.fx), 0)
  const yRange = maxY - minY || 1

  const xMin = a
  const xMax = b
  const xRange = xMax - xMin || 1

  const xS = (x: number) => pad.left + ((x - xMin) / xRange) * cw
  const yS = (y: number) => pad.top + ch - ((y - minY) / yRange) * ch
  const y0 = yS(0)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * ch
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(W - pad.right, y)
    ctx.stroke()
    const x = pad.left + (i / 5) * cw
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, pad.top + ch)
    ctx.stroke()
  }

  // Theoretical curve (continuous, smooth)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 6])
  ctx.beginPath()
  const steps = 200
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * xRange
    const fx = evalFx(eq, x)
    const px = xS(x)
    const py = yS(fx)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.setLineDash([])

  // Rectangles fill
  ctx.fillStyle = 'rgba(192, 132, 252, 0.12)'
  for (let i = 0; i < data.length - 1; i++) {
    const x = xS(data[i].x)
    const w = xS(data[i + 1].x) - x
    const y = yS(data[i].fx)
    const h = y0 - y
    if (h > 0) ctx.fillRect(x, y, Math.max(w, 0.5), h)
    else ctx.fillRect(x, y0, Math.max(w, 0.5), y - y0)
  }

  // Trapezoids outline
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.35)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  for (let i = 0; i < data.length - 1; i++) {
    const x1 = xS(data[i].x)
    const x2 = xS(data[i + 1].x)
    const y1 = yS(data[i].fx)
    const y2 = yS(data[i + 1].fx)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x2, y0)
    ctx.lineTo(x1, y0)
    ctx.closePath()
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Data line (discrete)
  ctx.strokeStyle = '#c084fc'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i < data.length; i++) {
    const x = xS(data[i].x)
    const y = yS(data[i].fx)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Data points
  ctx.fillStyle = '#fff'
  for (const d of data) {
    const x = xS(d.x)
    const y = yS(d.fx)
    ctx.beginPath()
    ctx.arc(x, y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Zero line
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, y0)
  ctx.lineTo(W - pad.right, y0)
  ctx.stroke()

  // Axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i <= 5; i++) {
    const x = xMin + (i / 5) * xRange
    ctx.fillText(`${x.toFixed(1)}`, xS(x), H - 20)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 5; i++) {
    const y = minY + (i / 5) * yRange
    ctx.fillText(`${y.toFixed(1)}`, pad.left - 10, pad.top + ch - (i / 5) * ch)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('x', W - pad.right, H - 20)
  ctx.textBaseline = 'top'
  ctx.fillText('f(x)', pad.left, 0)
}

export default function Telemetria({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<DataPoint[] | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [eqError, setEqError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editX, setEditX] = useState('')
  const [editFx, setEditFx] = useState('')

  const [equation, setEquation] = useState('x^2')
  const [a, setA] = useState(0)
  const [b, setB] = useState(4)
  const [n, setN] = useState(8)

  const { setDrawFn, getTransform } = useCanvasPan(canvasRef)

  const drawChart = useCallback(() => {
    if (data) chart(data, equation, a, b, canvasRef.current!, getTransform())
  }, [data, equation, a, b, getTransform])

  useEffect(() => {
    setDrawFn(drawChart)
  }, [drawChart, setDrawFn])

  const generate = useCallback(() => {
    setEqError(null)
    try { compile(equation) }
    catch {
      setEqError('Ecuación inválida. Usá x como variable. Ej: x^2, sin(x), exp(x)')
      return
    }
    if (b <= a) {
      setEqError('El límite superior b debe ser mayor que a.')
      return
    }
    if (n < 1) {
      setEqError('Se necesita al menos 1 subintervalo.')
      return
    }
    const newData = generateData(equation, a, b, n)
    setData(newData)
    setEditingId(null)
  }, [equation, a, b, n])

  useEffect(() => { drawChart() }, [drawChart])
  useEffect(() => {
    const onResize = () => drawChart()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawChart])

  const sorted = data ? [...data].sort((a, b) => a.x - b.x) : []
  const dx = (b - a) / n

  const rectResult = sorted.length ? calcRectangle(sorted) : null
  const trapResult = sorted.length ? calcTrapezoid(sorted) : null
  const diff = sorted.length && rectResult !== null && trapResult !== null
    ? Math.abs(rectResult! - trapResult!)
    : null

  const updatePoint = useCallback((id: number, field: 'x' | 'fx', value: number) => {
    setData(prev => prev
      ? prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      : prev)
  }, [])

  const addPoint = useCallback(() => {
    if (!data) return
    const lastX = Math.max(...data.map(d => d.x))
    setData(prev => prev
      ? [...prev, { id: nextId++, x: lastX + dx, fx: 0 }]
      : prev)
  }, [data, dx])

  const removePoint = useCallback((id: number) => {
    if (!data) return
    setData(prev => {
      if (!prev) return prev
      const next = prev.filter(p => p.id !== id)
      return next.length >= 2 ? next : prev
    })
  }, [])

  const startEdit = useCallback((id: number, x: number, fx: number) => {
    setEditingId(id)
    setEditX(String(x))
    setEditFx(String(fx))
  }, [])

  const commitEdit = useCallback(() => {
    if (editingId === null) return
    const newX = parseFloat(editX)
    const newFx = parseFloat(editFx)
    if (isNaN(newX) || isNaN(newFx)) return
    updatePoint(editingId, 'x', newX)
    updatePoint(editingId, 'fx', newFx)
    setEditingId(null)
  }, [editingId, editX, editFx, updatePoint])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingId(null)
  }, [commitEdit])

  return (
    <div className="telemetria">
      <header className="tel-header">
        <button className="tel-back" onClick={onBack}>← Volver</button>
        <div>
          <h1 className="tel-title">Panel de Telemetría y Sensorización</h1>
          <p className="tel-subtitle">Métodos del Rectángulo y Trapecio</p>
        </div>
      </header>

      <section className="tel-intro">
        <p>
          Definí una <strong>integral definida</strong> y aproximala numéricamente
          con los métodos del Rectángulo y del Trapecio. Compará sus resultados
          y visualizá cómo cada uno aproxima el área bajo la curva.
        </p>
      </section>

      <section className="tel-eq-section">
        <div className="tel-eq-card">
          <h2>Integral Definida</h2>

          <div className="tel-eq-presets">
            {PRESETS.map(p => (
              <button
                key={p.label}
                className={`tel-eq-preset ${equation === p.eq ? 'active' : ''}`}
                onClick={() => setEquation(p.eq)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="tel-integral-display">
            <span className="tel-integral-symbol">∫</span>
            <span className="tel-integral-limits">
              <span className="tel-integral-sup">{b.toFixed(1)}</span>
              <span className="tel-integral-sub">{a.toFixed(1)}</span>
            </span>
            <span className="tel-integrand">
              <input
                className="tel-eq-input tel-eq-input--inline"
                value={equation}
                onChange={e => setEquation(e.target.value)}
                placeholder="x^2"
                spellCheck={false}
              />
            </span>
            <span className="tel-integral-dx">dx</span>
          </div>

          <div className="tel-eq-params">
            <label>
              a
              <input type="number" step="any" value={a} onChange={e => setA(Number(e.target.value))} />
            </label>
            <label>
              b
              <input type="number" step="any" value={b} onChange={e => setB(Number(e.target.value))} />
            </label>
            <label>
              n (subintervalos)
              <input type="number" min={1} max={200} value={n} onChange={e => setN(Math.max(1, Number(e.target.value)))} />
            </label>
            <label className="tel-param-dx">
              Δx
              <span className="tel-param-readonly">{(b - a) / n}</span>
            </label>
          </div>

          {eqError && <p className="tel-error">{eqError}</p>}

          <button className="tel-eq-generate" onClick={generate}>
            📊 Generar Tabla de Valores
          </button>
        </div>
      </section>

      {data && (
        <>
          <section className="tel-data">
            <div className="tel-split">
              <div className="tel-split-table">
                <h2>Datos: x &nbsp;|&nbsp; f(x)</h2>
                <div className="tel-table-wrap">
                  <table className="tel-table">
                    <thead>
                      <tr>
                        <th>x</th>
                        <th>f(x)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(d => (
                        <tr
                          key={d.id}
                          className={editingId === d.id ? 'tel-row-editing' : ''}
                        >
                          <td>
                            {editingId === d.id ? (
                              <input
                                className="tel-input"
                                type="number"
                                step="any"
                                value={editX}
                                onChange={e => setEditX(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="tel-cell"
                                onClick={() => startEdit(d.id, d.x, d.fx)}
                              >
                                {d.x.toFixed(3)}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingId === d.id ? (
                              <input
                                className="tel-input"
                                type="number"
                                step="any"
                                value={editFx}
                                onChange={e => setEditFx(e.target.value)}
                                onKeyDown={handleKeyDown}
                              />
                            ) : (
                              <span
                                className="tel-cell"
                                onClick={() => startEdit(d.id, d.x, d.fx)}
                              >
                                {d.fx.toFixed(4)}
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="tel-btn-del"
                              title="Eliminar fila"
                              onClick={() => removePoint(d.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editingId !== null && (
                  <div className="tel-edit-actions">
                    <button className="tel-btn-sm" onClick={commitEdit}>✓ Confirmar</button>
                    <button className="tel-btn-sm tel-btn-sm--sec" onClick={() => setEditingId(null)}>✕ Cancelar</button>
                  </div>
                )}
                <button className="tel-btn-add" onClick={addPoint}>
                  + Agregar fila
                </button>
              </div>

              <div className="tel-split-chart">
                <h2>Visualización en Tiempo Real</h2>
                <div className="tel-chart-wrap">
                  <canvas ref={canvasRef} className="tel-chart" />
                  <div className="tel-legend">
                    <span><span className="tel-ledge tel-ledge--line" /> f(x)</span>
                    <span><span className="tel-ledge tel-ledge--rect" /> Rectángulos (Σ f(xᵢ)·Δx)</span>
                    <span><span className="tel-ledge tel-ledge--trap" /> Trapecios (Σ (f(xᵢ)+f(xᵢ₊₁))/2·Δx)</span>
                    <span><span className="tel-ledge tel-ledge--theor" /> Curva exacta</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="tel-results">
            <h2>Resultados de la Integración</h2>
            <div className="tel-cards">
              <article className="tel-card tel-card--rect">
                <h3>Método del Rectángulo</h3>
                <div className="tel-formula">∫ f(x) dx ≈ Σ f(xᵢ) · Δx</div>
                <div className="tel-val">{rectResult!.toFixed(4)}</div>
                <p>
                  Aproxima el área usando rectángulos cuya altura es el valor
                  de la función en el extremo izquierdo de cada subintervalo.
                </p>
              </article>
              <article className="tel-card tel-card--trap">
                <h3>Método del Trapecio</h3>
                <div className="tel-formula">∫ f(x) dx ≈ Σ (f(xᵢ)+f(xᵢ₊₁))/2 · Δx</div>
                <div className="tel-val">{trapResult!.toFixed(4)}</div>
                <p>
                  Conecta los puntos de la función con rectas, formando
                  trapecios que se ajustan mejor a la forma real de la curva.
                </p>
              </article>
            </div>

            <div className="tel-diff">
              <strong>Diferencia:</strong> {diff!.toFixed(6)} — El método del
              Trapecio reduce el error respecto al del Rectángulo porque sus
              diagonales capturan la variación de f(x) dentro de cada intervalo.
            </div>
          </section>

          <section className="tel-steps">
            <h2>Demostración paso a paso</h2>
            <div className="tel-steps-grid">
              <div className="tel-step">
                <span className="tel-step-num">1</span>
                <h4>Función</h4>
                <p className="tel-step-mono">f(x) = {equation}</p>
              </div>
              <div className="tel-step">
                <span className="tel-step-num">2</span>
                <h4>Intervalos</h4>
                <p>a={a}, b={b}, n={n}, Δx={dx.toFixed(4)}</p>
              </div>
              <div className="tel-step">
                <span className="tel-step-num">3</span>
                <h4>Rectángulo</h4>
                <p className="tel-step-mono">
                  Σ f(xᵢ)·Δx = {rectResult!.toFixed(4)}
                </p>
              </div>
              <div className="tel-step">
                <span className="tel-step-num">4</span>
                <h4>Trapecio</h4>
                <p>Σ (f(xᵢ)+f(xᵢ₊₁))/2·Δx = {trapResult!.toFixed(4)}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

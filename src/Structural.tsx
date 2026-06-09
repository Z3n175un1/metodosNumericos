import { useState, useRef, useEffect, useCallback } from 'react'
import { compile } from 'mathjs'
import { useCanvasPan, type Transform } from './useCanvasPan'
import './Structural.css'

interface ShapePreset {
  label: string
  desc: string
  fn: (x: number, R: number, L: number) => number
}

const SHAPES: Record<string, ShapePreset> = {
  ogive: {
    label: 'Ojiva tangente',
    desc: 'Perfil aerodinámico de un cohete real',
    fn: (x, R, L) => R * Math.sin((Math.PI / 2) * (x / L)),
  },
  parabolic: {
    label: 'Parabólico',
    desc: 'Tanque con base curva suave',
    fn: (x, R, L) => R * Math.sqrt(x / L),
  },
  conical: {
    label: 'Cónico',
    desc: 'Forma de cono recto',
    fn: (x, R, L) => R * (x / L),
  },
}

function evalFn(expr: string, x: number, R: number, L: number): number {
  try {
    const node = compile(expr)
    const scope = { x, R, L, sin: Math.sin, cos: Math.cos, sqrt: Math.sqrt, exp: Math.exp, abs: Math.abs, pi: Math.PI }
    const result = node.evaluate(scope)
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return Math.round(result * 1000000) / 1000000
  } catch {
    return 0
  }
}

function simpson13(f: (x: number) => number, a: number, b: number, n: number): number {
  const nn = n % 2 === 0 ? n : n + 1
  const h = (b - a) / nn
  let sum = f(a) + f(b)
  for (let i = 1; i < nn; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * f(a + i * h)
  }
  return (h / 3) * sum
}

function simpson38(f: (x: number) => number, a: number, b: number, n: number): number {
  let nn = n
  while (nn % 3 !== 0) nn++
  const h = (b - a) / nn
  let sum = f(a) + f(b)
  for (let i = 1; i < nn; i++) {
    sum += (i % 3 === 0 ? 2 : 3) * f(a + i * h)
  }
  return (3 * h / 8) * sum
}

function exactVolume(shapeId: string, R: number, L: number): number | null {
  switch (shapeId) {
    case 'conical': return (1 / 3) * Math.PI * R * R * L
    case 'parabolic': return (1 / 2) * Math.PI * R * R * L
    case 'ogive': return null
    default: return null
  }
}

function formulaProcess(
  shapeId: string,
  customEq: string,
  x: number,
  R: number,
  L: number
): string {
  const rStr = R.toFixed(2)
  const xStr = x.toFixed(4)
  const lStr = L.toFixed(2)
  switch (shapeId) {
    case 'ogive':
      return `${rStr}·sin(π/2·${xStr}/${lStr})`
    case 'parabolic':
      return `${rStr}·√(${xStr}/${lStr})`
    case 'conical':
      return `${rStr}·${xStr}/${lStr}`
    case 'custom':
      return customEq.replace(/x/g, xStr).replace(/R/g, rStr).replace(/L/g, lStr)
    default:
      return ''
  }
}

function drawProfile(
  shapeId: string,
  customEq: string,
  R: number,
  L: number,
  a: number,
  n: number,
  canvas: HTMLCanvasElement,
  t: Transform
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
  ctx.translate(t.x, t.y)
  ctx.scale(t.scale, t.scale)

  const pad = { t: 28, b: 48, l: 60, r: 40 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b

  const rad = (x: number) => {
    if (shapeId === 'custom') return evalFn(customEq, x, R, L)
    return SHAPES[shapeId]?.fn(x, R, L) ?? 0
  }

  // Uniform scale to fit both dimensions
  const pixPerMeter = Math.min(cw / L, ch / (2 * R)) * 0.85
  const ox = pad.l + (cw - L * pixPerMeter) / 2
  const oy = pad.t + (ch - 2 * R * pixPerMeter) / 2
  const cx = ox + L * pixPerMeter / 2

  const xPx = (x: number) => ox + x * pixPerMeter
  const rPx = (r: number) => r * pixPerMeter

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 8; i++) {
    const x = ox + (i / 8) * L * pixPerMeter
    ctx.beginPath()
    ctx.moveTo(x, pad.t)
    ctx.lineTo(x, pad.t + ch)
    ctx.stroke()
  }
  for (let i = 0; i <= 6; i++) {
    const y = oy + (i / 6) * 2 * R * pixPerMeter
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(W - pad.r, y)
    ctx.stroke()
  }

  const steps = 200
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * L
    const r = rad(x)
    pts.push({ x: xPx(x), y: rPx(r) })
  }

  // Simpson segment fills (parabolic arcs from a to L)
  const totalRange = L - a
  const nn = n % 2 === 0 ? n : n + 1
  const h = totalRange / nn
  const colA = 'rgba(192, 132, 252, 0.12)'
  const colB = 'rgba(0, 200, 255, 0.09)'
  const midY = oy + R * pixPerMeter

  for (let s = 0; s < nn; s += 2) {
    const x0 = a + s * h
    const x1 = a + (s + 1) * h
    const x2 = a + (s + 2) * h
    const r0 = rad(x0)
    const r1 = rad(x1)
    const r2 = rad(x2)

    ctx.fillStyle = (s / 2) % 2 === 0 ? colA : colB
    ctx.beginPath()

    // Top arc (parabola through r0, r1, r2)
    const p0x = xPx(x0), p0y = midY - rPx(r0)
    const p1x = xPx(x1), p1y = midY - rPx(r1)
    const p2x = xPx(x2), p2y = midY - rPx(r2)
    ctx.moveTo(p0x, p0y)
    const cpx = 2 * p1x - p0x / 2 - p2x / 2
    const cpy = 2 * p1y - p0y / 2 - p2y / 2
    ctx.quadraticCurveTo(cpx, cpy, p2x, p2y)

    // Right line down to bottom
    ctx.lineTo(p2x, midY + rPx(r2))

    // Bottom arc (parabola through r0, r1, r2 mirrored)
    const bp0x = p0x, bp0y = midY + rPx(r0)
    const bp1x = p1x, bp1y = midY + rPx(r1)
    const bp2x = p2x, bp2y = midY + rPx(r2)
    const bcpx = 2 * bp1x - bp0x / 2 - bp2x / 2
    const bcpy = 2 * bp1y - bp0y / 2 - bp2y / 2
    ctx.quadraticCurveTo(bcpx, bcpy, bp0x, bp0y)

    ctx.closePath()
    ctx.fill()

    // Vertical dividers
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(p0x, midY - rPx(r0))
    ctx.lineTo(bp0x, bp0y)
    ctx.stroke()
  }

  // Profile outline (curve)
  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const px = pts[i].x
    const py = midY - pts[i].y
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const px = pts[i].x
    const py = midY + pts[i].y
    ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()

  // Center axis
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.moveTo(ox, midY)
  ctx.lineTo(ox + L * pixPerMeter, midY)
  ctx.stroke()
  ctx.setLineDash([])

  // Simpson data points
  ctx.fillStyle = 'rgba(192, 132, 252, 0.7)'
  for (let i = 0; i <= nn; i++) {
    const x = a + i * h
    const r = rPx(rad(x))
    const px = xPx(x)
    for (const sy of [midY - r, midY + r]) {
      ctx.beginPath()
      ctx.arc(px, sy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '12px system-ui, sans-serif'

  // R
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`R = ${R} m`, cx + 8, midY - rPx(R) - 6)

  // R bracket
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, oy)
  ctx.lineTo(cx, midY - rPx(R))
  ctx.stroke()

  // L
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`L = ${L} m`, cx, pad.t + ch + 8)

  // L dimension line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(ox, pad.t + ch + 2)
  ctx.lineTo(ox + L * pixPerMeter, pad.t + ch + 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ox, pad.t + ch - 4)
  ctx.lineTo(ox, pad.t + ch + 8)
  ctx.moveTo(ox + L * pixPerMeter, pad.t + ch - 4)
  ctx.lineTo(ox + L * pixPerMeter, pad.t + ch + 8)
  ctx.stroke()

  // Title
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillText('Corte transversal del tanque — perfil r(x)', pad.l, 6)
}

export default function Structural({ onBack }: { onBack: () => void }) {
  const [shapeId, setShapeId] = useState('ogive')
  const [customEq, setCustomEq] = useState('R * sin(pi/2 * x/L)')
  const [diameter, setDiameter] = useState(2)
  const [aLimit, setALimit] = useState(0)
  const [bLimit, setBLimit] = useState(6)
  const [n, setN] = useState(6)
  const [showVolume, setShowVolume] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const R = diameter / 2
  const L = bLimit - aLimit
  const dx = L / n

  const fn = useCallback(
    (x: number) => {
      if (shapeId === 'custom') return evalFn(customEq, x, R, bLimit)
      return SHAPES[shapeId]?.fn(x, R, bLimit) ?? 0
    },
    [shapeId, customEq, R, bLimit]
  )

  const integrand = useCallback(
    (x: number) => Math.PI * fn(x) * fn(x),
    [fn]
  )

  // Generate data table points
  const dataPoints: { x: number; fx: number; process: string }[] = []
  const nn = n % 2 === 0 ? n : n + 1
  const hh = (bLimit - aLimit) / nn
  for (let i = 0; i <= nn; i++) {
    const x = aLimit + i * hh
    dataPoints.push({ x, fx: fn(x), process: formulaProcess(shapeId, customEq, x, R, bLimit) })
  }

  const v13 = simpson13(integrand, aLimit, bLimit, n)
  const v38 = simpson38(integrand, aLimit, bLimit, n)
  const exact = aLimit === 0 ? exactVolume(shapeId, R, bLimit) : null
  const v13liters = v13 * 1000
  const v38liters = v38 * 1000
  const exactLiters = exact !== null ? exact * 1000 : null

  const { setDrawFn, getTransform } = useCanvasPan(canvasRef, showVolume)

  const draw = useCallback(() => {
    if (canvasRef.current) drawProfile(shapeId, customEq, R, bLimit, aLimit, n, canvasRef.current, getTransform())
  }, [shapeId, customEq, R, bLimit, aLimit, n, getTransform])

  useEffect(() => {
    setDrawFn(draw)
  }, [draw, setDrawFn])

  useEffect(() => {
    if (showVolume) {
      requestAnimationFrame(() => draw())
    }
  }, [draw, showVolume])

  useEffect(() => {
    if (!showVolume) return
    const onResize = () => requestAnimationFrame(() => draw())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw, showVolume])

  const currentShape = SHAPES[shapeId]

  return (
    <div className="structural">
      <header className="str-header">
        <button className="str-back" onClick={onBack}>← Volver</button>
        <div>
          <h1 className="str-title">Cálculo de Diseño Estructural</h1>
          <p className="str-subtitle">Método de Simpson</p>
        </div>
      </header>

      <section className="str-intro">
        <p>
          El tanque de combustible del cohete tiene forma <strong>ojival</strong>.
          Simpson se destaca con curvas suaves como esta, aproximando el área bajo
          la curva con <strong>parábolas</strong> en lugar de rectas.
        </p>
      </section>

      <section className="str-controls">
        <div className="str-card">
          <h2>Parámetros del Tanque</h2>

          <div className="str-integral-display">
            <span className="str-integral-symbol">∫</span>
            <span className="str-integral-limits">
              <span className="str-integral-sup">{bLimit}</span>
              <span className="str-integral-sub">{aLimit}</span>
            </span>
            <span className="str-integrand">
              π · [f(x)]² dx
            </span>
          </div>

          <div className="str-shapes">
            {Object.entries(SHAPES).map(([id, s]) => (
              <button
                key={id}
                className={`str-shape-btn ${shapeId === id ? 'active' : ''}`}
                onClick={() => setShapeId(id)}
              >
                <strong>{s.label}</strong>
                <span>{s.desc}</span>
              </button>
            ))}
            <button
              className={`str-shape-btn ${shapeId === 'custom' ? 'active' : ''}`}
              onClick={() => setShapeId('custom')}
            >
              <strong>Personalizado</strong>
              <span>Definí tu propia función r(x)</span>
            </button>
          </div>

          {shapeId === 'custom' && (
            <div className="str-custom-row">
              <span className="str-custom-label">f(x) =</span>
              <input
                className="str-custom-input"
                value={customEq}
                onChange={e => setCustomEq(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}

          <div className="str-params">
            <label>
              Diámetro (m)
              <input type="number" min={0.1} step={0.1} value={diameter} onChange={e => setDiameter(Math.max(0.1, Number(e.target.value)))} />
            </label>
            <label>
              a (límite inferior)
              <input type="number" min={0} step={0.1} value={aLimit} onChange={e => setALimit(Math.max(0, Number(e.target.value)))} />
            </label>
            <label>
              b (límite superior)
              <input type="number" min={0.1} step={0.1} value={bLimit} onChange={e => setBLimit(Math.max(0.1, Number(e.target.value)))} />
            </label>
            <label>
              n (subintervalos)
              <input type="number" min={2} max={100} step={1} value={n} onChange={e => setN(Math.max(2, Number(e.target.value)))} />
            </label>
          </div>

          <button className="str-calc-btn" onClick={() => setShowVolume(true)}>
            🔬 Calcular Volumen
          </button>
        </div>
      </section>

      {showVolume && (
        <>
          <section className="str-visual">
            <h2>Visualización del Tanque</h2>
            <div className="str-split">
              <div className="str-split-table">
                <h3>Resolución paso a paso</h3>
                <div className="str-table-wrap">
                  <table className="str-table">
                    <thead>
                      <tr>
                        <th>x</th>
                        <th>f(x) = {shapeId === 'custom' ? customEq : currentShape?.label}</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataPoints.map((d, i) => (
                        <tr key={i}>
                          <td>{d.x.toFixed(4)}</td>
                          <td className="str-td-mono">{d.process}</td>
                          <td className="str-td-result">{d.fx.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="str-split-chart">
                <h3>Perfil — Corte Transversal</h3>
                <div className="str-canvas-wrap">
                  <canvas ref={canvasRef} className="str-canvas" />
                </div>
                <div className="str-visual-legend">
                  <span><span className="str-ledge str-ledge--profile" /> f(x)</span>
                  <span><span className="str-ledge str-ledge--simp" /> Segmentos de Simpson</span>
                  <span><span className="str-ledge str-ledge--point" /> Puntos muestreados</span>
                </div>
              </div>
            </div>
          </section>

          <section className="str-results">
            <h2>Volumen del Tanque</h2>
            <div className="str-result-grid">
              <article className="str-result-card">
                <h3>Simpson 1/3</h3>
                <div className="str-formula">V ≈ (Δx/3)[f(x₀) + 4·Σₒdd + 2·Σₑᵥₑₙ + f(xₙ)]</div>
                <div className="str-volume">
                  <span className="str-val">{v13.toFixed(4)}</span> m<sup>3</sup>
                </div>
                <div className="str-volume">
                  <span className="str-val">{v13liters.toFixed(1)}</span> litros
                </div>
                <p>
                  n = {n % 2 === 0 ? n : n + 1} (forzado a par). Aproxima cada par
                  de intervalos con una parábola. Alta precisión en curvas suaves.
                </p>
              </article>

              <article className="str-result-card">
                <h3>Simpson 3/8</h3>
                <div className="str-formula">V ≈ (3Δx/8)[f(x₀) + 3·Σᵣₑₛₜₒ + 2·Σₘᵤₗₜ₃ + f(xₙ)]</div>
                <div className="str-volume">
                  <span className="str-val">{v38.toFixed(4)}</span> m<sup>3</sup>
                </div>
                <div className="str-volume">
                  <span className="str-val">{v38liters.toFixed(1)}</span> litros
                </div>
                <p>
                  n = {n % 3 === 0 ? n : n + (3 - n % 3)} (forzado a múltiplo de 3).
                  Usa polinomios cúbicos, ideal para cambios de curvatura.
                </p>
              </article>
            </div>

            <div className="str-compare">
              <div className="str-compare-row">
                <span>Diferencia entre métodos:</span>
                <strong>{Math.abs(v13 - v38).toFixed(6)} m³</strong>
              </div>
              <div className="str-compare-row">
                <span>Δx = h:</span>
                <strong>{dx.toFixed(4)} m</strong>
              </div>
              {exact !== null && (
                <div className="str-compare-row">
                  <span>Volumen exacto ({currentShape?.label}):</span>
                  <strong>{exact.toFixed(4)} m³ ({exactLiters!.toFixed(1)} L)</strong>
                </div>
              )}
              {exact !== null && (
                <div className="str-compare-row str-compare-error">
                  <span>Error Simpson 1/3:</span>
                  <strong>{Math.abs(v13 - exact).toFixed(6)} m³ ({(Math.abs(v13 - exact) / exact * 100).toFixed(3)}%)</strong>
                </div>
              )}
              {exact !== null && (
                <div className="str-compare-row str-compare-error">
                  <span>Error Simpson 3/8:</span>
                  <strong>{Math.abs(v38 - exact).toFixed(6)} m³ ({(Math.abs(v38 - exact) / exact * 100).toFixed(3)}%)</strong>
                </div>
              )}
            </div>

            <div className="str-insight">
              <strong>¿Por qué Simpson?</strong> A diferencia del Rectángulo y el
              Trapecio, Simpson aproxima la función con <strong>parábolas</strong>
              en lugar de rectas horizontales o diagonales. Para funciones suaves
              como el perfil ojival de un tanque, esto permite una precisión mucho
              mayor con la misma cantidad de intervalos. El nombre proviene de
              Thomas Simpson (1710-1761), aunque realmente fue descubierto por
              James Gregory un siglo antes.
            </div>
          </section>

          <section className="str-steps">
            <h2>Demostración paso a paso</h2>
            <div className="str-steps-grid">
              <div className="str-step">
                <span className="str-step-num">1</span>
                <h4>Función f(x)</h4>
                <p className="str-step-mono">f(x) = {currentShape?.label ?? customEq}</p>
              </div>
              <div className="str-step">
                <span className="str-step-num">2</span>
                <h4>Límites</h4>
                <p>∫ desde a={aLimit} hasta b={bLimit}</p>
              </div>
              <div className="str-step">
                <span className="str-step-num">3</span>
                <h4>Área transversal</h4>
                <p>A(x) = π · r(x)²</p>
              </div>
              <div className="str-step">
                <span className="str-step-num">4</span>
                <h4>Simpson</h4>
                <p>V ≈ ∫ₐᵇ A(x) dx</p>
              </div>
              <div className="str-step">
                <span className="str-step-num">5</span>
                <h4>Convertir a litros</h4>
                <p>1 m³ = 1000 L</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

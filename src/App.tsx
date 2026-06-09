import { useState } from 'react'
import BlackHole from './BlackHole'
import StarField from './StarField'
import Telemetria from './Telemetria'
import Structural from './Structural'
import Launch from './Launch'
import Nav from './Nav'
import type { NavView } from './Nav'
import './App.css'

type View = NavView | 'telemetria' | 'structural' | 'launch'

const methodCards = [
  { id: 'telemetria' as View, titulo: 'Panel de Telemetría y Sensorización', subtitulo: 'Métodos del Rectángulo y Trapecio' },
  { id: 'structural' as View, titulo: 'Cálculo de Diseño Estructural', subtitulo: 'Método de Simpson' },
  { id: 'launch' as View, titulo: 'Simulador de Lanzamiento en Tiempo Real', subtitulo: 'Método de Runge-Kutta (RK4)' },
]

const teoria = [
  {
    titulo: 'Rectángulo y Trapecio',
    subtitulo: 'Integración numérica básica',
    historia: 'El método del rectángulo (suma de Riemann) fue formalizado por Bernhard Riemann en 1854 como base de la teoría de integración. El método del trapecio era conocido por los antiguos griegos — Arquímedes lo usó para aproximar el área del círculo. Hoy son la puerta de entrada al análisis numérico.',
    formula: (
      <>
        <strong>Rectángulo:</strong> ∫ₐᵇ f(x)dx ≈ Σ f(xᵢ)·Δx<br />
        <strong>Trapecio:</strong> ∫ₐᵇ f(x)dx ≈ Σ (f(xᵢ)+f(xᵢ₊₁))/2 · Δx
      </>
    ),
    aplicacion: 'Procesamiento de señales de sensores, estimación de consumo energético en telemetría, integración de datos discretos de experimentos de laboratorio.',
  },
  {
    titulo: 'Simpson',
    subtitulo: 'Integración con parábolas',
    historia: 'Thomas Simpson (1710–1761) publicó la regla que hoy lleva su nombre, aunque el matemático escocés James Gregory la descubrió un siglo antes. Simpson aproxima la integral ajustando parábolas en lugar de rectas, lo que cuadruplica la precisión con el mismo número de puntos.',
    formula: (
      <>
        <strong>1/3:</strong> ∫ₐᵇ f(x)dx ≈ (Δx/3)[f(x₀) + 4Σₒdd + 2Σₑᵥₑₙ + f(xₙ)]<br />
        <strong>3/8:</strong> ∫ₐᵇ f(x)dx ≈ (3Δx/8)[f(x₀) + 3Σᵣₑₛₜ + 2Σₘᵤₗₜ₃ + f(xₙ)]
      </>
    ),
    aplicacion: 'Cálculo de volúmenes de tanques y tuberías, centroides y momentos de inercia en perfiles estructurales, deformaciones en vigas de sección variable.',
  },
  {
    titulo: 'Runge-Kutta (RK4)',
    subtitulo: 'Solución de ecuaciones diferenciales',
    historia: 'Carl Runge (1856–1927) y Martin Kutta (1867–1944) desarrollaron este método en la Universidad de Gotinga para resolver ecuaciones diferenciales ordinarias. Es el algoritmo más usado del mundo para simular sistemas físicos — desde cohetes hasta dinámica de fluidos.',
    formula: (
      <>
        yₙ₊₁ = yₙ + (h/6)(k₁ + 2k₂ + 2k₃ + k₄) &nbsp;donde&nbsp;
        k₁ = f(tₙ, yₙ), k₂ = f(tₙ + h/2, yₙ + h·k₁/2),<br />
        k₃ = f(tₙ + h/2, yₙ + h·k₂/2), k₄ = f(tₙ + h, yₙ + h·k₃)
      </>
    ),
    aplicacion: 'Simulación de trayectorias de cohetes y proyectiles, mecánica orbital, motores de física en videojuegos, transferencia de calor, dinámica de fluidos computacional.',
  },
]

function App() {
  const [view, setView] = useState<View>('inicio')

  if (view === 'telemetria') return <Telemetria onBack={() => setView('inicio')} />
  if (view === 'structural') return <Structural onBack={() => setView('inicio')} />
  if (view === 'launch') return <Launch onBack={() => setView('inicio')} />

  return (
    <>
      <Nav current={view as NavView} onNavigate={v => setView(v)} />

      {/* ───── INICIO (BlackHole) ───── */}
      {view === 'inicio' && (
        <section className="relative w-full h-dvh bg-black flex items-center justify-center overflow-hidden">
          <BlackHole />
          <div className="relative z-10 text-center pointer-events-none flex flex-col items-center px-4">
            <h1 className="animate-fade-in animate-delay-200 text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-tight text-white [text-shadow:0_0_60px_rgba(0,150,255,0.3)]">
              Métodos Numéricos
            </h1>
            <p className="animate-blurred-fade-in animate-delay-500 text-white/50 max-w-lg mt-6">
              Visualización interactiva de métodos de integración y simulación
            </p>
          </div>
        </section>
      )}

      {/* ───── SELECCIÓN (StarField) ───── */}
      {view === 'seleccion' && (
        <section className="relative min-h-dvh bg-black flex items-center justify-center overflow-hidden">
          <StarField />
          <div className="relative z-10 w-full max-w-2xl px-6 py-24 space-y-4">
            {methodCards.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setView(c.id)}
                className="w-full text-left bg-black/50 backdrop-blur-md hover:bg-white/[8%] border border-white/10 hover:border-[#c084fc]/30 rounded-xl p-5 transition-all duration-200 cursor-pointer group"
              >
                <span className="text-xs font-semibold tracking-widest text-[#c084fc]/50 group-hover:text-[#c084fc]/80 transition-colors">
                  0{i + 1}
                </span>
                <h2 className="text-lg font-semibold text-gray-100 mt-1 group-hover:text-white transition-colors">
                  {c.titulo}
                </h2>
                <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                  {c.subtitulo}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ───── MÉTODOS ───── */}
      {view === 'metodos' && (
        <section className="min-h-dvh bg-linear-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f] px-6 pt-24 pb-20 flex flex-col gap-14 items-center">
          <div className="text-center space-y-2 pt-8">
            <h2 className="text-2xl font-semibold text-[#c084fc]">Teoría de los Métodos</h2>
            <p className="text-white/50 max-w-xl text-sm">Historia, formulación matemática y aplicaciones.</p>
          </div>

          {teoria.map((t, i) => (
            <div
              key={t.titulo}
              className="timeline-view animate-fade-in-up animate-range-[entry_0%_cover_30%] max-w-[900px] w-full bg-white/[3%] border border-white/8 rounded-2xl p-10 space-y-5"
            >
              <span className="text-xs font-semibold tracking-widest text-[#c084fc]/60 block">0{i + 1}</span>
              <h3 className="text-xl font-semibold text-gray-100">{t.titulo}</h3>
              <p className="text-sm text-[#c084fc]/70 font-medium -mt-3">{t.subtitulo}</p>
              <p className="text-sm leading-relaxed text-white/40 italic border-l-2 border-[#c084fc]/20 pl-3">{t.historia}</p>
              <div className="text-sm leading-relaxed text-white/50 font-mono bg-white/[2%] p-4 rounded-lg border border-white/5">{t.formula}</div>
              <p className="text-sm leading-relaxed text-white/40"><strong className="text-white/60">Aplicación:</strong> {t.aplicacion}</p>
            </div>
          ))}
        </section>
      )}

      {/* ───── INFO ───── */}
      {view === 'info' && (
        <section className="min-h-dvh bg-[#0a0a0f] px-6 pt-24 pb-20 flex flex-col items-center">
          <div className="max-w-3xl w-full pt-8 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-semibold text-[#c084fc]">Métodos Numéricos — 4° Semestre</h2>
              <p className="text-sm leading-relaxed text-white/50 max-w-2xl mx-auto">
                Esta materia introduce los fundamentos del análisis numérico para resolver
                problemas matemáticos que no tienen solución analítica cerrada. A lo largo del
                semestre se estudian métodos de aproximación para distintas áreas del cálculo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { tema: 'Ecuaciones no lineales', desc: 'Bisección, Newton-Raphson, Secante para encontrar raíces de funciones.' },
                { tema: 'Integración numérica', desc: 'Rectángulo, Trapecio, Simpson 1/3 y 3/8 para aproximar integrales definidas.' },
                { tema: 'Ecuaciones diferenciales', desc: 'Euler, Runge-Kutta de 2° y 4° orden para simular sistemas dinámicos.' },
              ].map(item => (
                <div key={item.tema} className="bg-white/[3%] border border-white/5 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-white/70">{item.tema}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/[2%] border border-white/5 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/70">Enfoque de la materia</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                El enfoque es práctico: cada método se implementa computacionalmente y se
                visualiza para comprender su comportamiento, errores y limitaciones. Los
                laboratorios integran cálculo, programación y física para resolver problemas
                reales de ingeniería. Al final del curso, los estudiantes habrán construido
                una biblioteca de métodos numéricos funcional y comprendido cuándo y por qué
                usar cada uno.
              </p>
            </div>

            <div className="bg-white/[2%] border border-white/5 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/70">Tecnologías utilizadas</h3>
              <div className="flex flex-wrap gap-2">
                {['React', 'TypeScript', 'Tailwind CSS', 'Math.js', 'Canvas API', 'Vite'].map(t => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/[5%] border border-white/5 text-white/50">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export default App

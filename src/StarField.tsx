import { useEffect, useRef } from 'react'

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    let id = 0

    interface S { x: number; y: number; a: number; d: number; s: number; v: number; o: number }

    const stars: S[] = []
    let W = 0, H = 0, cx = 0, cy = 0

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      W = r.width; H = r.height
      canvas.width = W * dpr; canvas.height = H * dpr
      cx = W / 2; cy = H / 2
    }

    const init = () => {
      resize()
      stars.length = 0
      for (let i = 0; i < 360; i++) {
        stars.push({
          x: cx, y: cy,
          a: (i / 360) * Math.PI * 2,
          d: 0, s: 0.3 + Math.random() * 1.2,
          v: Math.random() * 100, o: 0,
        })
      }
    }

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr, dpr)
      const maxD = Math.max(W, H) * 0.55

      for (const st of stars) {
        st.v += 0.008 * st.s
        st.d = ((st.v % 100) / 100) * maxD
        st.o = Math.sin(st.v * 0.8) * 0.5 + 0.5
        st.x = cx + Math.cos(st.a) * st.d
        st.y = cy + Math.sin(st.a) * st.d

        ctx.beginPath()
        ctx.arc(st.x, st.y, st.s * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${(st.o * 0.6 + 0.1).toFixed(3)})`
        ctx.fill()
      }
      id = requestAnimationFrame(draw)
    }

    init()
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

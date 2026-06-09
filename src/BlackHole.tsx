import { useEffect, useRef } from 'react'
import easingUtils from 'easing-utils'

interface Disc {
  x: number
  y: number
  w: number
  h: number
  sx: number
  sy: number
  p: number
  a: number
}

interface Dot {
  d: Disc
  a: number
  c: string
  p: number
  o: number
}

export default function BlackHole() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let rafId: number
    let render = { width: 0, hWidth: 0, height: 0, hHeight: 0, dpi: 1 }
    let discs: Disc[] = []
    let dots: Dot[] = []
    const startDisc = { x: 0, y: 0, w: 0, h: 0 }

    function setCanvasSize() {
      const rect = canvas.getBoundingClientRect()
      render = {
        width: rect.width,
        hWidth: rect.width * 0.5,
        height: rect.height,
        hHeight: rect.height * 0.5,
        dpi: window.devicePixelRatio,
      }
      canvas.width = render.width * render.dpi
      canvas.height = render.height * render.dpi
    }

    function tweenValue(start: number, end: number, p: number, ease?: string) {
      const delta = end - start
      const easeFn = ease
        ? (easingUtils as any)['ease' + ease.charAt(0).toUpperCase() + ease.slice(1)]
        : easingUtils.linear
      return start + delta * easeFn(p)
    }

    function tweenDisc(p: number): Disc {
      const scaleX = tweenValue(1, 0, p, 'outCubic')
      const scaleY = tweenValue(1, 0, p, 'outExpo')
      return {
        x: startDisc.x,
        y: startDisc.y + p * startDisc.h * 1,
        w: startDisc.w * scaleX,
        h: startDisc.h * scaleY,
        sx: scaleX,
        sy: scaleY,
        p,
        a: 0,
      }
    }

    function setDiscs() {
      discs = []
      startDisc.x = render.width * 0.5
      startDisc.y = render.height * 0
      startDisc.w = render.width * 1
      startDisc.h = render.height * 1

      const totalDiscs = 150
      for (let i = 0; i < totalDiscs; i++) {
        discs.push(tweenDisc(i / totalDiscs))
      }
    }

    function setDots() {
      dots = []
      const totalDots = 20000
      for (let i = 0; i < totalDots; i++) {
        const disc = discs[Math.floor(discs.length * Math.random())]
        dots.push({
          d: disc,
          a: 0,
          c: `rgb(${Math.random() * 0}, ${150 + Math.random() * 50}, ${150 + Math.random() * 105})`,
          p: Math.random(),
          o: Math.random(),
        })
      }
    }

    function setSizes() {
      setCanvasSize()
      setDiscs()
      setDots()
    }

    function moveDiscs() {
      for (const disc of discs) {
        disc.p = (disc.p + 0.0003) % 1
        const d = tweenDisc(disc.p)
        disc.x = d.x
        disc.y = d.y
        disc.w = d.w
        disc.h = d.h
        disc.sx = d.sx
        disc.sy = d.sy

        const p = disc.sx * disc.sy
        let a = 1
        if (p < 0.01) {
          a = Math.pow(Math.min(p / 0.01, 1), 3)
        } else if (p > 0.2) {
          a = 1 - Math.min((p - 0.2) / 0.8, 1)
        }
        disc.a = a
      }
    }

    function moveDots() {
      for (const dot of dots) {
        const v = tweenValue(0, 0.001, 1 - dot.d.sx * dot.d.sy, 'inExpo')
        dot.p = (dot.p + v) % 1
      }
    }

    function drawDiscs() {
      ctx.strokeStyle = '#0329'
      ctx.lineWidth = 1
      for (const disc of discs) {
        ctx.beginPath()
        ctx.globalAlpha = disc.a
        ctx.ellipse(disc.x, disc.y + disc.h, disc.w, disc.h, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.closePath()
      }
    }

    function drawDots() {
      for (const dot of dots) {
        const { d, a, p, c, o } = dot
        const _p = d.sx * d.sy
        ctx.fillStyle = c
        const newA = a + (Math.PI * 2 * p)
        const x = d.x + Math.cos(newA) * d.w
        const y = d.y + Math.sin(newA) * d.h
        ctx.globalAlpha = d.a * o
        ctx.beginPath()
        ctx.arc(x, y + d.h, 1 + _p * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.closePath()
      }
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(render.dpi, render.dpi)
      moveDiscs()
      moveDots()
      drawDiscs()
      drawDots()
      ctx.restore()
      rafId = requestAnimationFrame(tick)
    }

    setSizes()
    tick()

    const onResize = () => setSizes()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}

import { useRef, useEffect, useCallback, type RefObject } from 'react'

export interface Transform {
  x: number
  y: number
  scale: number
}

export function useCanvasPan(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean = true,
) {
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const drawFnRef = useRef<(() => void) | null>(null)

  const setDrawFn = useCallback((fn: () => void) => {
    drawFnRef.current = fn
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return

    const ptr = { x: 0, y: 0, ox: 0, oy: 0, dragging: false }

    const onDown = (e: MouseEvent) => {
      ptr.dragging = true
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.ox = transformRef.current.x
      ptr.oy = transformRef.current.y
      canvas.style.cursor = 'grabbing'
    }

    const onMove = (e: MouseEvent) => {
      if (!ptr.dragging) return
      transformRef.current.x = ptr.ox + e.clientX - ptr.x
      transformRef.current.y = ptr.oy + e.clientY - ptr.y
      drawFnRef.current?.()
    }

    const onUp = () => {
      ptr.dragging = false
      canvas.style.cursor = 'grab'
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const f = e.deltaY > 0 ? 0.9 : 1.1
      const t = transformRef.current
      t.scale = Math.max(0.1, Math.min(10, t.scale * f))
      drawFnRef.current?.()
    }

    const onDbl = () => {
      transformRef.current = { x: 0, y: 0, scale: 1 }
      drawFnRef.current?.()
    }

    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDbl)
    canvas.style.cursor = 'grab'

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDbl)
    }
  }, [canvasRef, enabled])

  const getTransform = useCallback((): Transform => ({ ...transformRef.current }), [])

  return { setDrawFn, getTransform }
}

import { useEffect, useRef, useState } from 'react'

const WS_URL = import.meta.env.VITE_WAKE_WS_URL || 'ws://127.0.0.1:8765'
const RECONNECT_DELAY_MS = 2000

/**
 * Connects to the local OpenWakeWord WebSocket bridge. Fires `onWake` whenever
 * the Python service sends a {"event":"wake"} message. Wake events received
 * while `isSttActive` is true are dropped so the running STT session is not
 * interrupted by self-spoken audio re-triggering the detector.
 */
export function useWakeWord({ onWake, isSttActive }) {
  const [isConnected, setIsConnected] = useState(false)
  const onWakeRef = useRef(onWake)
  const isSttActiveRef = useRef(isSttActive)

  useEffect(() => {
    onWakeRef.current = onWake
  }, [onWake])

  useEffect(() => {
    isSttActiveRef.current = isSttActive
  }, [isSttActive])

  useEffect(() => {
    let ws = null
    let reconnectTimer = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      try {
        ws = new WebSocket(WS_URL)
      } catch (e) {
        console.error('[wake-word] ws construct failed:', e)
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        console.log(`[wake-word] connected to ${WS_URL}`)
        setIsConnected(true)
      }

      ws.onmessage = (ev) => {
        let data
        try {
          data = JSON.parse(ev.data)
        } catch {
          return
        }
        if (data.event === 'wake') {
          if (isSttActiveRef.current) {
            console.log('[wake-word] suppressed (STT active):', data.label)
            return
          }
          console.log('[wake-word] detected:', data.label, 'score=', data.score)
          onWakeRef.current?.(data)
        } else if (data.event === 'ready') {
          console.log('[wake-word] server ready, label:', data.label)
        }
      }

      ws.onerror = (e) => {
        console.warn('[wake-word] ws error:', e?.message ?? e)
      }

      ws.onclose = () => {
        setIsConnected(false)
        if (!cancelled) {
          console.log(`[wake-word] disconnected; retrying in ${RECONNECT_DELAY_MS}ms`)
          scheduleReconnect()
        }
      }
    }

    const scheduleReconnect = () => {
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      if (ws && ws.readyState <= 1) ws.close()
    }
  }, [])

  return { isConnected }
}

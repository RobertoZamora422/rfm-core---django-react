import { useEffect, useRef } from 'react'
import { DATA_CHANGED_EVENT } from '../services/apiClient'

const DEFAULT_INTERVAL_MS = 0

export function useAutoRefresh(
  refresh,
  { intervalMs = DEFAULT_INTERVAL_MS, refreshOnMutation = true } = {},
) {
  const refreshRef = useRef(refresh)
  const timeoutRef = useRef(null)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    const scheduleRefresh = () => {
      if (document.hidden || timeoutRef.current) return

      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        refreshRef.current({ silent: true })
      }, 180)
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) scheduleRefresh()
    }

    const channel = refreshOnMutation && 'BroadcastChannel' in window
      ? new BroadcastChannel(DATA_CHANGED_EVENT)
      : null

    window.addEventListener('focus', scheduleRefresh)
    if (refreshOnMutation) window.addEventListener(DATA_CHANGED_EVENT, scheduleRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (refreshOnMutation) channel?.addEventListener('message', scheduleRefresh)

    const intervalId = intervalMs
      ? window.setInterval(scheduleRefresh, intervalMs)
      : null

    return () => {
      window.removeEventListener('focus', scheduleRefresh)
      if (refreshOnMutation) window.removeEventListener(DATA_CHANGED_EVENT, scheduleRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (refreshOnMutation) channel?.removeEventListener('message', scheduleRefresh)
      channel?.close()
      if (intervalId) window.clearInterval(intervalId)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [intervalMs, refreshOnMutation])
}

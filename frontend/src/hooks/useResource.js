import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiErrors'
import { useAutoRefresh } from './useAutoRefresh'

export function useResource(service, params = {}) {
  const [items, setItems] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const requestIdRef = useRef(0)

  const load = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setError('')

    try {
      const data = await service.list(params)
      if (requestId === requestIdRef.current) {
        const nextItems = Array.isArray(data) ? data : data.results ?? []
        setItems(nextItems)
        setTotalItems(Array.isArray(data) ? data.length : data.count ?? nextItems.length)
        setError('')
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) setError(getApiErrorMessage(loadError))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [params, service])

  useEffect(() => {
    const timeoutId = window.setTimeout(load, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [load])

  useAutoRefresh(load, { refreshOnMutation: false })

  const save = useCallback(
    async ({ id, payload }) => {
      setIsSaving(true)
      setError('')
      setFieldErrors({})

      try {
        const saved = id
          ? await service.update(id, payload)
          : await service.create(payload)
        await load()
        return saved
      } catch (saveError) {
        setFieldErrors(getApiFieldErrors(saveError))
        setError(getApiErrorMessage(saveError))
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [load, service],
  )

  return {
    error,
    fieldErrors,
    isLoading,
    isSaving,
    items,
    load,
    save,
    setError,
    setFieldErrors,
    totalItems,
  }
}

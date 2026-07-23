import { useEffect, useRef, useState } from 'react'
import { personasService } from '../services/resourceService'
import { getApiErrorMessage } from '../utils/apiErrors'
import { useDebouncedValue } from './useDebouncedValue'

const inFlightRequests = new Map()

function loadMatches(params) {
  const key = JSON.stringify(params)
  if (!inFlightRequests.has(key)) {
    inFlightRequests.set(
      key,
      personasService.coincidencias(params).finally(() => inFlightRequests.delete(key)),
    )
  }
  return inFlightRequests.get(key)
}

export function usePersonaMatches(query, { enabled = true, exclude } = {}) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const [data, setData] = useState({ exacta_telefono: null, sugerencias: [] })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!enabled || debouncedQuery.length < 2) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError('')
      loadMatches({ buscar: debouncedQuery, ...(exclude ? { exclude } : {}) })
        .then((response) => {
          if (requestId === requestIdRef.current) setData(response)
        })
        .catch((requestError) => {
          if (requestId === requestIdRef.current) setError(getApiErrorMessage(requestError))
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsLoading(false)
        })
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      requestIdRef.current += 1
    }
  }, [debouncedQuery, enabled, exclude])

  if (!enabled || debouncedQuery.length < 2) {
    return {
      exacta_telefono: null,
      sugerencias: [],
      error: '',
      isLoading: false,
      query: debouncedQuery,
    }
  }

  return { ...data, error, isLoading, query: debouncedQuery }
}

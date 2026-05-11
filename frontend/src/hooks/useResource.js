import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiErrors'

export function useResource(service) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await service.list()
      setItems(Array.isArray(data) ? data : data.results ?? [])
    } catch (loadError) {
      setError(getApiErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [service])

  useEffect(() => {
    const timeoutId = window.setTimeout(load, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [load])

  const save = useCallback(
    async ({ id, payload }) => {
      setIsSaving(true)
      setError('')
      setFieldErrors({})

      try {
        if (id) {
          await service.update(id, payload)
        } else {
          await service.create(payload)
        }
        await load()
        return true
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

  const remove = useCallback(
    async (id) => {
      setIsDeleting(true)
      setError('')

      try {
        await service.remove(id)
        await load()
        return true
      } catch (deleteError) {
        setError(getApiErrorMessage(deleteError))
        return false
      } finally {
        setIsDeleting(false)
      }
    },
    [load, service],
  )

  return {
    error,
    fieldErrors,
    isDeleting,
    isLoading,
    isSaving,
    items,
    load,
    remove,
    save,
    setError,
    setFieldErrors,
  }
}

import { useEffect } from 'react'

export function useFocusFirstError(errors) {
  useEffect(() => {
    if (!errors || !Object.keys(errors).length) return

    const timeoutId = window.setTimeout(() => {
      document.querySelector('[aria-invalid="true"]')?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [errors])
}

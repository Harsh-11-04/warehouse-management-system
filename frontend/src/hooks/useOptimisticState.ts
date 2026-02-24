import { useState, useCallback } from 'react'

interface OptimisticState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  isOptimistic: boolean
}

export function useOptimisticState<T>(initialData: T | null = null) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    isOptimistic: false
  })

  const optimisticUpdate = useCallback((
    optimisticData: T,
    action: () => Promise<T>
  ) => {
    setState(prev => ({
      ...prev,
      data: optimisticData,
      isOptimistic: true,
      isLoading: true,
      error: null
    }))

    return action()
      .then((result) => {
        setState(prev => ({
          ...prev,
          data: result,
          isOptimistic: false,
          isLoading: false,
          error: null
        }))
        return result
      })
      .catch((error) => {
        setState(prev => ({
          ...prev,
          isOptimistic: false,
          isLoading: false,
          error: error.message || 'Something went wrong'
        }))
        throw error
      })
  }, [])

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isLoading: false,
      error: null,
      isOptimistic: false
    })
  }, [initialData])

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      error: null
    }))
  }, [])

  return {
    ...state,
    optimisticUpdate,
    reset,
    setData
  }
}

import { useEffect, useState } from 'react'
import { readJSON, writeJSON } from '../utils'

/** useState persisted to localStorage. */
export function useLocal(key, initial) {
  const [value, setValue] = useState(() => readJSON(key, initial))
  useEffect(() => {
    writeJSON(key, value)
  }, [key, value])
  return [value, setValue]
}

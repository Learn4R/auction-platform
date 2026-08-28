import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getWatchlist, toggleWatchlist as apiToggleWatchlist } from './api'
import { useAuth } from './auth'

interface WatchlistContextValue {
  isWatchlisted: (itemId: string) => boolean
  toggle: (itemId: string) => Promise<void>
  loaded: boolean
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!token) {
      setIds(new Set())
      setLoaded(true)
      return
    }
    setLoaded(false)
    getWatchlist(token)
      .then((items) => setIds(new Set(items.map((i) => i.id))))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [token])

  const value = useMemo<WatchlistContextValue>(
    () => ({
      isWatchlisted: (itemId) => ids.has(itemId),
      loaded,
      toggle: async (itemId) => {
        if (!token) return
        // Optimistic update, corrected below once the server responds.
        const wasWatchlisted = ids.has(itemId)
        setIds((prev) => {
          const next = new Set(prev)
          if (wasWatchlisted) next.delete(itemId)
          else next.add(itemId)
          return next
        })
        try {
          const { watchlisted } = await apiToggleWatchlist(itemId, token)
          setIds((prev) => {
            const next = new Set(prev)
            if (watchlisted) next.add(itemId)
            else next.delete(itemId)
            return next
          })
        } catch {
          // Revert on failure.
          setIds((prev) => {
            const next = new Set(prev)
            if (wasWatchlisted) next.add(itemId)
            else next.delete(itemId)
            return next
          })
        }
      },
    }),
    [ids, loaded, token],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext)
  if (!ctx) throw new Error('useWatchlist must be used within a WatchlistProvider')
  return ctx
}

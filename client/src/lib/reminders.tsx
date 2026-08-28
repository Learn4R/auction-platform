import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMyReminders, toggleReminder as apiToggleReminder } from './api'
import { useAuth } from './auth'

interface RemindersContextValue {
  isReminded: (auctionId: string) => boolean
  toggle: (auctionId: string) => Promise<void>
  loaded: boolean
}

const RemindersContext = createContext<RemindersContextValue | null>(null)

export function RemindersProvider({ children }: { children: ReactNode }) {
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
    getMyReminders(token)
      .then((auctionIds) => setIds(new Set(auctionIds)))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [token])

  const value = useMemo<RemindersContextValue>(
    () => ({
      isReminded: (auctionId) => ids.has(auctionId),
      loaded,
      toggle: async (auctionId) => {
        if (!token) return
        // Optimistic update, corrected below once the server responds.
        const wasReminded = ids.has(auctionId)
        setIds((prev) => {
          const next = new Set(prev)
          if (wasReminded) next.delete(auctionId)
          else next.add(auctionId)
          return next
        })
        try {
          const { reminding } = await apiToggleReminder(auctionId, token)
          setIds((prev) => {
            const next = new Set(prev)
            if (reminding) next.add(auctionId)
            else next.delete(auctionId)
            return next
          })
        } catch {
          // Revert on failure.
          setIds((prev) => {
            const next = new Set(prev)
            if (wasReminded) next.add(auctionId)
            else next.delete(auctionId)
            return next
          })
        }
      },
    }),
    [ids, loaded, token],
  )

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>
}

export function useReminders() {
  const ctx = useContext(RemindersContext)
  if (!ctx) throw new Error('useReminders must be used within a RemindersProvider')
  return ctx
}

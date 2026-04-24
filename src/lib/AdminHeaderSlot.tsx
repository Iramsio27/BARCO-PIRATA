import { createContext, useContext, useState, type ReactNode } from 'react'

const Ctx = createContext<{
  slot: ReactNode
  setSlot: (n: ReactNode) => void
}>({ slot: null, setSlot: () => {} })

export function AdminHeaderSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<ReactNode>(null)
  return <Ctx.Provider value={{ slot, setSlot }}>{children}</Ctx.Provider>
}

export const useAdminHeaderSlot = () => useContext(Ctx)

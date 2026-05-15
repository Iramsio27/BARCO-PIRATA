import { Outlet, useLocation } from 'react-router-dom'
import { PublicNav } from './PublicNav'
import { PublicFooter } from './PublicFooter'

export function PublicLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      {isHome ? (
        /* Home: el hero tiene su propia nav en desktop; PublicNav solo en mobile */
        <div className="md:hidden">
          <PublicNav />
        </div>
      ) : (
        /* Resto de páginas: nav estilo hero */
        <PublicNav />
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

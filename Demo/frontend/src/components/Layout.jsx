import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

function NavLink({ to, children }) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
  return (
    <Link className={active ? 'navLink navLinkActive' : 'navLink'} to={to}>
      {children}
    </Link>
  )
}

export function Layout({ children }) {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brand">
          <div className="brandTitle">CENITH AIGENT</div>
          <div className="brandSubtitle">AI paperwork assistant (demo)</div>
        </div>

        <nav className="nav">
          <NavLink to="/intake">Intake</NavLink>
        </nav>

        <div className="account">
          {auth ? (
            <>
              <div className="accountLabel">
                {auth.user?.firstName || ''} {auth.user?.lastName || ''}
              </div>
              <button
                className="secondary"
                onClick={() => {
                  logout()
                  navigate('/device')
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/device">Device sign-in</NavLink>
          )}
        </div>
      </header>

      <main className="container">{children}</main>
    </div>
  )
}


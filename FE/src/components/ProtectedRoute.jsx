import PropTypes from 'prop-types'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { readSession } from '../lib/session'

const ProtectedRoute = ({ allowRoles }) => {
  const location = useLocation()
  const session = readSession()

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowRoles && allowRoles.length) {
    const role = (session?.user?.role || '').toLowerCase()
    if (!allowRoles.map((item) => item.toLowerCase()).includes(role)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <Outlet context={{ session }} />
}

ProtectedRoute.propTypes = {
  allowRoles: PropTypes.arrayOf(PropTypes.string)
}

export default ProtectedRoute

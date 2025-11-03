import clsx from 'clsx'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

const defaultNavItems = [
  { label: 'Trang chu', to: '/' },
  { label: 'Thuc don', to: '/menu' },
  { label: 'Gio hang', to: '/cart' }
]

const LandingTopbar = ({
  isAuthenticated,
  customerName,
  onLogout,
  navItems,
  isSticky,
  showSidebarToggle,
  onSidebarToggle,
  showNav
}) => {
  const topbarClassName = clsx('landing-new__topbar container', {
    'landing-new__topbar--sticky': isSticky
  })

  const renderNavItem = (item) => {
    if (item.href) {
      return (
        <a key={item.label} href={item.href}>
          {item.label}
        </a>
      )
    }
    return (
      <Link key={item.label} to={item.to}>
        {item.label}
      </Link>
    )
  }

  return (
    <div className={topbarClassName}>
      <div className="landing-new__topbar-left">
        {showSidebarToggle ? (
          <button
            type="button"
            className="btn btn-outline-light d-inline-flex d-lg-none align-items-center gap-2 landing-new__sidebar-toggle"
            onClick={onSidebarToggle}
          >
            <i className="bi bi-list" aria-hidden="true" />
            <span>Menu</span>
          </button>
        ) : null}
        <Link className="landing-new__brand" to="/">
          FatFood
        </Link>
      </div>
      {showNav && navItems.length > 0 ? (
        <nav className="landing-new__nav">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      ) : (
        <div className="landing-new__nav landing-new__nav--hidden" aria-hidden="true" />
      )}
      {isAuthenticated ? (
        <div className="landing-new__topbar-actions landing-new__topbar-actions--auth">
          <span className="landing-new__greeting">Xin chao, {customerName}</span>
          <Link className="landing-new__btn landing-new__btn--ghost" to="/customer">
            Trung tam cua toi
          </Link>
          <button type="button" className="landing-new__btn landing-new__btn--outline" onClick={onLogout}>
            Dang xuat
          </button>
        </div>
      ) : (
        <div className="landing-new__topbar-actions">
          <Link className="landing-new__link" to="/login">
            Dang nhap
          </Link>
          <Link className="landing-new__btn landing-new__btn--ghost" to="/signup">
            Dang ky
          </Link>
        </div>
      )}
    </div>
  )
}

LandingTopbar.propTypes = {
  isAuthenticated: PropTypes.bool,
  customerName: PropTypes.string,
  onLogout: PropTypes.func,
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      to: PropTypes.string
    })
  ),
  isSticky: PropTypes.bool,
  showSidebarToggle: PropTypes.bool,
  onSidebarToggle: PropTypes.func,
  showNav: PropTypes.bool
}

LandingTopbar.defaultProps = {
  isAuthenticated: false,
  customerName: 'Khach hang',
  onLogout: () => {},
  navItems: defaultNavItems,
  isSticky: false,
  showSidebarToggle: false,
  onSidebarToggle: () => {},
  showNav: true
}

export default LandingTopbar

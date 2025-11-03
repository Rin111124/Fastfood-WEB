import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

const LandingSidebar = ({ open, onClose, links }) => {
  const handleBackdropClick = () => {
    onClose()
  }

  const handleLinkClick = () => {
    onClose()
  }

  return (
    <>
      <div
        className={`landing-sidebar__backdrop${open ? ' show' : ''}`}
        role="button"
        tabIndex={-1}
        onClick={handleBackdropClick}
        aria-hidden={!open}
      />
      <aside
        className={`landing-sidebar offcanvas offcanvas-start${open ? ' show' : ''}`}
        tabIndex={-1}
        aria-hidden={!open}
        aria-modal={open}
      >
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5 mb-0 text-white">Dieu huong</h2>
          <button type="button" className="btn-close btn-close-white" onClick={handleBackdropClick} />
        </div>
        <div className="offcanvas-body d-flex flex-column gap-3">
          {links.map((link) => (
            <Link key={link.label} to={link.to} className="landing-sidebar__link" onClick={handleLinkClick}>
              {link.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}

LandingSidebar.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  links: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired
    })
  )
}

LandingSidebar.defaultProps = {
  open: false,
  onClose: () => {},
  links: []
}

export default LandingSidebar

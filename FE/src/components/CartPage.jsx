import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandingTopbar from './LandingTopbar'
import LandingSidebar from './LandingSidebar'
import { readSession, clearSession } from '../lib/session'
import { formatCurrency } from '../utils/format'
import { resolveAssetUrl } from '../services/apiClient'
import customerApi from '../services/customerApi'
import '../styles/MenuPage.css'
import './LandingPage.css'

const CartPage = () => {
  const navigate = useNavigate()

  const [session, setSession] = useState(() => readSession())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const onStorage = () => setSession(readSession())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isAuthenticated = Boolean(session?.token && session?.user)
  const customerName =
    session?.user?.name || session?.user?.full_name || session?.user?.username || 'Khach hang'

  const handleLogout = () => {
    clearSession()
    setSession(null)
    navigate('/login', { replace: true })
  }

  const sidebarLinks = useMemo(() => {
    const links = [
      { label: 'Trang chu', to: '/' },
      { label: 'Thuc don', to: '/menu' },
      { label: 'Gio hang', to: '/cart' }
    ]
    if (isAuthenticated) {
      links.push({ label: 'Trung tam cua toi', to: '/customer' })
    } else {
      links.push({ label: 'Dang nhap', to: '/login' })
      links.push({ label: 'Dang ky', to: '/signup' })
    }
    return links
  }, [isAuthenticated])

  const handleSidebarOpen = () => setIsSidebarOpen(true)
  const handleSidebarClose = () => setIsSidebarOpen(false)

  const [items, setItems] = useState([])
  const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=200&q=60'

  const refreshCart = async () => {
    try {
      const data = await customerApi.getCart()
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      // noop UI fail-soft
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart()
    } else {
      setItems([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)
  const shipping = items.length ? 0 : 0
  const total = subtotal + shipping

  return (
    <div className="landing-new menu-page cart-page">
      <LandingSidebar open={isSidebarOpen} onClose={handleSidebarClose} links={sidebarLinks} />
      <header className="landing-new__hero landing-new__hero--menu" id="top">
        <LandingTopbar
          isAuthenticated={isAuthenticated}
          customerName={customerName}
          onLogout={handleLogout}
          isSticky
          showSidebarToggle
          onSidebarToggle={handleSidebarOpen}
        />

        <div className="container">
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-8">
              <h1 className="h3 mb-1">Gio hang</h1>
              <p className="text-white-50 mb-0">Quan ly cac mon an ban se dat</p>
            </div>
          </div>
        </div>
      </header>

      <main className="py-4 py-lg-5">
        <div className="container">
          {!isAuthenticated ? (
            <div className="row justify-content-center">
              <div className="col-12 col-md-10 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4 p-lg-5 text-center">
                    <h2 className="h4 mb-2">Vui long dang nhap de su dung gio hang</h2>
                    <p className="text-muted mb-4">
                      Dang nhap de luu giu mon an, tinh tien va theo doi don hang.
                    </p>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                      <Link to="/login" className="btn btn-primary px-4">
                        Dang nhap
                      </Link>
                      <Link to="/signup" className="btn btn-outline-secondary px-4">
                        Dang ky
                      </Link>
                      <Link to="/menu" className="btn btn-link">Quay lai thuc don</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-4 g-lg-5">
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th scope="col">Mon an</th>
                            <th scope="col" className="text-center">So luong</th>
                            <th scope="col" className="text-end">Gia</th>
                            <th scope="col" className="text-end">Thanh tien</th>
                            <th scope="col" className="text-end" style={{ width: '1%' }}>
                              <span className="visually-hidden">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-5">
                                <p className="text-muted mb-2">Gio hang cua ban dang rong.</p>
                                <Link to="/menu" className="btn btn-primary">
                                  Kham pha thuc don
                                </Link>
                              </td>
                            </tr>
                          ) : (
                            items.map((it) => (
                              <tr key={it.cart_item_id || it.product_id}>
                                <td>
                                  <div className="d-flex align-items-center gap-3">
                                    <div className="ratio ratio-1x1 rounded" style={{ width: 56 }}>
                                      <img
                                        src={resolveAssetUrl(it.product?.image || it.product?.image_url || '') || FALLBACK_THUMB}
                                        alt={it.product?.name || ''}
                                        className="w-100 h-100"
                                        style={{ objectFit: 'cover' }}
                                        onError={(e) => {
                                          e.currentTarget.src = FALLBACK_THUMB
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <div className="fw-semibold">{it.product?.name}</div>
                                      {it.product?.food_type ? (
                                        <div className="small text-muted">Loai: {it.product.food_type}</div>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center">
                                  <div className="input-group input-group-sm justify-content-center" style={{ maxWidth: 140, margin: '0 auto' }}>
                                    <button
                                      className="btn btn-outline-secondary"
                                      type="button"
                                      onClick={async () => {
                                        const next = Math.max(0, (Number(it.quantity) || 1) - 1)
                                        await customerApi.updateCartItem({ productId: it.product_id, quantity: next })
                                        refreshCart()
                                      }}
                                    >
                                      <i className="bi bi-dash-lg" aria-hidden="true" />
                                    </button>
                                    <input type="text" className="form-control text-center" value={it.quantity || 1} readOnly aria-label="So luong" />
                                    <button
                                      className="btn btn-outline-secondary"
                                      type="button"
                                      onClick={async () => {
                                        const next = (Number(it.quantity) || 1) + 1
                                        await customerApi.updateCartItem({ productId: it.product_id, quantity: next })
                                        refreshCart()
                                      }}
                                    >
                                      <i className="bi bi-plus-lg" aria-hidden="true" />
                                    </button>
                                  </div>
                                </td>
                                <td className="text-end">{formatCurrency(it.price)}</td>
                                <td className="text-end">{formatCurrency((Number(it.price) || 0) * (Number(it.quantity) || 1))}</td>
                                <td className="text-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={async () => {
                                      await customerApi.removeCartItem(it.product_id)
                                      refreshCart()
                                    }}
                                  >
                                    Xoa
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body">
                    <h2 className="h5 mb-3">Thong tin don hang</h2>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Tam tinh</span>
                      <span className="fw-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-muted">Phi van chuyen</span>
                      <span className="fw-semibold">{shipping ? formatCurrency(shipping) : 'Mien phi'}</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between mb-3">
                      <span className="fw-semibold">Tong</span>
                      <span className="fw-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                    <div className="d-grid gap-2">
                      <button className="btn btn-primary" disabled={items.length === 0} type="button">
                        Thanh toan
                      </button>
                      <Link to="/menu" className="btn btn-outline-secondary" type="button">
                        Tiep tuc mua sam
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CartPage

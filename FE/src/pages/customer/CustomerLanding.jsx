import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiFetch from '../../services/apiClient'
import '../../styles/customerLanding.css'

const defaultSummary = Object.freeze({
  totalOrders: 0,
  completedOrders: 0,
  activeOrders: 0,
  canceledOrders: 0,
  totalSpent: 0,
  averageOrderValue: 0
})

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=1080&q=80'

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0))

const formatNumber = (value) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))

const CustomerLanding = () => {
  const [summary, setSummary] = useState(defaultSummary)
  const [profile, setProfile] = useState(null)
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const showStatus = useCallback((message, type = 'info') => {
    setStatusMessage(message)
    setStatusType(type)
  }, [])

  useEffect(() => {
    document.title = 'FatFood | Khach hang'
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchDashboard = async () => {
      setLoadingDashboard(true)
      try {
        const response = await apiFetch('/api/customer/dashboard', { credentials: 'include' })
        if (!response.ok) {
          throw new Error(`Dashboard request failed with status ${response.status}`)
        }
        const payload = await response.json()
        if (!payload?.success || cancelled) {
          return
        }
        const data = payload.data || {}
        setSummary({ ...defaultSummary, ...(data.orderSummary || {}) })
        setProfile(data.profile || null)
        setPromotions(Array.isArray(data.activePromotions) ? data.activePromotions : [])
        setOrders(Array.isArray(data.recentOrders) ? data.recentOrders : [])
        if (payload.fallback && !cancelled) {
          showStatus(
            payload.message || 'Dang hien thi du lieu tam thoi cho bang dieu khien.',
            'info'
          )
        }
      } catch (error) {
        if (!cancelled) {
          showStatus('Khong the tai thong tin bang dieu khien. Vui long thu lai sau.', 'error')
          setSummary(defaultSummary)
          setProfile(null)
          setPromotions([])
          setOrders([])
        }
      } finally {
        if (!cancelled) {
          setLoadingDashboard(false)
        }
      }
    }

    const fetchProducts = async () => {
      setLoadingProducts(true)
      try {
        const response = await apiFetch('/api/customer/products?limit=6', {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error(`Products request failed with status ${response.status}`)
        }
        const payload = await response.json()
        if (!payload?.success || cancelled) {
          return
        }
        const productList = Array.isArray(payload.data) ? payload.data : []
        setProducts(productList)
        if (payload.fallback && !cancelled) {
          showStatus(
            payload.message || 'Dang hien thi danh sach san pham tam thoi do loi may chu.',
            'info'
          )
        }
      } catch (error) {
        if (!cancelled) {
          showStatus('Khong the tai danh sach san pham noi bat.', 'error')
          setProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false)
        }
      }
    }

    fetchDashboard()
    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [showStatus])

  const greeting = useMemo(() => {
    if (!profile?.full_name) {
      return 'Hay dang nhap de dong bo lich su va uu dai danh rieng cho ban.'
    }
    return `Xin chao ${profile.full_name}, chuc ban mot ngay tran day nang luong!`
  }, [profile])

  const heroMetrics = useMemo(
    () => [
      { label: 'Don hang da hoan tat', value: formatNumber(summary.completedOrders) },
      { label: 'Don dang xu ly', value: formatNumber(summary.activeOrders) },
      { label: 'Chi tieu trung binh', value: formatCurrency(summary.averageOrderValue) }
    ],
    [summary]
  )

  const summaryMetrics = useMemo(
    () => [
      { label: 'Tong so don', value: formatNumber(summary.totalOrders) },
      { label: 'Don da hoan tat', value: formatNumber(summary.completedOrders) },
      { label: 'Don dang xu ly', value: formatNumber(summary.activeOrders) },
      { label: 'Don da huy', value: formatNumber(summary.canceledOrders) },
      { label: 'Tong chi tieu', value: formatCurrency(summary.totalSpent) },
      { label: 'Chi tieu trung binh', value: formatCurrency(summary.averageOrderValue) }
    ],
    [summary]
  )

  const renderPromotions = () => {
    if (loadingDashboard) {
      return <p className="landing-placeholder">Dang tai uu dai...</p>
    }
    if (!promotions.length) {
      return <p className="landing-placeholder">Khong co uu dai nao dang dien ra.</p>
    }
    return (
      <div className="row g-3">
        {promotions.map((promo) => {
          const startDate = promo.start_date ? new Date(promo.start_date) : null
          const endDate = promo.end_date ? new Date(promo.end_date) : null
          return (
            <div key={promo.promotion_id || promo.code} className="col-12 col-sm-6 col-xl-4">
              <article className="landing-card h-100">
                <h3 className="h5 mb-2 d-flex align-items-center justify-content-between">
                  <span>{promo.name || 'Uu dai'}</span>
                  {promo.code ? <span className="landing-pill ms-2">{promo.code}</span> : null}
                </h3>
                <p className="mb-3">
                  {promo.description || 'Su dung ngay de nhan uu dai danh rieng cho khach hang FatFood.'}
                </p>
                <div className="landing-section__subtitle mb-2" style={{ fontSize: '0.92rem' }}>
                  {promo.discount_value
                    ? `Giam ${
                        promo.discount_type === 'percent'
                          ? `${promo.discount_value}%`
                          : `${Number(promo.discount_value).toLocaleString('vi-VN')} VND`
                      }`
                    : 'Uu dai dac biet'}
                  {promo.min_order_amount ? ` - Ap dung tu ${formatCurrency(promo.min_order_amount)}` : ''}
                </div>
                <p className="landing-meta mb-0">
                  {startDate ? `Tu ${startDate.toLocaleDateString('vi-VN')}` : 'Bat dau ngay'}
                  {endDate ? ` - Den ${endDate.toLocaleDateString('vi-VN')}` : ''}
                </p>
              </article>
            </div>
          )
        })}
      </div>
    )
  }

  const renderProducts = () => {
    if (loadingProducts) {
      return <p className="landing-placeholder">Dang tai thuc don...</p>
    }
    if (!products.length) {
      return <p className="landing-placeholder">Hien chua co mon an nao de hien thi.</p>
    }
    return (
      <div className="row g-3">
        {products.map((product) => (
          <div key={product.product_id || product.name} className="col-12 col-sm-6 col-xl-4">
            <article className="landing-card landing-products__card h-100">
              <img
                src={product.image_url || FALLBACK_IMAGE}
                alt={product.name || 'Mon an'}
                className="landing-products__image"
                loading="lazy"
              />
              <div>
                <h3 className="landing-products__title">{product.name || 'Mon an'}</h3>
                <p className="landing-section__subtitle">
                  {product.description || 'Mon an duoc ua chuong boi khach hang FatFood.'}
                </p>
                <div className="landing-products__price">{formatCurrency(product.price)}</div>
              </div>
            </article>
          </div>
        ))}
      </div>
    )
  }

  const renderOrders = () => {
    if (loadingDashboard) {
      return <p className="landing-placeholder">Dang tai don hang gan day...</p>
    }
    if (!profile) {
      return <p className="landing-placeholder">Dang nhap de xem chi tiet don hang gan day.</p>
    }
    if (!orders.length) {
      return <p className="landing-placeholder">Ban chua co don hang nao. Kham pha thuc don de dat mon ngay!</p>
    }
    return (
      <div className="list-group list-group-flush">
        {orders.map((order) => {
          const createdAt = order.created_at ? new Date(order.created_at) : null
          const itemsLabel = Array.isArray(order.items)
            ? order.items.map((item) => `${item.quantity} x ${item.product?.name || 'Mon an'}`).join(', ')
            : 'Don hang'
          return (
            <div
              key={order.order_id || order.code}
              className="list-group-item list-group-item-action d-flex flex-column flex-md-row justify-content-between gap-2"
            >
              <div>
                <div className="fw-semibold mb-1">
                  Don #{order.order_id || '---'}
                  <span className="badge bg-secondary-subtle text-secondary text-uppercase ms-2">
                    {order.status || 'pending'}
                  </span>
                </div>
                <div className="text-muted small">{itemsLabel || 'Don hang FatFood'}</div>
              </div>
              <div className="text-md-end small">
                <div className="mb-1">{createdAt ? createdAt.toLocaleString('vi-VN') : 'Khong ro thoi gian'}</div>
                <div className="fw-semibold text-body">{formatCurrency(order.total_amount || 0)}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-header__content">
          <div className="landing-logo">FatFood</div>
          <nav className="landing-nav">
            <a href="#dashboard">Bang tong quan</a>
            <a href="#promotions">Uu dai</a>
            <a href="#menu">Thuc don</a>
            <a href="#insights">Trai nghiem</a>
          </nav>
          <div className="landing-actions">
            <Link className="landing-btn landing-btn--outline" to="/login">
              Dang nhap
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-main">
        {statusMessage && (
          <div
            className={`alert alert-${statusType === 'error' ? 'danger' : statusType === 'success' ? 'success' : 'info'} alert-dismissible fade show container-xxl px-3 px-lg-5 mt-3`}
            role="alert"
          >
            {statusMessage}
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setStatusMessage('')} />
          </div>
        )}
        <section className="landing-section">
          <div className="landing-hero">
            <div>
              <p className="landing-eyebrow">FatFood xin chao</p>
              <h1 className="landing-title">Khoi dong ngay moi voi mon an yeu thich</h1>
              <p className="landing-subtitle">
                Theo doi don hang, kham pha uu dai va dat mon chi trong vai cu cham. Dang nhap de dong bo du lieu ca nhan cua ban.
              </p>
              <div className="landing-cta">
                <a className="landing-btn landing-btn--primary" href="#menu">
                  Kham pha thuc don
                </a>
                <a className="landing-btn landing-btn--outline" href="#promotions">
                  Uu dai dang dien ra
                </a>
              </div>
            </div>
            <div className="landing-hero__metrics">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="landing-metric-card">
                  <span className="landing-metric-label">{metric.label}</span>
                  <span className="landing-metric-value">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="dashboard">
          <header className="landing-section__header">
            <div>
              <h2 className="landing-section__title">Bang tong quan khach hang</h2>
              <p className="landing-section__subtitle">{greeting}</p>
            </div>
            <Link className="landing-btn landing-btn--outline" to="/login">
              Dang nhap ngay
            </Link>
          </header>
          <div className="landing-card-grid">
            {summaryMetrics.map((metric) => (
              <article key={metric.label} className="landing-card">
                <h3>{metric.label}</h3>
                <p className="landing-metric-number">{metric.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="promotions">
          <header className="landing-section__header">
            <div>
              <h2 className="landing-section__title">Uu dai noi bat</h2>
              <p className="landing-section__subtitle">
                Chon uu dai phu hop de dat mon tiet kiem hon.
              </p>
            </div>
          </header>
          <div className="mt-3">{renderPromotions()}</div>
        </section>

        <section className="landing-section" id="menu">
          <header className="landing-section__header">
            <div>
              <h2 className="landing-section__title">Goi y thuc don hom nay</h2>
              <p className="landing-section__subtitle">
                Cac mon an duoc yeu thich va phu hop cho moi bua an.
              </p>
            </div>
            <a className="landing-btn landing-btn--outline" href="#menu">
              Xem them mon
            </a>
          </header>
          <div className="mt-3">{renderProducts()}</div>
        </section>

        <section className="landing-section" id="insights">
          <header className="landing-section__header">
            <div>
              <h2 className="landing-section__title">Don hang gan day</h2>
              <p className="landing-section__subtitle">
                Dang nhap de theo doi lich su dat hang va trang thai don cua ban.
              </p>
            </div>
          </header>
          <div className="landing-card">{renderOrders()}</div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__content">
          <p>
            Ban quyen <span>{new Date().getFullYear()}</span> FatFood. Tat ca cac quyen duoc bao luu.
          </p>
          <div className="landing-footer__links">
            <a href="mailto:support@fatfood.local">Ho tro</a>
            <a href="#promotions">Uu dai</a>
            <a href="#menu">Thuc don</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CustomerLanding

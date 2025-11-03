import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import customerApi from '../../../services/customerApi'
import Spinner from '../../../components/common/Spinner'
import StatCard from '../../../components/dashboard/StatCard'
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/format'

const defaultDashboard = {
  profile: null,
  orderSummary: {
    totalOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    canceledOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0
  },
  recentOrders: [],
  activePromotions: [],
  recommendations: []
}

const statusVariant = {
  pending: 'bg-warning-subtle text-warning',
  confirmed: 'bg-info-subtle text-info',
  preparing: 'bg-primary-subtle text-primary',
  delivering: 'bg-success-subtle text-success',
  shipping: 'bg-success-subtle text-success',
  completed: 'bg-success-subtle text-success',
  canceled: 'bg-danger-subtle text-danger',
  refunded: 'bg-secondary-subtle text-secondary',
  paid: 'bg-primary-subtle text-primary'
}

const CustomerDashboard = () => {
  const outlet = useOutletContext()
  const navigate = useNavigate()
  const session = outlet?.session
  const [data, setData] = useState(defaultDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('success')
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    gender: 'unknown'
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [productOptions, setProductOptions] = useState([])
  const [orderForm, setOrderForm] = useState({
    productId: '',
    quantity: '1',
    note: ''
  })
  const [orderSaving, setOrderSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchDashboard = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await customerApi.getDashboard()
        if (!cancelled) {
          const dashboardData = { ...defaultDashboard, ...(payload || {}) }
          setData(dashboardData)
          if (dashboardData.profile) {
            setProfileForm({
              full_name: dashboardData.profile.full_name || '',
              phone_number: dashboardData.profile.phone_number || '',
              address: dashboardData.profile.address || '',
              gender: dashboardData.profile.gender || 'unknown'
            })
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            navigate('/login', { replace: true })
            return
          }
          setError(err.message)
          setData(defaultDashboard)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      try {
        const products = await customerApi.listProducts({ limit: 50 })
        if (!cancelled) {
          setProductOptions(Array.isArray(products) ? products : [])
          setOrderForm((prev) => ({
            ...prev,
            productId: products?.[0]?.product_id ? String(products[0].product_id) : ''
          }))
        }
      } catch (err) {
        if (!cancelled) {
          setStatusMessage(err.message)
          setStatusType('danger')
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [])

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSaving(true)
    setStatusMessage('')
    try {
      await customerApi.updateProfile({
        full_name: profileForm.full_name,
        phone_number: profileForm.phone_number,
        address: profileForm.address,
        gender: profileForm.gender
      })
      setStatusMessage('Da cap nhat thong tin ca nhan')
      setStatusType('success')
      await customerApi.getDashboard().then((payload) => {
        const dashboardData = { ...defaultDashboard, ...(payload || {}) }
        setData(dashboardData)
      })
    } catch (err) {
      setStatusMessage(err.message)
      setStatusType('danger')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleOrderChange = (field, value) => {
    setOrderForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleOrderSubmit = async (event) => {
    event.preventDefault()
    if (!orderForm.productId) return
    setOrderSaving(true)
    setStatusMessage('')
    try {
      await customerApi.createOrder({
        items: [
          {
            productId: Number(orderForm.productId),
            quantity: Number(orderForm.quantity || 1)
          }
        ],
        note: orderForm.note || ''
      })
      setStatusMessage('Da tao don hang moi!')
      setStatusType('success')
      setOrderForm((prev) => ({ ...prev, quantity: '1', note: '' }))
      const payload = await customerApi.getDashboard()
      setData({ ...defaultDashboard, ...(payload || {}) })
    } catch (err) {
      setStatusMessage(err.message)
      setStatusType('danger')
    } finally {
      setOrderSaving(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    try {
      await customerApi.cancelOrder(orderId)
      setStatusMessage(`Da huy don hang #${orderId}`)
      setStatusType('warning')
      const payload = await customerApi.getDashboard()
      setData({ ...defaultDashboard, ...(payload || {}) })
    } catch (err) {
      setStatusMessage(err.message)
      setStatusType('danger')
    }
  }

  const orderSummary = data.orderSummary || defaultDashboard.orderSummary
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : []
  const promotions = Array.isArray(data.activePromotions) ? data.activePromotions : []
  const recentOrders = Array.isArray(data.recentOrders) ? data.recentOrders : []

  const favoriteCategory = useMemo(() => {
    const counts = {}
    recentOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const type = item.product?.food_type || 'other'
        counts[type] = (counts[type] || 0) + Number(item.quantity || 0)
      })
    })
    const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return top ? top[0] : null
  }, [recentOrders])

  const customerName =
    data.profile?.full_name ||
    session?.user?.name ||
    session?.user?.username ||
    'Khach hang'

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-4 mb-4">
        <div>
          <p className="text-muted mb-1 text-uppercase small fw-semibold">Tong quan khach hang</p>
          <h1 className="display-6 fw-bold mb-2">Xin chao, {customerName}!</h1>
          <p className="text-secondary mb-0">
            Theo doi don hang, uu dai va goi y mon an duoc ca nhan hoa cho ban.
          </p>
        </div>
        {favoriteCategory && (
          <div className="badge bg-warning-subtle text-warning px-3 py-2 rounded-pill text-uppercase">
            Yeu thich: {favoriteCategory}
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className={`alert alert-${statusType} border-0 shadow-sm mb-4`} role="alert">
          {statusMessage}
        </div>
      )}

      {loading ? (
        <Spinner message="Dang tai bang dieu khien cua ban..." />
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Tong chi tieu"
                value={formatCurrency(orderSummary.totalSpent)}
                delta={orderSummary.averageOrderValue ? formatCurrency(orderSummary.averageOrderValue) : undefined}
                deltaLabel="Gia tri don trung binh"
                icon="bi-wallet2"
                variant="primary"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Don da hoan tat"
                value={formatNumber(orderSummary.completedOrders)}
                delta={orderSummary.totalOrders ? `${Math.round((orderSummary.completedOrders / orderSummary.totalOrders) * 100)}%` : '0%'}
                deltaLabel="Ti le hoan tat"
                icon="bi-bag-check-fill"
                variant="success"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Don dang xu ly"
                value={formatNumber(orderSummary.activeOrders)}
                deltaLabel="Dang cho nha bep"
                icon="bi-hourglass-split"
                variant="info"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Don bi huy"
                value={formatNumber(orderSummary.canceledOrders)}
                deltaLabel="Trong 90 ngay gan nhat"
                icon="bi-x-circle-fill"
                variant="warning"
              />
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0">
                  <p className="text-muted text-uppercase small fw-semibold mb-1">Thong tin ca nhan</p>
                  <h5 className="mb-0">Cap nhat ho so</h5>
                </div>
                <div className="card-body">
                  <form className="row g-3" onSubmit={handleProfileSubmit}>
                    <div className="col-md-6">
                      <label className="form-label text-muted small text-uppercase">Ho ten</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.full_name}
                        onChange={(event) => handleProfileChange('full_name', event.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small text-uppercase">So dien thoai</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={profileForm.phone_number}
                        onChange={(event) => handleProfileChange('phone_number', event.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small text-uppercase">Gioi tinh</label>
                      <select
                        className="form-select"
                        value={profileForm.gender}
                        onChange={(event) => handleProfileChange('gender', event.target.value)}
                      >
                        <option value="male">Nam</option>
                        <option value="female">Nu</option>
                        <option value="other">Khac</option>
                        <option value="unknown">Khong tiet lo</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small text-uppercase">Dia chi giao hang</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.address}
                        onChange={(event) => handleProfileChange('address', event.target.value)}
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end">
                      <button type="submit" className="btn btn-outline-primary" disabled={profileSaving}>
                        {profileSaving ? 'Dang luu...' : 'Luu thay doi'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted text-uppercase small fw-semibold mb-1">Dat mon nhanh</p>
                    <h5 className="mb-0">Dat don moi</h5>
                  </div>
                </div>
                <div className="card-body">
                  <form className="row g-3" onSubmit={handleOrderSubmit}>
                    <div className="col-md-5">
                      <label className="form-label text-muted small text-uppercase">Mon an</label>
                      <select
                        className="form-select"
                        value={orderForm.productId}
                        onChange={(event) => handleOrderChange('productId', event.target.value)}
                        required
                      >
                        <option value="">-- Chon mon an --</option>
                        {productOptions.map((product) => (
                          <option key={product.product_id} value={product.product_id}>
                            {product.name} ({formatCurrency(product.price)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label text-muted small text-uppercase">So luong</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        value={orderForm.quantity}
                        onChange={(event) => handleOrderChange('quantity', event.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-muted small text-uppercase">Ghi chu</label>
                      <input
                        type="text"
                        className="form-control"
                        value={orderForm.note}
                        onChange={(event) => handleOrderChange('note', event.target.value)}
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end">
                      <button type="submit" className="btn btn-dark" disabled={orderSaving}>
                        {orderSaving ? 'Dang dat...' : 'Dat ngay'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted text-uppercase small fw-semibold mb-1">Don hang gan day</p>
                    <h5 className="mb-0">Hoat dong moi nhat cua ban</h5>
                  </div>
                </div>
                <div className="card-body">
                  {recentOrders.length ? (
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr className="text-muted small text-uppercase">
                            <th>Ma don</th>
                            <th>Trang thai</th>
                            <th>Gia tri</th>
                            <th>Mon an</th>
                            <th>Thoi gian</th>
                            <th className="text-end">Thao tac</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map((order) => (
                            <tr key={order.order_id}>
                              <td className="fw-semibold">#{order.order_id}</td>
                              <td>
                                <span
                                  className={clsx(
                                    'badge rounded-pill px-3 py-2 text-capitalize',
                                    statusVariant[order.status] || 'bg-secondary-subtle text-secondary'
                                  )}
                                >
                                  {order.status || 'pending'}
                                </span>
                              </td>
                              <td className="fw-semibold">{formatCurrency(order.total_amount)}</td>
                              <td className="text-muted small">
                                {order.items?.length
                                  ? order.items
                                      .map((item) => `${item.quantity}x ${item.product?.name || 'San pham'}`)
                                      .join(', ')
                                  : 'Chua co mon an'}
                              </td>
                              <td className="text-muted small">
                                {formatDateTime(order.created_at || order.order_date)}
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={['completed', 'canceled', 'refunded'].includes(order.status)}
                                  onClick={() => handleCancelOrder(order.order_id)}
                                >
                                  Huy don
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted small mb-0">Ban chua co don hang nao. Bat dau dat mon ngay hom nay!</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0">
                  <p className="text-muted text-uppercase small fw-semibold mb-1">Uu dai danh rieng cho ban</p>
                  <h5 className="mb-0">Khuyen mai dang hoat dong</h5>
                </div>
                <div className="card-body d-flex flex-column gap-3">
                  {promotions.length ? (
                    promotions.map((promotion) => (
                      <div key={promotion.promotion_id} className="border rounded-3 p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <span className="badge bg-warning-subtle text-warning text-uppercase mb-2">
                              Ma: {promotion.code}
                            </span>
                            <h6 className="mb-1">{promotion.name}</h6>
                            <p className="text-muted small mb-2">{promotion.description || 'Uu dai dac biet danh cho ban.'}</p>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small text-muted">
                            Het han: {formatDateTime(promotion.end_date)}
                          </span>
                          <span className="badge bg-dark text-white">
                            {promotion.discount_type === 'fixed'
                              ? `Giam ${formatCurrency(promotion.discount_value)}`
                              : `Giam ${promotion.discount_value}%`}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted small mb-0">Hien khong co uu dai nao. Vui long quay lai sau!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted text-uppercase small fw-semibold mb-1">Goi y cho ban</p>
                <h5 className="mb-0">Mon an ban nen thu</h5>
              </div>
            </div>
            <div className="card-body">
              {recommendations.length ? (
                <div className="row g-4">
                  {recommendations.map((item) => (
                    <div className="col-12 col-md-6 col-lg-4" key={item.product_id}>
                      <div className="border rounded-3 h-100 p-3 d-flex flex-column gap-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center"
                            style={{ width: 48, height: 48 }}>
                            <i className="bi bi-star-fill" />
                          </div>
                          <div>
                            <h6 className="mb-1">{item.product?.name || 'San pham'}</h6>
                            <p className="text-muted small mb-0">
                              {formatCurrency(item.product?.price || 0)} - Da ban {formatNumber(item.totalSold)} phan
                            </p>
                          </div>
                        </div>
                        <button type="button" className="btn btn-outline-dark btn-sm mt-auto">
                          Dat ngay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">Chung toi se cap nhat nhung goi y ngon mieng som thoi!</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CustomerDashboard


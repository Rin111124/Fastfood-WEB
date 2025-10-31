import { useEffect, useMemo, useState } from 'react'
import AdminStatusAlert from '../../components/admin/AdminStatusAlert'
import Spinner from '../../components/common/Spinner'
import adminApi from '../../services/adminApi'
import { formatCurrency, formatDateTime } from '../../utils/format'

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'paid',
  'preparing',
  'delivering',
  'shipping',
  'completed',
  'canceled',
  'refunded'
]

const AdminOrders = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const [orders, setOrders] = useState([])
  const [staff, setStaff] = useState([])
  const [filters, setFilters] = useState({ status: 'all', search: '' })
  const [orderUpdates, setOrderUpdates] = useState({})

  const resetStatus = () => {
    setStatusMessage('')
    setStatusType('info')
  }

  const loadStaff = async () => {
    try {
      const staffData = await adminApi.listStaff(200)
      setStaff(Array.isArray(staffData) ? staffData : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setStaff([])
    }
  }

  const loadOrders = async (params = {}) => {
    setLoading(true)
    resetStatus()
    try {
      const data = await adminApi.listOrders({
        status: params.status ?? filters.status,
        search: params.search ?? filters.search,
        limit: 100
      })
      const orderList = Array.isArray(data) ? data : []
      setOrders(orderList)
      const updates = {}
      orderList.forEach((order) => {
        updates[order.order_id] = {
          status: order.status,
          staffId: order.assigned_staff_id ? String(order.assigned_staff_id) : '',
          shipperId: order.assigned_shipper_id ? String(order.assigned_shipper_id) : '',
          expectedDeliveryTime: order.expected_delivery_time
            ? new Date(order.expected_delivery_time).toISOString().slice(0, 16)
            : ''
        }
      })
      setOrderUpdates(updates)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setOrders([])
      setOrderUpdates({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([loadStaff(), loadOrders()])
  }, [])

  const handleFilterSubmit = async (event) => {
    event.preventDefault()
    await loadOrders({})
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpdateChange = (orderId, field, value) => {
    setOrderUpdates((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }))
  }

  const handleAssignSubmit = async (event, orderId) => {
    event.preventDefault()
    const payload = orderUpdates[orderId]
    try {
      await adminApi.assignOrder(orderId, {
        staffId: payload?.staffId ? Number(payload.staffId) : undefined,
        shipperId: payload?.shipperId ? Number(payload.shipperId) : undefined,
        expectedDeliveryTime: payload?.expectedDeliveryTime || undefined
      })
      setStatusMessage(`Da cap nhat phan cong cho don #${orderId}`)
      setStatusType('success')
      await loadOrders({})
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleStatusSubmit = async (event, orderId) => {
    event.preventDefault()
    const payload = orderUpdates[orderId]
    try {
      await adminApi.updateOrderStatus(orderId, payload?.status || 'pending')
      setStatusMessage(`Da cap nhat trang thai don #${orderId}`)
      setStatusType('success')
      await loadOrders({})
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleRefund = async (orderId) => {
    try {
      await adminApi.refundOrder(orderId, {})
      setStatusMessage(`Da yeu cau hoan tien cho don #${orderId}`)
      setStatusType('success')
      await loadOrders({})
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const staffOptions = useMemo(() => (Array.isArray(staff) ? staff : []), [staff])

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Quan ly don hang</h1>
        <p className="text-muted mb-0">
          Theo doi trang thai, phan cong nhan su va xu ly van de cua don hang.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form className="row gy-3 gx-3 align-items-end" onSubmit={handleFilterSubmit}>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Trang thai</label>
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">Tat ca</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <label className="form-label fw-semibold text-uppercase text-muted small">Tim theo khach hang</label>
              <input
                type="search"
                className="form-control"
                name="search"
                placeholder="Ten dang nhap hoac ten day du"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-2 d-grid">
              <button type="submit" className="btn btn-dark">
                Tai danh sach
              </button>
            </div>
            <div className="col-md-2 d-grid">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilters({ status: 'all', search: '' })
                  loadOrders({ status: 'all', search: '' })
                }}
              >
                Dat lai loc
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai danh sach don hang..." />
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <h5 className="mb-1">Danh sach don hang</h5>
              <p className="text-muted small mb-0">Cap nhat trang thai va phan cong truc tiep tren bang.</p>
            </div>
            <span className="badge bg-warning-subtle text-warning">{orders.length} don</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Khach hang</th>
                    <th>Trang thai</th>
                    <th>Tong tien</th>
                    <th>Phan cong</th>
                    <th>Thoi gian</th>
                    <th className="text-end">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const update = orderUpdates[order.order_id] || {}
                    return (
                      <tr key={order.order_id}>
                        <td className="fw-semibold">#{order.order_id}</td>
                        <td style={{ minWidth: '12rem' }}>
                          <div className="fw-semibold text-capitalize">
                            {order.User?.full_name || order.User?.username || 'Khach le'}
                          </div>
                          <div className="text-muted small">{order.User?.username || 'N/A'}</div>
                        </td>
                        <td style={{ width: '14rem' }}>
                          <form
                            className="d-flex gap-2"
                            onSubmit={(event) => handleStatusSubmit(event, order.order_id)}
                          >
                            <select
                              className="form-select form-select-sm"
                              value={update.status || order.status}
                              onChange={(event) =>
                                handleUpdateChange(order.order_id, 'status', event.target.value)
                              }
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="btn btn-sm btn-outline-primary">
                              Luu
                            </button>
                          </form>
                        </td>
                        <td>
                          <div className="fw-semibold">{formatCurrency(order.total_amount)}</div>
                          <div className="text-muted small">{order.items?.length || 0} mon</div>
                        </td>
                        <td style={{ minWidth: '18rem' }}>
                          <form className="row g-2" onSubmit={(event) => handleAssignSubmit(event, order.order_id)}>
                            <div className="col-12 col-lg-4">
                              <select
                                className="form-select form-select-sm"
                                value={update.staffId || ''}
                                onChange={(event) =>
                                  handleUpdateChange(order.order_id, 'staffId', event.target.value)
                                }
                              >
                                <option value="">-- Staff --</option>
                                {staffOptions.map((member) => (
                                  <option key={`staff-${member.user_id}`} value={member.user_id}>
                                    {member.full_name || member.username || member.user_id}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-12 col-lg-4">
                              <select
                                className="form-select form-select-sm"
                                value={update.shipperId || ''}
                                onChange={(event) =>
                                  handleUpdateChange(order.order_id, 'shipperId', event.target.value)
                                }
                              >
                                <option value="">-- Shipper --</option>
                                {staffOptions.map((member) => (
                                  <option key={`shipper-${member.user_id}`} value={member.user_id}>
                                    {member.full_name || member.username || member.user_id}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-12 col-lg-4">
                              <input
                                type="datetime-local"
                                className="form-control form-control-sm"
                                value={update.expectedDeliveryTime || ''}
                                onChange={(event) =>
                                  handleUpdateChange(
                                    order.order_id,
                                    'expectedDeliveryTime',
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="col-12 d-flex gap-2">
                              <button type="submit" className="btn btn-sm btn-outline-secondary ms-auto">
                                Cap nhat
                              </button>
                            </div>
                          </form>
                        </td>
                        <td style={{ minWidth: '12rem' }}>
                          <div className="text-muted small">
                            Tao luc: {formatDateTime(order.created_at || order.order_date)}
                          </div>
                          <div className="text-muted small">Cap nhat: {formatDateTime(order.updated_at)}</div>
                          {order.expected_delivery_time && (
                            <div className="badge bg-warning-subtle text-warning mt-2">
                              Giao du kien: {formatDateTime(order.expected_delivery_time)}
                            </div>
                          )}
                        </td>
                        <td className="text-end" style={{ width: '12rem' }}>
                          <div className="d-flex flex-column gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={order.status === 'refunded'}
                              onClick={() => handleRefund(order.order_id)}
                            >
                              Hoan tien
                            </button>
                            {order.items?.length ? (
                              <details>
                                <summary className="btn btn-sm btn-outline-info mb-0">Chi tiet</summary>
                                <div className="small text-start mt-2">
                                  <ul className="list-unstyled mb-0">
                                    {order.items.map((item) => (
                                      <li key={`${order.order_id}-${item.order_item_id}`}>
                                        {item.quantity}x {item.Product?.name || 'San pham'} -{' '}
                                        {formatCurrency(item.price)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </details>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!orders.length && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        Chua co don hang nao phu hop.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminOrders

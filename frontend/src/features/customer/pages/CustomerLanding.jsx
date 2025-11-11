import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../../services/apiClient'
import '../../../styles/customerLanding.css'

const NAV_ITEMS = Object.freeze([
  { id: 'overview', label: 'Tong quan' },
  { id: 'profile', label: 'Quan ly thong tin' },
  { id: 'history', label: 'Nhat ky ho so' }
])

const FIELD_LABELS = Object.freeze({
  user_id: 'Ma nguoi dung',
  username: 'Ten dang nhap',
  email: 'Email',
  role: 'Vai tro',
  status: 'Trang thai',
  full_name: 'Ho va ten',
  phone_number: 'So dien thoai',
  address: 'Dia chi',
  gender: 'Gioi tinh',
  created_at: 'Tao luc',
  updated_at: 'Cap nhat luc',
  deleted_at: 'Xoa luc'
})

const PROFILE_FIELDS = Object.freeze(['full_name', 'phone_number', 'address', 'gender'])

const GENDER_OPTIONS = Object.freeze([
  { value: 'unknown', label: 'Khong xac dinh' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nu' },
  { value: 'other', label: 'Khac' }
])

const GENDER_LABELS = Object.freeze({
  unknown: 'Khong xac dinh',
  male: 'Nam',
  female: 'Nu',
  other: 'Khac'
})

const PROFILE_DISPLAY_ORDER = Object.freeze([
  'user_id',
  'username',
  'email',
  'role',
  'status',
  'full_name',
  'phone_number',
  'address',
  'gender',
  'created_at',
  'updated_at',
  'deleted_at'
])

const createEmptyForm = () => ({
  full_name: '',
  phone_number: '',
  address: '',
  gender: 'unknown'
})

const mapProfileToForm = (profile) => ({
  full_name: profile?.full_name ?? '',
  phone_number: profile?.phone_number ?? '',
  address: profile?.address ?? '',
  gender: profile?.gender ?? 'unknown'
})

const toComparable = (field, value) => {
  if (field === 'gender') {
    const normalized = typeof value === 'string' ? value.trim() : value
    return normalized && normalized.length ? normalized : 'unknown'
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  return value ?? ''
}

const toPayloadValue = (field, value) => {
  if (field === 'gender') {
    const normalized = typeof value === 'string' ? value.trim() : value
    return normalized && normalized.length ? normalized : 'unknown'
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return value ?? null
}

const normalizePayload = (data) =>
  PROFILE_FIELDS.reduce((acc, field) => {
    acc[field] = toPayloadValue(field, data[field])
    return acc
  }, {})

const resolveFieldLabel = (field) => {
  if (FIELD_LABELS[field]) {
    return FIELD_LABELS[field]
  }
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatDateTime = (value) => {
  if (!value) {
    return 'Chua cap nhat'
  }
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      return 'Chua cap nhat'
    }
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch (error) {
    return 'Chua cap nhat'
  }
}

const isMeaningfulGender = (value) => value && value !== 'unknown'

const hasProfileDetails = (profile) => {
  if (!profile) {
    return false
  }
  return Boolean(
    profile.full_name ||
      profile.phone_number ||
      profile.address ||
      isMeaningfulGender(profile.gender)
  )
}

const formatHistoryChange = (field, value) => {
  const label = FIELD_LABELS[field] || field
  if (value === null || value === '') {
    return `${label}: da xoa`
  }
  if (field === 'gender') {
    return `${label}: ${GENDER_LABELS[value] || value}`
  }
  return `${label}: ${value}`
}

const describeChanges = (changes) => {
  if (!changes || !Object.keys(changes).length) {
    return 'Khong co chi tiet bo sung.'
  }
  return Object.entries(changes)
    .map(([field, value]) => formatHistoryChange(field, value))
    .join(', ')
}

const resolveSafeMessage = (error, fallback) => {
  if (!error) {
    return fallback
  }
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  return message.length ? message : fallback
}

const CustomerLanding = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [formMode, setFormMode] = useState('view')
  const [formState, setFormState] = useState(createEmptyForm)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])

  const historyCounter = useRef(0)

  useEffect(() => {
    document.title = 'FatFood | Khach hang'
  }, [])

  const appendHistory = useCallback((action, changes) => {
    historyCounter.current += 1
    const timestamp = new Date()
    setHistory((prev) => {
      const entry = {
        id: `entry-${timestamp.getTime()}-${historyCounter.current}`,
        action,
        summary: describeChanges(changes),
        timestamp: timestamp.toISOString()
      }
      return [entry, ...prev].slice(0, 15)
    })
  }, [])

  const loadProfile = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setStatus({ type: 'info', message: 'Dang tai thong tin khach hang...' })
      }
      setLoading(true)
      try {
        const response = await apiFetch('/api/customer/me', { credentials: 'include' })
        const payload = await response.json()
        if (!payload?.success) {
          throw new Error(payload?.message || 'Khong the tai ho so khach hang.')
        }
        const data = payload.data || null
        setProfile(data)
        setFormMode('view')
        if (!silent) {
          setStatus({ type: 'success', message: 'Da dong bo ho so moi nhat.' })
        } else {
          setStatus((prev) => (prev?.type === 'error' ? prev : null))
        }
      } catch (error) {
        console.error('Failed to fetch customer profile', error)
        setStatus({
          type: 'error',
          message: resolveSafeMessage(error, 'Khong the tai ho so khach hang. Vui long thu lai sau.')
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadProfile({ silent: true })
  }, [loadProfile])

  useEffect(() => {
    if (!profile) {
      if (formMode !== 'create') {
        setFormState(createEmptyForm())
      }
      return
    }
    if (formMode === 'create') {
      return
    }
    setFormState(mapProfileToForm(profile))
  }, [profile, formMode])

  const baselineForm = useMemo(() => mapProfileToForm(profile), [profile])

  const diff = useMemo(() => {
    if (!profile) {
      return {}
    }
    return PROFILE_FIELDS.reduce((acc, field) => {
      const currentValue = toComparable(field, formState[field])
      const baselineValue = toComparable(field, baselineForm[field])
      if (currentValue !== baselineValue) {
        acc[field] = toPayloadValue(field, formState[field])
      }
      return acc
    }, {})
  }, [formState, baselineForm, profile])

  const isDirty = useMemo(() => Object.keys(diff).length > 0, [diff])

  const profileHasDetails = hasProfileDetails(profile)

  const formatProfileValue = useCallback((key, value) => {
    if (value === null || typeof value === 'undefined') {
      return 'Chua cap nhat'
    }
    if (key === 'gender') {
      return GENDER_LABELS[value] || value
    }
    if (key.endsWith('_at') || key.endsWith('_date') || key.endsWith('_time')) {
      return formatDateTime(value)
    }
    if (typeof value === 'boolean') {
      return value ? 'Co' : 'Khong'
    }
    if (typeof value === 'number') {
      return String(value)
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      return 'Chua cap nhat'
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value)
      }
    }
    if (typeof value === 'string') {
      return value
    }
    return String(value)
  }, [])

  const fullProfileEntries = useMemo(() => {
    if (!profile) {
      return []
    }
    const entries = Object.entries(profile).map(([key, value]) => ({
      key,
      label: resolveFieldLabel(key),
      value: formatProfileValue(key, value)
    }))

    const orderMap = PROFILE_DISPLAY_ORDER.reduce((acc, field, index) => {
      acc[field] = index
      return acc
    }, {})

    return entries
      .sort((a, b) => {
        const orderA = Number.isInteger(orderMap[a.key]) ? orderMap[a.key] : Number.MAX_SAFE_INTEGER
        const orderB = Number.isInteger(orderMap[b.key]) ? orderMap[b.key] : Number.MAX_SAFE_INTEGER
        if (orderA !== orderB) {
          return orderA - orderB
        }
        return a.label.localeCompare(b.label)
      })
  }, [profile, formatProfileValue])

  const greetingName = useMemo(() => {
    const name = typeof profile?.full_name === 'string' ? profile.full_name.trim() : ''
    if (name.length) {
      return name
    }
    if (typeof profile?.username === 'string') {
      return profile.username
    }
    return 'Khach hang'
  }, [profile])

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
  }, [])

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [navigate])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleStartCreate = () => {
    setFormMode('create')
    setFormState(createEmptyForm())
    setActiveTab('profile')
    setStatus(null)
  }

  const handleStartEdit = () => {
    setFormMode('edit')
    setFormState(baselineForm)
    setActiveTab('profile')
    setStatus(null)
  }

  const handleCancelForm = () => {
    setFormMode('view')
    setFormState(baselineForm)
    setStatus(null)
  }

  const handleResetForm = () => {
    setFormState(baselineForm)
  }

  const handleRefresh = useCallback(() => {
    if (processing) {
      return
    }
    loadProfile({ silent: false })
  }, [loadProfile, processing])

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (processing) {
      return
    }
    const payload = normalizePayload(formState)
    const meaningful =
      Boolean(payload.full_name) ||
      Boolean(payload.phone_number) ||
      Boolean(payload.address) ||
      isMeaningfulGender(payload.gender)

    if (!meaningful) {
      setStatus({
        type: 'error',
        message: 'Vui long nhap it nhat mot truong thong tin.'
      })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: 'Dang tao thong tin nguoi dung...' })
    try {
      const response = await apiFetch('/api/customer/me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const payloadJson = await response.json()
      if (!payloadJson?.success) {
        throw new Error(payloadJson?.message || 'Khong the tao thong tin nguoi dung.')
      }
      const nextProfile = payloadJson.data || null
      setProfile(nextProfile)
      setFormMode('view')
      setStatus({ type: 'success', message: 'Da tao thong tin nguoi dung.' })

      const loggedChanges = Object.fromEntries(
        Object.entries(payload).filter(([field, value]) =>
          field === 'gender' ? isMeaningfulGender(value) : value !== null
        )
      )
      appendHistory('Tao moi', loggedChanges)
      setActiveTab('overview')
    } catch (error) {
      console.error('Failed to create customer profile', error)
      setStatus({
        type: 'error',
        message: resolveSafeMessage(error, 'Khong the tao thong tin nguoi dung. Vui long thu lai sau.')
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateSubmit = async (event) => {
    event.preventDefault()
    if (processing) {
      return
    }
    if (!isDirty) {
      setStatus({ type: 'info', message: 'Khong co thay doi nao can luu.' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: 'Dang cap nhat thong tin nguoi dung...' })
    try {
      const response = await apiFetch('/api/customer/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diff)
      })
      const payloadJson = await response.json()
      if (!payloadJson?.success) {
        throw new Error(payloadJson?.message || 'Khong the cap nhat thong tin nguoi dung.')
      }
      const nextProfile = payloadJson.data || null
      setProfile(nextProfile)
      setFormMode('view')
      setStatus({ type: 'success', message: 'Da cap nhat thong tin nguoi dung.' })
      appendHistory('Cap nhat', diff)
    } catch (error) {
      console.error('Failed to update customer profile', error)
      setStatus({
        type: 'error',
        message: resolveSafeMessage(error, 'Khong the cap nhat thong tin nguoi dung. Vui long thu lai sau.')
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (processing || !profileHasDetails) {
      return
    }
    const confirmed = window.confirm('Ban chac chan muon xoa thong tin lien lac?')
    if (!confirmed) {
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: 'Dang xoa thong tin nguoi dung...' })
    try {
      const response = await apiFetch('/api/customer/me', {
        method: 'DELETE',
        credentials: 'include'
      })
      const payloadJson = await response.json()
      if (!payloadJson?.success) {
        throw new Error(payloadJson?.message || 'Khong the xoa thong tin nguoi dung.')
      }
      const nextProfile = payloadJson.data || null
      setProfile(nextProfile)
      setFormMode('view')
      setActiveTab('overview')
      setStatus({ type: 'success', message: 'Da xoa thong tin nguoi dung.' })
      appendHistory('Xoa', {
        full_name: null,
        phone_number: null,
        address: null,
        gender: 'unknown'
      })
    } catch (error) {
      console.error('Failed to delete customer profile', error)
      setStatus({
        type: 'error',
        message: resolveSafeMessage(error, 'Khong the xoa thong tin nguoi dung. Vui long thu lai sau.')
      })
    } finally {
      setProcessing(false)
    }
  }

  const accountSummary = useMemo(() => fullProfileEntries, [fullProfileEntries])

  const contactSummary = useMemo(() => {
    const mapped = mapProfileToForm(profile)
    return [
      { label: 'Ho va ten', value: mapped.full_name || 'Chua cap nhat' },
      { label: 'So dien thoai', value: mapped.phone_number || 'Chua cap nhat' },
      { label: 'Dia chi', value: mapped.address || 'Chua cap nhat' },
      { label: 'Gioi tinh', value: GENDER_LABELS[mapped.gender] || 'Khong xac dinh' }
    ]
  }, [profile])

  const latestHistory = history[0] || null

  const resolvedStatus = status && status.message ? status : null

  const isCreateMode = formMode === 'create'
  const isEditMode = formMode === 'edit'

  return (
    <div className="customer-page">
      <header className="customer-taskbar">
        <div className="customer-taskbar__layout">
          <div className="customer-taskbar__brand">FatFood Customer</div>
          <nav className="customer-taskbar__nav" aria-label="Dieu huong khach hang">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`customer-taskbar__link${activeTab === item.id ? ' is-active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="customer-taskbar__meta">
            <button
              type="button"
              className="customer-btn customer-btn--ghost customer-taskbar__back"
              onClick={handleGoBack}
              aria-label="Quay lai trang truoc"
              title="Quay lai"
            >
              <span aria-hidden="true">←</span>
            </button>
            <span className="customer-taskbar__user">{greetingName}</span>
            <button
              type="button"
              className="customer-btn customer-btn--ghost customer-taskbar__refresh"
              onClick={handleRefresh}
              disabled={loading || processing}
            >
              {loading ? 'Dang tai...' : 'Dong bo'}
            </button>
          </div>
        </div>
      </header>

      <main className="customer-content">
        {resolvedStatus && (
          <div className={`customer-status customer-status--${resolvedStatus.type}`}>
            {resolvedStatus.message}
          </div>
        )}

        <section
          id="overview"
          className={`customer-section${activeTab === 'overview' ? ' is-active' : ''}`}
          hidden={activeTab !== 'overview'}
        >
          <div className="customer-section__header">
            <div>
              <p className="customer-section__eyebrow">Trang khach hang</p>
              <h1 className="customer-section__title">Xin chao, {greetingName}</h1>
              <p className="customer-section__subtitle">
                Quan ly thong tin ca nhan, kiem tra trang thai tai khoan va theo doi hoat dong gan day.
              </p>
            </div>
            <div className="customer-section__actions">
              <button
                type="button"
                className="customer-btn customer-btn--primary"
                onClick={() => setActiveTab('profile')}
                disabled={processing}
              >
                Quan ly thong tin
              </button>
            </div>
          </div>

          {loading && (
            <div className="customer-placeholder">Dang tai du lieu tai khoan...</div>
          )}

          {!loading && (
            <div className="customer-grid">
              <article className="customer-card">
                <div className="customer-card__header">
                  <h2 className="customer-card__title">Thong tin nguoi dung</h2>
                  <span className="customer-chip">
                    {profile?.status ? profile.status : 'Chua cap nhat'}
                  </span>
                </div>
                <dl className="customer-definition">
                  {accountSummary.length === 0 ? (
                    <div className="customer-definition__row">
                      <dt>Thong tin</dt>
                      <dd>Chua co du lieu nguoi dung.</dd>
                    </div>
                  ) : (
                    accountSummary.map((item) => (
                      <div key={item.key} className="customer-definition__row">
                        <dt>{item.label}</dt>
                        <dd>{item.value || 'Chua cap nhat'}</dd>
                      </div>
                    ))
                  )}
                </dl>
              </article>

              <article className="customer-card">
                <div className="customer-card__header">
                  <h2 className="customer-card__title">Thong tin lien lac</h2>
                  <span className={`customer-chip${profileHasDetails ? ' customer-chip--success' : ''}`}>
                    {profileHasDetails ? 'Da cap nhat' : 'Chua cap nhat'}
                  </span>
                </div>
                <dl className="customer-definition">
                  {contactSummary.map((item) => (
                    <div key={item.label} className="customer-definition__row">
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>

              <article className="customer-card customer-card--activity">
                <div className="customer-card__header">
                  <h2 className="customer-card__title">Hoat dong gan day</h2>
                </div>
                {latestHistory ? (
                  <div className="customer-activity__preview">
                    <p className="customer-activity__action">{latestHistory.action}</p>
                    <p className="customer-activity__time">{formatDateTime(latestHistory.timestamp)}</p>
                    <p className="customer-activity__summary">{latestHistory.summary}</p>
                    <button
                      type="button"
                      className="customer-btn customer-btn--ghost"
                      onClick={() => setActiveTab('history')}
                    >
                      Xem nhat ky
                    </button>
                  </div>
                ) : (
                  <p className="customer-empty">
                    Chua co hoat dong nao trong phien lam viec nay.
                  </p>
                )}
              </article>
            </div>
          )}
        </section>

        <section
          id="profile"
          className={`customer-section${activeTab === 'profile' ? ' is-active' : ''}`}
          hidden={activeTab !== 'profile'}
        >
          <div className="customer-section__header">
            <div>
              <p className="customer-section__eyebrow">Quan ly ho so</p>
              <h2 className="customer-section__title">Thong tin nguoi dung</h2>
              <p className="customer-section__subtitle">
                Cap nhat thong tin lien lac de chung toi co the ho tro ban tot nhat.
              </p>
            </div>
            <div className="customer-section__actions">
              {formMode === 'view' && !profileHasDetails && (
                <button
                  type="button"
                  className="customer-btn customer-btn--primary"
                  onClick={handleStartCreate}
                  disabled={processing}
                >
                  Tao ho so
                </button>
              )}
              {formMode === 'view' && profileHasDetails && (
                <>
                  <button
                    type="button"
                    className="customer-btn customer-btn--ghost"
                    onClick={handleStartEdit}
                    disabled={processing}
                  >
                    Chinh sua
                  </button>
                  <button
                    type="button"
                    className="customer-btn customer-btn--danger"
                    onClick={handleDeleteProfile}
                    disabled={processing}
                  >
                    Xoa thong tin
                  </button>
                </>
              )}
            </div>
          </div>

          <article className="customer-card">
            <div className="customer-card__header">
              <h3 className="customer-card__title">Thong tin hien tai</h3>
            </div>
            <dl className="customer-definition">
              {contactSummary.map((item) => (
                <div key={item.label} className="customer-definition__row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="customer-card customer-card--form">
            {formMode === 'view' ? (
              <p className="customer-note">
                Chon &quot;Tao ho so&quot; neu ban chua co thong tin hoac &quot;Chinh sua&quot; de cap nhat truong da co.
              </p>
            ) : (
              <form
                className="customer-form"
                onSubmit={isCreateMode ? handleCreateSubmit : handleUpdateSubmit}
                noValidate
              >
                <div className="customer-form__fields">
                  <div className="customer-form__field">
                    <label htmlFor="full_name">Ho va ten</label>
                    <input
                      id="full_name"
                      name="full_name"
                      value={formState.full_name}
                      onChange={handleInputChange}
                      placeholder="Nhap ho ten day du"
                      disabled={processing}
                      autoComplete="name"
                    />
                  </div>

                  <div className="customer-form__field">
                    <label htmlFor="phone_number">So dien thoai</label>
                    <input
                      id="phone_number"
                      name="phone_number"
                      value={formState.phone_number}
                      onChange={handleInputChange}
                      placeholder="Nhap so dien thoai lien he"
                      disabled={processing}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="customer-form__field">
                    <label htmlFor="gender">Gioi tinh</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formState.gender}
                      onChange={handleInputChange}
                      disabled={processing}
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="customer-form__field customer-form__field--full">
                    <label htmlFor="address">Dia chi</label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formState.address}
                      onChange={handleInputChange}
                      placeholder="Nhap dia chi giao hang chi tiet"
                      disabled={processing}
                    />
                  </div>
                </div>

                <div className="customer-form__actions">
                  <button
                    type="submit"
                    className="customer-btn customer-btn--primary"
                    disabled={processing || (isEditMode && !isDirty)}
                  >
                    {processing ? 'Dang xu ly...' : isCreateMode ? 'Tao thong tin' : 'Luu thay doi'}
                  </button>
                  <button
                    type="button"
                    className="customer-btn customer-btn--ghost"
                    onClick={handleCancelForm}
                    disabled={processing}
                  >
                    Huy
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="customer-btn customer-btn--ghost"
                      onClick={handleResetForm}
                      disabled={processing || !isDirty}
                    >
                      Khoi phuc gia tri
                    </button>
                  )}
                  {profileHasDetails && (
                    <button
                      type="button"
                      className="customer-btn customer-btn--danger"
                      onClick={handleDeleteProfile}
                      disabled={processing}
                    >
                      Xoa thong tin
                    </button>
                  )}
                </div>
              </form>
            )}
          </article>
        </section>

        <section
          id="history"
          className={`customer-section${activeTab === 'history' ? ' is-active' : ''}`}
          hidden={activeTab !== 'history'}
        >
          <div className="customer-section__header">
            <div>
              <p className="customer-section__eyebrow">Nhat ky</p>
              <h2 className="customer-section__title">Hoat dong ho so</h2>
              <p className="customer-section__subtitle">
                Du lieu chi luu trong phien lam viec hien tai de bao ve quyen rieng tu cua ban.
              </p>
            </div>
          </div>

          <article className="customer-card customer-card--history">
            {history.length === 0 ? (
              <p className="customer-empty">
                Chua co hoat dong nao duoc ghi nhan. Cap nhat ho so de xem lai lich su thay doi.
              </p>
            ) : (
              <ul className="customer-history__list">
                {history.map((entry) => (
                  <li key={entry.id} className="customer-history__item">
                    <div className="customer-history__meta">
                      <span className="customer-history__action">{entry.action}</span>
                      <span className="customer-history__time">{formatDateTime(entry.timestamp)}</span>
                    </div>
                    <p className="customer-history__summary">{entry.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}

export default CustomerLanding


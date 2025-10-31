import { format, parseISO } from 'date-fns'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

export const formatCurrency = (value) => currencyFormatter.format(Number(value || 0))

export const formatNumber = (value) => numberFormatter.format(Number(value || 0))

export const formatMonthLabel = (value) => {
  try {
    const parsed = parseISO(`${value}-01`)
    return format(parsed, 'MMM yyyy')
  } catch (error) {
    return value
  }
}

export const formatDateTime = (value) => {
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch (error) {
    return value
  }
}

export const formatDate = (value) => {
  try {
    return format(new Date(value), 'dd/MM/yyyy')
  } catch (error) {
    return value
  }
}

export const formatTime = (value) => {
  try {
    return format(new Date(`1970-01-01T${value}`), 'HH:mm')
  } catch (error) {
    return value
  }
}

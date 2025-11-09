import { Server } from 'socket.io'
import { authorizeRequest } from '../modules/auth/authorization.service.js'

let io = null

const getRoomSize = (name) => {
  if (!io) return 0
  const room = io.sockets.adapter.rooms.get(name)
  return room ? room.size : 0
}

const normalizeOrigin = (origin) => {
  if (!origin) return ''
  try {
    const url = new URL(origin)
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`
  } catch {
    return origin
  }
}

const initSocket = (httpServer, { allowedOrigins = new Set(), allowAllInDev = true } = {}) => {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowAllInDev || !allowedOrigins.size || allowedOrigins.has(normalizeOrigin(origin))) {
          return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    }
  })

  // Auth + room joining
  io.use((socket, next) => {
    try {
      // Prefer auth.token, fallback to Authorization header or query param
      const token = socket.handshake?.auth?.token
        || (() => {
          const authHeader = socket.handshake?.headers?.authorization
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7)
          }
          return socket.handshake?.query?.token
        })()

      if (!token) return next(new Error('AUTH_REQUIRED'))

      const payload = authorizeRequest({ authorizationHeader: `Bearer ${token}` })
      socket.data.auth = payload

      // Join rooms by role and user
      const userId = payload?.user_id
      const role = payload?.role
      if (userId) socket.join(`user:${userId}`)
      if (role === 'staff' || role === 'admin') socket.join('staff')
      return next()
    } catch (err) {
      return next(err)
    }
  })

  io.on('connection', (socket) => {
    const userId = socket?.data?.auth?.user_id
    const role = socket?.data?.auth?.role
    console.log('Socket connected', { id: socket.id, userId, role })

    // Broadcast staff presence count
    io.emit('presence:staff-count', { count: getRoomSize('staff') })

    // Typing relay
    socket.on('support:typing', (payload = {}) => {
      try {
        if (role === 'staff' || role === 'admin') {
          const target = Number(payload?.user_id)
          if (target) io.to(`user:${target}`).emit('support:typing', { typing: !!payload?.typing })
          return
        }
        // customer typing -> notify staff room with user id
        if (userId) io.to('staff').emit('support:typing', { user_id: userId, typing: !!payload?.typing })
      } catch (e) {
        // swallow
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected', { id: socket.id, reason })
      // Update presence count when staff leaves
      setTimeout(() => io.emit('presence:staff-count', { count: getRoomSize('staff') }), 0)
    })
  })

  return io
}

const getIO = () => io

const emitToStaff = (event, payload) => {
  if (!io) return
  io.to('staff').emit(event, payload)
}

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return
  io.to(`user:${userId}`).emit(event, payload)
}

export { initSocket, getIO, emitToStaff, emitToUser }

import { Server, Socket } from 'socket.io'
import { logger } from '../utils/logger.js'

export const initEventMonitorSocket = (io: Server) => {
  const eventsNs = io.of('/events')

  eventsNs.on('connection', (socket: Socket) => {
    logger.info(`Socket client connected to /events namespace [${socket.id}]`)

    socket.on('subscribe_metrics', () => {
      socket.join('event_metrics_room')
    })

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected from /events namespace [${socket.id}]`)
    })
  })
}

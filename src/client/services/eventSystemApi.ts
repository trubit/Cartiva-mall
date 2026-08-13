import api from './api.js'

export const getEvents = async (params?: {
  eventType?: string
  aggregateId?: string
  correlationId?: string
  page?: number
}) => {
  const res = await api.get('/event-system/events', { params })
  return res.data
}

export const getEventById = async (id: string) => {
  const res = await api.get(`/event-system/events/${id}`)
  return res.data
}

export const replayEvent = async (id: string) => {
  const res = await api.post(`/event-system/events/${id}/replay`)
  return res.data
}

export const getDeadLetters = async (status: string = 'PENDING') => {
  const res = await api.get('/event-system/dead-letters', { params: { status } })
  return res.data
}

export const replayDeadLetter = async (id: string) => {
  const res = await api.post(`/event-system/dead-letters/${id}/replay`)
  return res.data
}

export const discardDeadLetter = async (id: string) => {
  const res = await api.delete(`/event-system/dead-letters/${id}`)
  return res.data
}

export const getSagas = async () => {
  const res = await api.get('/event-system/sagas')
  return res.data
}

export const getSagaById = async (id: string) => {
  const res = await api.get(`/event-system/sagas/${id}`)
  return res.data
}

export const triggerOrderSagaDemo = async () => {
  const res = await api.post('/event-system/sagas/trigger-demo')
  return res.data
}

export const getEventSystemHealth = async () => {
  const res = await api.get('/event-system/health')
  return res.data
}

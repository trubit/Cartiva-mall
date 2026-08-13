import api from './api.js'

export const observe = async () => {
  const res = await api.post('/godmode/observe')
  return res.data
}

export const simulate = async () => {
  const res = await api.post('/godmode/simulate')
  return res.data
}

export const decide = async () => {
  const res = await api.post('/godmode/decide')
  return res.data
}

export const execute = async (cycleId?: string) => {
  const res = await api.post('/godmode/execute', { cycleId })
  return res.data
}

export const evolve = async () => {
  const res = await api.post('/godmode/evolve')
  return res.data
}

export const getStatus = async () => {
  const res = await api.get('/godmode/status')
  return res.data
}

export const getEconomyState = async () => {
  const res = await api.get('/godmode/economy-state')
  return res.data
}

export const getSystemHealth = async () => {
  const res = await api.get('/godmode/system-health')
  return res.data
}

export const getRuleVersions = async () => {
  const res = await api.get('/godmode/rule-versions')
  return res.data
}

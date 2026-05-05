import axios from 'axios'
import { getBackendUrl } from '../api'

const api = axios.create()

// Устанавливаем baseURL динамически перед каждым запросом
api.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl()

  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
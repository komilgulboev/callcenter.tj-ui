import api from './api'

export async function login(username, password) {
  const res = await api.post('/api/auth/login', {
    username,
    password,
  })

  localStorage.setItem('accessToken', res.data.token)
}

export async function me() {
  return api.get('/api/me')
}

export function logout() {
  localStorage.removeItem('accessToken')
}



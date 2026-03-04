import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilGlobeAlt } from '@coreui/icons'

import { login, me } from '../../../services/auth.service'
import { getBackendUrl, setBackendUrl } from '../../../api'

const Login = () => {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()

  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl())
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [showServer, setShowServer] = useState(false)

  const changeLang = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Сохраняем адрес бэкенда перед логином
    if (backendUrl.trim()) {
      setBackendUrl(backendUrl.trim())
    }

    try {
      await login(username, password)
      await me()
      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError(t('error.invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>

                  {/* language selector */}
                  <div className="text-end mb-2">
                    <select
                      value={i18n.language}
                      onChange={(e) => changeLang(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="ru">RU</option>
                      <option value="en">EN</option>
                      <option value="tj">TJ</option>
                    </select>
                  </div>

                  <CForm onSubmit={handleSubmit}>
                    <h1>{t('title')}</h1>
                    <p className="text-body-secondary">{t('subtitle')}</p>

                    {error && (
                      <CAlert color="danger" className="mb-3">{error}</CAlert>
                    )}

                    {/* Username */}
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder={t('username')}
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </CInputGroup>

                    {/* Password */}
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder={t('password')}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </CInputGroup>

                    {/* Server address — раскрывается по кнопке */}
                    <div className="mb-4">
                      <div
                        onClick={() => setShowServer(!showServer)}
                        style={{
                          fontSize: '0.8rem',
                          color: '#6c757d',
                          cursor: 'pointer',
                          userSelect: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: showServer ? 8 : 0,
                        }}
                      >
                        <CIcon icon={cilGlobeAlt} size="sm" />
                        {t('serverAddress', { defaultValue: 'Адрес сервера' })}:&nbsp;
                        <span style={{ color: '#495057', fontWeight: 500 }}>
                          {backendUrl}
                        </span>
                        <span style={{ marginLeft: 'auto' }}>{showServer ? '▲' : '▼'}</span>
                      </div>

                      {showServer && (
                        <CInputGroup>
                          <CInputGroupText>
                            <CIcon icon={cilGlobeAlt} />
                          </CInputGroupText>
                          <CFormInput
                            value={backendUrl}
                            onChange={(e) => setBackendUrlState(e.target.value)}
                            placeholder="http://192.168.1.100:8080"
                          />
                        </CInputGroup>
                      )}
                    </div>

                    <CRow>
                      <CCol xs={6}>
                        <CButton
                          color="primary"
                          className="px-4"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? t('loading') : t('login')}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-right">
                        <CButton color="link" className="px-0" disabled>
                          {t('forgot')}
                        </CButton>
                      </CCol>
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>

              {/* Правая панель */}
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>{t('signup.title')}</h2>
                    <p>{t('signup.text')}</p>
                    <Link to="/register">
                      <CButton color="light" className="mt-3" active tabIndex={-1}>
                        {t('signup.button')}
                      </CButton>
                    </Link>
                  </div>
                </CCardBody>
              </CCard>

            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
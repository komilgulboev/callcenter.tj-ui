import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CButton, CCard, CCardBody, CCol, CContainer,
  CForm, CFormInput, CInputGroup, CInputGroupText, CRow, CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilLockLocked, cilPhone, cilEnvelopeOpen, cilHome } from '@coreui/icons'
import { getApiUrl } from '../../../api'

const Register = () => {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    phone:     '',
    address:   '',
    password:  '',
    password2: '',
  })
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhoneChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 9)
    setForm(f => ({ ...f, phone: digits }))
  }

  const changeLang = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (form.phone.length !== 9) {
      setError(t('error.phoneInvalid', { defaultValue: 'Телефон должен содержать ровно 9 цифр' }))
      return
    }
    if (form.password !== form.password2) {
      setError(t('error.passwordMismatch', { defaultValue: 'Пароли не совпадают' }))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          phone:     form.phone,
          address:   form.address,
          username:  form.phone,
          password:  form.password,
        }),
      })

      if (res.status === 409) {
        setError(t('error.userExists', { defaultValue: 'Пользователь с таким номером уже существует' }))
        return
      }
      if (!res.ok) {
        const text = await res.text()
        setError(text || t('error.register', { defaultValue: 'Ошибка регистрации' }))
        return
      }

      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch {
      setError(t('error.network', { defaultValue: 'Ошибка сети' }))
    } finally {
      setLoading(false)
    }
  }

  return React.createElement('div', { className: 'bg-body-tertiary min-vh-100 d-flex flex-row align-items-center' },
    React.createElement(CContainer, null,
      React.createElement(CRow, { className: 'justify-content-center' },
        React.createElement(CCol, { md: 9, lg: 7 },
          React.createElement(CCard, { className: 'p-4' },
            React.createElement(CCardBody, null,

              React.createElement('div', { className: 'text-end mb-2' },
                React.createElement('select', {
                  value: i18n.language,
                  onChange: (e) => changeLang(e.target.value),
                  style: { border: 'none', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer' },
                },
                  React.createElement('option', { value: 'ru' }, 'RU'),
                  React.createElement('option', { value: 'en' }, 'EN'),
                  React.createElement('option', { value: 'tj' }, 'TJ'),
                )
              ),

              React.createElement('h1', null, t('register.title', { defaultValue: 'Регистрация' })),
              React.createElement('p', { className: 'text-body-secondary' },
                t('register.subtitle', { defaultValue: 'Создайте аккаунт агента' })
              ),

              error ? React.createElement(CAlert, { color: 'danger' }, error) : null,

              success ? React.createElement(CAlert, { color: 'success' },
                t('register.success', { defaultValue: 'Регистрация успешна! Ожидайте активации администратором.' })
              ) : null,

              !success ? React.createElement(CForm, { onSubmit: handleSubmit },
                React.createElement(CRow, null,

                  // Имя
                  React.createElement(CCol, { md: 6, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilUser })),
                      React.createElement(CFormInput, {
                        placeholder: t('register.firstName', { defaultValue: 'Имя' }),
                        value: form.firstName,
                        onChange: e => set('firstName', e.target.value),
                        required: true,
                      })
                    )
                  ),

                  // Фамилия
                  React.createElement(CCol, { md: 6, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilUser })),
                      React.createElement(CFormInput, {
                        placeholder: t('register.lastName', { defaultValue: 'Фамилия' }),
                        value: form.lastName,
                        onChange: e => set('lastName', e.target.value),
                        required: true,
                      })
                    )
                  ),

                  // Email
                  React.createElement(CCol, { md: 6, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilEnvelopeOpen })),
                      React.createElement(CFormInput, {
                        type: 'email',
                        placeholder: t('register.email', { defaultValue: 'Email' }),
                        value: form.email,
                        onChange: e => set('email', e.target.value),
                      })
                    )
                  ),

                  // Телефон
                  React.createElement(CCol, { md: 6, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilPhone })),
                      React.createElement(CFormInput, {
                        placeholder: t('register.phonePlaceholder', { defaultValue: '935001234' }),
                        value: form.phone,
                        onChange: e => handlePhoneChange(e.target.value),
                        maxLength: 9,
                        required: true,
                      })
                    ),
                    React.createElement('div', { style: { fontSize: 11, color: '#6c757d', marginTop: 4, paddingLeft: 4 } },
                      t('register.phoneHint', { defaultValue: '9 цифр — используется как логин' })
                    )
                  ),

                  // Адрес
                  React.createElement(CCol, { md: 12, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilHome })),
                      React.createElement(CFormInput, {
                        placeholder: t('register.address', { defaultValue: 'Адрес' }),
                        value: form.address,
                        onChange: e => set('address', e.target.value),
                      })
                    )
                  ),

                  // Логин (readonly = телефон)
                  React.createElement(CCol, { md: 6, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, '@'),
                      React.createElement(CFormInput, {
                        placeholder: t('username', { defaultValue: 'Логин (номер телефона)' }),
                        value: form.phone,
                        readOnly: true,
                        style: { background: '#f8f9fa', color: '#6c757d' },
                      })
                    )
                  ),

                  // Пароль
                  React.createElement(CCol, { md: 6, className: 'mb-3' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilLockLocked })),
                      React.createElement(CFormInput, {
                        type: 'password',
                        placeholder: t('password', { defaultValue: 'Пароль' }),
                        value: form.password,
                        onChange: e => set('password', e.target.value),
                        autoComplete: 'new-password',
                        required: true,
                      })
                    )
                  ),

                  // Повтор пароля
                  React.createElement(CCol, { md: 6, className: 'mb-4' },
                    React.createElement(CInputGroup, null,
                      React.createElement(CInputGroupText, null, React.createElement(CIcon, { icon: cilLockLocked })),
                      React.createElement(CFormInput, {
                        type: 'password',
                        placeholder: t('register.password2', { defaultValue: 'Повторите пароль' }),
                        value: form.password2,
                        onChange: e => set('password2', e.target.value),
                        autoComplete: 'new-password',
                        required: true,
                      })
                    )
                  ),
                ),

                React.createElement(CRow, null,
                  React.createElement(CCol, { xs: 6 },
                    React.createElement(CButton, { color: 'primary', type: 'submit', className: 'px-4', disabled: loading },
                      loading
                        ? t('loading', { defaultValue: 'Загрузка...' })
                        : t('register.submit', { defaultValue: 'Зарегистрироваться' })
                    )
                  ),
                  React.createElement(CCol, { xs: 6, className: 'text-end' },
                    React.createElement(Link, { to: '/login' },
                      React.createElement(CButton, { color: 'link' },
                        t('register.backToLogin', { defaultValue: 'Войти' })
                      )
                    )
                  )
                )
              ) : null
            )
          )
        )
      )
    )
  )
}

export default Register
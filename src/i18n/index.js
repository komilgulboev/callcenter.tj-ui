import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ruAuth from '../locales/ru/auth.json'
import enAuth from '../locales/en/auth.json'
import tjAuth from '../locales/tj/auth.json'
import ruMenu from '../locales/ru/menu.json'
import enMenu from '../locales/en/menu.json'
import tjMenu from '../locales/tj/menu.json'

const savedLang = localStorage.getItem('lang') || 'ru'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { auth: ruAuth },
      en: { auth: enAuth },
      tj: { auth: tjAuth },
      ru: { auth: ruAuth, menu: ruMenu },
      en: { auth: enAuth, menu: enMenu },
      tj: { auth: tjAuth, menu: tjMenu },
    },
    lng: savedLang,
    fallbackLng: 'en',
    ns: ['auth', 'menu'],
    defaultNS: 'auth',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

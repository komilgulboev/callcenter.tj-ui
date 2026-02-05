import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ruAuth from '../locales/ru/auth.json'
import enAuth from '../locales/en/auth.json'
import tjAuth from '../locales/tj/auth.json'

import ruMenu from '../locales/ru/menu.json'
import enMenu from '../locales/en/menu.json'
import tjMenu from '../locales/tj/menu.json'

import ruCommon from '../locales/ru/common.json'
import enCommon from '../locales/en/common.json'
import tjCommon from '../locales/tj/common.json'

const savedLang = localStorage.getItem('lang') || 'ru'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: {
        auth: ruAuth,
        menu: ruMenu,
        common: ruCommon,
      },
      en: {
        auth: enAuth,
        menu: enMenu,
        common: enCommon,
      },
      tj: {
        auth: tjAuth,
        menu: tjMenu,
        common: tjCommon,
      },
    },
    lng: savedLang,
    fallbackLng: 'en',
    ns: ['auth', 'menu', 'common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

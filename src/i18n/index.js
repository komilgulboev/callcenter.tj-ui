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

import ruDashboard from '../locales/ru/dashboard.json'
import enDashboard from '../locales/en/dashboard.json'
import tjDashboard from '../locales/tj/dashboard.json'

import ruCrm from '../locales/ru/tickets_catalog.json'
import enCrm from '../locales/en/tickets_catalog.json'
import tjCrm from '../locales/tj/tickets_catalog.json'

import ruStaff from '../locales/ru/staff.json'
import enStaff from '../locales/en/staff.json'
import tjStaff from '../locales/tj/staff.json'

import ruReport from '../locales/ru/report.json'
import enReport from '../locales/en/report.json'
import tjReport from '../locales/tj/report.json'

import ruCompany from '../locales/ru/company.json'
import enCompany from '../locales/en/company.json'
import tjCompany from '../locales/tj/company.json'

const savedLang = localStorage.getItem('lang') || 'ru'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: {
        auth:      ruAuth,
        menu:      ruMenu,
        common:    ruCommon,
        dashboard: ruDashboard,
        crm:       ruCrm,
        staff:     ruStaff,
        report:    ruReport,
        company:   ruCompany,
      },
      en: {
        auth:      enAuth,
        menu:      enMenu,
        common:    enCommon,
        dashboard: enDashboard,
        crm:       enCrm,
        staff:     enStaff,
        report:    enReport,
        company:   enCompany,
      },
      tj: {
        auth:      tjAuth,
        menu:      tjMenu,
        common:    tjCommon,
        dashboard: tjDashboard,
        crm:       tjCrm,
        staff:     tjStaff,
        report:    tjReport,
        company:   tjCompany,
      },
    },
    lng: savedLang,
    fallbackLng: 'ru',
    ns: ['auth', 'menu', 'common', 'dashboard', 'crm', 'staff', 'report', 'company'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
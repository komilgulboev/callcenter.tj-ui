// ─── Типы пользователей (users.type) ────────────────────────
export const USER_TYPE = {
  SUPER_ADMIN:   0,  // главный админ — видит всё включая /companies
  TENANT_ADMIN:  1,  // тенант админ — всё кроме /companies
  AGENT:         3,  // агент — роль определяет доступ
}

// ─── Роли агентов (users.role) ───────────────────────────────
export const ROLE = {
  OPERATOR:    0,  // только телефон + тикеты
  SUPERVISOR:  1,  // мониторинг + тикеты + отчёты
  HR:          2,  // сотрудники
}

// ─── Маршруты и кто имеет доступ ────────────────────────────
// allowed: список type или 'role:X' для агентов
// если поле отсутствует — доступно всем авторизованным

export const ROUTE_ACCESS = {
  '/webphone':        { roles: [ROLE.OPERATOR, ROLE.SUPERVISOR, ROLE.HR], adminAccess: true },
  '/dashboard':       { roles: [ROLE.SUPERVISOR],                          adminAccess: true },
  '/tickets':         { roles: [ROLE.OPERATOR, ROLE.SUPERVISOR, ROLE.HR],  adminAccess: true },
  '/staff':           { roles: [ROLE.HR],                                  adminAccess: true },
  '/companies':       { roles: [],                                          adminAccess: true, superAdminOnly: true },
  '/report_calls':    { roles: [ROLE.SUPERVISOR],                          adminAccess: true },
  '/report_by_staff': { roles: [ROLE.SUPERVISOR],                          adminAccess: true },
}

/**
 * Проверяет есть ли доступ к маршруту
 * @param {string} path
 * @param {number} userType  — users.type
 * @param {number|null} role — users.role
 */
export function hasAccess(path, userType, role) {
  // Главный админ видит всё
  if (userType === USER_TYPE.SUPER_ADMIN) return true

  const access = ROUTE_ACCESS[path]
  if (!access) return true // маршрут не ограничен

  // Только супер-админ
  if (access.superAdminOnly) return false

  // Тенант-админ видит всё кроме superAdminOnly
  if (userType === USER_TYPE.TENANT_ADMIN) return access.adminAccess

  // Агент — проверяем роль
  const userRole = role ?? ROLE.OPERATOR
  return access.roles.includes(userRole)
}

/**
 * Возвращает название роли для отображения
 */
export function getRoleName(userType, role, t) {
  if (userType === USER_TYPE.SUPER_ADMIN)  return t ? t('role.superAdmin')  : 'Главный админ'
  if (userType === USER_TYPE.TENANT_ADMIN) return t ? t('role.tenantAdmin') : 'Администратор'
  const r = role ?? ROLE.OPERATOR
  if (r === ROLE.SUPERVISOR) return t ? t('role.supervisor') : 'Супервайзер'
  if (r === ROLE.HR)         return t ? t('role.hr')         : 'HR'
  return t ? t('role.operator') : 'Оператор'
}
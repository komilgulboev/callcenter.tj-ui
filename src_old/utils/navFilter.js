import { hasAccess, USER_TYPE, ROLE } from '../config/roles'

/**
 * Фильтрует массив _nav по правам пользователя
 * @param {Array} navItems — массив из _nav.js
 * @param {number} userType — users.type
 * @param {number|null} role — users.role
 */
export function filterNav(navItems, userType, role) {
  return navItems
    .filter(item => {
      if (!item.access) return true // нет ограничений — показываем

      const { roles, adminAccess, superAdminOnly } = item.access

      // Только супер-админ
      if (superAdminOnly) return userType === USER_TYPE.SUPER_ADMIN

      // Тенант-админ
      if (userType === USER_TYPE.TENANT_ADMIN) return adminAccess

      // Супер-админ
      if (userType === USER_TYPE.SUPER_ADMIN) return true

      // Агент — проверяем роль
      const userRole = role ?? ROLE.OPERATOR
      return roles.includes(userRole)
    })
    .map(item => {
      // Для групп — фильтруем вложенные items
      if (item.items) {
        return { ...item, items: item.items } // подменю не ограничиваем
      }
      return item
    })
}
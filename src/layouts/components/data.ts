import { type MenuItemType } from '@/types/layout'
import { type IconType } from 'react-icons'
import {
  TbAlertHexagon,
  TbBan,
  TbBellRinging,
  TbBoxAlignTop,
  TbCreditCard,
  TbFiles,
  TbHeadset,
  TbLayout,
  TbLayoutDashboard,
  TbLayoutNavbar,
  TbLayoutSidebar,
  TbLock,
  TbLockAccess,
  TbLogout2,
  TbRocket,
  TbSettings2,
  TbShieldLock,
  TbSitemap,
  TbStackFront,
  TbStar,
  TbTrophy,
  TbUserCircle,
  TbUserHexagon,
  TbUsers,
  TbAdjustments,
} from 'react-icons/tb'

type UserDropdownItemType = {
  label?: string
  icon?: IconType
  url?: string
  isDivider?: boolean
  isHeader?: boolean
  class?: string
}

export const userDropdownItems: UserDropdownItemType[] = [
  {
    label: 'Welcome back!',
    isHeader: true,
  },
  {
    label: 'Profile',
    icon: TbUserCircle,
    url: '/pages/profile',
  },
  {
    label: 'Notifications',
    icon: TbBellRinging,
    url: '#',
  },
  {
    label: 'Balance: $985.25',
    icon: TbCreditCard,
    url: '#',
  },
  {
    label: 'Account Settings',
    icon: TbSettings2,
    url: '#',
  },
  {
    label: 'Support Center',
    icon: TbHeadset,
    url: '#',
  },
  {
    isDivider: true,
  },
  {
    label: 'Lock Screen',
    icon: TbLock,
    url: '/auth-1/lock-screen',
  },
  {
    label: 'Log Out',
    icon: TbLogout2,
    url: '#',
    class: 'text-danger fw-semibold',
  },
]

export const menuItems: MenuItemType[] = [
  { key: 'menu', label: 'Menu', isTitle: true },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: TbLayoutDashboard,
    url: '/dashboard',
    roles: ['admin', 'arbitro', 'jugador', 'visitante'], // Todos
  },

  { key: 'apps', label: 'Aplicaciones', isTitle: true },
  {
    key: 'sports',
    label: 'Gestión Deportiva',
    icon: TbTrophy,
    roles: ['admin', 'arbitro'], // Solo admin y árbitro ven el menú
    children: [
      { key: 'equipos', label: 'Equipos', url: '/equipos', roles: ['admin'] },
      { key: 'categorias', label: 'Categorías', url: '/categorias', roles: ['admin'] },
      { key: 'jugadores', label: 'Jugadores', url: '/jugadores', roles: ['admin'] },
      { key: 'ingreso-jugadores', label: 'Ingreso de Jugadores', url: '/ingreso-jugadores', roles: ['admin'] },
      { key: 'entrenadores', label: 'Entrenadores', url: '/entrenadores', roles: ['admin'] },
      { key: 'torneos', label: 'Torneos', url: '/torneos', roles: ['admin'] },
      { key: 'gestion-jugadores', label: 'Vocalías', url: '/gestion-jugadores', roles: ['admin', 'arbitro'] },
      { key: 'descargar-pdfs-vocalia', label: 'Descargar PDFs Vocalía', url: '/descargar-pdfs-vocalia', roles: ['admin', 'arbitro'] },
    ],
  },
  { key: 'administracion', label: 'Administración', isTitle: true, roles: ['admin'] },
  {
    key: 'usuarios',
    label: 'Usuarios',
    icon: TbUserCircle,
    url: '/usuarios',
    roles: ['admin'],
  },
  {
    key: 'asignar-equipos-usuarios',
    label: 'Asignar Equipos a Usuarios',
    icon: TbUsers,
    url: '/asignar-equipos-usuarios',
    roles: ['admin'],
  },
  {
    key: 'configuraciones',
    label: 'Configuraciones',
    icon: TbAdjustments,
    url: '/configuraciones',
    roles: ['admin'],
  },
  {
    key: 'estadisticas',
    label: 'Estadísticas',
    icon: TbStar,
    url: '/estadisticas',
    roles: ['admin', 'arbitro', 'jugador', 'visitante'], // Todos pueden ver
  },
  { key: 'dev-tools', label: 'Herramientas Dev', isTitle: true, roles: ['admin'] },
  {
    key: 'auth',
    label: 'Authentication',
    icon: TbLock,
    roles: ['admin'], // Solo admin ve las páginas de auth para desarrollo
    children: [
      {
        key: 'version-1',
        label: 'Version 1',
        parentKey: 'auth',
        children: [
          { key: 'sign-in', label: 'Sign In', url: '/auth-1/sign-in' },
          { key: 'sign-up', label: 'Sign Up', url: '/auth-1/sign-up' },
          { key: 'reset-pass', label: 'Reset Password', url: '/auth-1/reset-password' },
          { key: 'new-pass', label: 'New Password', url: '/auth-1/new-password' },
          { key: 'two-factor', label: 'Two Factor', url: '/auth-1/two-factor' },
          { key: 'lock-screen', label: 'Lock Screen', url: '/auth-1/lock-screen' },
          { key: 'success-mail', label: 'Success Mail', url: '/auth-1/success-mail' },
          { key: 'login-pin', label: 'Login with PIN', url: '/auth-1/login-pin' },
          { key: 'delete-account', label: 'Delete Account', url: '/auth-1/delete-account' },
        ],
      },
      {
        key: 'version-2',
        label: 'Version 2',
        parentKey: 'auth',
        children: [
          { key: 'sign-in-2', label: 'Sign In', url: '/auth-2/sign-in' },
          { key: 'sign-up-2', label: 'Sign Up', url: '/auth-2/sign-up' },
          {
            key: 'reset-pass-2',
            label: 'Reset Password',
            url: '/auth-2/reset-password',
          },
          { key: 'new-pass-2', label: 'New Password', url: '/auth-2/new-password' },
          { key: 'two-factor-2', label: 'Two Factor', url: '/auth-2/two-factor' },
          { key: 'lock-screen-2', label: 'Lock Screen', url: '/auth-2/lock-screen' },
          { key: 'success-mail-2', label: 'Success Mail', url: '/auth-2/success-mail' },
          { key: 'login-pin-2', label: 'Login with PIN', url: '/auth-2/login-pin' },
          {
            key: 'delete-account-2',
            label: 'Delete Account',
            url: '/auth-2/delete-account',
          },
        ],
      },
      {
        key: 'version-3',
        label: 'Version 3',
        parentKey: 'auth',
        children: [
          { key: 'sign-in-3', label: 'Sign In', url: '/auth-3/sign-in' },
          { key: 'sign-up-3', label: 'Sign Up', url: '/auth-3/sign-up' },
          {
            key: 'reset-pass-3',
            label: 'Reset Password',
            url: '/auth-3/reset-password',
          },
          { key: 'new-pass-3', label: 'New Password', url: '/auth-3/new-password' },
          { key: 'two-factor-3', label: 'Two Factor', url: '/auth-3/two-factor' },
          { key: 'lock-screen-3', label: 'Lock Screen', url: '/auth-3/lock-screen' },
          { key: 'success-mail-3', label: 'Success Mail', url: '/auth-3/success-mail' },
          { key: 'login-pin-3', label: 'Login with PIN', url: '/auth-3/login-pin' },
          {
            key: 'delete-account-3',
            label: 'Delete Account',
            url: '/auth-3/delete-account',
          },
        ],
      },
    ],
  },
]

export const horizontalMenuItems: MenuItemType[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: TbLayoutDashboard,
    url: '/dashboard',
  },
  {
    key: 'pages',
    label: 'Pages',
    icon: TbFiles,
    children: [
      {
        key: 'version-1',
        label: 'Authentication 1',
        icon: TbShieldLock,
        children: [
          { key: 'sign-in', label: 'Sign In', url: '/auth-1/sign-in' },
          { key: 'sign-up', label: 'Sign Up', url: '/auth-1/sign-up' },
          { key: 'reset-pass', label: 'Reset Password', url: '/auth-1/reset-password' },
          { key: 'new-pass', label: 'New Password', url: '/auth-1/new-password' },
          { key: 'two-factor', label: 'Two Factor', url: '/auth-1/two-factor' },
          { key: 'lock-screen', label: 'Lock Screen', url: '/auth-1/lock-screen' },
          { key: 'success-mail', label: 'Success Mail', url: '/auth-1/success-mail' },
          { key: 'login-pin', label: 'Login with PIN', url: '/auth-1/login-pin' },
          { key: 'delete-account', label: 'Delete Account', url: '/auth-1/delete-account' },
        ],
      },
      {
        key: 'version-2',
        label: 'Authentication 2',
        icon: TbUserHexagon,
        children: [
          { key: 'sign-in-2', label: 'Sign In', url: '/auth-2/sign-in' },
          { key: 'sign-up-2', label: 'Sign Up', url: '/auth-2/sign-up' },
          {
            key: 'reset-pass-2',
            label: 'Reset Password',
            url: '/auth-2/reset-password',
          },
          { key: 'new-pass-2', label: 'New Password', url: '/auth-2/new-password' },
          { key: 'two-factor-2', label: 'Two Factor', url: '/auth-2/two-factor' },
          { key: 'lock-screen-2', label: 'Lock Screen', url: '/auth-2/lock-screen' },
          { key: 'success-mail-2', label: 'Success Mail', url: '/auth-2/success-mail' },
          { key: 'login-pin-2', label: 'Login with PIN', url: '/auth-2/login-pin' },
          {
            key: 'delete-account-2',
            label: 'Delete Account',
            url: '/auth-2/delete-account',
          },
        ],
      },
      {
        key: 'version-3',
        label: 'Authentication 3',
        icon: TbLockAccess,
        children: [
          { key: 'sign-in-3', label: 'Sign In', url: '/auth-3/sign-in' },
          { key: 'sign-up-3', label: 'Sign Up', url: '/auth-3/sign-up' },
          {
            key: 'reset-pass-3',
            label: 'Reset Password',
            url: '/auth-3/reset-password',
          },
          { key: 'new-pass-3', label: 'New Password', url: '/auth-3/new-password' },
          { key: 'two-factor-3', label: 'Two Factor', url: '/auth-3/two-factor' },
          { key: 'lock-screen-3', label: 'Lock Screen', url: '/auth-3/lock-screen' },
          { key: 'success-mail-3', label: 'Success Mail', url: '/auth-3/success-mail' },
          { key: 'login-pin-3', label: 'Login with PIN', url: '/auth-3/login-pin' },
          {
            key: 'delete-account-3',
            label: 'Delete Account',
            url: '/auth-3/delete-account',
          },
        ],
      },
      {
        key: 'error',
        label: 'Error Pages',
        icon: TbAlertHexagon,
        children: [
          { key: 'error-400', label: '400', url: '/error/400' },
          { key: 'error-401', label: '401', url: '/error/401' },
          { key: 'error-403', label: '403', url: '/error/403' },
          { key: 'error-404', label: '404', url: '/error/404' },
          { key: 'error-408', label: '408', url: '/error/408' },
          { key: 'error-500', label: '500', url: '/error/500' },
          { key: 'maintenance', label: 'Maintenance', url: '/maintenance' },
        ],
      },
    ],
  },
  {
    key: 'layouts',
    label: 'Layouts',
    icon: TbLayout,
    children: [
      {
        key: 'layout-options',
        label: 'Layout Options',
        icon: TbLayout,
        children: [
          { key: 'scrollable', label: 'Scrollable', url: '/layouts/scrollable' },
          { key: 'compact', label: 'Compact', url: '/layouts/compact' },
          { key: 'boxed', label: 'Boxed', url: '/layouts/boxed' },
          { key: 'horizontal', label: 'Horizontal', url: '/layouts/horizontal' },
        ],
      },
      {
        key: 'sidebars',
        label: 'Sidebars',
        icon: TbLayoutSidebar,
        children: [
          { key: 'compact-menu', label: 'Compact Menu', url: '/layouts/sidebars/compact' },
          { key: 'icon-view-menu', label: 'Icon View Menu', url: '/layouts/sidebars/icon-view' },
          { key: 'on-hover-menu', label: 'On Hover Menu', url: '/layouts/sidebars/on-hover' },
          {
            key: 'on-hover-active-menu',
            label: 'On Hover Active Menu',
            url: '/layouts/sidebars/on-hover-active',
          },
          { key: 'offcanvas-menu', label: 'Offcanvas Menu', url: '/layouts/sidebars/offcanvas' },
          {
            key: 'no-icons-with-lines-menu',
            label: 'No Icons With Lines',
            url: '/layouts/sidebars/no-icons-with-lines',
          },
          {
            key: 'with-lines-menu',
            label: 'Sidebar With Lines',
            url: '/layouts/sidebars/with-lines',
          },
          { key: 'light-menu', label: 'Light Menu', url: '/layouts/sidebars/light' },
          { key: 'gradient-menu', label: 'Gradient Menu', url: '/layouts/sidebars/gradient' },
          { key: 'gray-menu', label: 'Gray Menu', url: '/layouts/sidebars/gray' },
          { key: 'image-menu', label: 'Image Menu', url: '/layouts/sidebars/image' },
        ],
      },
      {
        key: 'topbars',
        label: 'Topbar',
        icon: TbBoxAlignTop,
        children: [
          { key: 'dark-topbar', label: 'Dark Topbar', url: '/layouts/topbars/dark' },
          { key: 'gray-topbar', label: 'Gray Topbar', url: '/layouts/topbars/gray' },
          { key: 'gradient-topbar', label: 'Gradient Topbar', url: '/layouts/topbars/gradient' },
          {
            key: 'with-sub-items-topbar',
            label: 'Topbar with Sub Items',
            url: '/layouts/topbars/with-sub-items',
          },
          {
            key: 'with-tools-topbar',
            label: 'Topbar with Tools',
            url: '/layouts/topbars/with-tools',
          },
        ],
      },
    ],
  },
]

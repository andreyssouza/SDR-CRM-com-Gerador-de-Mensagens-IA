import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Kanban, Megaphone,
  LogOut, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn, getInitials } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/kanban',     label: 'Kanban',      icon: Kanban },
  { to: '/campaigns',  label: 'Campanhas',   icon: Megaphone },
]

export function Sidebar() {
  const { user, workspace, signOut } = useAuth()

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo / Workspace */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
            {workspace ? getInitials(workspace.name) : 'CR'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{workspace?.name ?? 'SDR CRM'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}

import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ScanSearch, ShieldCheck, BarChart3, Settings as SettingsIcon, Search } from 'lucide-react'
import { useStore } from './store'
import { ModeBadge } from './components/ui'
import GradeDesk from './pages/GradeDesk'
import ReviewDetail from './pages/ReviewDetail'
import Integrity from './pages/Integrity'
import Dashboard from './pages/Dashboard'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { state } = useStore()
  const demo = !state.settings.apiKey.trim()

  return (
    <HashRouter>
      <div className="flex h-full flex-col">
        {/* 顶部导航 */}
        <header className="flex h-14 items-center gap-6 border-b border-slate-200 bg-white px-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white">
              <Search size={17} strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-wide text-slate-900">批改侦探</div>
              <div className="text-[10px] font-medium tracking-widest text-slate-400">GRADEDETECT</div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <NavItem to="/" icon={<ScanSearch size={15} />} label="批改台" />
            <NavItem to="/integrity" icon={<ShieldCheck size={15} />} label="真实性体检" />
            <NavItem to="/dashboard" icon={<BarChart3 size={15} />} label="班级看板" />
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ModeBadge demo={demo} />
            <NavLink
              to="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="设置"
            >
              <SettingsIcon size={17} />
            </NavLink>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<GradeDesk />} />
            <Route path="/review/:id" element={<ReviewDetail />} />
            <Route path="/integrity" element={<Integrity />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

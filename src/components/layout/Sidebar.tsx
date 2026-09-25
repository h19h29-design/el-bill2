import {
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ViewKey } from '../../types'
import { viewMenuItems } from '../../lib/viewMenu'
interface SidebarProps {
  activeView: ViewKey
  onChange: (view: ViewKey) => void
}

export function Sidebar({ activeView, onChange }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <ShieldCheck size={18} />
        <span>서울특별시교육청</span>
      </div>
      <button
        type="button"
        className="sidebar-menu-toggle"
        aria-label={menuOpen ? '주요 메뉴 닫기' : '주요 메뉴 열기'}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav
        id="primary-navigation"
        className={menuOpen ? 'sidebar-nav open' : 'sidebar-nav'}
        aria-label="주요 메뉴"
      >
        {viewMenuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              className={activeView === item.key ? 'nav-item active' : 'nav-item'}
              aria-current={activeView === item.key ? 'page' : undefined}
              onClick={() => {
                onChange(item.key)
                setMenuOpen(false)
              }}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-user">
        <div className="user-avatar">A</div>
        <div>
          <strong>에너지 담당자</strong>
          <span>A고등학교</span>
        </div>
      </div>
    </aside>
  )
}

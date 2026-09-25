import {
  Activity,
  BookOpen,
  Building2,
  Calculator,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  PlugZap,
  Settings,
  WandSparkles,
  Zap,
} from 'lucide-react'
import type { ViewKey } from '../types'

export interface ViewMenuItem {
  key: ViewKey
  label: string
  icon: typeof LayoutDashboard
}

// Canonical menu list shared by the sidebar, the simple-flow tools drawer,
// and the energy landing menu so labels and ViewKeys never diverge.
export const viewMenuItems: ViewMenuItem[] = [
  { key: 'simple', label: '간편 진단', icon: Zap },
  { key: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { key: 'easyDiagnosis', label: '쉬운 진단', icon: WandSparkles },
  { key: 'diagnosis', label: '자동진단', icon: ClipboardCheck },
  { key: 'school', label: '학교정보', icon: Building2 },
  { key: 'bills', label: '고지서 입력', icon: FileSpreadsheet },
  { key: 'powerPlanner', label: '파워플래너', icon: PlugZap },
  { key: 'rates', label: '요금제 비교', icon: Calculator },
  { key: 'peak', label: '피크관리', icon: Activity },
  { key: 'docs', label: '문서생성', icon: FileText },
  { key: 'guide', label: '사용 안내', icon: BookOpen },
  { key: 'settings', label: '설정', icon: Settings },
]

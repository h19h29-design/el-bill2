import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ViewKey } from '../../types'
import { viewMenuItems } from '../../lib/viewMenu'
import { useEnergyScene } from './useEnergyScene'
import './landing.css'

interface EnergyLandingProps {
  onStart: () => void
  onNavigate: (view: ViewKey) => void
  onHome: () => void
  // Storage expiry or lock notices must stay visible even while the
  // landing covers the simple flow.
  notice?: string
}

const menuGroups: Array<{ title: string; keys: ViewKey[] }> = [
  {
    title: '진단 시작',
    keys: ['simple', 'easyDiagnosis', 'diagnosis', 'dashboard'],
  },
  {
    title: '비교 · 분석',
    keys: ['rates', 'peak', 'powerPlanner', 'docs'],
  },
  {
    title: '자료 · 관리',
    keys: ['bills', 'school', 'settings', 'guide'],
  },
]

const quickLinks: Array<{ key: ViewKey; label: string }> = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'rates', label: '요금제 비교' },
  { key: 'peak', label: '피크관리' },
]

const itemByKey = new Map(viewMenuItems.map((item) => [item.key, item]))

interface LandingDialogProps {
  className: string
  labelledBy: string
  onClose: () => void
  returnFocusRef: React.RefObject<HTMLElement | null>
  children: ReactNode
}

// Native <dialog> wrapper: Escape/backdrop close, focus stays inside,
// and closing returns focus to the opener. Falls back to the open
// attribute where showModal is unavailable (jsdom).
function LandingDialog({
  className,
  labelledBy,
  onClose,
  returnFocusRef,
  children,
}: LandingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const trigger = returnFocusRef.current
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('click', onClick)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('click', onClick)
      document.body.style.overflow = previousOverflow
      if (trigger && trigger.isConnected) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [onClose, returnFocusRef])

  return (
    <dialog ref={dialogRef} className={className} aria-labelledby={labelledBy}>
      {children}
    </dialog>
  )
}

export function EnergyLanding({
  onStart,
  onNavigate,
  onHome,
  notice,
}: EnergyLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const overlayOpen = menuOpen || helpOpen
  const scene = useEnergyScene(overlayOpen)

  const handleNavigate = (view: ViewKey) => {
    setMenuOpen(false)
    setHelpOpen(false)
    onNavigate(view)
  }

  const handleStart = () => {
    setMenuOpen(false)
    setHelpOpen(false)
    onStart()
  }

  return (
    <div
      className="elbill-landing"
      data-motion={scene.paused ? 'paused' : 'running'}
      data-suspended={String(overlayOpen)}
    >
      <a className="skip-link" href="#primary-cta">
        절감 확인으로 바로가기
      </a>
      <div className="page-shell">
        {notice && (
          <p className="landing-notice" role="status">
            {notice}
          </p>
        )}
        <header className="site-header">
          <button
            type="button"
            className="brand"
            onClick={onHome}
            aria-label="EL-BILL 학교 전기요금 절감, 처음으로"
          >
            <svg
              className="brand-mark"
              viewBox="0 0 44 56"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M22 3C10.9 3 3 11.5 3 22c0 7.3 4.1 12.4 9 16.6V43h20v-4.4c4.9-4.2 9-9.3 9-16.6C41 11.5 33.1 3 22 3Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M13 47h18M16 51h12M20 54h4"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M22 42V26m0 4c-8 .3-11-5.4-10.5-11 6.4.1 10.3 4.1 10.5 11Zm0-4c.5-7.7 5.4-10.8 11.1-11.2.1 6.6-4 11.3-11.1 11.2Z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m22 26 6-6m-6 10-5-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>
              <span className="brand-name">EL-BILL</span>
              <span className="brand-subtitle">학교 전기요금 절감</span>
            </span>
          </button>
          <nav className="header-navigation" aria-label="주요 기능">
            <div className="quick-navigation">
              {quickLinks.map((link) => (
                <button
                  key={link.key}
                  className="quick-link"
                  type="button"
                  onClick={() => onNavigate(link.key)}
                >
                  {link.label}
                </button>
              ))}
            </div>
            <button
              id="menu-open"
              ref={menuButtonRef}
              className="menu-open"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="menu-dialog"
              onClick={() => setMenuOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              전체 메뉴
            </button>
          </nav>
        </header>

        <main className="hero" id="main-content">
          <div className="hero-copy">
            <h1>
              같은 전기,
              <span>더 나은 내일</span>
            </h1>
            <p className="hero-subtitle">
              학교의 소중한 에너지를, 더 효율적으로
            </p>
          </div>

          <div
            className="scene"
            ref={scene.sceneRef}
            aria-label="학교 주변을 순환하는 에너지 링"
          >
            <div className="art-stage" ref={scene.stageRef}>
              <canvas
                className="energy-canvas energy-back"
                ref={scene.backCanvasRef}
                aria-hidden="true"
              />
              <img
                className="school-image"
                src="/assets/campus.webp"
                width="1310"
                height="484"
                alt="전구와 플러그, 잎사귀가 있는 에너지 링이 학교 모형을 감싸는 모습"
                fetchPriority="high"
                decoding="sync"
                draggable="false"
              />
              <canvas
                className="energy-canvas energy-front"
                ref={scene.frontCanvasRef}
                aria-hidden="true"
              />
            </div>
            <aside
              className="effect-card"
              data-mode="demo"
              data-counting={String(scene.counting)}
              aria-label="절감 효과를 설명하기 위한 예시 18퍼센트. 실제 분석 결과가 아닙니다."
            >
              <p className="effect-heading">
                <span>절감 효과</span>
                <span className="effect-tools">
                  <span className="example-label">예시</span>
                  <button
                    type="button"
                    className="counter-replay"
                    aria-label="절감률 다시 보기"
                    title="다시 보기"
                    aria-disabled={scene.paused}
                    onClick={scene.replay}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 5v5h5M3.5 10a8 8 0 1 1 .5 6" />
                    </svg>
                  </button>
                </span>
              </p>
              <div className="effect-value" aria-hidden="true">
                <strong aria-hidden="true">{scene.displayValue}</strong>
                <span className="percent">%</span>
                <svg
                  className="down-arrow"
                  viewBox="0 0 28 40"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M14 4v30M4 25l10 10 10-10"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <svg
                className="mini-leaf"
                viewBox="0 0 44 58"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="leaf-fill"
                    x1="8"
                    y1="45"
                    x2="37"
                    y2="9"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#2b932b" />
                    <stop offset="1" stopColor="#a1cf36" />
                  </linearGradient>
                </defs>
                <path
                  d="M11 47C-1 26 24 15 33 3c7 20 7 44-22 44Z"
                  fill="url(#leaf-fill)"
                />
                <path
                  d="M7 56c4-18 16-29 24-42"
                  stroke="#649e37"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M12 43c3-12 11-20 17-26"
                  stroke="#fff"
                  strokeOpacity=".75"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                className="chart"
                viewBox="0 0 194 54"
                fill="none"
                role="img"
                aria-label="절감 효과 예시를 나타내는 하향 그래프"
              >
                <g fill="#b9d6c4" fillOpacity=".46">
                  <rect x="0" y="2" width="15" height="51" rx="1" />
                  <rect x="20" y="7" width="15" height="46" rx="1" />
                  <rect x="40" y="16" width="15" height="37" rx="1" />
                  <rect x="60" y="25" width="15" height="28" rx="1" />
                  <rect x="80" y="32" width="15" height="21" rx="1" />
                  <rect x="100" y="38" width="15" height="15" rx="1" />
                  <rect x="120" y="41" width="15" height="12" rx="1" />
                  <rect x="140" y="43" width="15" height="10" rx="1" />
                  <rect x="160" y="45" width="15" height="8" rx="1" />
                  <rect x="180" y="46" width="14" height="7" rx="1" />
                </g>
                <path
                  className="chart-line"
                  d="M4 1C23 0 33 4 44 12S66 30 90 37s59 9 103 11"
                  stroke="#69b297"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
              >
                {scene.summary}
              </span>
            </aside>
          </div>

          <div className="cta-panel">
            <button
              type="button"
              className="primary-cta"
              id="primary-cta"
              onClick={handleStart}
            >
              <svg
                className="cta-document"
                viewBox="0 0 26 30"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 2h10l7 7v19H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2v8h8M8 15h9M8 20h9M8 24h5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>전기요금 절감 확인하기</span>
              <span className="cta-arrow">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 12h15m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </main>

        <footer className="site-footer">
          <p className="footer-note">학교의 내일을 더 가볍게.</p>
          <button
            className="motion-toggle"
            type="button"
            aria-pressed={scene.paused}
            aria-label={
              scene.paused ? '애니메이션 재생' : '애니메이션 일시정지'
            }
            onClick={scene.togglePaused}
          >
            {!scene.paused && (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5.5 3.5v9m5-9v9"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
            )}
            {scene.paused && (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m5 3 8 5-8 5V3Z"
                stroke="currentColor"
                strokeLinejoin="round"
              />
            </svg>
            )}
            <span>{scene.paused ? '모션 재생' : '모션 정지'}</span>
          </button>
        </footer>
      </div>

      {helpOpen && (
        <LandingDialog
          className="help-dialog"
          labelledBy="help-title"
          onClose={() => setHelpOpen(false)}
          returnFocusRef={helpButtonRef}
        >
          <div className="dialog-top">
            <h2 id="help-title">고지서로 간편하게</h2>
            <button
              className="close-dialog"
              type="button"
              aria-label="안내 닫기"
              onClick={() => setHelpOpen(false)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="m5 5 10 10M15 5 5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <ol className="help-steps">
            <li>
              <span className="step-number">1</span>
              <div>
                <strong>고지서 준비</strong>
                <p>학교 전기요금 자료를 준비해 주세요.</p>
              </div>
            </li>
            <li>
              <span className="step-number">2</span>
              <div>
                <strong>자료 입력</strong>
                <p>진단 화면의 안내에 따라 자료를 입력해 주세요.</p>
              </div>
            </li>
            <li>
              <span className="step-number">3</span>
              <div>
                <strong>절감 가능성 확인</strong>
                <p>분석 결과와 요금제를 비교해 보세요.</p>
              </div>
            </li>
          </ol>
          <button
            type="button"
            className="dialog-cta"
            onClick={handleStart}
          >
            전기요금 절감 확인하기
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12h15m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <p className="dialog-disclaimer">
            현재 진단 서비스로 이동합니다.
            <br />
            첫 화면의 18%는 연출용 예시이며, 실제 절감률이 아닙니다.
          </p>
        </LandingDialog>
      )}

      {menuOpen && (
        <LandingDialog
          className="menu-dialog"
          labelledBy="menu-title"
          onClose={() => setMenuOpen(false)}
          returnFocusRef={menuButtonRef}
        >
          <div className="dialog-top">
            <h2 id="menu-title">전체 메뉴</h2>
            <button
              className="close-dialog"
              type="button"
              aria-label="전체 메뉴 닫기"
              autoFocus
              onClick={() => setMenuOpen(false)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav className="menu-groups" aria-label="모든 기능">
            {menuGroups.map((group, groupIndex) => (
              <section
                key={group.title}
                className="menu-group"
                aria-labelledby={`menu-group-${groupIndex}`}
              >
                <h3 id={`menu-group-${groupIndex}`}>{group.title}</h3>
                <div className="menu-grid">
                  {group.keys.map((key) => {
                    const item = itemByKey.get(key)
                    if (!item) return null
                    const Icon = item.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        className="feature-link"
                        data-view={key}
                        onClick={() => handleNavigate(key)}
                      >
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>
          <div className="menu-utilities">
            <button
              className="menu-help"
              type="button"
              aria-haspopup="dialog"
              ref={helpButtonRef}
              onClick={() => {
                setMenuOpen(false)
                setHelpOpen(true)
              }}
            >
              간단 사용법
            </button>
          </div>
        </LandingDialog>
      )}
    </div>
  )
}

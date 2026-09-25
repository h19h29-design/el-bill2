import { useEffect } from 'react'
import { LayoutGrid, Zap } from 'lucide-react'
import type {
  AutoDiagnosisResult,
  CalculationSettings,
  DataProvenance,
  MonthlyBill,
  PeakScenario,
  RatePlan,
  SchoolProfile,
  ViewKey,
} from '../../types'
import type { EasyDiagnosisApplyInput } from '../easyDiagnosis/EasyDiagnosisWizard'
import { useSimpleDiagnosis } from './useSimpleDiagnosis'
import { SimpleStartScreen } from './SimpleStartScreen'
import { SimpleReviewScreen } from './SimpleReviewScreen'
import { SimpleResultScreen } from './SimpleResultScreen'
import { SimpleDialogs } from './SimpleDialogs'
import './simple.css'
import { EnergyLanding } from '../landing/EnergyLanding'

export interface SimpleDiagnosisShellProps {
  diagnosis: AutoDiagnosisResult
  dataProvenance: DataProvenance
  profile: SchoolProfile
  ratePlans: RatePlan[]
  scenario: PeakScenario
  calculationSettings: CalculationSettings
  sampleBills: MonthlyBill[]
  sampleProfile: SchoolProfile
  expiresAt?: string
  expiryMessage: string
  onApply: (input: EasyDiagnosisApplyInput) => Promise<boolean>
  onOpenFeature: (view: ViewKey) => void
}

const stepItems = [
  { key: 'start', label: '자료 올리기' },
  { key: 'review', label: '내용 확인' },
  { key: 'result', label: '결과 보기' },
] as const

export function SimpleDiagnosisShell(props: SimpleDiagnosisShellProps) {
  const state = useSimpleDiagnosis({
    profile: props.profile,
    ratePlans: props.ratePlans,
    scenario: props.scenario,
    calculationSettings: props.calculationSettings,
    billsOrigin: props.dataProvenance.bills,
    appliedDiagnosis: props.diagnosis,
    sampleBills: props.sampleBills,
    sampleProfile: props.sampleProfile,
    onApply: props.onApply,
    onOpenFeature: props.onOpenFeature,
  })

  const { step, rows, demo, requestHome } = state

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (rows.length && !demo) {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [rows.length, demo])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const activeIndex = stepItems.findIndex((item) => item.key === step)

  return (
    <div className="eb-root">
      {state.landing && step === 'start' ? (
        <EnergyLanding
          onStart={state.dismissLanding}
          onNavigate={(view) => {
            if (view === 'simple') {
              state.dismissLanding()
            } else {
              state.openFeature(view)
            }
          }}
          onHome={state.requestHome}
          notice={props.expiryMessage}
        />
      ) : (
        <>
      <a className="eb-skip" href="#eb-main">
        본문으로 이동
      </a>
      <header className="eb-header">
        <div className="eb-wrap eb-header-inner">
          <button
            type="button"
            className="eb-brand"
            onClick={requestHome}
            aria-label="EL BILL 시작 화면"
          >
            <span className="eb-brand-mark">
              <Zap aria-hidden="true" />
            </span>
            <span className="eb-brand-name">EL BILL</span>
            <span className="eb-brand-note">
              우리 학교
              <br />
              전기요금 진단
            </span>
          </button>
          <div className="eb-header-actions">
            <button
              type="button"
              className="eb-text-btn"
              onClick={() => state.openDialog('guide')}
            >
              사용 안내
            </button>
            <button
              type="button"
              className="eb-tools-btn"
              onClick={() => state.openDialog('tools')}
            >
              <LayoutGrid aria-hidden="true" />
              전문 기능
            </button>
          </div>
        </div>
      </header>

      <div className="eb-wrap">
        <nav aria-label="진단 진행 단계">
          <ol className="eb-steps">
            {stepItems.flatMap((item, index) => {
              const nodes = [
                <li
                  key={item.key}
                  data-step={item.key}
                  className={
                    index === activeIndex
                      ? 'eb-current'
                      : index < activeIndex
                        ? 'eb-complete'
                        : ''
                  }
                  aria-current={index === activeIndex ? 'step' : undefined}
                >
                  <span className="eb-step-dot">
                    {index < activeIndex ? '✓' : index + 1}
                  </span>
                  {item.label}
                </li>
              ]
              if (index < stepItems.length - 1) {
                nodes.push(
                  <li
                    key={`line-${item.key}`}
                    className="eb-step-line"
                    aria-hidden="true"
                  />,
                )
              }
              return nodes
            })}
          </ol>
        </nav>

        {props.expiryMessage && (
          <p
            role="status"
            style={{
              textAlign: 'center',
              color: 'var(--amber)',
              fontSize: 12,
              margin: '0 0 8px',
            }}
          >
            {props.expiryMessage}
          </p>
        )}

        <main id="eb-main" className="eb-main">
          {step === 'start' && <SimpleStartScreen state={state} />}
          {step === 'review' && (
            <SimpleReviewScreen state={state} ratePlans={props.ratePlans} />
          )}
          {step === 'result' && (
            <SimpleResultScreen state={state} expiresAt={props.expiresAt} />
          )}
        </main>

        <footer className="eb-footer">
          <div>
            <span className="eb-foot-wordmark">EL BILL</span>
            학교의 합리적인 전기요금 선택을 돕습니다.
          </div>
          <div className="eb-footer-links">
            {props.expiresAt && (
              <span>
                자료 보관:{' '}
                {new Date(props.expiresAt).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                까지
              </span>
            )}
            <button
              type="button"
              onClick={() => state.openDialog('privacy')}
            >
              자료 처리 안내
            </button>
            <button
              type="button"
              onClick={() => state.openDialog('about')}
            >
              화면 안내
            </button>
          </div>
        </footer>
      </div>
        </>
      )}

      <SimpleDialogs state={state} />

      {state.toastMessage && (
        <div className="eb-toast" role="status">
          {state.toastMessage}
        </div>
      )}
    </div>
  )
}

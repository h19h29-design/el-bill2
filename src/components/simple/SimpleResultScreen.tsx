import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  TrendingUp,
} from 'lucide-react'
import { PlanCandidateTable } from '../diagnosis/PlanCandidateTable'
import { formatWon, type useSimpleDiagnosis } from './useSimpleDiagnosis'

type SimpleState = ReturnType<typeof useSimpleDiagnosis>

const toneTitle = {
  change: '요금제 변경이 유리한 것으로 추정됩니다',
  maintain: '현재 요금제 유지가 유리합니다',
  review: '추가 확인이 필요합니다',
} as const

const formatManWon = (value: number) =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(
    value / 10000,
  )

export function SimpleResultScreen({
  state,
  expiresAt,
}: {
  state: SimpleState
  expiresAt?: string
}) {
  const { diagnosis, decision, demo, validation } = state
  if (!diagnosis || !decision) return null

  const tone = decision.tone
  const comparison = diagnosis.comparison
  const annual = comparison.annualDataAvailable
  const currentName = diagnosis.currentPlan?.planName ?? '현재 요금제'
  const candidateName =
    diagnosis.recommendedPlan?.planName ?? '비교 요금제'
  const maxCost = Math.max(
    comparison.currentAnnualWon,
    comparison.candidateAnnualWon,
    1,
  )
  const currentWidth = annual
    ? Math.max(4, Math.round((comparison.currentAnnualWon / maxCost) * 100))
    : 0
  const candidateWidth = annual
    ? Math.max(4, Math.round((comparison.candidateAnnualWon / maxCost) * 100))
    : 0

  const Symbol =
    tone === 'change' ? TrendingUp : tone === 'maintain' ? Check : Info

  const nextTitle =
    tone === 'change'
      ? '변경을 검토할 준비가 됐어요'
      : tone === 'maintain'
        ? '지금은 이대로 두는 것이 좋아요'
        : '한 가지만 더 확인해 주세요'
  const nextDescription =
    tone === 'change'
      ? '실제 신청 전에 계약조건과 서류를 함께 점검해요.'
      : tone === 'maintain'
        ? '자료가 더 쌓이거나 계약이 바뀌면 다시 비교해 보세요.'
        : '부족한 자료를 보완하면 다시 비교할 수 있어요.'

  return (
    <section
      className="eb-screen eb-result-shell"
      aria-labelledby="eb-result-title"
    >
      {demo && (
        <div className="eb-demo-bar">
          <span>
            <strong>결과 화면 예시</strong> · 예시 자료로 실제 계산 엔진을
            실행한 화면입니다. 실제 신청에는 사용할 수 없어요.
          </span>
          <button type="button" onClick={state.requestHome}>
            내 자료로 시작
          </button>
        </div>
      )}
      <div className="eb-result-meta">
        <span
          className={
            tone === 'review' ? 'eb-mini-status eb-warn' : 'eb-mini-status'
          }
        >
          {tone === 'review' ? (
            <Info aria-hidden="true" />
          ) : (
            <CheckCircle2 aria-hidden="true" />
          )}
          {demo
            ? '예시 자료로 계산'
            : validation.consecutiveCount >= 12
              ? '12개월 자료 확인 완료'
              : '자료 확인 필요'}
        </span>
        <span>{validation.periodLabel}</span>
      </div>

      <div className={`eb-result-card eb-${tone}`}>
        <div className="eb-result-primary">
          <div className="eb-result-symbol">
            <Symbol aria-hidden="true" />
          </div>
          <h1 id="eb-result-title" tabIndex={-1}>
            {toneTitle[tone]}
          </h1>
          <p className="eb-result-description">{decision.summary}</p>
          {annual && tone !== 'review' ? (
            <>
              <p className="eb-saving-label">
                {tone === 'change'
                  ? '연간 예상 절감액'
                  : '변경 시 연간 예상 증가액'}
              </p>
              <div className="eb-saving-amount">
                {formatManWon(Math.abs(comparison.savingWon))}
                <small>
                  만 원{tone === 'maintain' ? ' 증가' : ''}
                </small>
              </div>
              <p className="eb-saving-foot">
                {demo
                  ? '예시 자료 기준 추정 · 실제 계산 결과가 아닙니다'
                  : tone === 'change' && comparison.currentAnnualWon > 0
                    ? `현재안 대비 약 ${((Math.abs(comparison.savingWon) / comparison.currentAnnualWon) * 100).toFixed(1)}% 절감 추정`
                    : '동일한 자료와 계산 조건으로 비교한 결과입니다.'}
              </p>
            </>
          ) : (
            <p className="eb-saving-foot" style={{ marginTop: 20 }}>
              {decision.reasons[0] ?? diagnosis.judgementBasis}
            </p>
          )}
        </div>
        <div className="eb-result-secondary">
          <div className="eb-plan-line">
            <span>현재 요금제</span>
            <strong>{currentName}</strong>
          </div>
          <div className="eb-plan-line eb-recommend">
            <span>비교 요금제</span>
            <strong>{candidateName}</strong>
          </div>
          {annual ? (
            <>
              <p className="eb-compare-label">
                동일한 사용량으로 비교한 연간 예상 요금
              </p>
              <div>
                <div className="eb-cost-label">
                  <span>현재</span>
                  <strong>{formatWon(comparison.currentAnnualWon)}</strong>
                </div>
                <div className="eb-bar-track" aria-hidden="true">
                  <div
                    className="eb-bar-fill"
                    style={{ width: `${currentWidth}%` }}
                  />
                </div>
                <div className="eb-cost-label">
                  <span>비교안</span>
                  <strong>{formatWon(comparison.candidateAnnualWon)}</strong>
                </div>
                <div className="eb-bar-track" aria-hidden="true">
                  <div
                    className="eb-bar-fill eb-blue"
                    style={{ width: `${candidateWidth}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="eb-form-hint">
              연간 비교 금액을 산출할 수 없는 상태입니다.
            </p>
          )}
        </div>
      </div>

      <div className="eb-result-next">
        <div>
          <h2>{nextTitle}</h2>
          <p>{nextDescription}</p>
        </div>
        <div className="eb-result-next-actions">
          <button
            type="button"
            className="eb-btn eb-secondary"
            onClick={state.saveSummary}
          >
            <Download aria-hidden="true" />
            결과 요약 저장
          </button>
          {tone === 'change' && decision.canAct ? (
            <button
              type="button"
              className="eb-btn eb-primary"
              onClick={() => state.openDialog('prepareChange')}
            >
              변경 준비하기
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="eb-btn eb-primary"
              onClick={state.backToReview}
            >
              {tone === 'maintain'
                ? '입력 내용 확인'
                : '자료 확인으로 돌아가기'}
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="eb-decision-notice">
        <Info aria-hidden="true" />
        <span>
          학교 내부 검토용 추정입니다. 실제 신청 전에는 최신 단가와 계약조건을
          확인해 주세요.
          {expiresAt &&
            ` 저장된 자료는 ${new Date(expiresAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}에 자동 삭제됩니다.`}
        </span>
      </div>

      <details className="eb-result-details">
        <summary>
          계산 근거와 상세 비교 보기
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="eb-detail-content">
          <div className="eb-detail-grid">
            <section>
              <h3>이렇게 표시한 이유</h3>
              {decision.reasons.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
              <p>비교 기간: {validation.periodLabel}</p>
            </section>
            <section>
              <h3>신청 전에 확인할 내용</h3>
              {decision.cautions.map((caution) => (
                <p key={caution}>{caution}</p>
              ))}
              <p>자료 인식률을 추천 정확도처럼 표시하지 않습니다.</p>
            </section>
          </div>
          {diagnosis.topCandidates.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 13, margin: '0 0 10px' }}>
                후보 요금제 비교
              </h3>
              <PlanCandidateTable candidates={diagnosis.topCandidates} />
            </div>
          )}
        </div>
      </details>

      <div className="eb-result-extra">
        <button
          type="button"
          className="eb-text-btn"
          onClick={state.backToReview}
        >
          <ArrowLeft aria-hidden="true" />
          입력 내용 수정
        </button>
        <button
          type="button"
          className="eb-text-btn"
          onClick={() => state.openFeature('peak')}
        >
          <Activity aria-hidden="true" />
          피크관리로 추가 절감하기
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

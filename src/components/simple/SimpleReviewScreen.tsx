import { useMemo } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  HelpCircle,
  Info,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react'
import type { RatePlan } from '../../types'
import { normalizeRatePlanIdentityPart } from '../../lib/domainValidation'
import type { useSimpleDiagnosis } from './useSimpleDiagnosis'

type SimpleState = ReturnType<typeof useSimpleDiagnosis>

const sameIdentity = (left: string, right: string) =>
  normalizeRatePlanIdentityPart(left) === normalizeRatePlanIdentityPart(right)

const uniqueValues = (values: string[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    const normalized = normalizeRatePlanIdentityPart(value)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

export function SimpleReviewScreen({
  state,
  ratePlans,
}: {
  state: SimpleState
  ratePlans: RatePlan[]
}) {
  const { validation, profileDraft, demo } = state

  const contractTypes = useMemo(
    () => uniqueValues(ratePlans.map((plan) => plan.contractType)),
    [ratePlans],
  )
  const voltageTypes = useMemo(
    () =>
      uniqueValues(
        ratePlans
          .filter((plan) =>
            sameIdentity(plan.contractType, profileDraft.contractType),
          )
          .map((plan) => plan.voltageType),
      ),
    [ratePlans, profileDraft.contractType],
  )
  const planOptions = useMemo(
    () =>
      uniqueValues(
        ratePlans
          .filter(
            (plan) =>
              sameIdentity(plan.contractType, profileDraft.contractType) &&
              sameIdentity(plan.voltageType, profileDraft.voltageType),
          )
          .map((plan) => plan.planName),
      ),
    [ratePlans, profileDraft.contractType, profileDraft.voltageType],
  )

  const bad = (rowId: string, field: string) =>
    validation.badCells.has(`${rowId}:${field}`)

  return (
    <section className="eb-screen" aria-labelledby="eb-review-title">
      {demo && (
        <div className="eb-demo-bar">
          <span>
            <strong>화면 체험 중</strong> · 실제 고지서가 아닌 예시 자료입니다.
          </span>
          <button type="button" onClick={state.requestHome}>
            내 자료로 시작
          </button>
        </div>
      )}
      <div className="eb-view-heading">
        <div>
          <h1 id="eb-review-title" tabIndex={-1}>
            잘 읽었는지,
            <br />
            한 번만 확인해 주세요.
          </h1>
          <p>숫자가 다르면 바로 고치고, 고지서의 계약정보를 확인해 주세요.</p>
        </div>
        <button
          type="button"
          className="eb-btn eb-secondary eb-small"
          onClick={state.exportCsv}
        >
          <Download aria-hidden="true" />
          입력 자료 저장
        </button>
      </div>

      <div className="eb-review-layout">
        <div>
          <section className="eb-panel" aria-labelledby="eb-monthly-heading">
            <div className="eb-panel-header">
              <h2 id="eb-monthly-heading">월별 전기요금</h2>
              <span className="eb-source-label">{state.sourceLabel}</span>
            </div>
            <div
              className={
                validation.ok && !state.applyError
                  ? 'eb-validation'
                  : 'eb-validation eb-invalid'
              }
              role="status"
            >
              {state.applyError ? (
                state.applyError
              ) : validation.ok ? (
                <>
                  <CheckCircle2
                    aria-hidden="true"
                    style={{ width: 15, height: 15, verticalAlign: -2 }}
                  />
                  {' '}
                  <strong>
                    연속 {validation.consecutiveCount}개월을 확인했어요.
                  </strong>
                  {' '}
                  {validation.periodLabel}
                  {state.rows.length > 12 && (
                    <>
                      <br />
                      전체 {state.rows.length}개월 중 최근 12개월을 비교해요.
                    </>
                  )}
                </>
              ) : (
                <>
                  {validation.issues.map((issue) => (
                    <span key={issue}>
                      {issue}
                      <br />
                    </span>
                  ))}
                  {validation.missingMonths.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        state.fillMissing(validation.missingMonths)
                      }
                    >
                      빠진 월의 입력칸 추가하기
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="eb-table-scroll">
              <table>
                <caption className="eb-sr-only">
                  월별 사용량과 총 전기요금. 각 입력칸에서 수정할 수 있습니다.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">사용 월</th>
                    <th scope="col">
                      사용량 <span>(kWh)</span>
                    </th>
                    <th scope="col">
                      총 전기요금 <span>(원)</span>
                    </th>
                    <th scope="col">
                      <span className="eb-sr-only">행 삭제</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="text"
                          inputMode="text"
                          autoComplete="off"
                          maxLength={7}
                          placeholder="YYYY-MM"
                          data-field="month"
                          value={row.yearMonth}
                          aria-label={`${index + 1}행 사용 월`}
                          className={
                            bad(row.id, 'yearMonth') ? 'eb-invalid-cell' : ''
                          }
                          onChange={(event) =>
                            state.updateCell(
                              row.id,
                              'yearMonth',
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          inputMode="decimal"
                          value={row.usageKwh}
                          placeholder="0"
                          aria-label={`${index + 1}행 사용량 kWh`}
                          className={
                            bad(row.id, 'usageKwh') ? 'eb-invalid-cell' : ''
                          }
                          onChange={(event) =>
                            state.updateCell(
                              row.id,
                              'usageKwh',
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          inputMode="numeric"
                          value={row.totalBillWon}
                          placeholder="0"
                          aria-label={`${index + 1}행 총 전기요금 원`}
                          className={
                            bad(row.id, 'totalBillWon')
                              ? 'eb-invalid-cell'
                              : ''
                          }
                          onChange={(event) =>
                            state.updateCell(
                              row.id,
                              'totalBillWon',
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="eb-row-remove"
                          aria-label={`${index + 1}행 삭제`}
                          onClick={() => state.removeRow(row.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="eb-table-bottom">
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  type="button"
                  className="eb-text-btn"
                  onClick={state.addRow}
                >
                  <Plus aria-hidden="true" />
                  월 추가
                </button>
                {state.removedRow && (
                  <button
                    type="button"
                    className="eb-text-btn"
                    onClick={state.undoRemoveRow}
                  >
                    <Undo2 aria-hidden="true" />
                    삭제 되돌리기
                  </button>
                )}
              </span>
              <span className="eb-table-tip">
                금액을 누르면 바로 수정할 수 있어요.
              </span>
            </div>
          </section>
          <div className="eb-compact-note">
            <Info aria-hidden="true" />
            <span>
              최근 연속 12개월을 기준으로 비교해요. 빠진 월과 중복된 월은 먼저
              확인해 주세요.
            </span>
          </div>
        </div>

        <section
          className="eb-panel eb-contract-panel eb-sticky"
          aria-labelledby="eb-contract-heading"
        >
          <h2 id="eb-contract-heading">마지막으로, 계약정보</h2>
          <p className="eb-subcopy">
            고지서에 적힌 네 가지만 확인해 주세요.
          </p>
          <div className="eb-contract-fields">
            <div className="eb-field">
              <span className="eb-field-top">
                계약종별
                <button
                  type="button"
                  className="eb-field-help"
                  aria-label="계약종별은 어디에 있나요?"
                  onClick={() => state.openFieldHelp('contract')}
                >
                  <HelpCircle aria-hidden="true" />
                </button>
              </span>
              <select
                aria-label="계약종별"
                value={profileDraft.contractType}
                onChange={(event) =>
                  state.updateProfileDraft({
                    contractType: event.target.value,
                    voltageType: '',
                    currentPlan: '',
                  })
                }
              >
                <option value="">선택해 주세요</option>
                {contractTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="eb-field">
              <span className="eb-field-top">
                수전전압
                <button
                  type="button"
                  className="eb-field-help"
                  aria-label="수전전압은 어디에 있나요?"
                  onClick={() => state.openFieldHelp('voltage')}
                >
                  <HelpCircle aria-hidden="true" />
                </button>
              </span>
              <select
                aria-label="수전전압"
                value={profileDraft.voltageType}
                disabled={!profileDraft.contractType}
                onChange={(event) =>
                  state.updateProfileDraft({
                    voltageType: event.target.value,
                    currentPlan: '',
                  })
                }
              >
                <option value="">
                  {profileDraft.contractType
                    ? '선택해 주세요'
                    : '먼저 계약종별을 선택해 주세요'}
                </option>
                {voltageTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="eb-field">
              <span className="eb-field-top">
                지금 사용 중인 요금제
                <button
                  type="button"
                  className="eb-field-help"
                  aria-label="현재 요금제는 어디에 있나요?"
                  onClick={() => state.openFieldHelp('plan')}
                >
                  <HelpCircle aria-hidden="true" />
                </button>
              </span>
              <select
                aria-label="지금 사용 중인 요금제"
                value={profileDraft.currentPlan}
                disabled={!profileDraft.voltageType}
                onChange={(event) =>
                  state.updateProfileDraft({ currentPlan: event.target.value })
                }
              >
                <option value="">
                  {profileDraft.voltageType
                    ? '선택해 주세요'
                    : '먼저 수전전압을 선택해 주세요'}
                </option>
                {planOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="eb-field">
              <span className="eb-field-top">
                요금적용전력
                <button
                  type="button"
                  className="eb-field-help"
                  aria-label="요금적용전력은 어디에 있나요?"
                  onClick={() => state.openFieldHelp('power')}
                >
                  <HelpCircle aria-hidden="true" />
                </button>
              </span>
              <span className="eb-power-input">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="고지서의 숫자 입력"
                  aria-label="요금적용전력 kW"
                  value={profileDraft.appliedPowerKw}
                  onChange={(event) =>
                    state.updateProfileDraft({
                      appliedPowerKw: event.target.value,
                    })
                  }
                />
                <span>kW</span>
              </span>
              <small>계약전력과 다른 항목이에요.</small>
            </div>
          </div>
          <label className="eb-confirm-box">
            <input
              type="checkbox"
              checked={state.profileConfirmed}
              onChange={(event) =>
                state.setProfileConfirmed(event.target.checked)
              }
            />
            <span>위 계약정보를 고지서와 대조했어요.</span>
          </label>
          <button
            type="button"
            className="eb-btn eb-primary eb-wide"
            disabled={!state.canAnalyze}
            onClick={() => void state.analyze()}
          >
            요금제 비교하기
            <ArrowRight aria-hidden="true" />
          </button>
          <p className="eb-form-hint">
            {state.profileIssue ??
              (validation.ok
                ? state.profileConfirmed
                  ? ''
                  : '계약정보를 고지서와 대조했다고 체크해 주세요.'
                : '자료와 계약정보를 확인하면 비교할 수 있어요.')}
          </p>
        </section>
      </div>
      <div className="eb-review-bottom">
        <button
          type="button"
          className="eb-text-btn"
          onClick={state.backToStart}
        >
          <ArrowLeft aria-hidden="true" />
          자료 선택으로 돌아가기
        </button>
      </div>
    </section>
  )
}

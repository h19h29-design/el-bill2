import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  AutoDiagnosisResult,
  BillDataOrigin,
  CalculationSettings,
  MonthlyBill,
  PeakScenario,
  RatePlan,
  SchoolProfile,
  ViewKey,
} from '../../types'
import { isUserBillOrigin } from '../../lib/dataProvenance'
import { buildAutoDiagnosis, findExactRatePlan } from '../../lib/diagnosis'
import { buildEasyDiagnosisDecision } from '../../lib/easyDiagnosis'
import {
  addDraftRow,
  buildCandidateFromDraft,
  buildDraftCsv,
  createDraftRowsFromBills,
  createEmptyDraftRows,
  expandYearMonthColumn,
  fillMissingDraftMonths,
  removeDraftRow,
  updateDraftRowCell,
  validateSimpleDraftRows,
  type SimpleDraftField,
  type SimpleDraftRow,
} from '../../lib/simpleDiagnosis'
import type { BillInputCandidate } from '../bills/BillInputPreview'
import type { EasyDiagnosisApplyInput } from '../easyDiagnosis/EasyDiagnosisWizard'

export type SimpleStep = 'start' | 'review' | 'result'
export type SimpleDialog =
  | 'guide'
  | 'prepare'
  | 'privacy'
  | 'about'
  | 'otherInput'
  | 'paste'
  | 'tools'
  | 'prepareChange'
  | 'resetConfirm'
  | 'fieldHelp'

export interface SimpleProfileDraft {
  contractType: string
  voltageType: string
  currentPlan: string
  appliedPowerKw: string
}

const emptyProfileDraft = (): SimpleProfileDraft => ({
  contractType: '',
  voltageType: '',
  currentPlan: '',
  appliedPowerKw: '',
})

const profileDraftFrom = (profile: SchoolProfile): SimpleProfileDraft => ({
  contractType: profile.contractType,
  voltageType: profile.voltageType,
  currentPlan: profile.currentPlan,
  appliedPowerKw:
    profile.appliedPowerKw > 0 ? String(profile.appliedPowerKw) : '',
})

const saveBlob = (
  name: string,
  text: string,
  type = 'text/plain;charset=utf-8',
) => {
  const blob = new Blob(['\uFEFF', text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const formatWon = (value: number) =>
  `${Math.round(value).toLocaleString('ko-KR')}원`

export interface SimpleDiagnosisParams {
  profile: SchoolProfile
  ratePlans: RatePlan[]
  scenario: PeakScenario
  calculationSettings: CalculationSettings
  billsOrigin: BillDataOrigin
  appliedDiagnosis: AutoDiagnosisResult
  sampleBills: MonthlyBill[]
  sampleProfile: SchoolProfile
  onApply: (input: EasyDiagnosisApplyInput) => Promise<boolean>
  onOpenFeature: (view: ViewKey) => void
}
export function useSimpleDiagnosis({
  profile,
  ratePlans,
  scenario,
  calculationSettings,
  billsOrigin,
  appliedDiagnosis,
  sampleBills,
  sampleProfile,
  onApply,
  onOpenFeature,
}: SimpleDiagnosisParams) {
  const [step, setStep] = useState<SimpleStep>('start')
  const [landing, setLanding] = useState(true)
  const [rows, setRows] = useState<SimpleDraftRow[]>([])
  const [origin, setOrigin] = useState<
    Exclude<BillDataOrigin, 'sample'> | 'none'
  >('none')
  const [sourceLabel, setSourceLabel] = useState('')
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [dialog, setDialog] = useState<SimpleDialog | null>(null)
  const [fieldHelpKey, setFieldHelpKey] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [profileDraft, setProfileDraft] =
    useState<SimpleProfileDraft>(emptyProfileDraft)
  const [profileConfirmed, setProfileConfirmed] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState('')
  const [applyError, setApplyError] = useState('')
  const [demoDiagnosis, setDemoDiagnosis] =
    useState<AutoDiagnosisResult | null>(null)
  const [removedRow, setRemovedRow] = useState<SimpleDraftRow | null>(null)
  const removedIndexRef = useRef(0)
  const operationRef = useRef(0)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 3800)
  }, [])

  const resetAll = useCallback(() => {
    operationRef.current += 1
    setStep('start')
    setLanding(true)
    setRows([])
    setOrigin('none')
    setSourceLabel('')
    setDemo(false)
    setDemoDiagnosis(null)
    setBusy(false)
    setImportMessage('')
    setDialog(null)
    setProfileDraft(emptyProfileDraft())
    setProfileConfirmed(false)
    setPasteText('')
    setPasteError('')
    setApplyError('')
    setRemovedRow(null)
  }, [])

  const requestHome = useCallback(() => {
    if (rows.length && !demo) {
      setDialog('resetConfirm')
    } else {
      resetAll()
    }
  }, [rows.length, demo, resetAll])

  const enterReview = useCallback(
    (
      nextRows: SimpleDraftRow[],
      nextOrigin: Exclude<BillDataOrigin, 'sample'>,
      label: string,
      isDemo = false,
    ) => {
      setRows(nextRows)
      setOrigin(nextOrigin)
      setSourceLabel(label)
      setDemo(isDemo)
      setRemovedRow(null)
      setApplyError('')
      if (isDemo) {
        setProfileDraft(profileDraftFrom(sampleProfile))
      } else if (isUserBillOrigin(billsOrigin)) {
        setProfileDraft(profileDraftFrom(profile))
      } else {
        setProfileDraft(emptyProfileDraft())
      }
      setProfileConfirmed(false)
      setDialog(null)
      setImportMessage('')
      setStep('review')
    },
    [billsOrigin, profile, sampleProfile],
  )

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || busy) return
      const op = ++operationRef.current
      const fail = (message: string) => {
        if (op === operationRef.current) setImportMessage(message)
      }
      try {
        if (files.length > 36) {
          fail('고지서는 한 번에 최대 36개까지 선택해 주세요.')
          return
        }
        const extensions = files.map((file) =>
          (file.name.split('.').pop() ?? '').toLowerCase(),
        )
        const allPdf = extensions.every((ext) => ext === 'pdf')
        const singleTable =
          files.length === 1 &&
          ['xlsx', 'xls', 'csv'].includes(extensions[0])
        if (!allPdf && !singleTable) {
          fail(
            files.length > 1
              ? 'PDF는 여러 개를 함께 올릴 수 있어요. 엑셀·CSV는 한 번에 한 파일을 선택하거나, PDF만 따로 올려 주세요.'
              : 'PDF, XLSX, 파워플래너 XLS 또는 CSV 파일을 선택해 주세요.',
          )
          return
        }
        setBusy(true)
        setImportMessage('선택한 자료를 브라우저에서 읽고 있어요.')
        let bills: MonthlyBill[] = []
        let diagnostics: string[] = []
        if (allPdf) {
          const { parseBillPdfFiles } = await import('../../lib/billPdf')
          const result = await parseBillPdfFiles(files)
          bills = result.autoRows
          diagnostics = result.diagnostics
        } else {
          const { parseWorkbook, validateUploadFile, mapRowsToBills } =
            await import('../../lib/excel')
          const { findBestBillSheet, buildBillColumnMapping } = await import(
            '../../lib/billInput',
          )
          const file = files[0]
          const fileMessage = validateUploadFile(file)
          if (fileMessage) {
            fail(fileMessage)
            return
          }
          const result = await parseWorkbook(file)
          diagnostics = result.diagnostics
          const bestSheet = findBestBillSheet(result.sheets)
          const initialMapping = buildBillColumnMapping(
            bestSheet?.headers ?? [],
          )
          bills = result.autoRows.length
            ? result.autoRows
            : bestSheet
              ? mapRowsToBills(bestSheet.rows, initialMapping)
              : []
        }
        if (op !== operationRef.current) return
        if (!bills.length) {
          fail(
            [
              '자료에서 월별 사용량과 총 전기요금을 찾지 못했어요.',
              ...diagnostics.slice(0, 2),
              '파일 없이 입력하기에서 표를 붙여 넣거나 직접 입력할 수 있어요.',
            ].join(' '),
          )
          return
        }
        const label = allPdf
          ? files.length === 1
            ? files[0].name
            : `고지서 PDF ${files.length}개`
          : files[0].name
        enterReview(createDraftRowsFromBills(bills), 'uploaded', label)
        toast(`${bills.length}개월을 인식했어요. 내용을 확인해 주세요.`)
      } catch (error) {
        if (op === operationRef.current) {
          fail(
            error instanceof Error
              ? error.message
              : '파일을 읽지 못했어요. 표 붙여넣기로 다시 시도해 주세요.',
          )
        }
      } finally {
        if (op === operationRef.current) setBusy(false)
      }
    },
    [busy, enterReview, toast],
  )

  const applyPaste = useCallback(async () => {
    setPasteError('')
    try {
      const { parsePastedBillSheet, buildBillColumnMapping } = await import(
        '../../lib/billInput',
      )
      const { mapRowsToBills } = await import('../../lib/excel')
      const sheet = parsePastedBillSheet(pasteText)
      const expanded = expandYearMonthColumn(sheet)
      const mapping = buildBillColumnMapping(expanded.headers)
      const bills = mapRowsToBills(expanded.rows, mapping)
      if (!bills.length) {
        setPasteError(
          '표에서 연월·사용량·총 전기요금을 찾지 못했어요. 제목 행을 포함해 복사했는지 확인해 주세요.',
        )
        return
      }
      setPasteText('')
      enterReview(createDraftRowsFromBills(bills), 'pasted', '붙여넣은 표')
    } catch (error) {
      setPasteError(
        error instanceof Error
          ? error.message
          : '붙여넣은 표를 읽지 못했어요.',
      )
    }
  }, [pasteText, enterReview])

  const startManual = useCallback(() => {
    setDialog(null)
    enterReview(createEmptyDraftRows(12), 'manual', '직접 입력')
  }, [enterReview])

  const startDemo = useCallback(() => {
    setDialog(null)
    enterReview(createDraftRowsFromBills(sampleBills), 'manual', '예시 자료', true)
  }, [enterReview, sampleBills])

  const openDialog = useCallback((next: SimpleDialog) => {
    setPasteError('')
    setDialog(next)
  }, [])

  const closeDialog = useCallback(() => setDialog(null), [])

  const openFieldHelp = useCallback((key: string) => {
    setFieldHelpKey(key)
    setDialog('fieldHelp')
  }, [])

  const updateCell = useCallback(
    (rowId: string, field: SimpleDraftField, value: string) => {
      setRows((latest) => updateDraftRowCell(latest, rowId, field, value))
      setApplyError('')
    },
    [],
  )

  const removeRow = useCallback((rowId: string) => {
    setRows((latest) => {
      const index = latest.findIndex((row) => row.id === rowId)
      removedIndexRef.current = index < 0 ? 0 : index
      setRemovedRow(index < 0 ? null : latest[index])
      return removeDraftRow(latest, rowId)
    })
    setApplyError('')
  }, [])

  const undoRemoveRow = useCallback(() => {
    setRemovedRow((latest) => {
      if (latest) {
        setRows((current) => {
          const next = [...current]
          next.splice(
            Math.min(removedIndexRef.current, next.length),
            0,
            latest,
          )
          return next
        })
      }
      return null
    })
  }, [])

  const addRow = useCallback(() => {
    setRows((latest) => addDraftRow(latest))
    setRemovedRow(null)
    setApplyError('')
  }, [])

  const fillMissing = useCallback(
    (missingMonths: string[]) => {
      setRows((latest) => fillMissingDraftMonths(latest, missingMonths))
      setApplyError('')
      toast('빠진 월을 추가했어요. 사용량과 요금을 입력해 주세요.')
    },
    [toast],
  )

  const updateProfileDraft = useCallback(
    (patch: Partial<SimpleProfileDraft>) => {
      setProfileDraft((latest) => ({ ...latest, ...patch }))
      setProfileConfirmed(false)
      setApplyError('')
    },
    [],
  )

  const validation = useMemo(
    () =>
      validateSimpleDraftRows(
        rows,
        origin === 'none' ? 'manual' : origin,
      ),
    [rows, origin],
  )

  const draftProfile = useMemo<SchoolProfile>(() => {
    const power = Number(profileDraft.appliedPowerKw)
    return {
      ...profile,
      contractType: profileDraft.contractType,
      voltageType: profileDraft.voltageType,
      currentPlan: profileDraft.currentPlan,
      appliedPowerKw: Number.isFinite(power) ? power : 0,
    }
  }, [profile, profileDraft])

  const profileIssue = useMemo(() => {
    if (
      !profileDraft.contractType ||
      !profileDraft.voltageType ||
      !profileDraft.currentPlan
    ) {
      return '계약종별, 수전전압, 현재 요금제를 고지서에서 확인해 선택해 주세요.'
    }
    if (!(Number(profileDraft.appliedPowerKw) > 0)) {
      return '요금적용전력은 0보다 큰 값으로 입력해 주세요.'
    }
    if (!findExactRatePlan(draftProfile, ratePlans)) {
      return '계약종별, 수전전압, 현재 요금제와 일치하는 학교용 요금제를 선택해 주세요.'
    }
    return null
  }, [profileDraft, draftProfile, ratePlans])

  const canAnalyze =
    rows.length > 0 &&
    validation.badCells.size === 0 &&
    validation.consecutiveCount >= 12 &&
    !profileIssue &&
    profileConfirmed &&
    !busy

  const analyze = useCallback(async () => {
    if (!canAnalyze) return
    const op = ++operationRef.current
    setBusy(true)
    setApplyError('')
    try {
      if (demo) {
        const result = buildAutoDiagnosis({
          bills: sampleBills,
          profile: {
            ...sampleProfile,
            contractType:
              draftProfile.contractType || sampleProfile.contractType,
            voltageType:
              draftProfile.voltageType || sampleProfile.voltageType,
            currentPlan:
              draftProfile.currentPlan || sampleProfile.currentPlan,
            appliedPowerKw:
              draftProfile.appliedPowerKw || sampleProfile.appliedPowerKw,
          },
          ratePlans,
          scenario,
          powerPlannerDataSource: null,
          billsAreUserUploaded: false,
          calculationSettings,
        })
        if (op !== operationRef.current) return
        setDemoDiagnosis(result)
        setStep('result')
        return
      }
      const candidate: BillInputCandidate = buildCandidateFromDraft(
        rows,
        origin === 'none'
          ? 'manual'
          : (origin as Exclude<BillDataOrigin, 'sample'>),
        sourceLabel,
      )
      const ok = await onApply({ candidate, profile: draftProfile })
      if (op !== operationRef.current) return
      if (!ok) {
        setApplyError(
          '자료를 저장하지 못했어요. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.',
        )
        return
      }
      setStep('result')
    } finally {
      if (op === operationRef.current) setBusy(false)
    }
  }, [
    canAnalyze,
    demo,
    sampleBills,
    sampleProfile,
    draftProfile,
    ratePlans,
    scenario,
    calculationSettings,
    rows,
    origin,
    sourceLabel,
    onApply,
  ])

  const exportCsv = useCallback(() => {
    saveBlob('el-bill-input.csv', buildDraftCsv(rows), 'text/csv;charset=utf-8')
    toast('입력한 자료를 CSV로 저장했어요.')
  }, [rows, toast])

  const downloadTemplate = useCallback(async () => {
    const { createStandardBillCsv } = await import('../../lib/billInput')
    saveBlob(
      'el-bill-empty-template.csv',
      createStandardBillCsv(),
      'text/csv;charset=utf-8',
    )
    toast('빈 CSV 양식을 저장했어요.')
  }, [toast])

  const diagnosis = demo ? demoDiagnosis : appliedDiagnosis
  const decision = useMemo(
    () =>
      diagnosis
        ? buildEasyDiagnosisDecision(diagnosis, {
            bills: demo ? 'manual' : billsOrigin,
            powerPlanner: 'none',
          })
        : null,
    [diagnosis, demo, billsOrigin],
  )

  const saveSummary = useCallback(() => {
    if (!diagnosis || !decision) return
    const comparison = diagnosis.comparison
    const lines = [
      demo
        ? '[화면 예시 — 실제 계산·계약 변경에 사용 금지]'
        : '[EL BILL 검토용 요약]',
      decision.command,
      '자료 기간: ' + validation.periodLabel,
      '현재 요금제: ' + (diagnosis.currentPlan?.planName ?? '확인 필요'),
      '비교 요금제: ' + (diagnosis.recommendedPlan?.planName ?? '판단 보류'),
      comparison.annualDataAvailable
        ? '현재안: ' + formatWon(comparison.currentAnnualWon)
        : '현재안: 산출하지 않음',
      comparison.annualDataAvailable
        ? '비교안: ' + formatWon(comparison.candidateAnnualWon)
        : '비교안: 산출하지 않음',
      comparison.annualDataAvailable
        ? '현재안 - 비교안: ' + formatWon(comparison.savingWon)
        : '절감액: 판단 보류',
      ...decision.reasons,
      '실제 신청 전 최신 단가와 계약조건을 확인하세요.',
    ]
    saveBlob(
      'el-bill-' + (demo ? 'example-' : '') + 'summary.txt',
      lines.join('\r\n'),
    )
    toast('검토용 텍스트 요약을 저장했어요.')
  }, [diagnosis, decision, demo, validation.periodLabel, toast])

  const saveChecklist = useCallback(() => {
    const text =
      'EL BILL 변경 준비 체크리스트\r\n' +
      (demo
        ? '[화면 예시 · 공식 신청서가 아닙니다]\r\n'
        : '[담당자 검토용 · 공식 신청서가 아닙니다]\r\n') +
      '□ 고지서와 현재 계약정보 대조\r\n' +
      '□ 최신 단가와 적용 가능 요금제 확인\r\n' +
      '□ 변경 가능 시점 확인\r\n' +
      '□ 필요 첨부서류 실제 준비\r\n' +
      '□ 내부 결재 및 담당자 검토\r\n' +
      '□ 한전의 실제 신청 절차 진행\r\n' +
      '이 파일을 저장해도 요금제는 변경되지 않습니다.'
    saveBlob('el-bill-change-review-checklist.txt', text)
    toast('준비 체크리스트를 저장했어요.')
  }, [demo, toast])

  const openFeature = useCallback(
    (view: ViewKey) => {
      setDialog(null)
      onOpenFeature(view)
    },
    [onOpenFeature],
  )

  const backToReview = useCallback(() => setStep('review'), [])
  const backToStart = useCallback(() => setStep('start'), [])

  // The energy landing is a visual layer over the start step only.
  // Dismissing it never clears in-progress rows or the current step.
  const dismissLanding = useCallback(() => setLanding(false), [])

  return {
    step,
    setStep,
    landing,
    dismissLanding,
    rows,
    origin,
    sourceLabel,
    demo,
    busy,
    importMessage,
    setImportMessage,
    dialog,
    openDialog,
    closeDialog,
    fieldHelpKey,
    openFieldHelp,
    toastMessage,
    toast,
    profileDraft,
    updateProfileDraft,
    profileConfirmed,
    setProfileConfirmed,
    profileIssue,
    draftProfile,
    pasteText,
    setPasteText,
    pasteError,
    applyPaste,
    applyError,
    validation,
    canAnalyze,
    analyze,
    updateCell,
    removeRow,
    undoRemoveRow,
    removedRow,
    addRow,
    fillMissing,
    importFiles,
    startManual,
    startDemo,
    exportCsv,
    downloadTemplate,
    diagnosis,
    decision,
    saveSummary,
    saveChecklist,
    openFeature,
    requestHome,
    resetAll,
    backToReview,
    backToStart,
  }
}

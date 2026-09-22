import type { BillInputCandidate } from '../components/bills/BillInputPreview'
import type { BillDataOrigin, MonthlyBill } from '../types'
import { getObservedBillFields } from '../types'
import { parseStrictCalendarValue } from './calendar'
import {
  parseBillNumericValue,
  validateBillRequiredValues,
} from './domainValidation'
import { buildEasyDiagnosisReview } from './easyDiagnosis'
import type { ParsedSheet } from './excel'

export type SimpleDraftField = 'yearMonth' | 'usageKwh' | 'totalBillWon'

export interface SimpleDraftRow {
  id: string
  yearMonth: string
  usageKwh: string
  totalBillWon: string
  bill: MonthlyBill | null
}

let draftRowSequence = 0

export const resetSimpleDraftRowSequence = () => {
  draftRowSequence = 0
}

const nextDraftRowId = () => `simple-draft-${(draftRowSequence += 1)}`

export const formatDraftYearMonth = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`

const monthIndexOf = (year: number, month: number) => year * 12 + month - 1

const yearMonthOfIndex = (index: number) => ({
  year: Math.floor(index / 12),
  month: (index % 12) + 1,
})

export const createDraftRowsFromBills = (
  bills: MonthlyBill[],
): SimpleDraftRow[] =>
  bills.map((bill) => ({
    id: bill.id,
    yearMonth: formatDraftYearMonth(bill.year, bill.month),
    usageKwh: String(bill.usageKwh),
    totalBillWon: String(bill.totalBillWon),
    bill,
  }))

export const createEmptyDraftRows = (count = 12): SimpleDraftRow[] => {
  const now = new Date()
  const lastIndex = monthIndexOf(now.getFullYear(), now.getMonth()) - 1
  return Array.from({ length: count }, (_, index) => {
    const period = yearMonthOfIndex(lastIndex - (count - 1 - index))
    return {
      id: nextDraftRowId(),
      yearMonth: formatDraftYearMonth(period.year, period.month),
      usageKwh: '',
      totalBillWon: '',
      bill: null,
    }
  })
}

export const updateDraftRowCell = (
  rows: SimpleDraftRow[],
  rowId: string,
  field: SimpleDraftField,
  value: string,
): SimpleDraftRow[] =>
  rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))

export const removeDraftRow = (
  rows: SimpleDraftRow[],
  rowId: string,
): SimpleDraftRow[] => rows.filter((row) => row.id !== rowId)

export const addDraftRow = (rows: SimpleDraftRow[]): SimpleDraftRow[] => {
  const validIndexes = rows
    .map((row) => parseStrictCalendarValue(row.yearMonth))
    .filter((period) => period !== null)
    .map((period) => monthIndexOf(period.year, period.month))
  const nextIndex = validIndexes.length
    ? Math.max(...validIndexes) + 1
    : monthIndexOf(new Date().getFullYear(), new Date().getMonth()) - 1
  const period = yearMonthOfIndex(nextIndex)
  return [
    ...rows,
    {
      id: nextDraftRowId(),
      yearMonth: formatDraftYearMonth(period.year, period.month),
      usageKwh: '',
      totalBillWon: '',
      bill: null,
    },
  ]
}

interface DraftNumericValue {
  state: 'empty' | 'invalid' | 'ok'
  value: number
}

const parseDraftNumeric = (raw: string): DraftNumericValue => {
  const trimmed = raw.trim()
  if (!trimmed) return { state: 'empty', value: 0 }
  const value = parseBillNumericValue(trimmed)
  if (!Number.isFinite(value) || value <= 0) return { state: 'invalid', value }
  return { state: 'ok', value }
}

const draftRowToBill = (row: SimpleDraftRow): MonthlyBill => {
  const period = parseStrictCalendarValue(row.yearMonth)
  const usage = parseDraftNumeric(row.usageKwh)
  const total = parseDraftNumeric(row.totalBillWon)
  const source = row.bill
  return {
    id: source?.id ?? row.id,
    year: period?.year ?? 0,
    month: period?.month ?? 0,
    usageKwh: usage.value,
    totalBillWon: total.value,
    baseChargeWon: source?.baseChargeWon ?? 0,
    energyChargeWon: source?.energyChargeWon ?? 0,
    appliedPowerKw: source?.appliedPowerKw ?? 0,
    maxDemandKw: source?.maxDemandKw ?? 0,
    powerFactorChargeWon: source?.powerFactorChargeWon ?? 0,
    climateChargeWon: source?.climateChargeWon ?? 0,
    fuelAdjustmentWon: source?.fuelAdjustmentWon ?? 0,
    vatWon: source?.vatWon ?? 0,
    fundWon: source?.fundWon ?? 0,
    note: source?.note ?? '간편 입력 자료',
    observedFields: source
      ? Array.from(
          new Set([
            ...getObservedBillFields(source),
            'year' as const,
            'month' as const,
            'usageKwh' as const,
            'totalBillWon' as const,
          ]),
        )
      : ['year', 'month', 'usageKwh', 'totalBillWon'],
  }
}

export const draftRowsToBills = (rows: SimpleDraftRow[]): MonthlyBill[] =>
  rows.map(draftRowToBill)

export interface SimpleDraftValidation {
  bills: MonthlyBill[]
  badCells: Set<string>
  issues: string[]
  missingMonths: string[]
  periodLabel: string
  consecutiveCount: number
  ok: boolean
}

const checkDraftField = (
  period: { year: number; month: number } | null,
  overrides: Partial<{
    year: number
    month: number
    usageKwh: number
    totalBillWon: number
  }>,
) =>
  validateBillRequiredValues({
    year: period?.year ?? 2000,
    month: period?.month ?? 1,
    usageKwh: 1,
    totalBillWon: 1,
    ...overrides,
  }).valid

export const validateSimpleDraftRows = (
  rows: SimpleDraftRow[],
  origin: Exclude<BillDataOrigin, 'sample'> = 'manual',
): SimpleDraftValidation => {
  const badCells = new Set<string>()
  const bills = draftRowsToBills(rows)
  const seenPeriods = new Map<number, string>()
  let numericIssueCount = 0
  let emptyCellCount = 0

  rows.forEach((row) => {
    const period = parseStrictCalendarValue(row.yearMonth)
    if (!period) {
      badCells.add(`${row.id}:yearMonth`)
    } else {
      const indexOfPeriod = monthIndexOf(period.year, period.month)
      const firstRowId = seenPeriods.get(indexOfPeriod)
      if (firstRowId) {
        badCells.add(`${row.id}:yearMonth`)
        badCells.add(`${firstRowId}:yearMonth`)
      } else {
        seenPeriods.set(indexOfPeriod, row.id)
      }
    }

    const usage = parseDraftNumeric(row.usageKwh)
    const total = parseDraftNumeric(row.totalBillWon)
    if (usage.state === 'empty') emptyCellCount += 1
    if (
      usage.state !== 'ok' ||
      !checkDraftField(period, { usageKwh: usage.value })
    ) {
      badCells.add(`${row.id}:usageKwh`)
      if (usage.state === 'invalid') numericIssueCount += 1
    }
    if (total.state === 'empty') emptyCellCount += 1
    if (
      total.state !== 'ok' ||
      !checkDraftField(period, { totalBillWon: total.value })
    ) {
      badCells.add(`${row.id}:totalBillWon`)
      if (total.state === 'invalid') numericIssueCount += 1
    }
  })

  const review = buildEasyDiagnosisReview({
    origin,
    bills,
    sourceLabel: '',
  })

  const issues = [...review.issues]
  if (numericIssueCount > 0) {
    issues.push(
      `사용량 또는 총 전기요금 ${numericIssueCount.toLocaleString('ko-KR')}칸을 확인해 주세요.`,
    )
  }
  if (emptyCellCount > 0) {
    issues.push(
      `비어 있는 입력칸 ${emptyCellCount.toLocaleString('ko-KR')}개를 채워 주세요.`,
    )
  }

  const validIndexes = [...seenPeriods.keys()].sort((a, b) => a - b)
  const missingMonths: string[] = []
  if (validIndexes.length > 1) {
    const first = validIndexes[0]
    const last = validIndexes[validIndexes.length - 1]
    const seen = new Set(validIndexes)
    for (let index = first; index <= last; index += 1) {
      if (!seen.has(index)) {
        const period = yearMonthOfIndex(index)
        missingMonths.push(formatDraftYearMonth(period.year, period.month))
      }
    }
  }

  return {
    bills,
    badCells,
    issues,
    missingMonths,
    periodLabel: review.periodLabel,
    consecutiveCount: review.consecutiveMonthCount,
    ok: review.canContinue && badCells.size === 0,
  }
}

export const fillMissingDraftMonths = (
  rows: SimpleDraftRow[],
  missingMonths: string[],
): SimpleDraftRow[] => {
  if (!missingMonths.length) return rows
  const additions = missingMonths.map((yearMonth) => ({
    id: nextDraftRowId(),
    yearMonth,
    usageKwh: '',
    totalBillWon: '',
    bill: null,
  }))
  return [...rows, ...additions].sort((left, right) => {
    const leftPeriod = parseStrictCalendarValue(left.yearMonth)
    const rightPeriod = parseStrictCalendarValue(right.yearMonth)
    const leftIndex = leftPeriod
      ? monthIndexOf(leftPeriod.year, leftPeriod.month)
      : Number.MAX_SAFE_INTEGER
    const rightIndex = rightPeriod
      ? monthIndexOf(rightPeriod.year, rightPeriod.month)
      : Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })
}

const csvCell = (value: unknown) => {
  let text = String(value ?? '')
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const draftCsvHeaders = [
  '연도',
  '월',
  '사용량(kWh)',
  '총 전기요금(원)',
  '요금적용전력(kW)',
  '최대수요전력(kW)',
  '기본요금(원)',
  '전력량요금(원)',
  '역률요금(원)',
  '기후환경요금(원)',
  '연료비조정액(원)',
  '부가세(원)',
  '전력산업기반기금(원)',
  '메모',
] as const

export const buildDraftCsv = (rows: SimpleDraftRow[]): string => {
  const bills = draftRowsToBills(rows)
  const lines = bills.map((bill) =>
    [
      bill.year || '',
      bill.month || '',
      bill.usageKwh || '',
      bill.totalBillWon || '',
      bill.appliedPowerKw || '',
      bill.maxDemandKw || '',
      bill.baseChargeWon || '',
      bill.energyChargeWon || '',
      bill.powerFactorChargeWon || '',
      bill.climateChargeWon || '',
      bill.fuelAdjustmentWon || '',
      bill.vatWon || '',
      bill.fundWon || '',
      bill.note,
    ]
      .map(csvCell)
      .join(','),
  )
  return `\uFEFF${draftCsvHeaders.join(',')}\r\n${lines.join('\r\n')}\r\n`
}

export const buildCandidateFromDraft = (
  rows: SimpleDraftRow[],
  origin: Exclude<BillDataOrigin, 'sample'>,
  sourceLabel: string,
): BillInputCandidate => ({
  origin,
  bills: draftRowsToBills(rows),
  sourceLabel,
})

const combinedYearMonthHeader = /연월|년월/

const splitYearMonthValue = (value: unknown) => {
  const period = parseStrictCalendarValue(String(value ?? '').trim())
  return {
    year: period ? String(period.year) : '',
    month: period ? String(period.month) : '',
  }
}

/**
 * 붙여넣은 표에 '연월'처럼 합쳐진 기간 열만 있을 때
 * 기존 컬럼 매핑이 요구하는 '연도'·'월' 열로 분리한다.
 */
export const expandYearMonthColumn = (sheet: ParsedSheet): ParsedSheet => {
  const key = sheet.headers.find((header) =>
    combinedYearMonthHeader.test(header.replace(/[\s()]/g, '')),
  )
  if (!key) return sheet
  if (sheet.headers.includes('연도') && sheet.headers.includes('월')) {
    return sheet
  }
  const headers = sheet.headers.flatMap((header) =>
    header === key ? ['연도', '월'] : [header],
  )
  const rows = sheet.rows.map((row) => {
    const next: Record<string, unknown> = {}
    for (const header of sheet.headers) {
      if (header !== key) {
        next[header] = row[header]
        continue
      }
      const period = splitYearMonthValue(row[key])
      next['연도'] = period.year
      next['월'] = period.month
    }
    return next
  })
  return { ...sheet, headers, rows }
}

/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { openProView } from '../../testHelpers'
import { readStorageSnapshot } from '../../lib/storage'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const pastedTwelveMonths = [
  '연도\t월\t사용량(kWh)\t총 전기요금(원)',
  ...Array.from({ length: 12 }, (_, index) => {
    const monthIndex = 2025 * 12 + 8 + index
    return [
      Math.floor(monthIndex / 12),
      (monthIndex % 12) + 1,
      48000 + index * 750,
      7100000 + index * 112500,
    ].join('\t')
  }),
].join('\n')

const pastedCombinedYearMonth = [
  '연월\t사용량(kWh)\t총 전기요금(원)',
  ...Array.from({ length: 12 }, (_, index) => {
    const monthIndex = 2025 * 12 + 8 + index
    const year = Math.floor(monthIndex / 12)
    const month = (monthIndex % 12) + 1
    return [
      `${year}-${String(month).padStart(2, '0')}`,
      48000 + index * 750,
      7100000 + index * 112500,
    ].join('\t')
  }),
].join('\n')

const openPasteDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: '파일 없이 입력하기' }))
  const methodDialog = await screen.findByRole('dialog')
  fireEvent.click(
    methodDialog.querySelector('button[aria-label="표 붙여넣기"]') as HTMLElement,
  )
}

const pasteAndEnterReview = async (text: string) => {
  await openPasteDialog()
  fireEvent.change(screen.getByLabelText('월별 표 붙여넣기'), {
    target: { value: text },
  })
  fireEvent.click(screen.getByRole('button', { name: '표 확인하기' }))
  await screen.findByRole('heading', { name: '월별 전기요금' })
}

const fillContractAndConfirm = () => {
  fireEvent.change(screen.getByLabelText('계약종별'), {
    target: { value: '교육용(갑)' },
  })
  fireEvent.change(screen.getByLabelText('수전전압'), {
    target: { value: '고압A' },
  })
  fireEvent.change(screen.getByLabelText('지금 사용 중인 요금제'), {
    target: { value: '선택요금Ⅱ' },
  })
  fireEvent.change(screen.getByLabelText('요금적용전력 kW'), {
    target: { value: '500' },
  })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('간편 진단 흐름', () => {
  it('첫 화면은 업로드 안내만 보여주고 샘플 월별 표를 미리 채우지 않는다', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: '고지서·엑셀 올리기' }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '월별 전기요금' })).toBeNull()
    expect(screen.queryByLabelText('1행 사용 월')).toBeNull()
  })

  it('붙여넣은 12개월을 확인하고 계약정보를 대조한 뒤 결과와 저장소에 반영한다', async () => {
    render(<App />)
    await pasteAndEnterReview(pastedTwelveMonths)

    expect(screen.getByText('붙여넣은 표')).toBeTruthy()
    expect(
      (screen.getByLabelText('1행 사용 월') as HTMLInputElement).value,
    ).toBe('2025-09')
    expect(
      (screen.getByLabelText('12행 사용량 kWh') as HTMLInputElement).value,
    ).toBe('56250')
    expect(screen.getByText(/연속 12개월을 확인했어요/)).toBeTruthy()

    fillContractAndConfirm()
    const analyzeButton = screen.getByRole('button', {
      name: '요금제 비교하기',
    })
    expect((analyzeButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(analyzeButton)

    expect(
      await screen.findByRole('heading', {
        name: /유리|추가 확인이 필요합니다/,
      }),
    ).toBeTruthy()
    await waitFor(() => expect(readStorageSnapshot()).not.toBeNull())
    const snapshot = readStorageSnapshot()
    expect(snapshot?.data.bills).toHaveLength(12)
    expect(snapshot?.data.provenance.bills).toBe('pasted')
    expect(snapshot?.data.profile.currentPlan).toBe('선택요금Ⅱ')
  })

  it('연월이 한 열로 합쳐진 표도 연도·월로 나눠 읽는다', async () => {
    render(<App />)
    await pasteAndEnterReview(pastedCombinedYearMonth)

    expect(
      (screen.getByLabelText('1행 사용 월') as HTMLInputElement).value,
    ).toBe('2025-09')
    expect(
      (screen.getByLabelText('12행 사용 월') as HTMLInputElement).value,
    ).toBe('2026-08')
    expect(screen.getByText(/연속 12개월을 확인했어요/)).toBeTruthy()
  })

  it('예시 자료 흐름은 결과까지 보여주되 저장소를 바꾸지 않는다', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '예시로 살펴보기' }))
    await screen.findByRole('heading', { name: '월별 전기요금' })
    expect(screen.getByText(/화면 체험 중/)).toBeTruthy()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '요금제 비교하기' }))

    expect(await screen.findByText(/결과 화면 예시/)).toBeTruthy()
    expect(readStorageSnapshot()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '내 자료로 시작' }))
    expect(
      await screen.findByRole('button', { name: '고지서·엑셀 올리기' }),
    ).toBeTruthy()
    expect(readStorageSnapshot()).toBeNull()
  })

  it('중복된 월을 만들면 비교를 막고 안내를 보여준다', async () => {
    render(<App />)
    await pasteAndEnterReview(pastedTwelveMonths)

    const firstMonth = screen.getByLabelText('1행 사용 월') as HTMLInputElement
    fireEvent.change(screen.getByLabelText('2행 사용 월'), {
      target: { value: firstMonth.value },
    })

    fillContractAndConfirm()
    expect(
      (screen.getByRole('button', { name: '요금제 비교하기' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(screen.getByText(/청구월이 중복되었습니다/)).toBeTruthy()
  })

  it('행 삭제 후 되돌리기로 복구할 수 있다', async () => {
    render(<App />)
    await pasteAndEnterReview(pastedTwelveMonths)

    fireEvent.click(screen.getByRole('button', { name: '1행 삭제' }))
    expect(screen.queryByLabelText('12행 사용 월')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: '삭제 되돌리기' }),
    )
    expect(
      (screen.getByLabelText('12행 사용 월') as HTMLInputElement).value,
    ).toBe('2026-08')
  })

  it('전문 기능을 다녀와도 입력 중인 자료가 유지된다', async () => {
    render(<App />)
    await pasteAndEnterReview(pastedTwelveMonths)

    await openProView('대시보드')
    expect(
      await screen.findByRole('button', { name: '간편 진단' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '간편 진단' }))
    await screen.findByRole('heading', { name: '월별 전기요금' })
    expect(
      (screen.getByLabelText('1행 사용 월') as HTMLInputElement).value,
    ).toBe('2025-09')
    expect(
      (screen.getByLabelText('12행 총 전기요금 원') as HTMLInputElement).value,
    ).toBe('8337500')
  })
})

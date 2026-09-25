/* @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnergyLanding } from './EnergyLanding'
import type { ViewKey } from '../../types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const renderLanding = () => {
  const onStart = vi.fn()
  const onNavigate = vi.fn<(view: ViewKey) => void>()
  const onHome = vi.fn()
  render(
    <EnergyLanding
      onStart={onStart}
      onNavigate={onNavigate}
      onHome={onHome}
    />,
  )
  return { onStart, onNavigate, onHome }
}

const countText = () =>
  document.querySelector('.effect-value strong')?.textContent

describe('에너지 랜딩', () => {
  it('시안의 첫 화면 구성을 보여준다', () => {
    renderLanding()

    expect(
      screen.getByRole('heading', { name: /더 나은 내일/ }),
    ).toBeTruthy()
    expect(
      screen.getByText('학교의 소중한 에너지를, 더 효율적으로'),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '전기요금 절감 확인하기' }),
    ).toBeTruthy()
    expect(screen.getByText('예시')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '전체 메뉴' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '애니메이션 일시정지' }),
    ).toBeTruthy()
    expect(document.querySelector('img.school-image')).toBeTruthy()
  })

  it('주 버튼은 onStart로 기존 입력 흐름을 연다', () => {
    const { onStart } = renderLanding()

    fireEvent.click(
      screen.getByRole('button', { name: '전기요금 절감 확인하기' }),
    )
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('빠른 메뉴는 해당 ViewKey로 이동한다', () => {
    const { onNavigate } = renderLanding()

    fireEvent.click(screen.getByRole('button', { name: '대시보드' }))
    fireEvent.click(screen.getByRole('button', { name: '요금제 비교' }))
    fireEvent.click(screen.getByRole('button', { name: '피크관리' }))
    expect(onNavigate.mock.calls.map((call) => call[0])).toEqual([
      'dashboard',
      'rates',
      'peak',
    ])
  })

  it('전체 메뉴는 12개 항목을 실제 ViewKey로 연결한다', () => {
    const { onNavigate } = renderLanding()

    fireEvent.click(screen.getByRole('button', { name: '전체 메뉴' }))
    const dialog = document.querySelector('.menu-dialog')
    expect(dialog).toBeTruthy()
    const links = Array.from(
      dialog!.querySelectorAll<HTMLButtonElement>('button.feature-link'),
    )
    expect(links).toHaveLength(12)

    const expected: Array<[string, ViewKey]> = [
      ['간편 진단', 'simple'],
      ['쉬운 진단', 'easyDiagnosis'],
      ['자동진단', 'diagnosis'],
      ['대시보드', 'dashboard'],
      ['요금제 비교', 'rates'],
      ['피크관리', 'peak'],
      ['파워플래너', 'powerPlanner'],
      ['문서생성', 'docs'],
      ['고지서 입력', 'bills'],
      ['학교정보', 'school'],
      ['설정', 'settings'],
      ['사용 안내', 'guide'],
    ]
    for (const [label, view] of expected) {
      const item = links.find(
        (button) => button.textContent?.trim() === label,
      )
      expect(item, label).toBeTruthy()
      fireEvent.click(item!)
      expect(onNavigate).toHaveBeenLastCalledWith(view)
      // 메뉴를 다시 열어 다음 항목을 누른다.
      fireEvent.click(screen.getByRole('button', { name: '전체 메뉴' }))
      const reopened = document.querySelector('.menu-dialog')
      expect(reopened).toBeTruthy()
      links.length = 0
      links.push(
        ...Array.from(
          reopened!.querySelectorAll<HTMLButtonElement>(
            'button.feature-link',
          ),
        ),
      )
    }
  })

  it('전체 메뉴 닫기와 초점 복귀가 동작한다', () => {
    renderLanding()

    const menuButton = screen.getByRole('button', { name: '전체 메뉴' })
    fireEvent.click(menuButton)
    expect(document.querySelector('.menu-dialog')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: '전체 메뉴 닫기' }),
    )
    expect(document.querySelector('.menu-dialog')).toBeNull()
    expect(document.activeElement).toBe(menuButton)
  })

  it('카운트업이 0에서 18까지 올라간 뒤 멈춘다', () => {
    vi.useFakeTimers()
    renderLanding()

    expect(countText()).toBe('0')
    act(() => {
      vi.advanceTimersByTime(900)
    })
    const mid = Number(countText())
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(18)
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(countText()).toBe('18')
    // 완료 후 더 진행해도 값이 유지된다.
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(countText()).toBe('18')
  })

  it('다시 보기 버튼은 카운트업만 다시 실행한다', () => {
    vi.useFakeTimers()
    renderLanding()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(countText()).toBe('18')
    fireEvent.click(
      screen.getByRole('button', { name: '절감률 다시 보기' }),
    )
    expect(countText()).toBe('0')
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(countText()).toBe('18')
  })

  it('모션 정지/재생 토글이 상태와 라벨을 바꾼다', () => {
    renderLanding()

    const toggle = screen.getByRole('button', {
      name: '애니메이션 일시정지',
    })
    fireEvent.click(toggle)
    expect(
      screen.getByRole('button', { name: '애니메이션 재생' }),
    ).toBeTruthy()
    expect(
      document.querySelector('.elbill-landing')?.getAttribute('data-motion'),
    ).toBe('paused')
    fireEvent.click(
      screen.getByRole('button', { name: '애니메이션 재생' }),
    )
    expect(
      document.querySelector('.elbill-landing')?.getAttribute('data-motion'),
    ).toBe('running')
  })

  it('reduced-motion이면 마지막 숫자를 바로 보여준다', () => {
    const matchMedia = vi.fn().mockImplementation(
      (query: string) =>
        ({
          matches: true,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          onchange: null,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    )
    vi.stubGlobal('matchMedia', matchMedia)
    renderLanding()

    expect(countText()).toBe('18')
    expect(matchMedia).toHaveBeenCalled()
  })
})

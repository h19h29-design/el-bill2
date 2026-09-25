import {
  ArrowRight,
  ChevronRight,
  Copy,
  Download,
  PenLine,
} from 'lucide-react'
import type { ViewKey } from '../../types'
import { EbDialog } from './EbDialog'
import type { useSimpleDiagnosis } from './useSimpleDiagnosis'

import { viewMenuItems } from '../../lib/viewMenu'

type SimpleState = ReturnType<typeof useSimpleDiagnosis>

// Keys and icons come from the shared menu definition; the drawer keeps
// its more descriptive titles and one-line descriptions.
const drawerMeta: Partial<
  Record<ViewKey, { title: string; desc: string }>
> = {
  dashboard: { title: '대시보드', desc: '월별 추이와 전체 현황' },
  easyDiagnosis: {
    title: '쉬운 진단 마법사',
    desc: '기존 단계별 진단 화면',
  },
  diagnosis: { title: '전문 자동진단', desc: '기존 상세 진단 화면' },
  school: { title: '학교정보', desc: '학교·담당자·계약정보' },
  bills: { title: '고지서 입력', desc: '기존 자료 가져오기와 관리' },
  powerPlanner: { title: '파워플래너', desc: '시간대별 사용 자료 가져오기' },
  rates: { title: '요금제 비교', desc: '후보와 계산 근거 상세 비교' },
  peak: { title: '피크관리', desc: '운영 계획과 시나리오 검토' },
  docs: { title: '문서생성', desc: '검토용 계획안·공문·신청서' },
  guide: { title: '전체 사용 안내', desc: '자료 준비와 기능 설명' },
  settings: { title: '설정', desc: '기존 요금표와 계산 설정' },
}

const featureItems = viewMenuItems
  .filter((item) => item.key !== 'simple' && drawerMeta[item.key])
  .map((item) => ({
    key: item.key,
    icon: item.icon,
    title: drawerMeta[item.key]?.title ?? item.label,
    desc: drawerMeta[item.key]?.desc ?? '',
  }))

const fieldHelpContent: Record<string, { title: string; body: string }> = {
  contract: {
    title: '계약종별',
    body:
      '계약사항에 적힌 교육용(갑) 또는 교육용(을) 등의 명칭을 확인해 주세요.',
  },
  voltage: {
    title: '수전전압',
    body:
      '계약사항의 저압·고압A·고압B 표기를 확인해 주세요. 목록에 없으면 전문 기능에서 확인하세요.',
  },
  plan: {
    title: '현재 요금제',
    body:
      '현재 사용 중인 선택요금Ⅰ·Ⅱ 등 고지서 표기를 확인해 주세요. 추천받고 싶은 요금제가 아니라 지금 계약한 요금제입니다.',
  },
  power: {
    title: '요금적용전력',
    body:
      '요금내역의 요금적용전력(kW)을 확인해 주세요. 계약전력이나 사용량(kWh)과 혼동하지 않도록 주의해 주세요.',
  },
}

const billGuideRows = [
  ['contract', '계약종별', '교육용(갑)'],
  ['voltage', '수전전압', '고압A'],
  ['plan', '선택요금', '선택요금Ⅱ'],
  ['power', '요금적용전력', '500 kW'],
] as const

export function SimpleDialogs({ state }: { state: SimpleState }) {
  const { dialog } = state
  if (!dialog) return null

  if (dialog === 'tools') {
    return (
      <EbDialog
        title="필요할 때, 전문 기능"
        drawer
        onClose={state.closeDialog}
      >
        <p>기존 기능은 그대로 두고, 자세한 검토가 필요할 때만 열어요.</p>
        <div className="eb-feature-list">
          {featureItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className="eb-feature-btn"
                aria-label={item.title}
                onClick={() => state.openFeature(item.key)}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            )
          })}
        </div>
        <p className="eb-developer-note">
          전문 화면에서도 입력 중인 자료는 유지됩니다. 작업을 마치면 사이드바의
          '간편 진단'으로 돌아올 수 있어요.
        </p>
      </EbDialog>
    )
  }

  if (dialog === 'prepare') {
    return (
      <EbDialog title="이 자료만 준비해 주세요." onClose={state.closeDialog}>
        <p>
          <strong>월별 자료</strong>
          <br />
          최근 연속 12개월의 사용 월, 사용량(kWh), 총 전기요금(원)이 필요해요.
        </p>
        <p>
          <strong>계약정보</strong>
          <br />
          계약종별, 수전전압, 현재 요금제, 요금적용전력을 고지서에서 확인해
          주세요.
        </p>
        <p>
          파워플래너는 필수가 아니에요. 학교명과 담당자 정보는 서류를 준비할
          때 확인하도록 분리합니다.
        </p>
        <p className="eb-developer-note">
          사진·스캔 PDF는 텍스트를 읽을 수 없어 인식이 어려울 수 있어요.
          텍스트형 PDF 또는 표 자료를 사용하세요. XLS는 파워플래너 HTML
         보내기 형식만 지원합니다.
        </p>
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-secondary"
            onClick={() => void state.downloadTemplate()}
          >
            빈 양식 받기
          </button>
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={state.closeDialog}
          >
            확인했어요
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'privacy') {
    return (
      <EbDialog
        title="입력한 자료는 어떻게 처리하나요?"
        onClose={state.closeDialog}
      >
        <p>
          <strong>브라우저 안에서만 처리</strong>
          <br />
          파일과 입력 내용은 서버로 전송하지 않고 이 브라우저에서만 읽습니다.
          외부 AI 호출도 없어요.
        </p>
        <p>
          <strong>24시간 후 자동 삭제</strong>
          <br />
          확인을 마친 자료는 이 브라우저에 최대 24시간만 저장되고, 지나면
          자동으로 삭제됩니다. 입력 자료 저장으로 CSV를 내려받아 두면 다시
          불러올 수 있어요.
        </p>
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={state.closeDialog}
          >
            확인했어요
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'about') {
    return (
      <EbDialog
        title="간편한 화면, 기존 기능은 그대로"
        onClose={state.closeDialog}
      >
        <p>
          <strong>이 화면에서 하는 일</strong>
          <br />
          고지서 업로드, 월별 내용 확인, 계약정보 대조, 요금제 비교 결과
          보기까지 한 흐름으로 진행합니다.
        </p>
        <p>
          <strong>전문 기능은 그대로</strong>
          <br />
          대시보드, 상세 진단, 파워플래너, 피크관리, 문서 생성은 전문 기능
          메뉴에서 기존 화면 그대로 열립니다.
        </p>
        <p className="eb-developer-note">
          결과는 학교 내부 검토용 추정입니다. 공식 청구액이나 한전 접수가
          아니며, 실제 신청 전 최신 단가와 계약조건을 확인해 주세요.
        </p>
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={state.closeDialog}
          >
            확인했어요
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'guide') {
    return (
      <EbDialog title="자료만 준비하면, 순서대로" onClose={state.closeDialog}>
        <ol className="eb-guide-list">
          <li>
            <strong>자료 올리기</strong>
            최근 연속 12개월 고지서나 요금 정리표를 준비하세요. 표 붙여넣기와
            직접 입력도 가능합니다.
          </li>
          <li>
            <strong>내용 확인</strong>
            사용 월, 사용량, 총 전기요금을 확인하고 잘못된 숫자만 수정하세요.
            계약정보 네 항목도 대조해 주세요.
          </li>
          <li>
            <strong>결과 보기</strong>
            변경·유지·추가 확인 중 해당 결과와 다음 행동을 확인하세요.
          </li>
        </ol>
        <p>
          파워플래너와 피크관리는 기본 진단을 마친 뒤 선택적으로 사용할 수
          있어요.
        </p>
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-secondary"
            onClick={state.startDemo}
          >
            예시 체험
          </button>
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={state.closeDialog}
          >
            시작할게요
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'otherInput') {
    return (
      <EbDialog title="파일이 없어도 괜찮아요." onClose={state.closeDialog}>
        <p>가지고 있는 표를 붙여 넣거나 월별 숫자를 직접 적어 주세요.</p>
        <div className="eb-method-list">
          <button
            type="button"
            className="eb-method-btn"
            aria-label="표 붙여넣기"
            onClick={() => state.openDialog('paste')}
          >
            <Copy aria-hidden="true" />
            <span>
              <strong>표 붙여넣기</strong>
              <small>엑셀에서 복사한 표를 그대로</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className="eb-method-btn"
            aria-label="직접 입력"
            onClick={state.startManual}
          >
            <PenLine aria-hidden="true" />
            <span>
              <strong>직접 입력</strong>
              <small>사용량과 총 전기요금 12개월분</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <div className="eb-help-inline">
          <button
            type="button"
            className="eb-text-btn"
            onClick={() => void state.downloadTemplate()}
          >
            <Download aria-hidden="true" />
            빈 CSV 양식 받기
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'paste') {
    return (
      <EbDialog
        title="표를 그대로 붙여 넣어 주세요."
        onClose={state.closeDialog}
      >
        <p>
          제목 행과 12개월 자료를 함께 복사해 주세요.
          <br />
          연월 · 사용량(kWh) · 총 전기요금(원)
        </p>
        <label className="eb-sr-only" htmlFor="eb-paste-input">
          월별 표 붙여넣기
        </label>
        <textarea
          id="eb-paste-input"
          className="eb-paste-area"
          spellCheck={false}
          placeholder={
            '연월\t사용량(kWh)\t총 전기요금(원)\n2025-09\t32000\t6380000'
          }
          value={state.pasteText}
          onChange={(event) => state.setPasteText(event.target.value)}
        />
        {state.pasteError && (
          <p className="eb-dialog-alert" role="alert">
            {state.pasteError}
          </p>
        )}
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-secondary"
            onClick={() => void state.downloadTemplate()}
          >
            빈 양식 받기
          </button>
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={() => void state.applyPaste()}
          >
            표 확인하기
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'fieldHelp') {
    const help = fieldHelpContent[state.fieldHelpKey]
    if (!help) return null
    return (
      <EbDialog
        title={`${help.title}은 어디에 있나요?`}
        onClose={state.closeDialog}
      >
        <p>{help.body}</p>
        <div className="eb-bill-guide">
          <div className="eb-bill-guide-title">전기요금 고지서 · 항목 안내</div>
          {billGuideRows.map(([key, label, value]) => (
            <div
              key={key}
              className={
                key === state.fieldHelpKey
                  ? 'eb-bill-guide-row eb-highlight'
                  : 'eb-bill-guide-row'
              }
            >
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <small>
            항목을 설명하기 위한 모식도입니다. 실제 고지서의 위치·모양·값과
            다를 수 있어요.
          </small>
        </div>
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={state.closeDialog}
          >
            확인했어요
          </button>
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'prepareChange') {
    const canOpenDocs =
      !state.demo && (state.diagnosis?.canGenerateChangeDocuments ?? false)
    return (
      <EbDialog title="변경 준비를 한곳에서" onClose={state.closeDialog}>
        <p>
          요금제 변경은 이 앱에서 자동 신청되지 않아요. 자료를 검토하고 실제
          신청 절차를 진행해야 합니다.
        </p>
        <ol className="eb-guide-list">
          <li>
            <strong>계약조건 확인</strong>
            추천안의 적용 가능 여부와 변경 가능한 시점을 확인하세요.
          </li>
          <li>
            <strong>검토·신청 서류 준비</strong>
            계획안, 공문, 신청서 미리보기와 계산 근거를 확인하세요.
          </li>
          <li>
            <strong>담당자 검토 후 제출</strong>
            필요한 첨부를 확인하고 한전의 실제 신청 절차로 진행하세요.
          </li>
        </ol>
        <h3 style={{ fontSize: 14 }}>담당자가 직접 확인해 주세요</h3>
        <ul className="eb-checklist">
          <li>
            <label>
              <input type="checkbox" />
              고지서와 현재 계약정보를 대조했습니다.
            </label>
          </li>
          <li>
            <label>
              <input type="checkbox" />
              최신 단가와 변경 가능 시점을 확인했습니다.
            </label>
          </li>
          <li>
            <label>
              <input type="checkbox" />
              필요한 첨부서류를 실제로 준비했습니다.
            </label>
          </li>
        </ul>
        {state.demo ? (
          <p className="eb-developer-note">
            예시 체험에서는 공식 신청서류를 생성하지 않습니다. 서류 목록과
            준비 순서만 확인할 수 있어요.
          </p>
        ) : (
          !canOpenDocs && (
            <p className="eb-developer-note">
              현재 진단 상태에서는 신청서류를 생성할 수 없습니다. 자료와
              계약정보를 다시 확인해 주세요.
            </p>
          )
        )}
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-secondary"
            onClick={state.saveChecklist}
          >
            준비 체크리스트 저장
          </button>
          {canOpenDocs ? (
            <button
              type="button"
              className="eb-btn eb-primary"
              onClick={() => state.openFeature('docs')}
            >
              기존 문서 생성기로 이동
            </button>
          ) : (
            <button
              type="button"
              className="eb-btn eb-primary"
              onClick={state.closeDialog}
            >
              확인했어요
            </button>
          )}
        </div>
      </EbDialog>
    )
  }

  if (dialog === 'resetConfirm') {
    return (
      <EbDialog title="새로 시작할까요?" onClose={state.closeDialog}>
        <p>
          입력한 자료는 확인을 마치면 브라우저에 24시간 저장됩니다. 먼저 CSV로
          저장하면 다시 불러올 수 있습니다.
        </p>
        <div className="eb-dialog-actions">
          <button
            type="button"
            className="eb-btn eb-secondary"
            onClick={state.exportCsv}
          >
            자료 저장
          </button>
          <button
            type="button"
            className="eb-btn eb-primary"
            onClick={state.resetAll}
          >
            새로 시작
          </button>
        </div>
      </EbDialog>
    )
  }

  return null
}

import { useRef, useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  Loader2,
  Plus,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import type { useSimpleDiagnosis } from './useSimpleDiagnosis'

type SimpleState = ReturnType<typeof useSimpleDiagnosis>

export function SimpleStartScreen({ state }: { state: SimpleState }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    void state.importFiles(Array.from(event.dataTransfer.files ?? []))
  }

  return (
    <section className="eb-screen" aria-labelledby="eb-start-title">
      <div className="eb-start">
        <h1 id="eb-start-title" tabIndex={-1}>
          전기요금,
          <br />
          <em>바꾸면 얼마나 줄어들까요?</em>
        </h1>
        <p className="eb-intro">
          12개월 고지서를 올리면,
          <br className="eb-mobile-break" />
          우리 학교에 맞는 요금제를 비교해요.
        </p>
        <div
          className={
            dragOver ? 'eb-upload-card eb-dragover' : 'eb-upload-card'
          }
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragOver(false)
            }
          }}
          onDrop={onDrop}
        >
          <div className="eb-upload-symbol">
            {state.busy ? (
              <Loader2 className="eb-busy-icon" aria-hidden="true" />
            ) : (
              <Upload aria-hidden="true" />
            )}
          </div>
          <p className="eb-upload-title">
            고지서나 요금 정리표를 여기에 놓아주세요
          </p>
          <button
            type="button"
            className="eb-btn eb-primary eb-upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={state.busy}
          >
            <Plus aria-hidden="true" />
            고지서·엑셀 올리기
          </button>
          <input
            ref={fileInputRef}
            className="eb-hidden-input"
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv"
            aria-label="고지서 또는 요금 정리표 파일 선택"
            tabIndex={-1}
            disabled={state.busy}
            onChange={(event) => {
              void state.importFiles(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
          <p className="eb-file-formats">
            PDF · XLSX · XLS · CSV<span>│</span>여러 고지서도 한 번에
          </p>
          {state.importMessage && (
            <div className="eb-import-message" role="status">
              {state.importMessage}
            </div>
          )}
        </div>
        <div className="eb-upload-alternatives">
          <button
            type="button"
            className="eb-text-btn"
            onClick={() => state.openDialog('otherInput')}
          >
            파일 없이 입력하기
            <ChevronRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className="eb-text-btn"
            onClick={state.startDemo}
          >
            예시로 살펴보기
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div className="eb-privacy-line">
          <ShieldCheck aria-hidden="true" />
          <span>파일은 서버로 전송하지 않고, 이 브라우저에서만 읽어요.</span>
        </div>
        <div className="eb-helper-block">
          <div className="eb-helper-copy">
            <strong>최근 12개월 자료만 준비해 주세요.</strong>
            계약정보는 다음 화면에서 함께 확인해요.
          </div>
          <button
            type="button"
            className="eb-text-btn"
            onClick={() => state.openDialog('prepare')}
          >
            어떤 자료가 필요한가요?
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

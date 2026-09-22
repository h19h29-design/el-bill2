import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface EbDialogProps {
  title: string
  drawer?: boolean
  onClose: () => void
  children: ReactNode
}

export function EbDialog({ title, drawer, onClose, children }: EbDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
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
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('click', onClick)
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className={drawer ? 'eb-dialog eb-drawer' : 'eb-dialog'}
      aria-labelledby="eb-dialog-title"
    >
      <div className="eb-dialog-header">
        <h2 id="eb-dialog-title">{title}</h2>
        <button
          type="button"
          className="eb-icon-btn"
          onClick={onClose}
          aria-label="닫기"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="eb-dialog-body">{children}</div>
    </dialog>
  )
}

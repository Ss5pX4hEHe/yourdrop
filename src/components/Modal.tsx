'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ open, onClose, children, label = 'Управление балансом', wide = false }: { open: boolean; onClose: () => void; children: ReactNode; label?: string; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog ref={dialog} className={'modal native-modal' + (wide ? ' wide' : '')} aria-label={label} onCancel={onClose} onClick={e => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.target === e.currentTarget && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) onClose();
    }}>{open && children}</dialog>
  );
}

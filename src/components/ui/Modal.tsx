"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="bg-transparent p-0 m-0 max-w-[95vw] w-full max-h-[85vh] backdrop:bg-black/60"
    >
      <div className="gba-panel max-h-[85vh] flex flex-col">
        <div className="gba-panel-header bg-gba-red/20 text-gba-red flex items-center justify-between">
          <span>{title}</span>
          <button
            onClick={onClose}
            className="text-gba-red hover:text-white transition-colors"
          >
            X
          </button>
        </div>
        <div className="p-3 overflow-y-auto flex-1">{children}</div>
      </div>
    </dialog>
  );
}

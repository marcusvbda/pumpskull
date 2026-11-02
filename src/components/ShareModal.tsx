"use client";

// Small modal opened by the lobby's Share button: a QR code for the room link, so the other team scans it with their phone.

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./ui";

interface Props {
  pin: string;
  link: string;
  onClose: () => void;
}

export function ShareModal({ pin, link, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // A native <dialog> gives the focus trap, the Esc key and the backdrop for free.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus(); // otherwise the browser focuses (and selects) the link field
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // tap on the dark backdrop
      }}
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-3xl border-2 border-indigo-400 bg-indigo-900 p-4 text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 id="share-title" className="text-xl font-black text-amber-400">
          Scan to join
        </h2>
        {/* Dark modules on a white card with a quiet zone: the most reliable thing for phone cameras. */}
        <div className="rounded-2xl bg-white p-2">
          <QRCodeSVG value={link} size={224} level="M" marginSize={2} title={`QR code to join room ${pin}`} className="block h-auto w-full max-w-56" />
        </div>
        <p className="text-sm font-bold text-indigo-200">
          or enter PIN <span className="text-lg font-black tracking-[0.12em] text-amber-400">{pin}</span>
        </p>
        <input
          readOnly
          value={link}
          aria-label="Room link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 w-full rounded-xl border-2 border-indigo-400 bg-indigo-950 px-3 text-center text-sm font-bold text-white"
        />
        <Button ref={closeRef} onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </dialog>
  );
}

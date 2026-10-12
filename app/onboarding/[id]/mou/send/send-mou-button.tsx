"use client";

import { useFormStatus } from "react-dom";

type SendMouButtonProps = {
  sendingEnabled: boolean;
};

export function SendMouButton({ sendingEnabled }: SendMouButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !sendingEnabled}
      className="inline-flex h-11 items-center justify-center rounded-md bg-[#c8102e] px-6 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      {pending
        ? "Creating DocuSign envelope…"
        : sendingEnabled
          ? "Send for signature"
          : "Signature sending not active"}
    </button>
  );
}

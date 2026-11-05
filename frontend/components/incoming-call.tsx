"use client";

import { useRouter } from "next/navigation";
import { PhoneOff, Video } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui";

/** Bannière « X vous appelle » : visible sur toutes les pages tant que l'appelant attend. */
export function IncomingCall() {
  const { incomingCall, dismissCall, state } = useStore();
  const router = useRouter();
  if (!incomingCall) return null;
  const caller = state.users.find((u) => u.id === incomingCall.from);
  if (!caller) return null;

  return (
    <div role="alertdialog" aria-label={`Appel vidéo de ${caller.name}`} className="fixed inset-x-0 top-4 z-[80] flex justify-center px-4">
      <div className="flex w-full max-w-md animate-apparition items-center gap-3 rounded-2xl bg-nuit p-3 pl-4 text-creme shadow-2xl ring-1 ring-white/10">
        <span className="relative shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-sauge/50" />
          <Avatar user={caller} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{caller.name}</p>
          <p className="truncate text-xs text-creme/60">{incomingCall.topic ? `Séance · ${incomingCall.topic}` : "vous appelle en visio…"}</p>
        </div>
        <button onClick={() => dismissCall(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-700" aria-label="Refuser l'appel" title="Refuser">
          <PhoneOff size={18} />
        </button>
        <button
          onClick={() => {
            dismissCall();
            router.push(incomingCall.href);
          }}
          className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-sauge px-4 font-semibold text-white transition hover:bg-sauge-dark"
          aria-label="Rejoindre l'appel"
        >
          <Video size={18} /> Rejoindre
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Mic, MicOff, MessageSquare, MonitorUp, NotebookPen, PhoneOff, RefreshCw, Send, Video, VideoOff, WifiOff, X } from "lucide-react";
import { conversationBetween, useStore } from "@/lib/store";
import { callRoom } from "@/lib/realtime";
import { usePeerCall } from "@/lib/use-peer-call";
import { cn, formatDate } from "@/lib/utils";
import { Avatar, btn, field, LogoMark, Modal, StarInput } from "@/components/ui";

const MEDIA_ERRORS = {
  insecure: "Votre navigateur ne permet pas l'accès à la caméra ici : ouvrez Lirel en https (ou sur localhost).",
  busy: "n'a pas pu démarrer. Elle est peut-être ouverte dans une autre application (Teams, Zoom, Appareil photo…) ou un autre navigateur : sous Windows, une webcam ne sert qu'à un programme à la fois. Fermez-la si besoin, puis cliquez sur « Réessayer ».",
  denied: "est bloqué·e par le navigateur. Cliquez sur l'icône à gauche de l'adresse, autorisez l'accès, puis « Réessayer ».",
  missing: "est introuvable sur cet appareil.",
  other: "n'a pas pu démarrer.",
};

/**
 * Une seule demande caméra/micro à la fois dans l'onglet. En développement, React exécute les effets deux fois :
 * deux ouvertures simultanées de la même webcam échouent sous Windows (NotReadableError), comme si elle était
 * occupée par une autre application. La seconde demande attend donc que la première soit terminée et libérée.
 */
let mediaQueue: Promise<unknown> = Promise.resolve();
const BUSY = new Set(["NotReadableError", "TrackStartError", "AbortError"]);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function errName(e: unknown) {
  return e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
}

/** Message clair selon l'erreur getUserMedia (occupé, refusé, absent…). */
function mediaErrorMessage(e: unknown, device: "camera" | "micro") {
  const subject = device === "camera" ? "La caméra" : "Le micro";
  switch (errName(e)) {
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return `${subject} ${MEDIA_ERRORS.busy}`;
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return `${subject} ${MEDIA_ERRORS.denied}`;
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return `${subject} ${MEDIA_ERRORS.missing}`;
    default:
      return `${subject} ${MEDIA_ERRORS.other}`;
  }
}

type Phase = "attente" | "appel" | "fin";

export default function VisioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, me, sendMessage, completeSession, rateSession, saveSessionNotes } = useStore();

  const session = state.sessions.find((s) => s.id === id);
  const partnerId = session ? (session.mentorId === me?.id ? session.menteeId : session.mentorId) : id.startsWith("direct-") ? id.slice(7) : undefined;
  const partner = state.users.find((u) => u.id === partnerId);
  // Membre fictif du mode démo : personne en face, l'appel est simulé.
  const simulated = !!partner?.bot;

  const [phase, setPhase] = useState<Phase>("attente");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [remoteFrozen, setRemoteFrozen] = useState(false);
  /** Incrémenté à chaque nouveau flux local : déclenche l'envoi des pistes à l'interlocuteur. */
  const [streamVersion, setStreamVersion] = useState(0);
  /** Incrémenté par « Réessayer » pour redemander la caméra et le micro. */
  const [camAttempt, setCamAttempt] = useState(0);
  const [panel, setPanel] = useState<"chat" | "notes" | null>(null);
  const [botHere, setBotHere] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  /** Écran dont le partage vient d'être arrêté, coupé une fois la caméra rebranchée. */
  const oldScreenRef = useRef<MediaStream | null>(null);
  const sharingRef = useRef(false);
  sharingRef.current = sharing;

  /* ---------- Appel pair-à-pair ---------- */

  const media = useMemo(() => ({ mic: mic && hasAudio, cam: cam && hasVideo, sharing }), [mic, cam, sharing, hasAudio, hasVideo]);
  const getTracks = useCallback(
    () => ({
      audio: streamRef.current?.getAudioTracks()[0] ?? null,
      video: (sharing ? screenRef.current : streamRef.current)?.getVideoTracks()[0] ?? null,
    }),
    [sharing],
  );
  const call = usePeerCall({
    active: phase === "appel" && !simulated && !!partner,
    lobby: phase === "attente" && !simulated && !!partner,
    room: callRoom(session?.id, me?.id ?? "", partnerId ?? ""),
    meId: me?.id ?? "",
    partnerId: partnerId ?? "",
    getTracks,
    media,
    topic: session?.topic,
  });
  const { updateTracks, remoteStream } = call;
  const connected = simulated ? botHere : call.connection === "connecte";

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current?.getTracks().forEach((t) => t.stop());
    oldScreenRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    screenRef.current = null;
    oldScreenRef.current = null;
  }, []);

  // Caméra et micro réels du navigateur.
  // Caméra et micro sont demandés ensemble puis, en cas d'échec, séparément : une webcam occupée
  // (ex. ouverte par un autre navigateur sur le même PC) ne doit pas couper aussi le son.
  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError(MEDIA_ERRORS.insecure);
      return;
    }
    const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 } };
    const AUDIO = { echoCancellation: true, noiseSuppression: true };
    const once = (c: MediaStreamConstraints) =>
      navigator.mediaDevices.getUserMedia(c).then(
        (s) => ({ s, e: null as unknown }),
        (e: unknown) => ({ s: null as MediaStream | null, e }),
      );
    // Le pilote peut mettre un instant à libérer la webcam (rechargement, onglet précédent) : on retente avant de conclure.
    const tryGet = async (c: MediaStreamConstraints) => {
      let r = await once(c);
      for (const delay of [400, 1200]) {
        if (r.s || cancelled || !BUSY.has(errName(r.e))) break;
        await wait(delay);
        r = await once(c);
      }
      return r;
    };

    const acquire = async () => {
      if (cancelled) return;
      let stream: MediaStream | null = null;
      let videoErr: unknown = null;
      let audioErr: unknown = null;
      const both = await tryGet({ video: VIDEO, audio: AUDIO });
      if (both.s) stream = both.s;
      else {
        const [v, a] = [await tryGet({ video: VIDEO }), await tryGet({ audio: AUDIO })];
        // Contraintes trop exigeantes pour cette caméra : on retente sans résolution imposée.
        const v2 = !v.s && errName(v.e) === "OverconstrainedError" ? await tryGet({ video: true }) : v;
        videoErr = v2.e;
        audioErr = a.e;
        const tracks = [...(v2.s?.getTracks() ?? []), ...(a.s?.getTracks() ?? [])];
        stream = tracks.length ? new MediaStream(tracks) : null;
      }
      if (cancelled) return stream?.getTracks().forEach((t) => t.stop());
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      const gotVideo = !!stream?.getVideoTracks().length;
      const gotAudio = !!stream?.getAudioTracks().length;
      setHasVideo(gotVideo);
      setHasAudio(gotAudio);
      // Webcam reprise par une autre application : l'interlocuteur verra l'avatar plutôt qu'une image figée.
      stream?.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (streamRef.current === stream) setHasVideo(false);
      });
      setCamError(gotVideo ? null : mediaErrorMessage(videoErr ?? both.e, "camera") + (gotAudio ? " Votre micro fonctionne : vous pouvez échanger en audio." : ""));
      setMicError(gotAudio ? null : mediaErrorMessage(audioErr ?? both.e, "micro"));
      if (videoRef.current && !sharingRef.current) videoRef.current.srcObject = stream;
      setStreamVersion((n) => n + 1);
    };
    const run = mediaQueue.then(acquire);
    mediaQueue = run.catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [camAttempt]);

  // Libération de la caméra et du micro en quittant la page.
  useEffect(() => stopAll, [stopAll]);

  // Rebrancher le flux quand la vignette change de place (attente → appel)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = sharing ? screenRef.current : streamRef.current;
  }, [phase, sharing, streamVersion]);

  // Nouvelle piste (caméra obtenue, partage d'écran) : on l'envoie à l'interlocuteur.
  // L'écran partagé n'est coupé qu'une fois la caméra rebranchée : sinon l'émetteur reste un instant
  // sur une piste terminée et l'interlocuteur garde la dernière image de l'écran, figée.
  useEffect(() => {
    void updateTracks().finally(() => {
      if (sharingRef.current) return;
      oldScreenRef.current?.getTracks().forEach((t) => t.stop());
      oldScreenRef.current = null;
    });
  }, [sharing, streamVersion, updateTracks]);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream, connected, phase]);

  // Vidéo de l'interlocuteur figée (plus aucune image reçue) : on affiche son avatar plutôt que la dernière image.
  // Pas pendant un partage d'écran, dont les images n'arrivent que lorsque le contenu change.
  const partnerSharing = call.partnerMedia.sharing;
  useEffect(() => {
    setRemoteFrozen(false);
    const el = remoteRef.current;
    if (simulated || partnerSharing || !remoteStream || !el?.getVideoPlaybackQuality) return;
    let last = el.getVideoPlaybackQuality().totalVideoFrames;
    let still = 0;
    const timer = setInterval(() => {
      const frames = el.getVideoPlaybackQuality().totalVideoFrames;
      still = frames === last ? still + 1 : 0;
      last = frames;
      setRemoteFrozen(still >= 2);
    }, 1000);
    return () => clearInterval(timer);
  }, [remoteStream, partnerSharing, simulated, connected, phase]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = mic));
  }, [mic, streamVersion]);
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = cam));
  }, [cam, streamVersion]);

  // Chronomètre de l'appel
  useEffect(() => {
    if (phase !== "appel" || !connected) return;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [phase, connected]);

  // Indicateur « parle… » : niveau sonore réel de l'interlocuteur
  useEffect(() => {
    if (simulated || !remoteStream?.getAudioTracks().length) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(remoteStream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += (v - 128) ** 2;
      setSpeaking(Math.sqrt(sum / data.length) > 6);
    }, 200);
    return () => {
      clearInterval(timer);
      void ctx.close();
    };
  }, [remoteStream, simulated]);

  // Démo : le membre fictif rejoint puis parle par moments
  useEffect(() => {
    if (phase !== "appel" || !simulated) return;
    const join = setTimeout(() => setBotHere(true), 2200);
    const talk = setInterval(() => setSpeaking((v) => (Math.random() > 0.45 ? !v : v)), 1400);
    return () => {
      clearTimeout(join);
      clearInterval(talk);
    };
  }, [phase, simulated]);

  if (!partner || !me) return notFound();

  const conv = conversationBetween(state, me.id, partner.id);
  const isMentee = session ? session.menteeId === me.id : me.role === "mentore";
  const first = partner.name.split(" ")[0];
  // « d'Aïssatou » mais « de Mariama »
  const ofFirst = /^[aeiouyhâàéèêîïôû]/i.test(first) ? `d'${first}` : `de ${first}`;
  const jitsiRoom = `Lirel-${(session?.id ?? id).replace(/[^a-zA-Z0-9]/g, "")}`;
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const partnerCam = simulated ? false : call.partnerMedia.sharing || (call.partnerMedia.cam && !remoteFrozen);
  const partnerMic = simulated ? true : call.partnerMedia.mic;

  const toggleShare = async () => {
    if (sharing) {
      // Arrêté après le retour de la caméra (cf. effet d'envoi des pistes).
      oldScreenRef.current = screenRef.current;
      screenRef.current = null;
      setSharing(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenRef.current = s;
      s.getVideoTracks()[0].addEventListener("ended", () => {
        screenRef.current = null;
        setSharing(false);
      });
      setSharing(true);
    } catch {
      /* partage annulé */
    }
  };

  const hangUp = () => {
    stopAll();
    if (session && session.status === "planifiee") completeSession(session.id, notes.trim() || undefined);
    setPhase("fin");
  };

  const finish = () => {
    if (session && notes.trim() !== (session.notes ?? "")) saveSessionNotes(session.id, notes.trim());
    if (session && isMentee && rating) rateSession(session.id, rating, review);
    router.push(session ? "/seances" : `/messages?avec=${partner.id}`);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#141b26] text-creme">
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <LogoMark className="h-7 w-7" pageColor="#F8F5EF" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{session?.topic ?? `Appel avec ${partner.name}`}</p>
          <p className="text-xs text-creme/50">
            {session ? formatDate(session.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + ` · ${session.duration} min` : "Appel direct"}
          </p>
        </div>
        {phase === "appel" && connected && (
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> {time}
          </span>
        )}
        {phase !== "appel" && (
          <Link href={session ? "/seances" : "/messages"} className="rounded-full p-2 text-creme/70 hover:bg-white/10" aria-label="Quitter">
            <X size={20} />
          </Link>
        )}
      </header>

      {phase === "attente" && (
        <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 pb-10 lg:flex-row lg:gap-14">
          <div className="w-full max-w-2xl">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1e2733]">
              <video ref={videoRef} autoPlay playsInline muted className={cn("h-full w-full -scale-x-100 object-cover", (!cam || camError) && "hidden")} />
              {(!cam || camError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-16 text-center">
                  <Avatar user={me} size="xl" />
                  <p className="text-xs text-creme/50">{camError ? "Caméra indisponible" : "Caméra coupée"}</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                <RoundButton on={mic} onClick={() => setMic(!mic)} label={mic ? "Couper le micro" : "Activer le micro"} icon={mic ? Mic : MicOff} />
                <RoundButton on={cam} onClick={() => setCam(!cam)} label={cam ? "Couper la caméra" : "Activer la caméra"} icon={cam ? Video : VideoOff} />
              </div>
            </div>
            {(camError || micError) && (
              <div role="alert" className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm sm:flex-row sm:items-start">
                <VideoOff size={17} className="mt-0.5 hidden shrink-0 text-terracotta-light sm:block" />
                <div className="min-w-0 flex-1 space-y-1 leading-relaxed">
                  {camError && <p className="text-creme/80">{camError}</p>}
                  {micError && <p className="text-terracotta-light">{micError}</p>}
                </div>
                <button onClick={() => setCamAttempt((n) => n + 1)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-creme hover:bg-white/15">
                  <RefreshCw size={15} /> Réessayer
                </button>
              </div>
            )}
          </div>
          <div className="max-w-sm text-center lg:text-left">
            <span className="relative inline-block">
              <Avatar user={partner} size="lg" />
              {call.partnerPresent && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#141b26] bg-sauge" />}
            </span>
            <h1 className="mt-4 font-serif text-3xl leading-tight">{call.partnerPresent ? `${first} vous attend` : `Prêt·e à rejoindre ${first} ?`}</h1>
            <p className="mt-2 text-sm text-creme/60">
              {call.partnerPresent
                ? `${first} est déjà dans la salle. Rejoignez-la pour démarrer l'échange.`
                : `Vérifiez votre cadrage et votre son. En rejoignant, ${first} sera prévenu·e. Aucune application à installer.`}
            </p>
            <button onClick={() => setPhase("appel")} className={btn.accent + " mt-6 px-8 py-3 text-base"}>
              <Video size={18} /> {call.partnerPresent ? "Rejoindre maintenant" : "Rejoindre la séance"}
            </button>
            <a href={`https://meet.jit.si/${jitsiRoom}`} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-creme/50 hover:text-creme lg:justify-start">
              <ExternalLink size={13} /> Solution de secours : ouvrir la salle sur Jitsi Meet
            </a>
          </div>
        </main>
      )}

      {phase === "appel" && (
        <>
          <main className="relative flex min-h-0 flex-1 gap-4 px-3 pb-3 sm:px-6">
            <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#1e2733]">
              {/* Vidéo et son de l'interlocuteur : l'élément reste monté pour garder l'audio caméra coupée. */}
              {!simulated && (
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className={cn("absolute inset-0 h-full w-full", call.partnerMedia.sharing ? "object-contain" : "object-cover", !(connected && partnerCam) && "invisible")}
                />
              )}

              {connected && !partnerCam && (
                <div className="flex flex-col items-center gap-4">
                  <div className={cn("rounded-full p-1.5 transition", speaking ? "bg-terracotta/60 ring-8 ring-terracotta/20" : "bg-transparent")}>
                    <Avatar user={partner} size="xl" className="h-36 w-36 text-5xl" />
                  </div>
                  <p className="font-serif text-2xl">{partner.name}</p>
                  <p className="text-xs text-creme/50">{speaking ? "parle…" : "caméra désactivée"}</p>
                </div>
              )}

              {!connected && (
                <div className="flex flex-col items-center gap-3 px-6 text-center" role="status">
                  <Avatar user={partner} size="xl" className={cn(!call.declined && "animate-pulse", "opacity-70")} />
                  {call.declined ? (
                    <>
                      <p className="text-creme/80">{first} ne peut pas répondre pour le moment.</p>
                      <p className="text-xs text-creme/50">Laissez-lui un message, ou patientez : la salle reste ouverte.</p>
                    </>
                  ) : call.connection === "instable" ? (
                    <p className="flex items-center gap-2 text-creme/70">
                      <WifiOff size={16} /> Connexion interrompue, reconnexion…
                    </p>
                  ) : call.partnerPresent || call.connection === "connexion" ? (
                    <p className="flex items-center gap-2 text-creme/70">
                      <Loader2 size={16} className="animate-spin" /> Connexion avec {first}…
                    </p>
                  ) : (
                    <>
                      <p className="text-creme/70">En attente {ofFirst}…</p>
                      <p className="text-xs text-creme/50">{simulated ? "" : `${first} a reçu une sonnerie sur Lirel.`}</p>
                    </>
                  )}
                </div>
              )}

              {connected && (
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs backdrop-blur">
                  {!partnerMic && <MicOff size={12} className="text-red-400" />}
                  {partner.name}
                  {call.partnerMedia.sharing && " · présente son écran"}
                  {!simulated && speaking && partnerCam && <span className="h-2 w-2 rounded-full bg-sauge" aria-label="parle" />}
                </span>
              )}

              {(camError || micError) && (
                <div role="alert" className="absolute left-1/2 top-4 z-10 flex w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl bg-black/60 px-4 py-3 text-sm text-creme backdrop-blur">
                  <VideoOff size={17} className="mt-0.5 shrink-0 text-terracotta-light" />
                  <p className="min-w-0 flex-1 leading-snug">{micError && !camError ? micError : camError}</p>
                  <button onClick={() => setCamAttempt((n) => n + 1)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium hover:bg-white/25">
                    <RefreshCw size={13} /> Réessayer
                  </button>
                </div>
              )}

              {/* Vignette personnelle */}
              <div className="absolute bottom-4 right-4 aspect-video w-36 overflow-hidden rounded-2xl bg-[#2b3644] shadow-xl ring-1 ring-white/10 sm:w-56">
                <video ref={videoRef} autoPlay playsInline muted className={cn("h-full w-full object-cover", !sharing && "-scale-x-100", ((!cam && !sharing) || (camError && !sharing)) && "hidden")} />
                {((!cam && !sharing) || (camError && !sharing)) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar user={me} size="lg" />
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[0.65rem] text-creme/80">
                  {!mic && <MicOff size={11} />} Vous{sharing && " · écran partagé"}
                </span>
              </div>
            </div>

            {panel && (
              <aside className="absolute inset-3 z-10 flex flex-col rounded-2xl bg-creme text-nuit sm:static sm:w-80 sm:shrink-0">
                <div className="flex items-center justify-between border-b border-beige px-4 py-3">
                  <p className="font-serif text-lg">{panel === "chat" ? "Discussion" : "Notes de séance"}</p>
                  <button onClick={() => setPanel(null)} className="rounded-full p-1.5 hover:bg-beige" aria-label="Fermer le panneau">
                    <X size={18} />
                  </button>
                </div>
                {panel === "chat" ? (
                  <>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                      {(conv?.messages ?? []).slice(-12).map((m) =>
                        m.system ? null : (
                          <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.userId === me.id ? "ml-auto bg-nuit text-creme" : "bg-beige/70")}>
                            {m.text}
                          </div>
                        ),
                      )}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (text.trim()) sendMessage(partner.id, text.trim());
                        setText("");
                      }}
                      className="flex gap-2 border-t border-beige p-3"
                    >
                      <input value={text} onChange={(e) => setText(e.target.value)} className={field + " py-2"} placeholder="Un lien, une remarque…" aria-label="Message" />
                      <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta text-white" aria-label="Envoyer">
                        <Send size={16} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col p-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={field + " min-h-0 flex-1 resize-none text-sm"}
                      placeholder={"Conseils reçus, décisions prises, prochaines étapes…"}
                      aria-label="Notes de séance"
                    />
                    <p className="mt-2 text-xs text-nuit-500">Les notes sont enregistrées avec la séance et visibles dans votre agenda.</p>
                  </div>
                )}
              </aside>
            )}
          </main>

          <footer className="flex items-center justify-center gap-3 px-4 pb-6 pt-2">
            <RoundButton on={mic} onClick={() => setMic(!mic)} label={mic ? "Couper le micro" : "Activer le micro"} icon={mic ? Mic : MicOff} />
            <RoundButton on={cam} onClick={() => setCam(!cam)} label={cam ? "Couper la caméra" : "Activer la caméra"} icon={cam ? Video : VideoOff} />
            <RoundButton on={!sharing} onClick={toggleShare} label={sharing ? "Arrêter le partage" : "Partager mon écran"} icon={MonitorUp} className="hidden sm:flex" />
            <RoundButton on={panel !== "chat"} onClick={() => setPanel(panel === "chat" ? null : "chat")} label="Discussion" icon={MessageSquare} />
            <RoundButton on={panel !== "notes"} onClick={() => setPanel(panel === "notes" ? null : "notes")} label="Notes" icon={NotebookPen} />
            <button onClick={hangUp} className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 font-semibold text-white transition hover:bg-red-700" aria-label="Raccrocher">
              <PhoneOff size={20} /> <span className="hidden sm:inline">Terminer</span>
            </button>
          </footer>
        </>
      )}

      <Modal open={phase === "fin"} onClose={finish} title="Séance terminée">
        <p className="-mt-2 text-sm text-encre">
          {seconds > 0 ? `Merci ! Vous avez échangé ${Math.max(1, Math.round(seconds / 60))} minute${seconds >= 120 ? "s" : ""} avec ${partner.name}.` : `L'appel avec ${partner.name} est terminé.`}
        </p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">Ce que je retiens de la séance</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={field + " resize-none"} placeholder="Les conseils clés et mes prochaines étapes" />
        </label>
        {session && isMentee && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium">Comment s&apos;est passée la séance ?</p>
            <StarInput value={rating} onChange={setRating} />
            <textarea rows={2} value={review} onChange={(e) => setReview(e.target.value)} className={field + " resize-none"} placeholder="Un mot pour votre mentor (facultatif)" />
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button onClick={finish} className={btn.accent}>
            Enregistrer et fermer
          </button>
        </div>
      </Modal>
    </div>
  );
}

function RoundButton({ on, onClick, label, icon: Icon, className }: { on: boolean; onClick: () => void; label: string; icon: typeof Mic; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("flex h-12 w-12 items-center justify-center rounded-full transition", on ? "bg-white/15 text-creme hover:bg-white/25" : "bg-creme text-nuit", className)}
    >
      <Icon size={20} />
    </button>
  );
}

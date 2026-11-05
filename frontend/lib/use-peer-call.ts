"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendSignal, type CallEvent, type CallSignal } from "./realtime";
import { useStore } from "./store";

/**
 * Appel vidéo pair-à-pair (WebRTC) entre deux membres.
 *
 * Le serveur MonMentor ne fait que relayer la signalisation (offre, réponse, candidats ICE) par le flux temps réel ;
 * l'audio et la vidéo circulent directement entre les navigateurs, chiffrés (DTLS-SRTP).
 *
 * Protocole : chaque participant qui entre dans l'appel envoie « hello ». Le membre dont l'identifiant est le plus
 * petit est l'appelant : c'est toujours lui qui crée l'offre, ce qui évite les collisions. Chaque offre porte un
 * numéro de génération ; réponses et candidats d'une génération périmée sont ignorés.
 */

export type MediaState = { mic: boolean; cam: boolean; sharing: boolean };
export type Connection = "attente" | "connexion" | "connecte" | "instable";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  // Relais TURN facultatif, indispensable derrière certains réseaux d'entreprise ou mobiles.
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{ urls: process.env.NEXT_PUBLIC_TURN_URL.split(","), username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }]
    : []),
];

/** Délai entre deux sonneries tant que l'interlocuteur n'a pas rejoint. */
const RING_EVERY_MS = 12_000;

type Options = {
  /** L'utilisateur est entré dans l'appel (après la salle d'attente) */
  active: boolean;
  /** L'utilisateur est en salle d'attente : on vérifie si l'autre est déjà dans l'appel */
  lobby: boolean;
  room: string;
  meId: string;
  partnerId: string;
  /** Pistes locales actuelles (caméra ou écran partagé, micro) */
  getTracks: () => { audio: MediaStreamTrack | null; video: MediaStreamTrack | null };
  media: MediaState;
  /** Sujet affiché dans la sonnerie de l'interlocuteur */
  topic?: string;
};

export function usePeerCall({ active, lobby, room, meId, partnerId, getTracks, media, topic }: Options) {
  const { onCall } = useStore();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [partnerMedia, setPartnerMedia] = useState<MediaState>({ mic: true, cam: true, sharing: false });
  const [connection, setConnection] = useState<Connection>("attente");
  const [declined, setDeclined] = useState(false);

  const caller = meId < partnerId;
  const sid = useRef(Math.random().toString(36).slice(2));
  const pc = useRef<RTCPeerConnection | null>(null);
  const gen = useRef<string | null>(null);
  const offerCount = useRef(0);
  const remoteSid = useRef<string | null>(null);
  const offeredTo = useRef<string | null>(null);
  const iceBuffer = useRef(new Map<string, RTCIceCandidateInit[]>());
  const activeRef = useRef(active);
  const mediaRef = useRef(media);
  const getTracksRef = useRef(getTracks);

  useEffect(() => {
    activeRef.current = active;
    mediaRef.current = media;
    getTracksRef.current = getTracks;
  });

  const send = useCallback(
    (kind: CallSignal, payload: Record<string, unknown> = {}, keepalive = false) =>
      partnerId && meId ? sendSignal(partnerId, room, kind, { sid: sid.current, ...payload }, keepalive) : Promise.resolve(),
    [meId, partnerId, room],
  );

  /** Branche les pistes locales sur les émetteurs audio / vidéo de la connexion. */
  const attachTracks = useCallback(async () => {
    const conn = pc.current;
    if (!conn) return;
    const { audio, video } = getTracksRef.current();
    await Promise.all(
      conn.getTransceivers().map((t) => {
        const kind = t.receiver.track.kind;
        if (t.direction === "inactive" || t.direction === "recvonly") t.direction = "sendrecv";
        return t.sender.replaceTrack(kind === "audio" ? audio : video).catch(() => undefined);
      }),
    );
  }, []);

  const closePc = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    gen.current = null;
    setRemoteStream(null);
  }, []);

  const newPc = useCallback(
    (generation: string) => {
      closePc();
      const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.current = conn;
      gen.current = generation;
      setConnection("connexion");

      conn.ontrack = () => {
        if (pc.current !== conn) return;
        setRemoteStream(new MediaStream(conn.getReceivers().map((r) => r.track)));
      };
      conn.onicecandidate = (e) => {
        if (e.candidate && pc.current === conn) void send("ice", { gen: generation, candidate: e.candidate.toJSON() });
      };
      conn.onconnectionstatechange = () => {
        if (pc.current !== conn) return;
        const s = conn.connectionState;
        if (s === "connected") setConnection("connecte");
        else if (s === "disconnected") setConnection("instable");
        else if (s === "failed") {
          setConnection("instable");
          // Le réseau a changé (wifi → 4G…) : l'appelant renégocie.
          if (caller && remoteSid.current) {
            offeredTo.current = null;
            void makeOffer();
          }
        }
      };
      return conn;
    },
    // makeOffer est déclarée plus bas et ne dépend que de refs stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caller, closePc, send],
  );

  const flushIce = useCallback(async (generation: string) => {
    const conn = pc.current;
    const list = iceBuffer.current.get(generation) ?? [];
    iceBuffer.current.delete(generation);
    for (const c of list) await conn?.addIceCandidate(c).catch(() => undefined);
  }, []);

  /** Appelant : nouvelle connexion et nouvelle offre pour l'interlocuteur courant. */
  const makeOffer = useCallback(async () => {
    const target = remoteSid.current;
    if (!target || offeredTo.current === target) return;
    offeredTo.current = target;
    const generation = `${sid.current}-${++offerCount.current}`;
    const conn = newPc(generation);
    conn.addTransceiver("audio", { direction: "sendrecv" });
    conn.addTransceiver("video", { direction: "sendrecv" });
    void attachTracks();
    const offer = await conn.createOffer();
    if (pc.current !== conn) return;
    await conn.setLocalDescription(offer);
    void send("offer", { gen: generation, to: target, sdp: conn.localDescription?.toJSON() });
  }, [attachTracks, newPc, send]);

  /* ---------- Réception des signaux ---------- */

  useEffect(() => {
    return onCall(async (e: CallEvent) => {
      if (e.from !== partnerId || e.room !== room) return;
      const p = e.payload as { sid?: string; reply?: boolean; waiting?: boolean; gen?: string; to?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } & Partial<MediaState>;

      switch (e.kind) {
        case "ring":
          setPartnerPresent(true);
          break;
        case "decline":
          setDeclined(true);
          break;
        case "cancel":
        case "leave":
          setPartnerPresent(false);
          if (p.sid === remoteSid.current) {
            remoteSid.current = null;
            offeredTo.current = null;
            closePc();
            setConnection("attente");
          }
          break;
        case "media":
          setPartnerMedia({ mic: p.mic ?? true, cam: p.cam ?? true, sharing: p.sharing ?? false });
          break;
        case "hello": {
          setPartnerPresent(true);
          setDeclined(false);
          if (!activeRef.current) break;
          // L'autre est seulement en salle d'attente : on lui signale notre présence, sans négocier.
          if (p.waiting) {
            void send("hello", { reply: true });
            break;
          }
          if (!p.reply) {
            void send("hello", { reply: true });
            void send("media", mediaRef.current);
          }
          if (p.sid !== remoteSid.current) {
            // Nouvel arrivant (ou rechargement de page) : on repart d'une connexion neuve.
            remoteSid.current = p.sid ?? null;
            offeredTo.current = null;
            if (!caller) closePc();
          }
          if (caller) void makeOffer();
          break;
        }
        case "offer": {
          if (!activeRef.current || caller || !p.gen || !p.sdp || p.to !== sid.current) break;
          remoteSid.current = p.sid ?? null;
          setPartnerPresent(true);
          const conn = newPc(p.gen);
          await conn.setRemoteDescription(p.sdp);
          void attachTracks();
          const answer = await conn.createAnswer();
          if (pc.current !== conn) break;
          await conn.setLocalDescription(answer);
          void send("answer", { gen: p.gen, sdp: conn.localDescription?.toJSON() });
          await flushIce(p.gen);
          break;
        }
        case "answer": {
          const conn = pc.current;
          if (!conn || !p.sdp || p.gen !== gen.current || conn.signalingState !== "have-local-offer") break;
          await conn.setRemoteDescription(p.sdp);
          await flushIce(p.gen);
          break;
        }
        case "ice": {
          if (!p.gen || !p.candidate) break;
          const conn = pc.current;
          if (conn && p.gen === gen.current && conn.remoteDescription) await conn.addIceCandidate(p.candidate).catch(() => undefined);
          else {
            // Candidat arrivé avant l'offre / la réponse correspondante : mis de côté.
            const list = iceBuffer.current.get(p.gen) ?? [];
            list.push(p.candidate);
            iceBuffer.current.set(p.gen, list);
          }
          break;
        }
      }
    });
  }, [onCall, partnerId, room, caller, send, closePc, newPc, attachTracks, makeOffer, flushIce]);

  /* ---------- Cycle de vie ---------- */

  // En salle d'attente : on demande discrètement si l'interlocuteur est déjà dans l'appel.
  useEffect(() => {
    if (lobby) void send("hello", { waiting: true });
  }, [lobby, send]);

  // Entrée dans l'appel : annonce, sonnerie tant que l'autre n'est pas là, départ propre.
  useEffect(() => {
    if (!active) return;
    void send("hello");
    void send("media", mediaRef.current);
    const leave = () => void send("leave", {}, true);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
      remoteSid.current = null;
      offeredTo.current = null;
      closePc();
      setConnection("attente");
    };
  }, [active, send, closePc]);

  const connected = connection === "connecte";
  useEffect(() => {
    if (!active || connected || declined) return;
    const ring = () => void send("ring", { topic });
    ring();
    const timer = setInterval(ring, RING_EVERY_MS);
    return () => clearInterval(timer);
  }, [active, connected, declined, send, topic]);

  // Micro / caméra / partage d'écran : l'autre adapte son affichage.
  useEffect(() => {
    if (active) void send("media", media);
  }, [active, media, send]);

  return {
    remoteStream,
    partnerPresent,
    partnerMedia,
    connection,
    declined,
    /** À appeler quand la caméra, le micro ou le partage d'écran changent de piste. */
    updateTracks: attachTracks,
  };
}

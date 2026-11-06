/** Client HTTP de l'API MonMentor (backend NestJS). */

/** Adresse de l'API : absolue en développement (autre port), relative (« /api ») en production derrière Caddy. */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

/** Évite la page d'avertissement que ngrok (offre gratuite) renvoie à la place de la réponse de l'API. */
export const BASE_HEADERS: Record<string, string> = /\.ngrok(-free)?\.(app|dev|io)/.test(API_URL) ? { "ngrok-skip-browser-warning": "1" } : {};

const TOKEN_KEY = "lirel:token";

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* navigation privée : la session ne survivra pas au rechargement */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* rien à faire */
    }
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const OFFLINE_MESSAGE = "Impossible de joindre le serveur MonMentor. Vérifiez que l'API est démarrée (npm run dev dans backend/).";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** URL utilisable par une balise <img> : les fichiers servis par l'API (« /users/… ») sont préfixés par son adresse. */
export function apiAsset(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export async function api<T = void>(path: string, opts: { method?: Method; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  // FormData : le navigateur fixe lui-même le Content-Type (multipart avec sa frontière).
  const form = opts.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        ...BASE_HEADERS,
        ...(opts.body !== undefined && !form ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : form ? (opts.body as FormData) : JSON.stringify(opts.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string | string[] };
      if (data.message) message = Array.isArray(data.message) ? data.message[0] : data.message;
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

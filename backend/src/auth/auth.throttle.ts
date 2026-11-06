import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Limite de tentatives sur les routes d'authentification.
 * La clé combine l'adresse IP et l'e-mail visé : on freine la force brute sur un compte
 * sans bloquer toute une salle qui partage la même connexion (Wi-Fi d'un événement, NAT mobile).
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = (req.ip as string | undefined) ?? "inconnue";
    const body = req.body as { email?: unknown } | undefined;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    return `${ip}:${email}`;
  }
}

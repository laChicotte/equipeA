import { CanActivate, createParamDecorator, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export interface AuthUser {
  id: string;
}

type AuthRequest = Request & { user?: AuthUser };

const PUBLIC_KEY = "isPublic";
const OPTIONAL_KEY = "authOptional";

/** Route accessible sans jeton. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
/** Route publique qui exploite le jeton s'il est présent. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_KEY, true);

/** Identifiant de l'utilisateur connecté (garanti sur une route protégée). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthRequest>().user?.id);

/** Garde globale : toutes les routes exigent un JWT valide, sauf @Public() / @OptionalAuth(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_KEY, targets);

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) {
      if (optional) return true;
      throw new UnauthorizedException("Authentification requise.");
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.user = { id: payload.sub };
      return true;
    } catch {
      if (optional) return true;
      throw new UnauthorizedException("Session expirée, veuillez vous reconnecter.");
    }
  }
}

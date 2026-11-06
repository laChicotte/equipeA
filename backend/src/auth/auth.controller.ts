import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "./auth.guard";
import { LoginDto, RegisterDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { AuthThrottlerGuard } from "./auth.throttle";

const MINUTE = 60_000;

@ApiTags("Authentification")
@Controller("auth")
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Connexion : renvoie un jeton JWT. 10 essais par minute pour un même e-mail depuis une même adresse. */
  @Public()
  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Création d'un compte mentor ou mentoré : renvoie un jeton JWT. */
  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 10 * MINUTE } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
}

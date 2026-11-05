import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "./auth.guard";
import { LoginDto, RegisterDto } from "./auth.dto";
import { AuthService } from "./auth.service";

@ApiTags("Authentification")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Connexion : renvoie un jeton JWT. */
  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Création d'un compte mentor ou mentoré : renvoie un jeton JWT. */
  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
}

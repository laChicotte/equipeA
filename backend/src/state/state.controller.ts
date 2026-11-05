import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, OptionalAuth } from "../auth/auth.guard";
import { StateService } from "./state.service";

@ApiTags("État")
@ApiBearerAuth()
@Controller("state")
export class StateController {
  constructor(private readonly state: StateService) {}

  /**
   * Toutes les données utiles à l'application en une requête.
   * Sans jeton : les mentors, les avis, les ressources et les opportunités (pages publiques).
   */
  @OptionalAuth()
  @Get()
  get(@CurrentUser() me?: string) {
    return this.state.snapshot(me ?? null);
  }
}

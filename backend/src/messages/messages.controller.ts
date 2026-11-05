import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import { CurrentUser } from "../auth/auth.guard";
import { DemoBotService } from "../demo/demo-bot.service";
import { MessagesService } from "./messages.service";

class SendMessageDto {
  /** Destinataire */
  @IsString()
  to: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text: string;
}

@ApiTags("Messagerie")
@ApiBearerAuth()
@Controller()
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly bot: DemoBotService,
  ) {}

  /** Envoie un message (crée la conversation si besoin) et renvoie son identifiant. */
  @Post("messages")
  async send(@CurrentUser() me: string, @Body() dto: SendMessageDto) {
    const conversationId = await this.messages.send(me, dto.to, dto.text.trim());
    await this.bot.onMessage(me, dto.to, dto.text);
    return { conversationId };
  }

  @Post("conversations/:id/typing")
  @HttpCode(204)
  typing(@CurrentUser() me: string, @Param("id") id: string) {
    return this.messages.typing(me, id);
  }

  @Post("conversations/:id/read")
  @HttpCode(204)
  read(@CurrentUser() me: string, @Param("id") id: string) {
    return this.messages.markRead(me, id);
  }
}

import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";
import { CurrentUser } from "../auth/auth.guard";
import { AssistantService } from "./assistant.service";

class TurnDto {
  @IsIn(["user", "assistant"]) role: "user" | "assistant";
  @IsString() @MinLength(1) @MaxLength(4000) content: string;
}

class ChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];
}

@ApiTags("Assistant")
@ApiBearerAuth()
@Controller("assistant")
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  /** Indique au front si l'assistant est disponible (clé configurée). */
  @Get("status")
  status() {
    return { enabled: this.assistant.enabled };
  }

  @Post("chat")
  @HttpCode(200)
  chat(@CurrentUser() me: string, @Body() dto: ChatDto) {
    return this.assistant.chat(me, dto.messages);
  }
}

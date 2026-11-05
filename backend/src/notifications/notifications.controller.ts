import { Controller, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.guard";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post("read-all")
  @HttpCode(204)
  async readAll(@CurrentUser() me: string) {
    await this.notifications.markAllRead(me);
  }

  @Post(":id/read")
  @HttpCode(204)
  async read(@CurrentUser() me: string, @Param("id") id: string) {
    await this.notifications.markRead(me, id);
  }
}

import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "./prisma/prisma.service";
import { JwtAuthGuard } from "./auth/auth.guard";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { NotificationsService } from "./notifications/notifications.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { StateService } from "./state/state.service";
import { StateController } from "./state/state.controller";
import { MessagesService } from "./messages/messages.service";
import { MessagesController } from "./messages/messages.controller";
import { DemoBotService } from "./demo/demo-bot.service";
import { DemoController } from "./demo/demo.controller";
import { MentorshipsController } from "./mentorships/mentorships.controller";
import { SessionsController } from "./sessions/sessions.controller";
import { SessionsService } from "./sessions/sessions.service";
import { GoalsController } from "./goals/goals.controller";
import { LibraryController } from "./library/library.controller";
import { UsersController } from "./users/users.controller";
import { RealtimeService } from "./realtime/realtime.service";
import { RealtimeController } from "./realtime/realtime.controller";
import { CallsController } from "./realtime/calls.controller";
import { AssistantController } from "./assistant/assistant.controller";
import { AssistantService } from "./assistant/assistant.service";

const secret = process.env.JWT_SECRET;
if (!secret || secret === "change-moi") throw new Error("JWT_SECRET doit être défini (voir backend/.env.example).");

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as "7d" },
    }),
  ],
  controllers: [
    AuthController,
    StateController,
    UsersController,
    MentorshipsController,
    MessagesController,
    SessionsController,
    GoalsController,
    LibraryController,
    NotificationsController,
    DemoController,
    RealtimeController,
    CallsController,
    AssistantController,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, AuthService, StateService, NotificationsService, MessagesService, DemoBotService, RealtimeService, SessionsService, AssistantService],
})
export class AppModule {}

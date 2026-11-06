import "./env";
import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Derrière Caddy (réseau Docker privé) : l'IP réelle du client vient de X-Forwarded-For.
  // On ne fait confiance qu'aux proxys locaux ou privés, jamais à un en-tête envoyé depuis Internet.
  app.set("trust proxy", "loopback, uniquelocal");
  const port = Number(process.env.PORT ?? 4000);

  app.setGlobalPrefix("api");
  // Le navigateur envoie l'origine sans « / » final : on le retire pour qu'une URL copiée telle quelle fonctionne.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map((o) => o.trim().replace(/\/+$/, ""));
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  // Documentation interactive : en développement, ou en production si SWAGGER=true.
  const docs = process.env.NODE_ENV !== "production" || process.env.SWAGGER === "true";
  if (docs) {
    const config = new DocumentBuilder()
      .setTitle("API MonMentor")
      .setDescription("Plateforme de mentorat « Talents connect » : mise en relation, séances, messagerie, objectifs, ressources et opportunités.")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(port);
  Logger.log(`API prête sur http://localhost:${port}/api${docs ? ` · documentation : http://localhost:${port}/docs` : ""}`, "MonMentor");
}

void bootstrap();

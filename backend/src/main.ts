import "./env";
import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  app.setGlobalPrefix("api");
  // Le navigateur envoie l'origine sans « / » final : on le retire pour qu'une URL copiée telle quelle fonctionne.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map((o) => o.trim().replace(/\/+$/, ""));
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle("API Lirel")
    .setDescription("Plateforme de mentorat « Talents connectés » : mise en relation, séances, messagerie, objectifs, ressources et opportunités.")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));

  await app.listen(port);
  Logger.log(`API prête sur http://localhost:${port}/api · documentation : http://localhost:${port}/docs`, "Lirel");
}

void bootstrap();

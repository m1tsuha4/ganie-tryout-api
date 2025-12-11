import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  DocumentBuilder,
  SwaggerModule,
  SwaggerCustomOptions,
} from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["log", "error", "warn", "fatal"],
  });
  app.enableCors({
    origin: "*",
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Authorization",
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useStaticAssets(join(__dirname, "..", "uploads"), {
    prefix: "/uploads/",
  });

  const config = new DocumentBuilder()
    .setTitle("Ganie Tryout API")
    .setDescription("Ganie Tryout API documentation")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description:
          "Enter JWT token (dapatkan dari endpoint /auth/admin atau /auth/login)",
        in: "header",
      },
      "bearer", // Default name untuk @ApiBearerAuth()
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const swaggerCustomOptions: SwaggerCustomOptions = {
    customSiteTitle: "Ganie Tryout API Docs",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.3.2/swagger-ui-bundle.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.3.2/swagger-ui-standalone-preset.js",
    ],
    customCssUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.3.2/swagger-ui.css",
  };

  SwaggerModule.setup("api", app, document, swaggerCustomOptions);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

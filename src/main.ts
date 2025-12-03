import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule, SwaggerCustomOptions } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'fatal'],
  });

  const config = new DocumentBuilder()
    .setTitle('Ganie Tryout API')
    .setDescription('Ganie Tryout API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const swaggerCustomOptions: SwaggerCustomOptions = {
    customSiteTitle: 'Ganie Tryout API Docs',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.3.2/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.3.2/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.3.2/swagger-ui.css',
  };

  SwaggerModule.setup('api', app, document, swaggerCustomOptions);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

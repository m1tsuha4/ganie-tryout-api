import { Injectable } from '@nestjs/common';
import { createLogger, transports, format, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as winston from 'winston';

@Injectable()
export class WinstonLoggerService {
  private logger: Logger;

  constructor() {
    const isVercel = !!process.env.VERCEL;

    const loggerTransports: winston.transport[] = [
      new transports.Console(),
    ];

    if (!isVercel) {
      loggerTransports.push(
        new DailyRotateFile({
          filename: 'logs/%DATE%-app.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      );
    }

    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}] ${message}`;
        }),
      ),
      transports: loggerTransports,
    });
  }

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace: string) {
    this.logger.error(`${message} - ${trace}`);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
}

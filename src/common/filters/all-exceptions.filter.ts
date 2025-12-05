import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { fail } from "../utils/response.util";
import { ZodError } from "zod";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any;

    if (exception instanceof ZodError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      const errors: Record<string, string> = {};

      exception.issues.forEach((issue) => {
        const field = issue.path.join(".") || "global";
        errors[field] = issue.message;
      });

      body = {
        success: false,
        message: "Validation error",
        errors,
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (
        typeof res === "object" &&
        res !== null &&
        "success" in (res as any)
      ) {
        body = res;
      } else {
        const message =
          (res as any)?.message ||
          (typeof res === "string" ? res : "Unexpected error");

        body = fail(
          Array.isArray(message) ? message[0] : message,
          "HTTP_EXCEPTION",
        );
      }
    } else {
      console.error("Unexpected error:", exception);
      body = fail("Internal server error", "INTERNAL_SERVER_ERROR");
    }

    response.status(status).json(body);
  }
}

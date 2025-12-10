import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Cek apakah user adalah admin
    if (user.type !== "admin") {
      throw new ForbiddenException(
        "Access denied. Admin privileges required.",
      );
    }

    return true;
  }
}


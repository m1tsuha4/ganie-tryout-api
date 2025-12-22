import { Body, Controller, Post, UseGuards, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { LoginDto, LoginSchema } from "./dto/login.dto";
import { CreateUserDto, CreateUserSchema } from "src/user/dto/create-user.dto";
import { UserService } from "src/user/user.service";
import { JwtAuthGuard } from "./guard/jwt-guard.auth";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import { ResponseUserDto } from "src/user/dto/response-user.dto";
import { ResponseLoginUserDto } from "./dto/response-login-user.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}
  @Post("register")
  @ApiBody({
    description: "Register user",
    schema: {
      example: {
        username: "user001",
        name: "User 001",
        email: "user001@example.com",
        password: "StrongPassword123!",
      },
    },
  })
  @ApiCreatedResponse({
    description: "User registered successfully",
    type: ResponseUserDto,
  })
  registerUser(
    @Body(new ZodValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto,
  ) {
    return this.userService.create(createUserDto);
  }

  @Post("login")
  @ApiBody({
    description: "Login user",
    schema: {
      example: {
        email: "user001@example.com",
        password: "StrongPassword123!",
      },
    },
  })
  @ApiCreatedResponse({
    description: "User logged in successfully",
    type: ResponseLoginUserDto,
  })
  loginUser(@Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto) {
    return this.authService.loginUser(loginDto);
  }

  @Post("verify-token")
  @ApiBody({
    description: "Verify login token",
    schema: {
      example: {
        token: "eee65650-982c-4bc1-9685-ffe860e8ab8a",
      },
    },
  })
  verifyLoginToken(@Body("token") token: string) {
    return this.authService.verifyLoginToken(token);
  }

  @Post("admin")
  @ApiBody({
    description: "Login admin",
    schema: {
      example: {
        email: "admin002@example.com",
        password: "StrongPassword123!",
      },
    },
  })
  @ApiCreatedResponse({
    description: "Admin logged in successfully",
    type: ResponseLoginUserDto,
  })
  loginAdmin(@Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto) {
    return this.authService.loginAdmin(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "User logged out successfully",
  })
  @Post("logout")
  logout(@Request() req) {
    return this.authService.logout(req.user);
  }
}

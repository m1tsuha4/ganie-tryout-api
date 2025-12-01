import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { LoginDto, LoginSchema } from './dto/login.dto';
import { CreateUserDto, CreateUserSchema } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { JwtAuthGuard } from './guard/jwt-guard.auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,private readonly userService: UserService) {}
  @Post('register')
  registerUser(@Body(new ZodValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  
  @Post('login')
  loginUser(@Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto) {
    return this.authService.loginUser(loginDto);
  }

  @Post('admin')
  loginAdmin(@Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto) {
    return this.authService.loginAdmin(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-user')
  logoutUser(@Request() req) {
    return this.authService.logoutUser(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-admin')
  logoutAdmin(@Request() req) {
    return this.authService.logoutAdmin(req.user);
  }
}

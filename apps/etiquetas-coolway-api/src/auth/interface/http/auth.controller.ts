import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { LoginRequest, LoginResponse, UserDto } from '@yorga/contracts';
import { AuthService } from '../../application/auth.service';
import { CurrentUser, Public } from './decorators';
import { JwtPayload } from '../../application/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginRequest): Promise<LoginResponse> {
    if (!body?.email || !body?.password) throw new BadRequestException('Indica email y contraseña.');
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload): Promise<UserDto> {
    return this.auth.me(user.sub);
  }
}

import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    try {
      // Create user
      const user = await this.usersService.create({
        email: signupDto.email,
        password: signupDto.password,
      });

      // Generate JWT token
      const accessToken = await this.generateToken(user);

      this.logger.log(`New user registered: ${user.email}`);

      return {
        accessToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error during signup: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Validate password
      const isPasswordValid = await this.usersService.validatePassword(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const accessToken = await this.generateToken(user);

      this.logger.log(`User logged in: ${user.email}`);

      return {
        accessToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error during login: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    try {
      return await this.usersService.findByIdWithoutPassword(userId);
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      return null;
    }
  }

  private async generateToken(user: UserDocument): Promise<string> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }
}

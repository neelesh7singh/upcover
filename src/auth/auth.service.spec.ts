import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/schemas/user.schema';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: UserRole.USER,
    isActive: true,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            validatePassword: jest.fn(),
            findByIdWithoutPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should create a new user and return access token', async () => {
      usersService.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('accessToken123');

      const result = await service.signup(signupDto);

      expect(usersService.create).toHaveBeenCalledWith({
        email: signupDto.email,
        password: signupDto.password,
      });
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'accessToken123',
        user: {
          id: mockUser._id.toString(),
          email: mockUser.email,
          role: mockUser.role,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.create.mockRejectedValue(new ConflictException('User already exists'));

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user and return access token', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('accessToken123');

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'accessToken123',
        user: {
          id: mockUser._id.toString(),
          email: mockUser.email,
          role: mockUser.role,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      usersService.findByIdWithoutPassword.mockResolvedValue(mockUser);

      const result = await service.validateUser('507f1f77bcf86cd799439011');

      expect(usersService.findByIdWithoutPassword).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      usersService.findByIdWithoutPassword.mockResolvedValue(null);

      const result = await service.validateUser('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      usersService.findByIdWithoutPassword.mockRejectedValue(new Error('Database error'));

      const result = await service.validateUser('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let model: jest.Mocked<Model<UserDocument>>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: UserRole.USER,
    isActive: true,
    save: jest.fn(),
    toObject: jest.fn(),
  } as any;

  const mockUserModel: any = jest.fn().mockImplementation((data) => {
    const user = {
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: mockUser._id }),
    };
    return user;
  });

  beforeEach(async () => {
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.find = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name)) as jest.Mocked<
      Model<UserDocument>
    >;

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.USER,
    };

    it('should create a new user successfully', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.create(createUserDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserModel).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if user already exists', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should lowercase email before creating user', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await service.create({ ...createUserDto, email: 'TEST@EXAMPLE.COM' });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      (mockUserModel.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail('test@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      (mockUserModel.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      (mockUserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(mockUserModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (mockUserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdWithoutPassword', () => {
    it('should find user by id without password', async () => {
      (mockUserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByIdWithoutPassword('507f1f77bcf86cd799439011');

      expect(mockUserModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(mockUser);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword('password123', 'hashedPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword('wrongPassword', 'hashedPassword');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [mockUser, { ...mockUser, _id: '507f1f77bcf86cd799439012' }];
      (mockUserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockUsers),
          }),
        }),
      });

      const result = await service.findAll();

      expect(mockUserModel.find).toHaveBeenCalled();
      expect(result).toBe(mockUsers);
    });
  });
});

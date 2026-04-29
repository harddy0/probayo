import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the user )',
    example: '1232',
  })
  @IsOptional()
  id?: string; // Added the ID field here

  @ApiProperty({
    description: 'User email address',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Plain text password (will be hashed by service)',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  passwordHash!: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'Jane',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    description: 'User role in the system',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    enum: UserRole,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    example: UserRole.Employee,
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    description: 'Department ID (now matching auto-increment Int)',
    example: 1,
  })
  @IsOptional()
  @IsInt() // Changed this to IsInt to match your "auto increment" request for departments
  departmentId?: number | null;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

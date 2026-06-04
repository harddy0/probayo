import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'jane.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'Jane',
    nullable: true,
  })
  firstName!: string | null;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    nullable: true,
  })
  lastName!: string | null;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.Employee,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'Department ID the user belongs to',
    example: '223e4567-e89b-12d3-a456-426614174000',
    nullable: true,
    required: false,
  })
  departmentId!: string | null;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'When the user was created',
    example: '2026-01-15T10:30:00.000Z',
  })
  createdAt!: Date;
}

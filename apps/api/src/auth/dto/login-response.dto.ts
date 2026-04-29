import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserDataDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  email: string | undefined;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
    nullable: true,
  })
  firstName: string | null | undefined;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
    nullable: true,
  })
  lastName: string | null | undefined;

  @ApiProperty({
    enum: ['Admin', 'ItStaff', 'Employee', 'DepartmentHead'],
    example: 'Employee',
    description: 'User role',
  })
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  role: UserRole | undefined;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Department ID (nullable)',
    nullable: true,
  })
  departmentId: string | null | undefined;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string | undefined;

  @ApiProperty({
    description: 'User data with role',
    type: UserDataDto,
  })
  user: UserDataDto | undefined;
}

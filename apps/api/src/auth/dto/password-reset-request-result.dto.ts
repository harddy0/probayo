import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestResultDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID',
  })
  userId!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  email!: string;

  @ApiProperty({
    example: 'Jane',
    description: 'User first name',
    nullable: true,
    required: false,
  })
  firstName!: string | null;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    nullable: true,
    required: false,
  })
  lastName!: string | null;

  @ApiProperty({
    example: 'f2f9d3c6f7b04a889e14f96e0b8d3d9f0d3f2a6c9a1b4d7e8f9c0a1b2c3d4e5f',
    description: 'Raw password reset token',
  })
  token!: string;

  @ApiProperty({
    example: '2026-05-30T12:00:00.000Z',
    description: 'Token expiration timestamp',
  })
  expiresAt!: Date;
}

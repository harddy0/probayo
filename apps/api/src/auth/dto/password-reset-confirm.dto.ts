import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @ApiProperty({
    example: 'f2f9d3c6f7b04a889e14f96e0b8d3d9f0d3f2a6c9a1b4d7e8f9c0a1b2c3d4e5f',
    description: 'Password reset token from email',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    example: 'newSecurePassword123',
    description: 'New password to set',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({
    example: 'newSecurePassword123',
    description: 'Confirmation of the new password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  confirmPassword!: string;
}

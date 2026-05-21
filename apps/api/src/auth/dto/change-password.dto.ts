import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password to set',
    example: 'newSecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}

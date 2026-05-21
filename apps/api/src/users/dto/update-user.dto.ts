import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'Jane',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}

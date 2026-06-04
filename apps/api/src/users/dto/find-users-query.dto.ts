import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Search term to filter users by name or email',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

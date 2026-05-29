import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketResponseDto } from '../../tickets/dto/ticket-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 50 })
  itemsPerPage: number | undefined;

  @ApiProperty({ example: 250 })
  totalItems: number | undefined;

  @ApiProperty({ example: 1 })
  currentPage: number | undefined;

  @ApiProperty({ example: 5 })
  totalPages: number | undefined;

  @ApiPropertyOptional({ type: [String] })
  sortBy?: string[];

  @ApiPropertyOptional({ type: [String] })
  searchBy?: string[];

  @ApiPropertyOptional({ type: Object })
  filter?: Record<string, unknown>;
}

class PaginationLinksDto {
  @ApiPropertyOptional({ example: '/department-head/tickets?page=1&limit=50' })
  first?: string;

  @ApiPropertyOptional({ example: '/department-head/tickets?page=1&limit=50' })
  previous?: string;

  @ApiPropertyOptional({ example: '/department-head/tickets?page=2&limit=50' })
  next?: string;

  @ApiPropertyOptional({ example: '/department-head/tickets?page=5&limit=50' })
  last?: string;
}

export class DepartmentHeadTicketPageDto {
  @ApiProperty({ type: [TicketResponseDto] })
  data: TicketResponseDto[] | undefined;

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto | undefined;

  @ApiProperty({ type: PaginationLinksDto })
  links: PaginationLinksDto | undefined;
}

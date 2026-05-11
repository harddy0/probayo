import { PartialType } from '@nestjs/swagger';
import { CreateKnownIssueDto } from './create-known-issue.dto';

export class UpdateKnownIssueDto extends PartialType(CreateKnownIssueDto) {}

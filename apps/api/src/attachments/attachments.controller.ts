import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import type { File as MulterFile } from 'multer';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('tickets/:ticketId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to a ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: AttachmentResponseDto,
  })
  async uploadToTicket(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: { user: { id: string } },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.attachmentsService.uploadAttachment(
      ticketId,
      req.user.id,
      file,
    );
  }

  @Post('comments/:commentId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: AttachmentResponseDto,
  })
  async uploadToComment(
    @Param('commentId') commentId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: { user: { id: string } },
  ) {
    // First get the ticket ID from the comment
    const comment = await this.attachmentsService[
      'prisma'
    ].ticketComment.findUnique({
      where: { id: commentId },
      select: { ticketId: true },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.attachmentsService.uploadAttachment(
      comment.ticketId,
      req.user.id,
      file,
      commentId,
    );
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get all attachments for a ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all attachments for the ticket',
    type: [AttachmentResponseDto],
  })
  async getTicketAttachments(
    @Param('ticketId') ticketId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attachmentsService.getTicketAttachments(ticketId, req.user.id);
  }

  @Get('comments/:commentId')
  @ApiOperation({ summary: 'Get all attachments for a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all attachments for the comment',
    type: [AttachmentResponseDto],
  })
  async getCommentAttachments(
    @Param('commentId') commentId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attachmentsService.getCommentAttachments(
      commentId,
      req.user.id,
    );
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Returns the file' })
  async download(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Res() res: Response,
  ) {
    const { buffer, filename, mimeType } =
      await this.attachmentsService.downloadAttachment(id, req.user.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  async delete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attachmentsService.deleteAttachment(id, req.user.id);
  }
}

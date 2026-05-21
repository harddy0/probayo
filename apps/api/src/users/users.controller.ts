import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Returns all users.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to retrieve',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Returns the requested user.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to update',
    type: 'string',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User successfully updated.' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    // Only allow user to update their own profile
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to delete',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'User successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Post(':id/reset-password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset user password to default value',
    description: 'Sets password to 12345678password',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to reset password for',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset to default value',
  })
  async resetPassword(@Param('id') id: string) {
    await this.usersService.resetPasswordToDefault(id);
    return { message: 'Password reset to default value' };
  }

  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user active status' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to update status',
    type: 'string',
  })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: 200, description: 'User status updated.' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateUserStatusDto.isActive);
  }
}

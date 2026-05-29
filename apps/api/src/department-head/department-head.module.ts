import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DepartmentHeadController } from './department-head.controller';
import { DepartmentHeadService } from './department-head.service';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [DepartmentHeadController],
  providers: [DepartmentHeadService],
})
export class DepartmentHeadModule {}

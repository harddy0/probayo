import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaModule } from '../sla/sla.module';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { CategoriesService } from './categories/categories.service';
import { CategoriesController } from './categories/categories.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => SlaModule)],
  controllers: [TicketsController, CategoriesController],
  providers: [TicketsService, CategoriesService],
  exports: [TicketsService],
})
export class TicketsModule {}

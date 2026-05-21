import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = request?.user?.id as string | undefined;

    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    const user = await this.usersService.findOne(userId);

    if (!user || user.isActive !== true) {
      throw new ForbiddenException('User account is inactive');
    }

    return true;
  }
}

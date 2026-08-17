import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserServiceController } from './user-service.controller';
import { UserService } from './user-service.service';
import { PostgresUserRepository } from './repositories/postgres-user.repository';
import { USER_REPOSITORY } from 'apps/user-service/src/repositories/user.repository.interface';
import { PrismaModule } from '@app/shared/prisma/prisma.module';
import { MailService } from 'apps/user-service/src/mail/mail.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [UserServiceController],
  providers: [
    UserService,
    MailService,
    {
      provide: USER_REPOSITORY,
      useClass: PostgresUserRepository,
    },
  ],
})
export class UserServiceModule {}

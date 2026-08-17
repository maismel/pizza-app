import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  providers: [SharedService],
  exports: [SharedService],
  imports: [PrismaModule],
})
export class SharedModule {}

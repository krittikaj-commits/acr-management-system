import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminUserService } from './admin-user.service';
import { MasterDataService } from './master-data.service';
import { MasterDataRepository } from './master-data.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminUserService, MasterDataService, MasterDataRepository],
  exports: [AdminUserService, MasterDataService, MasterDataRepository],
})
export class AdminModule {}

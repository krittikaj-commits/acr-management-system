import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [UserRepository, AuthService, TokenService],
  exports: [UserRepository, AuthService, TokenService],
})
export class AuthModule {}

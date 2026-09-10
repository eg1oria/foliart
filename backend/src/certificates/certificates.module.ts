import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, AdminApiGuard],
})
export class CertificatesModule {}

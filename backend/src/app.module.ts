import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { ArticlesModule } from './articles/articles.module';
import { CalendarsModule } from './calendars/calendars.module';
import { CategoriesModule } from './categories/categories.module';
import { ContactModule } from './contact/contact.module';
import { PartnersModule } from './partners/partners.module';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { RegionalContactsModule } from './regional-contacts/regional-contacts.module';
import { UiMessagesModule } from './ui-messages/ui-messages.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    ScheduleModule.forRoot(),
    AdminUsersModule,
    CategoriesModule,
    ProductsModule,
    PartnersModule,
    RegionalContactsModule,
    ArticlesModule,
    CalendarsModule,
    ContactModule,
    PrismaModule,
    UiMessagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

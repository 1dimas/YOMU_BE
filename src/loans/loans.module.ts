import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { OverdueCronService } from './overdue-cron.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
    imports: [MessagesModule],
    controllers: [LoansController],
    providers: [LoansService, OverdueCronService],
    exports: [LoansService],
})
export class LoansModule { }

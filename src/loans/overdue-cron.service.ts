import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoansService } from './loans.service';

@Injectable()
export class OverdueCronService {
    private readonly logger = new Logger(OverdueCronService.name);

    constructor(private readonly loansService: LoansService) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleOverdueCheck() {
        const result = await this.loansService.checkAndUpdateOverdue();
        if (result.updated > 0) {
            this.logger.log(`⏰ ${result.message}`);
        }
    }
}

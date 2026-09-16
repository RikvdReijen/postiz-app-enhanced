import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class HostRepository {
  constructor(private _announcement: PrismaRepository<'announcement'>) {}

  /**
   * The cheapest read that proves the pool is alive and a query round trips.
   * Announcements is used because it is tiny on every instance, so this stays
   * cheap enough for the status screen to poll.
   */
  checkConnection() {
    return this._announcement.model.announcement.findFirst({
      select: { id: true },
    });
  }
}

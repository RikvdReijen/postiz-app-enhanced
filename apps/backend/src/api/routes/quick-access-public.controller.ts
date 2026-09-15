import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QuickAccessService } from '@gitroom/nestjs-libraries/database/prisma/quick-access/quick.access.service';

/**
 * Resolves a scanned QR code or NFC tag. Unauthenticated because a scan happens
 * before the browser has a session — it only ever hands back the destination,
 * so a guessed id leaks nothing beyond "this tag opens the composer".
 */
@ApiTags('Quick Access')
@Controller('/q')
export class QuickAccessPublicController {
  constructor(private _quickAccessService: QuickAccessService) {}

  @Get('/:id')
  async resolve(@Param('id') id: string) {
    const tag = await this._quickAccessService.resolveTag(id);
    if (!tag) {
      throw new NotFoundException();
    }

    return tag;
  }
}

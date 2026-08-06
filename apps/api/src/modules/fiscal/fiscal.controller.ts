import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { FiscalRepository } from './fiscal.repository';

@Controller('fiscal/bpe')
export class FiscalController {
  constructor(private readonly repository: FiscalRepository) {}

  @Get('configuracao/status')
  @UseGuards(AuthGuard)
  @RequirePermissions('fiscal.ver')
  readiness() {
    return this.repository.readiness();
  }

  @Get('bilhetes/:ticketId')
  @UseGuards(AuthGuard)
  @RequirePermissions('fiscal.ver')
  findByTicket(@Param('ticketId') ticketId: string) {
    return this.repository.findByTicket(ticketId);
  }

  @Post('bilhetes/:ticketId/reprocessar')
  @UseGuards(AuthGuard)
  @RequirePermissions('fiscal.emitir')
  reprocess(@Param('ticketId') ticketId: string, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.reprocess(ticketId, user.sub);
  }

  @Get('bilhetes/:ticketId/download')
  @UseGuards(AuthGuard)
  @RequirePermissions('fiscal.ver')
  download(@Param('ticketId') ticketId: string, @Query('tipo') kind?: string) {
    const normalized = kind === 'pdf' || kind === 'cancelamento_xml' ? kind : 'xml';
    return this.repository.download(ticketId, normalized);
  }

  @Post('bilhetes/:ticketId/cancelar')
  @UseGuards(AuthGuard)
  @RequirePermissions('fiscal.cancelar')
  cancel(
    @Param('ticketId') ticketId: string,
    @Body() body: { justificativa?: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.repository.cancel(ticketId, body.justificativa ?? '', user.sub);
  }

  @Post('webhooks/ns')
  webhookNs(@Headers('authorization') authorization: string | undefined, @Body() body: Record<string, unknown>) {
    return this.repository.processNsWebhook(authorization, body);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { OperacaoRepository } from './operacao.repository';
import { AlertaOperacionalStatus, CreateAlertaOperacionalInput, UpdateAlertaOperacionalInput } from './operacao.types';

@UseGuards(AuthGuard)
@Controller('operacao')
export class OperacaoController {
  constructor(private readonly repository: OperacaoRepository) {}

  @Get('relatorio-dia')
  @RequirePermissions('operacao.ver')
  relatorioDia(@Query('data') data?: string) {
    return this.repository.relatorioDia(data);
  }

  @Get('alertas')
  @RequirePermissions('operacao.ver')
  listAlertas(@Query('status') status?: AlertaOperacionalStatus) {
    return this.repository.listAlertas(status ?? 'aberto');
  }

  @Post('alertas')
  @RequirePermissions('operacao.criar')
  createAlerta(@Body() body: CreateAlertaOperacionalInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createAlerta(body, user.sub);
  }

  @Patch('alertas/:id')
  @RequirePermissions('operacao.editar')
  updateAlerta(
    @Param('id') id: string,
    @Body() body: UpdateAlertaOperacionalInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.repository.updateAlerta(id, body, user.sub);
  }
}

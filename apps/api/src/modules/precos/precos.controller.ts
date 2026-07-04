import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PrecosRepository, ReajustarTabelaPrecoInput } from './precos.repository';

@UseGuards(AuthGuard)
@Controller('precos')
export class PrecosController {
  constructor(private readonly repository: PrecosRepository) {}

  @Get()
  @RequirePermissions('precos.ver')
  listActive(@Query('tipo') tipo?: string) {
    return this.repository.listActive(tipo);
  }

  @Get('passagem/matriz')
  @RequirePermissions('precos.ver')
  listPassagemMatrix() {
    return this.repository.listPassagemMatrix();
  }

  @Post(':tipo/reajustes')
  @RequirePermissions('precos.reajustar')
  reajustarTabela(
    @Param('tipo') tipo: string,
    @Body() body: ReajustarTabelaPrecoInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.repository.reajustarTabela(tipo, body, user.sub);
  }
}

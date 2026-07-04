import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CaixaRepository } from './caixa.repository';
import { AbrirCaixaInput, FinanceiroTituloInput, MovimentoCaixaInput } from './caixa.types';

@UseGuards(AuthGuard)
@Controller('caixa')
export class CaixaController {
  constructor(private readonly repository: CaixaRepository) {}

  @Get()
  @RequirePermissions('caixa.ver')
  list() {
    return this.repository.list();
  }

  @Post('abrir')
  @RequirePermissions('caixa.operar')
  abrir(@Body() body: AbrirCaixaInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.abrir(body, user.sub);
  }

  @Get('titulos')
  @RequirePermissions('caixa.ver')
  titulos(@Query('tipo') tipo?: string) {
    if (tipo && tipo !== 'receber' && tipo !== 'pagar') {
      throw new BadRequestException('tipo invalido');
    }
    const tipoFiltro = tipo as 'receber' | 'pagar' | undefined;
    return this.repository.titulos(tipoFiltro);
  }

  @Post('titulos')
  @RequirePermissions('caixa.operar')
  criarTitulo(@Body() body: FinanceiroTituloInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.criarTitulo(body, user.sub);
  }

  @Get(':id/movimentos')
  @RequirePermissions('caixa.ver')
  movimentos(@Param('id') id: string) {
    return this.repository.movimentos(id);
  }

  @Post(':id/movimentos')
  @RequirePermissions('caixa.operar')
  movimento(@Param('id') id: string, @Body() body: MovimentoCaixaInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.movimento(id, body, user.sub);
  }

  @Patch(':id/fechar')
  @RequirePermissions('caixa.operar')
  fechar(@Param('id') id: string, @Body() body: { valorFechamento?: number }) {
    if (body.valorFechamento !== undefined && Number.isNaN(Number(body.valorFechamento))) {
      throw new BadRequestException('valorFechamento invalido');
    }
    return this.repository.fechar(id, body.valorFechamento);
  }
}

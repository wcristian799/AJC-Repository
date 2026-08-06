import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CaixaRepository } from './caixa.repository';
import { AbrirCaixaInput, CriarComissaoInput, CriarFaturaInput, FinanceiroTituloInput, LiquidarTituloInput, MovimentoCaixaInput } from './caixa.types';

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
  @RequirePermissions('financeiro.ver')
  titulos(@Query('tipo') tipo?: string, @Query('de') de?: string, @Query('ate') ate?: string, @Query('status') status?: string, @Query('busca') busca?: string, @Query('planoContaId') planoContaId?: string, @Query('centroCustoId') centroCustoId?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    if (tipo && tipo !== 'receber' && tipo !== 'pagar') {
      throw new BadRequestException('tipo invalido');
    }
    return this.repository.titulos({ tipo: tipo as 'receber' | 'pagar' | undefined, de, ate, status, busca, planoContaId, centroCustoId, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
  }

  @Get('resumo')
  @RequirePermissions('financeiro.ver')
  resumo(@Query('de') de?: string, @Query('ate') ate?: string) { return this.repository.resumo({ de, ate }); }

  @Post('titulos')
  @RequirePermissions('financeiro.lancar')
  criarTitulo(@Body() body: FinanceiroTituloInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.criarTitulo(body, user.sub);
  }

  @Patch('titulos/:id/liquidar')
  @RequirePermissions('financeiro.baixar')
  liquidarTitulo(@Param('id') id: string, @Body() body: LiquidarTituloInput, @CurrentUser() user: AuthTokenPayload) { return this.repository.liquidarTitulo(id, body, user.sub); }

  @Get('titulos/:id/historico')
  @RequirePermissions('financeiro.ver')
  historicoTitulo(@Param('id') id: string) { return this.repository.historicoTitulo(id); }

  @Get('comissoes')
  @RequirePermissions('financeiro.ver')
  comissoes() { return this.repository.comissoes(); }

  @Post('comissoes')
  @RequirePermissions('financeiro.lancar')
  criarComissao(@Body() body: CriarComissaoInput, @CurrentUser() user: AuthTokenPayload) { return this.repository.criarComissao(body, user.sub); }

  @Patch('comissoes/:id/liberar')
  @RequirePermissions('financeiro.comissao_liberar')
  liberarComissao(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) { return this.repository.transicionarComissao(id, 'liberada', user.sub); }

  @Patch('comissoes/:id/pagar')
  @RequirePermissions('financeiro.comissao_pagar')
  pagarComissao(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) { return this.repository.transicionarComissao(id, 'pago', user.sub); }

  @Patch('comissoes/:id/cancelar')
  @RequirePermissions('financeiro.configurar')
  cancelarComissao(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) { return this.repository.transicionarComissao(id, 'cancelada', user.sub); }

  @Get('dre')
  @RequirePermissions('financeiro.dre_ver')
  dre(@Query('de') de?: string, @Query('ate') ate?: string) { return this.repository.dre(de, ate); }

  @Get('faturas')
  @RequirePermissions('financeiro.fatura_ver')
  faturas() { return this.repository.faturas(); }

  @Post('faturas')
  @RequirePermissions('financeiro.fatura_lancar')
  criarFatura(@Body() body: CriarFaturaInput, @CurrentUser() user: AuthTokenPayload) { return this.repository.criarFatura(body, user.sub); }

  @Get('plano-contas')
  @RequirePermissions('financeiro.ver')
  planoContas() { return this.repository.planoContas(); }

  @Post('plano-contas')
  @RequirePermissions('financeiro.configurar')
  salvarPlanoConta(@Body() body: { id?: string; codigo?: string; nome?: string; natureza?: string; contaPaiId?: string | null; ativo?: boolean }, @CurrentUser() user: AuthTokenPayload) { return this.repository.salvarPlanoConta(body, user.sub); }

  @Get('centros-custo')
  @RequirePermissions('financeiro.ver')
  centrosCusto() { return this.repository.centrosCusto(); }

  @Post('centros-custo')
  @RequirePermissions('financeiro.configurar')
  salvarCentroCusto(@Body() body: { id?: string; codigo?: string; nome?: string; ativo?: boolean }, @CurrentUser() user: AuthTokenPayload) { return this.repository.salvarCentroCusto(body, user.sub); }

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

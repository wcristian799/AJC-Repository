import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { VendasRepository } from './vendas.repository';
import { CreateBilheteInput, CreateCortesiaInput, CreatePdvVendaInput, SaveClientePassagemInput, ValidarBilheteInput } from './vendas.types';

@UseGuards(AuthGuard)
@Controller('vendas')
export class VendasController {
  constructor(private readonly repository: VendasRepository) {}

  @Get('bilhetes')
  @RequirePermissions('vendas.ver')
  listBilhetes(@Query('viagemId') viagemId?: string, @Query('embarcacaoId') embarcacaoId?: string, @Query('dataInicio') dataInicio?: string, @Query('dataFim') dataFim?: string) {
    return this.repository.listBilhetes({ viagemId, embarcacaoId, dataInicio, dataFim });
  }

  @Get('resumo')
  @RequirePermissions('vendas.ver')
  resumo(@Query('viagemId') viagemId?: string, @Query('embarcacaoId') embarcacaoId?: string, @Query('dataInicio') dataInicio?: string, @Query('dataFim') dataFim?: string) {
    return this.repository.resumo({ viagemId, embarcacaoId, dataInicio, dataFim });
  }

  @Get('clientes-passagem')
  @RequirePermissions('vendas.ver')
  listClientesPassagem(@Query('busca') busca?: string) { return this.repository.listClientesPassagem(busca); }

  @Post('clientes-passagem')
  @RequirePermissions('vendas.vender')
  createClientePassagem(@Body() body: SaveClientePassagemInput, @CurrentUser() user: AuthTokenPayload) { return this.repository.createClientePassagem(body, user.sub); }

  @Get('bilhetes/:id')
  @RequirePermissions('vendas.ver')
  getBilhete(@Param('id') id: string) {
    return this.repository.findBilhete(id);
  }

  @Post('bilhetes')
  @RequirePermissions('vendas.vender')
  createBilhete(@Body() body: CreateBilheteInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.viagemId, 'viagemId');
    this.require(body.classe, 'classe');
    return this.repository.createBilhete(body, user.sub);
  }

  @Get('pdv/configuracao')
  @RequirePermissions('vendas.vender')
  configuracaoPdv() {
    return this.repository.getPdvConfig();
  }

  @Get('pdv/historico')
  @RequirePermissions('vendas.vender')
  historicoPdv(@Query('caixaId') caixaId?: string) {
    return this.repository.listPdvSales(caixaId);
  }

  @Post('pdv/vendas')
  @RequirePermissions('vendas.vender')
  createPdvVenda(@Body() body: CreatePdvVendaInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.caixaId, 'caixaId');
    this.require(body.viagemId, 'viagemId');
    this.require(body.origemSigla, 'origemSigla');
    this.require(body.destinoSigla, 'destinoSigla');
    this.require(body.clientUuid, 'clientUuid');
    return this.repository.createPdvSale(body, user.sub);
  }

  @Post('bilhetes/:id/validar')
  @RequirePermissions('vendas.validar')
  validar(@Param('id') id: string, @Body() body: ValidarBilheteInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.validarBilhete(id, body, user);
  }

  @Get('manifesto/:viagemId')
  @RequirePermissions('vendas.ver')
  manifesto(@Param('viagemId') viagemId: string) {
    return this.repository.manifesto(viagemId);
  }

  @Get('cortesias')
  @RequirePermissions('vendas.ver')
  listCortesias(@Query('viagemId') viagemId?: string) {
    return this.repository.listCortesias(viagemId);
  }

  @Post('cortesias')
  @RequirePermissions('vendas.cortesia')
  createCortesia(@Body() body: CreateCortesiaInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.viagemId, 'viagemId');
    return this.repository.createCortesia(body, user.sub);
  }

  @Get('gratuidades')
  @RequirePermissions('vendas.ver')
  listGratuidades(@Query('viagemId') viagemId?: string) {
    return this.repository.listGratuidades(viagemId);
  }

  private require(value: unknown, field: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} obrigatorio`);
    }
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateCotacaoInput, CrmRepository, PedidoEnvioInput } from './crm.repository';

@UseGuards(AuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly repository: CrmRepository) {}

  @Get('cotacoes')
  @RequirePermissions('crm.ver')
  listCotacoes() {
    return this.repository.listCotacoes();
  }

  @Post('cotacoes')
  @RequirePermissions('crm.criar')
  createCotacao(@Body() body: CreateCotacaoInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createCotacao(body, user.sub);
  }

  @Get('pedidos-envio')
  @RequirePermissions('crm.pedido_ver')
  listPedidos(@Query('clienteId') clienteId?: string, @Query('status') status?: string, @Query('busca') busca?: string) {
    return this.repository.listPedidos({ clienteId, status, busca });
  }

  @Post('pedidos-envio')
  @RequirePermissions('crm.pedido_criar')
  createPedido(@Body() body: PedidoEnvioInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.createPedido(body, user.sub);
  }

  @Patch('pedidos-envio/:id')
  @RequirePermissions('crm.pedido_criar')
  updatePedido(@Param('id') id: string, @Body() body: PedidoEnvioInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.updatePedido(id, body, user.sub);
  }

  @Get('clientes/:id/historico')
  @RequirePermissions('crm.ver')
  historicoCliente(@Param('id') id: string) {
    return this.repository.historicoCliente(id);
  }
}

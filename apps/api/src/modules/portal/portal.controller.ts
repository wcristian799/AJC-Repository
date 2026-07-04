import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PortalRepository } from './portal.repository';
import { CreatePortalPagamentoInput, CreatePortalPedidoInput, GatewayStubWebhookInput, PortalViagensQuery } from './portal.types';

@Controller('portal')
export class PortalController {
  constructor(private readonly repository: PortalRepository) {}

  @Get('viagens')
  viagens(@Query() query: PortalViagensQuery) {
    return this.repository.listViagens(query);
  }

  @Post('pedidos')
  createPedido(@Body() body: CreatePortalPedidoInput) {
    return this.repository.createPedido(body);
  }

  @Get('pedidos/:codigo')
  pedido(@Param('codigo') codigo: string) {
    return this.repository.findPedido(codigo);
  }

  @Post('pedidos/:codigo/pagamentos')
  createPagamento(@Param('codigo') codigo: string, @Body() body: CreatePortalPagamentoInput) {
    return this.repository.createPagamento(codigo, body);
  }

  @Post('webhooks/stub')
  webhookStub(@Body() body: GatewayStubWebhookInput) {
    return this.repository.processWebhook(body);
  }

  @Get('cliente/bilhetes')
  bilhetesCliente(@Query('documento') documento?: string, @Query('email') email?: string) {
    return this.repository.bilhetesCliente(documento, email);
  }
}

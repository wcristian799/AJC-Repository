import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateCotacaoInput, CrmRepository } from './crm.repository';

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

  @Get('clientes/:id/historico')
  @RequirePermissions('crm.ver')
  historicoCliente(@Param('id') id: string) {
    return this.repository.historicoCliente(id);
  }
}

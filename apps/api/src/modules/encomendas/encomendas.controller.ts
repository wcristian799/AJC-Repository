import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { TmsRepository } from '../tms/tms.repository';
import { CreateCargaInput, SaveDeclaracaoConteudoInput } from '../tms/tms.types';

@UseGuards(AuthGuard)
@Controller('encomendas')
export class EncomendasController {
  constructor(private readonly tms: TmsRepository) {}

  @Get()
  @RequirePermissions('encomendas.ver')
  list() {
    return this.tms.listCargas('encomenda');
  }

  @Get('declaracoes')
  @RequirePermissions('encomendas.ver')
  listDeclaracoes() {
    return this.tms.listDeclaracoesConteudo('encomenda');
  }

  @Post()
  @RequirePermissions('encomendas.criar')
  create(@Body() body: CreateCargaInput, @CurrentUser() user: AuthTokenPayload) {
    return this.tms.createCarga(
      {
        ...body,
        categoria: 'encomenda',
        tipoRecebimento: body.tipoRecebimento ?? 'porto_balsa',
        documento: body.documento ?? { tipo: 'DC', numero: body.numeroDocumento, valor: body.valorDeclarado, origem: 'manual' },
      },
      user.sub,
    );
  }

  @Post(':id/declaracao-conteudo')
  @RequirePermissions('encomendas.criar')
  saveDeclaracao(@Param('id') id: string, @Body() body: SaveDeclaracaoConteudoInput, @CurrentUser() user: AuthTokenPayload) {
    return this.tms.saveDeclaracaoConteudo(id, body, user.sub);
  }
}

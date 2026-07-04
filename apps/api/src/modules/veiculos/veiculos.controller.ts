import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateVeiculoInput, VeiculosRepository } from './veiculos.repository';

@UseGuards(AuthGuard)
@Controller('veiculos')
export class VeiculosController {
  constructor(private readonly repository: VeiculosRepository) {}

  @Get()
  @RequirePermissions('veiculos.ver')
  list() {
    return this.repository.list();
  }

  @Get(':id')
  @RequirePermissions('veiculos.ver')
  find(@Param('id') id: string) {
    return this.repository.find(id);
  }

  @Post()
  @RequirePermissions('veiculos.criar')
  create(@Body() body: CreateVeiculoInput, @CurrentUser() user: AuthTokenPayload) {
    if (body.tipo !== 'veiculo' && body.tipo !== 'maquina') throw new BadRequestException('tipo deve ser veiculo ou maquina');
    if (!body.modelo) throw new BadRequestException('modelo obrigatorio');
    if (body.tipo === 'veiculo' && !body.placa) throw new BadRequestException('placa obrigatoria para veiculo');
    return this.repository.create(body, user.sub);
  }

  @Post(':id/fotos')
  @RequirePermissions('veiculos.criar')
  addFoto(
    @Param('id') id: string,
    @Body() body: { etapa: string; angulo: string; fotoUrl: string; fotoHash?: string; clientUuid?: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    if (!body.etapa || !body.angulo || !body.fotoUrl) throw new BadRequestException('etapa, angulo e fotoUrl obrigatorios');
    return this.repository.addFoto(id, body, user.sub);
  }

  @Post(':id/eventos')
  @RequirePermissions('veiculos.criar')
  addEvento(
    @Param('id') id: string,
    @Body() body: { tipo?: string; etiquetaCodigo?: string; localSigla?: string; observacao?: string; clientUuid?: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    if (!body.tipo) throw new BadRequestException('tipo obrigatorio');
    return this.repository.addEvento(id, body.tipo, user.sub, body.etiquetaCodigo, body.localSigla, body.observacao, body.clientUuid);
  }
}

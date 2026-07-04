import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { NavegacaoRepository } from './navegacao.repository';
import { CreateViagemInput, NotifyEscalasInput, UpdateViagemInput } from './navegacao.types';

@UseGuards(AuthGuard)
@Controller('navegacao')
export class NavegacaoController {
  constructor(private readonly repository: NavegacaoRepository) {}

  @Get('viagens')
  @RequirePermissions('navegacao.ver')
  listViagens() {
    return this.repository.listViagens();
  }

  @Get('viagens/:id')
  @RequirePermissions('navegacao.ver')
  async getViagem(@Param('id') id: string) {
    const viagem = await this.repository.findViagem(id);
    if (!viagem) {
      throw new NotFoundException('Viagem nao encontrada');
    }
    return viagem;
  }

  @Post('viagens')
  @RequirePermissions('navegacao.criar')
  createViagem(@Body() body: CreateViagemInput, @CurrentUser() user: AuthTokenPayload) {
    this.validateCreateViagem(body);
    return this.repository.createViagem(body, user.sub);
  }

  @Patch('viagens/:id')
  @RequirePermissions('navegacao.editar')
  updateViagem(@Param('id') id: string, @Body() body: UpdateViagemInput, @CurrentUser() user: AuthTokenPayload) {
    this.validateUpdateViagem(body);
    return this.repository.updateViagem(id, body, user.sub);
  }

  @Get('templates-rotas')
  @RequirePermissions('navegacao.ver')
  routeTemplates() {
    return this.repository.routeTemplates();
  }

  @Get('escalas-colaboradores')
  @RequirePermissions('navegacao.ver')
  listEscalasColaboradores() {
    return this.repository.listEscalasColaboradores();
  }

  @Post('escalas-colaboradores/notificar')
  @RequirePermissions('navegacao.editar')
  notifyEscalas(@Body() body: NotifyEscalasInput, @CurrentUser() user: AuthTokenPayload) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Payload invalido');
    }
    if (!Array.isArray(body.escalaIds) || body.escalaIds.length === 0) {
      throw new BadRequestException('escalaIds obrigatorio');
    }
    return this.repository.notifyEscalas(body, user.sub);
  }

  private validateCreateViagem(body: CreateViagemInput): void {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Payload invalido');
    }
    for (const field of ['embarcacaoId', 'origemSigla', 'dataHoraSaida', 'dataHoraRetorno'] as const) {
      if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
        throw new BadRequestException(`${field} obrigatorio`);
      }
    }
    this.validateViagemDates(body.dataHoraSaida, body.dataHoraRetorno);
    if (!Array.isArray(body.escalas) || body.escalas.length === 0) {
      throw new BadRequestException('escalas obrigatorio');
    }
    for (const escala of body.escalas) {
      if (typeof escala.cidadeSigla !== 'string' || escala.cidadeSigla.trim().length === 0) {
        throw new BadRequestException('cidadeSigla da escala obrigatoria');
      }
    }
  }

  private validateUpdateViagem(body: UpdateViagemInput): void {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Payload invalido');
    }
    if ('status' in body || 'situacao' in body) {
      throw new BadRequestException('Status e situacao da viagem sao alterados pelo ciclo operacional do sistema');
    }
    if ('escalas' in body) {
      if (!Array.isArray(body.escalas) || body.escalas.length === 0) {
        throw new BadRequestException('escalas obrigatorio');
      }
      for (const escala of body.escalas) {
        if (typeof escala.cidadeSigla !== 'string' || escala.cidadeSigla.trim().length === 0) {
          throw new BadRequestException('cidadeSigla da escala obrigatoria');
        }
      }
    }
    if ('dataHoraRetorno' in body && (typeof body.dataHoraRetorno !== 'string' || body.dataHoraRetorno.trim().length === 0)) {
      throw new BadRequestException('dataHoraRetorno obrigatorio');
    }
    if (body.dataHoraSaida || typeof body.dataHoraRetorno === 'string') {
      this.validateViagemDates(body.dataHoraSaida, typeof body.dataHoraRetorno === 'string' ? body.dataHoraRetorno : undefined, true);
    }
  }

  private validateViagemDates(dataHoraSaida?: string, dataHoraRetorno?: string, partial = false): void {
    if (partial && (!dataHoraSaida || !dataHoraRetorno)) return;
    const saida = Date.parse(dataHoraSaida ?? '');
    const retorno = Date.parse(dataHoraRetorno ?? '');
    if (!Number.isFinite(saida)) {
      throw new BadRequestException('dataHoraSaida invalida');
    }
    if (!Number.isFinite(retorno)) {
      throw new BadRequestException('dataHoraRetorno invalida');
    }
    if (retorno <= saida) {
      throw new BadRequestException('dataHoraRetorno deve ser posterior a dataHoraSaida');
    }
  }
}

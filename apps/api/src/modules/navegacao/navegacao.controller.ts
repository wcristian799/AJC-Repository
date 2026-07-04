import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { NavegacaoRepository } from './navegacao.repository';
import { CreateViagemInput, NotifyEscalasInput } from './navegacao.types';

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
    for (const field of ['embarcacaoId', 'origemSigla', 'dataHoraSaida'] as const) {
      if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
        throw new BadRequestException(`${field} obrigatorio`);
      }
    }
    if (!Array.isArray(body.escalas) || body.escalas.length === 0) {
      throw new BadRequestException('escalas obrigatorio');
    }
    for (const escala of body.escalas) {
      if (typeof escala.cidadeSigla !== 'string' || escala.cidadeSigla.trim().length === 0) {
        throw new BadRequestException('cidadeSigla da escala obrigatoria');
      }
    }
  }
}

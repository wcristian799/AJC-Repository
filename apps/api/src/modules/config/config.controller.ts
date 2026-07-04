import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '../auth/auth.types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ConfigRepository } from './config.repository';

interface PublishConfigBody {
  valor?: unknown;
}

@UseGuards(AuthGuard)
@Controller('config')
export class ConfigController {
  constructor(private readonly repository: ConfigRepository) {}

  @Get()
  @RequirePermissions('cadastros.ver')
  listActive() {
    return this.repository.listActive();
  }

  @Get(':chave')
  @RequirePermissions('cadastros.ver')
  async getActive(@Param('chave') chave: string) {
    const config = await this.repository.findActive(chave);
    if (!config) {
      throw new NotFoundException('Configuracao nao encontrada');
    }
    return config;
  }

  @Put(':chave')
  @RequirePermissions('cadastros.editar')
  async publish(
    @Param('chave') chave: string,
    @Body() body: PublishConfigBody,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    if (!chave || chave.trim().length < 2) {
      throw new BadRequestException('Chave invalida');
    }
    if (body.valor === undefined) {
      throw new BadRequestException('valor obrigatorio');
    }
    return this.repository.publish(chave.trim(), body.valor, user.sub);
  }
}

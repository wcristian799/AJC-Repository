import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { VendasRepository } from './vendas.repository';
import { CreateBilheteInput, CreateCortesiaInput, ValidarBilheteInput } from './vendas.types';

@UseGuards(AuthGuard)
@Controller('vendas')
export class VendasController {
  constructor(private readonly repository: VendasRepository) {}

  @Get('bilhetes')
  @RequirePermissions('vendas.ver')
  listBilhetes(@Query('viagemId') viagemId?: string) {
    return this.repository.listBilhetes(viagemId);
  }

  @Get('resumo')
  @RequirePermissions('vendas.ver')
  resumo() {
    return this.repository.resumo();
  }

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

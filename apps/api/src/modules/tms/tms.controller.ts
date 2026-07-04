import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { TmsRepository } from './tms.repository';
import { AllocatePaleteInput, ConferirDocumentoInput, CreateCargaInput, EntregaInput, PrintEtiquetaInput, RegistroPortariaInput, SavePrestacaoContasInput } from './tms.types';

@UseGuards(AuthGuard)
@Controller('tms')
export class TmsController {
  constructor(private readonly repository: TmsRepository) {}

  @Get('cargas')
  @RequirePermissions('tms.ver')
  listCargas(@Query('categoria') categoria?: 'carga' | 'encomenda') {
    return this.repository.listCargas(categoria);
  }

  @Get('cargas/:id')
  @RequirePermissions('tms.ver')
  getCarga(@Param('id') id: string) {
    return this.repository.findCarga(id);
  }

  @Post('cargas')
  @RequirePermissions('tms.criar')
  createCarga(@Body() body: CreateCargaInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.viagemId, 'viagemId');
    this.require(body.clienteRemetenteId, 'clienteRemetenteId');
    this.require(body.cidadeDestinoSigla, 'cidadeDestinoSigla');
    return this.repository.createCarga(body, user.sub);
  }

  @Get('documentos')
  @RequirePermissions('tms.ver')
  listDocumentos() {
    return this.repository.listDocumentos();
  }

  @Post('documentos/:id/conferencia')
  @RequirePermissions('tms.conferir')
  conferirDocumento(@Param('id') id: string, @Body() body: ConferirDocumentoInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.conferirDocumento(id, body, user.sub);
  }

  @Get('volumes')
  @RequirePermissions('tms.ver')
  listVolumes() {
    return this.repository.listVolumes();
  }

  @Get('etiquetas')
  @RequirePermissions('tms.ver')
  listEtiquetas() {
    return this.repository.listEtiquetas();
  }

  @Post('volumes/:id/etiquetas')
  @RequirePermissions('tms.conferir')
  printEtiqueta(@Param('id') id: string, @Body() body: PrintEtiquetaInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.printEtiqueta(id, body, user.sub);
  }

  @Post('volumes/:id/eventos')
  @RequirePermissions('tms.conferir')
  addVolumeEvent(
    @Param('id') id: string,
    @Body() body: { tipo?: string; obs?: string; clientUuid?: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.tipo, 'tipo');
    return this.repository.addVolumeEvent(id, body.tipo!, user.sub, body.obs, body.clientUuid);
  }

  @Get('paletes')
  @RequirePermissions('tms.ver')
  listPaletes() {
    return this.repository.listPaletes();
  }

  @Post('paletes')
  @RequirePermissions('tms.criar')
  createPalete(@Body() body: { codigo?: string; proprietario?: string; terceiroId?: string }) {
    this.require(body.codigo, 'codigo');
    return this.repository.createPalete(body.codigo!, body.proprietario, body.terceiroId);
  }

  @Post('paletes/:id/alocacoes')
  @RequirePermissions('tms.criar')
  allocatePalete(@Param('id') id: string, @Body() body: AllocatePaleteInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.viagemId, 'viagemId');
    this.require(body.cidadeDestinoSigla, 'cidadeDestinoSigla');
    return this.repository.allocatePalete(id, body, user.sub);
  }

  @Post('paletes/:id/liberar')
  @RequirePermissions('tms.criar')
  releasePalete(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.releasePalete(id, user.sub);
  }

  @Get('portaria')
  @RequirePermissions('tms.ver')
  listPortaria() {
    return this.repository.listPortaria();
  }

  @Post('portaria')
  @RequirePermissions('tms.criar')
  createPortaria(@Body() body: RegistroPortariaInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.empresa, 'empresa');
    return this.repository.createPortaria(body, user.sub);
  }

  @Get('entregas')
  @RequirePermissions('tms.ver')
  listEntregas() {
    return this.repository.listEntregas();
  }

  @Post('entregas')
  @RequirePermissions('tms.entregar')
  createEntrega(@Body() body: EntregaInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.cidadeSigla, 'cidadeSigla');
    return this.repository.createEntrega(body, user.sub);
  }

  @Get('prestacoes')
  @RequirePermissions('tms.ver')
  listPrestacoes() {
    return this.repository.listPrestacoes();
  }

  @Get('prestacoes/:id')
  @RequirePermissions('tms.ver')
  getPrestacao(@Param('id') id: string) {
    return this.repository.findPrestacao(id);
  }

  @Post('prestacoes')
  @RequirePermissions('tms.criar')
  savePrestacao(@Body() body: SavePrestacaoContasInput, @CurrentUser() user: AuthTokenPayload) {
    this.require(body.viagemId, 'viagemId');
    return this.repository.savePrestacao(body, user.sub);
  }

  private require(value: unknown, field: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} obrigatorio`);
    }
  }
}

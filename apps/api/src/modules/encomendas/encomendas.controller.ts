import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateEncomendaInput, EncomendaEvidenceType, EncomendasRepository } from './encomendas.repository';
import { EncomendasStorageService } from './encomendas-storage.service';

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@UseGuards(AuthGuard)
@Controller('encomendas')
export class EncomendasController {
  constructor(private readonly repository: EncomendasRepository, private readonly storage: EncomendasStorageService) {}

  @Get()
  @RequirePermissions('encomendas.ver')
  list() { return this.repository.list(); }

  @Get('configuracao')
  @RequirePermissions('encomendas.ver')
  configuration() { return this.repository.configuration(); }

  @Get(':id')
  @RequirePermissions('encomendas.ver')
  detail(@Param('id') id: string) { return this.repository.detail(id); }

  @Post('evidencias')
  @RequirePermissions('encomendas.criar')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Uploaded,
    @Query('tipo') tipo: EncomendaEvidenceType,
    @Query('clientUuid') clientUuid: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    if (!['foto_encomenda','documento_nf','documento_dc','assinatura_dc'].includes(tipo)) throw new BadRequestException('tipo de evidencia invalido');
    const uploaded = await this.storage.upload(file, tipo);
    return this.repository.registerEvidence(uploaded, user.sub, clientUuid);
  }

  @Post()
  @RequirePermissions('encomendas.criar')
  create(@Body() body: CreateEncomendaInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.create(body, user.sub);
  }

  @Post(':id/declaracao-conteudo')
  @RequirePermissions('encomendas.criar')
  saveDeclaration(
    @Param('id') id: string,
    @Body() body: { evidenciaAssinaturaId: string; aceiteEm?: string; dispositivo?: string; clientUuid: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.repository.saveDeclaration(id, body, user.sub);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "../auth/auth.guard";
import { AuthTokenPayload } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { TmsRepository } from "./tms.repository";
import { TmsDocumentService } from "./tms-document.service";
import { TmsControlRepository } from "./tms-control.repository";
import {
  AddConferenciaItemInput,
  AllocatePaleteInput,
  CloseConferenciaInput,
  ConferirDocumentoInput,
  CreateCargaInput,
  CreateDocumentoInput,
  EntregaInput,
  OpenConferenciaInput,
  PrintEtiquetaInput,
  PrintTargetEtiquetaInput,
  RegistroPortariaInput,
  ReleasePaleteInput,
  SaveLocalOperacionalInput,
  SavePaleteInput,
  ConferirPrestacaoContasInput,
  SavePrestacaoContasInput,
  ScanConferenciaVolumeInput,
  TmsControlQuery,
  TmsControlVolumesQuery,
} from "./tms.types";
import { TmsUnitizacaoRepository } from "./tms-unitizacao.repository";
import { TmsEvidenceService } from "./tms-evidence.service";

@UseGuards(AuthGuard)
@Controller("tms")
export class TmsController {
  constructor(
    private readonly repository: TmsRepository,
    private readonly control: TmsControlRepository,
    private readonly documents: TmsDocumentService,
    private readonly unitizacao: TmsUnitizacaoRepository,
    private readonly evidence: TmsEvidenceService,
  ) {}

  @Get("controle-viagens")
  @RequirePermissions("tms.ver")
  listControleViagens(@Query() query: TmsControlQuery) {
    return this.control.list(query);
  }

  @Get("controle-viagens/exportacao")
  @RequirePermissions("tms.ver")
  exportControleViagens(@Query() query: TmsControlQuery) {
    return this.control.list(query, true);
  }

  @Get("controle-viagens/:viagemId/volumes")
  @RequirePermissions("tms.ver")
  listControleVolumes(
    @Param("viagemId") viagemId: string,
    @Query() query: TmsControlVolumesQuery,
  ) {
    return this.control.listVolumes(viagemId, query);
  }

  @Get("controle-viagens/volumes/:volumeId/eventos")
  @RequirePermissions("tms.ver")
  listControleVolumeEventos(@Param("volumeId") volumeId: string) {
    return this.control.listVolumeEvents(volumeId);
  }

  @Get("cargas")
  @RequirePermissions("tms.ver")
  listCargas(@Query("categoria") categoria?: "carga" | "encomenda") {
    return this.repository.listCargas(categoria);
  }

  @Get("agendamentos/disponibilidade")
  @RequirePermissions("tms.ver")
  listAgendamentoDisponibilidade(@Query("data") data?: string) {
    this.require(data, "data");
    return this.repository.listAgendamentoDisponibilidade(data!);
  }

  @Get("cargas/:id")
  @RequirePermissions("tms.ver")
  getCarga(@Param("id") id: string) {
    return this.repository.findCarga(id);
  }

  @Post("cargas")
  @RequirePermissions("tms.criar")
  createCarga(
    @Body() body: CreateCargaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.viagemId, "viagemId");
    this.require(body.clienteRemetenteId, "clienteRemetenteId");
    this.require(body.cidadeDestinoSigla, "cidadeDestinoSigla");
    return this.repository.createCarga(body, user.sub);
  }

  @Get("documentos")
  @RequirePermissions("tms.ver")
  listDocumentos() {
    return this.repository.listDocumentos();
  }

  @Post("documentos/analisar")
  @RequirePermissions("tms.criar")
  @UseInterceptors(
    FileInterceptor("arquivo", {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async analyzeDocumento(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    const uploaded = await this.documents.uploadAndExtract(file);
    return this.repository.registerDocumentoUpload(uploaded, user.sub);
  }

  @Post("documentos")
  @RequirePermissions("tms.criar")
  createDocumento(
    @Body() body: CreateDocumentoInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.uploadId, "uploadId");
    this.require(body.viagemId, "viagemId");
    this.require(body.remetenteNome, "remetenteNome");
    this.require(body.numero, "numero");
    this.require(body.agendadoPara, "agendadoPara");
    return this.repository.createDocumento(body, user.sub);
  }

  @Post("documentos/:id/conferencia")
  @RequirePermissions("tms.conferir")
  conferirDocumento(
    @Param("id") id: string,
    @Body() body: ConferirDocumentoInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.repository.conferirDocumento(id, body, user.sub);
  }

  @Get("volumes")
  @RequirePermissions("tms.ver")
  listVolumes() {
    return this.repository.listVolumes();
  }

  @Get("etiquetas")
  @RequirePermissions("tms.ver")
  listEtiquetas(@Query("data") data?: string) {
    return this.unitizacao.listEtiquetas(data);
  }

  @Get("etiquetas-alvos")
  @RequirePermissions("tms.ver")
  listEtiquetaTargets(
    @Query("tipo") tipo?: "palete" | "volume",
    @Query("busca") busca?: string,
  ) {
    if (!tipo || !["palete", "volume"].includes(tipo))
      throw new BadRequestException("tipo deve ser palete ou volume");
    return this.unitizacao.listEtiquetaTargets(tipo, busca);
  }

  @Post("volumes/:id/etiquetas")
  @RequirePermissions("tms.conferir")
  printEtiqueta(
    @Param("id") id: string,
    @Body() body: PrintEtiquetaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.printEtiqueta(
      { ...body, alvoTipo: "volume", alvoId: id },
      user.sub,
    );
  }

  @Post("etiquetas")
  @RequirePermissions("tms.conferir")
  printTargetEtiqueta(
    @Body() body: PrintTargetEtiquetaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.alvoTipo, "alvoTipo");
    this.require(body.alvoId, "alvoId");
    return this.unitizacao.printEtiqueta(body, user.sub);
  }

  @Post("etiquetas/:id/confirmacao")
  @RequirePermissions("tms.conferir")
  confirmEtiqueta(
    @Param("id") id: string,
    @Body() body: { sucesso?: boolean; erro?: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.confirmEtiqueta(
      id,
      body.sucesso === true,
      body.erro,
      user.sub,
    );
  }

  @Post("volumes/:id/eventos")
  @RequirePermissions("tms.conferir")
  addVolumeEvent(
    @Param("id") id: string,
    @Body() body: { tipo?: string; obs?: string; clientUuid?: string },
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.tipo, "tipo");
    return this.repository.addVolumeEvent(
      id,
      body.tipo!,
      user.sub,
      body.obs,
      body.clientUuid,
    );
  }

  @Get("paletes/proprietarios")
  @RequirePermissions("tms.ver")
  listPaleteOwners() {
    return this.unitizacao.listProprietarios();
  }

  @Get("locais-operacionais")
  @RequirePermissions("tms.ver")
  listLocaisOperacionais(@Query("incluirInativos") includeInactive?: string) {
    return this.unitizacao.listLocais(includeInactive === "true");
  }

  @Post("locais-operacionais")
  @RequirePermissions("cadastros.criar")
  createLocalOperacional(
    @Body() body: SaveLocalOperacionalInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.createLocal(body, user.sub);
  }

  @Patch("locais-operacionais/:id")
  @RequirePermissions("cadastros.editar")
  updateLocalOperacional(
    @Param("id") id: string,
    @Body() body: SaveLocalOperacionalInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.updateLocal(id, body, user.sub);
  }

  @Get("paletes")
  @RequirePermissions("tms.ver")
  listPaletes(
    @Query()
    query: {
      busca?: string;
      status?: string;
      proprietario?: string;
      localId?: string;
      pagina?: string;
      porPagina?: string;
    },
  ) {
    return this.unitizacao.listPaletes(query);
  }

  @Post("paletes")
  @RequirePermissions("tms.criar")
  createPalete(
    @Body() body: SavePaleteInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.createPalete(body, user.sub);
  }

  @Patch("paletes/:id")
  @RequirePermissions("tms.criar")
  updatePalete(
    @Param("id") id: string,
    @Body() body: SavePaleteInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.updatePalete(id, body, user.sub);
  }

  @Post("paletes/:id/alocacoes")
  @RequirePermissions("tms.criar")
  allocatePalete(
    @Param("id") id: string,
    @Body() body: AllocatePaleteInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.viagemId, "viagemId");
    this.require(body.cidadeDestinoSigla, "cidadeDestinoSigla");
    return this.repository.allocatePalete(id, body, user.sub);
  }

  @Post("paletes/:id/liberar")
  @RequirePermissions("tms.criar")
  releasePalete(
    @Param("id") id: string,
    @Body() body: ReleasePaleteInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.releasePalete(id, body, user.sub);
  }

  @Get("conferencias/documentos-disponiveis")
  @RequirePermissions("tms.conferir")
  listDocumentosConferencia(
    @Query("viagemId") viagemId?: string,
    @Query("busca") busca?: string,
  ) {
    this.require(viagemId, "viagemId");
    return this.unitizacao.listDocumentosDisponiveis(viagemId!, busca);
  }

  @Get("conferencias")
  @RequirePermissions("tms.ver")
  listConferencias(
    @Query("viagemId") viagemId?: string,
    @Query("status") status?: string,
    @Query("paleteId") paleteId?: string,
  ) {
    return this.unitizacao.listConferencias(viagemId, status, paleteId);
  }

  @Get("conferencias/:id")
  @RequirePermissions("tms.ver")
  getConferencia(@Param("id") id: string) {
    return this.unitizacao.getConferencia(id);
  }

  @Post("conferencias")
  @RequirePermissions("tms.conferir")
  openConferencia(
    @Body() body: OpenConferenciaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.openConferencia(body, user.sub);
  }

  @Post("conferencias/:id/itens")
  @RequirePermissions("tms.conferir")
  addConferenciaItem(
    @Param("id") id: string,
    @Body() body: AddConferenciaItemInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.addConferenciaItem(id, body, user.sub);
  }

  @Post("conferencias/:id/volumes/receber")
  @RequirePermissions("tms.conferir")
  scanConferenciaVolume(
    @Param("id") id: string,
    @Body() body: ScanConferenciaVolumeInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.scanVolume(id, body, user.sub);
  }

  @Post("conferencias/:id/fechar")
  @RequirePermissions("tms.conferir")
  closeConferencia(
    @Param("id") id: string,
    @Body() body: CloseConferenciaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.unitizacao.closeConferencia(id, body, user.sub);
  }

  @Post("conferencias/evidencias")
  @RequirePermissions("tms.conferir")
  @UseInterceptors(
    FileInterceptor("arquivo", {
      limits: { fileSize: 12 * 1024 * 1024, files: 1 },
    }),
  )
  uploadConferenciaEvidence(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    return this.evidence.upload(file);
  }

  @Get("portaria")
  @RequirePermissions("tms.ver")
  listPortaria() {
    return this.repository.listPortaria();
  }

  @Post("portaria")
  @RequirePermissions("tms.criar")
  createPortaria(
    @Body() body: RegistroPortariaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.empresa, "empresa");
    return this.repository.createPortaria(body, user.sub);
  }

  @Get("entregas")
  @RequirePermissions("tms.ver")
  listEntregas() {
    return this.repository.listEntregas();
  }

  @Post("entregas")
  @RequirePermissions("tms.entregar")
  createEntrega(
    @Body() body: EntregaInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.cidadeSigla, "cidadeSigla");
    return this.repository.createEntrega(body, user.sub);
  }

  @Get("prestacoes")
  @RequirePermissions("prestacao.ver")
  listPrestacoes() {
    return this.repository.listPrestacoes();
  }

  @Get("prestacoes/minhas")
  @RequirePermissions("prestacao.lancar")
  listMinhasPrestacoes(@CurrentUser() user: AuthTokenPayload) {
    return this.repository.listPrestacoes(user.sub);
  }

  @Get("prestacoes/configuracao")
  getPrestacaoConfiguracao() {
    return this.repository.getPrestacaoConfigPublic();
  }

  @Get("prestacoes/viagens-disponiveis")
  @RequirePermissions("prestacao.lancar")
  listViagensPrestacao() {
    return this.repository.listViagensPrestacao();
  }

  @Get("prestacoes/cidades")
  @RequirePermissions("prestacao.lancar")
  listCidadesPrestacao() {
    return this.repository.listCidadesPrestacao();
  }

  @Get("prestacoes/:id")
  @RequirePermissions("prestacao.ver")
  getPrestacao(@Param("id") id: string) {
    return this.repository.findPrestacao(id);
  }

  @Post("prestacoes")
  @RequirePermissions("prestacao.lancar")
  savePrestacao(
    @Body() body: SavePrestacaoContasInput,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    this.require(body.viagemId, "viagemId");
    return this.repository.savePrestacao(body, user.sub);
  }

  @Post("prestacoes/:id/enviar")
  @RequirePermissions("prestacao.lancar")
  enviarPrestacao(@Param("id") id: string, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.enviarPrestacao(id, user.sub);
  }

  @Post("prestacoes/:id/conferir")
  @RequirePermissions("prestacao.conferir")
  conferirPrestacao(@Param("id") id: string, @Body() body: ConferirPrestacaoContasInput, @CurrentUser() user: AuthTokenPayload) {
    return this.repository.conferirPrestacao(id, body, user.sub);
  }

  private require(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException(`${field} obrigatorio`);
    }
  }
}

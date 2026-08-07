import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { AuthTokenPayload } from "../auth/auth.types";
import { TmsEvidenceService } from "../tms/tms-evidence.service";
import { CampoRepository } from "./campo.repository";
import { PortariaEntradaInput, PortariaQuery, PortariaSaidaInput, RegisterCampoDispositivoInput, SaveCampoAplicativoInput, SaveCampoContextoInput, VehicleChecklistInput } from "./campo.types";

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@UseGuards(AuthGuard)
@Controller("campo")
export class CampoController {
  constructor(private readonly repository: CampoRepository, private readonly evidence: TmsEvidenceService) {}

  @Get("aplicativos")
  aplicativos(@CurrentUser() user: AuthTokenPayload) { return this.repository.listAplicativos(user); }

  @Get("catalogo")
  @RequirePermissions("campo.configurar")
  catalogo(@CurrentUser() user: AuthTokenPayload) { return this.repository.listAplicativos(user,true); }

  @Patch("catalogo/:codigo")
  @RequirePermissions("campo.configurar")
  updateApp(@Param("codigo") codigo: string,@Body() body: SaveCampoAplicativoInput,@CurrentUser() user: AuthTokenPayload) {
    return this.repository.updateAplicativo(codigo,body,user.sub);
  }

  @Get("configuracao")
  config() { return this.repository.config(); }

  @Get("contextos/meus")
  meusContextos(@CurrentUser() user: AuthTokenPayload) { return this.repository.meusContextos(user.sub); }

  @Get("contextos")
  @RequirePermissions("campo.contexto_gerenciar")
  contextos(@Query("usuarioId") usuarioId?: string,@Query("inativos") inativos?: string) {
    return this.repository.listContextos(usuarioId,inativos==="true");
  }

  @Post("contextos")
  @RequirePermissions("campo.contexto_gerenciar")
  createContext(@Body() body: SaveCampoContextoInput,@CurrentUser() user: AuthTokenPayload) {
    return this.repository.createContexto(body,user.sub);
  }

  @Patch("contextos/:id")
  @RequirePermissions("campo.contexto_gerenciar")
  updateContext(@Param("id") id: string,@Body() body: SaveCampoContextoInput,@CurrentUser() user: AuthTokenPayload) {
    return this.repository.updateContexto(id,body,user.sub);
  }

  @Post("dispositivos/registrar")
  registerDevice(@Body() body: RegisterCampoDispositivoInput,@CurrentUser() user: AuthTokenPayload) {
    return this.repository.registerDevice(body,user.sub);
  }

  @Get("portaria/configuracao")
  @RequirePermissions("portaria.ver")
  portariaConfig() { return this.repository.portariaConfig(); }

  @Get("portaria/empresas")
  @RequirePermissions("portaria.ver")
  empresas(@Query("busca") busca?: string) { return this.repository.listEmpresas(busca); }

  @Get("portaria")
  @RequirePermissions("portaria.ver")
  portaria(@Query() query: PortariaQuery) { return this.repository.listPortaria(query); }

  @Get("portaria/relatorio")
  @RequirePermissions("portaria.relatorio")
  report(@Query() query: PortariaQuery) { return this.repository.listPortaria({...query,situacao:query.situacao||"todas"},true); }

  @Post("portaria/evidencias")
  @RequirePermissions("portaria.ver")
  @UseInterceptors(FileInterceptor("arquivo",{limits:{fileSize:12*1024*1024,files:1}}))
  uploadPortaria(@UploadedFile() file: Uploaded) { return this.evidence.uploadPortaria(file); }

  @Post("portaria")
  @RequirePermissions("portaria.registrar")
  createPortaria(@Body() body: PortariaEntradaInput,@CurrentUser() user: AuthTokenPayload) {
    if (!body.placa||!body.empresaNome||!body.localOperacionalId||!body.clientUuid) throw new BadRequestException("placa, empresaNome, localOperacionalId e clientUuid obrigatorios");
    return this.repository.createPortaria(body,user.sub);
  }

  @Post("portaria/:id/saida")
  @RequirePermissions("portaria.saida")
  exitPortaria(@Param("id") id: string,@Body() body: PortariaSaidaInput,@CurrentUser() user: AuthTokenPayload) {
    if (!body.clientUuid) throw new BadRequestException("clientUuid obrigatorio");
    return this.repository.registerPortariaExit(id,body,user.sub);
  }

  @Get("entregas/resolver/:codigo")
  @RequirePermissions("entregas.ver")
  resolveDelivery(@Param("codigo") codigo:string) { return this.repository.resolveDeliveryTarget(codigo); }

  @Get("veiculos/checklists/configuracao")
  @RequirePermissions("veiculos.ver")
  vehicleChecklistConfig() { return this.repository.getVehicleChecklistConfig(); }

  @Post("veiculos/evidencias")
  @RequirePermissions("veiculos.ver")
  @UseInterceptors(FileInterceptor("arquivo",{limits:{fileSize:12*1024*1024,files:1}}))
  uploadVehicle(@UploadedFile() file:Uploaded) { return this.evidence.uploadVehicle(file); }

  @Post("veiculos/:id/checklists")
  vehicleChecklist(@Param("id") id:string,@Body() body:VehicleChecklistInput,@CurrentUser() user:AuthTokenPayload) {
    const permission=body.etapa==="recebimento"?"veiculos.vistoriar":body.etapa==="embarque"?"veiculos.embarcar":"veiculos.entregar";
    if(!user.permissions.includes(permission)) throw new ForbiddenException("Sem permissão para esta etapa do checklist");
    return this.repository.saveVehicleChecklist(id,body,user.sub);
  }
}

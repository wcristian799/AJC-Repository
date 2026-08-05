import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  ForbiddenException,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthTokenPayload } from "../auth/auth.types";
import { RequirePermissions } from "../auth/permissions.decorator";
import { ConfigRepository } from "./config.repository";
import { validateNavegacaoRoutesConfig } from "../navegacao/navegacao-config.validator";
import { validateTmsScheduleConfig } from "../tms/tms-config.validator";
import { validateTmsControlConfig } from "../tms/tms-control-config.validator";
import { validateTmsUnitizacaoConfig } from "../tms/tms-unitizacao-config.validator";
import { validateTmsPrestacaoConfig } from "../tms/tms-prestacao-config.validator";
import { validateEncomendasConfig } from "../encomendas/encomendas-config.validator";
import { validatePdvConfig } from "../vendas/vendas-pdv.validator";
import { validateVeiculosOrigensConfig } from "../veiculos/veiculos-config.validator";

interface PublishConfigBody {
  valor?: unknown;
}

@UseGuards(AuthGuard)
@Controller("config")
export class ConfigController {
  constructor(private readonly repository: ConfigRepository) {}

  @Get()
  @RequirePermissions("cadastros.ver")
  listActive() {
    return this.repository.listActive();
  }

  @Get(":chave")
  @RequirePermissions("cadastros.ver")
  async getActive(@Param("chave") chave: string) {
    const config = await this.repository.findActive(chave);
    if (!config) {
      throw new NotFoundException("Configuracao nao encontrada");
    }
    return config;
  }

  @Put(":chave")
  @RequirePermissions("cadastros.editar")
  async publish(
    @Param("chave") chave: string,
    @Body() body: PublishConfigBody,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    if (!chave || chave.trim().length < 2) {
      throw new BadRequestException("Chave invalida");
    }
    if (body.valor === undefined) {
      throw new BadRequestException("valor obrigatorio");
    }
    if (chave.trim() === "tms_prestacao_contas" && !user.permissions.includes("prestacao.configurar")) {
      throw new ForbiddenException("Permissao insuficiente para configurar prestacao de contas");
    }
    if (chave.trim() === "encomendas_operacao" && !user.permissions.includes("encomendas.configurar")) {
      throw new ForbiddenException("Permissao insuficiente para configurar encomendas");
    }
    if (chave.trim() === "vendas_pdv_operacao" && !user.permissions.includes("vendas.configurar")) {
      throw new ForbiddenException("Permissao insuficiente para configurar o PDV");
    }
    if (chave.trim() === "navegacao_rotas_horarios") {
      validateNavegacaoRoutesConfig(body.valor);
    }
    if (chave.trim() === "tms_agendamento_recebimento") {
      validateTmsScheduleConfig(body.valor);
    }
    if (chave.trim() === "tms_controle_viagem") {
      validateTmsControlConfig(body.valor);
    }
    if (chave.trim() === "tms_paletizacao_etiquetas") {
      validateTmsUnitizacaoConfig(body.valor);
    }
    if (chave.trim() === "tms_prestacao_contas") {
      validateTmsPrestacaoConfig(body.valor);
    }
    if (chave.trim() === "encomendas_operacao") {
      validateEncomendasConfig(body.valor);
    }
    if (chave.trim() === "vendas_pdv_operacao") {
      validatePdvConfig(body.valor);
    }
    if (chave.trim() === "veiculos_origens_cadastro") {
      validateVeiculosOrigensConfig(body.valor);
    }
    return this.repository.publish(chave.trim(), body.valor, user.sub);
  }
}

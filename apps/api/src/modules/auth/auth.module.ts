import { Module } from '@nestjs/common';

/**
 * Módulo Auth — shell vazio (E4-H2). Fundação de autenticação e RBAC.
 *
 * A IMPLEMENTAÇÃO (login, login offline, guard de permissão, sessão) é E4-H3 /
 * Fase 2. Aqui só o esqueleto para o AppModule registrar a fronteira.
 *
 * Regra de ouro (ADR 00 §2.2): este módulo NÃO lê tabela de outro módulo —
 * consome interfaces de service quando precisar.
 */
@Module({})
export class AuthModule {}

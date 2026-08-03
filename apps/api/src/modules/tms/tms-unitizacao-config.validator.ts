import { BadRequestException } from "@nestjs/common";

export type UnitizacaoCodigo = "MP" | "PD" | "PC";

export interface TmsUnitizacaoConfig {
  schemaVersion: 1;
  timezone: string;
  unitizacoes: Array<{
    codigo: UnitizacaoCodigo;
    nome: string;
    descricao: string;
    ativo: boolean;
  }>;
  recebimento: {
    exigirEvidencia: boolean;
    minimoEvidencias: number;
    permitirAvulsa: boolean;
  };
  reimpressao: { somenteDiaOperacional: boolean; exigirJustificativa: boolean };
  etiqueta: {
    copiasPadrao: number;
    larguraMm: number | null;
    alturaMm: number | null;
    perfilImpressora: string | null;
    protocolo: "ESC_POS" | "TSPL" | "ZPL" | null;
  };
  offline: { habilitado: boolean; maximoPendencias: number };
}

export function validateTmsUnitizacaoConfig(
  value: unknown,
): asserts value is TmsUnitizacaoConfig {
  const config = record(value);
  if (Number(config.schemaVersion) !== 1)
    throw new BadRequestException("schemaVersion deve ser 1");
  const timezone = text(config.timezone);
  if (!timezone) throw new BadRequestException("timezone obrigatorio");
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format(new Date());
  } catch {
    throw new BadRequestException("timezone invalido");
  }

  if (!Array.isArray(config.unitizacoes) || config.unitizacoes.length !== 3) {
    throw new BadRequestException(
      "MP, PD e PC devem estar presentes na configuracao",
    );
  }
  const codes = new Set<string>();
  config.unitizacoes.forEach((item) => {
    const unit = record(item);
    const codigo = text(unit.codigo).toUpperCase();
    if (!["MP", "PD", "PC"].includes(codigo) || codes.has(codigo))
      throw new BadRequestException(
        "Codigos de unitizacao invalidos ou repetidos",
      );
    if (!text(unit.nome) || !text(unit.descricao))
      throw new BadRequestException(
        `Nome e descricao obrigatorios para ${codigo}`,
      );
    if (typeof unit.ativo !== "boolean")
      throw new BadRequestException(`Ativacao obrigatoria para ${codigo}`);
    codes.add(codigo);
  });

  const receiving = record(config.recebimento);
  boolean(receiving.exigirEvidencia, "recebimento.exigirEvidencia");
  integer(receiving.minimoEvidencias, 0, 10, "recebimento.minimoEvidencias");
  boolean(receiving.permitirAvulsa, "recebimento.permitirAvulsa");
  if (receiving.exigirEvidencia && Number(receiving.minimoEvidencias) < 1) {
    throw new BadRequestException(
      "minimoEvidencias deve ser ao menos 1 quando evidencia for obrigatoria",
    );
  }

  const reprint = record(config.reimpressao);
  boolean(reprint.somenteDiaOperacional, "reimpressao.somenteDiaOperacional");
  boolean(reprint.exigirJustificativa, "reimpressao.exigirJustificativa");

  const label = record(config.etiqueta);
  integer(label.copiasPadrao, 1, 10, "etiqueta.copiasPadrao");
  nullableNumber(label.larguraMm, 20, 200, "etiqueta.larguraMm");
  nullableNumber(label.alturaMm, 15, 300, "etiqueta.alturaMm");
  if (label.perfilImpressora !== null && !text(label.perfilImpressora))
    throw new BadRequestException("etiqueta.perfilImpressora invalido");
  if (
    label.protocolo !== null &&
    !["ESC_POS", "TSPL", "ZPL"].includes(text(label.protocolo))
  )
    throw new BadRequestException("etiqueta.protocolo invalido");

  const offline = record(config.offline);
  boolean(offline.habilitado, "offline.habilitado");
  integer(offline.maximoPendencias, 10, 5000, "offline.maximoPendencias");
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function boolean(value: unknown, field: string) {
  if (typeof value !== "boolean")
    throw new BadRequestException(`${field} deve ser booleano`);
}
function integer(value: unknown, min: number, max: number, field: string) {
  if (
    !Number.isInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new BadRequestException(`${field} deve estar entre ${min} e ${max}`);
}
function nullableNumber(
  value: unknown,
  min: number,
  max: number,
  field: string,
) {
  if (value === null) return;
  if (
    !Number.isFinite(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new BadRequestException(
      `${field} deve estar entre ${min} e ${max} ou vazio`,
    );
}

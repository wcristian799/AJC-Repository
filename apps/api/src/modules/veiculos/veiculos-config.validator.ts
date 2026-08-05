import { BadRequestException } from '@nestjs/common';

export type VeiculosOrigensConfig = {
  schemaVersion: 1;
  origens: Array<{ codigo: string; nome: string; ativo: boolean }>;
  origemPadrao: string;
};

export function validateVeiculosOrigensConfig(value: unknown): VeiculosOrigensConfig {
  if (!value || typeof value !== 'object') throw new BadRequestException('Configuracao de origens invalida');
  const config = value as Partial<VeiculosOrigensConfig>;
  if (config.schemaVersion !== 1) throw new BadRequestException('schemaVersion de origens deve ser 1');
  if (!Array.isArray(config.origens) || config.origens.length === 0) {
    throw new BadRequestException('Cadastre ao menos uma origem de veiculo');
  }
  const codes = new Set<string>();
  for (const item of config.origens) {
    if (!item || typeof item !== 'object') throw new BadRequestException('Origem de veiculo invalida');
    const code = item.codigo?.trim().toLowerCase();
    if (!code || !/^[a-z0-9][a-z0-9_-]{1,59}$/.test(code)) {
      throw new BadRequestException('Codigo de origem deve usar letras minusculas, numeros, _ ou -');
    }
    if (!item.nome?.trim()) throw new BadRequestException(`Nome obrigatorio para a origem ${code}`);
    if (codes.has(code)) throw new BadRequestException(`Codigo de origem duplicado: ${code}`);
    codes.add(code);
  }
  const defaultCode = config.origemPadrao?.trim().toLowerCase();
  if (!defaultCode) throw new BadRequestException('Informe a origem padrao de veiculos');
  const defaultItem = config.origens.find((item) => item.codigo.trim().toLowerCase() === defaultCode);
  if (!defaultItem?.ativo) throw new BadRequestException('A origem padrao precisa existir e estar ativa');
  return {
    schemaVersion: 1,
    origens: config.origens.map((item) => ({
      codigo: item.codigo.trim().toLowerCase(),
      nome: item.nome.trim(),
      ativo: item.ativo !== false,
    })),
    origemPadrao: defaultCode,
  };
}

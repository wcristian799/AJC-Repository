import { Car, ClipboardCheck, Camera, Tag as TagIcon, ScanLine, UserRound, Building2 } from "lucide-react";
import { SectionHeader, PrimaryButton, StatusChip, Tag, brl } from "@/components/ops/primitives";

const envios = [
  {
    id: "VEI-001",
    tipo: "Veículo",
    placa: "QEV-4H21",
    modelo: "Hilux SW4",
    origem: "PDV Porto",
    remetente: "Marcos Vieira · 123.456.789-00 · (91) 98888-1010",
    destinatario: "Ana Ribeiro · 987.654.321-00 · (93) 97777-2020",
    status: "vistoria",
    frete: 1850,
  },
  {
    id: "VEI-002",
    tipo: "Máquina",
    placa: "—",
    modelo: "Retroescavadeira",
    origem: "Comercial",
    remetente: "Norte Obras LTDA · 12.345.678/0001-90 · (91) 93333-1212",
    destinatario: "Porto de Moz Mineração · 23.456.789/0001-10 · (93) 94444-3434",
    status: "embarque",
    frete: 4200,
  },
  {
    id: "VEI-003",
    tipo: "Veículo",
    placa: "RXA-7B43",
    modelo: "Fiat Strada",
    origem: "Gerente do Porto",
    remetente: "Comercial Tapajós · 45.123.899/0001-10 · (93) 95555-8888",
    destinatario: "João Pantoja · 222.333.444-55 · (91) 96666-7777",
    status: "entrega",
    frete: 980,
  },
];

const checklist = [
  "Fotos obrigatórias: frente, traseira, laterais, teto/interior ou pontos críticos",
  "Checklist de envio baseado no modelo Frota Martins",
  "Etiqueta Bluetooth no veículo/máquina",
  "Bipe de subida na balsa",
  "Bipe de descida no destino",
  "Checklist de entrega + assinatura",
];

export function VeiculosTab() {
  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="MVP · veículos e máquinas"
        title="Envio de veículos/máquinas"
        description="Fluxo pedido na validação: cadastro por PDV, Comercial ou Gerente do Porto, vistoria com fotos, etiqueta, bipe de subida/descida e checklist de entrega."
        actions={<PrimaryButton icon={Car}>Novo envio veículo/máquina</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-[color:var(--hairline)] px-5 py-4">
            <h3 className="font-display text-lg">Fila de envios</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Placa obrigatória quando for veículo. Máquina usa identificação operacional.</p>
          </div>
          <div className="divide-y divide-[color:var(--hairline)]">
            {envios.map((e) => (
              <div key={e.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{e.id}</span>
                  <Tag tone={e.tipo === "Veículo" ? "brand" : "warning"}>{e.tipo}</Tag>
                  <span className="font-medium text-foreground">{e.modelo}</span>
                  <span className="font-mono text-xs text-muted-foreground">Placa {e.placa}</span>
                  <StatusChip tone={e.status === "vistoria" ? "warning" : e.status === "embarque" ? "brand" : "success"}>
                    {e.status}
                  </StatusChip>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                  <PessoaLinha icon={UserRound} label="Remetente" value={e.remetente} />
                  <PessoaLinha icon={Building2} label="Destinatário" value={e.destinatario} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Origem do cadastro: {e.origem}</span>
                  <span className="font-mono text-[color:var(--brand)]">Frete {brl(e.frete)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">Checklist operacional</h3>
            </div>
            <div className="mt-3 space-y-2">
              {checklist.map((item, i) => (
                <div key={item} className="flex items-start gap-2 rounded-md bg-[color:var(--muted)] px-3 py-2 text-xs ring-1 ring-[color:var(--hairline)]">
                  <span className="font-mono text-[color:var(--brand)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Estados do app conferente</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Estado icon={Camera} label="Fotos" value="6/6" />
              <Estado icon={TagIcon} label="Etiqueta" value="VEI-001" />
              <Estado icon={ScanLine} label="Bipes" value="Subiu/Desceu" />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">O checklist de entrega repete a prova fotográfica no destino e bloqueia entrega sem bipe do veículo/máquina.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PessoaLinha({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 text-foreground/90">{value}</p>
    </div>
  );
}

function Estado({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 text-center ring-1 ring-[color:var(--hairline)]">
      <Icon className="mx-auto h-4 w-4 text-[color:var(--brand)]" />
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

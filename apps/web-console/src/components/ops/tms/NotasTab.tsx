import { useState } from "react";
import { FileText, Upload, CheckCircle2, AlertTriangle, Link2, Tags } from "lucide-react";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, StatusChip, PrimaryButton, GhostButton, brl, Tag,
} from "@/components/ops/primitives";
import { NOTAS_DC, type NotaDC, type NotaDCStatus } from "@/mocks/data";

const STATUS_TONE: Record<NotaDCStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  conferida: "success",
  divergente: "danger",
};

/** B.2 (upload cliente/agente) + B.3 (fila de lançamento ADM Notas). */
export function NotasTab() {
  const [filtro, setFiltro] = useState<NotaDCStatus | "todos">("todos");
  const rows = NOTAS_DC.filter((n) => filtro === "todos" || n.status === filtro);
  const pendentes = NOTAS_DC.filter((n) => n.status === "pendente").length;
  const semVinculo = NOTAS_DC.filter((n) => !n.cargaId).length;

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="ADM Notas · back-office"
        title="Notas Fiscais & Declarações de Conteúdo"
        description="Fila de documentos enviados por clientes/agentes e lançamento manual. Todo volume sob risco legal exige NF ou DC vinculada antes do embarque."
        actions={
          <>
            <GhostButton icon={Upload}>Lançar manual</GhostButton>
            <PrimaryButton icon={Tags}>Etiquetar por volume</PrimaryButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Pendentes de conferência" value={pendentes} tone="warning" icon={FileText} />
        <MiniStat label="Sem carga vinculada" value={semVinculo} tone="danger" icon={Link2} />
        <MiniStat label="Conferidas hoje" value={NOTAS_DC.filter((n) => n.status === "conferida").length} tone="success" icon={CheckCircle2} />
      </div>

      <FilterBar searchPlaceholder="Buscar número/chave, cliente, carga…">
        <FilterChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos</FilterChip>
        <FilterChip active={filtro === "pendente"} onClick={() => setFiltro("pendente")}>Pendentes</FilterChip>
        <FilterChip active={filtro === "conferida"} onClick={() => setFiltro("conferida")}>Conferidas</FilterChip>
        <FilterChip active={filtro === "divergente"} onClick={() => setFiltro("divergente")}>Divergentes</FilterChip>
      </FilterBar>

      <DataTable<NotaDC>
        rows={rows}
        empty="Fila vazia — nenhum documento aguardando."
        columns={[
          { key: "tipo", header: "Tipo", render: (r) => <Tag tone={r.tipo === "DC" ? "info" : "brand"}>{r.tipo}</Tag> },
          { key: "numero", header: "Número / chave", render: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.numero}</span> },
          { key: "cliente", header: "Cliente", render: (r) => <span className="font-medium">{r.cliente}</span> },
          { key: "valor", header: "Valor", align: "right", render: (r) => <span className="font-mono text-xs">{brl(r.valor)}</span> },
          { key: "cargaId", header: "Carga", render: (r) => r.cargaId
            ? <span className="font-mono text-xs">{r.cargaId}</span>
            : <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--danger)]"><Link2 className="h-3 w-3" />vincular</span> },
          { key: "origem", header: "Origem", render: (r) => <span className="text-xs capitalize text-muted-foreground">{r.origem}</span> },
          { key: "status", header: "Status", render: (r) => <StatusChip tone={STATUS_TONE[r.status]} size="sm">{r.status}</StatusChip> },
          { key: "acao", header: "Ação", align: "right", render: (r) => r.status === "pendente"
            ? (
              <div className="flex items-center justify-end gap-1">
                <button className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]" title="Marcar conferida"><CheckCircle2 className="h-4 w-4" /></button>
                <button className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)]" title="Marcar divergente"><AlertTriangle className="h-4 w-4" /></button>
              </div>
            )
            : <span className="text-[11px] text-muted-foreground">{r.lancadoPor ?? "—"}</span> },
        ]}
      />

      {/* B.2 — superfície de upload do cliente/agente (referência) */}
      <div className="surface-card brand-rail brand-rail-left p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-[color:var(--brand)]" />
          <h3 className="font-display text-lg">Upload do cliente / agente (B.2)</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Como o cliente envia o documento antes ou no momento do envio. O documento cai na fila acima como “pendente”.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <UploadDropzone />
          <div className="space-y-2 text-sm">
            <SelectRow label="Carga / envio" value="Selecione a carga relacionada" />
            <SelectRow label="Tipo de documento" value="NF-e · NFC-e · Declaração de Conteúdo" />
            <SelectRow label="Valor declarado" value="R$ —" />
            <p className="text-[11px] text-muted-foreground">Estados: vazio · carregando · erro (arquivo grande/inválido) · sucesso (“documento enviado, aguardando conferência”).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "warning" | "danger" | "success"; icon: React.ComponentType<{ className?: string }> }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--warning)";
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg ring-1" style={{ color, background: `color-mix(in oklab, ${color} 10%, transparent)`, borderColor: "transparent" }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="big-numeric text-2xl text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function UploadDropzone() {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-[color:var(--hairline-strong)] bg-[color:var(--muted)] p-8 text-center">
      <Upload className="h-8 w-8 text-[color:var(--brand)]" />
      <p className="mt-2 text-sm font-medium">Arraste o PDF/foto ou informe a chave NF-e</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">PDF, JPG ou XML · até 10 MB</p>
    </div>
  );
}

function SelectRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1 flex h-10 items-center rounded-lg bg-[color:var(--muted)] px-3 text-sm text-muted-foreground ring-1 ring-[color:var(--hairline)]">{value}</div>
    </div>
  );
}

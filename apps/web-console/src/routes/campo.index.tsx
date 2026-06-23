import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  DoorOpen, Smartphone, PackagePlus, FileSignature, Ticket, Store,
  ChevronRight, ArrowLeft, Radio,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";

export const Route = createFileRoute("/campo/")({
  head: () => ({ meta: [{ title: "App de campo · AJC" }] }),
  component: CampoHub,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type Posto = {
  nome: string;
  hint: string;
  spec: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  to: string;
  externo?: boolean;
};

const POSTOS: Posto[] = [
  { nome: "Porteiro", hint: "Entrada e saída do pátio", spec: "B.1", icon: DoorOpen, to: "/campo/portaria" },
  { nome: "Conferente do Porto", hint: "Coletor: bipe, 2º bipe e entrega", spec: "B.4/B.7", icon: Smartphone, to: "/campo/conferencia" },
  { nome: "Recebimento direto / Balsa", hint: "Cross-docking na balsa", spec: "B.8", icon: PackagePlus, to: "/campo/recebimento" },
  { nome: "Entregas (desembarque)", hint: "Prova legal: foto + assinatura", spec: "B.9", icon: FileSignature, to: "/campo/entregas" },
  { nome: "Bilheteiro (embarque)", hint: "Validação de QR no embarque", spec: "—", icon: Ticket, to: "/embarque", externo: true },
  { nome: "PDV do porto", hint: "Venda de passagens no balcão", spec: "—", icon: Store, to: "/pos", externo: true },
];

function CampoHub() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[color:var(--surface-noir,var(--background))]">
      {/* glow de fundo cinematográfico */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--brand), transparent)" }}
      />

      <header className="relative mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] to-transparent ring-1 ring-[color:var(--hairline-champagne)]">
            <BrandMark size={20} />
          </span>
          <span className="leading-none">
            <span className="block font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--brand)]">AJC · App de campo</span>
            <span className="mt-1 block text-[13px] font-medium tracking-tight text-foreground">Suite operacional</span>
          </span>
        </div>
        <Link
          to="/app/inicio"
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-foreground/65 ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
          title="Voltar ao painel de gestão"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Gestão
        </Link>
      </header>

      <main className="relative mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <p className="champagne-eyebrow inline-flex items-center gap-2">
            <Radio className="h-3.5 w-3.5" /> Quem está com o coletor
          </p>
          <h1 className="mt-2 font-display text-[2rem] leading-[1.05] text-foreground">Escolha seu posto</h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            Um posto por vez. Offline-first — o que você registrar fica salvo no aparelho e sincroniza quando voltar o sinal.
          </p>
        </motion.div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {POSTOS.map((p, i) => (
            <PostoCard key={p.to} posto={p} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PostoCard({ posto, index }: { posto: Posto; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: easeOut }}
      whileHover={{ y: -3 }}
    >
      <Link
        to={posto.to}
        className="surface-card brand-rail brand-rail-left group relative flex min-h-[7rem] items-center gap-4 overflow-hidden p-5 ring-1 ring-[color:var(--hairline)] transition-colors hover:ring-[color:var(--hairline-brand)] active:bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)]"
      >
        <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
          <posto.icon className="h-7 w-7" strokeWidth={1.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-lg text-foreground">{posto.nome}</span>
            <span className="shrink-0 font-mono text-[9px] text-muted-foreground/70">{posto.spec}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{posto.hint}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--brand)]" />
      </Link>
    </motion.div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Banknote,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Gift,
  History,
  Landmark,
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Ship,
  Ticket,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { RealQR } from "@/components/ops/RealQR";
import { FieldStandaloneGuard } from "@/components/ops/field/FieldStandaloneGuard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  abrirCaixa,
  createCaixaMovimento,
  createPdvVenda,
  createClientePassagem,
  getMeAjc,
  getPdvConfig,
  listBilhetes,
  listCaixaMovimentos,
  listCaixas,
  listCidades,
  listClientesPassagem,
  listCortesias,
  listNavegacaoViagens,
  listPdvVendas,
  listPrecos,
  type AuthUserApi,
  type CaixaApi,
  type CaixaMovimentoApi,
  type CidadeApi,
  type ClientePassagemApi,
  type CortesiaApi,
  type NavegacaoViagemApi,
  type PdvConfigApi,
  type PdvVendaApi,
  type PdvVendaHistoricoApi,
  type PrecoItemApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "PDV de passagens · AJC Ferry Boat" },
      {
        name: "description",
        content:
          "Bilheteria presencial integrada ao caixa, lotação, tarifas e emissão de bilhetes AJC.",
      },
    ],
  }),
  component: () => (
    <FieldStandaloneGuard permission="campo.pdv">
      <PosScreen />
    </FieldStandaloneGuard>
  ),
});

type PaymentCode = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito";
type PdvRules = PdvConfigApi["valor"];
type BasketItem = {
  localId: string;
  classe: string;
  className: string;
  itemPrecoId: string;
  value: number;
  fullValue: number;
  type: "pdv" | "cortesia" | "gratuidade";
  passengerName: string;
  passengerDocument: string;
  passengerBirthDate: string;
  passengerPhone: string;
  passengerSex: string;
  passageClientId?: string;
  courtesyCode?: string;
  freeType?: "idoso" | "pcd" | "crianca" | "outro";
  note?: string;
};
type PaymentLine = { id: string; code: PaymentCode; value: number; installments: number };
type Product = {
  id: string;
  classe: string;
  name: string;
  description: string;
  subtype: string | null;
  value: number;
  color: string | null;
  available: number | null;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
const uuid = () => crypto.randomUUID();

function PosScreen() {
  const [user, setUser] = useState<AuthUserApi | null>(null);
  const [config, setConfig] = useState<PdvConfigApi | null>(null);
  const [cities, setCities] = useState<CidadeApi[]>([]);
  const [trips, setTrips] = useState<NavegacaoViagemApi[]>([]);
  const [prices, setPrices] = useState<PrecoItemApi[]>([]);
  const [clients, setClients] = useState<ClientePassagemApi[]>([]);
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof listBilhetes>>>([]);
  const [cash, setCash] = useState<CaixaApi | null>(null);
  const [tripId, setTripId] = useState("");
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [tripSearch, setTripSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientePassagemApi | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [emitBpe, setEmitBpe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | "cash" | "history" | "withdraw" | "courtesy" | "free">(
    null,
  );
  const [result, setResult] = useState<PdvVendaApi | null>(null);
  const [history, setHistory] = useState<PdvVendaHistoricoApi[]>([]);
  const [movements, setMovements] = useState<CaixaMovimentoApi[]>([]);

  const rules = config?.valor;
  const trip = trips.find((item) => item.id === tripId) ?? null;
  const route = useMemo(() => (trip ? tripRoute(trip) : []), [trip]);
  const originIndex = route.indexOf(origin);
  const destinationOptions = route.filter((_, index) => index > originIndex);
  const cityName = (code: string) => cities.find((city) => city.sigla === code)?.nome ?? code;
  const tripTickets = tickets.filter(
    (ticket) => ticket.viagem_id === tripId && ticket.status !== "cancelado",
  );
  const products = useMemo(
    () => buildProducts(prices, rules, trip, tripTickets, origin, destination),
    [prices, rules, trip, tripTickets, origin, destination],
  );
  const total = round(basket.reduce((sum, item) => sum + item.value, 0));
  const exemptions = round(
    basket.reduce((sum, item) => sum + (item.type === "pdv" ? 0 : item.fullValue), 0),
  );
  const informed = round(payments.reduce((sum, item) => sum + Number(item.value || 0), 0));
  const changeAllowed = payments.some(
    (line) => rules?.formasPagamento.find((rule) => rule.codigo === line.code)?.permiteTroco,
  );
  const change = changeAllowed ? Math.max(0, round(informed - total)) : 0;
  const pending = Math.max(0, round(total - informed));
  const paymentsValid =
    total === 0
      ? payments.length === 0
      : pending === 0 && (informed === total || (informed > total && changeAllowed));
  const passengersValid = basket.every((item) => Boolean(item.passengerName.trim() && item.passengerDocument.replace(/\D/g, "").length === 11 && item.passengerBirthDate && item.passengerSex));
  const selectedItem = basket.find((item) => item.localId === selectedItemId) ?? null;
  const activePayments = rules?.formasPagamento.filter((item) => item.ativo) ?? [];
  const cashToday = cash ? cash.valor_abertura + cash.entradas_dia - cash.saidas_dia : 0;

  useEffect(() => {
    void loadBase();
  }, []);
  useEffect(() => {
    if (!trip) return;
    const nextRoute = tripRoute(trip);
    setOrigin(nextRoute[0] ?? "");
    setDestination(nextRoute.at(-1) ?? "");
    setBasket([]);
    setPayments([]);
    setSelectedItemId(null);
    void reloadTickets(trip.id);
  }, [trip]);

  async function loadBase() {
    setLoading(true);
    setError("");
    try {
      const [me, pdvConfig, cityRows, tripRows, priceRows, clientRows, cashRows] =
        await Promise.all([
          getMeAjc(),
          getPdvConfig(),
          listCidades(),
          listNavegacaoViagens(),
          listPrecos({ tipo: "passagem" }),
          listClientesPassagem(),
          listCaixas(),
        ]);
      setUser(me);
      setConfig(pdvConfig);
      setCities(cityRows.filter((item) => item.ativo));
      setTrips(tripRows.filter((item) => item.status !== "cancelada"));
      setPrices(priceRows);
      setClients(clientRows);
      const ownCash =
        cashRows.find((item) => item.operador_id === me.id && item.status === "aberto") ?? null;
      setCash(ownCash);
      setEmitBpe(pdvConfig.valor.fiscal.pdvPadraoEmitir);
      const activeTrips = tripRows
        .filter((item) => item.status !== "cancelada")
        .sort((a, b) => +new Date(a.dataHoraSaida) - +new Date(b.dataHoraSaida));
      const firstTrip =
        activeTrips.find((trip) => {
          const route = tripRoute(trip);
          return priceRows.some(
            (price) => route.includes(price.origemSigla) && route.includes(price.destinoSigla),
          );
        }) ?? activeTrips[0];
      if (firstTrip) setTripId(firstTrip.id);
      if (!ownCash && pdvConfig.valor.caixa.exigirAbertura) setModal("cash");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }

  async function reloadTickets(selectedTripId: string) {
    try {
      setTickets(await listBilhetes({ viagemId: selectedTripId }));
    } catch (cause) {
      setError(message(cause));
    }
  }

  function addProduct(product: Product) {
    if (product.available !== null && product.available <= 0) return;
    const item: BasketItem = {
      localId: uuid(),
      classe: product.classe,
      className: product.name,
      itemPrecoId: product.id,
      value: product.value,
      fullValue: product.value,
      type: "pdv",
      passengerName: selectedClient?.nome ?? "",
      passengerDocument: selectedClient?.cpf ?? "",
      passengerBirthDate: selectedClient?.data_nascimento?.slice(0, 10) ?? "",
      passengerPhone: selectedClient?.telefone ?? "",
      passengerSex: selectedClient?.sexo ?? "",
      passageClientId: selectedClient?.id,
    };
    setBasket((current) => [...current, item]);
    setSelectedItemId(item.localId);
    if (!payments.length && activePayments[0])
      setPayments([
        {
          id: uuid(),
          code: activePayments[0].codigo,
          value: round(total + product.value),
          installments: 1,
        },
      ]);
    else if (payments.length === 1)
      setPayments((current) =>
        current.map((line) => ({ ...line, value: round(total + product.value) })),
      );
  }

  function removeItem(localId: string) {
    const removed = basket.find((item) => item.localId === localId);
    const nextTotal = round(total - (removed?.value ?? 0));
    setBasket((current) => current.filter((item) => item.localId !== localId));
    if (selectedItemId === localId) setSelectedItemId(null);
    if (payments.length === 1)
      setPayments((current) =>
        nextTotal > 0 ? current.map((line) => ({ ...line, value: nextTotal })) : [],
      );
  }

  function updateBasket(localId: string, patch: Partial<BasketItem>) {
    setBasket((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function clearSale() {
    setBasket([]);
    setPayments([]);
    setSelectedItemId(null);
    setSelectedClient(null);
    setClientSearch("");
    setError("");
  }

  async function completeSale() {
    if (!cash) {
      setModal("cash");
      return;
    }
    if (!trip || !origin || !destination || !basket.length || !paymentsValid || saving) return;
    setSaving(true);
    setError("");
    try {
      const sale = await createPdvVenda({
        caixaId: cash.id,
        viagemId: trip.id,
        origemSigla: origin,
        destinoSigla: destination,
        canal: rules?.canalPadrao,
        emitirBpe,
        itens: basket.map((item) => ({
          classe: item.classe,
          itemPrecoId: item.itemPrecoId,
          passageiroNome: item.passengerName || undefined,
          passageiroDocumento: item.passengerDocument || undefined,
          clientePassagemId: item.passageClientId,
          passageiroDataNascimento: item.passengerBirthDate || undefined,
          passageiroTelefone: item.passengerPhone || undefined,
          passageiroSexo: item.passengerSex || undefined,
          tipo: item.type,
          cortesiaCodigo: item.courtesyCode,
          gratuidadeTipo: item.freeType,
          observacoes: item.note,
        })),
        pagamentos: payments.map((line) => ({
          formaPagamento: line.code,
          valor: line.value,
          parcelas: line.installments,
        })),
        clientUuid: uuid(),
      });
      setResult(sale);
      clearSale();
      await Promise.all([refreshCash(), reloadTickets(trip.id)]);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }

  async function refreshCash() {
    if (!user) return;
    const rows = await listCaixas();
    setCash(rows.find((item) => item.operador_id === user.id && item.status === "aberto") ?? null);
  }

  async function openHistory() {
    if (!cash) return;
    setModal("history");
    try {
      const [sales, cashMovements] = await Promise.all([
        listPdvVendas({ caixaId: cash.id }),
        listCaixaMovimentos(cash.id),
      ]);
      setHistory(sales);
      setMovements(cashMovements);
    } catch (cause) {
      setError(message(cause));
    }
  }

  if (loading) return <LoadingState />;
  if (!rules)
    return <FatalState error={error || "Configuração operacional do PDV não publicada."} />;

  return (
    <main className="pos-shell min-h-dvh bg-[color:var(--background)] text-foreground">
      <header className="border-b border-[color:var(--hairline)] bg-[color:var(--surface-noir)]/95 px-4 py-4 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/campo"
              className="icon-button ring-1 ring-[color:var(--hairline)]"
              aria-label="Voltar aos aplicativos"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--surface-elev)] ring-1 ring-[color:var(--hairline-brand)]">
              <BrandMark size={27} />
            </span>
            <div>
              <p className="champagne-eyebrow">Estação de caixa · {user?.nome ?? "Operador"}</p>
              <h1 className="mt-1 font-display text-xl sm:text-2xl">
                Bilheteria{" "}
                <em className="font-normal text-[color:var(--champagne)]">· venda presencial</em>
              </h1>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <HeaderMetric label="Caixa do dia" value={cash ? money(cashToday) : "Fechado"} />
            <HeaderMetric label="Operações" value={cash ? String(history.length || "—") : "—"} />
            <ActionButton icon={History} onClick={openHistory} disabled={!cash}>
              Histórico
            </ActionButton>
            <ActionButton
              icon={ArrowUpFromLine}
              onClick={() => setModal("withdraw")}
              disabled={!cash}
            >
              Sangria
            </ActionButton>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1720px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-8">
        <section className="min-w-0 space-y-4">
          <div className="surface-card overflow-hidden">
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="champagne-eyebrow">Viagem e intertrecho</p>
                    <h2 className="mt-1 font-display text-2xl">Escolha o embarque</h2>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" /> tarifas e lotação em tempo real
                  </span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
                  <Field label="Viagem">
                    <button type="button" disabled={basket.length > 0} onClick={() => setTripPickerOpen(true)} className="field-control mb-2 flex items-center justify-between text-left"><span className="truncate">{trip ? `${trip.codigo ?? "Viagem"} / ${trip.embarcacaoNome} · ${dateTime(trip.dataHoraSaida)}` : "Selecionar viagem / embarcação"}</span><Search className="h-4 w-4 shrink-0" /></button>
                    <select
                      value={tripId}
                      disabled={basket.length > 0}
                      onChange={(event) => setTripId(event.target.value)}
                      className="sr-only"
                    >
                      {trips.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.codigo ?? "Viagem"} · {item.embarcacaoNome} ·{" "}
                          {dateTime(item.dataHoraSaida)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Embarque">
                    <select
                      value={origin}
                      disabled={basket.length > 0}
                      onChange={(event) => {
                        const next = event.target.value;
                        setOrigin(next);
                        const index = route.indexOf(next);
                        setDestination(route[index + 1] ?? "");
                      }}
                      className="field-control"
                    >
                      {route.slice(0, -1).map((code) => (
                        <option key={code} value={code}>
                          {cityName(code)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Destino">
                    <select
                      value={destination}
                      disabled={basket.length > 0}
                      onChange={(event) => setDestination(event.target.value)}
                      className="field-control"
                    >
                      {destinationOptions.map((code) => (
                        <option key={code} value={code}>
                          {cityName(code)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {basket.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Cancele o atendimento atual para trocar viagem ou trecho.
                  </p>
                )}
              </div>
              <div className="relative min-h-40 overflow-hidden border-t border-[color:var(--hairline)] bg-[color:var(--surface-deep)] xl:border-l xl:border-t-0">
                {trip?.embarcacaoNome ? (
                  <div
                    className="flex h-full flex-col justify-end bg-cover bg-center p-5"
                    style={
                      trip.embarcacaoFotoUrl
                        ? {
                            backgroundImage: `linear-gradient(180deg, transparent, color-mix(in oklab, var(--surface-deep) 92%, transparent)), url(${trip.embarcacaoFotoUrl})`,
                          }
                        : undefined
                    }
                  >
                    <Ship
                      className="absolute right-5 top-5 h-14 w-14 text-[color:var(--champagne)]/20"
                      strokeWidth={1}
                    />
                    <p className="champagne-eyebrow">Embarcação</p>
                    <p className="mt-1 font-display text-xl">{trip.embarcacaoNome}</p>
                    {!trip.embarcacaoFotoUrl && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        A foto será exibida aqui quando cadastrada na frota.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    Nenhuma viagem disponível
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="champagne-eyebrow">Acomodações disponíveis</p>
                <h2 className="mt-1 font-display text-2xl">Adicionar passagem</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {origin && destination
                  ? `${cityName(origin)} → ${cityName(destination)}`
                  : "Selecione um trecho"}
              </p>
            </div>
            {products.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {products.map((product, index) => (
                  <motion.button
                    key={product.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.035 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={product.available === 0}
                    onClick={() => addProduct(product)}
                    className="group relative min-h-44 overflow-hidden rounded-xl bg-[color:var(--surface-tint)] p-4 text-left ring-1 ring-[color:var(--hairline)] transition hover:-translate-y-0.5 hover:ring-[color:var(--hairline-champagne)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--muted)] ring-1 ring-[color:var(--hairline)]">
                        {product.color ? (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: product.color }}
                          />
                        ) : (
                          <Ticket className="h-4 w-4 text-[color:var(--champagne)]" />
                        )}
                      </span>
                      <span className="rounded-md px-2 py-1 font-mono text-[10px] ring-1 ring-[color:var(--hairline)]">
                        {product.available === null
                          ? "lotação não informada"
                          : product.available === 0
                            ? "esgotado"
                            : `${product.available} disponível(is)`}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-xl">{product.name}</h3>
                    <p className="mt-1 min-h-8 text-xs text-muted-foreground">
                      {product.subtype || product.description}
                    </p>
                    <div className="mt-4 flex items-end justify-between">
                      <span className="big-numeric text-2xl text-[color:var(--champagne)]">
                        {money(product.value)}
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--brand)] text-white opacity-0 transition group-hover:opacity-100">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="Nenhuma tarifa publicada para este intertrecho"
                detail="Cadastre e publique os preços de passagem antes de vender."
              />
            )}
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
            <div className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--hairline)] p-5">
                <div>
                  <p className="champagne-eyebrow">Atendimento atual</p>
                  <h2 className="mt-1 font-display text-xl">Passageiros e bilhetes</h2>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal("free")} className="pos-tertiary">
                    <Gift className="h-4 w-4" />
                    Gratuidade
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal("courtesy")}
                    className="pos-tertiary"
                  >
                    <Ticket className="h-4 w-4" />
                    Cortesia
                  </button>
                </div>
              </div>
              {!basket.length ? (
                <EmptyPanel
                  title="Atendimento vazio"
                  detail="Escolha uma acomodação para iniciar a venda."
                />
              ) : (
                <div className="divide-y divide-[color:var(--hairline)]">
                  {basket.map((item, index) => (
                    <button
                      key={item.localId}
                      type="button"
                      onClick={() => setSelectedItemId(item.localId)}
                      className={`grid w-full grid-cols-[34px_minmax(0,1fr)_auto_32px] items-center gap-3 p-4 text-left transition ${selectedItemId === item.localId ? "bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)]" : "hover:bg-[color:var(--surface-tint)]"}`}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--muted)] font-mono text-xs">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.passengerName || "Passageiro avulso"}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {item.className} ·{" "}
                          {item.type === "pdv"
                            ? "tarifa paga"
                            : item.type === "cortesia"
                              ? `cortesia ${item.courtesyCode}`
                              : "gratuidade legal"}
                        </span>
                      </span>
                      <span className="font-mono text-sm">
                        {item.value ? money(item.value) : "Isento"}
                      </span>
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(item.localId);
                        }}
                        className="icon-button h-8 min-h-8 w-8 min-w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-card p-5">
              <p className="champagne-eyebrow">Identificação</p>
              <h2 className="mt-1 font-display text-xl">Cliente e passageiro</h2>
              <div className="relative mt-4">
                <label className="text-xs text-muted-foreground">
                  Cliente cadastrado ou venda avulsa
                </label>
                <button
                  type="button"
                  onClick={() => setClientOpen((value) => !value)}
                  className="field-control mt-1 flex items-center justify-between text-left"
                >
                  <span className="truncate">
                    {selectedClient
                      ? `${selectedClient.nome} · ${selectedClient.cpf ?? "sem CPF"}`
                      : "Venda avulsa"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {clientOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-xl bg-[color:var(--popover)] p-2 shadow-2xl ring-1 ring-[color:var(--hairline-strong)]">
                    <div className="flex items-center gap-2 rounded-lg bg-[color:var(--muted)] px-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        autoFocus
                        value={clientSearch}
                        onChange={(event) => setClientSearch(event.target.value)}
                        placeholder="Nome, código ou CPF/CNPJ"
                        className="h-10 w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <div className="mt-2 max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(null);
                          setClientOpen(false);
                        }}
                        className="w-full rounded-lg p-2 text-left text-sm hover:bg-[color:var(--accent)]"
                      >
                        Venda avulsa
                      </button>
                      {clients
                        .filter((client) =>
                          normalize(
                            `${client.nome} ${client.cpf ?? ""}`,
                          ).includes(normalize(clientSearch)),
                        )
                        .slice(0, 30)
                        .map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientOpen(false);
                              if (selectedItem)
                                updateBasket(selectedItem.localId, {
                                  passengerName: client.nome,
                                  passengerDocument: client.cpf ?? "",
                                  passengerBirthDate: client.data_nascimento?.slice(0, 10) ?? "",
                                  passengerPhone: client.telefone ?? "",
                                  passengerSex: client.sexo ?? "",
                                  passageClientId: client.id,
                                });
                            }}
                            className="w-full rounded-lg p-2 text-left hover:bg-[color:var(--accent)]"
                          >
                            <span className="block text-sm">{client.nome}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {client.cpf || "sem CPF"} · {client.data_nascimento?.slice(0, 10)}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {selectedItem ? (
                <div className="mt-4 space-y-3 border-t border-[color:var(--hairline)] pt-4">
                  <p className="text-xs font-semibold">Passageiro do item selecionado</p>
                  <Field label="Nome completo (opcional na venda avulsa)">
                    <input
                      className="field-control"
                      value={selectedItem.passengerName}
                      onChange={(event) =>
                        updateBasket(selectedItem.localId, { passengerName: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="CPF (obrigatório)">
                    <input
                      className="field-control"
                      value={selectedItem.passengerDocument}
                      onChange={(event) =>
                        updateBasket(selectedItem.localId, {
                          passengerDocument: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Data de nascimento"><input type="date" className="field-control" value={selectedItem.passengerBirthDate} onChange={(event) => updateBasket(selectedItem.localId, { passengerBirthDate: event.target.value })}/></Field>
                    <Field label="Sexo"><select className="field-control" value={selectedItem.passengerSex} onChange={(event) => updateBasket(selectedItem.localId, { passengerSex: event.target.value })}><option value="">Selecione</option><option value="feminino">Feminino</option><option value="masculino">Masculino</option><option value="outro">Outro</option><option value="nao_informado">Não informado</option></select></Field>
                  </div>
                  <Field label="Telefone (opcional)"><input className="field-control" value={selectedItem.passengerPhone} onChange={(event) => updateBasket(selectedItem.localId, { passengerPhone: event.target.value })}/></Field>
                  {!selectedItem.passageClientId && selectedItem.passengerName && selectedItem.passengerBirthDate && selectedItem.passengerSex && <button type="button" className="pos-tertiary" onClick={async () => { try { const client = await createClientePassagem({ nome: selectedItem.passengerName, cpf: selectedItem.passengerDocument || undefined, dataNascimento: selectedItem.passengerBirthDate, telefone: selectedItem.passengerPhone || undefined, sexo: selectedItem.passengerSex }); setClients((rows) => [client, ...rows.filter((row) => row.id !== client.id)]); updateBasket(selectedItem.localId, { passageClientId: client.id }); setSelectedClient(client); } catch (cause) { setError(message(cause)); } }}>Salvar cliente de passagem</button>}
                  <Field label="Observação">
                    <input
                      className="field-control"
                      value={selectedItem.note ?? ""}
                      onChange={(event) =>
                        updateBasket(selectedItem.localId, { note: event.target.value })
                      }
                    />
                  </Field>
                </div>
              ) : (
                <p className="mt-5 rounded-lg bg-[color:var(--surface-tint)] p-3 text-xs text-muted-foreground">
                  Selecione um bilhete à esquerda para identificar o passageiro.
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="h-fit lg:sticky lg:top-4">
          <div className="rounded-2xl bg-[color:var(--surface-noir)] ring-1 ring-[color:var(--hairline-champagne)] shadow-[0_30px_70px_-35px_color-mix(in_oklab,var(--champagne)_28%,transparent)]">
            <div className="p-5">
              <p className="champagne-eyebrow">Total selecionado</p>
              <p className="big-numeric mt-3 text-5xl">{money(total)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {basket.length} bilhete(s) · {origin || "—"} → {destination || "—"}
              </p>
              {exemptions > 0 && (
                <p className="mt-2 text-xs text-[color:var(--champagne)]">
                  {money(exemptions)} em isenções registradas
                </p>
              )}
            </div>
            <div className="border-t border-[color:var(--hairline)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="champagne-eyebrow">Recebimentos</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pagamento misto permitido</p>
                </div>
                <button
                  type="button"
                  disabled={total === 0 || !activePayments.length}
                  onClick={() =>
                    setPayments((current) => [
                      ...current,
                      {
                        id: uuid(),
                        code: activePayments[0].codigo,
                        value: pending,
                        installments: 1,
                      },
                    ])
                  }
                  className="pos-tertiary h-9 px-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Forma
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {payments.map((line) => {
                  const rule = activePayments.find((item) => item.codigo === line.code);
                  return (
                    <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_112px_34px] gap-2">
                      <select
                        value={line.code}
                        onChange={(event) =>
                          setPayments((current) =>
                            current.map((item) =>
                              item.id === line.id
                                ? {
                                    ...item,
                                    code: event.target.value as PaymentCode,
                                    installments: 1,
                                  }
                                : item,
                            ),
                          )
                        }
                        className="field-control"
                      >
                        <option value="" disabled>
                          Forma
                        </option>
                        {activePayments.map((item) => (
                          <option key={item.codigo} value={item.codigo}>
                            {item.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Valor recebido"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.value || ""}
                        onChange={(event) =>
                          setPayments((current) =>
                            current.map((item) =>
                              item.id === line.id
                                ? { ...item, value: Number(event.target.value) }
                                : item,
                            ),
                          )
                        }
                        className="field-control text-right font-mono"
                      />
                      <button
                        type="button"
                        aria-label="Remover pagamento"
                        onClick={() =>
                          setPayments((current) => current.filter((item) => item.id !== line.id))
                        }
                        className="icon-button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {rule && rule.parcelasMax > 1 && (
                        <select
                          value={line.installments}
                          disabled={rule.acrescimoPercentual === null}
                          onChange={(event) =>
                            setPayments((current) =>
                              current.map((item) =>
                                item.id === line.id
                                  ? { ...item, installments: Number(event.target.value) }
                                  : item,
                              ),
                            )
                          }
                          className="field-control col-span-2"
                        >
                          <option value={1}>À vista</option>
                          {rule.acrescimoPercentual !== null &&
                            Array.from(
                              { length: rule.parcelasMax - 1 },
                              (_, index) => index + 2,
                            ).map((count) => (
                              <option key={count} value={count}>
                                {count}x · acréscimo {rule.acrescimoPercentual}%
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              {total > 0 && !payments.length && (
                <button
                  type="button"
                  onClick={() =>
                    activePayments[0] &&
                    setPayments([
                      { id: uuid(), code: activePayments[0].codigo, value: total, installments: 1 },
                    ])
                  }
                  className="mt-3 w-full rounded-lg border border-dashed border-[color:var(--hairline-strong)] py-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  Lançar pagamento de {money(total)}
                </button>
              )}
              <div className="mt-4 space-y-2 rounded-lg bg-[color:var(--surface-tint)] p-3 text-xs">
                <Summary label="Soma informada" value={money(informed)} />
                <Summary
                  label={pending ? "Falta receber" : "Valor conciliado"}
                  value={pending ? money(pending) : money(total)}
                  tone={pending ? "warning" : "success"}
                />
                {change > 0 && <Summary label="Troco" value={money(change)} tone="success" />}
              </div>
            </div>
            <div className="border-t border-[color:var(--hairline)] p-5">
              {rules.fiscal.pdvPermiteEscolha && (
                <label className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-[color:var(--surface-tint)] p-3 text-xs">
                  <span>
                    <span className="block font-semibold">Emitir BP-e no ato</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {rules.fiscal.integracaoAtiva
                        ? "Integração fiscal ativa"
                        : "Adapter fiscal pendente; ficará auditado"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={emitBpe}
                    onChange={(event) => setEmitBpe(event.target.checked)}
                    className="h-4 w-4 accent-[color:var(--brand)]"
                  />
                </label>
              )}
              {error && (
                <p className="mb-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-xs text-[color:var(--danger)]">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={completeSale}
                disabled={!basket.length || !paymentsValid || !passengersValid || !cash || saving}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--champagne)] px-4 font-semibold text-[color:var(--ink)] transition hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ReceiptText className="h-4 w-4" />
                )}
                {saving
                  ? "Concluindo venda…"
                  : total
                    ? `Receber ${money(total)}`
                    : "Emitir bilhetes isentos"}
              </button>
              <button
                type="button"
                onClick={clearSale}
                disabled={!basket.length}
                className="mt-3 w-full py-2 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-30"
              >
                Cancelar atendimento
              </button>
              {basket.length > 0 && !passengersValid && <p className="mt-2 text-xs text-[color:var(--warning)]">Preencha nome, CPF, nascimento e sexo de cada passageiro antes de receber.</p>}
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Configuração PDV v{config.versao} · preço v{prices[0]?.versao ?? "—"}
          </p>
        </aside>
      </div>

      <AnimatePresence>
        {tripPickerOpen && <Modal title="Selecionar viagem / embarcação" subtitle="Busque por código, rota, data, status ou embarcação." onClose={() => setTripPickerOpen(false)} wide><div className="flex items-center gap-2 rounded-lg bg-[color:var(--muted)] px-3"><Search className="h-4 w-4"/><input autoFocus className="h-11 w-full bg-transparent outline-none" value={tripSearch} onChange={(e) => setTripSearch(e.target.value)} placeholder="Buscar viagem / embarcação"/></div><div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">{trips.filter((item) => normalize(`${item.codigo} ${item.embarcacaoNome} ${item.origemSigla} ${item.destinoSigla} ${item.dataHoraSaida} ${item.status}`).includes(normalize(tripSearch))).map((item) => <button key={item.id} type="button" onClick={() => { setTripId(item.id); setTripPickerOpen(false); setTripSearch(""); }} className={`w-full rounded-xl p-4 text-left ring-1 ${item.id === tripId ? "bg-[color:var(--surface-tint)] ring-[color:var(--brand)]" : "ring-[color:var(--hairline)]"}`}><p className="font-mono text-sm">{item.codigo ?? "Viagem"} / {item.embarcacaoNome}</p><p className="mt-1 text-xs text-muted-foreground">{item.origemSigla} → {item.destinoSigla ?? ""} · {dateTime(item.dataHoraSaida)} · {item.status}</p></button>)}{!trips.length && <EmptyPanel title="Nenhuma viagem disponível" detail="Cadastre e publique uma viagem antes de vender."/>}</div></Modal>}
        {modal === "cash" && (
          <CashModal
            rules={rules}
            onClose={() => cash && setModal(null)}
            onOpened={(opened) => {
              setCash({ ...opened, entradas_dia: 0, saidas_dia: 0, saldo: opened.valor_abertura });
              setModal(null);
            }}
          />
        )}
        {modal === "withdraw" && cash && (
          <WithdrawModal
            cash={cash}
            onClose={() => setModal(null)}
            onSaved={async () => {
              setModal(null);
              await refreshCash();
            }}
          />
        )}
        {modal === "history" && (
          <HistoryModal sales={history} movements={movements} onClose={() => setModal(null)} />
        )}
        {modal === "courtesy" && trip && (
          <CourtesyModal
            tripId={trip.id}
            products={products}
            onClose={() => setModal(null)}
            onSelect={(courtesy, product) => {
              const item: BasketItem = {
                localId: uuid(),
                classe: product.classe,
                className: product.name,
                itemPrecoId: product.id,
                value: 0,
                fullValue: product.value,
                type: "cortesia",
                passengerName: selectedClient?.nome ?? "",
                passengerDocument: selectedClient?.cpf ?? "",
                passengerBirthDate: selectedClient?.data_nascimento?.slice(0, 10) ?? "",
                passengerPhone: selectedClient?.telefone ?? "",
                passengerSex: selectedClient?.sexo ?? "",
                passageClientId: selectedClient?.id,
                courtesyCode: courtesy.codigo,
                note: courtesy.observacoes ?? courtesy.motivo ?? undefined,
              };
              setBasket((current) => [...current, item]);
              setSelectedItemId(item.localId);
              setModal(null);
            }}
          />
        )}
        {modal === "free" && (
          <FreeModal
            rules={rules}
            products={products}
            onClose={() => setModal(null)}
            onSelect={(freeType, product) => {
              const item: BasketItem = {
                localId: uuid(),
                classe: product.classe,
                className: product.name,
                itemPrecoId: product.id,
                value: 0,
                fullValue: product.value,
                type: "gratuidade",
                passengerName: selectedClient?.nome ?? "",
                passengerDocument: selectedClient?.cpf ?? "",
                passengerBirthDate: selectedClient?.data_nascimento?.slice(0, 10) ?? "",
                passengerPhone: selectedClient?.telefone ?? "",
                passengerSex: selectedClient?.sexo ?? "",
                passageClientId: selectedClient?.id,
                freeType,
              };
              setBasket((current) => [...current, item]);
              setSelectedItemId(item.localId);
              setModal(null);
            }}
          />
        )}
        {result && (
          <SuccessModal
            sale={result}
            printingEnabled={rules.impressao.habilitada}
            onClose={() => setResult(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function CashModal({
  rules,
  onClose,
  onOpened,
}: {
  rules: PdvRules;
  onClose: () => void;
  onOpened: (cash: CaixaApi) => void;
}) {
  const [value, setValue] = useState(
    rules.caixa.valorAberturaPadrao == null ? "" : String(rules.caixa.valorAberturaPadrao),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Informe um valor de abertura válido.");
      return;
    }
    setSaving(true);
    try {
      onOpened(
        await abrirCaixa({
          tipo: rules.caixa.tipo,
          referencia: rules.caixa.referenciaPadrao,
          valorAbertura: amount,
        }),
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Abrir estação de caixa"
      subtitle="O saldo inicial será conciliado no fechamento."
      onClose={onClose}
      locked
    >
      <Field label="Valor de abertura">
        <input
          autoFocus
          className="field-control mt-1 text-right font-mono text-lg"
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <button
        type="button"
        onClick={open}
        disabled={saving || value === ""}
        className="pos-primary mt-5 w-full"
      >
        <Landmark className="h-4 w-4" />
        {saving ? "Abrindo…" : "Abrir caixa"}
      </button>
    </Modal>
  );
}

function WithdrawModal({
  cash,
  onClose,
  onSaved,
}: {
  cash: CaixaApi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    const amount = Number(value);
    if (!(amount > 0) || !reason.trim()) {
      setError("Informe valor e motivo da sangria.");
      return;
    }
    setSaving(true);
    try {
      await createCaixaMovimento(cash.id, {
        tipo: "sangria",
        formaPagamento: "dinheiro",
        valor: -amount,
        observacao: reason.trim(),
        clientUuid: uuid(),
      });
      onSaved();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Registrar sangria"
      subtitle={`Saldo atual ${money(cash.saldo)}`}
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Valor">
          <input
            autoFocus
            className="field-control mt-1"
            type="number"
            min="0.01"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Field label="Motivo">
          <input
            className="field-control mt-1"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="button" onClick={save} disabled={saving} className="pos-primary mt-5 w-full">
        <ArrowUpFromLine className="h-4 w-4" />
        {saving ? "Registrando…" : "Confirmar sangria"}
      </button>
    </Modal>
  );
}

function HistoryModal({
  sales,
  movements,
  onClose,
}: {
  sales: PdvVendaHistoricoApi[];
  movements: CaixaMovimentoApi[];
  onClose: () => void;
}) {
  const withdrawals = movements.filter((item) => item.tipo === "sangria");
  return (
    <Modal
      title="Histórico do caixa"
      subtitle="Vendas e movimentações desta estação."
      onClose={onClose}
      wide
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-xl ring-1 ring-[color:var(--hairline)]">
          {sales.length ? (
            sales.map((sale) => (
              <div
                key={sale.id}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-[color:var(--hairline)] p-4 last:border-0"
              >
                <div>
                  <p className="font-mono text-xs">{sale.codigo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sale.viagem_codigo} · {sale.origem_sigla} → {sale.destino_sigla} ·{" "}
                    {dateTime(sale.criado_em)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{money(sale.total_pago)}</p>
                  <p className="text-[10px] text-muted-foreground">{sale.bilhetes} bilhete(s)</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyPanel
              title="Nenhuma venda neste caixa"
              detail="As vendas concluídas aparecerão aqui."
            />
          )}
        </div>
        <div className="rounded-xl bg-[color:var(--surface-tint)] p-4 ring-1 ring-[color:var(--hairline)]">
          <p className="text-sm font-semibold">Sangrias</p>
          {withdrawals.length ? (
            <div className="mt-3 space-y-3">
              {withdrawals.map((item) => (
                <div key={item.id}>
                  <p className="font-mono text-sm text-[color:var(--danger)]">
                    {money(Math.abs(item.valor))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.observacao || "Sem observação"} · {dateTime(item.criado_em)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Nenhuma sangria registrada.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CourtesyModal({
  tripId,
  products,
  onClose,
  onSelect,
}: {
  tripId: string;
  products: Product[];
  onClose: () => void;
  onSelect: (courtesy: CortesiaApi, product: Product) => void;
}) {
  const [rows, setRows] = useState<CortesiaApi[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CortesiaApi | null>(null);
  const [productId, setProductId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    listCortesias({ viagemId: tripId })
      .then((data) => setRows(data.filter((item) => item.status === "nao_usada")))
      .catch((cause) => setError(message(cause)));
  }, [tripId]);
  const visible = rows.filter((item) =>
    normalize(`${item.codigo} ${item.motivo ?? ""} ${item.observacoes ?? ""}`).includes(
      normalize(search),
    ),
  );
  const compatible = useMemo(
    () => products.filter((product) => !selected?.classe || product.classe === selected.classe),
    [products, selected?.classe],
  );
  useEffect(() => {
    setProductId(compatible[0]?.id ?? "");
  }, [compatible, selected?.id]);
  return (
    <Modal
      title="Usar cortesia"
      subtitle="Somente códigos reais, emitidos para esta viagem e ainda não utilizados."
      onClose={onClose}
    >
      <div className="flex items-center gap-2 rounded-lg bg-[color:var(--muted)] px-3">
        <Search className="h-4 w-4" />
        <input
          autoFocus
          className="h-11 w-full bg-transparent outline-none"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar código ou motivo"
        />
      </div>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className={`w-full rounded-lg p-3 text-left ring-1 ${selected?.id === item.id ? "bg-[color:color-mix(in_oklab,var(--brand)_9%,transparent)] ring-[color:var(--brand)]" : "ring-[color:var(--hairline)]"}`}
          >
            <p className="font-mono text-xs">{item.codigo}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.motivo || "Sem motivo"} · {item.classe || "classe livre"}
            </p>
            {item.observacoes && <p className="mt-1 text-xs">{item.observacoes}</p>}
          </button>
        ))}
        {!visible.length && (
          <EmptyPanel
            title="Nenhuma cortesia disponível"
            detail="Gere a cortesia em Vendas antes de utilizá-la no PDV."
          />
        )}
      </div>
      {selected && (
        <div className="mt-4">
          <Field label="Acomodação">
            <select
              className="field-control mt-1"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              {compatible.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {money(product.value)}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            disabled={!productId}
            onClick={() => {
              const product = compatible.find((item) => item.id === productId);
              if (product) onSelect(selected, product);
            }}
            className="pos-primary mt-4 w-full"
          >
            <Check className="h-4 w-4" />
            Aplicar cortesia
          </button>
        </div>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </Modal>
  );
}

function FreeModal({
  rules,
  products,
  onClose,
  onSelect,
}: {
  rules: PdvRules;
  products: Product[];
  onClose: () => void;
  onSelect: (freeType: "idoso" | "pcd" | "crianca" | "outro", product: Product) => void;
}) {
  const freeRows = rules.gratuidades.filter((item) => item.ativo);
  const [freeType, setFreeType] = useState<"idoso" | "pcd" | "crianca" | "outro">(
    freeRows[0]?.codigo ?? "outro",
  );
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selectedRule = freeRows.find((item) => item.codigo === freeType);
  return (
    <Modal
      title="Gratuidade legal"
      subtitle="A hipótese e o documento ficam vinculados ao bilhete para controle regulatório."
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Hipótese legal">
          <select
            className="field-control mt-1"
            value={freeType}
            onChange={(event) => setFreeType(event.target.value as typeof freeType)}
          >
            {freeRows.map((item) => (
              <option key={item.codigo} value={item.codigo}>
                {item.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Acomodação">
          <select
            className="field-control mt-1"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {money(product.value)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {selectedRule && (
        <p className="mt-3 rounded-lg bg-[color:var(--surface-tint)] p-3 text-xs text-muted-foreground">
          Comprovação: {selectedRule.documentoExigido}. Informe o documento no passageiro antes de
          concluir.
        </p>
      )}
      <button
        type="button"
        disabled={!productId}
        onClick={() => {
          const product = products.find((item) => item.id === productId);
          if (product) onSelect(freeType, product);
        }}
        className="pos-primary mt-4 w-full"
      >
        <Gift className="h-4 w-4" />
        Adicionar gratuidade
      </button>
    </Modal>
  );
}

function SuccessModal({
  sale,
  printingEnabled,
  onClose,
}: {
  sale: PdvVendaApi;
  printingEnabled: boolean;
  onClose: () => void;
}) {
  function print() {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    const tickets = sale.bilhetes
      .map(
        (ticket) =>
          `<article><h2>${escapeHtml(ticket.codigo)}</h2><p>${escapeHtml(ticket.passageiroNome || "Passageiro avulso")} · ${escapeHtml(ticket.classe)}</p><p>${escapeHtml(sale.origem_sigla)} → ${escapeHtml(sale.destino_sigla)}</p><p class="qr">${escapeHtml(ticket.qrToken)}</p></article>`,
      )
      .join("");
    win.document.write(
      `<!doctype html><meta charset="utf-8"><title>${escapeHtml(sale.codigo)}</title><style>body{font:12px Arial;color:#111;padding:20px}article{page-break-after:always;border:1px solid #bbb;padding:18px;max-width:360px}h2{margin:0}.qr{font:11px monospace;word-break:break-all}@media print{body{padding:0}}</style>${tickets}<script>window.onload=()=>window.print()</script>`,
    );
    win.document.close();
  }
  return (
    <Modal
      title="Venda concluída"
      subtitle={`${sale.codigo} · ${sale.bilhetes.length} bilhete(s) emitido(s)`}
      onClose={onClose}
    >
      <div className="max-h-[55vh] space-y-3 overflow-y-auto">
        {sale.bilhetes.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-center gap-3 rounded-xl bg-[color:var(--surface-tint)] p-3 ring-1 ring-[color:var(--hairline)]"
          >
            <RealQR value={ticket.qrToken} size={68} />
            <div className="min-w-0">
              <p className="font-mono text-xs">{ticket.codigo}</p>
              <p className="mt-1 truncate text-sm">
                {ticket.passageiroNome || "Passageiro avulso"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.classe} · {ticket.tipo}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className="pos-tertiary justify-center">
          Nova venda
        </button>
        <button
          type="button"
          onClick={print}
          className="pos-primary"
          title={
            printingEnabled
              ? "Impressora homologada"
              : "Abre impressão do navegador; hardware ainda não homologado"
          }
        >
          <Printer className="h-4 w-4" />
          Imprimir bilhetes
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  locked = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  locked?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-backdrop"
      onMouseDown={() => !locked && onClose()}
    >
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`modal-panel bg-[color:var(--card)] ring-1 ring-[color:var(--hairline-strong)] ${wide ? "max-w-4xl" : "max-w-xl"}`}
      >
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {!locked && (
            <button type="button" onClick={onClose} className="icon-button">
              <X className="h-4 w-4" />
            </button>
          )}
        </header>
        {children}
      </motion.section>
    </motion.div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden min-w-28 border-l border-[color:var(--hairline)] px-4 lg:block">
      <p className="champagne-eyebrow">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}
function ActionButton({
  icon: Icon,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button type="button" {...props} className="pos-tertiary hidden sm:inline-flex">
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono ${tone === "success" ? "text-[color:var(--success)]" : tone === "warning" ? "text-[color:var(--warning)]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-xs text-[color:var(--danger)]">
      {children}
    </p>
  );
}
function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-32 place-items-center p-6 text-center">
      <div>
        <Ticket className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
function LoadingState() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--background)]">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[color:var(--brand)]" />
        <p className="mt-3 text-sm text-muted-foreground">Carregando estação de caixa…</p>
      </div>
    </main>
  );
}
function FatalState({ error }: { error: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--background)] p-4">
      <section className="surface-card max-w-lg p-6 text-center">
        <CircleDollarSign className="mx-auto h-8 w-8 text-[color:var(--danger)]" />
        <h1 className="mt-4 font-display text-2xl">PDV indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Link to="/campo" className="pos-tertiary mt-5 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos aplicativos
        </Link>
      </section>
    </main>
  );
}

function tripRoute(trip: NavegacaoViagemApi) {
  const result = [
    trip.origemSigla,
    ...[...trip.escalas].sort((a, b) => a.ordem - b.ordem).map((item) => item.cidadeSigla),
  ];
  if (trip.destinoSigla && !result.includes(trip.destinoSigla)) result.push(trip.destinoSigla);
  return [...new Set(result)];
}
function capacityOf(raw: Record<string, unknown>, classe: string) {
  const value = raw?.[classe];
  const normalized =
    typeof value === "object" && value !== null
      ? ((value as { capacidade?: unknown; disponivel?: unknown }).capacidade ??
        (value as { disponivel?: unknown }).disponivel)
      : value;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function buildProducts(
  prices: PrecoItemApi[],
  rules: PdvRules | undefined,
  trip: NavegacaoViagemApi | null,
  tickets: Awaited<ReturnType<typeof listBilhetes>>,
  origin: string,
  destination: string,
): Product[] {
  if (!rules || !trip || !origin || !destination) return [];
  const occupied = new Map<string, number>();
  tickets.forEach((ticket) => occupied.set(ticket.classe, (occupied.get(ticket.classe) ?? 0) + 1));
  return prices
    .filter(
      (item) =>
        item.origemSigla === origin &&
        item.destinoSigla === destination &&
        item.classe &&
        item.valor !== null,
    )
    .map((item) => {
      const metadata = rules.classes.find((entry) => entry.codigo === item.classe && entry.ativo);
      if (!metadata) return null;
      const capacity = capacityOf(trip.capacidadePaxDisponivel, item.classe!);
      return {
        id: item.id,
        classe: item.classe!,
        name: metadata.nome,
        description: metadata.descricao,
        subtype: item.subtipo,
        value: Number(item.valor),
        color: metadata.corPulseira,
        available:
          capacity === null ? null : Math.max(0, capacity - (occupied.get(item.classe!) ?? 0)),
      };
    })
    .filter((item): item is Product => item !== null);
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Não foi possível concluir a operação.";
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char,
  );

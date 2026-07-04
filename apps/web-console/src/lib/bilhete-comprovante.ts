import QRCode from "qrcode";

export type BilheteComprovante = {
  codigo: string;
  passageiro: string;
  trecho: string;
  embarcacao: string;
  data: string;
  hora: string;
  classe: string;
  valor: string;
  assento?: string | null;
};

export async function baixarComprovanteBilhete(input: BilheteComprovante) {
  const html = await comprovanteHtml(input);
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) {
    baixarHtml(`${nomeArquivo(input.codigo)}.html`, html);
    return;
  }
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  janela.print();
}

export async function compartilharComprovanteBilhete(input: BilheteComprovante) {
  const texto = comprovanteTexto(input);
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
    clipboard?: Navigator["clipboard"];
  };

  if (nav.share) {
    await nav.share({ title: `Bilhete AJC ${input.codigo}`, text: texto });
    return;
  }

  if (nav.clipboard?.writeText) {
    await nav.clipboard.writeText(texto);
    return;
  }

  baixarTxt(`${nomeArquivo(input.codigo)}.txt`, texto);
}

async function comprovanteHtml(input: BilheteComprovante) {
  const qrDataUrl = await QRCode.toDataURL(input.codigo, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  const linhas = [
    ["Passageiro", input.passageiro],
    ["Trecho", input.trecho],
    ["Embarcacao", input.embarcacao],
    ["Data", input.data],
    ["Embarque", input.hora],
    ["Classe", input.classe],
    [input.assento ? "Camarote" : "Valor", input.assento || input.valor],
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Bilhete AJC ${escapeHtml(input.codigo)}</title>
  <style>
    body { margin: 0; background: #f4f4f5; color: #111; font-family: Arial, sans-serif; }
    main { width: min(420px, calc(100vw - 32px)); margin: 32px auto; background: #fff; border: 1px solid #ddd; border-radius: 18px; overflow: hidden; }
    header { padding: 18px 22px; background: #330006; color: #fff; }
    h1 { margin: 0; font-size: 20px; letter-spacing: .02em; }
    .sub { margin-top: 4px; font-size: 12px; opacity: .75; }
    .qr { display: grid; place-items: center; padding: 24px; background: #111; }
    .qr img { width: 220px; height: 220px; padding: 14px; border-radius: 18px; background: #fff; }
    code { display: block; margin-top: 12px; color: #fff; font-size: 12px; letter-spacing: .12em; }
    dl { margin: 0; display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #ddd; }
    div.row { padding: 14px 16px; border-right: 1px solid #eee; border-bottom: 1px solid #eee; min-width: 0; }
    dt { color: #777; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; }
    dd { margin: 4px 0 0; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
    footer { padding: 14px 18px; color: #555; font-size: 11px; }
    @media print { body { background: #fff; } main { margin: 0 auto; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>AJC Ferry Boat</h1>
      <div class="sub">Bilhete eletronico de embarque</div>
    </header>
    <section class="qr">
      <img src="${qrDataUrl}" alt="QR Code do bilhete" />
      <code>${escapeHtml(input.codigo)}</code>
    </section>
    <dl>
      ${linhas.map(([label, value]) => `<div class="row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>
    <footer>Apresente este QR no embarque. Validade e status sao conferidos online/offline pelo sistema AJC.</footer>
  </main>
</body>
</html>`;
}

function comprovanteTexto(input: BilheteComprovante) {
  return [
    `Bilhete AJC: ${input.codigo}`,
    `Passageiro: ${input.passageiro}`,
    `Trecho: ${input.trecho}`,
    `Embarcacao: ${input.embarcacao}`,
    `Data: ${input.data}`,
    `Embarque: ${input.hora}`,
    `Classe: ${input.classe}`,
    input.assento ? `Camarote: ${input.assento}` : `Valor: ${input.valor}`,
  ].join("\n");
}

function baixarHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  baixarBlob(filename, blob);
}

function baixarTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  baixarBlob(filename, blob);
}

function baixarBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function nomeArquivo(codigo: string) {
  return `ajc-bilhete-${codigo.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

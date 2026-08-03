import {
  addTmsConferenciaItem,
  closeTmsConferencia,
  scanTmsConferenciaVolume,
  uploadTmsConferenciaEvidencia,
} from "@/lib/ajc-api";

const QUEUE_KEY = "ajc.tms.recebimento.queue.v1";
const DB_NAME = "ajc-tms-recebimento";
const STORE = "evidencias";
type EvidenceMeta = { key: string; nome: string; mime: string };
export type ReceivingOperation =
  | {
      id: string;
      kind: "item";
      conferenceId: string;
      payload: {
        documentoFiscalId: string;
        quantidadeInformada: number;
        justificativa?: string;
        clientUuid: string;
      };
      createdAt: string;
    }
  | {
      id: string;
      kind: "scan";
      conferenceId: string;
      payload: { volumeUuid: string; clientUuid: string };
      createdAt: string;
    }
  | {
      id: string;
      kind: "close";
      conferenceId: string;
      payload: {
        estadoComposicao?: "parcial" | "completo";
        observacao?: string;
        clientUuid: string;
        evidencias: EvidenceMeta[];
      };
      createdAt: string;
    };

export function listReceivingQueue(): ReceivingOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
export function queueReceivingOperation(operation: ReceivingOperation, maximoPendencias = 500) {
  const current = listReceivingQueue();
  if (current.length >= maximoPendencias)
    throw new Error(
      `Limite de ${maximoPendencias} operações offline atingido. Reconecte para sincronizar.`,
    );
  const rows = [...current, operation];
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("ajc:receiving-queue", { detail: rows.length }));
}
function saveQueue(rows: ReceivingOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("ajc:receiving-queue", { detail: rows.length }));
}

export async function persistEvidence(file: File): Promise<EvidenceMeta> {
  const key = crypto.randomUUID();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return { key, nome: file.name, mime: file.type };
}
async function readEvidence(key: string): Promise<File | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const blob = req.result as Blob | undefined;
      resolve(blob ? new File([blob], "evidencia", { type: blob.type }) : null);
    };
    req.onerror = () => reject(req.error);
  });
}
async function deleteEvidence(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushReceivingQueue(onProgress?: (pending: number) => void) {
  let rows = listReceivingQueue();
  for (const operation of [...rows]) {
    if (typeof navigator !== "undefined" && !navigator.onLine) break;
    try {
      if (operation.kind === "item")
        await addTmsConferenciaItem(operation.conferenceId, operation.payload);
      if (operation.kind === "scan")
        await scanTmsConferenciaVolume(operation.conferenceId, operation.payload);
      if (operation.kind === "close") {
        const evidencias = [] as Array<{ url: string; hash: string; nome?: string; mime?: string }>;
        for (const meta of operation.payload.evidencias) {
          const file = await readEvidence(meta.key);
          if (!file) throw new Error(`Evidência offline ${meta.nome} não foi encontrada`);
          const uploaded = await uploadTmsConferenciaEvidencia(
            new File([file], meta.nome, { type: meta.mime || file.type }),
          );
          evidencias.push(uploaded);
        }
        await closeTmsConferencia(operation.conferenceId, {
          estadoComposicao: operation.payload.estadoComposicao,
          observacao: operation.payload.observacao,
          clientUuid: operation.payload.clientUuid,
          evidencias,
        });
        for (const meta of operation.payload.evidencias) await deleteEvidence(meta.key);
      }
      rows = rows.filter((row) => row.id !== operation.id);
      saveQueue(rows);
      onProgress?.(rows.length);
    } catch {
      break;
    }
  }
  return rows.length;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

import { generateKemKeypair, generateSigningKeypair } from './pqc';
import { generateX25519Keypair } from './hybrid';
import { sealEnvelope, openEnvelope } from './envelope';
import type { KeyBundle, WorkerRequest, WorkerResponse } from './types';

async function generateKeys(): Promise<KeyBundle> {
  const kem = generateKemKeypair();
  const sig = generateSigningKeypair();
  const x25519 = await generateX25519Keypair();
  return {
    kemPublicKey: kem.publicKey,
    kemSecretKey: kem.secretKey,
    signPublicKey: sig.publicKey,
    signSecretKey: sig.secretKey,
    x25519PublicKey: x25519.publicKey,
    x25519SecretKey: x25519.secretKey,
  };
}

type Methods = {
  generateKeys: typeof generateKeys;
  sealEnvelope: typeof sealEnvelope;
  openEnvelope: typeof openEnvelope;
};

const methods: Methods = { generateKeys, sealEnvelope, openEnvelope };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, method, args } = e.data;
  try {
    const fn = methods[method as keyof Methods];
    if (!fn) throw new Error(`Unknown method: ${method}`);
    const result = await (fn as (...a: unknown[]) => unknown)(...args);
    self.postMessage({ id, result } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, error: message } satisfies WorkerResponse);
  }
};

export type CryptoWorkerAPI = {
  generateKeys(): Promise<KeyBundle>;
  sealEnvelope(...args: Parameters<typeof sealEnvelope>): Promise<string>;
  openEnvelope(...args: Parameters<typeof openEnvelope>): Promise<Uint8Array>;
  terminate(): void;
};

export function createCryptoWorker(): CryptoWorkerAPI {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  let nextId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const { id, result, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  };

  function call(method: string, args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, method, args } satisfies WorkerRequest);
    });
  }

  return {
    generateKeys: () => call('generateKeys', []) as Promise<KeyBundle>,
    sealEnvelope: (...args) => call('sealEnvelope', args) as Promise<string>,
    openEnvelope: (...args) => call('openEnvelope', args) as Promise<Uint8Array>,
    terminate: () => worker.terminate(),
  };
}

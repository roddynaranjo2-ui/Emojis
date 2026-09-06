/**
 * Save backup — portable "save code": base64url(deflate(JSON)) with a checksum prefix.
 * Works fully offline; the same code can be pasted on any device / shared via the OS share sheet.
 * (A hosted sync endpoint can later accept these codes verbatim.)
 */
import { state, type Save } from './state';

const MAGIC = 'EMV1';

function crc32(str: string): string {
  let c = 0 ^ -1;
  for (let i = 0; i < str.length; i++) { c ^= str.charCodeAt(i); for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ((c ^ -1) >>> 0).toString(16).padStart(8, '0');
}
const b64u = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string): Uint8Array => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function deflate(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return new TextEncoder().encode(text);
  const cs = new CompressionStream('deflate-raw'); const w = cs.writable.getWriter(); void w.write(new TextEncoder().encode(text)); void w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function inflate(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); void w.write(new Uint8Array(bytes) as unknown as BufferSource); void w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}

export async function exportSave(): Promise<string> {
  const json = JSON.stringify(state.save);
  return `${MAGIC}.${crc32(json)}.${b64u(await deflate(json))}`;
}

export async function importSave(code: string): Promise<boolean> {
  try {
    const parts = code.trim().split('.');
    if (parts.length !== 3 || parts[0] !== MAGIC) return false;
    const json = await inflate(unb64u(parts[2]!));
    if (crc32(json) !== parts[1]) return false;
    const raw = JSON.parse(json) as Partial<Save>;
    if (typeof raw !== 'object' || !raw || typeof raw.unlocked !== 'number') return false;
    localStorage.setItem('emojiverse.save', json);
    return true;
  } catch { return false; }
}

export async function shareSave(): Promise<'shared' | 'copied' | 'failed'> {
  const code = await exportSave();
  const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
  if (nav.share) { try { await nav.share({ title: 'Emojiverse save', text: code }); return 'shared'; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(code); return 'copied'; } catch { return 'failed'; }
}

export async function downloadSave(): Promise<void> {
  const code = await exportSave();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
  a.download = `emojiverse-save-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

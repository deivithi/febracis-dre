import type { DashboardLayoutPayload } from './dashboardLayout.types';

export const LAYOUT_SHARE_MAX_BYTES = 50 * 1024;

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function payloadByteSize(payload: DashboardLayoutPayload): number {
  return utf8ByteLength(JSON.stringify(payload));
}

function utf8ToBase64(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** Base64url sem padding (URL-safe). */
export function encodeLayoutShare(payload: DashboardLayoutPayload): string {
  const json = JSON.stringify(payload);
  const bytes = utf8ByteLength(json);
  if (bytes > LAYOUT_SHARE_MAX_BYTES) {
    throw new Error(`Layout excede ${LAYOUT_SHARE_MAX_BYTES} bytes (${bytes}). Reduza widgets ou propriedades.`);
  }
  const b64 = utf8ToBase64(json);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeLayoutShare(token: string): DashboardLayoutPayload | null {
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const json = base64ToUtf8(b64);
    if (utf8ByteLength(json) > LAYOUT_SHARE_MAX_BYTES) {
      return null;
    }
    const data = JSON.parse(json) as DashboardLayoutPayload;
    if (!data || !Array.isArray(data.widgets)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

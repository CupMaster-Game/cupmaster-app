import { hc } from 'hono/client';
import type { AppType } from '@backend/webserver';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

// `hc<AppType>` is generic on the backend's inferred shape, which flows through
// every call site (api.user.$get() etc). The variable itself reads as `any` to
// the linter even though the returned methods are fully typed — disable unsafe
// rules for this file rather than threading manual types.
export const api = hc<AppType>(API_BASE);

export type ApiClient = typeof api;

export function tokenKey(address: string): string {
  return `cupmaster_token_${address.toLowerCase()}`;
}

export function getAuthedApi(address: string | undefined): ApiClient | null {
  if (!address) return null;
  const token = localStorage.getItem(tokenKey(address));
  if (!token) return null;
  return hc<AppType>(API_BASE, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

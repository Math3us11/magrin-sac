import type { Request } from 'express';
import { isIP } from 'node:net';

// O cabeçalho só é confiável quando o backend escuta em loopback atrás de um proxy conhecido,
// como o Cloudflare Tunnel; sem configuração, usa o endereço da conexão.
export function resolveClientIp(request: Request, trustedHeader: string | null): string {
  if (trustedHeader) {
    const candidate = request.get(trustedHeader)?.split(',')[0]?.trim();
    if (candidate && isIP(candidate)) return candidate;
  }

  return request.socket.remoteAddress ?? 'unknown';
}

import { homedir } from "node:os";
import { join, resolve } from "node:path";

const TUNNEL_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function resolveCloudflareConfig(environment = process.env) {
  const tunnelId = environment.CLOUDFLARE_TUNNEL_ID?.trim() ?? "";
  const publicHostname =
    environment.CLOUDFLARE_PUBLIC_HOSTNAME?.trim() || "agenda.magrinapp.com";
  const originValue =
    environment.CLOUDFLARE_TUNNEL_ORIGIN?.trim() || "http://127.0.0.1:3100";

  if (!TUNNEL_ID_PATTERN.test(tunnelId)) {
    throw new Error(
      "CLOUDFLARE_TUNNEL_ID deve conter o UUID do túnel criado na Cloudflare.",
    );
  }

  if (
    publicHostname !== "magrinapp.com" &&
    !publicHostname.endsWith(".magrinapp.com")
  ) {
    throw new Error(
      "CLOUDFLARE_PUBLIC_HOSTNAME deve pertencer ao domínio magrinapp.com.",
    );
  }

  const origin = new URL(originValue);
  if (
    origin.protocol !== "http:" ||
    !LOOPBACK_HOSTS.has(origin.hostname) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      "CLOUDFLARE_TUNNEL_ORIGIN deve ser uma origem HTTP local, sem credenciais, caminho, query ou fragmento.",
    );
  }

  const port = origin.port || "80";
  const credentialsFile = resolve(
    environment.CLOUDFLARE_TUNNEL_CREDENTIALS_FILE?.trim() ||
      join(homedir(), ".cloudflared", `${tunnelId}.json`),
  );

  return {
    credentialsFile,
    origin,
    port,
    publicHostname,
    tunnelId,
  };
}

export function resolveStableDatabase(environment = process.env) {
  const database = environment.STABLE_DB_DATABASE?.trim() ?? "";

  if (!/^[a-z0-9_]+$/.test(database)) {
    throw new Error(
      "STABLE_DB_DATABASE deve identificar um banco separado usando letras minúsculas, números e underscore.",
    );
  }

  return database;
}

/**
 * Caller-identity resolution. The Worker only ever trusts a Supabase-signed
 * JWT in the `Authorization: Bearer <jwt>` header. Verification is HS256
 * against `SUPABASE_ANON_JWT_SECRET`.
 *
 * V0 is intentionally simple: validates signature + `exp`, returns the
 * `sub` claim as `actorUserId`. RBAC (the user's role on a given project) is
 * resolved later from the `time.role` projection.
 */

export interface AuthenticatedUser {
  actorUserId: string;
}

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const decoder = new TextDecoder();

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function verifyJwt(
  authHeader: string | undefined,
  jwtSecret: string,
  now: Date = new Date(),
): Promise<AuthenticatedUser> {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new AuthError(401, "missing bearer token");
  }
  const token = authHeader.slice("bearer ".length).trim();
  const parts = token.split(".");
  if (parts.length !== 3)
    throw new AuthError(401, "malformed jwt");
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const headerJson = decoder.decode(base64UrlDecode(headerB64));
  let header: { alg?: string };
  try {
    header = JSON.parse(headerJson);
  } catch {
    throw new AuthError(401, "malformed jwt header");
  }
  if (header.alg !== "HS256") {
    throw new AuthError(401, `unsupported alg ${header.alg ?? "<missing>"}`);
  }

  // Verify HS256 signature using WebCrypto (available in CF Workers + Node ≥18).
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const expectedSig = base64UrlDecode(signatureB64);
  const ok = await crypto.subtle.verify("HMAC", key, expectedSig, signedData);
  if (!ok) throw new AuthError(401, "invalid jwt signature");

  let payload: { sub?: string; exp?: number };
  try {
    payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64)));
  } catch {
    throw new AuthError(401, "malformed jwt payload");
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < now.getTime()) {
    throw new AuthError(401, "jwt expired");
  }
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new AuthError(401, "jwt missing sub claim");
  }
  return { actorUserId: payload.sub };
}

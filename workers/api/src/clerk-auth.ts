import { verifyToken } from "@clerk/backend";

export interface AccountIdentity { id: string; email: string }

export function allowedOrigins(frontendOrigin: string): string[] {
  return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173", "http://localhost:8787", "http://127.0.0.1:8787", ...frontendOrigin.split(",").map((origin) => origin.trim())].filter(Boolean);
}

export function createClerkAuth(options: { issuer?: string; jwtKey?: string; secretKey?: string; frontendOrigin: string }) {
  if (!options.issuer || (!options.jwtKey && !options.secretKey)) return undefined;
  const issuer = options.issuer;
  const authorizedParties = allowedOrigins(options.frontendOrigin);
  return async (request: Request): Promise<AccountIdentity | null> => {
    // Only the SDK's short-lived bearer token authenticates API requests.
    const authorization = request.headers.get("Authorization");
    if (!authorization) return null;
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match || match[1].length > 16_384) return null;
    try {
      const claims = await verifyToken(match[1], {
        issuer, jwtKey: options.jwtKey, secretKey: options.secretKey, authorizedParties,
      });
      if (!claims.sub?.startsWith("user_") || typeof claims.sid !== "string" || !claims.sid.startsWith("sess_") || typeof claims.azp !== "string" || !authorizedParties.includes(claims.azp) || claims.sts === "pending") return null;
      return { id: claims.sub, email: typeof claims.email === "string" ? claims.email.slice(0, 254) : "" };
    } catch {
      return null;
    }
  };
}

import { generateKeyPairSync, sign } from "node:crypto";

export const issuer = "https://unit-test.clerk.accounts.dev";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export function configureClerk() {
  process.env.CLERK_ISSUER = issuer;
  process.env.CLERK_JWT_KEY = publicKey;
  delete process.env.CLERK_SECRET_KEY;
  process.env.TWINAML_FRONTEND_ORIGIN = "";
}

export function sessionToken(sub = "user_fixture", overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "fixture" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: issuer, sub, sid: `sess_${sub}`, azp: "http://localhost:5173",
    iat: now, nbf: now - 5, exp: now + 3600,
    email: `${sub.slice(5)}@example.test`, ...overrides,
  })).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

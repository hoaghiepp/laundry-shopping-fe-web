import { jwtDecode } from "jwt-decode";

type JwtPayload = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  realm_access?: {
    roles: string[];
  };
  exp: number;
  iat: number;
  iss: string;
};

export const jwtDecoder = (token: string) => {
  const decoded = jwtDecode<JwtPayload>(token);
  return decoded;
};

/** Clock skew so we refresh slightly before true expiry. */
const DEFAULT_JWT_SKEW_SEC = 45;

/**
 * Returns true if JWT `exp` is in the past (or near past). If `exp` is missing or decode fails, returns false
 * (caller may still try refresh — opaque tokens have no client-side expiry).
 */
export function isJwtExpired(token: string, skewSeconds: number = DEFAULT_JWT_SKEW_SEC): boolean {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (exp == null || typeof exp !== "number") return false;
    const nowSec = Date.now() / 1000;
    return exp <= nowSec + skewSeconds;
  } catch {
    return false;
  }
}

import { authService, extractLoginTokens } from "@/services/api/authService";
import { clearGlobalUserRole, setGlobalUserRole } from "@/utils/globalState";
import { isJwtExpired, jwtDecoder } from "@/utils/jwtDecoder";
import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from "./tokenStore";

let hydrateInFlight: Promise<boolean> | null = null;

function applyRolesFromAccessToken(accessToken: string): void {
  try {
    const decoded = jwtDecoder(accessToken);
    const roles = decoded.realm_access?.roles || [];
    if (roles.length) {
      setGlobalUserRole(roles);
    }
  } catch {
    /* opaque or malformed JWT — leave role unset */
  }
}

async function runEnsureSessionFromStoredTokens(): Promise<boolean> {
  const access = await getAccessToken();
  const refresh = await getRefreshToken();

  if (!access && !refresh) {
    clearGlobalUserRole();
    return false;
  }

  if (access && !isJwtExpired(access)) {
    applyRolesFromAccessToken(access);
    return true;
  }

  if (refresh && !isJwtExpired(refresh)) {
    try {
      const body = await authService.refreshWithRefreshToken(refresh);
      const tokens = extractLoginTokens(body);
      await storeTokens(tokens.access_token, tokens.refresh_token);
      applyRolesFromAccessToken(tokens.access_token);
      return true;
    } catch {
      try {
        await clearTokens();
      } catch {
        /* ignore */
      }
      clearGlobalUserRole();
      return false;
    }
  }

  try {
    await clearTokens();
  } catch {
    /* ignore */
  }
  clearGlobalUserRole();
  return false;
}

/**
 * Restores in-memory role from stored JWT and rotates access token via refresh when needed.
 * Safe to call from multiple places; concurrent calls share one in-flight operation.
 */
export function ensureSessionFromStoredTokens(): Promise<boolean> {
  if (!hydrateInFlight) {
    hydrateInFlight = runEnsureSessionFromStoredTokens().finally(() => {
      hydrateInFlight = null;
    });
  }
  return hydrateInFlight;
}

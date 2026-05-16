/**
 * Global state management for user role
 * Stores the role extracted from JWT token after login
 */

let globalUserRole: string | string[] | null = null;

/**
 * Set the global user role
 * @param role - The role(s) from JWT token
 */
export const setGlobalUserRole = (role: string | string[] | null): void => {
  globalUserRole = role;
};

/**
 * Get the global user role
 * @returns The current user role(s) or null
 */
export const getGlobalUserRole = (): string | string[] | null => {
  return globalUserRole;
};

/**
 * Clear the global user role (e.g., on logout)
 */
export const clearGlobalUserRole = (): void => {
  globalUserRole = null;
};

/**
 * Check if the user has a specific role
 * @param roleToCheck - The role to check for (e.g., 'ROLE_ADMIN')
 * @returns true if the user has the role, false otherwise
 */
export const hasRole = (roleToCheck: string): boolean => {
  if (!globalUserRole) {
    return false;
  }
  
  if (Array.isArray(globalUserRole)) {
    return globalUserRole.includes(roleToCheck);
  }
  
  return globalUserRole === roleToCheck;
};

/**
 * Check if the user is an admin
 * @returns true if the user has ROLE_ADMIN, false otherwise
 */
export const isAdmin = (): boolean => {
  // console.log("isAdmin", hasRole('ROLE_ADMIN'));
  return hasRole('ROLE_ADMIN') || hasRole('ROLE_SUPER_ADMIN');
};

export const isSuperAdmin = (): boolean => {
  return hasRole('ROLE_SUPER_ADMIN');
};
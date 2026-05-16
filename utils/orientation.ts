import { UserRole } from '@/components/auth/RoleSelector';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getGlobalUserRole } from './globalState';

/**
 * Set screen orientation based on user role
 * - Customer (USER): Portrait only
 * - Store or Factory: Portrait and Landscape (all orientations)
 */
export async function setOrientationByRole(role: UserRole | null): Promise<void> {
  try {
    if (role === UserRole.USER) {
      // Customer: Portrait only
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else if (role === UserRole.STORE || role === UserRole.FACTORY) {
      // Store or Factory: All orientations (portrait and landscape)
      await ScreenOrientation.unlockAsync();
    } else {
      // Default: Portrait only (for login screen, etc.)
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  } catch (error) {
    console.error('Error setting screen orientation:', error);
  }
}

/**
 * Set orientation based on current global user role
 * This is useful when checking orientation on app start
 */
export async function setOrientationByCurrentRole(): Promise<void> {
  try {
    const roles = getGlobalUserRole();
    
    // Check if user has store or factory role
    const isStore = roles && Array.isArray(roles) 
      ? roles.some(role => 
          role.toLowerCase().includes('store') || 
          role === 'STORE' || 
          role === 'ROLE_STORE'
        )
      : false;
    
    const isFactory = roles && Array.isArray(roles)
      ? roles.some(role => 
          role.toLowerCase().includes('factory') || 
          role === 'FACTORY' || 
          role === 'ROLE_FACTORY'
        )
      : false;

    if (isStore || isFactory) {
      // Store or Factory: All orientations
      await ScreenOrientation.unlockAsync();
    } else {
      // Customer or no role: Portrait only
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  } catch (error) {
    console.error('Error setting screen orientation from current role:', error);
  }
}

/**
 * Reset orientation to portrait (e.g., on logout)
 */
export async function resetOrientationToPortrait(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    console.error('Error resetting screen orientation:', error);
  }
}









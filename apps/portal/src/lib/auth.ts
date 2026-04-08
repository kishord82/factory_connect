import { createContext, useContext } from 'react';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  factory_id: string;
  factory_name?: string;
  ca_firm_id?: string;
}

/** Role hierarchy for UI visibility */
export type FcRole = 'fc_admin' | 'factory_admin' | 'factory_operator' | 'factory_viewer' | 'ca_admin' | 'ca_staff';

/** Check if user has one of the allowed roles */
export function hasRole(user: AuthUser | null, roles: FcRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as FcRole);
}

/** Check if user can perform write operations */
export function canWrite(user: AuthUser | null): boolean {
  return hasRole(user, ['fc_admin', 'factory_admin', 'factory_operator']);
}

/** Check if user is platform admin */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, ['fc_admin']);
}

/** Check if user is a CA firm user */
export function isCaUser(user: AuthUser | null): boolean {
  return hasRole(user, ['ca_admin', 'ca_staff']);
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

export function parseJwt(token: string): AuthUser | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64);
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}

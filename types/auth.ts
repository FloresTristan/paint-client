export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  last_login_at?: string | null;
}

export interface AuthSuccessResponse {
  message: string;
  user: User;
}

export interface MeResponse {
  authenticated: boolean;
  user?: User;
}

export interface ErrorResponse {
  error: string;
}
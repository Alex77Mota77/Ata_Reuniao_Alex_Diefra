export type Role = 'admin' | 'gestor' | 'financeiro' | 'visualizador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  contract_ids: string[];
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface LoginRequest  { username: string; password: string; }
export interface LoginResponse { access_token: string; token_type: string; user: User; }

export interface UserCreate {
  name: string; email: string; password: string;
  role: Role; contract_ids: string[]; is_active: boolean;
}

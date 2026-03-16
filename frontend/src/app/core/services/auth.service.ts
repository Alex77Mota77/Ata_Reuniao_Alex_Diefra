import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginRequest, LoginResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'diefra_token';
  private readonly USER_KEY  = 'diefra_user';

  // Signals reativos
  currentUser = signal<User | null>(this.loadUser());
  isLoggedIn  = computed(() => !!this.currentUser());
  isAdmin     = computed(() => this.currentUser()?.role === 'admin');
  isGestor    = computed(() => ['admin','gestor'].includes(this.currentUser()?.role ?? ''));
  isFinanceiro= computed(() => ['admin','financeiro'].includes(this.currentUser()?.role ?? ''));

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    return this.http.post<LoginResponse>(
      `${environment.apiUrl}/api/auth/login`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      }),
      catchError(err => throwError(() => err.error?.detail ?? 'Erro ao fazer login'))
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUser(): User | null {
    try {
      const u = localStorage.getItem(this.USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }

  canAccessContract(contractId: string): boolean {
    const u = this.currentUser();
    if (!u) return false;
    if (u.role === 'admin' || u.role === 'financeiro' || u.role === 'visualizador') return true;
    return u.contract_ids.includes(contractId);
  }

  setupAdmin(name: string, email: string, password: string) {
    return this.http.post(`${environment.apiUrl}/api/auth/setup-admin`, { name, email, password, role: 'admin' });
  }
}

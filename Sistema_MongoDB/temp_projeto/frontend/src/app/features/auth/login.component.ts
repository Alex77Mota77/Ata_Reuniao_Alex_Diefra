import { Component, signal } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { Router }            from '@angular/router';
import { AuthService }       from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="min-h-screen bg-[#021a0a] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 mb-4">
          <span class="text-3xl">🏗️</span>
        </div>
        <h1 class="text-3xl font-bold text-white font-serif">DIEFRA</h1>
        <p class="text-emerald-400/70 text-sm mt-1 tracking-widest uppercase">Gestão 2.0</p>
      </div>

      <!-- Card -->
      <div class="bg-[#031f0d] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h2 class="text-xl font-bold text-white mb-6">Acesso ao Sistema</h2>

        @if (error()) {
          <div class="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">
            ⚠️ {{ error() }}
          </div>
        }

        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-emerald-400/70 mb-2 block">Email</label>
            <input [(ngModel)]="email" type="email" placeholder="seu@email.com"
              class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white
                     placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
              (keydown.enter)="doLogin()">
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-emerald-400/70 mb-2 block">Senha</label>
            <input [(ngModel)]="password" type="password" placeholder="••••••••"
              class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white
                     placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
              (keydown.enter)="doLogin()">
          </div>
        </div>

        <button (click)="doLogin()" [disabled]="loading()"
          class="mt-6 w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-bold
                 py-3 rounded-xl transition-all flex items-center justify-center gap-2">
          @if (loading()) { <span class="animate-spin">⟳</span> Entrando... }
          @else { Entrar no Sistema }
        </button>

        <p class="text-center text-white/20 text-xs mt-6">DIEFRA · Sistema Restrito</p>
      </div>
    </div>
  </div>`
})
export class LoginComponent {
  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  doLogin() {
    if (!this.email || !this.password) { this.error.set('Preencha email e senha.'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error.set(e); this.loading.set(false); }
    });
  }
}

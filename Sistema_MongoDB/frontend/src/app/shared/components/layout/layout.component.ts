import { Component, computed } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterModule }        from '@angular/router';
import { AuthService }         from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="min-h-screen bg-[#021a0a] flex">
    <aside class="w-64 bg-[#031f0d] border-r border-white/8 flex flex-col fixed h-full z-50">
      <div class="p-6 border-b border-white/8">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-500/30 flex items-center justify-center text-xl">🏗️</div>
          <div>
            <div class="text-white font-bold font-serif text-lg leading-none">DIEFRA</div>
            <div class="text-emerald-400/50 text-xs tracking-widest">GESTÃO 2.0</div>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-4 space-y-1">
        @for (item of navItems(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="bg-blue-700/20 border-blue-500/40 text-blue-300"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
            <span class="text-lg">{{ item.icon }}</span>{{ item.label }}
          </a>
        }
      </nav>
      <div class="p-4 border-t border-white/8">
        <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
          <div class="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-sm font-bold text-white">{{ initials() }}</div>
          <div class="flex-1 min-w-0">
            <div class="text-white text-sm font-semibold truncate">{{ user()?.name }}</div>
            <div class="text-white/40 text-xs capitalize">{{ user()?.role }}</div>
          </div>
          <button (click)="logout()" class="text-white/30 hover:text-red-400 transition-colors text-lg" title="Sair">⏏</button>
        </div>
      </div>
    </aside>
    <main class="flex-1 ml-64 overflow-auto"><router-outlet></router-outlet></main>
  </div>`
})
export class LayoutComponent {
  user     = computed(() => this.auth.currentUser());
  initials = computed(() => {
    const n = this.auth.currentUser()?.name ?? '';
    return n.split(' ').map((w:string) => w[0]).slice(0,2).join('').toUpperCase();
  });
  navItems = computed(() => {
    const items = [
      { path: '/dashboard',  icon: '📊', label: 'Dashboard'  },
      { path: '/contratos',  icon: '📋', label: 'Contratos'  },
      { path: '/financeiro', icon: '💰', label: 'Financeiro' },
      { path: '/medicoes',   icon: '📐', label: 'Medições'   },
    ];
    if (this.auth.isAdmin()) items.push({ path: '/usuarios', icon: '👥', label: 'Usuários' });
    return items;
  });
  constructor(private auth: AuthService) {}
  logout() { this.auth.logout(); }
}

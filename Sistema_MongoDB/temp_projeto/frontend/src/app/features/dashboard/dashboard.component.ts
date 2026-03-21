import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractService } from '../../core/services/contract.service';
import { AuthService }     from '../../core/services/auth.service';
import { Contract, ConsolidadoGeral } from '../../core/models/contract.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="p-8">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-white font-serif">Dashboard</h1>
        <p class="text-white/40 text-sm mt-1">Olá, {{ user()?.name }} · {{ today() }}</p>
      </div>
      <span class="px-4 py-2 rounded-full text-xs font-bold uppercase border"
        [class]="'bg-blue-700/20 border-blue-500/30 text-blue-300'">
        {{ user()?.role }}
      </span>
    </div>

    <!-- KPIs gerais -->
    <div class="grid grid-cols-4 gap-5 mb-8">
      @for (k of kpis(); track k.label) {
        <div class="bg-[#031f0d] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" [style.background]="k.color"></div>
          <div class="text-[9px] uppercase tracking-[2px] font-bold mb-3 text-white/30">{{ k.label }}</div>
          <div class="text-2xl font-bold font-mono mb-1" [style.color]="k.color">{{ k.value }}</div>
          <div class="text-[11px] text-white/30">{{ k.sub }}</div>
        </div>
      }
    </div>

    <!-- Alertas urgentes -->
    @if (urgentes().length) {
      <div class="bg-red-500/8 border border-red-500/20 rounded-2xl p-5 mb-8">
        <div class="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">
          ⚠️ {{ urgentes().length }} contrato(s) vencem em menos de 120 dias
        </div>
        <div class="grid grid-cols-3 gap-3">
          @for (c of urgentes().slice(0,6); track c.id) {
            <div class="bg-[#031f0d] border border-red-500/15 rounded-xl p-4">
              <div class="text-sm font-bold text-white truncate">{{ c.name }}</div>
              <div class="text-xs text-white/40 mt-1">{{ c.code }}</div>
              <div class="text-xs text-red-400 font-bold mt-2">
                Término: {{ c.end | date:'dd/MM/yyyy':'':'' }}
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Lista de contratos -->
    <div class="mb-3 flex items-center gap-3">
      <span class="text-[10px] font-bold uppercase tracking-[2px] text-white/30">📋 Contratos</span>
      <div class="flex-1 h-px bg-white/8"></div>
      <span class="text-xs text-white/30">{{ contracts().length }} total</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      @for (c of contracts(); track c.id) {
        <div class="bg-[#031f0d] border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/20 transition-all">
          <div class="p-5 border-b border-white/8 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold text-white font-serif truncate">{{ c.name }}</div>
              <div class="text-xs text-white/40 mt-1">{{ c.code }} · {{ c.gestor_tecnico || '—' }}</div>
            </div>
            <span class="px-2 py-1 rounded-full text-[9px] font-bold uppercase shrink-0 border"
              [class]="c.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-white/5 text-white/30 border-white/10'">
              {{ c.status }}
            </span>
          </div>
          <div class="p-5 grid grid-cols-3 gap-4">
            <div>
              <div class="text-[9px] uppercase tracking-wider text-white/30 mb-1">Receita</div>
              <div class="text-sm font-bold font-mono text-sky-400">{{ fmt(c.receita) }}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase tracking-wider text-white/30 mb-1">Resultado</div>
              <div class="text-sm font-bold font-mono" [class]="c.resultado >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ fmt(c.resultado) }}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase tracking-wider text-white/30 mb-1">Margem</div>
              <div class="text-sm font-bold font-mono" [style.color]="c.margem >= 20 ? '#10b981' : c.margem >= 12 ? '#fbbf24' : '#f43f5e'">{{ c.margem.toFixed(1) }}%</div>
            </div>
          </div>
        </div>
      }
    </div>
  </div>`
})
export class DashboardComponent implements OnInit {
  contracts   = signal<Contract[]>([]);
  consolidado = signal<ConsolidadoGeral | null>(null);
  user        = computed(() => this.auth.currentUser());

  urgentes = computed(() => {
    const hoje = new Date();
    return this.contracts()
      .filter(c => c.end && Math.round((new Date(c.end).getTime() - hoje.getTime()) / 86400000) < 120)
      .sort((a, b) => new Date(a.end!).getTime() - new Date(b.end!).getTime());
  });

  kpis = computed(() => {
    const c = this.consolidado();
    if (!c) return [];
    return [
      { label: 'Receita Total',    value: this.fmt(c.receita_total),   color: '#38bdf8', sub: `${c.total_contratos} contratos` },
      { label: 'Resultado Total',  value: this.fmt(c.resultado_total), color: c.resultado_total >= 0 ? '#10b981' : '#f43f5e', sub: 'Receita − Custo' },
      { label: 'Margem Média',     value: c.margem_media.toFixed(2) + '%', color: c.margem_media >= 20 ? '#10b981' : c.margem_media >= 12 ? '#fbbf24' : '#f43f5e', sub: c.margem_media >= 20 ? 'Saudável' : 'Atenção' },
      { label: 'Total Faturado',   value: this.fmt(c.total_faturado),  color: '#34d399', sub: `Exec.: ${c.exec_pct.toFixed(1)}%` },
    ];
  });

  constructor(private svc: ContractService, private auth: AuthService) {}

  ngOnInit() {
    this.svc.getAll().subscribe(c => this.contracts.set(c));
    this.svc.getConsolidado().subscribe(c => this.consolidado.set(c));
  }

  today(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  fmt(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
  }
}

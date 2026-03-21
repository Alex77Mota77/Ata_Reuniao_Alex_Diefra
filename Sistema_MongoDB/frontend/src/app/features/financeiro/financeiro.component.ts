import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { ContractService } from '../../core/services/contract.service';
import { Contract, ConsolidadoGeral, Medicao } from '../../core/models/contract.model';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financeiro.component.html'
})
export class FinanceiroComponent implements OnInit {
  contracts    = signal<Contract[]>([]);
  consolidado  = signal<ConsolidadoGeral | null>(null);
  medicoes     = signal<Medicao[]>([]);
  selectedId   = signal<string>('');
  periodOffset = signal(0);
  selectedPeriod = signal(this.todayKey());
  showModal    = signal(false);
  modalPrev: number | null = null;
  modalReal: number | null = null;
  modalObs = '';

  selected   = computed(() => this.contracts().find(c => c.id === this.selectedId()) ?? null);
  periodRec  = computed(() =>
    this.medicoes().find(m => m.contract_id === this.selectedId() && m.key === this.selectedPeriod()) ?? null
  );
  devPct = computed(() => {
    const r = this.periodRec();
    if (!r?.previsto || r.realizado == null) return null;
    return (r.realizado - r.previsto) / r.previsto * 100;
  });
  devBar = computed(() => {
    const r = this.periodRec();
    if (!r?.previsto || r.realizado == null) return 0;
    return Math.min(100, r.realizado / r.previsto * 100);
  });
  kpiAll = computed(() => {
    const c = this.consolidado();
    if (!c) return [];
    return [
      { label:'Receita Total',       v:this.fmt(c.receita_total),   color:'#38bdf8', sub:`Custo: ${this.fmt(c.custo_total)}` },
      { label:'Resultado Bruto',     v:this.fmt(c.resultado_total), color:c.resultado_total>=0?'#10b981':'#f43f5e', sub:'Receita − Custo' },
      { label:'Margem Média',        v:c.margem_media.toFixed(2)+'%', color:c.margem_media>=20?'#10b981':c.margem_media>=12?'#fbbf24':'#f43f5e',
        sub:c.margem_media>=20?'🟢 Saudável':c.margem_media>=12?'🟡 Atenção':'🔴 Crítica', pct:Math.min(100,c.margem_media/30*100) },
      { label:'Total Faturado',      v:this.fmt(c.total_faturado),  color:'#34d399', sub:'Σ realizados c/ medição' },
      { label:'Execução Faturamento',v:c.exec_pct.toFixed(1)+'%',   color:'#a78bfa', sub:`Saldo: ${this.fmt(c.saldo_a_faturar)}`, pct:c.exec_pct },
    ];
  });
  kpiContract = computed(() => {
    const c = this.selected();
    if (!c) return [];
    return [
      { label:'Receita Contratual', v:this.fmt(c.receita),    color:'#38bdf8', icon:'💵', sub:`Custo: ${this.fmt(c.custo_total)}` },
      { label:'Resultado Bruto',    v:this.fmt(c.resultado),   color:c.resultado>=0?'#10b981':'#f43f5e', icon:c.resultado>=0?'✅':'⚠️', sub:'Receita − Custo' },
      { label:'Margem Bruta',       v:c.margem.toFixed(2)+'%', color:c.margem>=20?'#10b981':c.margem>=12?'#fbbf24':'#f43f5e', icon:'📊', sub:c.margem>=20?'🟢 Saudável':'🟡 Atenção', pct:Math.min(100,c.margem/30*100) },
      { label:'Custo Total',        v:this.fmt(c.custo_total), color:'#f97316', icon:'📉', sub:`${c.receita>0?(c.custo_total/c.receita*100).toFixed(1):0}% da receita`, pct:c.receita>0?Math.min(100,c.custo_total/c.receita*100):0 },
    ];
  });
  periodMonths = computed(() => {
    const offset = this.periodOffset();
    const now = new Date();
    return Array.from({length:19}, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i - 6 + offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      return { key, label: d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','') + ' ' + String(d.getFullYear()).slice(2),
        hasMed: this.medicoes().some(m => m.key===key && (m.previsto||m.realizado)) };
    });
  });
  periodLabel = computed(() => {
    const k = this.selectedPeriod();
    if (!k) return '';
    return new Date(k+'-02').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^\w/,s=>s.toUpperCase());
  });

  constructor(private svc: ContractService) {}
  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.svc.getAll().subscribe(c => { this.contracts.set(c); if(c.length && !this.selectedId()) this.selectedId.set(c[0].id); });
    this.svc.getConsolidado().subscribe(c => this.consolidado.set(c));
    this.svc.getMedicoes().subscribe(m => this.medicoes.set(m));
  }
  selectContract(id: string) { this.selectedId.set(id); }
  selectPeriod(key: string)  { this.selectedPeriod.set(key); }
  shiftPeriod(dir: number)   { this.periodOffset.update(v => v + dir * 6); }
  goToToday()                { this.periodOffset.set(0); this.selectedPeriod.set(this.todayKey()); }
  openModal() { const r=this.periodRec(); this.modalPrev=r?.previsto??null; this.modalReal=r?.realizado??null; this.modalObs=r?.obs??''; this.showModal.set(true); }
  closeModal(){ this.showModal.set(false); }
  saveMedicao(){
    this.svc.saveMedicao({ contract_id:this.selectedId(), key:this.selectedPeriod(), previsto:this.modalPrev??undefined, realizado:this.modalReal??undefined, obs:this.modalObs })
      .subscribe(() => { this.closeModal(); this.loadAll(); });
  }
  todayKey(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  fmt(v: number): string { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v??0); }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { HttpClient }   from '@angular/common/http';
import { ContractService } from '../../core/services/contract.service';
import { environment }  from '../../../environments/environment';
import { User, UserCreate, Role } from '../../core/models/user.model';
import { Contract } from '../../core/models/contract.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-8">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-white font-serif">Usuários</h1>
        <p class="text-white/40 text-sm mt-1">Gerenciar acesso ao sistema</p>
      </div>
      <button (click)="showModal.set(true)"
        class="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all">
        ＋ Novo Usuário
      </button>
    </div>

    <!-- Tabela -->
    <div class="bg-[#031f0d] border border-white/10 rounded-2xl overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-white/8">
            <th class="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Usuário</th>
            <th class="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Email</th>
            <th class="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Perfil</th>
            <th class="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Status</th>
            <th class="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr class="border-b border-white/5 hover:bg-white/3 transition-all">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white">
                    {{ u.name.slice(0,2).toUpperCase() }}
                  </div>
                  <span class="text-sm font-semibold text-white">{{ u.name }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-white/50">{{ u.email }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                  [class]="roleClass(u.role)">{{ u.role }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                  [class]="u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'">
                  {{ u.is_active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <button (click)="deleteUser(u.id)"
                  class="text-xs text-red-400/50 hover:text-red-400 transition-colors font-bold px-3 py-1 rounded-lg hover:bg-red-500/10">
                  Remover
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal -->
  @if (showModal()) {
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" (click)="showModal.set(false)">
      <div class="bg-[#031f0d] border border-blue-500/30 rounded-2xl p-8 w-full max-w-lg" (click)="$event.stopPropagation()">
        <h3 class="text-xl font-bold text-white font-serif mb-6">Novo Usuário</h3>
        <div class="space-y-4">
          <input [(ngModel)]="form.name" placeholder="Nome completo"
            class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50">
          <input [(ngModel)]="form.email" type="email" placeholder="Email"
            class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50">
          <input [(ngModel)]="form.password" type="password" placeholder="Senha (mín. 6 caracteres)"
            class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50">
          <select [(ngModel)]="form.role"
            class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50">
            <option value="admin">Administrador</option>
            <option value="gestor">Gestor de Contrato</option>
            <option value="financeiro">Financeiro</option>
            <option value="visualizador">Visualizador</option>
          </select>
          @if (form.role === 'gestor') {
            <div>
              <div class="text-xs text-white/40 mb-2">Contratos permitidos</div>
              <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                @for (c of contracts(); track c.id) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [value]="c.id" (change)="toggleContract(c.id, $event)"
                      class="rounded border-white/20 bg-[#04280f]">
                    <span class="text-xs text-white/60 truncate">{{ c.name.slice(0,20) }}</span>
                  </label>
                }
              </div>
            </div>
          }
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button (click)="showModal.set(false)" class="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold">Cancelar</button>
          <button (click)="createUser()" class="px-6 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold">Criar Usuário</button>
        </div>
      </div>
    </div>
  }`
})
export class UsuariosComponent implements OnInit {
  users     = signal<User[]>([]);
  contracts = signal<Contract[]>([]);
  showModal = signal(false);
  form: UserCreate = { name:'', email:'', password:'', role:'visualizador' as Role, contract_ids:[], is_active:true };

  constructor(private http: HttpClient, private svc: ContractService) {}

  ngOnInit() {
    this.http.get<User[]>(`${environment.apiUrl}/api/users`).subscribe(u => this.users.set(u));
    this.svc.getAll().subscribe(c => this.contracts.set(c));
  }

  createUser() {
    this.http.post(`${environment.apiUrl}/api/users`, this.form).subscribe(() => {
      this.showModal.set(false);
      this.ngOnInit();
      this.form = { name:'', email:'', password:'', role:'visualizador' as Role, contract_ids:[], is_active:true };
    });
  }

  deleteUser(id: string) {
    if (!confirm('Remover este usuário?')) return;
    this.http.delete(`${environment.apiUrl}/api/users/${id}`).subscribe(() => this.ngOnInit());
  }

  toggleContract(id: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.form.contract_ids = [...this.form.contract_ids, id];
    else this.form.contract_ids = this.form.contract_ids.filter(x => x !== id);
  }

  roleClass(role: string): string {
    const map: Record<string,string> = {
      admin:        'bg-purple-500/10 text-purple-400 border-purple-500/30',
      gestor:       'bg-blue-500/10 text-blue-400 border-blue-500/30',
      financeiro:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      visualizador: 'bg-white/5 text-white/40 border-white/10',
    };
    return map[role] || map['visualizador'];
  }
}

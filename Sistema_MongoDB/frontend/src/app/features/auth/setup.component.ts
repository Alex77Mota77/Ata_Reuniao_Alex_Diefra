import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
@Component({ selector:'app-setup', standalone:true, imports:[CommonModule,FormsModule,RouterModule],
  template:`<div class="min-h-screen bg-[#021a0a] flex items-center justify-center p-4">
  <div class="w-full max-w-md bg-[#031f0d] border border-white/10 rounded-2xl p-8">
    <h1 class="text-2xl font-bold text-white font-serif mb-2">Setup Inicial</h1>
    <p class="text-white/40 text-sm mb-6">Crie o primeiro administrador do sistema.</p>
    @if(done()){<div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm">✅ Admin criado! <a routerLink="/login" class="underline ml-1">Fazer login</a></div>}
    @else{<div class="space-y-4">
      <input [(ngModel)]="name" placeholder="Nome completo" class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50">
      <input [(ngModel)]="email" type="email" placeholder="Email" class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50">
      <input [(ngModel)]="password" type="password" placeholder="Senha (mín. 6)" class="w-full bg-[#04280f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50">
      <button (click)="doSetup()" class="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all">Criar Administrador</button>
    </div>}
  </div></div>`})
export class SetupComponent {
  name=''; email=''; password=''; done=signal(false);
  constructor(private auth: AuthService) {}
  doSetup(){ this.auth.setupAdmin(this.name,this.email,this.password).subscribe(()=>this.done.set(true)); }
}

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
@Component({ selector:'app-denied', standalone:true, imports:[RouterModule],
  template:'<div class="min-h-screen bg-[#021a0a] flex items-center justify-center"><div class="text-center"><div class="text-6xl mb-4">🔒</div><h1 class="text-2xl font-bold text-white">Acesso Negado</h1><p class="text-white/40 mt-2">Você não tem permissão.</p><a routerLink="/dashboard" class="mt-6 inline-block px-6 py-3 bg-blue-700 text-white rounded-xl font-bold">Voltar ao Dashboard</a></div></div>'})
export class DeniedComponent {}

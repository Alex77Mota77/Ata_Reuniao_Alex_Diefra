// ── User ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'gestor' | 'financeiro' | 'visualizador';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

// ── Contract ─────────────────────────────────────────────────────────────────
export type ContractStatus = 'ativo' | 'finalizado' | 'paralizado' | 'mob' | 'desmobilizando' | 'desmob';

export interface Contract {
  _id: string;
  name: string;
  code: string;
  nObra?: string;
  status: ContractStatus;
  start?: string;
  end?: string;
  gestorTecnico?: string;
  telGestorTec?: string;
  gestorAdministrativo?: string;
  telGestorAdm?: string;
  index?: string;
  linkContrato?: string;
  receita: number;
  custoTotal: number;
  saldoGlobal: number;
  justificativa?: string;
  logo?: string;
  logoFit?: string;
  logoPad?: number;
  // Campos calculados
  resultado: number;
  margem: number;
  saldo: number;
  ultimaMedicao: number;
  medicaoPrevista: number;
  totalFaturado: number;
  saldoAFaturar: number;
  execPct: number;
  countMeds: number;
  created_at: string;
  updated_at: string;
}

export interface ContractCreate {
  name: string;
  code: string;
  nObra?: string;
  status?: ContractStatus;
  start?: string;
  end?: string;
  gestorTecnico?: string;
  telGestorTec?: string;
  gestorAdministrativo?: string;
  telGestorAdm?: string;
  index?: string;
  linkContrato?: string;
  receita?: number;
  custoTotal?: number;
  saldoGlobal?: number;
  justificativa?: string;
}

// ── Medicao ───────────────────────────────────────────────────────────────────
export interface Medicao {
  _id: string;
  contractId: string;
  key: string; // YYYY-MM
  previsto?: number;
  realizado?: number;
  obs?: string;
  link?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicaoCreate {
  contractId: string;
  key: string;
  previsto?: number;
  realizado?: number;
  obs?: string;
  link?: string;
}

// ── Task ─────────────────────────────────────────────────────────────────────
export interface Task {
  _id: string;
  contractId: string;
  text: string;
  done: boolean;
  responsavel?: string;
  dataTarefa?: string;
  dataPrevisao?: string;
  dataResolucao?: string;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  totalContratos: number;
  contratosAtivos: number;
  receitaTotal: number;
  custoTotal: number;
  resultadoTotal: number;
  margemMedia: number;
  totalFaturado: number;
  execucaoFaturamento: number;
  contratosVencendo: number;
  tarefasPendentes: number;
}

export interface FinanceiroConsolidado {
  receitaTotal: number;
  custoTotal: number;
  resultadoTotal: number;
  margemMedia: number;
  totalFaturado: number;
  saldoAFaturar: number;
  execucaoFaturamento: number;
  totalContratos: number;
  contratosAtivos: number;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
export interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
  bar?: number;
  barColor?: string;
}

export type ContractStatus =
  | 'ativo' | 'finalizado' | 'paralizado'
  | 'mob' | 'desmobilizando' | 'desmob';

export interface Contract {
  id: string;
  name: string;
  code: string;
  n_obra?: string;
  status: ContractStatus;
  start?: string;
  end?: string;
  gestor_tecnico?: string;
  tel_gestor_tec?: string;
  gestor_administrativo?: string;
  tel_gestor_adm?: string;
  index?: string;
  link_contrato?: string;
  receita: number;
  custo_total: number;
  saldo_global: number;
  justificativa?: string;
  logo?: string;
  // Campos calculados
  resultado: number;
  margem: number;
  saldo: number;
  ultima_medicao: number;
  ultima_medicao_key?: string;
  medicao_prevista: number;
  medicao_prevista_key?: string;
  total_faturado: number;
  saldo_a_faturar: number;
  exec_pct: number;
  count_meds: number;
  created_at: string;
  updated_at: string;
}

export interface ConsolidadoGeral {
  total_contratos: number;
  ativos: number;
  receita_total: number;
  custo_total: number;
  resultado_total: number;
  margem_media: number;
  total_faturado: number;
  saldo_a_faturar: number;
  exec_pct: number;
}

export interface Medicao {
  id?: string;
  contract_id: string;
  key: string;  // YYYY-MM
  previsto?: number;
  realizado?: number;
  obs?: string;
  link?: string;
}

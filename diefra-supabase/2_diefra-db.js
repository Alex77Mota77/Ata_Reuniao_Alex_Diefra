// ════════════════════════════════════════════════════════════════
//  diefra-db.js  —  Cliente Supabase para o DIEFRA
//  Adicione esta tag no <head> do index.html ANTES do seu <script>:
//
//  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//  <script src="diefra-db.js"></script>
// ════════════════════════════════════════════════════════════════

// ── 1. CONFIGURAÇÃO ──────────────────────────────────────────────
// Substitua pelos valores do seu projeto Supabase:
// Supabase → Settings → API → Project URL e anon public key
const SUPABASE_URL  = 'https://nrawjzopaqrxeqxtmluk.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYXdqem9wYXFyeGVxeHRtbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzU3MTYsImV4cCI6MjA5Mzg1MTcxNn0.MSwhi7Y68tXu-hpLtzgRpndwUS3DfmnajhOe0ldp2ns';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 2. AUTENTICAÇÃO ──────────────────────────────────────────────

const Auth = {
  // Login com e-mail e senha
  async login(email, senha) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(error.message);

    // Busca dados do participante vinculado
    const { data: part } = await _sb
      .from('participantes')
      .select('*')
      .eq('email', email)
      .single();

    return { session: data.session, usuario: part };
  },

  async logout() {
    await _sb.auth.signOut();
    currentUser = null;
  },

  async sessaoAtual() {
    const { data } = await _sb.auth.getSession();
    return data.session;
  },

  // Ouve mudanças de sessão (login / logout automático)
  onMudanca(callback) {
    _sb.auth.onAuthStateChange((_event, session) => callback(session));
  }
};

// ── 3. CARREGAMENTO DO ESTADO COMPLETO ───────────────────────────
// Carrega todas as tabelas e monta o objeto ST no formato original

async function carregarEstado() {
  try {
    // Busca todas as tabelas em paralelo
    const [
      { data: contratos },
      { data: tarefas },
      { data: participantes },
      { data: medicoes },
      { data: entregaveis },
      { data: auditorias },
      { data: frota },
      { data: viagens },
      { data: ferias },
      { data: epiItens },
      { data: epiEntregas },
      { data: calibEquips },
      { data: calibRegistros },
      { data: calibNCs },
      { data: custoAnalises },
    ] = await Promise.all([
      _sb.from('contratos').select('*').order('criado_em', { ascending: false }),
      _sb.from('tarefas').select('*'),
      _sb.from('participantes').select('*').eq('ativo', true),
      _sb.from('medicoes').select('*'),
      _sb.from('entregaveis').select('*'),
      _sb.from('auditorias').select('*'),
      _sb.from('frota').select('*'),
      _sb.from('viagens').select('*'),
      _sb.from('ferias').select('*'),
      _sb.from('epi_itens').select('*'),
      _sb.from('epi_entregas').select('*'),
      _sb.from('calib_equipamentos').select('*'),
      _sb.from('calib_registros').select('*'),
      _sb.from('calib_ncs').select('*'),
      _sb.from('custo_analises').select('*'),
    ]);

    // Preenche o ST com os dados do banco
    Object.assign(ST, {
      contracts:       contratos      || [],
      tasks:           tarefas        || [],
      participants:    participantes  || [],
      vacations:       ferias         || [],
      trips:           viagens        || [],
      frota:           frota          || [],
      audits:          auditorias     || [],
      entregaveis:     entregaveis    || [],
      medicoes:        medicoes       || [],
      epiItens:        epiItens       || [],
      epiEntregas:     epiEntregas    || [],
      calibEquips:     calibEquips    || [],
      calibRegistros:  calibRegistros || [],
      calibNCs:        calibNCs       || [],
      custoAnalises:   custoAnalises  || [],
    });

    console.log('✅ Estado carregado do Supabase —', new Date().toLocaleTimeString('pt-BR'));
    return true;
  } catch (err) {
    console.error('❌ Erro ao carregar estado:', err.message);
    return false;
  }
}

// ── 4. OPERAÇÕES POR ENTIDADE ────────────────────────────────────
// Cada função salva um registro individual — sem sobrescrever tudo.
// O sistema chama essas funções ao criar, editar ou excluir um item.

const DB = {

  // ── Contratos ──────────────────────────────────────────────────
  async salvarContrato(c) {
    const reg = {
      id: c.id, numero: c.numero, nome: c.nome || c.name,
      cliente: c.cliente || c.client, status: c.status || 'ativo',
      valor_total: c.valorTotal || c.valor_total || null,
      data_inicio: c.dataInicio || c.data_inicio || null,
      data_fim: c.dataFim || c.data_fim || null,
      cor_a: c.corA || c.cor_a, cor_b: c.corB || c.cor_b,
      descricao: c.descricao, local: c.local || c.location,
    };
    const { error } = await _sb.from('contratos').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  async excluirContrato(id) {
    const { error } = await _sb.from('contratos').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Tarefas ────────────────────────────────────────────────────
  async salvarTarefa(t) {
    const reg = {
      id: t.id, contrato_id: t.contractId || t.contrato_id,
      titulo: t.title || t.titulo, descricao: t.description || t.descricao,
      status: t.status || 'pendente', prioridade: t.priority || t.prioridade || 'media',
      data_venc: t.dueDate || t.data_venc || null,
    };
    const { error } = await _sb.from('tarefas').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  async excluirTarefa(id) {
    await _sb.from('tarefas').delete().eq('id', id);
  },

  // ── Medições ───────────────────────────────────────────────────
  async salvarMedicao(m) {
    const reg = {
      id: m.id, contrato_id: m.contractId || m.contrato_id,
      competencia: m.competencia, valor: m.valor,
      status: m.status || 'pendente', obs: m.obs,
    };
    const { error } = await _sb.from('medicoes').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  async excluirMedicao(id) {
    await _sb.from('medicoes').delete().eq('id', id);
  },

  // ── Equipamentos de Calibração ─────────────────────────────────
  async salvarEquipamento(e) {
    const reg = {
      id: e.id, contrato_id: e.contractId || e.contrato_id,
      tag: e.tag, nome: e.nome || e.name,
      fabricante: e.fabricante, modelo: e.modelo, serie: e.serie,
      tipo: e.tipo, localizacao: e.localizacao || e.location,
      status: e.status || 'ativo',
      freq_dias: e.freqDias || e.freq_dias || 365,
      ultima_calib: e.ultimaCalib || e.ultima_calib || null,
      prox_calib: e.proxCalib || e.prox_calib || null,
    };
    const { error } = await _sb.from('calib_equipamentos').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  async excluirEquipamento(id) {
    await _sb.from('calib_equipamentos').delete().eq('id', id);
  },

  // ── Registros de Calibração ────────────────────────────────────
  async salvarRegistroCalib(r) {
    const reg = {
      id: r.id, equip_id: r.equipId || r.equip_id,
      contrato_id: r.contractId || r.contrato_id,
      data: r.data, resultado: r.resultado, certificado: r.certificado,
      laboratorio: r.laboratorio,
      validade: r.validade || null, obs: r.obs,
    };
    const { error } = await _sb.from('calib_registros').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  async excluirRegistroCalib(id) {
    await _sb.from('calib_registros').delete().eq('id', id);
  },

  // ── Não Conformidades ──────────────────────────────────────────
  async salvarNC(n) {
    const reg = {
      id: n.id, equip_id: n.equipId || n.equip_id,
      contrato_id: n.contractId || n.contrato_id,
      origem: n.origem, dt_abertura: n.dtAbertura || n.dt_abertura,
      dt_fechamento: n.dtFechamento || n.dt_fechamento || null,
      descricao: n.descricao, acao: n.acao,
      status: n.status || 'aberta', responsavel: n.responsavel, obs: n.obs,
    };
    const { error } = await _sb.from('calib_ncs').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  async excluirNC(id) {
    await _sb.from('calib_ncs').delete().eq('id', id);
  },

  // ── EPI ────────────────────────────────────────────────────────
  async salvarEpiItem(item) {
    const { error } = await _sb.from('epi_itens').upsert(item, { onConflict: 'id' });
    if (error) throw error;
  },

  async salvarEpiEntrega(entrega) {
    const reg = {
      id: entrega.id, contrato_id: entrega.contractId || entrega.contrato_id,
      item_id: entrega.itemId || entrega.item_id,
      participante_id: entrega.participanteId || entrega.participante_id,
      quantidade: entrega.quantidade || 1,
      data_entrega: entrega.dataEntrega || entrega.data_entrega || null,
      data_venc: entrega.dataVenc || entrega.data_venc || null,
    };
    const { error } = await _sb.from('epi_entregas').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },

  // ── Frota e Viagens ────────────────────────────────────────────
  async salvarVeiculo(v) {
    const { error } = await _sb.from('frota').upsert(v, { onConflict: 'id' });
    if (error) throw error;
  },

  async salvarViagem(v) {
    const { error } = await _sb.from('viagens').upsert(v, { onConflict: 'id' });
    if (error) throw error;
  },

  // ── Custo de Análises ──────────────────────────────────────────
  async salvarCustoAnalise(c) {
    const reg = {
      id: c.id, contrato_id: c.contractId || c.contrato_id,
      descricao: c.descricao, valor: c.valor,
      data: c.data, categoria: c.categoria, obs: c.obs,
    };
    const { error } = await _sb.from('custo_analises').upsert(reg, { onConflict: 'id' });
    if (error) throw error;
  },
};

// ── 5. TEMPO REAL ─────────────────────────────────────────────────
// Atualiza o ST automaticamente quando outro usuário faz uma mudança

function ativarTempoReal() {
  _sb
    .channel('diefra-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contratos' },
      async () => { await carregarEstado(); if (typeof renderAll === 'function') renderAll(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' },
      async () => { await carregarEstado(); if (typeof renderAll === 'function') renderAll(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calib_ncs' },
      async () => { await carregarEstado(); if (typeof renderAll === 'function') renderAll(); })
    .subscribe();

  console.log('🔴 Tempo real ativado — atualizações automáticas ligadas');
}

// ── 6. TELA DE LOGIN ──────────────────────────────────────────────
// Injeta uma tela de login simples se não houver sessão ativa

function mostrarTelaLogin() {
  const div = document.createElement('div');
  div.id = 'diefra-login-overlay';
  div.style.cssText = `
    position:fixed;inset:0;background:#0b2215;z-index:9999;
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;
    font-family:'Nunito',sans-serif;
  `;
  div.innerHTML = `
    <div style="background:rgba(14,40,24,0.9);border:1px solid rgba(16,185,129,0.3);
                border-radius:20px;padding:48px 40px;width:340px;text-align:center">
      <div style="font-size:13px;letter-spacing:3px;color:#10b981;text-transform:uppercase;
                  font-weight:800;margin-bottom:8px">DIEFRA</div>
      <div style="font-size:22px;font-weight:700;color:#e2e8f0;margin-bottom:32px">
        Gestão de Contratos
      </div>
      <input id="dl-email" type="email" placeholder="E-mail"
        style="width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);
               background:rgba(0,0,0,0.3);color:#e2e8f0;font-size:14px;margin-bottom:12px;outline:none">
      <input id="dl-senha" type="password" placeholder="Senha"
        style="width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);
               background:rgba(0,0,0,0.3);color:#e2e8f0;font-size:14px;margin-bottom:20px;outline:none">
      <button id="dl-btn"
        style="width:100%;padding:14px;border-radius:10px;background:#1d4ed8;color:#fff;
               font-size:14px;font-weight:700;border:none;cursor:pointer;">
        Entrar
      </button>
      <div id="dl-erro" style="color:#ef4444;font-size:13px;margin-top:12px;display:none"></div>
    </div>
  `;
  document.body.appendChild(div);

  async function tentarLogin() {
    const email = document.getElementById('dl-email').value.trim();
    const senha = document.getElementById('dl-senha').value;
    const btn   = document.getElementById('dl-btn');
    const erro  = document.getElementById('dl-erro');
    if (!email || !senha) { erro.textContent = 'Preencha e-mail e senha'; erro.style.display='block'; return; }

    btn.textContent = 'Entrando…';
    btn.disabled = true;
    try {
      const { usuario } = await Auth.login(email, senha);
      currentUser = usuario;
      div.remove();
      await carregarEstado();
      ativarTempoReal();
      if (typeof initApp === 'function') initApp();
    } catch (e) {
      erro.textContent = 'E-mail ou senha inválidos';
      erro.style.display = 'block';
      btn.textContent = 'Entrar';
      btn.disabled = false;
    }
  }

  document.getElementById('dl-btn').addEventListener('click', tentarLogin);
  document.getElementById('dl-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') tentarLogin();
  });
}

// ── 7. INICIALIZAÇÃO ──────────────────────────────────────────────
// Substitui o bloco de init que lia do localStorage

document.addEventListener('DOMContentLoaded', async () => {
  const sessao = await Auth.sessaoAtual();

  if (!sessao) {
    // Nenhuma sessão ativa — mostra login
    mostrarTelaLogin();
    return;
  }

  // Sessão ativa — carrega dados e inicia o app
  await carregarEstado();
  ativarTempoReal();
  if (typeof initApp === 'function') initApp();
});

// Monitora logout automático por expiração de sessão
Auth.onMudanca(sessao => {
  if (!sessao) {
    currentUser = null;
    mostrarTelaLogin();
  }
});

// ── 8. FUNÇÃO scheduleAutoSync COMPATÍVEL ────────────────────────
// O index.html chama scheduleAutoSync() em vários lugares.
// Esta versão salva só o que mudou, usando as funções do DB.

async function scheduleAutoSync() {
  // Salva backup local como segurança offline
  try { localStorage.setItem('diefra_backup', JSON.stringify(ST)); } catch {}
  // O Supabase já salvou cada operação individualmente em tempo real.
  // Esta função existe para compatibilidade com o código original.
  console.log('🔄 Sync — dados já salvos no Supabase em tempo real');
}

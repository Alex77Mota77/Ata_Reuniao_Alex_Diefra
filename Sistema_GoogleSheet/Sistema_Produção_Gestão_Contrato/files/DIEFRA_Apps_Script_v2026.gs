// ════════════════════════════════════════════════════════════════════════════════
//  DIEFRA — Google Apps Script v2026
//  Sistema de Gestão de Contratos — UEN-300
//
//  CONFIGURAÇÃO:
//  1. Crie uma planilha no Google Sheets.
//  2. Cole este script em Extensões → Apps Script.
//  3. Edite as constantes abaixo (SYNC_TOKEN, etc).
//  4. Implante como Web App: Executar como "Mim" / Acesso "Qualquer pessoa".
//  5. Cole a URL gerada em Configurações → URL do Apps Script no sistema.
//
//  CAMPOS v2026 suportados:
//   • contracts     — inclui: objeto, periodoMedicao, periodoEntrega, etc.
//   • custoAnalises — inclui: realizado, dreHistorico, mesRealizadoRef
//   • dashMetas     — Meta Anual de Faturamento + histórico
//   • medicoes, tasks, vacations, managers, participants, gestoresUnidade
//   • trips, frota, dp, funcoes, audits, auditsGestao, entregaveis
//   • epiItens, epiEntregas, calibEquips, calibRegistros, calibVerifs, calibNCs
//   • finRows, logos, nextId
// ════════════════════════════════════════════════════════════════════════════════

// ── CONFIGURAÇÃO OBRIGATÓRIA ─────────────────────────────────────────────────
//
//  ⚠ ATENÇÃO: preencha o SPREADSHEET_ID abaixo antes de implantar!
//
//  Como obter o ID da planilha:
//  Abra sua planilha no Google Sheets. Na URL você verá:
//  https://docs.google.com/spreadsheets/d/ >>> ESTE_É_O_ID <<< /edit
//  Copie o ID e cole entre as aspas abaixo.
//
const SPREADSHEET_ID = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI';

const SYNC_TOKEN    = 'diefra_sync_2026';   // Deve ser igual ao configurado no sistema
const SHEET_NAME    = 'DIEFRA_DATA';        // Nome da aba principal
const SHEET_LOGOS   = 'DIEFRA_LOGOS';       // Aba de logos e fotos (base64)
const MAX_CELL_SIZE = 45000;               // Limite seguro por célula (bytes)
const VERSION       = 'v2026.1';

// ── Retorna a planilha ────────────────────────────────────────────────────
function _getSpreadsheet() {
  // Sempre usa openById — funciona tanto em bound quanto em standalone
  // (desde que autorizado — execute autorizarAcesso() primeiro se necessário)
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * EXECUTE ISSO PRIMEIRO se for a primeira vez ou se houver erro de permissão.
 * Isso força o Google a pedir autorização de acesso à planilha.
 */
function autorizarAcesso() {
  Logger.log('Tentando acessar a planilha...');
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if(!ss) {
    Logger.log('ERRO: Planilha não encontrada. Verifique o SPREADSHEET_ID.');
    return;
  }
  Logger.log('✅ Acesso autorizado!');
  Logger.log('   Nome: ' + ss.getName());
  Logger.log('   ID:   ' + ss.getId());
  Logger.log('   URL:  ' + ss.getUrl());
  Logger.log('');
  Logger.log('Agora execute: configurarPlanilha()');
}

// ── ENTRADA PRINCIPAL ────────────────────────────────────────────────────────

function doGet(e) {
  return _handleRequest(e);
}
function doPost(e) {
  return _handleRequest(e);
}

function _handleRequest(e) {
  try {
    // Validação do token
    var token = (e.parameter && e.parameter.token) || '';
    if(token !== SYNC_TOKEN) {
      return _json({ error: 'Token inválido', code: 403 });
    }

    var action = (e.parameter && e.parameter.action) || 'pull';

    if(action === 'push') {
      var body = e.postData ? e.postData.contents : '';
      if(!body) return _json({ error: 'Payload vazio', code: 400 });
      return _push(body);
    }

    if(action === 'pull') {
      return _pull();
    }

    if(action === 'ping') {
      return _json({ ok: true, version: VERSION, ts: new Date().toISOString() });
    }

    if(action === 'clear') {
      return _clearAll();
    }

    if(action === 'pushPresence') {
      // Push leve — apenas atualiza o campo presence no Sheets
      var body = e.postData ? e.postData.contents : '';
      if(!body) return _json({ ok: true });
      return _pushPresence(body);
    }

    if(action === 'pullPresence') {
      return _pullPresence();
    }

    return _json({ error: 'Ação desconhecida: ' + action, code: 400 });

  } catch(err) {
    console.error('[DIEFRA] Erro geral:', err.toString());
    return _json({ error: err.toString(), stack: err.stack });
  }
}

// ── PUSH ─────────────────────────────────────────────────────────────────────

function _push(body) {
  var data;
  try {
    data = JSON.parse(body);
  } catch(e) {
    return _json({ error: 'JSON inválido: ' + e.toString() });
  }

  var ss    = _getSpreadsheet();
  var sheet = _getOrCreateSheet(ss, SHEET_NAME);

  // ── Serializa todos os campos em chunks (células A1:Z1, linha 2 em diante) ──
  var fields = _buildFieldMap(data);
  var row2   = [];

  fields.forEach(function(f) {
    var val = data[f.key];
    var str = val !== undefined ? JSON.stringify(val) : '';
    // Divide em chunks se necessário
    var chunks = _chunkString(str, MAX_CELL_SIZE);
    f.cols = chunks.length;
    chunks.forEach(function(ch) { row2.push(ch); });
  });

  // Linha 1: índice de campos (key, nCols)
  var header = fields.map(function(f) {
    return f.key + ':' + f.cols;
  });

  // Grava na planilha
  sheet.clearContents();
  if(header.length > 0) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    // Distribui os dados em blocos de no máximo 100 colunas por vez
    var BATCH = 100;
    for(var i = 0; i < row2.length; i += BATCH) {
      var chunk = row2.slice(i, i+BATCH);
      sheet.getRange(2, i+1, 1, chunk.length).setValues([chunk]);
    }
  }

  // Salva logos em aba separada
  if(data.logos) _saveLogs(ss, data.logos);

  // Metadados
  _setMeta(sheet, {
    lastPush: new Date().toISOString(),
    version:  VERSION,
    contracts: (data.contracts||[]).length,
    medicoes:  (data.medicoes||[]).length,
    custoAnalises: (data.custoAnalises||[]).length,
  });

  SpreadsheetApp.flush();
  return _json({ ok: true, pushed: fields.length + ' campos', ts: new Date().toISOString(), version: VERSION });
}

// ── PULL ─────────────────────────────────────────────────────────────────────

function _pull() {
  var ss    = _getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if(!sheet || sheet.getLastRow() < 2) {
    return _json({ ok: true, empty: true, contracts: [], tasks: [], medicoes: [],
                   custoAnalises: [], dashMetas: {metaAnualFat:0,metaAnualAno:new Date().getFullYear(),metaHistorico:[]} });
  }

  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dataRow   = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Reconstrói o mapa de campos
  var result  = {};
  var colIdx  = 0;

  headerRow.forEach(function(h) {
    if(!h) { colIdx++; return; }
    var parts  = String(h).split(':');
    var key    = parts[0];
    var nCols  = parseInt(parts[1]) || 1;
    var chunks = dataRow.slice(colIdx, colIdx + nCols).map(String);
    var str    = chunks.join('');
    colIdx += nCols;
    if(str) {
      try { result[key] = JSON.parse(str); }
      catch(e) { result[key] = str; }
    }
  });

  // Carrega logos
  var logos = _loadLogos(ss);
  if(logos) result.logos = logos;

  // Garante campos mínimos para compatibilidade
  result = _ensureDefaults(result);

  return _json(result);
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

// ── Push leve de presença (sem sobrescrever outros dados) ────────────────
function _pushPresence(body) {
  try {
    var data = JSON.parse(body);
    if(!data || !data.presence) return _json({ ok: true, skipped: true });
    var ss    = _getSpreadsheet();
    var sheet = _getOrCreateSheet(ss, 'DIEFRA_PRESENCE');
    sheet.clearContents();
    var now = Date.now();
    var TTL = 180000; // 3 minutos
    var rows = [];
    Object.keys(data.presence).forEach(function(k) {
      var u = data.presence[k];
      if(u && (now - (u.ts||0)) < TTL) {
        rows.push([k, JSON.stringify(u)]);
      }
    });
    if(rows.length > 0) sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    SpreadsheetApp.flush();
    return _json({ ok: true, sessions: rows.length });
  } catch(e) {
    return _json({ ok: true, warn: e.toString() }); // não falha em presença
  }
}

// ── Pull de presença (sessões ativas de outros usuários) ──────────────────
function _pullPresence() {
  try {
    var ss    = _getSpreadsheet();
    var sheet = ss.getSheetByName('DIEFRA_PRESENCE');
    if(!sheet || sheet.getLastRow() < 1) return _json({ presence: {} });
    var rows = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
    var presence = {};
    var now = Date.now();
    rows.forEach(function(r) {
      if(r[0]) {
        try {
          var u = JSON.parse(r[1]);
          if((now - (u.ts||0)) < 180000) presence[r[0]] = u;
        } catch(e) {}
      }
    });
    return _json({ presence: presence });
  } catch(e) {
    return _json({ presence: {} });
  }
}

/**
 * Define a ordem e os campos que serão persistidos.
 * Novos campos v2026 incluídos aqui.
 */
function _buildFieldMap(data) {
  var keys = [
    // Core
    'contracts', 'tasks', 'vacations', 'managers',
    'participants', 'gestoresUnidade',
    'medicoes', 'nextId',
    // Financeiro
    'finRows',
    // Custo — inclui realizado, dreHistorico, mesRealizadoRef (v2026)
    'custoAnalises',
    // Dashboard — Meta Anual (v2026)
    'dashMetas',
    // Viagens e Frota
    'trips', 'frota',
    // DP
    'dp', 'funcoes',
    // Auditorias
    'audits', 'auditsGestao',
    // Entregáveis
    'entregaveis',
    // EPI / Uniforme
    'epiItens', 'epiEntregas',
    // Calibração
    'calibEquips', 'calibRegistros', 'calibVerifs', 'calibNCs',
    // Presença cross-device (v2026)
    'presence',
  ];
  return keys.map(function(k) { return { key: k, cols: 1 }; });
}

/** Garante campos padrão no pull para compatibilidade retroativa */
function _ensureDefaults(d) {
  d.contracts        = d.contracts        || [];
  d.tasks            = d.tasks            || [];
  d.vacations        = d.vacations        || [];
  d.managers         = d.managers         || [];
  d.participants     = d.participants     || [];
  d.gestoresUnidade  = d.gestoresUnidade  || [];
  d.medicoes         = d.medicoes         || [];
  d.trips            = d.trips            || [];
  d.frota            = d.frota            || [];
  d.dp               = d.dp               || [];
  d.funcoes          = d.funcoes          || [];
  d.audits           = d.audits           || [];
  d.auditsGestao     = d.auditsGestao     || [];
  d.entregaveis      = d.entregaveis      || [];
  d.epiItens         = d.epiItens         || [];
  d.epiEntregas      = d.epiEntregas      || [];
  d.calibEquips      = d.calibEquips      || [];
  d.calibRegistros   = d.calibRegistros   || [];
  d.calibVerifs      = d.calibVerifs      || [];
  d.calibNCs         = d.calibNCs         || [];
  d.custoAnalises    = d.custoAnalises    || [];
  d.nextId           = d.nextId           || 1;

  // ── NOVOS CAMPOS v2026 ────────────────────────────────────────
  if(!d.dashMetas || typeof d.dashMetas !== 'object') {
    d.dashMetas = { metaAnualFat: 0, metaAnualAno: new Date().getFullYear(), metaHistorico: [] };
  }
  if(!d.dashMetas.metaHistorico) d.dashMetas.metaHistorico = [];

  // Presença cross-device
  if(!d.presence || typeof d.presence !== 'object') d.presence = {};

  // Migra contratos: garante campo objeto
  d.contracts.forEach(function(c) {
    if(c.objeto === undefined) c.objeto = '';
  });

  // Migra custoAnalises: garante campos v2026
  d.custoAnalises.forEach(function(a) {
    if(!a.mesRealizadoRef) a.mesRealizadoRef = '';
    if(!a.dreHistorico)    a.dreHistorico = [];
    if(!a.medicao)         a.medicao = {};
    if(!a.medicao.realizado) a.medicao.realizado = [];
    if(a.dreContas) a.dreContas.forEach(function(row) {
      if(row.realizado === undefined) row.realizado = 0;
    });
  });

  return d;
}

/** Divide uma string longa em pedaços de tamanho max */
function _chunkString(str, maxSize) {
  if(!str || str.length <= maxSize) return [str || ''];
  var chunks = [];
  for(var i = 0; i < str.length; i += maxSize) {
    chunks.push(str.slice(i, i + maxSize));
  }
  return chunks;
}

/** Salva logos/fotos em aba separada para não pesar o payload principal */
function _saveLogs(ss, logos) {
  try {
    var ls = _getOrCreateSheet(ss, SHEET_LOGOS);
    ls.clearContents();
    var keys = Object.keys(logos);
    if(!keys.length) return;
    var rows = keys.map(function(k) {
      var v = logos[k] || '';
      // Fotos grandes: salva só prefixo data type + comprimento (segurança)
      if(v.length > MAX_CELL_SIZE) v = v.slice(0, MAX_CELL_SIZE);
      return [k, v];
    });
    ls.getRange(1, 1, rows.length, 2).setValues(rows);
  } catch(e) {
    console.warn('[DIEFRA] _saveLogs erro:', e);
  }
}

function _loadLogos(ss) {
  try {
    var ls = ss.getSheetByName(SHEET_LOGOS);
    if(!ls || ls.getLastRow() < 1) return null;
    var rows = ls.getRange(1, 1, ls.getLastRow(), 2).getValues();
    var logos = {};
    rows.forEach(function(r) { if(r[0]) logos[r[0]] = r[1] || ''; });
    return logos;
  } catch(e) { return null; }
}

/** Grava metadados de controle na última linha da planilha */
function _setMeta(sheet, meta) {
  try {
    var metaStr = JSON.stringify(Object.assign({ _meta: true }, meta));
    var lastRow = sheet.getLastRow() + 1;
    sheet.getRange(lastRow, 1).setValue(metaStr);
  } catch(e) {}
}

/** Cria ou retorna a aba pelo nome */
function _getOrCreateSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if(!s) {
    s = ss.insertSheet(name);
    s.setTabColor('#0d9488');
  }
  return s;
}

/** Limpa todos os dados (para reset) */
function _clearAll() {
  var ss = _getSpreadsheet();
  [SHEET_NAME, SHEET_LOGOS].forEach(function(n) {
    var s = ss.getSheetByName(n);
    if(s) s.clearContents();
  });
  return _json({ ok: true, cleared: true });
}

/** Wrapper de resposta JSON com CORS */
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── FUNÇÕES UTILITÁRIAS (executar manualmente no Apps Script) ────────────────

/**
 * Testar se o script está funcionando.
 * Execute manualmente em Executar → testarConexao
 */
function testarConexao() {
  var url = ScriptApp.getService().getUrl();
  Logger.log('=== DIEFRA Apps Script ' + VERSION + ' ===');
  Logger.log('URL Web App: ' + url);
  var _ss = _getSpreadsheet();
  Logger.log('Sheet ativa: ' + _ss.getName());
  Logger.log('ID: ' + _ss.getId());
  Logger.log('URL: ' + _ss.getUrl());

  var ss = _getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if(sheet) {
    Logger.log('Linhas em ' + SHEET_NAME + ': ' + sheet.getLastRow());
    Logger.log('Colunas em ' + SHEET_NAME + ': ' + sheet.getLastColumn());
  } else {
    Logger.log('⚠ Aba ' + SHEET_NAME + ' ainda não criada (normal se não houve push)');
  }
  Logger.log('Token configurado: ' + SYNC_TOKEN);
  Logger.log('=== OK ===');
}

/**
 * Executa um pull e imprime o resumo dos dados.
 * Útil para verificar o que está salvo.
 */
function inspecionarDados() {
  var ss    = _getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if(!sheet) { Logger.log('Sem dados ainda.'); return; }

  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dataRow   = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];

  var colIdx = 0;
  headerRow.forEach(function(h) {
    if(!h) { colIdx++; return; }
    var parts  = String(h).split(':');
    var key    = parts[0];
    var nCols  = parseInt(parts[1]) || 1;
    var chunks = dataRow.slice(colIdx, colIdx + nCols).map(String);
    var str    = chunks.join('');
    colIdx += nCols;
    try {
      var parsed = JSON.parse(str);
      if(Array.isArray(parsed)) {
        Logger.log(key + ': ' + parsed.length + ' registros');
      } else if(typeof parsed === 'object') {
        Logger.log(key + ': ' + JSON.stringify(parsed).slice(0,120));
      } else {
        Logger.log(key + ': ' + parsed);
      }
    } catch(e) {
      Logger.log(key + ': (raw) ' + str.slice(0,80));
    }
  });
}

/**
 * Cria as abas necessárias e formata cabeçalhos.
 * Execute UMA VEZ antes de usar o sistema.
 */
function configurarPlanilha() {
  var ss = _getSpreadsheet();

  // Aba de dados principal
  var data = _getOrCreateSheet(ss, SHEET_NAME);
  data.setTabColor('#065f46');
  data.getRange('A1').setValue('=== DIEFRA_DATA — não edite manualmente ===');
  data.getRange('A1').setFontWeight('bold').setFontColor('#ffffff').setBackground('#065f46');

  // Aba de logos
  var logos = _getOrCreateSheet(ss, SHEET_LOGOS);
  logos.setTabColor('#1d4ed8');
  logos.getRange('A1:B1').setValues([['CHAVE','BASE64']]).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#fff');

  // Aba de presença cross-device
  var pres = _getOrCreateSheet(ss, 'DIEFRA_PRESENCE');
  pres.setTabColor('#7c3aed');
  pres.getRange('A1:B1').setValues([['CHAVE_SESSÃO','DADOS_JSON']]).setFontWeight('bold').setBackground('#7c3aed').setFontColor('#fff');

  // Aba de LOG (auditoria de sincronizações)
  var log = _getOrCreateSheet(ss, 'DIEFRA_LOG');
  log.setTabColor('#92400e');
  log.getRange('A1:E1').setValues([['TIMESTAMP','AÇÃO','CONTRATOS','MEDICOES','VERSÃO']]).setFontWeight('bold').setBackground('#92400e').setFontColor('#fff');

  SpreadsheetApp.flush();
  var ss2 = _getSpreadsheet();
  Logger.log('✅ Planilha DIEFRA configurada com sucesso!');
  Logger.log('   ID da planilha: ' + ss2.getId());
  Logger.log('   URL: ' + ss2.getUrl());
  Logger.log('   Abas criadas: ' + SHEET_NAME + ', ' + SHEET_LOGOS + ', DIEFRA_LOG');
  Logger.log('   Próximo passo: implantar como Web App e colar a URL no sistema.');
}

/**
 * Exporta um backup JSON completo para o Drive.
 * Execute periodicamente como trigger semanal.
 */
function backupParaDrive() {
  try {
    var result = _pull();
    var json   = result.getContent();
    var hoje   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var nome   = 'DIEFRA_backup_' + hoje + '.json';
    var file   = DriveApp.createFile(nome, json, MimeType.PLAIN_TEXT);
    Logger.log('Backup criado: ' + file.getUrl());
    // Registra no log
    _logAction('backup', JSON.parse(json));
  } catch(e) {
    Logger.log('Erro no backup: ' + e);
  }
}

/** Registra ações na aba DIEFRA_LOG */
function _logAction(action, data) {
  try {
    var ss   = _getSpreadsheet();
    var log  = _getOrCreateSheet(ss, 'DIEFRA_LOG');
    var ts   = new Date().toISOString();
    log.appendRow([ts, action, (data.contracts||[]).length, (data.medicoes||[]).length, VERSION]);
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════════════════════
//  GUIA DE IMPLANTAÇÃO
//  ════════════════════════════════════════════════════════════
//
//  PASSO 1 — Crie a planilha
//    Acesse sheets.google.com → Nova planilha
//    Copie o ID da URL: .../spreadsheets/d/[ESTE_ID]/edit
//
//  PASSO 2 — Configure o script
//    Cole o ID em: const SPREADSHEET_ID = 'SEU_ID_AQUI'
//    Verifique: SYNC_TOKEN = 'diefra_sync_2026'
//
//  PASSO 3 — Abra o Apps Script (RECOMENDADO: de dentro da planilha)
//    ✅ MELHOR: Na planilha → Extensões → Apps Script → cole Code.gs
//       (script "bound" — getActiveSpreadsheet() funciona automaticamente)
//    ⚠ ALTERNATIVO: script.google.com → Novo projeto → cole Code.gs
//       (script standalone — requer SPREADSHEET_ID e autorização extra)
//
//  PASSO 4 — Execute configurarPlanilha() UMA VEZ
//    Executar → configurarPlanilha
//    Autorize quando solicitado
//
//  PASSO 5 — Implantar como Web App
//    Implantar → Nova implantação → Tipo: Web App
//    Executar como: Eu (minha conta Google)
//    Acesso: Qualquer pessoa (mesmo sem login)
//    → Copie a URL gerada (termina em /exec)
//
//  PASSO 6 — Configure no sistema DIEFRA
//    Config → URL do Apps Script → cole a URL
//    Token: diefra_sync_2026
//
//  PASSO 7 — Teste
//    No Apps Script: Executar → testarConexao()
//    No sistema: botão ☁ Sheets → deve mostrar "OK"
//
//  ⚠ ATENÇÃO: Após qualquer edição no script, você deve criar
//    uma NOVA IMPLANTAÇÃO (não apenas salvar) para as mudanças
//    tomarem efeito na Web App.
// ════════════════════════════════════════════════════════════════════════════════

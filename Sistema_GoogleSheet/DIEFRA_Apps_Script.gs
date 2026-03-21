// ════════════════════════════════════════════════════════════════════════════
//  DIEFRA DASHBOARD — Google Apps Script Backend
//  Versão 1.0 — Substitui o servidor Render/MongoDB
//
//  INSTRUÇÕES DE INSTALAÇÃO:
//  1. Abra o Google Sheets onde os dados serão armazenados
//  2. Clique em Extensões → Apps Script
//  3. Cole TODO este código no editor, substituindo o conteúdo existente
//  4. Altere SYNC_TOKEN abaixo para uma senha secreta sua
//  5. Clique em Implantar → Nova implantação
//     - Tipo: Aplicativo da Web
//     - Executar como: EU (sua conta Google)
//     - Quem tem acesso: QUALQUER PESSOA
//  6. Clique em Implantar → copie a URL gerada
//  7. Cole essa URL no dashboard HTML (campo APPS_SCRIPT_URL)
// ════════════════════════════════════════════════════════════════════════════

// ⚠ OBRIGATÓRIO: Altere esta senha! Use algo difícil de adivinhar.
const SYNC_TOKEN = 'diefra_sync_2026';

// Nome das abas da planilha (não precisa alterar)
const SHEETS = {
  contracts:    'contracts',
  tasks:        'tasks',
  managers:     'managers',
  vacations:    'vacations',
  participants: 'participants',
  trips:        'trips',
  audits:       'audits',
  auditsGestao: 'auditsGestao',
  entregaveis:  'entregaveis',
  medicoes:     'medicoes',
  meta:         'meta',   // nextId, finRows, logos
};

// ────────────────────────────────────────────────────────────────────────────
//  ROTEADOR PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.token !== SYNC_TOKEN) return jsonOut({ error: 'Unauthorized' }, 401);

    const action = p.action || 'pull';

    if (action === 'pull')  return jsonOut(readAll());
    if (action === 'login') return jsonOut(handleLogin(p.username || '', p.password || ''));
    if (action === 'ping')  return jsonOut({ ok: true, ts: new Date().toISOString() });

    return jsonOut({ error: 'Ação desconhecida: ' + action });
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  try {
    const p  = e.parameter || {};
    if (p.token !== SYNC_TOKEN) return jsonOut({ error: 'Unauthorized' }, 401);

    const action = p.action || 'push';
    const body   = e.postData ? JSON.parse(e.postData.contents) : {};

    if (action === 'push') {
      writeAll(body);
      return jsonOut({ ok: true, ts: new Date().toISOString() });
    }

    return jsonOut({ error: 'Ação desconhecida: ' + action });
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  LOGIN — valida contra ST.participants armazenado na planilha
// ────────────────────────────────────────────────────────────────────────────

function handleLogin(username, password) {
  const participants = readSheet(SHEETS.participants) || [];
  const user = participants.find(
    p => (p.username === username || p.email === username) && p.password === password
  );
  if (user) {
    return {
      ok:   true,
      user: { id: user.id, name: user.name, cargo: user.cargo, role: user.role || 'gestor' },
    };
  }
  return { ok: false, error: 'Credenciais inválidas' };
}

// ────────────────────────────────────────────────────────────────────────────
//  LEITURA COMPLETA
// ────────────────────────────────────────────────────────────────────────────

function readAll() {
  const meta = readSheet(SHEETS.meta) || {};
  return {
    contracts:    readSheet(SHEETS.contracts)    || [],
    tasks:        readSheet(SHEETS.tasks)        || [],
    managers:     readSheet(SHEETS.managers)     || [],
    vacations:    readSheet(SHEETS.vacations)    || [],
    participants: readSheet(SHEETS.participants) || [],
    trips:        readSheet(SHEETS.trips)        || [],
    audits:       readSheet(SHEETS.audits)       || [],
    auditsGestao: readSheet(SHEETS.auditsGestao) || [],
    entregaveis:  readSheet(SHEETS.entregaveis)  || [],
    medicoes:     readSheet(SHEETS.medicoes)     || [],
    nextId:       meta.nextId  || 200,
    finRows:      meta.finRows || null,
    logos:        meta.logos   || [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  GRAVAÇÃO COMPLETA
// ────────────────────────────────────────────────────────────────────────────

function writeAll(data) {
  const keys = ['contracts','tasks','managers','vacations','participants',
                'trips','audits','auditsGestao','entregaveis','medicoes'];
  keys.forEach(key => {
    if (data[key] !== undefined) writeSheet(SHEETS[key], data[key]);
  });

  // Meta: nextId + finRows + logos em uma única aba
  const meta = {};
  if (data.nextId  !== undefined) meta.nextId  = data.nextId;
  if (data.finRows !== undefined) meta.finRows = data.finRows;
  if (data.logos   !== undefined) meta.logos   = data.logos;
  if (Object.keys(meta).length)   writeSheet(SHEETS.meta, meta);
}

// ────────────────────────────────────────────────────────────────────────────
//  HELPERS — lê / grava uma aba como JSON
// ────────────────────────────────────────────────────────────────────────────

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function readSheet(name) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sheet) return null;
    const raw = sheet.getRange('A1').getValue();
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('readSheet(' + name + '):', err);
    return null;
  }
}

function writeSheet(name, data) {
  try {
    const sheet = getOrCreateSheet(name);
    const json  = JSON.stringify(data);
    sheet.getRange('A1').setValue(json);
    // Limpa células adjacentes por segurança
    if (sheet.getLastColumn() > 1) sheet.getRange(1, 2, 1, sheet.getLastColumn() - 1).clearContent();
  } catch (err) {
    console.error('writeSheet(' + name + '):', err);
    throw err;
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────────────────────────────────
//  UTILITÁRIO: Inicializar planilha com dados do dashboard (uso único)
//  Execute esta função UMA VEZ após colar o código para criar as abas.
// ────────────────────────────────────────────────────────────────────────────

function initializeSheets() {
  const allSheets = Object.values(SHEETS);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  allSheets.forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log('Criada aba: ' + name);
    }
  });
  Logger.log('✅ Abas criadas! Agora acesse o dashboard e clique em "☁ Sync" para popular os dados.');
}

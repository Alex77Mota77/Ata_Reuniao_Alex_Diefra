// ═══════════════════════════════════════════════════════════════════════════
//  DIEFRA — Google Apps Script  v2026-04  (com suporte a logos.frota)
//  Cole este código no seu Apps Script e reimplante como Web App
//  Permissões: "Qualquer pessoa, mesmo anônimos" | Execute as: "Me"
// ═══════════════════════════════════════════════════════════════════════════

const SYNC_TOKEN   = 'diefra_sync_2026';   // deve ser igual ao do index.html
const SHEET_DATA   = 'diefra_data';         // aba principal (JSON sem base64)
const SHEET_LOGOS  = 'diefra_logos';        // aba de fotos/logos (base64)

// ── Utilitários de planilha ────────────────────────────────────────────────
function _getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function _readCell(sheetName, row, col) {
  try {
    return _getOrCreateSheet(sheetName).getRange(row, col).getValue();
  } catch(e) { return ''; }
}

function _writeCell(sheetName, row, col, value) {
  _getOrCreateSheet(sheetName).getRange(row, col).setValue(value);
}

// ── Segurança: valida token ────────────────────────────────────────────────
function _checkToken(e) {
  const token = (e.parameter || {}).token || '';
  return token === SYNC_TOKEN;
}

// ── CORS headers ───────────────────────────────────────────────────────────
function _corsOutput(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET — pull ou login
// ═══════════════════════════════════════════════════════════════════════════
function doGet(e) {
  if (!_checkToken(e)) return _corsOutput({ error: 'Token inválido' });

  const action = (e.parameter || {}).action || 'pull';

  if (action === 'login') {
    return _handleLogin(e);
  }

  // ── Ping: teste de conectividade ──────────────────────────────────────────
  if (action === 'ping') {
    return _corsOutput({ ok: true, ts: new Date().toISOString(), version: 'diefra-2026-04' });
  }

  // ── Diagnóstico: mostra o estado das abas ─────────────────────────────────
  if (action === 'diag') {
    try {
      const ss     = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = ss.getSheets().map(s => {
        const name = s.getName();
        const val  = s.getRange(1,1).getValue();
        const len  = String(val).length;
        const preview = String(val).substring(0, 120);
        return { name, cellA1_chars: len, preview };
      });
      const rawData = _readChunked(SHEET_DATA) || _readCell(SHEET_DATA, 1, 1);
      const parsed  = rawData ? JSON.parse(rawData) : {};
      return _corsOutput({
        ok: true,
        sheets,
        diefra_data_chars: rawData.length,
        contracts_count:   (parsed.contracts   || []).length,
        tasks_count:       (parsed.tasks       || []).length,
        vehicles_count:    (parsed.frota       || []).length,
        nextId:            parsed.nextId       || 0,
      });
    } catch(err) {
      return _corsOutput({ ok: false, error: err.message });
    }
  }

  // ── Pull: lê dados + logos e devolve ao cliente ──────────────────────────
  try {
    // Tenta ler em modo chunked (múltiplas células) primeiro, depois célula única
    const rawData  = _readChunked(SHEET_DATA)  || _readCell(SHEET_DATA,  1, 1);
    const rawLogos = _readChunked(SHEET_LOGOS) || _readCell(SHEET_LOGOS, 1, 1);

    let data  = rawData  ? JSON.parse(rawData)  : {};
    const logos = rawLogos ? JSON.parse(rawLogos) : {};

    // Compatibilidade: formato legado onde A1 continha apenas o array de contratos
    if (Array.isArray(data)) {
      data = { contracts: data, tasks: [], vacations: [], managers: [],
               participants: [], trips: [], frota: [], audits: [],
               auditsGestao: [], entregaveis: [], medicoes: [], nextId: 1 };
    }

    // Garante estrutura completa dos logos
    if (!logos.frota)        logos.frota        = [];
    if (!logos.contracts)    logos.contracts    = [];
    if (!logos.participants) logos.participants = [];
    if (!logos.managers)     logos.managers     = [];

    data.logos = logos;
    return _corsOutput(data);
  } catch(err) {
    return _corsOutput({ error: 'Erro ao ler dados: ' + err.message });
  }
}

// ── Login ──────────────────────────────────────────────────────────────────
function _handleLogin(e) {
  const username = (e.parameter || {}).username || '';
  const password = (e.parameter || {}).password || '';
  try {
    const rawData = _readCell(SHEET_DATA, 1, 1);
    const data    = rawData ? JSON.parse(rawData) : {};
    const users   = data.participants || [];
    const user    = users.find(u =>
      (u.username === username || u.email === username) &&
      u.password  === password
    );
    if (user) {
      const { password: _pw, ...safeUser } = user;
      return _corsOutput({ ok: true, user: safeUser });
    }
    return _corsOutput({ ok: false, error: 'Credenciais inválidas' });
  } catch(err) {
    return _corsOutput({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  POST — push
// ═══════════════════════════════════════════════════════════════════════════
function doPost(e) {
  if (!_checkToken(e)) return _corsOutput({ error: 'Token inválido' });

  try {
    const body = JSON.parse(e.postData.contents);

    // ── Separa logos do payload principal ──────────────────────────────────
    const { logos, ...mainData } = body;

    // ── Garante estrutura completa dos logos ──────────────────────────────
    const logosToSave = {
      contracts:    (logos && logos.contracts)    || [],
      participants: (logos && logos.participants) || [],
      managers:     (logos && logos.managers)     || [],
      frota:        (logos && logos.frota)        || [],  // ← NOVO: fotos de veículos
    };

    // ── Salva payload principal (sem base64) ──────────────────────────────
    // Limita a 45.000 chars para segurança (limite da célula é ~50.000)
    const mainJson = JSON.stringify(mainData);
    if (mainJson.length > 45000) {
      // Tenta salvar em múltiplas células se necessário
      _saveChunked(SHEET_DATA, mainJson);
    } else {
      _writeCell(SHEET_DATA, 1, 1, mainJson);
    }

    // ── Salva logos (base64) ───────────────────────────────────────────────
    const logosJson = JSON.stringify(logosToSave);
    if (logosJson.length > 45000) {
      _saveChunked(SHEET_LOGOS, logosJson);
    } else {
      _writeCell(SHEET_LOGOS, 1, 1, logosJson);
    }

    return _corsOutput({ ok: true, savedAt: new Date().toISOString() });
  } catch(err) {
    return _corsOutput({ error: 'Erro ao salvar: ' + err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Chunked save — para payloads grandes (>45k chars)
//  Divide o JSON em partes e salva em células A1, B1, C1, ...
//  O pull reconstrói concatenando as células não-vazias da linha 1
// ═══════════════════════════════════════════════════════════════════════════
const CHUNK_SIZE = 45000;

function _saveChunked(sheetName, json) {
  const sheet  = _getOrCreateSheet(sheetName);
  const chunks = [];
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.substring(i, i + CHUNK_SIZE));
  }
  // Limpa linha 1 primeiro (até col 10 para garantir)
  sheet.getRange(1, 1, 1, 10).clearContent();
  // Escreve cada chunk numa coluna
  chunks.forEach((chunk, idx) => {
    sheet.getRange(1, idx + 1).setValue(chunk);
  });
}

function _readChunked(sheetName) {
  try {
    const sheet  = _getOrCreateSheet(sheetName);
    const row    = sheet.getRange(1, 1, 1, 10).getValues()[0];
    const json   = row.filter(v => v !== '').join('');
    return json || '';
  } catch(e) { return ''; }
}

// Sobrescreve _readCell para usar chunked quando necessário
// (chamado internamente no doGet — já usa getRange direto)
// Se sua planilha usa chunks, substitua doGet por esta versão:
function doGet_v2(e) {
  if (!_checkToken(e)) return _corsOutput({ error: 'Token inválido' });

  const action = (e.parameter || {}).action || 'pull';
  if (action === 'login') return _handleLogin(e);
  if (action === 'ping')  return _corsOutput({ ok: true, ts: new Date().toISOString(), version: 'diefra-2026-04' });

  try {
    const rawData  = _readChunked(SHEET_DATA)  || _readCell(SHEET_DATA,  1, 1);
    const rawLogos = _readChunked(SHEET_LOGOS) || _readCell(SHEET_LOGOS, 1, 1);

    let data  = rawData  ? JSON.parse(rawData)  : {};
    const logos = rawLogos ? JSON.parse(rawLogos) : {};

    if (Array.isArray(data)) {
      data = { contracts: data, tasks: [], vacations: [], managers: [],
               participants: [], trips: [], frota: [], audits: [],
               auditsGestao: [], entregaveis: [], medicoes: [], nextId: 1 };
    }

    if (!logos.frota)        logos.frota        = [];
    if (!logos.contracts)    logos.contracts    = [];
    if (!logos.participants) logos.participants = [];
    if (!logos.managers)     logos.managers     = [];

    data.logos = logos;
    return _corsOutput(data);
  } catch(err) {
    return _corsOutput({ error: 'Erro ao ler: ' + err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP — cria as abas necessárias se não existirem
//  Execute esta função UMA VEZ manualmente após colar o script
// ═══════════════════════════════════════════════════════════════════════════
function setupSheets() {
  _getOrCreateSheet(SHEET_DATA);
  _getOrCreateSheet(SHEET_LOGOS);

  // Migração: se A1 contém array legado (chunked ou não), converte para objeto
  try {
    const raw = _readChunked(SHEET_DATA) || _readCell(SHEET_DATA, 1, 1);
    if (raw && raw.trim().startsWith('[')) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const wrapped = JSON.stringify({
          contracts: arr, tasks: [], vacations: [], managers: [],
          participants: [], trips: [], frota: [], audits: [],
          auditsGestao: [], entregaveis: [], medicoes: [], nextId: 1
        });
        // Salva: usa chunked se necessário
        if (wrapped.length > 45000) {
          _saveChunked(SHEET_DATA, wrapped);
        } else {
          _writeCell(SHEET_DATA, 1, 1, wrapped);
          // Limpa células extras do chunk antigo
          const sheet = _getOrCreateSheet(SHEET_DATA);
          sheet.getRange(1, 2, 1, 9).clearContent();
        }
        Logger.log('Migração: array legado (' + arr.length + ' contratos) convertido para objeto. Tamanho: ' + wrapped.length + ' chars.');
      }
    } else if (raw && raw.trim().startsWith('{')) {
      Logger.log('Dados já no formato correto. Contratos: ' + ((JSON.parse(raw).contracts)||[]).length);
    } else {
      Logger.log('Banco vazio ou sem dados reconhecíveis.');
    }
  } catch(e) { Logger.log('Erro na migração de formato: ' + e.message); }


  // Inicializa logos com estrutura vazia incluindo frota
  const currentLogos = _readCell(SHEET_LOGOS, 1, 1);
  if (!currentLogos) {
    _writeCell(SHEET_LOGOS, 1, 1, JSON.stringify({
      contracts:    [],
      participants: [],
      managers:     [],
      frota:        []   // ← novo campo
    }));
  } else {
    // Migração: adiciona frota se não existir
    try {
      const logos = JSON.parse(currentLogos);
      if (!logos.frota) {
        logos.frota = [];
        _writeCell(SHEET_LOGOS, 1, 1, JSON.stringify(logos));
        Logger.log('Migração concluída: logos.frota adicionado.');
      } else {
        Logger.log('logos.frota já existe — nenhuma migração necessária.');
      }
    } catch(err) {
      Logger.log('Erro na migração: ' + err.message);
    }
  }

  Logger.log('Setup concluído. Abas: ' + SHEET_DATA + ', ' + SHEET_LOGOS);
}

// ════════════════════════════════════════════════════════════════════════════
//  DIAGNÓSTICO — Execute esta função diretamente no editor do Apps Script
//  para ver o que está gravado nas abas diefra_data e diefra_logos
// ════════════════════════════════════════════════════════════════════════════
function diagnosticoCompleto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('=== DIAGNÓSTICO DIEFRA ===');
  Logger.log('Planilha: ' + ss.getName());

  // Lista todas as abas
  const sheets = ss.getSheets();
  Logger.log('Abas encontradas: ' + sheets.map(s => s.getName()).join(', '));

  // Verifica diefra_data
  const dataSheet = ss.getSheetByName('diefra_data');
  if (!dataSheet) {
    Logger.log('ERRO: Aba diefra_data NÃO ENCONTRADA');
  } else {
    const raw = _readChunked('diefra_data') || _readCell('diefra_data', 1, 1);
    Logger.log('diefra_data — tamanho: ' + raw.length + ' chars');
    if (raw.length > 0) {
      Logger.log('diefra_data — preview: ' + raw.substring(0, 300));
      try {
        const parsed = JSON.parse(raw);
        Logger.log('diefra_data — contratos: ' + (parsed.contracts || []).length);
        Logger.log('diefra_data — tarefas: ' + (parsed.tasks || []).length);
        Logger.log('diefra_data — participantes: ' + (parsed.participants || []).length);
        Logger.log('diefra_data — nextId: ' + (parsed.nextId || 0));
        Logger.log('diefra_data — frota: ' + (parsed.frota || []).length);
      } catch(e) {
        Logger.log('ERRO ao parsear JSON: ' + e.message);
        Logger.log('Primeiros 500 chars: ' + raw.substring(0, 500));
      }
    } else {
      Logger.log('diefra_data ESTÁ VAZIA — nenhum dado gravado!');
      // Verifica célula A1 diretamente
      const a1 = dataSheet.getRange(1,1).getValue();
      Logger.log('Célula A1 direta: tipo=' + typeof a1 + ', valor=' + String(a1).substring(0,200));
      // Verifica quantas linhas e colunas têm conteúdo
      const lc = dataSheet.getLastColumn();
      const lr = dataSheet.getLastRow();
      Logger.log('Última coluna com dados: ' + lc + ', última linha: ' + lr);
    }
  }

  // Verifica diefra_logos
  const logosSheet = ss.getSheetByName('diefra_logos');
  if (!logosSheet) {
    Logger.log('AVISO: Aba diefra_logos não encontrada');
  } else {
    const rawLogos = _readChunked('diefra_logos') || _readCell('diefra_logos', 1, 1);
    Logger.log('diefra_logos — tamanho: ' + rawLogos.length + ' chars');
    if (rawLogos.length > 0) {
      try {
        const logos = JSON.parse(rawLogos);
        Logger.log('diefra_logos — contratos com logo: ' + (logos.contracts || []).length);
        Logger.log('diefra_logos — fotos participantes: ' + (logos.participants || []).length);
        Logger.log('diefra_logos — fotos gestores: ' + (logos.managers || []).length);
        Logger.log('diefra_logos — fotos frota: ' + (logos.frota || []).length);
      } catch(e) {
        Logger.log('ERRO logos JSON: ' + e.message);
      }
    } else {
      Logger.log('diefra_logos — vazia');
    }
  }

  Logger.log('=== FIM DO DIAGNÓSTICO ===');
}

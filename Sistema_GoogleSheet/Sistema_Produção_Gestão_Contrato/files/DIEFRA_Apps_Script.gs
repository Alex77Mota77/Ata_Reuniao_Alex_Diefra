// ═══════════════════════════════════════════════════════════════════════════
//  DIEFRA — Google Apps Script v2.0
//  Backend completo para o sistema de gestão de contratos
//  
//  INSTALAÇÃO:
//  1. Abra o Google Sheets
//  2. Extensões → Apps Script
//  3. Cole este código substituindo tudo
//  4. Salve (Ctrl+S)
//  5. Execute setupSheets() uma vez para criar as abas
//  6. Implantar → Nova implantação → Aplicativo da Web
//     - Executar como: Eu
//     - Quem tem acesso: Qualquer pessoa
//  7. Copie a URL e cole no sistema DIEFRA → Config
// ═══════════════════════════════════════════════════════════════════════════

// ── CONFIGURAÇÃO ────────────────────────────────────────────────────────────
var SYNC_TOKEN = 'DIEFRA_SYNC_2026'; // Mude para um token secreto único
var ADMIN_PASS = 'diefra@admin';     // Senha para acessar Config no sistema

// ── ABAS DO BANCO DE DADOS ─────────────────────────────────────────────────
var SHEETS = {
  meta:           '_META',
  contracts:      'contracts',
  participants:   'participants',
  gestoresUnidade:'gestoresUnidade',
  tasks:          'tasks',
  trips:          'trips',
  vacations:      'vacations',
  audits:         'audits',
  auditsGestao:   'auditsGestao',
  entregaveis:    'entregaveis',
  medicoes:       'medicoes',
  frota:          'frota',
  dp:             'dp',
  epiItens:       'epiItens',
  epiEntregas:    'epiEntregas',
  calibEquips:    'calibEquips',
  calibRegistros: 'calibRegistros',
  calibVerifs:    'calibVerifs',
  custoAnalises:  'custoAnalises',
  finRows:        'finRows',
  state:          '_STATE',
};

// ── ENTRY POINT ─────────────────────────────────────────────────────────────
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    var params = e.parameter || {};
    var token  = params.token || '';
    var action = params.action || 'pull';

    // Verificar token
    if (token !== SYNC_TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Token inválido' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ações
    switch (action) {
      case 'ping':
        return ok({ pong: true, version: '2.0', ts: new Date().toISOString() });
      
      case 'login':
        return handleLogin(params);
      
      case 'pull':
        return handlePull();
      
      case 'push':
        return handlePush(e);
      
      case 'setup':
        setupSheets();
        return ok({ setup: true, message: 'Banco configurado com sucesso!' });

      case 'adminPass':
        return ok({ pass: ADMIN_PASS });
      
      default:
        return ok({ error: 'Ação desconhecida: ' + action });
    }
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── LOGIN ───────────────────────────────────────────────────────────────────
function handleLogin(params) {
  var username = params.username || '';
  var password = params.password || '';
  
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.participants);
  if (!sheet) return error('Banco não configurado. Execute setupSheets.');
  
  var data = sheetToArray(sheet);
  var user = data.find(function(r) {
    return r.username === username && r.password === password;
  });
  
  if (!user) return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'Credenciais inválidas' }))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Não retornar senha
  var safeUser = Object.assign({}, user);
  delete safeUser.password;
  
  return ok({ user: safeUser });
}

// ── PULL ────────────────────────────────────────────────────────────────────
function handlePull() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  
  Object.keys(SHEETS).forEach(function(key) {
    if (key === 'meta') return;
    var sheetName = SHEETS[key];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) { result[key] = []; return; }
    
    if (key === 'state') {
      // _STATE é um JSON serializado
      var val = sheet.getRange(1,1).getValue();
      try { result[key] = val ? JSON.parse(val) : {}; } catch(e) { result[key] = {}; }
    } else {
      result[key] = sheetToArray(sheet);
    }
  });
  
  // nextId
  var metaSheet = ss.getSheetByName(SHEETS.meta);
  if (metaSheet) {
    var nextId = metaSheet.getRange(1,1).getValue();
    result.nextId = nextId || 1;
  }
  
  result.ok = true;
  result.ts  = new Date().toISOString();
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── PUSH ────────────────────────────────────────────────────────────────────
function handlePush(e) {
  var body;
  try {
    body = JSON.parse(e.postData ? e.postData.contents : '{}');
  } catch(err) {
    return error('JSON inválido: ' + err.message);
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.keys(SHEETS).forEach(function(key) {
    if (key === 'meta' || key === 'state') return;
    if (!body[key]) return;
    
    var sheetName = SHEETS[key];
    var sheet = getOrCreateSheet(ss, sheetName);
    arrayToSheet(sheet, body[key]);
  });
  
  // Salvar nextId
  if (body.nextId) {
    var metaSheet = getOrCreateSheet(ss, SHEETS.meta);
    metaSheet.getRange(1,1).setValue(body.nextId);
  }
  
  // Timestamp do último push
  var metaSheet = getOrCreateSheet(ss, SHEETS.meta);
  metaSheet.getRange(2,1).setValue(new Date().toISOString());
  metaSheet.getRange(2,2).setValue(body.pushedBy || 'sistema');
  
  return ok({ saved: true, ts: new Date().toISOString() });
}

// ── UTILITÁRIOS ─────────────────────────────────────────────────────────────
function sheetToArray(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var headers = data[0].map(String);
  return data.slice(1)
    .filter(function(row) { return row.some(function(c) { return c !== ''; }); })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        var val = row[i];
        // Tentar parsear JSON para campos complexos
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch(e) {}
        }
        // Converter 'true'/'false' strings
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        obj[h] = val;
      });
      return obj;
    });
}

function arrayToSheet(sheet, arr) {
  if (!arr || !arr.length) {
    // Limpa mas mantém o cabeçalho
    var lr = sheet.getLastRow();
    if (lr > 1) sheet.deleteRows(2, lr - 1);
    return;
  }
  
  // Coletar todas as chaves únicas
  var keys = [];
  arr.forEach(function(obj) {
    Object.keys(obj).forEach(function(k) {
      if (keys.indexOf(k) < 0) keys.push(k);
    });
  });
  
  // Cabeçalho
  sheet.clearContents();
  sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
  
  // Dados
  var rows = arr.map(function(obj) {
    return keys.map(function(k) {
      var v = obj[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, keys.length).setValues(rows);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ok(data) {
  data.ok = true;
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── SETUP INICIAL DO BANCO ───────────────────────────────────────────────────
// Execute esta função UMA VEZ antes de implantar
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Criar todas as abas necessárias
  Object.values(SHEETS).forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log('Criada aba: ' + name);
    }
  });
  
  // Configurar cabeçalhos das abas principais
  var headers = {
    contracts:       ['id','name','code','cc','status','tipo','valor_global','data_inicio','data_fim',
                      'gestorTecnico','responsible','descricao','sede','unidade','classificacao',
                      'periodicidade','mapaMedicoes','logo','logoFit','createdAt'],
    participants:    ['id','name','cargo','dept','email','username','password','color','foto',
                      'role','permissoes','contratoIds','phone'],
    gestoresUnidade: ['id','name','cargo','dept','email','username','password','color','foto',
                      'unidade','phone','role','permissoes','contratoIds'],
    tasks:           ['id','contractId','title','desc','status','priority','dueDate',
                      'assignee','createdAt','done','doneAt'],
    trips:           ['id','contractId','responsavel','destino','dtIda','dtVolta',
                      'motivo','status','obs'],
    vacations:       ['id','contractId','participantId','participantName','dtInicio',
                      'dtFim','dias','status','obs','createdAt'],
    audits:          ['id','contractId','tipo','data','responsavel','resultado',
                      'obs','status','classificacao','periodicidade'],
    auditsGestao:    ['id','contractId','tipo','data','responsavel','resultado','obs','status'],
    entregaveis:     ['id','contractId','nome','tipo','status','prazo','obs'],
    medicoes:        ['id','contractId','periodo','previsto','realizado','obs','status'],
    frota:           ['id','contractId','placa','marca','modelo','versao','anoFab',
                      'tipoVeiculo','motorista','kmAtual','status','dtProxManut',
                      'obs','rastreador','aquisicao'],
    dp:              ['id','contractId','nome','cpf','funcao','dtAdmissao','dtDemissao',
                      'status','salario','obs'],
    epiItens:        ['id','contractId','nome','tipo','quantidade','validade','obs'],
    epiEntregas:     ['id','epiItemId','contractId','participantId','dtEntrega','quantidade','obs'],
    calibEquips:     ['id','contractId','nome','tag','tipo','dtUltCalib','dtProxCalib',
                      'responsavel','status','certificado','obs'],
    calibRegistros:  ['id','equipId','contractId','data','responsavel','resultado','obs'],
    calibVerifs:     ['id','equipId','contractId','data','resultado','obs'],
    custoAnalises:   ['id','contractId','nome','dreContas','dreHistorico','medicao',
                      'memoria','aliquotas','encargos','createdAt'],
    finRows:         ['id','contractId','periodo','tipo','valor','categoria','obs'],
  };
  
  Object.keys(headers).forEach(function(key) {
    var sheetName = SHEETS[key];
    var sheet = ss.getSheetByName(sheetName);
    if (sheet && headers[key]) {
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headers[key].length).setValues([headers[key]]);
      // Formatar cabeçalho
      var hRange = sheet.getRange(1, 1, 1, headers[key].length);
      hRange.setBackground('#0f2318');
      hRange.setFontColor('#10b981');
      hRange.setFontWeight('bold');
      hRange.setFrozenRows(1);
    }
  });
  
  // META
  var meta = ss.getSheetByName(SHEETS.meta);
  if (meta) {
    meta.clearContents();
    meta.getRange(1,1).setValue(1); // nextId
    meta.getRange(1,2).setValue('nextId');
    meta.getRange(2,2).setValue('lastPush');
    meta.getRange(3,1).setValue(new Date().toISOString());
    meta.getRange(3,2).setValue('setupAt');
  }

  // Renomear a aba padrão "Plan1" se existir
  try {
    var plan1 = ss.getSheetByName('Plan1') || ss.getSheetByName('Sheet1');
    if (plan1) plan1.setName('_INICIO');
    var inicio = ss.getSheetByName('_INICIO');
    if (inicio) {
      inicio.clearContents();
      inicio.getRange(1,1).setValue('DIEFRA - Banco de Dados');
      inicio.getRange(2,1).setValue('Configurado em: ' + new Date().toLocaleString('pt-BR'));
      inicio.getRange(3,1).setValue('SYNC_TOKEN: ' + SYNC_TOKEN);
      inicio.getRange(4,1).setValue('Não edite este arquivo manualmente.');
      inicio.getRange(1,1).setFontSize(16).setFontWeight('bold').setFontColor('#10b981');
    }
  } catch(e) {}
  
  Logger.log('✅ Setup concluído! Banco DIEFRA configurado com sucesso.');
  Logger.log('📌 Próximo passo: Implantar como Aplicativo da Web');
}

// ── VERIFICAÇÃO ──────────────────────────────────────────────────────────────
function testarSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abas = Object.values(SHEETS);
  var faltando = abas.filter(function(n) { return !ss.getSheetByName(n); });
  
  if (faltando.length > 0) {
    Logger.log('❌ Abas faltando: ' + faltando.join(', '));
    Logger.log('   Execute setupSheets() para criar.');
  } else {
    Logger.log('✅ Todas as ' + abas.length + ' abas estão criadas.');
    Logger.log('✅ Banco pronto para uso!');
  }
}

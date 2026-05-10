// ═══════════════════════════════════════════════════════════════
//  diefra-client.js v2.0 — Cliente do servidor DIEFRA
//  Substitui o SDK do Supabase no index.html
//  A service_role key NUNCA chega ao browser
// ═══════════════════════════════════════════════════════════════

// ── URL do servidor Node.js ──────────────────────────────────
// Substitua pela URL do Railway/Render após o deploy
const DIEFRA_API_URL = 'https://diefra-server.onrender.com';

// ── Token JWT armazenado localmente ─────────────────────────
let _apiToken = localStorage.getItem('diefra_api_token') || null;

// ── Chamada HTTP ao servidor ─────────────────────────────────
async function _api(method, path, body) {
  const opts = {
    method,
    headers: Object.assign({'Content-Type':'application/json'},
      _apiToken ? {'Authorization':'Bearer '+_apiToken} : {})
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res  = await fetch(DIEFRA_API_URL + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || 'HTTP '+res.status);
  return data;
}

// ── Query builder — imita _sb.from(table) do Supabase ────────
function _sbFrom(table) {
  var s = {
    table:table, op:null, cols:'*', payload:null,
    filters:[], ord:null, sngl:false, mSngl:false, conflict:'id'
  };

  function _exec() {
    return _api('POST', '/api/db', s).catch(function(e){
      return {data:null, error:{message:e.message}};
    });
  }

  var c = {
    select:   function(cols)      { s.op='select'; s.cols=cols||'*'; return c; },
    insert:   function(rows)      { s.op='insert'; s.payload=rows; return c; },
    update:   function(data)      { s.op='update'; s.payload=data; return c; },
    upsert:   function(rows,opts) { s.op='upsert'; s.payload=rows; if(opts&&opts.onConflict) s.conflict=opts.onConflict; return c; },
    delete:   function()          { s.op='delete'; return c; },
    eq:       function(col,val)   { s.filters.push({t:'eq', col:col, val:val}); return c; },
    gte:      function(col,val)   { s.filters.push({t:'gte',col:col, val:val}); return c; },
    lte:      function(col,val)   { s.filters.push({t:'lte',col:col, val:val}); return c; },
    neq:      function(col,val)   { s.filters.push({t:'neq',col:col, val:val}); return c; },
    order:    function(col,opts)  { s.ord={col:col,asc:opts&&opts.ascending!==false}; return c; },
    maybeSingle: function()       { s.mSngl=true; return _exec(); },
    single:      function()       { s.sngl=true; return _exec(); },
    then: function(res,rej)       { _exec().then(res,rej); }
  };
  return c;
}

// ── Auth — imita _sb.auth do Supabase ────────────────────────
var _authCbs = [];
var _sbAuth = {
  signInWithPassword: async function(creds) {
    try {
      var data = await _api('POST', '/api/auth/login', creds);
      _apiToken = data.token;
      localStorage.setItem('diefra_api_token', _apiToken);
      var sess = {access_token:_apiToken, user:{email:creds.email, id:data.usuario&&data.usuario.id}};
      _authCbs.forEach(function(cb){ cb('SIGNED_IN', sess); });
      return {data:{user:data.usuario, session:sess}, error:null};
    } catch(e) {
      return {data:null, error:{message:e.message||'Credenciais inválidas'}};
    }
  },
  signOut: async function() {
    try { await _api('POST', '/api/auth/logout'); } catch(e){}
    _apiToken = null;
    localStorage.removeItem('diefra_api_token');
    _authCbs.forEach(function(cb){ cb('SIGNED_OUT', null); });
    return {error:null};
  },
  getSession: async function() {
    if(!_apiToken) return {data:{session:null}, error:null};
    return {data:{session:{access_token:_apiToken}}, error:null};
  },
  onAuthStateChange: function(cb) {
    _authCbs.push(cb);
    if(_apiToken) setTimeout(function(){ cb('SIGNED_IN',{access_token:_apiToken}); }, 50);
    return {data:{subscription:{unsubscribe:function(){ _authCbs = _authCbs.filter(function(x){return x!==cb;}); }}}};
  },
  resetPasswordForEmail: async function(email) {
    try { await _api('POST', '/api/auth/reset-password', {email:email}); return {error:null}; }
    catch(e) { return {error:{message:e.message}}; }
  }
};

// ── _sb global — DROP-IN replacement do Supabase SDK ─────────
var _sb = {
  from:    function(t){ return _sbFrom(t); },
  auth:    _sbAuth,
  channel: function(){ return {on:function(){return this;}, subscribe:function(){return Promise.resolve('SUBSCRIBED');}, untrack:function(){return Promise.resolve();}}; },
  removeChannel: function(){ return Promise.resolve(); },
  rpc: function(fn,params){ return {then:function(r,rej){ _api('POST','/api/rpc/'+fn,params).then(r,rej); }}; }
};

// ── Sync otimizado — 1 request ao invés de 16 ────────────────
async function _syncPull() {
  return await _api('GET', '/api/sync');
}
async function _syncPush(st) {
  return await _api('POST', '/api/sync', {data:st});
}

// ── Presença via servidor ─────────────────────────────────────
async function _presencaUpsert(secao) {
  if(!_apiToken) return;
  try { await _api('PUT', '/api/presenca', {secao:secao||'Sistema'}); } catch(e){}
}
async function _presencaPoll() {
  if(!_apiToken) return [];
  try { return await _api('GET', '/api/presenca'); } catch(e){ return []; }
}
async function _presencaRemover() {
  if(!_apiToken) return;
  try { await _api('DELETE', '/api/presenca'); } catch(e){}
}

console.log('[DIEFRA] Client v2 carregado. Servidor:', DIEFRA_API_URL);

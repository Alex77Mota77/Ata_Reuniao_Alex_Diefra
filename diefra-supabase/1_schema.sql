-- ═══════════════════════════════════════════════════════════════
--  DIEFRA · Gestão de Contratos 2026
--  Schema PostgreSQL para Supabase
--  Execute no SQL Editor do Supabase (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ── EXTENSÕES ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════
--  TABELAS
-- ════════════════════════════════════════════════════════════════

-- ── PARTICIPANTES (usuários do sistema) ──────────────────────────
CREATE TABLE IF NOT EXISTS participantes (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  cargo       TEXT,
  dept        TEXT,
  color       TEXT,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT,
  role        TEXT DEFAULT 'user' CHECK (role IN ('admin','user')),
  ativo       BOOLEAN DEFAULT true,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTRATOS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id            TEXT PRIMARY KEY,
  numero        TEXT,
  nome          TEXT NOT NULL,
  cliente       TEXT,
  status        TEXT DEFAULT 'ativo',
  valor_total   NUMERIC(15,2),
  data_inicio   DATE,
  data_fim      DATE,
  gestor_id     INTEGER REFERENCES participantes(id) ON DELETE SET NULL,
  cor_a         TEXT,
  cor_b         TEXT,
  descricao     TEXT,
  local         TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── TAREFAS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarefas (
  id              TEXT PRIMARY KEY,
  contrato_id     TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  responsavel_id  INTEGER REFERENCES participantes(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'pendente',
  prioridade      TEXT DEFAULT 'media',
  data_venc       DATE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ── MEDIÇÕES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicoes (
  id            TEXT PRIMARY KEY,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  competencia   TEXT,
  valor         NUMERIC(15,2),
  status        TEXT DEFAULT 'pendente',
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── ENTREGÁVEIS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entregaveis (
  id            TEXT PRIMARY KEY,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  nome          TEXT,
  tipo          TEXT,
  data_prev     DATE,
  data_entrega  DATE,
  status        TEXT DEFAULT 'pendente',
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDITORIAS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditorias (
  id            TEXT PRIMARY KEY,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  tipo          TEXT,
  data          DATE,
  responsavel   TEXT,
  status        TEXT,
  resultado     TEXT,
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── FROTA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frota (
  id            TEXT PRIMARY KEY,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  placa         TEXT,
  modelo        TEXT,
  tipo          TEXT,
  status        TEXT DEFAULT 'ativo',
  km_atual      INTEGER,
  prox_manut    DATE,
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── VIAGENS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viagens (
  id              TEXT PRIMARY KEY,
  contrato_id     TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  veiculo_id      TEXT REFERENCES frota(id) ON DELETE SET NULL,
  motorista_id    INTEGER REFERENCES participantes(id) ON DELETE SET NULL,
  data            DATE,
  origem          TEXT,
  destino         TEXT,
  km_saida        INTEGER,
  km_chegada      INTEGER,
  obs             TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── FÉRIAS / AFASTAMENTOS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ferias (
  id              TEXT PRIMARY KEY,
  participante_id INTEGER REFERENCES participantes(id) ON DELETE CASCADE,
  tipo            TEXT,
  data_inicio     DATE,
  data_fim        DATE,
  status          TEXT DEFAULT 'aprovado',
  obs             TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── EPI — ITENS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS epi_itens (
  id            TEXT PRIMARY KEY,
  nome          TEXT,
  ca            TEXT,
  categoria     TEXT,
  vida_util_dias INTEGER,
  estoque       INTEGER DEFAULT 0,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── EPI — ENTREGAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS epi_entregas (
  id              TEXT PRIMARY KEY,
  contrato_id     TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  item_id         TEXT REFERENCES epi_itens(id) ON DELETE CASCADE,
  participante_id INTEGER REFERENCES participantes(id) ON DELETE CASCADE,
  quantidade      INTEGER DEFAULT 1,
  data_entrega    DATE,
  data_venc       DATE,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── CALIBRAÇÃO — EQUIPAMENTOS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS calib_equipamentos (
  id            TEXT PRIMARY KEY,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  tag           TEXT,
  nome          TEXT,
  fabricante    TEXT,
  modelo        TEXT,
  serie         TEXT,
  tipo          TEXT,
  localizacao   TEXT,
  status        TEXT DEFAULT 'ativo',
  freq_dias     INTEGER DEFAULT 365,
  ultima_calib  DATE,
  prox_calib    DATE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── CALIBRAÇÃO — REGISTROS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS calib_registros (
  id            TEXT PRIMARY KEY,
  equip_id      TEXT REFERENCES calib_equipamentos(id) ON DELETE CASCADE,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  data          DATE,
  resultado     TEXT,
  certificado   TEXT,
  laboratorio   TEXT,
  validade      DATE,
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── CALIBRAÇÃO — NÃO CONFORMIDADES ──────────────────────────────
CREATE TABLE IF NOT EXISTS calib_ncs (
  id            TEXT PRIMARY KEY,
  equip_id      TEXT REFERENCES calib_equipamentos(id) ON DELETE CASCADE,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  origem        TEXT,
  dt_abertura   DATE,
  dt_fechamento DATE,
  descricao     TEXT,
  acao          TEXT,
  status        TEXT DEFAULT 'aberta',
  responsavel   TEXT,
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── CUSTO DE ANÁLISES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custo_analises (
  id            TEXT PRIMARY KEY,
  contrato_id   TEXT REFERENCES contratos(id) ON DELETE CASCADE,
  descricao     TEXT,
  valor         NUMERIC(12,2),
  data          DATE,
  categoria     TEXT,
  obs           TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── LOG DE ALTERAÇÕES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  usuario_id    INTEGER REFERENCES participantes(id) ON DELETE SET NULL,
  tabela        TEXT,
  registro_id   TEXT,
  acao          TEXT CHECK (acao IN ('INSERT','UPDATE','DELETE')),
  dados_antes   JSONB,
  dados_depois  JSONB,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════
--  FUNÇÕES AUXILIARES
-- ════════════════════════════════════════════════════════════════

-- Atualiza automaticamente o campo atualizado_em
CREATE OR REPLACE FUNCTION touch_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_contratos_updated
  BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION touch_updated();

CREATE TRIGGER trg_tarefas_updated
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION touch_updated();


-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  Cada usuário logado só acessa os dados — ninguém acessa sem token
-- ════════════════════════════════════════════════════════════════

ALTER TABLE participantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregaveis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota              ENABLE ROW LEVEL SECURITY;
ALTER TABLE viagens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE epi_itens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE epi_entregas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calib_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE calib_registros    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calib_ncs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE custo_analises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Política: qualquer usuário autenticado lê e escreve tudo
-- (para permissões mais finas por contrato, expanda estas políticas)
DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'participantes','contratos','tarefas','medicoes','entregaveis',
    'auditorias','frota','viagens','ferias','epi_itens','epi_entregas',
    'calib_equipamentos','calib_registros','calib_ncs','custo_analises','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format(
      'CREATE POLICY "usuarios_autenticados_%s"
       ON %I FOR ALL TO authenticated
       USING (true) WITH CHECK (true)', t, t
    );
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════
--  DADOS INICIAIS — Usuários padrão do DIEFRA
--  Execute DEPOIS de criar os usuários no Supabase Auth
-- ════════════════════════════════════════════════════════════════

INSERT INTO participantes (name, cargo, dept, color, username, email, role) VALUES
  ('Leonardo Alves Martins',   'Coordenador UEN-300',       'UEN-300',      'linear-gradient(135deg,#2563eb,#38bdf8)', 'leonardo.martins',   '', 'admin'),
  ('Alex Mota',                'Supervisor de Campo',        'UEN-300',      'linear-gradient(135deg,#7c3aed,#a78bfa)', 'alex.mota',           '', 'admin'),
  ('Otarcione Felipe Cesário', 'Técnico de Laboratório',     'Laboratório',  'linear-gradient(135deg,#0891b2,#22d3ee)', 'otarcione.cesario',   '', 'user'),
  ('Vera Lucia F. Wenceslau',  'Analista de Laboratório',   'Lab. Técnica', 'linear-gradient(135deg,#be185d,#f472b6)', 'vera.wenceslau',      '', 'user'),
  ('Jonathas G. Amaral Melo',  'Engenheiro Civil',           'UEN-300',      'linear-gradient(135deg,#065f46,#34d399)', 'jonathas.melo',       '', 'user'),
  ('Adriny Cássia P. da Silva','Supervisora de Contrato',   'UEN-300',      'linear-gradient(135deg,#92400e,#fbbf24)', 'adriny.silva',        '', 'user'),
  ('Lucas Tayrone Quintiliano','Técnico de Campo',           'UEN-300',      'linear-gradient(135deg,#1e3a5f,#60a5fa)', 'lucas.quintiliano',   '', 'user'),
  ('Fabio Vinicius Fideliz',   'Assistente Técnico',         'UEN-300',      'linear-gradient(135deg,#3f0764,#c084fc)', 'fabio.fideliz',       '', 'user'),
  ('Patricia Duarte Lara',     'Auxiliar Administrativa',    'UEN-300',      'linear-gradient(135deg,#134e4a,#2dd4bf)', 'patricia.lara',       '', 'user'),
  ('Rogerio Costa Lima',       'Diretor Técnico',            'Dir. Técnica', 'linear-gradient(135deg,#7f1d1d,#f87171)', 'rogerio.lima',        '', 'admin')
ON CONFLICT (username) DO NOTHING;

# DIEFRA + Supabase — Guia completo de implantação

## O que você vai ter no final

- Sistema rodando em qualquer navegador, de qualquer lugar do Brasil
- Múltiplos usuários simultâneos sem conflito
- Login com e-mail e senha para cada pessoa
- Atualização em tempo real — quando alguém salva, todos veem
- Banco de dados PostgreSQL na nuvem, sem servidor para manter
- Custo: R$ 0 para começar

---

## PASSO 1 — Criar conta no Supabase (5 minutos)

1. Acesse https://supabase.com e clique em **Start your project**
2. Faça login com sua conta do GitHub ou Google
3. Clique em **New project**
4. Preencha:
   - **Name:** `diefra`
   - **Database Password:** anote essa senha, você vai precisar
   - **Region:** `South America (São Paulo)` — mais rápido no Brasil
5. Clique em **Create new project** e aguarde ~2 minutos

---

## PASSO 2 — Criar as tabelas (3 minutos)

1. No painel do Supabase, clique em **SQL Editor** (ícone de banco no menu esquerdo)
2. Clique em **New query**
3. Copie todo o conteúdo do arquivo `1_schema.sql`
4. Cole na janela e clique em **Run** (ou Ctrl+Enter)
5. Você verá a mensagem `Success. No rows returned`

Pronto — todas as tabelas foram criadas com segurança ativada.

---

## PASSO 3 — Pegar as chaves do projeto (2 minutos)

1. No menu esquerdo, clique em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie os dois valores:
   - **Project URL** — começa com `https://`
   - **anon public** — chave longa começando com `eyJ`

---

## PASSO 4 — Criar os usuários no Supabase Auth (5 minutos)

Cada pessoa que vai usar o sistema precisa de um cadastro no Supabase Auth:

1. No menu esquerdo, clique em **Authentication**
2. Clique em **Users** → **Add user** → **Create new user**
3. Para cada pessoa da lista, cadastre:
   - E-mail (ex: `leonardo.martins@suaempresa.com.br`)
   - Senha inicial (ex: `Diefra@2026`)
4. Repita para cada usuário

> Depois de criar, volte ao SQL Editor e atualize o campo `email`
> na tabela `participantes` para cada pessoa.

---

## PASSO 5 — Configurar o diefra-db.js (2 minutos)

Abra o arquivo `2_diefra-db.js` e substitua as duas primeiras linhas:

```javascript
// ANTES
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_ANON_KEY_PUBLICA';

// DEPOIS (cole os valores do Passo 3)
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## PASSO 6 — Modificar o index.html (5 minutos)

### 6a. Adicione as duas tags no `<head>`, antes do fechamento `</head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="diefra-db.js"></script>
```

### 6b. Remova ou comente o bloco antigo de sync

Localize no `index.html` o bloco:
```javascript
const API_CFG = {
  url: 'https://script.google.com/...',
  ...
```

Comente tudo entre `const API_CFG` e o fim das funções de sync
(scheduleAutoSync, etc.) colocando `/*` antes e `*/` depois.

### 6c. Adapte as chamadas de salvar

Em cada lugar do código onde algo é salvo, adicione a chamada ao DB.
Exemplo para contratos:

```javascript
// ANTES (código original)
function saveContract(data) {
  ST.contracts.push(data);
  scheduleAutoSync();
}

// DEPOIS
async function saveContract(data) {
  ST.contracts.push(data);
  await DB.salvarContrato(data);   // salva no Supabase
}
```

O arquivo `2_diefra-db.js` tem funções prontas para todas as entidades:
- `DB.salvarContrato(c)`
- `DB.salvarTarefa(t)`
- `DB.salvarEquipamento(e)`
- `DB.salvarRegistroCalib(r)`
- `DB.salvarNC(n)`
- `DB.salvarMedicao(m)`
- `DB.salvarEpiItem(item)`
- `DB.salvarEpiEntrega(entrega)`
- `DB.salvarVeiculo(v)`
- `DB.salvarCustoAnalise(c)`

---

## PASSO 7 — Hospedar o index.html (10 minutos)

O `index.html` é um arquivo estático — pode hospedar em qualquer lugar gratuito:

### Opção A — Netlify (recomendado, mais fácil)
1. Acesse https://netlify.com e crie conta
2. Arraste a pasta com o `index.html` e o `diefra-db.js` para o painel
3. Em 30 segundos você terá um link como `diefra-gestao.netlify.app`

### Opção B — GitHub Pages (grátis)
1. Crie um repositório no GitHub
2. Suba o `index.html` e `diefra-db.js`
3. Settings → Pages → Source: main branch
4. Acesse em `seuusuario.github.io/diefra`

### Opção C — Pasta na rede local
Se todos os usuários estão na mesma rede (mesmo escritório),
pode simplesmente colocar os arquivos numa pasta compartilhada
e abrir o `index.html` no navegador.

---

## Estrutura final dos arquivos

```
diefra/
├── index.html       ← seu sistema original (modificado)
└── diefra-db.js     ← cliente Supabase (este arquivo)
```

---

## Checklist de segurança

- [ ] Trocar a senha de todos os usuários após o primeiro login
- [ ] Não compartilhar a `service_role key` — use apenas a `anon key`
- [ ] Ativar MFA no painel do Supabase (Authentication → Settings)
- [ ] Revisar as políticas RLS se quiser restringir acesso por contrato

---

## Limites do plano gratuito Supabase

| Recurso | Limite gratuito |
|---------|-----------------|
| Banco de dados | 500 MB |
| Requisições API | 2 milhões/mês |
| Usuários | Ilimitado |
| Tempo real | Incluído |
| Backup | 7 dias |

Para a maioria das empresas de médio porte, o plano gratuito dura anos.
Se precisar mais: o plano Pro custa US$ 25/mês (~R$ 125).

---

## Suporte

- Documentação Supabase em português: https://supabase.com/docs
- Comunidade: https://github.com/supabase/supabase/discussions

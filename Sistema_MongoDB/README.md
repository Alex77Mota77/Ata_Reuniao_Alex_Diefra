# DIEFRA — Sistema de Gestão Multi-Usuário

## Stack (100% Gratuita)

| Camada       | Tecnologia            | Hospedagem         | Plano Grátis            |
|--------------|-----------------------|--------------------|-------------------------|
| Frontend     | Angular 17 + TypeScript | Netlify           | 100GB bandwidth/mês     |
| Backend      | FastAPI (Python 3.11)  | Render             | 750h/mês (sleep 15min)  |
| Banco        | MongoDB Atlas          | Atlas M0           | 512MB storage           |
| Auth         | JWT + bcrypt           | —                  | —                       |

## Perfis de Acesso

| Role         | Contratos | Financeiro | Medições | Tarefas | Usuários |
|--------------|-----------|------------|----------|---------|----------|
| admin        | ✅ todos  | ✅         | ✅       | ✅      | ✅       |
| gestor       | ✅ seus   | ✅ seus    | ✅ seus  | ✅ seus | ❌       |
| financeiro   | 👁️ leitura | ✅        | 👁️ leitura | ❌    | ❌       |
| visualizador | 👁️ leitura | 👁️ leitura | 👁️ leitura | 👁️ leitura | ❌ |

## Setup Local (Desenvolvimento)

### 1. Pré-requisitos
```bash
node >= 18, python >= 3.11, npm >= 9
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # edite com suas credenciais
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
# Acesse http://localhost:4200
```

## Deploy Gratuito

### MongoDB Atlas
1. atlas.mongodb.com → Create Free Cluster (M0)
2. Database Access → Add User
3. Network Access → Allow 0.0.0.0/0
4. Copie a Connection String para o .env

### Backend no Render
1. render.com → New Web Service
2. Connect GitHub repo → pasta `backend/`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Adicione as Environment Variables do .env

### Frontend no Netlify
1. netlify.com → Import from GitHub
2. Build: `npm run build`
3. Publish dir: `dist/diefra-frontend/browser`
4. Adicione env: `VITE_API_URL=https://seu-backend.onrender.com`

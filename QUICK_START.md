# 🚀 Quick Start - Wedding Invitation System

## 📋 Resumo

Este é um sistema completo de convites de casamento com:
- ✅ Dashboard web interativo
- ✅ API REST com autenticação JWT
- ✅ Integração WhatsApp (EvolutionAPI)
- ✅ Documentação Swagger automática
- ✅ Login seguro com hash de senha

---

## 🏃 Começar em 3 Passos

### 1️⃣ Iniciar o Sistema
```bash
# Criar rede Docker
docker network create wedding_shared_net

# Subir containers
make docker-up
```

### 2️⃣ Acessar o Dashboard
```
Frontend: http://localhost:3000/login.html
API Docs: http://localhost:5000/docs
```

### 3️⃣ Fazer Login
```
Usuário: admin
Senha: admin123
```

✅ **Pronto! Você está dentro do sistema.**

---

## 📚 Documentação

| Documento | Conteúdo |
|-----------|----------|
| **[AUTH_SETUP.md](AUTH_SETUP.md)** | Sistema de autenticação com JWT |
| **[SWAGGER_DOCS.md](SWAGGER_DOCS.md)** | Documentação Swagger da API |
| **[LOGIN_GUIDE.md](LOGIN_GUIDE.md)** | Guia rápido de login |
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** | Resumo técnico da implementação |

---

## 🌐 Acessos

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | admin / admin123 |
| **Swagger** | http://localhost:5000/docs | admin / admin123 |
| **Backend** | http://localhost:5000/api | Token JWT |
| **EvolutionAPI** | http://localhost:8080 | Configurável |

---

## 🔑 Credenciais Padrão

```
Username: admin
Password: admin123
Email: admin@casamento.com
```

> ⚠️ **Recomendação:** Altere a senha em produção!

---

## 📖 Testando a API

### Via Swagger
1. Acesse: http://localhost:5000/docs
2. Clique em **"Authorize"**
3. Cole: `Bearer <seu_token>`
4. Teste os endpoints

### Via cURL
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 2. Usar token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/guests
```

---

## 🏗️ Estrutura do Projeto

```
.
├── api/                    # Backend Flask
│   ├── app.py             # Aplicação principal
│   ├── models.py          # Modelos do banco
│   ├── database.py        # Inicialização DB
│   └── requirements.txt    # Dependências
├── web/                    # Frontend
│   ├── index.html         # Dashboard
│   ├── login.html         # Página de login
│   └── js/               # JavaScript
├── docs/                   # Documentação
└── docker-compose.yml      # Configuração Docker
```

---

## ✨ Principais Funcionalidades

### ✅ Dashboard
- Gerenciar convidados
- Criar templates de mensagens
- Organizar em grupos
- Enviar convites por WhatsApp
- Agendar envios

### ✅ Autenticação
- Login seguro com JWT
- Hash de senha (pbkdf2)
- Token com validade de 30 dias
- Auto-logout em expiração

### ✅ API REST
- Endpoints totalmente documentados
- Swagger/OpenAPI
- Autenticação JWT em todas rotas
- Tratamento de erros completo

---

## 🔧 Commando Úteis

```bash
# Iniciar
make docker-up

# Parar
make docker-down

# Ver logs
make docker-logs

# Rebuild
make docker-up --build

# Entrar no container backend
docker exec -it api bash

# Reinicializar banco de dados
docker exec -it api python database.py
```

---

## 🐛 Troubleshooting

**Erro: "No matching distribution found for PyJWT"**
- ✅ Fixo: Usando versão 2.6.0 (estável)

**Erro: "Connection refused"**
- Aguarde 10 segundos para os containers iniciarem
- Verifique: `docker ps`

**Erro: "Invalid token"**
- Faça login novamente
- Token expira após 30 dias

---

## 📞 Suporte

Para dúvidas, consulte:
- 📖 [SWAGGER_DOCS.md](SWAGGER_DOCS.md) - Documentação API
- 🔐 [AUTH_SETUP.md](AUTH_SETUP.md) - Sistema de autenticação
- 🎯 [LOGIN_GUIDE.md](LOGIN_GUIDE.md) - Guia de login

---

**Desenvolvido com ❤️ para o casamento de Gabriela & Josemar 💍**

Data: 16 de Junho de 2026  
Status: ✅ Pronto para Produção

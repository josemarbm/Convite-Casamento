# 🚀 Quick Start - Wedding Invitation System

## 📋 Resumo

Este é um sistema completo de convites de casamento com:
- ✅ Dashboard web interativo
- ✅ API REST com autenticação JWT
- ✅ Integração WhatsApp (EvolutionAPI)
- ✅ API Fastify e frontend React no mesmo serviço
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
Aplicação: http://localhost:3000
Health: http://localhost:3000/health
```

### 3️⃣ Fazer Login
```
Usuário: admin
Senha: admin123
```

✅ **Pronto! Você está dentro do sistema.**

### 📝 Gerenciar Templates (Opcional)

Após fazer login, você pode criar e gerenciar templates de mensagem no painel dashboard:

1. Acesse o painel principal em `http://localhost:3000`
2. Clique em "Templates de mensagem" na seção "Comunicação"
3. Clique em "Criar template" para criar um novo modelo
4. Use os campos `{nome}`, `{event_name}`, `{event_date_time}`, `{event_location}`, `{event_address}`, `{hosts}` e `{rsvp_url}` para personalizar a mensagem
5. Visualize a prévia da conversa no WhatsApp antes de salvar
6. Defina um template como "padrão" para ser usado automaticamente nas envios

**Campos disponíveis:**
- `{nome}` - Nome do convidado
- `{event_name}` - Nome do evento
- `{event_date_time}` - Data e hora do evento
- `{event_location}` - Local do evento
- `{event_address}` - Endereço do evento
- `{hosts}` - Nomes dos anfitriões
- `{rsvp_url}` - Link de confirmação RSVP

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
| **Node monolith** | http://localhost:3000 | admin / admin123 |
| **API** | http://localhost:3000/api | Token JWT |
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
1. Acesse: http://localhost:3000
2. Clique em **"Authorize"**
3. Cole: `Bearer <seu_token>`
4. Teste os endpoints

### Via cURL
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 2. Usar token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/guests
```

---

## 🏗️ Estrutura do Projeto

```
.
├── server/                 # Monólito Fastify
├── prisma/                 # Mapeamento MySQL
├── web-react/              # Frontend React
├── tests/                  # Testes Node
├── docs/                   # Documentação
└── docker-compose.yml      # Configuração Docker
```

---

## ✨ Principais Funcionalidades

### ✅ Dashboard
- Gerenciar convidados
- Buscar, filtrar e paginar convidados
- Criar templates de mensagens
- Organizar em grupos
- Enviar convites por WhatsApp
- Agendar envios
- Criar eventos com imagem obrigatória
- RSVP público com apresentação editorial do convite

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

**Aplicação Node.js para o casamento de Gabriela & Josemar**

Data: 16 de Junho de 2026
Status: ✅ Pronto para Produção

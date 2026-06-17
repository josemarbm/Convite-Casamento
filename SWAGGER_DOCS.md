# 📚 API Documentation - Swagger/OpenAPI

A documentação interativa da API foi implementada usando **Flasgger**, uma ferramenta que integra Swagger/OpenAPI com Flask.

## 🚀 Acessar a Documentação

### URL
```
http://localhost:5000/docs
```

### Características

✅ **Documentação Interativa** - Teste endpoints diretamente no navegador  
✅ **Swagger UI** - Interface visual clara e amigável  
✅ **OpenAPI 3.0** - Padrão de documentação de APIs REST  
✅ **Try It Out** - Execute requisições com autenticação JWT  
✅ **Modelos** - Schemas de request/response documentados  

---

## 📋 Endpoints Documentados

### ✅ Authentication
- `POST /api/auth/login` - Login do usuário
- `POST /api/auth/register` - Registro de novo usuário
- `GET /api/auth/me` - Obter dados do usuário autenticado

### ✅ Guests (Convidados)
- `GET /api/guests` - Listar convidados com filtros
- `POST /api/guests` - Criar novo convidado
- `GET /api/guests/<id>` - Obter um convidado
- `PUT /api/guests/<id>` - Atualizar convidado
- `DELETE /api/guests/<id>` - Deletar convidado
- `POST /api/guests/import` - Importar de Excel
- `GET /api/guests/export` - Exportar para Excel

### ✅ Templates
- `GET /api/templates` - Listar templates
- `POST /api/templates` - Criar template
- `GET /api/templates/<id>` - Obter template
- `PUT /api/templates/<id>` - Atualizar template
- `DELETE /api/templates/<id>` - Deletar template

### ✅ Groups
- `GET /api/groups` - Listar grupos
- `POST /api/groups` - Criar grupo
- `GET /api/groups/<id>` - Obter grupo
- `PUT /api/groups/<id>` - Atualizar grupo
- `DELETE /api/groups/<id>` - Deletar grupo

### ✅ Sending
- `POST /api/send/direct` - Enviar mensagens imediatas
- `POST /api/send/schedule` - Agendar envio
- `GET /api/send/scheduled` - Listar envios agendados
- `DELETE /api/send/scheduled/<id>` - Cancelar envio agendado

---

## 🔐 Autenticação no Swagger

### 1. Fazer Login
1. Clique em `POST /api/auth/login`
2. Clique em "Try it out"
3. Preencha o JSON com suas credenciais:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
4. Clique em "Execute"
5. Copie o `token` da resposta

### 2. Autorizar no Swagger
1. Clique no botão **"Authorize"** (superior direito) 🔒
2. Cole: `Bearer {seu_token_aqui}`
3. Clique em "Authorize"
4. Agora todos os endpoints protegidos estarão disponíveis

### 3. Testar Endpoints Protegidos
Depois de autorizar, você pode testar qualquer endpoint que requer autenticação.

---

## 📝 Exemplo de Uso Completo

### 1. Login
```
POST /api/auth/login
Body: {
  "username": "admin",
  "password": "admin123"
}
Response: {
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}
```

### 2. Copiar Token

Extrair o token da resposta acima.

### 3. Autorizar no Swagger
Clique em **Authorize** → Cole `Bearer eyJ0eXAiOiJKV1QiLCJhbGc...` → **Authorize**

### 4. Testar Endpoint Protegido
```
GET /api/guests
Resposta automática com Bearer Token adicionado aos headers
```

---

## 🧪 Testando sem Swagger

### Via cURL

**1. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**2. Copiar token da resposta**

**3. Usar token:**
```bash
curl -X GET http://localhost:5000/api/guests \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Via Postman
1. Importar JSON do Swagger: `http://localhost:5000/apispec.json`
2. Ir para "Auth" → "Bearer Token"
3. Colar token
4. Testar endpoints

---

## 📊 Formatos de Resposta

### Sucesso (200/201)
```json
{
  "guests": [...],
  "total": 100,
  "page": 1,
  "per_page": 50,
  "pages": 2
}
```

### Erro (400/401/404)
```json
{
  "error": "Descrição do erro"
}
```

### Autenticação Requerida (401)
```json
{
  "error": "Token is missing"
}
```

---

## 🎯 URLs Úteis

| Recurso | URL |
|---------|-----|
| 📖 Swagger UI | http://localhost:5000/docs |
| 📄 OpenAPI JSON | http://localhost:5000/apispec.json |
| 🏠 API Base | http://localhost:5000/api |

---

## 🔧 Configuração do Swagger

O Swagger está configurado em `api/app.py`:

```python
swagger_config = {
    "specs_route": "/docs",
    "title": "Wedding Invitation API",
    "version": "1.0.0",
    "description": "API REST para Sistema de Convites de Casamento via WhatsApp"
}

flasgger = Flasgger(app, config=swagger_config)
```

---

## 📚 Documentação Adicional

Cada endpoint tem:
- ✅ Descrição clara
- ✅ Parâmetros documentados
- ✅ Schemas de request/response
- ✅ Códigos de status HTTP
- ✅ Exemplos de uso

---

## 💡 Dicas

1. **Expirações de Token**: Token dura 30 dias. Após expirar, faça login novamente.
2. **Testar Upload**: Use "Try it out" e selecione o arquivo no Swagger.
3. **Debug**: Veja os detalhes da requisição clicando em "Show/Hide curl command"
4. **Histórico**: O Swagger mantém histórico de requisições durante a sessão

---

## 🚀 Próximas Melhorias

- [ ] Adicionar mais documentação aos endpoints
- [ ] Incluir exemplos de request/response
- [ ] Documentar webhooks
- [ ] Rate limiting documentation

---

**Swagger está ✅ ativo e pronto para uso!**

Acesse: **http://localhost:5000/docs**

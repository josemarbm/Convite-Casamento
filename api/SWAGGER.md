# 🎯 Swagger API Documentation

## 📍 Acesso Rápido

**URL:** `http://localhost:5000/docs`

## ✅ Status

- ✅ Flasgger instalado
- ✅ OpenAPI configurado
- ✅ Endpoints documentados
- ✅ Swagger UI ativo
- ✅ Autenticação JWT integrada

## 🚀 Começar

1. **Acesse:** http://localhost:5000/docs
2. **Clique em:** "Authorize" (🔒)
3. **Faça login com:**
   - Username: `admin`
   - Password: `admin123`
4. **Teste os endpoints!**

## 📚 Documentação Completa

Veja: [SWAGGER_DOCS.md](../SWAGGER_DOCS.md)

## 🔑 Token JWT

Todos os endpoints (exceto login) requerem autenticação JWT:

```
Authorization: Bearer <token>
```

O Swagger adiciona automaticamente ao usar "Authorize".

## 📝 Endpoints Principais

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

### Guests  
- `GET /api/guests` - Listar
- `POST /api/guests` - Criar
- `PUT /api/guests/<id>` - Atualizar
- `DELETE /api/guests/<id>` - Deletar

### Templates
- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/<id>`

### Groups
- `GET /api/groups`
- `POST /api/groups`

---

**Desenvolvido com Flasgger + OpenAPI 3.0**

# Sistema de Autenticação - Convites de Casamento 🔐

## 📝 Descrição

Sistema completo de autenticação com JWT (JSON Web Token) para proteger o frontend e backend.

## ✅ Características Implementadas

### Backend (API Flask)
- ✅ Modelo de usuário com hash de senha (Werkzeug)
- ✅ Autenticação com JWT (Token de 30 dias)
- ✅ Endpoints de login e registro
- ✅ Middleware `@token_required` para proteger rotas
- ✅ Endpoints protegidos: Guests, Templates, Groups, Configurações
- ✅ Validação de sessão automática

### Frontend (HTML/JavaScript)
- ✅ Página de login responsiva
- ✅ Página de registro de novos usuários
- ✅ Armazenamento seguro do token no localStorage
- ✅ Verificação automática de autenticação
- ✅ Redirecionamento automático para login se token expirado
- ✅ Botão de logout no header
- ✅ Exibição do nome do usuário logado

## 🚀 Começando

### Credenciais Padrão

```
Usuário: admin
Senha: admin123
Email: admin@casamento.com
```

### 1. Acessar o Sistema

1. Acesse: `http://localhost:3000/login.html`
2. Faça login com as credenciais padrão
3. Será redirecionado automaticamente para o dashboard

### 2. Criar Novo Usuário

Na página de login, clique em "Criar conta" e preencha:
- **Usuário**: Nome único para o usuário
- **Email**: Endereço de email válido
- **Senha**: Mínimo recomendado de 6 caracteres

## 🔑 Endpoints de Autenticação

### Register (Registrar novo usuário)
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "novo_usuario",
  "email": "email@exemplo.com",
  "password": "senha123"
}

Resposta (201):
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "novo_usuario",
    "email": "email@exemplo.com",
    "is_active": true
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Resposta (200):
{
  "message": "Login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@casamento.com",
    "is_active": true
  }
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>

Resposta (200):
{
  "id": 1,
  "username": "admin",
  "email": "admin@casamento.com",
  "is_active": true,
  "created_at": "2026-06-16T10:30:00"
}
```

## 🛡️ Proteção de Rotas

Todos os endpoints abaixo agora requerem autenticação:

### Protected Endpoints

```
GET    /api/guests             - Listar convidados
POST   /api/guests             - Criar convidado
PUT    /api/guests/<id>        - Atualizar convidado
DELETE /api/guests/<id>        - Deletar convidado
POST   /api/guests/import      - Importar Excel
GET    /api/guests/export      - Exportar Excel

GET    /api/templates          - Listar templates
GET    /api/templates/<id>     - Obter template
POST   /api/templates          - Criar template
PUT    /api/templates/<id>     - Atualizar template
DELETE /api/templates/<id>     - Deletar template

GET    /api/groups             - Listar grupos
POST   /api/groups             - Criar grupo
PUT    /api/groups/<id>        - Atualizar grupo
DELETE /api/groups/<id>        - Deletar grupo
```

## 📲 Como Usar a API com cURL

### 1. Fazer Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 2. Usar Token para Requisições
```bash
curl -X GET http://localhost:5000/api/guests \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### 3. Registrar Novo Usuário
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "maria",
    "email": "maria@exemplo.com",
    "password": "senha456"
  }'
```

## 🔒 Segurança

### Implementações de Segurança

1. **Hash de Senha**
   - Utilizando `Werkzeug.security.generate_password_hash`
   - Algoritmo: werkzeug padrão (pbkdf2)

2. **JWT Token**
   - Algoritmo: HS256
   - Validade: 30 dias
   - Secret Key: Configurável via `FLASK_SECRET_KEY`

3. **CORS Habilitado**
   - Permite requisições do frontend
   - Configurável para produção

4. **Validação de Token**
   - Verificação em cada requisição
   - Redirecionamento automático em caso de expiração

## 🔄 Fluxo de Autenticação

```
1. Usuário acessa /login.html
   ↓
2. Preenche credenciais e clica "Entrar"
   ↓
3. Frontend faz POST /api/auth/login
   ↓
4. Backend valida credenciais e retorna JWT token
   ↓
5. Frontend armazena token em localStorage
   ↓
6. Frontend redireciona para dashboard (index.html)
   ↓
7. Para cada requisição, frontend envia: Authorization: Bearer <token>
   ↓
8. Backend valida token no middleware @token_required
   ↓
9. Se válido, executa a ação; se inválido, retorna 401 Unauthorized
```

## 📋 Checklist de Implementação

- [x] Modelo de User no banco de dados
- [x] Hash de senha com Werkzeug
- [x] Geração de JWT token
- [x] Middleware de autenticação
- [x] Endpoints /auth/login e /auth/register
- [x] Proteção de rotas com @token_required
- [x] Página de login responsiva
- [x] Página de registro
- [x] Armazenamento de token no localStorage
- [x] Verificação de autenticação no app.js
- [x] Adição do token nos headers das requisições
- [x] Redirecionamento automático em caso de token inválido
- [x] Botão de logout
- [x] Exibição do usuário logado
- [x] Usuário padrão criado automaticamente
- [x] Tratamento de erros de autenticação

## ⚙️ Configurações

### Variáveis de Ambiente

```bash
# .env
FLASK_SECRET_KEY=sua-chave-secreta-aqui
DATABASE_URL=mysql+pymysql://wedding_user:wedding_pass_2024@localhost:3306/wedding_invites
```

### Alterando Credenciais Padrão

Para alterar a senha do usuário `admin`, edite [api/database.py](api/database.py):

```python
default_user.set_password('nova_senha_aqui')
```

## 🐛 Troubleshooting

### "Token is missing"
- Verifique se você está enviando o header: `Authorization: Bearer <token>`
- Verifique se o token está correto em localStorage

### "Invalid token"
- O token pode estar expirado (válidade: 30 dias)
- Faça login novamente para obter um novo token

### "User not found or inactive"
- Verifique se o usuário ainda existe no banco de dados
- Confira se o usuário tem `is_active = true`

## 📚 Referências

- [JWT.io](https://jwt.io/)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [Werkzeug Security](https://werkzeug.palletsprojects.com/en/2.3.x/security/)
- [Flask Official Docs](https://flask.palletsprojects.com/)

---

**Sistema de Autenticação Implementado com Sucesso! 🎉**

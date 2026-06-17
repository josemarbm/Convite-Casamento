# 🔐 Sistema de Autenticação - Guia Rápido

## ✅ Implementação Concluída!

Foi implementado um sistema **completo de autenticação** para o seu sistema de convites de casamento.

---

## 🚀 Começando Rapidamente

### 1️⃣ Iniciar o Sistema
```bash
docker network create wedding_shared_net
make docker-up
```

### 2️⃣ Acessar o Dashboard
- **URL:** http://localhost:3000/login.html
- **Usuário:** `admin`
- **Senha:** `admin123`

### 3️⃣ Pronto! ✅
Você será redirecionado para o dashboard após o login.

---

## 📋 O Que Foi Criado

### Backend (API Flask)
- [x] Autenticação com JWT
- [x] Registro de novos usuários
- [x] Login seguro
- [x] Proteção de todos os endpoints
- [x] Hash de senha criptografado

### Frontend (Dashboard)
- [x] Página de login responsiva
- [x] Página de registro
- [x] Botão de logout no header
- [x] Verificação automática de sessão
- [x] Redirecionamento inteligente

---

## 🔑 Principais Funcionalidades

| Funcionalidade | Status |
|---|---|
| Login com usuário/senha | ✅ Ativo |
| Registro de novo usuário | ✅ Ativo |
| Proteção de rotas | ✅ Ativo |
| Token JWT 30 dias | ✅ Ativo |
| Hash de senha seguro | ✅ Ativo |
| Logout automático | ✅ Ativo |
| Sessão persistente | ✅ Ativa |

---

## 📝 Usuários Padrão

### Admin (Pré-configurado)
```
Usuário: admin
Senha: admin123
Email: admin@casamento.com
```

> 💡 **Dica:** Você pode criar novos usuários na página de registro

---

## 📚 Documentação Completa

Para informações detalhadas sobre:
- Endpoints da API
- Exemplos com cURL
- Segurança
- Troubleshooting

Veja: **`AUTH_SETUP.md`**

---

## 🛠️ Estrutura de Arquivos Modificados

```
api/
├── requirements.txt          (+ PyJWT, Werkzeug)
├── models.py                 (+ User model)
├── app.py                    (+ auth endpoints)
└── database.py               (+ default user)

web/
├── login.html                (NOVO - página de login)
├── js/
│   ├── app.js                (+ autenticação)
│   └── api.js                (+ headers JWT)
```

---

## 🔒 Segurança Implementada

✅ **Hash de Senha** - Criptografia com Werkzeug  
✅ **JWT Token** - Validade de 30 dias  
✅ **Middleware** - Validação em cada requisição  
✅ **Auto-Logout** - Redirecionamento em expiração  
✅ **CORS** - Proteção contra requisições indevidas  

---

## 🧪 Teste Agora!

### Via Browser
1. Acesse: http://localhost:3000/login.html
2. Use: `admin` / `admin123`
3. Clique em "Entrar"

### Via API (cURL)
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Copie o token da resposta e use assim:
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:5000/api/guests
```

---

## ❓ Dúvidas Frequentes

**P: Esqueci minha senha?**  
R: Entre em contato com o administrador para resetar.

**P: Posso mudar a senha?**  
R: Ainda não há interface para isso. Entre em contato com o admin.

**P: Como criar um novo usuário?**  
R: Na página de login, clique em "Criar conta".

**P: Quanto tempo o token dura?**  
R: 30 dias. Após isso, você precisa fazer login novamente.

---

## 📞 Próximos Passos

- [ ] Recuperação de senha
- [ ] Painel de gerenciamento de usuários (admin)
- [ ] Dois fatores de autenticação (2FA)
- [ ] API key para integrações

---

## 📧 Suporte

Para problemas ou dúvidas, consulte:
- `AUTH_SETUP.md` - Documentação técnica completa
- `IMPLEMENTATION_SUMMARY.md` - Resumo da implementação

---

**Sistema de Autenticação ✅ Ativo e Seguro**  
*Desenvolvido em 16 de Junho de 2026*

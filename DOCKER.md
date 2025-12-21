# Docker Compose - Sistema de Convites de Casamento

Sistema completo containerizado com Docker Compose.

## 🐳 Serviços

### 1. **evolution-api** (Porta 8080)

- WhatsApp integration via EvolutionAPI
- Volume persistente para instâncias
- Acessível em: `http://localhost:8080/manager`

### 2. **backend** (Porta 5000)

- Flask REST API
- SQLite database
- Comunicação interna com EvolutionAPI
- Acessível em: `http://localhost:5000`

### 3. **frontend** (Porta 3000)

- Nginx servindo aplicação web
- Interface de usuário
- Acessível em: `http://localhost:3000`

## 🚀 Como Usar

### Iniciar todos os serviços

```bash
docker-compose up -d
```

### Ver logs

```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f evolution-api
```

### Parar serviços

```bash
docker-compose down
```

### Reconstruir após mudanças no código

```bash
docker-compose up -d --build
```

### Acessar container

```bash
# Backend
docker exec -it wedding-backend bash

# Frontend
docker exec -it wedding-frontend sh
```

## 📂 Volumes

- `evolution_data`: Dados das instâncias WhatsApp
- `backend_data`: Uploads de imagens
- `backend_db`: Banco de dados SQLite

## 🌐 Acessos

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **EvolutionAPI Manager**: http://localhost:8080/manager

## ⚙️ Configuração

As variáveis de ambiente estão definidas no `docker-compose.yml`. Para produção, crie um arquivo `.env`:

```env
EVOLUTION_API_KEY=sua-chave-secreta
FLASK_SECRET_KEY=outra-chave-secreta
```

E use no docker-compose:

```yaml
env_file:
  - .env
```

## 🔄 Workflow de Desenvolvimento

### Desenvolvimento local com hot-reload

```bash
# Backend (monta volume no código)
docker-compose up backend

# Frontend - edite arquivos em web/ e recarregue navegador
```

### Build e Deploy

```bash
# Build imagens
docker-compose build

# Push para registry (exemplo)
docker tag wedding-backend:latest seu-registry/wedding-backend:latest
docker push seu-registry/wedding-backend:latest
```

## 🛠️ Comandos Úteis

```bash
# Limpar tudo (cuidado: remove volumes!)
docker-compose down -v

# Ver status dos containers
docker-compose ps

# Restart um serviço
docker-compose restart backend

# Ver uso de recursos
docker stats
```

## 🐛 Troubleshooting

**Backend não conecta ao Evolution:**

- Verifique se todos containers estão na mesma network: `docker network inspect convite-casamento-ui_wedding-network`

**Erro de permissão no banco:**

- Ajuste permissões: `docker exec wedding-backend chown -R 1000:1000 /app`

**Frontend não carrega:**

- Verifique logs do nginx: `docker logs wedding-frontend`
- Confirme que porta 3000 não está em uso

## 📦 Estrutura de Rede

Todos os serviços estão conectados via `wedding-network` (bridge):

- `evolution-api` (8080)
- `backend` (5000) → conecta a `evolution-api:8080`
- `frontend` (80) → usuário acessa via `localhost:3000`

## 🔐 Segurança

Para produção:

1. Altere todas as secret keys
2. Configure firewall para expor apenas porta 3000
3. Use HTTPS com certificado SSL
4. Configure rate limiting no nginx
5. Use secrets do Docker Swarm ou Kubernetes

## 📝 Logs

Logs são salvos em:

- Backend: stdout (veja com `docker logs`)
- Frontend nginx: `/var/log/nginx/` dentro do container
- EvolutionAPI: stdout

## 🎯 Próximos Passos

- [ ] Configurar SSL/TLS com Let's Encrypt
- [ ] Implementar backup automatizado dos volumes
- [ ] Configurar health checks
- [ ] Deploy em produção (AWS/GCP/Azure)

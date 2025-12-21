# Nome do serviço no docker-compose
SERVICE = evolution-api
COMPOSE = docker-compose
PYTHON = python3
BACKEND_DIR = api

# crie help para o make
.PHONY: help
help:
	@echo "Comandos disponíveis:"
	@echo ""
	@echo "  --- Docker Compose (Recomendado) ---"
	@echo "  docker-up:       Subir todo o sistema (EvolutionAPI + Backend + Frontend)"
	@echo "  docker-down:     Parar todos os containers"
	@echo "  docker-build:    Build das imagens"
	@echo "  docker-logs:     Ver logs de todos os serviços"
	@echo "  docker-restart:  Reiniciar containers"
	@echo "  docker-clean:    Limpar containers e volumes (CUIDADO!)"
	@echo ""
	@echo "  --- EvolutionAPI Docker ---"
	@echo "  up:              Subir a stack Docker"
	@echo "  down:            Parar os containers"
	@echo "  restart:         Reiniciar o serviço"
	@echo "  logs:            Ver logs em tempo real"
	@echo "  status:          Ver status dos containers"
	@echo "  reset:           Remover tudo (inclusive volume com sessão)"
	@echo "  pull:            Atualizar a imagem"
	@echo ""
	@echo "  --- Backend API ---"
	@echo "  backend-setup:   Instalar dependências do backend"
	@echo "  backend-init-db: Inicializar banco de dados"
	@echo "  backend-run:     Rodar Flask API server"
	@echo ""
	@echo "  --- Legacy ---"
	@echo "  deploy-app:      Deploy da aplicação (legacy)"
	@echo "  run-app:         Run APP (legacy - envia via script Python)"
	@echo ""
	@echo "  --- Full Stack ---"
	@echo "  dev:             Rodar backend + abrir frontend"

# ===== Docker Compose Commands (RECOMENDADO) =====

# Subir todo o sistema containerizado
# Subir Infraestrutura (MySQL + EvolutionAPI)
docker-infra-up:
	$(COMPOSE) -f docker-compose.infra.yml up -d
	@echo "🛠️ Infraestrutura iniciada (MySQL + EvolutionAPI)"

# Subir Aplicação (Backend + Frontend)
docker-app-up:
	$(COMPOSE) -f docker-compose.yml up -d --build
	@echo "🚀 Aplicação iniciada (Backend + Frontend)"

# Subir TUDO
docker-up: docker-infra-up docker-app-up
	@echo "✅ Sistema completo iniciado!"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   Backend:   http://localhost:5000"
	@echo "   Evolution: http://localhost:8080/manager"

# Parar TUDO
docker-down:
	$(COMPOSE) -f docker-compose.yml down
	$(COMPOSE) -f docker-compose.infra.yml down
	@echo "🛑 Todos os serviços parados"

# Logs
docker-logs-infra:
	$(COMPOSE) -f docker-compose.infra.yml logs -f

docker-logs-app:
	$(COMPOSE) -f docker-compose.yml logs -f

# Build das imagens
docker-build:
	$(COMPOSE) -f docker-compose.yml build
	@echo "📦 Imagens da aplicação buildadas"

# Ver logs
docker-logs:
	@echo "Use: make docker-logs-infra ou make docker-logs-app"

# Restart containers
docker-restart:
	make docker-down
	make docker-up
	@echo "🔄 Sistema reiniciado"

# Limpar tudo (volumes também)
docker-clean:
	$(COMPOSE) -f docker-compose.yml down -v
	$(COMPOSE) -f docker-compose.infra.yml down -v
	@echo "🧹 Sistema limpo (volumes removidos)"

# Ver status
docker-status:
	$(COMPOSE) -f docker-compose.yml ps
	$(COMPOSE) -f docker-compose.infra.yml ps

# ===== EvolutionAPI Docker Commands =====

# Subir a stack
up:
	$(COMPOSE) up -d
	@echo "✅ EvolutionAPI iniciado: http://172.25.219.32:8080/manager"

# Parar os containers
down:
	$(COMPOSE) down
	@echo "🛑 EvolutionAPI parado"

# Reiniciar o serviço
restart:
	$(COMPOSE) restart $(SERVICE)
	@echo "🔄 EvolutionAPI reiniciado"

# Ver logs em tempo real
logs:
	$(COMPOSE) logs -f $(SERVICE)

# Ver status dos containers
status:
	$(COMPOSE) ps

# Remover tudo (inclusive volume com sessão)
reset:
	$(COMPOSE) down -v
	@echo "🔥 EvolutionAPI removido com volume. Sessão será perdida!"

# Atualizar a imagem
pull:
	$(COMPOSE) pull
	@echo "⬇️  Imagem atualizada"

# ===== Backend API Commands =====

# Instalar dependências do backend
backend-setup:
	@echo "📦 Installing backend dependencies..."
	cd $(BACKEND_DIR) && $(PYTHON) -m pip install -r requirements.txt
	@echo "✅ Backend dependencies installed!"

# Inicializar banco de dados
backend-init-db:
	@echo "🗄️ Initializing database..."
	cd $(BACKEND_DIR) && $(PYTHON) -c "from app import app, init_db; init_db(app)"
	@echo "✅ Database initialized!"

# Rodar Flask server
backend-run: up
	@echo "🚀 Starting Flask API server..."
	cd $(BACKEND_DIR) && $(PYTHON) app.py

# ===== Legacy Commands =====

# Deploy da aplicação (legacy)
deploy-app:
	python3 -m venv .venv
	source .venv/bin/activate
	pip install -r requirements.txt

# Run APP (legacy - script Python que envia via Excel)
run-app: up
	python3 app.py

# ===== Full Stack Development =====

# Rodar backend e abrir frontend
dev: up backend-run

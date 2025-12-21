# Wedding Invitation Backend API

Flask REST API para o sistema de envio de convites de casamento via WhatsApp.

## 🚀 Getting Started

### Instalação

````bash
# Instalar dependências
make backend-setup

# Inicializar banco de dados
make backend-init-db

# Rodar servidor
make backend-run
``

O servidor estará disponível em `http://localhost:5000`

### Configuração

Copie `.env.example` para `.env` e configure as variáveis:

```env
EVOLUTION_API_URL=http://127.0.0.1:8080
EVOLUTION_API_KEY=your-api-key
EVOLUTION_SESSION_ID=default
FLASK_SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///wedding_invites.db
````

## 📚 API Endpoints

### Guests (Convidados)

#### `GET /api/guests`

Lista convidados com paginação e filtros.

**Query Parameters:**

- `page` (int): Página (default: 1)
- `per_page` (int): Itens por página (default: 50)
- `search` (string): Buscar por nome ou telefone
- `status` (string): Filtrar por status (pending, sent, failed)
- `group_id` (int): Filtrar por grupo

**Response:**

```json
{
  "guests": [...],
  "total": 100,
  "page": 1,
  "per_page": 50,
  "pages": 2
}
```

#### `POST /api/guests`

Criar novo convidado.

**Body:**

```json
{
  "name": "João Silva",
  "phone": "(11) 99999-9999",
  "group_id": 1
}
```

#### `PUT /api/guests/<id>`

Atualizar convidado.

#### `DELETE /api/guests/<id>`

Deletar convidado.

#### `POST /api/guests/import`

Importar convidados de Excel.

**Form Data:**

- `file`: Arquivo .xlsx com colunas Nome e Telefone

#### `GET /api/guests/export`

Exportar convidados para Excel.

---

### Templates (Mensagens)

#### `GET /api/templates`

Listar todos os templates de mensagem.

#### `POST /api/templates`

Criar novo template.

**Body:**

```json
{
  "name": "Template Especial",
  "content": "Olá {nome}...",
  "is_default": false
}
```

#### `PUT /api/templates/<id>`

Atualizar template.

#### `DELETE /api/templates/<id>`

Deletar template (não pode deletar o padrão).

---

### Groups (Grupos)

#### `GET /api/groups`

Listar todos os grupos.

#### `POST /api/groups`

Criar novo grupo.

**Body:**

```json
{
  "name": "Família",
  "description": "Parentes próximos"
}
```

#### `PUT /api/groups/<id>`

Atualizar grupo.

#### `DELETE /api/groups/<id>`

Deletar grupo.

---

### Sending (Envio)

#### `POST /api/send/direct`

Enviar mensagens imediatamente.

**Body:**

```json
{
  "template_id": 1,
  "guest_ids": [1, 2, 3],
  "group_id": null
}
```

**Response:**

```json
{
  "message": "Sent 3/3 messages",
  "results": [
    {"guest_id": 1, "name": "João", "success": true},
    ...
  ]
}
```

#### `POST /api/send/schedule`

Agendar envio para o futuro.

**Body:**

```json
{
  "template_id": 1,
  "group_id": 2,
  "guest_ids": [],
  "scheduled_time": "2025-12-20T14:30:00"
}
```

#### `GET /api/send/scheduled`

Listar envios agendados.

#### `DELETE /api/send/scheduled/<id>`

Cancelar envio agendado.

---

### Images (Imagens)

#### `POST /api/images/upload`

Upload de nova imagem do convite.

**Form Data:**

- `file`: Arquivo de imagem (PNG, JPG)

---

### Settings (Configurações)

#### `GET /api/settings`

Obter todas as configurações.

#### `PUT /api/settings`

Atualizar configurações.

**Body:**

```json
{
  "evolution_api_url": "http://localhost:8080",
  "evolution_api_key": "12345",
  "evolution_session_id": "default",
  "image_path": "uploads/convite.png"
}
```

---

### Utility

#### `GET /api/test-connection`

Testar conexão com EvolutionAPI.

#### `GET /api/stats`

Obter estatísticas do dashboard.

## 🗄️ Database Schema

### guests

- `id`: INTEGER PRIMARY KEY
- `name`: VARCHAR(200) NOT NULL
- `phone`: VARCHAR(50) NOT NULL
- `group_id`: INTEGER (FK groups.id)
- `status`: VARCHAR(20) ('pending', 'sent', 'failed')
- `sent_at`: TIMESTAMP
- `created_at`: TIMESTAMP

### message_templates

- `id`: INTEGER PRIMARY KEY
- `name`: VARCHAR(100) NOT NULL
- `content`: TEXT NOT NULL
- `is_default`: BOOLEAN
- `created_at`: TIMESTAMP

### groups

- `id`: INTEGER PRIMARY KEY
- `name`: VARCHAR(100) NOT NULL
- `description`: TEXT
- `created_at`: TIMESTAMP

### scheduled_sends

- `id`: INTEGER PRIMARY KEY
- `template_id`: INTEGER (FK message_templates.id)
- `group_id`: INTEGER (FK groups.id)
- `guest_ids`: TEXT (JSON array)
- `scheduled_time`: TIMESTAMP NOT NULL
- `status`: VARCHAR(20) ('pending', 'completed', 'failed', 'cancelled')
- `created_at`: TIMESTAMP
- `completed_at`: TIMESTAMP

### settings

- `key`: VARCHAR(100) PRIMARY KEY
- `value`: TEXT

## 🔧 Development

### Running Tests

```bash
# TODO: Add tests
```

### Database Migrations

```bash
# Reinicializar banco (perde dados!)
rm wedding_invites.db
make backend-init-db
```

## 📝 Notes

- O scheduler roda em background e executa envios agendados
- Uploads são salvos em `api/uploads/`
- Database SQLite está em `api/wedding_invites.db`

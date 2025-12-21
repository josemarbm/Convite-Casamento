# Interface Web - Sistema de Convites de Casamento

Interface moderna e intuitiva para gerenciar o envio de convites de casamento via WhatsApp.

## 🎨 Características

- **Design Moderno**: Interface dark theme com efeitos glassmorphism e animações suaves
- **Gestão de Convidados**: Adicione, edite e exclua convidados facilmente
- **Importação Excel**: Importe listas de convidados de planilhas Excel
- **Exportação Excel**: Exporte a lista para usar com o script Python backend
- **Editor de Mensagens**: Personalize a mensagem do convite com preview em tempo real
- **Dashboard**: Visualize estatísticas sobre seus convites
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Persistência Local**: Seus dados são salvos automaticamente no navegador

## 📁 Estrutura de Arquivos

```
web/
├── index.html      # Página principal
├── css/
│   └── styles.css  # Estilos e design system
└── js/
    └── app.js      # Lógica da aplicação
```

## 🚀 Como Usar

### 1. Abrir a Interface

Abra o arquivo `index.html` no seu navegador:

**Opção 1: Direto no navegador**

- Navegue até a pasta `web`
- Clique duas vezes em `index.html`

**Opção 2: Via linha de comando (WSL)**

```bash
cd /home/josemar/docker/convite-casamento-ui/web
explorer.exe index.html
```

### 2. Configurar a API (Aba Configurações)

1. Navegue até a aba **Configurações** ⚙️
2. Configure os seguintes campos:
   - **URL do Servidor**: `http://127.0.0.1:8080` (ou seu servidor EvolutionAPI)
   - **Session ID**: `default`
   - **API Key**: Sua chave da API
   - **Caminho da Imagem**: `convite.png`
3. Clique em **Salvar Configurações**

### 3. Gerenciar Convidados (Aba Convidados)

**Adicionar Manualmente:**

1. Clique em **➕ Adicionar Convidado**
2. Preencha nome e telefone
3. Clique em **Salvar**

**Importar de Excel:**

1. Clique em **📂 Importar Excel**
2. Selecione um arquivo `.xlsx` com as colunas `Nome` e `Telefone`
3. Os convidados serão automaticamente importados (duplicatas são ignoradas)

**Editar/Excluir:**

- Use os botões **✏️ Editar** ou **🗑️ Excluir** em cada linha da tabela

### 4. Personalizar Mensagem (Aba Mensagem)

1. Navegue até a aba **Mensagem** ✉️
2. Edite o template de mensagem no editor
3. Use `{nome}` para inserir o nome do convidado
4. Veja o preview em tempo real no mockup do WhatsApp
5. Clique em **💾 Salvar Mensagem**

**Atalho de teclado**: `Ctrl + S` para salvar rapidamente

### 5. Dashboard (Aba Dashboard)

Visualize estatísticas importantes:

- Total de convidados cadastrados
- Convites já enviados
- Convites pendentes

Acesso rápido a ações principais.

### 6. Enviar Convites

A interface web prepara os dados, mas o envio real é feito pelo script Python:

1. Exporte a lista de convidados: **📥 Exportar Excel**
2. Copie o arquivo exportado para a pasta raiz do projeto
3. No terminal, execute:

```bash
make run-app
```

Ou manualmente:

```bash
python3 app.py
```

## 💾 Armazenamento de Dados

Todos os dados são salvos automaticamente no **localStorage** do navegador:

- Lista de convidados
- Template de mensagem
- Configurações da API

**⚠️ Importante:**

- Os dados são específicos do navegador usado
- Limpar dados do navegador apagará suas informações
- Para backup, exporte regularmente para Excel

## 🎯 Formato do Excel

### Importação

O arquivo Excel deve conter as colunas:

- `Nome` ou `nome`
- `Telefone` ou `telefone`

Exemplo:
| Nome | Telefone |
|------|----------|
| Maria Silva | (11) 99999-9999 |
| João Santos | (21) 98888-8888 |

### Exportação

O arquivo exportado terá o formato compatível com `app.py`:

- Coluna `Nome`
- Coluna `Telefone`
- Arquivo nomeado como `convidados-YYYY-MM-DD.xlsx`

## ⌨️ Atalhos de Teclado

- `ESC`: Fechar modal
- `Ctrl/Cmd + S`: Salvar mensagem (quando na aba Mensagem)

## 🎨 Recursos Visuais

- **Tema Dark**: Design moderno com cores vibrantes
- **Glassmorphism**: Efeitos de vidro translúcido em cards
- **Animações**: Transições suaves e micro-interações
- **Gradientes**: Paleta de cores harmoniosa
- **Responsivo**: Adapta-se a diferentes tamanhos de tela
- **Preview WhatsApp**: Mockup realista do aplicativo

## 🔧 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Design system moderno com variáveis CSS
- **JavaScript (Vanilla)**: Lógica da aplicação sem frameworks
- **SheetJS (XLSX)**: Manipulação de arquivos Excel
- **Google Fonts (Inter)**: Tipografia moderna
- **localStorage API**: Persistência de dados

## 🐛 Solução de Problemas

**Os dados não estão sendo salvos:**

- Verifique se o navegador permite localStorage
- Não use modo anônimo/privado

**Erro ao importar Excel:**

- Verifique se o arquivo tem as colunas `Nome` e `Telefone`
- Use formato `.xlsx` (não `.xls` ou `.csv`)

**Preview da mensagem não atualiza:**

- Verifique se digitou `{nome}` corretamente (com chaves)
- Recarregue a página se necessário

**Convites não são enviados:**

- A interface web não envia diretamente
- Use `make run-app` após exportar a lista
- Verifique se a EvolutionAPI está rodando

## 🔗 Integração com Backend

A interface web prepara os dados, mas o envio real requer:

1. **EvolutionAPI** rodando (via Docker):

```bash
make up
```

2. **Script Python** configurado:

- Use o arquivo exportado da interface
- Configure em `app.py` se necessário

3. **Executar envio**:

```bash
make run-app
```

## 📝 Próximos Passos

Possíveis melhorias futuras:

- [ ] Backend Python (Flask/FastAPI) para envio direto
- [ ] Sincronização com banco de dados
- [ ] Rastreamento de status de envio em tempo real
- [ ] Upload customizado de imagem do convite
- [ ] Agendamento de envios
- [ ] Suporte a múltiplos idiomas

## 📄 Licença

Este projeto segue a mesma licença MIT do projeto principal.

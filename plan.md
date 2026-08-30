# Modernização do Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar a interface do sistema de convites para melhorar legibilidade, foco visual, consistência e usabilidade em desktop e mobile.

**Architecture:** O redesign será guiado por um design system compartilhado em CSS, reorganização da navegação e da estrutura visual dos módulos principais, sem alterar a lógica de negócio ou o fluxo de autenticação e dados.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, Nginx para servir o frontend, Docker Compose.

---

### Task 1: Definir tokens e base visual do app

**Files:**
- Modify: web/css/styles.css
- Modify: web/css/enhancements.css
- Modify: web/login.html
- Modify: web/index.html

- [ ] **Step 1: Definir o design system inicial**

  Adicionar tokens de cor, espaçamento, tipografia, bordas, sombras e estados visuais no início de `web/css/styles.css`:

```css
:root {
  --bg-page: #f5f3ff;
  --bg-surface: rgba(255, 255, 255, 0.82);
  --bg-elevated: #ffffff;
  --primary: #7c3aed;
  --primary-strong: #5b21b6;
  --accent: #ec4899;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --text-strong: #1f2937;
  --text-muted: #64748b;
  --border: rgba(148, 163, 184, 0.2);
  --shadow-soft: 0 12px 35px rgba(124, 58, 237, 0.12);
  --radius-lg: 22px;
  --radius-md: 16px;
  --radius-sm: 10px;
}
```

- [ ] **Step 2: Validar se a base visual atual está coerente**

  Executar uma revisão manual do conteúdo atual em `web/login.html` e `web/index.html` para descobrir pontos que fogem do design system: excesso de texto, contraste fraco, espaçamento inconsistente e visual genérico.

- [ ] **Step 3: Aplicar a base visual nos cards, botões e tabs**

  Atualizar `web/css/styles.css` para padronizar botões, cards, navegação e estados de hover/focus, garantindo que todos os componentes usem os mesmos tokens.

- [ ] **Step 4: Verificar a consistência visual em duas telas**

  Abrir a página de login e o dashboard para confirmar que as tipografias, espaçamentos e carregamento visual obedecem ao mesmo padrão.

- [ ] **Step 5: Commit**

```bash
git add web/css/styles.css web/css/enhancements.css web/login.html web/index.html
git commit -m "style: introduce visual design system"
```

### Task 2: Modernizar a página de login

**Files:**
- Modify: web/login.html
- Modify: web/css/enhancements.css

- [ ] **Step 1: Escrever a validação visual da tela de autenticação**

  Definir que a página deve apresentar um layout de duas colunas em desktop, card centralizado em mobile, foco visual no formulário e identidade visual da marca do casamento.

- [ ] **Step 2: Reestruturar o HTML da página de login**

  Em `web/login.html`, inserir bloco de branding com título, subtítulo e detalhe visual, mantendo o formulário de login acessível e compacto.

```html
<div class="login-shell">
  <aside class="login-hero">
    <span class="brand-badge">💍 Casamento</span>
    <h1>Gerencie os convites com calma</h1>
    <p>Centralize convidados, mensagens e envios em uma interface elegante e clara.</p>
  </aside>

  <section class="login-panel">
    <form id="login-form" class="login-form">...</form>
  </section>
</div>
```

- [ ] **Step 3: Aplicar estilos específicos de login**

  Em `web/css/enhancements.css`, ajustar o fundo, o cartão de autenticação, os inputs, a área de branding e os estados de erro/sucesso para reforçar o visual premium.

- [ ] **Step 4: Validar UX de login**

  Rodar a app com Docker e testar usando as credenciais padrão admin / admin123 para confirmar que o fluxo continua correto e a tela continua responsiva.

- [ ] **Step 5: Commit**

```bash
git add web/login.html web/css/enhancements.css
git commit -m "style: redesign login experience"
```

### Task 3: Reorganizar dashboard e navegação

**Files:**
- Modify: web/index.html
- Modify: web/css/styles.css
- Modify: web/js/app.js

- [ ] **Step 1: Mapear a hierarquia visual do dashboard**

  Identificar que a área mais importante é a navegação por tabs, os cards de métricas e as ações rápidas. Reorganizar a ordem para foco em informação crítica ao entrar na aplicação.

- [ ] **Step 2: Reestruturar a navegação**

  Atualizar `web/index.html` para usar tabs mais limpas, ícones consistentes, labels breves e modo de destaque do item ativo.

```html
<nav class="tabs" aria-label="Navegação principal">
  <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
  <button class="tab-btn" data-tab="guests">Convidados</button>
  <button class="tab-btn" data-tab="message">Mensagem</button>
  <button class="tab-btn" data-tab="groups">Grupos</button>
  <button class="tab-btn" data-tab="templates">Templates</button>
  <button class="tab-btn" data-tab="settings">Configurações</button>
</nav>
```

- [ ] **Step 3: Aprimorar os cards de resumo**

  Melhorar `web/css/styles.css` para que os cards tenham iluminação, ícones maiores, destacados por cor e melhor contrast. Ajustar labels e valores para leitura rápida.

- [ ] **Step 4: Atualizar comportamento de foco e hover**

  Revisar `web/js/app.js` para garantir que o estado ativo da aba, o tema e os botões de ação continuem funcionando após o redesign visual.

- [ ] **Step 5: Verificar dashboard em desktop e mobile**

  Testar layout em 1440px, 1024px e 375px para garantir respostas adequadas sem quebra visual.

- [ ] **Step 6: Commit**

```bash
git add web/index.html web/css/styles.css web/js/app.js
git commit -m "feat: redesign dashboard navigation"
```

### Task 4: Melhorar módulos de convidados, grupos e templates

**Files:**
- Modify: web/index.html
- Modify: web/css/styles.css
- Modify: web/css/enhancements.css

- [ ] **Step 1: Revisar a tabela de convidados**

  Ajustar a tabela para leitura mais clara, espaçamento de colunas, status com badges visuais e filtros mais elegantes em `web/index.html` e `web/css/styles.css`.

- [ ] **Step 2: Melhorar cards de grupos e templates**

  Padronizar estilos para blocos de lista, botões de ação e agrupamento sem perder clareza de informação.

- [ ] **Step 3: Melhorar modais e ações rápidas**

  Reaproveitar os estilos de cards, botões e inputs para manter consistência em editor de mensagem, tabela e formulários de cadastro.

- [ ] **Step 4: Validar fluxo completo**

  Testar importação de Excel, filtro por status, criação de template e edição de convidado para confirmar que o redesign não bloqueia as interações.

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/css/styles.css web/css/enhancements.css
git commit -m "style: polish guest and template modules"
```

### Task 5: Refinar responsividade e acessibilidade

**Files:**
- Modify: web/css/styles.css
- Modify: web/css/enhancements.css

- [ ] **Step 1: Adicionar breakpoints para tablets e celulares**

  Ajustar layouts para que a navegação, a tabela e os formulários tenham scroll horizontal ou conversão em blocos empilhados em telas menores.

```css
@media (max-width: 768px) {
  .tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-grid { grid-template-columns: 1fr; }
  .header-content { flex-direction: column; }
}
```

- [ ] **Step 2: Melhorar contraste e foco de teclado**

  Garantir que todos os botões, inputs e links tenham foco visível, contrastes compatíveis e acessibilidade adequada.

- [ ] **Step 3: Revisar microinterações**

  Aprimorar hover, transitions, estados de carregamento e feedback de ação sem deixar a interface pesada.

- [ ] **Step 4: Testar em diferentes larguras de tela**

  Verificar em 320px, 375px, 768px e 1440px para confirmar consistência.

- [ ] **Step 5: Commit**

```bash
git add web/css/styles.css web/css/enhancements.css
git commit -m "style: improve responsiveness and accessibility"
```

### Task 6: QA final, documentação e handoff

**Files:**
- Modify: README.md
- Modify: QUICK_START.md

- [ ] **Step 1: Executar revisão final dos fluxos críticos**

  Validar autenticação, dashboard, filtros, criação de convidados e visual de mensagem em um cenário real com Docker em execução.

- [ ] **Step 2: Atualizar documentação de uso**

  Incluir apontamentos visuais para o novo layout, como acesso no navegador, ações rápidas e observações deテーマ/tema claro/escuro.

- [ ] **Step 3: Registrar o resultado em resumo de entrega**

  Documentar em `README.md` ou `QUICK_START.md` que o frontend foi modernizado com foco em UX, responsividade e clareza visual.

- [ ] **Step 4: Verificar antes do encerramento**

  Confirmar que todas as telas continuam servidas via Nginx, que o login funciona e que o dashboard responde sem regressões de JavaScript.

- [ ] **Step 5: Commit**

```bash
git add README.md QUICK_START.md
git commit -m "docs: document refreshed frontend UX"
```

**Relevant files**
- web/index.html — estrutura principal do dashboard e navegação.
- web/login.html — experiência de autenticação e branding inicial.
- web/css/styles.css — design system base e componentes globais.
- web/css/enhancements.css — refinamentos visuais, responsividade e microinterações.
- web/js/app.js — possíveis ajustes de comportamento para manter a lógica e o visual alinhados.

**Verification**
1. Subir a aplicação frontend: docker-compose up -d --build frontend
2. Abrir a aplicação em http://localhost:3000/login.html
3. Fazer login com admin / admin123
4. Navegar entre Dashboard, Convidados, Mensagem, Grupos, Templates e Configurações
5. Validar o layout em desktop e móvel com browser em largura 375px, 768px e 1440px
6. Confirmar que os botões, filtros, tabs e modais continuam funcionando sem regressão

**Decisions**
- O redesign será visual e estrutural, sem alterar as APIs ou regras de negócio.
- A prioridade será manter a identidade elegante do casamento, com foco em clareza de leitura e menos ruído visual.
- O app será aprimorado em duas frentes: base visual consistente e refinamento dos módulos específicos.

**Further Considerations**
1. Definir se a identidade visual será mais premium minimalista ou mais romântica floral; a decisão muda detalhamento de cores e imagens.
2. Considerar a possibilidade de adotar uma paleta branca e rosa/roxo mais sofisticada para reforçar a proposta de casamento.
3. Avaliar se a melhoria deve incluir um ícone de marca ou introdução de hero visual no dashboard para dar mais personalidade ao produto.

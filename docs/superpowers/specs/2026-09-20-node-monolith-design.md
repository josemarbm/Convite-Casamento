# Monolito Node.js para Convites de Casamento

## Objetivo

Consolidar a API e a interface web em uma aplicação Node.js única, preservando o MySQL existente e a Evolution API como infraestrutura externa.

## Arquitetura

O Fastify será responsável por HTTP, autenticação, API, uploads e entrega dos arquivos estáticos do React compilado. O React/Vite substituirá as páginas HTML e scripts atuais, consumindo a API no mesmo domínio. Prisma será usado como camada de acesso ao MySQL, com introspecção inicial do schema existente antes de qualquer migração destrutiva.

Os módulos internos serão `auth`, `guests`, `groups`, `templates`, `sending`, `rsvp`, `settings`, `evolution`, `uploads` e `scheduler`. A comunicação com a Evolution API ficará isolada em um cliente de infraestrutura e suas credenciais nunca serão expostas ao navegador.

## Dados e compatibilidade

As tabelas existentes (`users`, `guests`, `groups`, `message_templates`, `scheduled_sends` e `settings`) serão preservadas. A API Node poderá usar contratos novos, mas os fluxos funcionais atuais devem continuar disponíveis: autenticação, CRUD de convidados/grupos/templates, importação e exportação Excel, RSVP público, envio direto, agendamento, configurações, upload e gerenciamento de instâncias Evolution.

## Entrega e operação

O novo serviço será empacotado em um container na porta `3000`, servindo frontend e API. MySQL e Evolution API continuarão nos containers de infraestrutura atuais. O serviço antigo Python/Nginx permanecerá intacto durante a migração e será removido do compose apenas depois de os testes e o smoke test Docker do monólito passarem.

## Validação

Serão adicionados testes unitários e de integração para health check, autenticação, RSVP, convidados e cliente Evolution, além da validação do build React e da imagem Docker. A inicialização contra um banco existente será verificada com Prisma sem executar alterações destrutivas.

## Direção visual do dashboard

### Thesis

O dashboard será uma sala de controle da cerimônia: uma ferramenta operacional com identidade editorial, não uma landing page nem uma pilha de cards decorativos. A primeira viewport deve mostrar o estado da lista e as próximas ações administrativas.

### Own-world

O sistema usará uma base clara de alto contraste, texto grafite, vinho profundo como âncora e terracota como ação principal, com verde, âmbar e vermelho apenas para estados semânticos. Títulos terão uma serif expressiva; dados, formulários e navegação usarão uma sans legível. Superfícies terão bordas discretas, cantos moderados e profundidade por sombra suave, sem glassmorphism excessivo ou gradientes como estrutura.

### Story

Ao entrar, a pessoa entende quantos convidados existem, quantos confirmaram e o que exige atenção. Ela pode adicionar, filtrar, editar, agrupar, importar, exportar e enviar convites sem sair do contexto. Configurações, templates e instâncias ficam em áreas navegáveis e não competem com a lista principal.

### First viewport

No desktop, uma navegação lateral fixa apresenta o produto e as áreas Dashboard, Convidados, Grupos, Mensagens e Configurações. O conteúdo começa com título, status operacional e CTA de adicionar convidado, seguido pelos indicadores e pela lista atual. No mobile, a navegação vira uma barra superior compacta e as ações se empilham sem overflow horizontal.

### Form

A composição escolhida é um console editorial responsivo, derivado da necessidade de operar dados repetidamente: shell de aplicação, navegação explícita, seções amplas e listas densas. O estado ativo, loading, erro, vazio, foco e sucesso têm tratamento próprio. A assinatura da experiência é transformar a lista de convidados em um centro de decisão, com ações primárias visíveis e feedback inline.

### Finish

unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
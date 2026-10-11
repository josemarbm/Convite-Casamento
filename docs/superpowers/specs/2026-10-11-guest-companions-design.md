# Acompanhantes por Convite

## Objetivo

Permitir que cada convidado principal tenha uma quantidade máxima de acompanhantes e uma lista de nomes associada ao seu convite. O convidado principal continua sendo o único contato WhatsApp e dono do token RSVP.

## Decisões do Produto

- Acompanhantes são registros vinculados ao convidado principal, não registros independentes de `Guest`.
- O limite é inteiro não negativo e começa em zero. Um convidado só pode ter acompanhantes quando o administrador define um limite maior que zero.
- O administrador pode pré-cadastrar ou editar os nomes, desde que a quantidade não exceda o limite.
- No RSVP, o convidado principal pode completar, remover ou ajustar os nomes dos acompanhantes que irão. O envio substitui a lista de nomes de acompanhantes participantes.
- O RSVP continua tendo uma única resposta por convite principal. Acompanhantes não têm confirmação individual nem recebem convites próprios.
- Os nomes podem ser ajustados pelo convidado antes do envio inicial do RSVP. Depois do envio, o link permanece bloqueado conforme o fluxo atual; somente a administração pode corrigir a lista.
- O limite é validado tanto na interface quanto no servidor. Uma tentativa de salvar mais nomes que o limite é rejeitada sem truncar a lista.
- Se o convidado principal recusar a presença, acompanhantes não são contabilizados como presentes. A lista de nomes pode ser mantida para que uma resposta posterior possa ser atualizada sem redigitação.
- Métricas existentes de convites continuam contando convidados principais. A visão geral também exibirá pessoas confirmadas: convidados principais confirmados mais os nomes de acompanhantes desses convidados.
- A contagem de convidados dos grupos permanece baseada nos convidados principais; não será alterada para contar acompanhantes nesta entrega.
- A importação/exportação Excel inclui `Limite de acompanhantes` e `Acompanhantes`; vários nomes usam `;` como separador. Planilhas antigas sem essas colunas continuam válidas e recebem limite zero/lista vazia.
- Linhas com limite ausente usam zero. Limite inválido (não inteiro ou negativo) ou mais nomes que o limite fazem a linha inteira ser ignorada e contada como ignorada.
- Status de convite e resposta RSVP continuam informativos na planilha exportada; os valores dessas colunas não sobrescrevem estados durante a importação.
- Telefones duplicados continuam sendo rejeitados segundo a validação existente.

## Modelo e Persistência

Adicionar a `Guest` um campo `companionLimit` inteiro com valor padrão zero. Criar uma entidade `GuestCompanion` com identificador, `guestId` obrigatório e nome, relacionada ao convidado principal. O acesso a acompanhantes deve sempre ser validado pelo escopo do evento do convidado pai.

Alterações de nomes feitas pela administração ou pelo RSVP devem ser aplicadas como uma substituição atômica da lista associada ao convidado. O servidor valida o limite antes de gravar; uma falha não deve deixar uma lista parcialmente atualizada. Excluir um convidado exclui seus acompanhantes relacionados.

## Fluxos

### Administração de convidados

O formulário de criação/edição de convidado permite definir o limite e manter nomes pré-cadastrados. A interface oferece a quantidade de campos de nome necessária e impede salvar uma lista acima do limite. Se o limite for reduzido abaixo da quantidade de nomes existente, a atualização é recusada até que nomes sejam removidos ou o limite aumentado.

### RSVP público

A resposta do RSVP devolve o limite e os nomes atuais. Quando o convite pode levar acompanhantes, o formulário permite incluir, editar e remover nomes até o limite. A submissão envia a resposta do convidado principal e a lista final de acompanhantes. O endpoint verifica o token, valida o tamanho da lista e atualiza os dados em uma transação. Não é necessário nem permitido expor operações de acompanhantes de outro convite.

### Métricas do evento

Manter totais atuais de convites principais, confirmados, aguardando e recusados. Adicionar o total de pessoas confirmadas, somando um por convidado principal confirmado e um por cada acompanhante associado a um convidado confirmado.

### Planilhas

A exportação adiciona duas colunas após os dados básicos: `Limite de acompanhantes` e `Acompanhantes`. Os nomes usam `;` e nomes vazios são omitidos. A importação aceita esses campos opcionalmente, preserva compatibilidade com planilhas antigas e associa os dados somente ao criar novos convidados; duplicatas continuam ignoradas e não são atualizadas pela planilha.

## Tratamento de Erros e Validação

- Limites ausentes usam zero; limites negativos, fracionários, não numéricos ou acima de `2.147.483.647` (máximo de `Int` assinado de 32 bits) são inválidos.
- Listas acima do limite são recusadas em criação/edição e no RSVP. Nenhum nome é descartado silenciosamente.
- Na importação, uma linha com limite inválido ou quantidade de nomes acima do limite é ignorada integralmente e incluída no contador `skipped`.
- Nomes são aparados; entradas vazias não criam acompanhantes. Cada nome pode ter até 200 caracteres; na importação, uma linha com nome de acompanhante maior que esse limite é ignorada integralmente.
- Erros de persistência no RSVP preservam a resposta e os acompanhantes anteriores por uso de transação.

## Compatibilidade e Segurança

- Convidados existentes recebem limite zero e nenhuma linha de acompanhante; não passam a poder levar acompanhantes automaticamente.
- Tokens RSVP existentes continuam válidos e apontam para o mesmo convidado principal.
- Nenhum telefone ou token é criado para acompanhantes.
- Consultas de administração, RSVP e métricas carregam acompanhantes apenas através de convidados do evento ativo ou do token válido.
- A API mantém os campos e comportamentos atuais para clientes que não enviam dados de acompanhantes.

## Testes e Verificação

- Testes de schema cobrem campo padrão, relação e exclusão em cascata.
- Testes de rotas de convidados cobrem limite zero, limite válido, lista acima do limite, alteração de limite abaixo dos nomes existentes e escopo por evento.
- Testes de RSVP cobrem leitura dos acompanhantes, inclusão/edição/remoção, aceitação no limite, rejeição acima do limite, recusa do convidado principal e preservação atômica em falha.
- Testes de métricas verificam que convidados principais permanecem contados separadamente e pessoas confirmadas incluem acompanhantes somente de convidados confirmados.
- Testes de Excel cobrem planilhas antigas, importação/exportação de nomes e limite, telefone duplicado, limite inválido e linha inteira ignorada quando os acompanhantes excedem o limite.
- Executar testes focados, `npm run typecheck` e `npm test -- --run`. Validar a atualização do Prisma com o mecanismo de schema/migração adotado pelo projeto antes de aplicar em produção.

## Fora de Escopo

- Convites WhatsApp, tokens RSVP ou respostas independentes por acompanhante.
- Contabilizar acompanhantes como convidados nos totais de grupos.
- Atualizar convidados existentes a partir de uma planilha de importação.
- Limite compartilhado entre convidados ou por grupo/evento.

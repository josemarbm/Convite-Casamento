# Frontend React

O frontend atual está em `web-react/` e é servido pelo mesmo processo Fastify da API. A antiga implementação em `web/` foi removida.

## Fluxo inicial

1. Acesse `http://localhost:3000/`.
2. Faça login com um usuário válido.
3. Crie ou selecione um evento.
4. Escolha a imagem do convite — obrigatória para eventos novos e para migrar eventos antigos sem imagem.
5. Adicione convidados manualmente ou importe uma planilha.

## Eventos e imagens

Cada evento possui convidados, grupos, templates, RSVP e agendamentos isolados. A imagem é enviada para `/api/images/stage` antes da criação e associada ao evento pelo campo `image_path`.

Eventos antigos sem imagem podem ser editados no painel. O formulário bloqueia o salvamento até que uma imagem PNG, JPG, GIF ou WEBP seja escolhida.

## Lista de convidados

A tela oferece busca por nome ou telefone, filtros por estado do convite e resposta RSVP, paginação de 20 registros, importação/exportação em Excel, edição, exclusão e reenvio individual.

## RSVP público

Os links aceitos são `/rsvp/<token>` e `/rsvp.html?token=<token>`. O convite exibe a imagem do evento, data, local, anfitriões, acompanhantes permitidos e as ações de confirmação ou recusa.

## Desenvolvimento

```bash
npm install
npm run dev
npm run typecheck
npm test -- --run
npm run build
```

O CSS principal está em `web-react/src/styles.css`. Os componentes ficam em `web-react/src/components/` e as páginas em `web-react/src/pages/`.

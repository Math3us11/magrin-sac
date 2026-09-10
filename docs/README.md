# Documentação do Sistema de Agendamento

## Estado

Base documental ativa. O scaffold do frontend foi criado; o backend ainda não
foi iniciado.

Ainda não há contrato final de API nem modelo físico aprovado.
Os documentos distinguem:

- **decisões aceitas**, vindas do alinhamento técnico;
- **propostas iniciais**, que orientam o primeiro desenho;
- **pendências**, que precisam de validação institucional.

## Ordem de leitura

1. `PRODUCT_SCOPE.md` — problema, atores, MVP e limites.
2. `REQUIREMENTS.md` — requisitos e critérios de aceite priorizados.
3. `ARCHITECTURE.md` — stack, módulos e dependências permitidas.
4. `DOMAIN_MODEL.md` — entidades, relacionamentos e invariantes.
5. `API_CONTRACT.md` — primeira proposta de recursos e semântica HTTP.
6. `DECISIONS.md` — decisões arquiteturais aceitas.
7. `OPEN_QUESTIONS.md` — definições que ainda não podem ser presumidas.
8. `ROADMAP.md` — sequência sugerida para iniciar a implementação.
9. `CODEX_VSCODE.md` — preparação e verificação do Codex no VS Code.

## Fontes consolidadas

Esta base foi produzida a partir dos documentos fornecidos em 29 de agosto de
2026:

- `Sistema+de+Agendamento.docx`: levantamento amplo de escopo, casos de uso,
  classes, requisitos e ambiguidades;
- `Alinhamento_Tecnico_Sistema_Agendamento.docx`: decisões resumidas de stack e
  arquitetura;
- `ALINHAMENTO_TECNICO_SISTEMA_AGENDAMENTO.md`: consolidação técnica voltada ao
  desenvolvimento.

O levantamento amplo funciona como backlog e fonte de rastreabilidade. O
alinhamento técnico posterior define a base arquitetural atual. Itens ainda
marcados como ambíguos continuam pendentes, mesmo quando aparecem como exemplos
ou recomendações nos documentos-fonte.

## Regra de precedência

Em caso de conflito:

1. uma decisão nova explicitamente aprovada e registrada em `DECISIONS.md`;
2. o alinhamento técnico consolidado;
3. os requisitos priorizados para o MVP;
4. o levantamento amplo como backlog;
5. uma pendência em `OPEN_QUESTIONS.md`, que nunca deve ser decidida por
   suposição.

## Manutenção

Os documentos devem refletir o sistema real. Ao iniciar o scaffold, registrar a
estrutura criada em `ARCHITECTURE.md`, completar os comandos de desenvolvimento
no README da raiz e atualizar o estado das fases em `ROADMAP.md`.

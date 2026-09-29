# Base visual do frontend

## Estado

Base inicial aprovada para o scaffold. Este documento define a identidade e os
tokens que devem orientar as próximas telas; ele não fecha o design definitivo
dos fluxos.

## Cores institucionais

| Papel | Cor | Uso principal |
|---|---|---|
| Primária | `#ce0055` | identidade Afya, ações e destaques |
| Secundária | `#0054b2` | informação, apoio visual e foco |
| Terciária | `#ffffff` | contraste e superfícies claras |

Esses valores são as cores-base da marca. Variações de contraste para os temas
claro e escuro ficam centralizadas em `frontend/src/assets/main.css`.

## Tokens semânticos

Componentes não devem repetir hexadecimais. Devem usar os tokens expostos ao
Tailwind, conforme a responsabilidade visual:

- superfícies: `canvas`, `surface` e `surface-subtle`;
- conteúdo: `content` e `content-muted`;
- estrutura: `outline` e `focus`;
- marca: `brand-primary`, `brand-primary-soft`, `brand-secondary` e
  `brand-secondary-soft`;
- contraste: `on-primary` e `on-secondary`;
- estados: `status-success`, `status-warning`, `status-danger` e suas versões
  `-soft`.

O tema claro é o padrão. O tema escuro é aplicado por
`data-theme="dark"` no elemento `html`. O composable `useTheme` é a única
fronteira para alternar e persistir a preferência no navegador.

## Logos

Os arquivos oficiais ficam em `frontend/public`:

- `logo_extensa.png`: versão vermelha com símbolo e nome, preferida em
  superfícies claras com espaço horizontal;
- `logo_vermelha.png`: símbolo vermelho para contextos compactos e fundos
  claros;
- `logo_branca.png`: símbolo branco para superfícies escuras.

As imagens devem preservar proporção, área transparente e cores originais. Não
aplicar filtros CSS para recolorir a marca. Toda imagem informativa deve possuir
texto alternativo; quando a identificação já estiver escrita ao lado, a imagem
pode ser decorativa com `alt=""`.

## Tela de acesso

O primeiro fluxo usa composição dividida em telas amplas e empilhada em telas
estreitas:

- painel institucional com gradiente, grid, órbitas e mensagem de produto;
- linguagem institucional abrangente, sem limitar o acesso a um único curso;
- formulário sobre o canvas do tema, sem fotografia externa;
- destaque tipográfico para criar personalidade sem comprometer legibilidade;
- alternância de tema disponível antes da autenticação;
- informação explícita sobre provisionamento interno, sem ação de cadastro
  público enquanto a validação de alunos estiver pendente.

Elementos decorativos não recebem foco nem substituem mensagens textuais. O
formulário mantém labels visíveis, autocomplete apropriado, erro com `role` e
estado textual durante o envio.

Em dispositivos que permitem movimento, o grid se desloca lentamente e as
órbitas giram em sentidos e durações diferentes. Os pontos das órbitas também
recebem uma pulsação suave. As animações são decorativas, não interferem no
conteúdo e só são habilitadas quando prefers-reduced-motion permite.

A palavra de ênfase do título usa um gradiente baseado nas cores institucionais
e uma passagem luminosa lenta. O brilho deve permanecer localizado, sem reduzir
a legibilidade do restante da mensagem.

Os três benefícios do painel são apresentados como uma trilha conectada, com
marcadores circulares e ícones Lucide. A linha compartilha a linguagem das
órbitas e evita o aspecto de três cards genéricos desconectados do fundo.
Em dispositivos com mouse, cada item responde ao hover com halo, contraste e
elevação do marcador, sem usar cursor de ação nem sugerir que seja clicável.

## Componentes básicos

Os controles reutilizáveis ficam em frontend/src/components/basic. O primeiro
conjunto contém:

- AppForm: cria o contexto Vee Validate, recebe um schema Yup, impede envio
  inválido e direciona o foco ao primeiro campo com erro;
- AppInput: reúne label, campo, ajuda, mensagem de erro, atributos ARIA,
  prefixo, sufixo e exibição opcional de senha;
- AppButton: padroniza variantes, largura, estado desabilitado e carregamento.

Schemas de cada fluxo ficam em frontend/src/validations. Mensagens e regras não
devem ser declaradas diretamente na view. A regra inicial para criação ou troca
de senha exige ao menos oito caracteres. O login valida apenas presença e
limites técnicos, pois autenticar uma credencial existente não deve aplicar
retroativamente uma política de criação.

Validações no frontend orientam a pessoa usuária, mas nunca substituem as
validações equivalentes no backend quando o dado for persistido.

## Ícones

A interface usa o componente Icon do pacote Iconify Vue com a família Lucide.
Os dados selecionados são importados localmente e reexportados por
frontend/src/icons/index.ts. Não usar nomes de ícones que precisem consultar a
API pública do Iconify durante a execução.

Ícones decorativos devem usar aria-hidden. Botões representados somente por
ícone precisam manter aria-label e title compreensíveis. Prefira o catálogo
compartilhado a SVGs manuais; logos institucionais continuam sendo tratadas
como imagens oficiais da marca.

## Acessibilidade e manutenção

- validar contraste de texto, controles, bordas relevantes e estados de foco;
- nunca comunicar estado somente por cor;
- manter foco visível nos dois temas;
- respeitar `prefers-reduced-motion`;
- testar novas telas nos temas claro e escuro;
- criar um novo token quando surgir uma responsabilidade visual recorrente, em
  vez de espalhar um novo valor pelos componentes.

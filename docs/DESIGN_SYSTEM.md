# Base visual do frontend

## Estado

Base inicial aprovada para o scaffold. Este documento define a identidade e os
tokens que devem orientar as próximas telas; ele não fecha o design definitivo
dos fluxos.

## Cores institucionais

| Papel      | Cor       | Uso principal                      |
| ---------- | --------- | ---------------------------------- |
| Primária   | `#ce0055` | identidade Afya, ações e destaques |
| Secundária | `#0054b2` | informação, apoio visual e foco    |
| Terciária  | `#ffffff` | contraste e superfícies claras     |

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
- estados: `status-success`, `status-info`, `status-warning`, `status-danger` e
  suas versões `-soft`.

O `AppNotify` apresenta feedback global nos quatro estados, sem depender apenas
de cor: cada notificação combina ícone, título e mensagem textual, pode ser
fechada pelo usuário e desaparece automaticamente. Erros usam `role="alert"`;
os demais estados usam `role="status"` em uma região viva.

O `AppTable` mantém título e cabeçalhos visíveis, rolagem horizontal focável em
telas estreitas e mensagens textuais distintas para carregamento, ausência de
registros e erro. Larguras são declaradas pela configuração de colunas; conteúdo
específico, como perfil, situação e ações, usa slots sem acoplar a tabela ao
domínio. Busca, filtros e paginação são controlados pela tela consumidora, o que
permite consultar o servidor sem duplicar regras dentro do componente visual.
Sua composição separa header com título e total, subheader com busca e filtros,
body tabular e footer com quantidade por página e paginação. Quando declarada
com o valor `actions`, a coluna de ações é apresentada antes das colunas de
dados. O body possui alturas mínima e máxima configuráveis, rolagem interna e
cabeçalho fixo, evitando que a página salte conforme a quantidade de resultados.
A busca textual só é aplicada ao confirmar o formulário pelo botão `Filtrar` ou
pela tecla Enter; digitar no campo não deve iniciar consultas ao servidor.

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
  prefixo, sufixo, exibição opcional de senha e máscaras simples ou dinâmicas
  com Maska;
- AppSelect: padroniza seleções simples com rótulo, ajuda, erro acessível,
  indicador visual e integração tanto por `v-model` quanto pelo contexto do
  Vee Validate;
- AppMultiSelect: apresenta opções em dropdown com seleção única limitada ou
  múltipla, resumo da escolha e integração com o Vee Validate;
- AppButton: padroniza variantes, largura, estado desabilitado e carregamento;
- AppLoading: apresenta um overlay global de carregamento controlado pela prop
  `active`, com descrição e ícone opcionais. A instância única fica no `App.vue`
  e recebe o estado da store de loading;
- AppCalendar: apresenta eventos datados em uma grade mensal navegável, destaca
  o dia atual, resume a quantidade de horários e detalha a agenda do dia
  selecionado sem assumir regras específicas de disponibilidade. O mês ocupa o
  centro das setas de navegação; a ação `Ir para hoje` permanece separada, e o
  dia atual usa tratamento visual diferente do contador de eventos. A grade
  elimina semanas excedentes, reduz sua densidade conforme a altura disponível
  e preserva dia e contador quando o contêiner não comporta os resumos internos;
- AppConfirmDialog: concentra confirmações reutilizáveis com título, descrição,
  tom da ação, loading, bloqueio do fundo, retorno de foco e fechamento por
  botão, backdrop ou tecla Escape.

Schemas de cada fluxo ficam em frontend/src/validations. Mensagens e regras não
devem ser declaradas diretamente na view. A regra inicial para criação ou troca
de senha exige ao menos oito caracteres. O login valida apenas presença e
limites técnicos, pois autenticar uma credencial existente não deve aplicar
retroativamente uma política de criação.

Validações no frontend orientam a pessoa usuária, mas nunca substituem as
validações equivalentes no backend quando o dado for persistido.

### Modos de carregamento

- o `AppLoading` deve ser usado para operações assíncronas bloqueantes que não
  permitem interação segura com o restante da tela;
- estados locais, como skeleton de tabela ou carregamento de opções, permanecem
  no componente responsável para manter o contexto visual;
- ações pontuais mantêm o loading no próprio botão para impedir reenvios.

A store global usa `start()` e `stop(id)` em vez de expor um único booleano. O
identificador devolvido por `start()` deve ser encerrado no `finally`, garantindo
que requisições simultâneas não ocultem o overlay umas das outras. A operação
iniciada mais recentemente define a descrição e o ícone apresentados.

Máscaras são apenas uma ajuda de digitação e apresentação. CPF, telefone e
outros valores devem ser normalizados antes do envio e validados novamente no
backend. Views não usam a diretiva do Maska diretamente; elas configuram a prop
`mask` do `AppInput`.

## Shell autenticado

As páginas autenticadas compartilham um shell em duas faixas: header ocupando
toda a largura e região principal dividida entre sidebar e conteúdo. No desktop,
a sidebar fica abaixo do header e pode alternar entre o estado expandido e uma
faixa compacta de ícones; a preferência é mantida no navegador. Sua altura é
limitada ao espaço visível abaixo do header e a área de navegação possui rolagem
própria, sem acompanhar a altura de páginas extensas. No mobile, ela funciona
como drawer sobreposto, fecha por botão, backdrop, tecla Escape ou mudança de
rota e também mantém a navegação rolável dentro da viewport.

Os itens são carregados de `GET /api/me/navigation` após o login e ao restaurar
uma sessão. Estados de carregamento e erro aparecem dentro da própria sidebar.
Chaves de ícone recebidas da API são resolvidas somente pelo catálogo local; uma
chave desconhecida nunca provoca consulta externa nem injeta marcação.

O header concentra a marca, contexto da página, tema, identidade resumida e
logout. Ele usa `logo_vermelha.png` no tema claro e `logo_branca.png` no tema
escuro. A sidebar fica dedicada à navegação e aos controles necessários para
abri-la, fechá-la ou minimizá-la.

## Login e primeiro acesso

A `LoginView` mantém autenticação e primeiro acesso na mesma tela. Depois de uma
autenticação cujo usuário possua `mustChangePassword = true`, o formulário de
e-mail e senha é substituído pela etapa de nova senha e confirmação. A etapa
explica que a senha temporária será descartada, usa `autocomplete="new-password"`
nos dois campos e apresenta validação textual, foco no primeiro erro e loading
na ação.

Após o sucesso, a interface volta ao formulário inicial com uma mensagem de
confirmação. A pessoa entra novamente com a senha criada; a aplicação não tenta
reaproveitar silenciosamente a sessão temporária.

## Página inicial autenticada

A primeira versão da index é um protótipo visual para validar hierarquia e
densidade. Ela reúne saudação conforme o perfil, campanha institucional,
atalhos permitidos, próximos atendimentos e avisos. Os atalhos já respeitam as
permissões carregadas pelo servidor.

Campanhas, atendimentos e avisos exibidos nesta etapa são dados ilustrativos e
devem permanecer identificados como tal. Eles não representam registros reais
nem definem contratos de API. A integração será feita por blocos quando cada
fonte de dados e regra de personalização estiver consolidada.

## Administração de usuários

A tela inicial de usuários separa a ação principal da área de consulta.
O botão `Cadastrar usuário` abre uma rota própria, protegida pela permissão
`users.manage`. A listagem consulta o backend com busca confirmada por nome ou
e-mail, filtros de perfil e situação e paginação. As ações de visualizar e
editar abrem a mesma view: no modo de consulta todos os campos ficam
desabilitados; no modo de edição, dados pessoais, perfil, situação e vínculos
acadêmicos seguem as regras condicionais do cadastro. Dados de conta, como datas
de criação e atualização e situação do primeiro acesso, aparecem apenas como
informação.

O cadastro usa um wizard fixo de quatro etapas que preserva os dados ao avançar
ou voltar e valida cada etapa antes da progressão: dados pessoais, perfil de
acesso, configuração específica e revisão. A segunda etapa define tipo, situação
inicial e senha temporária, sem voltar a exibir a credencial na revisão. Na
terceira etapa, o aluno escolhe um curso, seu período atual e uma ou mais
matérias desse curso. O professor escolhe um ou mais cursos e as respectivas
matérias, sem período. Administradores recebem uma etapa intermediária
informativa enquanto a matriz granular de permissões não estiver definida.

As opções acadêmicas são carregadas dos catálogos do backend. Cada escolha de
matéria representa a combinação curso-matéria e a lista é filtrada somente pelos
cursos selecionados; o período atual do aluno não altera essa lista. Cadastro e
edição persistem os dados por endpoints administrativos protegidos. Senhas não
são exibidas nem editadas pela manutenção geral de usuários.

A coluna de ações da listagem também permite excluir um cadastro indevido. A
ação abre o `AppConfirmDialog` em tom de perigo, identifica o usuário afetado e
exige a senha atual do administrador. O campo recebe foco inicial, permite
mostrar ou ocultar a senha e apresenta erros sem fechar o modal. A ação fica
indisponível para a própria conta autenticada. Após o sucesso, a listagem é
recarregada e retorna à página anterior quando o registro removido era o único
item da página atual.

## Agenda do professor

A rota `/professor/agenda` usa a view `professor/AvailabilityView.vue` e exige a
permissão `availability.manage.own`. O acesso aparece no menu como
`Agenda > Disponibilidades` e também pode aparecer entre os atalhos da página
inicial quando a permissão estiver presente.

O primeiro recorte apresenta cabeçalho, resumo dos estados disponível,
reservado e bloqueado e um estado vazio explícito, sem simular dados de agenda.
O botão de inclusão abre um `AppModal` grande no qual o professor informa data,
início, término e uma ou ambas as modalidades. O formulário usa
`America/Porto_Velho`, mantém início e fim livres, exige término posterior ao
início e permite preparar vários horários para revisão. Sala e link não são
solicitados. A publicação envia o lote completo e só limpa os rascunhos depois
da confirmação do backend. Em conflito, o modal permanece aberto com os dados
para correção. A listagem mensal e os indicadores exibem somente registros
retornados pela API, sem dados simulados. O calendário inicia na primeira
disponibilidade retornada, permite navegar entre meses e apresenta abaixo da
grade os horários completos do dia selecionado; em telas estreitas, a grade
preserva sua leitura com rolagem horizontal.

O modal oferece os modos `Data específica` e `Dias da semana`. O modo semanal
usa uma semana navegável e exibe a data concreta em cada botão de dia. Cada
janela é incluída no mesmo formulário por `Adicionar outra janela`. Ao enviar,
somente os dias marcados são combinados com as janelas preenchidas e geram itens
datados na lista de revisão. Dias marcados usam borda, fundo, cor e ícone de
confirmação distintos dos dias neutros. Assim é possível compor, por exemplo,
`08–14` e `14–18` antes da geração, sem repetir o cadastro. Não existe regra
recorrente oculta depois da publicação.

## Modais

`AppModal` é a base genérica para diálogos com conteúdo arbitrário. Ele oferece
título, descrição opcional, tamanhos predefinidos, área de conteúdo rolável,
rodapé por slot, bloqueio do scroll da página, fechamento por botão, fundo ou
Escape, contenção de foco e devolução do foco ao elemento que o abriu. Fluxos
com regras próprias devem compor essa base ou permanecer em componentes
especializados, sem concentrar lógica de domínio no componente básico.

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

# Frontend do Sistema de Agendamento

Aplicação Vue responsável pela interface do sistema de agendamento da
coordenação.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Requisitos

- Node.js 24;
- pnpm 11.

Na raiz do repositório, `nvm use` seleciona a versão definida em `.nvmrc`.

## Instalação

```sh
pnpm install
```

## Desenvolvimento

```sh
pnpm dev
```

## Typecheck e build

```sh
pnpm build
```

## Testes unitários

```sh
pnpm test:unit
```

## Lint

```sh
pnpm lint
```

## Formatação

```sh
pnpm format
```

## Configuração

Copie `.env.example` para `.env.local` apenas quando precisar alterar a origem
da API. O padrão `/api` funciona com um proxy de mesma origem.

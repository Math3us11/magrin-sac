// Captura as telas usadas como figuras do artigo (docs/ARTICLE_DOSSIER.md).
//
// Requer o sistema em execução com os dados de demonstração (docs/DEMO.md) e o
// pacote `playwright` instalado fora do workspace, para não alterar as
// dependências do monorepo. Variáveis:
//
// - CAPTURE_PASSWORD: senha das contas @demo.test (padrão: DEMO_SEED_PASSWORD);
// - CAPTURE_BASE_URL: endereço do frontend (padrão: http://localhost:5173);
// - CAPTURE_OUTPUT: pasta das imagens (padrão: .article-screenshots);
// - CAPTURE_ONLY: ids separados por vírgula, por exemplo "F01,F12";
// - CAPTURE_CONFIRM: "1" autoriza as capturas que gravam dados: confirma um
//   agendamento real (F07) e, se a trilha estiver vazia, altera e restaura um
//   parâmetro para a auditoria (F27);
// - CAPTURE_CHANNEL: navegador instalado, como "chrome" ou "msedge" (opcional);
// - PLAYWRIGHT_DIR: pasta em que o `playwright` foi instalado.
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(
  path.resolve(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "noop.js"),
);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Pacote playwright não encontrado. Defina PLAYWRIGHT_DIR (docs/ARTICLE_DOSSIER.md).",
  );
  process.exit(1);
}

const baseUrl = (
  process.env.CAPTURE_BASE_URL ?? "http://localhost:5173"
).replace(/\/$/, "");
const password = process.env.CAPTURE_PASSWORD ?? process.env.DEMO_SEED_PASSWORD;
const outputDir = path.resolve(
  rootDir,
  process.env.CAPTURE_OUTPUT ?? ".article-screenshots",
);
const only = new Set(
  (process.env.CAPTURE_ONLY ?? "")
    .split(",")
    .map((id) => id.trim().toUpperCase())
    .filter(Boolean),
);
const allowWrites = process.env.CAPTURE_CONFIRM === "1";

if (!password) {
  console.error("Defina CAPTURE_PASSWORD com a senha das contas @demo.test.");
  process.exit(1);
}

const accounts = {
  admin: "coordenacao@demo.test",
  ana: "ana.souza@demo.test",
  helena: "helena.duarte@demo.test",
  ricardo: "ricardo.lima@demo.test",
};

const desktop = { width: 1440, height: 900 };
const mobile = { width: 375, height: 812 };
const results = [];

function institutionToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Porto_Velho",
  }).format(new Date());
}

function institutionDateOffset(days) {
  const date = new Date(`${institutionToday()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page
    .locator('[data-testid="app-loading"]')
    .waitFor({ state: "hidden", timeout: 8000 })
    .catch(() => {});
  // O botão do Vue Devtools só existe no servidor de desenvolvimento.
  await page.addStyleTag({
    content: "#__vue-devtools-container__ { display: none !important; }",
  });
  await page.waitForTimeout(400);
}

async function openContext(browser, { dark = false, viewport = desktop } = {}) {
  const context = await browser.newContext({ locale: "pt-BR", viewport });
  await context.addInitScript(
    (theme) => {
      try {
        window.localStorage.setItem("magrin-sac-theme", theme);
      } catch {
        // Sem armazenamento o tema claro permanece.
      }
    },
    dark ? "dark" : "light",
  );
  return context;
}

async function login(page, email) {
  await page.goto(`${baseUrl}/login`);
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  await page.getByRole("button", { name: "Entrar no sistema" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15000,
  });
  await settle(page);
}

async function visit(page, route) {
  await page.goto(`${baseUrl}${route}`);
  await settle(page);
}

async function dismissNotifications(page) {
  await page.addStyleTag({
    content:
      '[aria-label="Notificações do sistema"] { display: none !important; }',
  });
}

// O seed não grava auditoria. Com CAPTURE_CONFIRM=1, altera e restaura o prazo
// de cancelamento pela tela, como faria a coordenação, para a trilha ter o que
// mostrar. Os dois eventos ficam registrados.
async function prepareAuditEvidence(page) {
  await visit(page, "/administracao/parametros");
  const parameter = page.locator('[data-testid^="parameter-"]').first();
  const valueInput = parameter.getByRole("spinbutton", {
    name: "Novo valor (minutos)",
  });
  const originalValue = Number(await valueInput.inputValue());
  const temporaryValue = originalValue === 0 ? 1 : originalValue - 1;

  await valueInput.fill(String(temporaryValue));
  await parameter
    .getByRole("textbox", { name: "Motivo da alteração" })
    .fill("Prazo reduzido durante a semana de provas.");
  await parameter.getByRole("button", { name: "Salvar alteração" }).click();
  await parameter
    .getByTestId("parameter-current-value")
    .filter({ hasText: `${temporaryValue} minutos` })
    .waitFor();

  const refreshedParameter = page
    .locator('[data-testid^="parameter-"]')
    .first();
  await refreshedParameter
    .getByRole("spinbutton", { name: "Novo valor (minutos)" })
    .fill(String(originalValue));
  await refreshedParameter
    .getByRole("textbox", { name: "Motivo da alteração" })
    .fill("Prazo retornado ao valor aprovado pela coordenação.");
  await refreshedParameter
    .getByRole("button", { name: "Salvar alteração" })
    .click();
  await refreshedParameter
    .getByTestId("parameter-current-value")
    .filter({ hasText: `${originalValue} minutos` })
    .waitFor();
  await dismissNotifications(page);
}

// Somente os dias do mês exibido: clicar em um dia de borda troca o mês.
async function calendarDates(page) {
  const days = await page
    .locator('[data-testid^="calendar-day-2"]')
    .evaluateAll((items) => items.map((item) => item.dataset.calendarDate));
  const month = days[Math.floor(days.length / 2)]?.slice(0, 7);
  const ids = await page
    .locator('[data-testid^="calendar-count-2"]')
    .evaluateAll((items) => items.map((item) => item.dataset.testid));
  return ids
    .map((id) => id.replace("calendar-count-", ""))
    .filter((date) => date.startsWith(month));
}

// Percorre os dias com eventos do calendário, a partir de hoje, até encontrar o
// elemento esperado. Visita também o mês vizinho quando o atual não tem o caso.
async function findCalendarDay(page, direction, isFound) {
  const today = institutionToday();

  for (let month = 0; month < 2; month += 1) {
    const dates = (await calendarDates(page))
      .filter((date) => (direction === "past" ? date < today : date >= today))
      .sort();
    if (direction === "past") dates.reverse();

    for (const date of dates) {
      await page.getByTestId(`calendar-day-${date}`).click();
      await page.waitForTimeout(300);
      if (await isFound()) return date;
    }

    await page
      .getByTestId(
        direction === "past"
          ? "calendar-previous-month"
          : "calendar-next-month",
      )
      .click();
    await settle(page);
  }

  throw new Error("Nenhum dia do calendário com o caso esperado.");
}

function enabledButton(page, name) {
  return page
    .getByRole("button", { name, exact: true })
    .and(page.locator(":enabled"))
    .first();
}

async function isVisible(locator) {
  return locator.isVisible().catch(() => false);
}

async function shot(
  page,
  id,
  file,
  title,
  { fullPage = true, target, until } = {},
) {
  const filePath = path.join(outputDir, file);
  if (target) await target.screenshot({ path: filePath });
  else if (until) {
    // Corta a página logo abaixo do elemento, para caber numa página do artigo.
    const box = await until.boundingBox();
    const width = page.viewportSize().width;
    await page.screenshot({
      clip: { height: box.y + box.height + 24, width, x: 0, y: 0 },
      fullPage: true,
      path: filePath,
    });
  } else await page.screenshot({ fullPage, path: filePath });
  results.push({ file, id, status: "ok", title });
  console.log(`ok   ${id} ${file}`);
}

async function scenario(browser, ids, options, run) {
  const selected = only.size === 0 ? ids : ids.filter((id) => only.has(id));
  if (selected.length === 0) return;

  const context = await openContext(browser, options);
  const page = await context.newPage();
  try {
    await run(page, (id) => only.size === 0 || only.has(id));
  } catch (error) {
    const pending = selected.filter(
      (id) => !results.some((result) => result.id === id),
    );
    for (const id of pending) {
      results.push({
        error: error.message.split("\n")[0],
        id,
        status: "falhou",
      });
      console.log(`erro ${id} ${error.message.split("\n")[0]}`);
    }
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({
  channel: process.env.CAPTURE_CHANNEL || undefined,
});
await mkdir(outputDir, { recursive: true });

await scenario(browser, ["F01"], {}, async (page) => {
  await visit(page, "/login");
  await dismissNotifications(page);
  await shot(page, "F01", "F01-login.png", "Tela de login (tema claro)");
});

await scenario(browser, ["F02"], { dark: true }, async (page) => {
  await visit(page, "/login");
  await dismissNotifications(page);
  await shot(
    page,
    "F02",
    "F02-login-escuro.png",
    "Tela de login (tema escuro)",
  );
});

await scenario(
  browser,
  ["F03", "F04", "F05", "F06", "F07"],
  {},
  async (page, wants) => {
    await login(page, accounts.ana);
    if (wants("F03"))
      await shot(page, "F03", "F03-aluno-inicio.png", "Início do aluno");

    await visit(page, "/agendamentos/novo");
    await findCalendarDay(page, "future", () =>
      isVisible(page.locator('[data-testid^="day-interval-"]').first()),
    );
    if (wants("F04"))
      await shot(
        page,
        "F04",
        "F04-aluno-horarios-livres.png",
        "Horários livres do dia",
      );

    await page.locator('[data-testid^="day-interval-"]').first().click();
    await page.getByTestId("selected-availability").waitFor();
    await page
      .getByRole("textbox", { name: "Assunto" })
      .fill("Dúvida sobre aproveitamento de disciplina");
    if (wants("F05"))
      await shot(
        page,
        "F05",
        "F05-aluno-formulario-agendamento.png",
        "Formulário do agendamento",
      );

    await page.getByRole("button", { name: "Revisar agendamento" }).click();
    const review = page.getByRole("dialog");
    await review.waitFor();
    await page.waitForTimeout(300);
    if (wants("F06"))
      await shot(
        page,
        "F06",
        "F06-aluno-revisao.png",
        "Revisão antes da confirmação",
        { fullPage: false },
      );

    if (allowWrites && wants("F07")) {
      await page.getByTestId("confirm-appointment").click();
      await page.getByTestId("appointment-confirmation").waitFor();
      await page.waitForTimeout(300);
      await shot(
        page,
        "F07",
        "F07-aluno-protocolo.png",
        "Agendamento confirmado com protocolo",
        { fullPage: false },
      );
    }
  },
);

await scenario(browser, ["F08", "F09", "F10"], {}, async (page, wants) => {
  await login(page, accounts.ana);
  await visit(page, "/agendamentos/meus");
  if (wants("F08"))
    await shot(
      page,
      "F08",
      "F08-aluno-meus-agendamentos.png",
      "Meus agendamentos",
    );

  await page
    .getByTestId("next-appointment")
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  if (wants("F09"))
    await shot(
      page,
      "F09",
      "F09-aluno-detalhes.png",
      "Detalhes do agendamento",
      { fullPage: false },
    );

  await enabledButton(page.getByRole("dialog"), "Cancelar agendamento").click();
  await page.getByRole("dialog", { name: "Cancelar agendamento?" }).waitFor();
  await page.waitForTimeout(300);
  if (wants("F10"))
    await shot(
      page,
      "F10",
      "F10-aluno-cancelamento.png",
      "Cancelamento com motivo obrigatório",
      { fullPage: false },
    );
});

await scenario(
  browser,
  ["F11", "F12"],
  { viewport: mobile },
  async (page, wants) => {
    await login(page, accounts.ana);
    if (wants("F11"))
      await shot(
        page,
        "F11",
        "F11-aluno-inicio-celular.png",
        "Início do aluno no celular",
      );
    await visit(page, "/agendamentos/novo");
    if (wants("F12"))
      await shot(
        page,
        "F12",
        "F12-aluno-novo-agendamento-celular.png",
        "Novo agendamento no celular",
      );
  },
);

await scenario(browser, ["F13", "F14", "F15"], {}, async (page, wants) => {
  await login(page, accounts.helena);
  await visit(page, "/professor/agenda");
  if (wants("F13"))
    await shot(
      page,
      "F13",
      "F13-professor-agenda.png",
      "Agenda mensal do professor",
      {
        until: page.locator(
          'section[aria-labelledby="availability-empty-title"]',
        ),
      },
    );

  await findCalendarDay(page, "future", () =>
    isVisible(
      page
        .getByRole("button", { name: "Desbloquear horário", exact: true })
        .first(),
    ),
  );
  if (wants("F14"))
    await shot(
      page,
      "F14",
      "F14-professor-horario-bloqueado.png",
      "Dia com horário bloqueado",
    );

  await visit(page, "/professor/agenda");
  await page.getByTestId("open-availability-modal").click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  if (wants("F15"))
    await shot(
      page,
      "F15",
      "F15-professor-publicar-horarios.png",
      "Publicação de disponibilidades",
      { fullPage: false },
    );
});

await scenario(browser, ["F16", "F17"], {}, async (page, wants) => {
  await login(page, accounts.ricardo);
  await visit(page, "/professor/agenda");
  await enabledButton(page, "Registrar atendimento").scrollIntoViewIfNeeded();
  await enabledButton(page, "Registrar atendimento").click();
  await page.getByRole("dialog", { name: "Registrar atendimento" }).waitFor();
  await page.waitForTimeout(300);
  if (wants("F16"))
    await shot(
      page,
      "F16",
      "F16-professor-registrar-atendimento.png",
      "Registro de atendimento",
      { fullPage: false },
    );

  await page.keyboard.press("Escape");
  await visit(page, "/professor/atendimentos");
  if (wants("F17"))
    await shot(
      page,
      "F17",
      "F17-professor-atendimentos.png",
      "Atendimentos do professor",
    );
});

await scenario(
  browser,
  ["F18", "F19", "F20", "F21", "F22", "F23", "F24"],
  {},
  async (page, wants) => {
    await login(page, accounts.admin);
    if (wants("F18"))
      await shot(
        page,
        "F18",
        "F18-admin-inicio.png",
        "Início do administrador",
      );

    await visit(page, "/relatorios/dashboard");
    if (wants("F19"))
      await shot(
        page,
        "F19",
        "F19-admin-dashboard.png",
        "Dashboard com os quatro indicadores",
      );

    await visit(page, "/administracao/agenda");
    if (wants("F20"))
      await shot(page, "F20", "F20-admin-agenda-geral.png", "Agenda geral");

    await findCalendarDay(page, "future", () =>
      isVisible(enabledButton(page, "Cancelar agendamento")),
    );
    await enabledButton(page, "Cancelar agendamento").click();
    await page.getByRole("dialog", { name: "Cancelar agendamento?" }).waitFor();
    await page.waitForTimeout(300);
    if (wants("F21"))
      await shot(
        page,
        "F21",
        "F21-admin-cancelamento-senha.png",
        "Cancelamento administrativo com senha",
        { fullPage: false },
      );

    await page.keyboard.press("Escape");
    await visit(page, "/administracao/atendimentos");
    await page
      .getByRole("textbox", { name: "Data inicial" })
      .fill(institutionDateOffset(-30));
    await page
      .getByRole("textbox", { name: "Data final" })
      .fill(institutionToday());
    await page.getByRole("button", { name: "Filtrar" }).click();
    await settle(page);
    if (wants("F22"))
      await shot(
        page,
        "F22",
        "F22-admin-atendimentos.png",
        "Atendimentos com filtros",
      );

    await page
      .locator("tr", { hasText: "Em tratativa" })
      .locator('[data-testid^="show-attendance-"]')
      .first()
      .click();
    await page.getByTestId("update-attendance").waitFor();
    await settle(page);
    if (wants("F23"))
      await shot(
        page,
        "F23",
        "F23-admin-atendimento-tratativa.png",
        "Atendimento em tratativa e histórico",
      );

    await page.getByTestId("update-attendance").click();
    await page.getByRole("dialog", { name: "Atualizar tratativa" }).waitFor();
    await page.waitForTimeout(300);
    if (wants("F24"))
      await shot(
        page,
        "F24",
        "F24-admin-atualizar-tratativa.png",
        "Atualização da tratativa",
        { fullPage: false },
      );
  },
);

await scenario(
  browser,
  ["F25", "F26", "F27", "F28", "F29"],
  {},
  async (page, wants) => {
    await login(page, accounts.admin);
    await visit(page, "/administracao/usuarios");
    if (wants("F25"))
      await shot(page, "F25", "F25-admin-usuarios.png", "Gestão de usuários");

    await visit(page, "/administracao/usuarios/novo");
    if (wants("F26"))
      await shot(
        page,
        "F26",
        "F26-admin-cadastro-usuario.png",
        "Cadastro de usuário em etapas",
      );

    await visit(page, "/administracao/auditoria");
    if (wants("F27")) {
      // Só o dia da captura: eventos de execuções em outros dias não aparecem.
      const filterToday = async () => {
        await page
          .getByRole("textbox", { name: "Data inicial" })
          .fill(institutionToday());
        await page
          .getByRole("textbox", { name: "Data final" })
          .fill(institutionToday());
        await page.getByRole("button", { name: "Filtrar" }).click();
        await settle(page);
      };
      await filterToday();
      const emptyTrail = page.getByText(
        "Nenhuma operação foi registrada para os filtros escolhidos.",
      );
      // Em execuções repetidas, a trilha já tem eventos e nada é gravado de novo.
      if ((await isVisible(emptyTrail)) && allowWrites) {
        await prepareAuditEvidence(page);
        await visit(page, "/administracao/auditoria");
        await filterToday();
      }
      if (await isVisible(emptyTrail)) {
        const error =
          "Trilha vazia no período; rode com CAPTURE_CONFIRM=1 para gerar eventos.";
        results.push({ error, id: "F27", status: "falhou" });
        console.log(`erro F27 ${error}`);
      } else {
        await shot(
          page,
          "F27",
          "F27-admin-auditoria.png",
          "Trilha de auditoria",
        );
      }
    }

    await visit(page, "/administracao/parametros");
    if (wants("F28"))
      await shot(
        page,
        "F28",
        "F28-admin-parametros.png",
        "Parâmetros do sistema",
      );

    await page.clock.install();
    await visit(page, "/");
    await page.clock.fastForward("31:00");
    await page.getByTestId("session-lock").waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    if (wants("F29"))
      await shot(
        page,
        "F29",
        "F29-bloqueio-inatividade.png",
        "Bloqueio por inatividade",
        { fullPage: false },
      );
  },
);

await scenario(browser, ["F30"], { dark: true }, async (page) => {
  await login(page, accounts.admin);
  await visit(page, "/relatorios/dashboard");
  await shot(
    page,
    "F30",
    "F30-admin-dashboard-escuro.png",
    "Dashboard no tema escuro",
  );
});

await scenario(browser, ["F31"], { viewport: mobile }, async (page) => {
  await login(page, accounts.admin);
  await page.getByTestId("mobile-navigation-trigger").click();
  await page.waitForTimeout(400);
  await shot(page, "F31", "F31-menu-celular.png", "Menu lateral no celular", {
    fullPage: false,
  });
});

await scenario(browser, ["F32"], {}, async (page) => {
  await page.goto(
    pathToFileURL(path.join(rootDir, "docs/mockups/sistema-agendamento.html"))
      .href,
  );
  await page.waitForTimeout(800);
  await shot(
    page,
    "F32",
    "F32-prototipo-inicial.png",
    "Protótipo visual inicial",
  );
});

await browser.close();

const manifest = { baseUrl, capturedAt: new Date().toISOString(), results };
await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const failures = results.filter((result) => result.status !== "ok");
console.log(`\n${results.length - failures.length} imagens em ${outputDir}`);
if (failures.length > 0) {
  console.log(`${failures.length} falharam; veja manifest.json.`);
  process.exitCode = 1;
}

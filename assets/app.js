"use strict";

const fmt = new Intl.NumberFormat("ko-KR");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function krw(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number > 0 ? "+" : ""}${fmt.format(Math.round(number))} KRW`;
}

function pct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toFixed(2)}%`;
}

async function readJson(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

function metricCard(label, value, hint = "") {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ""}</article>`;
}

function statusText(value, fallback = "export 대기") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function linkButton(link, isPrimary = false) {
  return `<a class="button${isPrimary ? " primary" : ""}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
}

function statusBadge(status) {
  const normalized = String(status || "planned").toLowerCase();
  const labelMap = {
    draft: "작성 중",
    planned: "예정",
    evidence: "증거",
    published: "공개",
    operating: "운영",
  };
  return `<span class="status-badge status-${escapeHtml(normalized)}">${escapeHtml(labelMap[normalized] || statusText(status, "예정"))}</span>`;
}

function evidenceCard(item) {
  return `
    <article class="card evidence-card">
      <div class="card-kicker">${escapeHtml(item.type || "evidence")}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
      <dl>
        <dt>상태</dt><dd>${statusBadge(item.status)}</dd>
        <dt>범위</dt><dd>${escapeHtml(item.scope || "-")}</dd>
      </dl>
      <a href="${escapeHtml(item.href || "#")}">${escapeHtml(item.link_label || "자료 보기")}</a>
    </article>
  `;
}

function postItem(post) {
  return `
    <article class="post-item">
      <div>
        <span>${escapeHtml(post.category || "Log")}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.summary)}</p>
      </div>
      ${statusBadge(post.status)}
    </article>
  `;
}

function strategyCard(strategy) {
  const href = strategy.href || "strategies.html";
  const totalPnl = Number(strategy.total_pnl_krw);
  const pnlClass = totalPnl < 0 ? "negative" : totalPnl > 0 ? "positive" : "neutral";
  return `
    <article class="card">
      <div class="card-kicker">${escapeHtml(strategy.rank ? `#${strategy.rank}` : strategy.market || "REPORT")}</div>
      <h2>${escapeHtml(strategy.name)}</h2>
      <p>${escapeHtml(strategy.description)}</p>
      <dl>
        <dt>코드</dt><dd>${escapeHtml(strategy.code)}</dd>
        <dt>마켓</dt><dd>${escapeHtml(strategy.market)}</dd>
        <dt>누적 손익</dt><dd class="${pnlClass}">${escapeHtml(krw(strategy.total_pnl_krw))}</dd>
        <dt>상태</dt><dd>${escapeHtml(statusText(strategy.status))}</dd>
      </dl>
      <a href="${escapeHtml(href)}">자세히 보기</a>
    </article>
  `;
}

function renderHomeIntro(home) {
  const title = document.getElementById("homeTitle");
  const description = document.getElementById("homeDescription");
  const links = document.getElementById("homePrimaryLinks");
  const stats = document.getElementById("homeStats");

  if (title) title.textContent = home.site_title || "MediaMak";
  if (description) description.textContent = home.description || "";
  if (links) {
    const primaryLinks = Array.isArray(home.primary_links) ? home.primary_links : [];
    links.innerHTML = primaryLinks.map((link, index) => linkButton(link, index === 0)).join("");
  }
  if (stats) {
    const metrics = Array.isArray(home.metrics) ? home.metrics : [];
    stats.innerHTML = metrics.map((metric) => metricCard(metric.label, metric.value, metric.hint)).join("");
  }
}

function renderBookToc(toc) {
  const target = document.getElementById("bookToc");
  if (!target) return;
  const chapters = Array.isArray(toc.chapters) ? toc.chapters : [];
  target.innerHTML = chapters.map((chapter) => `
    <article>
      <b>${escapeHtml(String(chapter.number).padStart(2, "0"))}</b>
      <div>
        <h3>${escapeHtml(chapter.title)}</h3>
        <p>${escapeHtml(chapter.summary)}</p>
      </div>
      ${statusBadge(chapter.status)}
    </article>
  `).join("");
}

function renderEvidence(evidence) {
  const target = document.getElementById("evidenceGrid");
  if (!target) return;
  const items = Array.isArray(evidence.items) ? evidence.items : [];
  target.innerHTML = items.map(evidenceCard).join("");
}

function renderPosts(posts) {
  const target = document.getElementById("postList");
  if (!target) return;
  const items = Array.isArray(posts.posts) ? posts.posts : [];
  target.innerHTML = items.map(postItem).join("");
}

function renderSystemFlow(home) {
  const target = document.getElementById("systemFlow");
  if (!target) return;
  const steps = Array.isArray(home.system_flow) ? home.system_flow : [];
  target.innerHTML = steps.map((step, index) => `
    <article>
      <b>${escapeHtml(String(index + 1).padStart(2, "0"))}</b>
      <strong>${escapeHtml(step.title)}</strong>
      <span>${escapeHtml(step.text)}</span>
    </article>
  `).join("");
}

function renderDisclosure(home) {
  const target = document.getElementById("disclosureNotes");
  if (!target) return;
  const notes = Array.isArray(home.disclosure) ? home.disclosure : [];
  target.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
}

function initSidebarNav() {
  const links = Array.from(document.querySelectorAll("[data-section-link]"));
  if (!links.length) return;
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActive = (id) => {
    links.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
    });
  };

  if (!("IntersectionObserver" in window)) {
    setActive(sections[0]?.id);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target?.id) setActive(visible.target.id);
  }, { rootMargin: "-22% 0px -58% 0px", threshold: [0.1, 0.3, 0.6] });

  sections.forEach((section) => observer.observe(section));
  setActive(sections[0]?.id);
}

async function initHome() {
  const [home, toc, evidence, posts] = await Promise.all([
    readJson("data/home.json"),
    readJson("data/book-toc.json"),
    readJson("data/evidence-index.json"),
    readJson("data/posts.json"),
  ]);
  renderHomeIntro(home);
  renderBookToc(toc);
  renderEvidence(evidence);
  renderPosts(posts);
  renderSystemFlow(home);
  renderDisclosure(home);
  initSidebarNav();
}

async function initBookPage() {
  const toc = await readJson("data/book-toc.json");
  renderBookToc(toc);
}

async function initEvidencePage() {
  const evidence = await readJson("data/evidence-index.json");
  renderEvidence(evidence);
}

async function initPostsPage() {
  const posts = await readJson("data/posts.json");
  renderPosts(posts);
}

async function initArchitecturePage() {
  const home = await readJson("data/home.json");
  renderSystemFlow(home);
}

async function initDisclosurePage() {
  const home = await readJson("data/home.json");
  renderDisclosure(home);
}

function renderGaps(rows, kind) {
  const target = document.getElementById("gapMarkers");
  if (!target) return;
  const label = kind === "actual" ? "매매 중단 기간" : "시뮬레이션 중단 기간";
  const gaps = rows.filter((row) => row.type === "gap");
  target.innerHTML = gaps.length
    ? gaps.map((row) => `<div>${escapeHtml(row.label || label)} · ${escapeHtml(label)}</div>`).join("")
    : "";
}

function renderStrategyRows(strategies) {
  const body = document.getElementById("performanceStrategyBody");
  if (!body) return;
  body.innerHTML = strategies.length ? strategies.map((row) => {
    const pnl = Number(row.total_pnl_krw);
    const pnlClass = pnl < 0 ? "negative" : "positive";
    return `
      <tr>
        <td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.code)}</small></td>
        <td>${escapeHtml(row.market)}</td>
        <td class="${pnlClass}">${krw(row.total_pnl_krw)}</td>
        <td>${pct(row.win_rate_pct)}</td>
        <td>${fmt.format(Number(row.trade_count) || 0)}</td>
        <td>${escapeHtml(row.updated_at || "-")}</td>
      </tr>
    `;
  }).join("") : '<tr><td colspan="6">표시할 데이터가 없습니다.</td></tr>';
}

async function initPerformance() {
  const source = document.body.dataset.source;
  const kind = document.body.dataset.kind || "simulation";
  const data = await readJson(source);
  const summary = data.summary || {};
  const rows = Array.isArray(data.daily) ? data.daily : [];
  const strategies = Array.isArray(data.strategies) ? data.strategies : [];

  const target = document.getElementById("performanceSummary");
  if (target) {
    target.innerHTML = [
      metricCard("누적 손익", krw(summary.total_pnl_krw), summary.period),
      metricCard("일평균 손익", krw(summary.daily_avg_pnl_krw)),
      metricCard("승률", pct(summary.win_rate_pct)),
      metricCard("거래 수", `${fmt.format(Number(summary.trade_count) || 0)}건`),
      metricCard("공개 전략 수", `${fmt.format(Number(summary.strategy_count) || 0)}개`),
      metricCard("최근 갱신", summary.updated_at || "-"),
    ].join("");
  }
  const updated = document.getElementById("performanceUpdated");
  if (updated) updated.textContent = summary.updated_at || "-";
  renderGaps(rows, kind);
  renderStrategyRows(strategies);
  window.MediaMakCharts?.renderPerformanceChart(document.getElementById("performanceChart"), rows);
  window.addEventListener("resize", () => window.MediaMakCharts?.renderPerformanceChart(document.getElementById("performanceChart"), rows));
}

async function initStrategies() {
  const data = await readJson("data/strategies.json");
  const target = document.getElementById("strategyList");
  if (target) target.innerHTML = data.strategies.map(strategyCard).join("");
}

async function init() {
  const page = document.body.dataset.page;
  try {
    if (page === "home") await initHome();
    if (page === "book") await initBookPage();
    if (page === "evidence") await initEvidencePage();
    if (page === "posts") await initPostsPage();
    if (page === "architecture") await initArchitecturePage();
    if (page === "disclosure") await initDisclosurePage();
    if (page === "performance") await initPerformance();
    if (page === "strategies") await initStrategies();
  } catch (error) {
    const main = document.querySelector("main");
    if (main) {
      main.insertAdjacentHTML("afterbegin", `<section class="notice-band"><strong>데이터 로드 오류</strong><span>${escapeHtml(error.message)}</span></section>`);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);

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

function multiple(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toFixed(2)}x`;
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

function postDate(post) {
  return String(post.date || "").trim();
}

function postHref(post) {
  return String(post.href || "").trim();
}

function postTags(post) {
  const tags = Array.isArray(post.tags) ? post.tags : [];
  return tags.length
    ? `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
}

function sortedPosts(posts) {
  const items = Array.isArray(posts.posts) ? posts.posts.slice() : [];
  return items.sort((a, b) => postDate(b).localeCompare(postDate(a)) || String(b.featured).localeCompare(String(a.featured)));
}

function statusBadge(status) {
  const normalized = String(status || "planned").toLowerCase();
  const labelMap = {
    draft: "작성 중",
    planned: "예정",
    evidence: "검증",
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
  const href = postHref(post);
  const title = href
    ? `<a href="${escapeHtml(href)}">${escapeHtml(post.title)}</a>`
    : escapeHtml(post.title);
  const meta = [postDate(post), post.author, post.series].filter(Boolean).join(" · ");
  return `
    <article class="post-item">
      <div>
        <span>${escapeHtml(post.category || "Log")}</span>
        <h3>${title}</h3>
        ${meta ? `<div class="post-meta">${escapeHtml(meta)}</div>` : ""}
        <p>${escapeHtml(post.summary)}</p>
        ${postTags(post)}
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

function renderFeaturedPost(posts) {
  const target = document.getElementById("featuredPost");
  if (!target) return;
  const items = sortedPosts(posts);
  const post = items.find((item) => item.featured) || items[0];
  if (!post) {
    target.innerHTML = "";
    return;
  }
  const href = postHref(post) || "posts.html";
  target.innerHTML = `
    <article>
      <div class="card-kicker">FEATURED</div>
      <h2><a href="${escapeHtml(href)}">${escapeHtml(post.title)}</a></h2>
      <div class="post-meta">${escapeHtml([post.category, postDate(post)].filter(Boolean).join(" · "))}</div>
      <p>${escapeHtml(post.summary)}</p>
      ${postTags(post)}
    </article>
  `;
}

function renderLatestPosts(posts) {
  const target = document.getElementById("latestPosts");
  if (!target) return;
  const items = sortedPosts(posts).filter((post) => !post.featured).slice(0, 3);
  target.innerHTML = items.map((post) => {
    const href = postHref(post) || "posts.html";
    return `
      <a href="${escapeHtml(href)}">
        <span>${escapeHtml([post.category, postDate(post)].filter(Boolean).join(" · "))}</span>
        <strong>${escapeHtml(post.title)}</strong>
      </a>
    `;
  }).join("");
}

function renderTopicLanes(home) {
  const target = document.getElementById("topicLanes");
  if (!target) return;
  const lanes = Array.isArray(home.topic_lanes) ? home.topic_lanes : [];
  target.innerHTML = lanes.map((lane) => `
    <a class="topic-card" href="${escapeHtml(lane.href || "#")}">
      <span>${escapeHtml(lane.tag || "Topic")}</span>
      <strong>${escapeHtml(lane.title)}</strong>
      <p>${escapeHtml(lane.summary)}</p>
    </a>
  `).join("");
}

function renderSeries(home) {
  const target = document.getElementById("seriesGrid");
  if (!target) return;
  const series = Array.isArray(home.series) ? home.series : [];
  target.innerHTML = series.map((item) => `
    <a class="series-card" href="${escapeHtml(item.href || "#")}">
      <span>${escapeHtml(item.count || "series")}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.summary)}</p>
    </a>
  `).join("");
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
  const items = sortedPosts(posts);
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

async function initHome() {
  const [home, toc, evidence, posts] = await Promise.all([
    readJson("data/home.json"),
    readJson("data/book-toc.json"),
    readJson("data/evidence-index.json"),
    readJson("data/posts.json"),
  ]);
  renderHomeIntro(home);
  renderFeaturedPost(posts);
  renderLatestPosts(posts);
  renderTopicLanes(home);
  renderSeries(home);
  renderBookToc(toc);
  renderEvidence(evidence);
  renderPosts(posts);
  renderSystemFlow(home);
  renderDisclosure(home);
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
  const label = kind === "actual" ? "매매 중단 기간" : "백테스트 중단 기간";
  const gaps = rows.filter((row) => row.type === "gap");
  target.innerHTML = gaps.length
    ? gaps.map((row) => `<div>${escapeHtml(row.label || label)} · ${escapeHtml(label)}</div>`).join("")
    : "";
}

const DAILY_PNL_PAGE_SIZE = 30;
const performanceState = {
  data: null,
  assetCode: "",
  strategyCode: "",
  dailyPage: 1,
  resizeHandler: null,
};

function legacyPerformanceStrategy(data) {
  const summary = data.summary || {};
  const overview = data.strategy_overview || {};
  return {
    code: overview.code || "legacy-backtest",
    name: overview.name || "백테스트",
    market: overview.market || "KRW-BTC",
    bar_interval: overview.bar_interval || "-",
    description: overview.description || "",
    data_sources: Array.isArray(overview.data_sources) ? overview.data_sources : [],
    rules: Array.isArray(overview.rules) ? overview.rules : [],
    summary,
    return_metrics: data.return_metrics || {},
    daily: Array.isArray(data.daily) ? data.daily : [],
  };
}

function getPerformanceAssets(data) {
  if (Array.isArray(data.assets) && data.assets.length) {
    return data.assets.map((asset) => ({
      ...asset,
      strategies: Array.isArray(asset.strategies) ? asset.strategies : [],
    })).filter((asset) => asset.strategies.length);
  }
  const strategy = legacyPerformanceStrategy(data || {});
  return [{
    code: "bitcoin_krw",
    label: "Bitcoin KRW",
    market: strategy.market,
    strategies: [strategy],
  }];
}

function allPerformanceStrategies(data) {
  return getPerformanceAssets(data).flatMap((asset) => asset.strategies.map((strategy) => ({ ...strategy, asset })));
}

function selectedPerformanceAsset() {
  const assets = getPerformanceAssets(performanceState.data || {});
  return assets.find((asset) => asset.code === performanceState.assetCode) || assets[0] || { strategies: [] };
}

function selectedPerformanceStrategy() {
  const asset = selectedPerformanceAsset();
  return asset.strategies.find((strategy) => {
    const previousCodes = Array.isArray(strategy.previous_strategy_codes) ? strategy.previous_strategy_codes : [];
    return strategy.code === performanceState.strategyCode
      || strategy.source_strategy_code === performanceState.strategyCode
      || previousCodes.includes(performanceState.strategyCode);
  }) || asset.strategies[0] || {};
}

function updatePerformanceUrl() {
  const params = new URLSearchParams(window.location.search);
  if (performanceState.assetCode) params.set("asset", performanceState.assetCode);
  if (performanceState.strategyCode) params.set("strategy", performanceState.strategyCode);
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function populatePerformanceSelectors(data) {
  const assetSelect = document.getElementById("assetSelect");
  const strategySelect = document.getElementById("strategySelect");
  if (!assetSelect || !strategySelect) return;
  const assets = getPerformanceAssets(data);
  const params = new URLSearchParams(window.location.search);
  const requestedAsset = params.get("asset");
  const requestedStrategy = params.get("strategy");
  const defaultAsset = assets.find((asset) => asset.code === requestedAsset) || assets[0];
  performanceState.assetCode = performanceState.assetCode || defaultAsset?.code || "";
  if (!assets.some((asset) => asset.code === performanceState.assetCode)) {
    performanceState.assetCode = defaultAsset?.code || "";
  }
  const asset = selectedPerformanceAsset();
  const defaultStrategy = asset.strategies.find((strategy) => {
    const previousCodes = Array.isArray(strategy.previous_strategy_codes) ? strategy.previous_strategy_codes : [];
    return strategy.code === requestedStrategy
      || strategy.source_strategy_code === requestedStrategy
      || previousCodes.includes(requestedStrategy);
  }) || asset.strategies[0];
  performanceState.strategyCode = performanceState.strategyCode || defaultStrategy?.code || "";
  if (!asset.strategies.some((strategy) => strategy.code === performanceState.strategyCode)) {
    performanceState.strategyCode = defaultStrategy?.code || "";
  }

  assetSelect.innerHTML = assets.map((asset) => `
    <option value="${escapeHtml(asset.code)}"${asset.code === performanceState.assetCode ? " selected" : ""}>
      ${escapeHtml(asset.label || asset.market || asset.code)}
    </option>
  `).join("");
  strategySelect.innerHTML = asset.strategies.map((strategy) => `
    <option value="${escapeHtml(strategy.code)}"${strategy.code === performanceState.strategyCode ? " selected" : ""}>
      ${escapeHtml(strategy.name || strategy.code)}
    </option>
  `).join("");
}

function bindPerformanceSelectors() {
  const assetSelect = document.getElementById("assetSelect");
  const strategySelect = document.getElementById("strategySelect");
  if (assetSelect) {
    assetSelect.addEventListener("change", () => {
      performanceState.assetCode = assetSelect.value;
      const asset = selectedPerformanceAsset();
      performanceState.strategyCode = asset.strategies[0]?.code || "";
      performanceState.dailyPage = 1;
      populatePerformanceSelectors(performanceState.data);
      updatePerformanceUrl();
      renderSelectedPerformance();
    });
  }
  if (strategySelect) {
    strategySelect.addEventListener("change", () => {
      performanceState.strategyCode = strategySelect.value;
      performanceState.dailyPage = 1;
      updatePerformanceUrl();
      renderSelectedPerformance();
    });
  }
}

function renderDailyPnlRows(rows) {
  const body = document.getElementById("dailyPnlBody");
  const pageInfo = document.getElementById("dailyPnlPageInfo");
  const prev = document.getElementById("dailyPnlPrev");
  const next = document.getElementById("dailyPnlNext");
  if (!body) return;
  const visibleRows = (Array.isArray(rows) ? rows : []).filter((row) => row.type !== "gap").slice().reverse();
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / DAILY_PNL_PAGE_SIZE));
  performanceState.dailyPage = Math.min(Math.max(performanceState.dailyPage, 1), totalPages);
  const start = (performanceState.dailyPage - 1) * DAILY_PNL_PAGE_SIZE;
  const pageRows = visibleRows.slice(start, start + DAILY_PNL_PAGE_SIZE);
  body.innerHTML = pageRows.length ? pageRows.map((row) => {
    const pnl = Number(row.pnl_krw);
    const pnlClass = pnl < 0 ? "negative" : pnl > 0 ? "positive" : "neutral";
    const cumulative = Number(row.cumulative_pnl_krw);
    const cumulativeClass = cumulative < 0 ? "negative" : cumulative > 0 ? "positive" : "neutral";
    return `
      <tr>
        <td>${escapeHtml(row.date || row.label || "-")}</td>
        <td class="${pnlClass}">${krw(row.pnl_krw)}</td>
        <td class="${cumulativeClass}">${krw(row.cumulative_pnl_krw)}</td>
        <td>${fmt.format(Number(row.trade_count) || 0)}</td>
        <td>${fmt.format(Number(row.win_count) || 0)}</td>
        <td>${fmt.format(Number(row.loss_count) || 0)}</td>
      </tr>
    `;
  }).join("") : '<tr><td colspan="6">표시할 일별 손익 데이터가 없습니다.</td></tr>';
  if (pageInfo) {
    pageInfo.textContent = `${performanceState.dailyPage} / ${totalPages} · 총 ${fmt.format(visibleRows.length)}일 · 페이지당 ${DAILY_PNL_PAGE_SIZE}행`;
  }
  if (prev) prev.disabled = performanceState.dailyPage <= 1;
  if (next) next.disabled = performanceState.dailyPage >= totalPages;
}

function renderStrategyOverview(strategy, summary) {
  const target = document.getElementById("strategyOverview");
  if (!target) return;
  const updated = document.getElementById("strategyUpdated");
  if (updated) updated.textContent = summary.updated_at || strategy.updated_at || "-";
  if (!strategy || !Object.keys(strategy).length) {
    target.innerHTML = '<article class="card"><p>전략 설명 데이터가 없습니다.</p></article>';
    return;
  }
  const rules = Array.isArray(strategy.rules) ? strategy.rules : [];
  const dataSources = Array.isArray(strategy.data_sources) ? strategy.data_sources : [];
  const periodLabel = document.body.dataset.kind === "actual" ? "운영 기간" : "검증 기간";
  target.innerHTML = `
    <article class="strategy-explain">
      <div>
        <div class="card-kicker">${escapeHtml(strategy.market || "KRW-BTC")}</div>
        <h3>${escapeHtml(strategy.name || "전략")}</h3>
        <p>${escapeHtml(strategy.description || "")}</p>
      </div>
      <dl>
        <dt>전략 코드</dt><dd>${escapeHtml(strategy.code || "-")}</dd>
        <dt>봉 간격</dt><dd>${escapeHtml(strategy.bar_interval || "-")}</dd>
        <dt>${escapeHtml(periodLabel)}</dt><dd>${escapeHtml(summary.period || "-")}</dd>
        <dt>데이터</dt><dd>${escapeHtml(dataSources.join(", ") || "-")}</dd>
      </dl>
    </article>
    ${rules.length ? `
      <div class="rule-grid">
        ${rules.map((rule) => `
          <article>
            <span>${escapeHtml(rule.label)}</span>
            <strong>${escapeHtml(rule.value)}</strong>
            <p>${escapeHtml(rule.note || "")}</p>
          </article>
        `).join("")}
      </div>
    ` : ""}
  `;
}

function renderStrategySummary(summary, metrics, asset, totalStrategyCount) {
  const target = document.getElementById("performanceSummary");
  if (!target) return;
  if ((!summary || !Object.keys(summary).length) && (!metrics || !Object.keys(metrics).length)) {
    target.innerHTML = '<article class="metric-card"><span>전략 요약</span><strong>-</strong></article>';
    return;
  }
  target.innerHTML = [
    metricCard("누적 손익", krw(summary.total_pnl_krw), summary.period),
    metricCard("일평균 손익", krw(summary.daily_avg_pnl_krw)),
    metricCard("승률", pct(summary.win_rate_pct)),
    metricCard("거래 수", `${fmt.format(Number(summary.trade_count) || 0)}건`),
    metricCard("선택 투자 소재 전략 수", `${fmt.format(Number(asset?.strategies?.length) || 0)}개`, `전체 ${fmt.format(Number(totalStrategyCount) || 0)}개`),
    metricCard("실현 수익률", pct(metrics.realized_return_pct), "실현손익 / 1회 주문금액 기준"),
    metricCard("평균 거래 수익률", pct(metrics.avg_trade_return_pct), "체결 수수료 반영 평균"),
    metricCard("현재 미실현 수익률", pct(metrics.open_unrealized_return_pct), "오픈 포지션 기준"),
    metricCard("목표수익률 범위", `${pct(metrics.min_target_profit_pct)} ~ ${pct(metrics.max_target_profit_pct)}`, `평균 ${pct(metrics.avg_target_profit_pct)}`),
    metricCard("손익비", multiple(metrics.profit_factor), "실현 이익 / 실현 손실"),
  ].join("");
}

function renderActualLinkPanel(strategy) {
  const target = document.getElementById("actualLinkPanel");
  if (!target) return;
  const available = Boolean(strategy.actual_available);
  const href = strategy.actual_href || "";
  if (!available || !href) {
    target.innerHTML = `
      <div class="actual-link-panel is-disabled">
        <div>
          <span>ACTUAL TRADING LOG</span>
          <strong>실제 매매 데이터 연결 준비 중</strong>
          <p>선택한 백테스트 전략과 같은 실제 매매 러너가 아직 공개 집계에 연결되지 않았습니다.</p>
        </div>
      </div>
    `;
    return;
  }
  target.innerHTML = `
    <div class="actual-link-panel">
      <div>
        <span>ACTUAL TRADING LOG</span>
        <strong>실제 매매 데이터 확인</strong>
        <p>이 백테스트와 동일한 전략 코드 기준으로 실제 매매 실현손익 집계 화면으로 이동합니다.</p>
      </div>
      <a class="button primary" href="${escapeHtml(href)}">실제 매매 데이터 확인</a>
    </div>
  `;
}

function bindDailyPagination() {
  const prev = document.getElementById("dailyPnlPrev");
  const next = document.getElementById("dailyPnlNext");
  if (prev) {
    prev.addEventListener("click", () => {
      performanceState.dailyPage -= 1;
      renderDailyPnlRows(selectedPerformanceStrategy().daily);
    });
  }
  if (next) {
    next.addEventListener("click", () => {
      performanceState.dailyPage += 1;
      renderDailyPnlRows(selectedPerformanceStrategy().daily);
    });
  }
}

function renderSelectedPerformance() {
  const kind = document.body.dataset.kind || "backtest";
  const data = performanceState.data || {};
  const asset = selectedPerformanceAsset();
  const strategy = selectedPerformanceStrategy();
  const summary = strategy.summary || {};
  const returnMetrics = strategy.return_metrics || {};
  const rows = Array.isArray(strategy.daily) ? strategy.daily : [];
  const strategies = allPerformanceStrategies(data);

  const title = document.getElementById("performanceTitle");
  const intro = document.getElementById("performanceIntro");
  if (title) title.textContent = strategy.name || "자동매매 백테스트";
  if (intro) {
    intro.textContent = strategy.description || `${asset.label || asset.market || "선택 투자 소재"} 백테스트의 일별 실현손익을 표시합니다.`;
  }

  const updated = document.getElementById("performanceUpdated");
  if (updated) updated.textContent = summary.updated_at || "-";
  renderStrategySummary(summary, returnMetrics, asset, strategies.length);
  renderActualLinkPanel(strategy);
  renderStrategyOverview(strategy, summary);
  renderGaps(rows, kind);
  renderDailyPnlRows(rows);
  window.MediaMakCharts?.renderPerformanceChart(document.getElementById("performanceChart"), rows);
  if (performanceState.resizeHandler) {
    window.removeEventListener("resize", performanceState.resizeHandler);
  }
  performanceState.resizeHandler = () => window.MediaMakCharts?.renderPerformanceChart(document.getElementById("performanceChart"), selectedPerformanceStrategy().daily);
  window.addEventListener("resize", performanceState.resizeHandler);
}

async function initPerformance() {
  const source = document.body.dataset.source;
  const data = await readJson(source);
  performanceState.data = data;
  populatePerformanceSelectors(data);
  bindPerformanceSelectors();
  bindDailyPagination();
  updatePerformanceUrl();
  renderSelectedPerformance();
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

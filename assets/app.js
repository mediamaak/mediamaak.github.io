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

function renderProfitSummary(summary) {
  const target = document.getElementById("homeProfitSummary");
  if (!target) return;
  const metrics = summary.metrics || {};
  const simulation = metrics.simulation || {};
  const actual = metrics.actual || {};
  target.innerHTML = [
    `<a class="profit-card" href="simulation.html"><span>백테스트 시뮬레이션 종합 손익</span><strong>${escapeHtml(krw(simulation.total_profit_krw))}</strong><small>${escapeHtml(statusText(simulation.meta, "공개 export 대기"))}</small></a>`,
    `<a class="profit-card" href="actual.html"><span>실제 매매 손익</span><strong>${escapeHtml(krw(actual.total_profit_krw))}</strong><small>${escapeHtml(statusText(actual.meta, "공개 export 대기"))}</small></a>`,
  ].join("");
}

function renderSteps(summary) {
  const target = document.getElementById("rankingSteps");
  if (!target) return;
  const steps = Array.isArray(summary.ranking_steps) ? summary.ranking_steps : [];
  target.innerHTML = steps.map((step, index) => `
    <article>
      <b>${escapeHtml(String(index + 1).padStart(2, "0"))}</b>
      <strong>${escapeHtml(step.title)}</strong>
      <span>${escapeHtml(step.text)}</span>
    </article>
  `).join("");
}

function renderAssetGroups(summary) {
  const target = document.getElementById("assetGroups");
  if (!target) return;
  const groups = Array.isArray(summary.asset_groups) ? summary.asset_groups : [];
  target.innerHTML = [
    `<div class="asset-head"><span>자산군</span><span>마켓</span><span>종목 예시</span><span>제공 데이터</span></div>`,
    ...groups.map((group) => `
      <div>
        <span>${escapeHtml(group.asset)}</span>
        <span>${escapeHtml(group.market)}</span>
        <span>${escapeHtml(group.examples)}</span>
        <span>${escapeHtml(group.data)}</span>
      </div>
    `),
  ].join("");
}

function renderRiskNotes(summary) {
  const target = document.getElementById("riskNotes");
  if (!target) return;
  const notes = Array.isArray(summary.risk_notes) ? summary.risk_notes : [];
  target.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
}

async function initHome() {
  const [summary, topStrategies] = await Promise.all([
    readJson("data/site-summary.json"),
    readJson("data/public/top-strategies.json"),
  ]);
  renderProfitSummary(summary);
  renderSteps(summary);
  renderAssetGroups(summary);
  renderRiskNotes(summary);
  const cards = document.getElementById("homeSummaryCards");
  if (cards) {
    const metrics = summary.metrics || {};
    const simulation = metrics.simulation || {};
    const actual = metrics.actual || {};
    cards.innerHTML = [
      metricCard("시뮬레이션 누적 손익", krw(simulation.total_profit_krw), statusText(simulation.updated_at, "export 대기")),
      metricCard("실제 기록 누적 손익", krw(actual.total_profit_krw), statusText(actual.updated_at, "export 대기")),
      metricCard("공개 전략 수", `${fmt.format(Number(metrics.strategy_count) || 0)}개`, statusText(topStrategies.updated_at)),
      metricCard("데이터 방식", "정적 JSON", "서버 API 호출 없음"),
    ].join("");
  }
  const strategyTarget = document.getElementById("homeStrategyCards");
  if (strategyTarget) {
    const strategies = Array.isArray(topStrategies.strategies) ? topStrategies.strategies : [];
    strategyTarget.innerHTML = strategies.length
      ? strategies.slice(0, 3).map(strategyCard).join("")
      : '<article class="card"><h2>공개 전략 export 대기</h2><p>실제 공개 전략 데이터가 생성되면 이 영역에 전략 카드가 표시됩니다.</p></article>';
  }
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

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

function strategyCard(strategy) {
  return `
    <article class="card">
      <h2>${escapeHtml(strategy.name)}</h2>
      <p>${escapeHtml(strategy.description)}</p>
      <dl>
        <dt>코드</dt><dd>${escapeHtml(strategy.code)}</dd>
        <dt>마켓</dt><dd>${escapeHtml(strategy.market)}</dd>
        <dt>상태</dt><dd>${escapeHtml(strategy.status)}</dd>
      </dl>
    </article>
  `;
}

async function initHome() {
  const [summary, strategies] = await Promise.all([
    readJson("data/site-summary.json"),
    readJson("data/strategies.json"),
  ]);
  const intro = document.getElementById("projectIntro");
  if (intro) {
    intro.innerHTML = summary.project.cards.map((card) => `
      <article class="card"><h2>${escapeHtml(card.title)}</h2><p>${escapeHtml(card.text)}</p></article>
    `).join("");
  }
  const cards = document.getElementById("homeSummaryCards");
  if (cards) {
    cards.innerHTML = [
      metricCard("시뮬레이션 누적 손익", krw(summary.metrics.simulation_total_pnl_krw), summary.metrics.simulation_updated),
      metricCard("실제 기록 누적 손익", krw(summary.metrics.actual_total_pnl_krw), summary.metrics.actual_updated),
      metricCard("공개 전략 수", `${fmt.format(summary.metrics.strategy_count)}개`),
      metricCard("데이터 방식", "정적 JSON", "github_pages_site/data"),
    ].join("");
  }
  const strategyTarget = document.getElementById("homeStrategyCards");
  if (strategyTarget) {
    strategyTarget.innerHTML = strategies.strategies.slice(0, 3).map(strategyCard).join("");
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

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

function krwAmount(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${fmt.format(Math.round(number))} KRW`;
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

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    console.warn(`Optional data load failed: ${path}`, error);
    return null;
  }
}

async function readPostsData() {
  const generatedPosts = await readOptionalJson("data/news-posts.json");
  return generatedPosts || readJson("data/posts.json");
}

async function readOptionalPostsData() {
  try {
    return await readPostsData();
  } catch (error) {
    console.warn("Optional posts data load failed", error);
    return null;
  }
}

function metricCard(label, value, hint = "") {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ""}</article>`;
}

function countValue(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${fmt.format(Math.max(0, Math.round(number)))}${suffix}`;
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
    planning: "기획 중",
    writing: "집필 중",
    preparing: "출간 준비 중",
    ready: "준비 중",
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

function renderPublisherBusinessAreas(home) {
  const target = document.getElementById("publisherBusinessAreas");
  if (!target) return;
  const areas = Array.isArray(home.business_areas) ? home.business_areas : [];
  target.innerHTML = areas.map((area) => `
    <article class="card publisher-area-card">
      <div class="card-kicker">${escapeHtml(area.tag || "AREA")}</div>
      <h2>${escapeHtml(area.title)}</h2>
      <p>${escapeHtml(area.summary)}</p>
    </article>
  `).join("");
}

function renderPublicationList(home) {
  const target = document.getElementById("publicationList");
  if (!target) return;
  const items = Array.isArray(home.publications) ? home.publications : [];
  target.innerHTML = items.length ? items.map((item) => `
    <article class="publication-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
      </div>
      ${statusBadge(item.status)}
    </article>
  `).join("") : '<div class="inline-empty">표시할 출판 콘텐츠가 없습니다.</div>';
}

function renderDigitalProducts(home) {
  const target = document.getElementById("digitalProductList");
  if (!target) return;
  const products = Array.isArray(home.digital_products) ? home.digital_products : [];
  target.innerHTML = products.length ? products.map((product) => {
    const actions = Array.isArray(product.actions) ? product.actions : [];
    return `
      <article class="card digital-product-card">
        <div class="card-kicker">DIGITAL PRODUCT</div>
        <div class="product-title-row">
          <h2>${escapeHtml(product.title)}</h2>
          ${statusBadge(product.status)}
        </div>
        <p>${escapeHtml(product.summary)}</p>
        <div class="product-action-row">
          ${actions.map((action) => `<span>${escapeHtml(action)}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("") : '<div class="inline-empty">표시할 디지털 상품이 없습니다.</div>';
}

function researchCategoryLabel(post) {
  const category = String(post.category || "").toLowerCase();
  const tags = Array.isArray(post.tags) ? post.tags.map((tag) => String(tag).toLowerCase()) : [];
  if (category.includes("market") || category.includes("economy")) return "경제·기술 자료";
  if (tags.some((tag) => tag.includes("codex") || tag === "ai" || tag.includes("machine-learning"))) return "AI·Codex";
  if (tags.some((tag) => tag.includes("automation") || tag.includes("data") || tag.includes("excel") || tag.includes("python"))) return "데이터 자동화";
  if (tags.some((tag) => tag.includes("backtest") || tag.includes("trading") || tag.includes("upbit") || tag.includes("kospi"))) return "자동매매";
  if (category.includes("data")) return "데이터 자동화";
  return post.category || "연구 노트";
}

function selectResearchNotes(posts) {
  const items = sortedPosts(posts);
  const selected = [];
  const seen = new Set();
  items.forEach((post) => {
    const label = researchCategoryLabel(post);
    if (selected.length >= 3 || seen.has(label)) return;
    selected.push({ ...post, research_label: label });
    seen.add(label);
  });
  items.forEach((post) => {
    if (selected.length >= 3) return;
    if (selected.some((item) => postHref(item) === postHref(post))) return;
    selected.push({ ...post, research_label: researchCategoryLabel(post) });
  });
  return selected.slice(0, 3);
}

function renderResearchNotes(posts) {
  const target = document.getElementById("researchNotes");
  if (!target) return;
  const items = selectResearchNotes(posts);
  target.innerHTML = items.length ? items.map((post) => {
    const href = postHref(post) || "posts.html";
    const meta = [post.research_label, postDate(post)].filter(Boolean).join(" · ");
    return `
      <article class="post-item research-note-item">
        <div>
          <span>${escapeHtml(meta)}</span>
          <h3><a href="${escapeHtml(href)}">${escapeHtml(post.title)}</a></h3>
          <p>${escapeHtml(post.summary)}</p>
        </div>
        ${statusBadge(post.status)}
      </article>
    `;
  }).join("") : '<article class="post-item"><div><h3>표시할 연구 노트가 없습니다.</h3><p>게시글 데이터가 추가되면 이 영역에 표시됩니다.</p></div></article>';
}

function renderContact(home) {
  const target = document.getElementById("contactPanel");
  if (!target) return;
  const contact = home.contact || {};
  const items = Array.isArray(contact.items) ? contact.items : [];
  const email = String(contact.email || "").trim();
  const href = String(contact.href || "").trim();
  const contactLink = href || (email ? `mailto:${email}` : "");
  target.innerHTML = `
    <article class="contact-card">
      <div>
        <div class="card-kicker">CONTACT STATUS</div>
        <h3>${escapeHtml(contact.status || "문의 채널 준비 중")}</h3>
        <p>${escapeHtml(contact.summary || "문의 채널을 준비 중입니다.")}</p>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      ${contactLink ? `<a class="button primary" href="${escapeHtml(contactLink)}">문의하기</a>` : '<span class="button is-disabled" aria-disabled="true">문의 채널 준비 중</span>'}
    </article>
  `;
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
  const items = sortedPosts(posts).slice(0, 3);
  target.innerHTML = items.length ? items.map((post) => {
    const href = postHref(post) || "posts.html";
    return `
      <a href="${escapeHtml(href)}">
        <span>${escapeHtml([post.category, postDate(post)].filter(Boolean).join(" · "))}</span>
        <strong>${escapeHtml(post.title)}</strong>
      </a>
    `;
  }).join("") : '<div class="inline-empty">표시할 최신 글이 없습니다.</div>';
}

function normalizedPostHref(value) {
  return String(value || "").replace(/^\/+/, "").trim();
}

function postMetricsLookup(metrics) {
  const items = Array.isArray(metrics?.posts) ? metrics.posts : [];
  const byKey = new Map();
  items.forEach((item) => {
    const keys = [item.post_id, item.id, normalizedPostHref(item.href)].filter(Boolean);
    keys.forEach((key) => byKey.set(String(key), item));
  });
  return byKey;
}

function postsWithMetrics(posts, metrics) {
  const lookup = postMetricsLookup(metrics);
  return sortedPosts(posts).map((post) => {
    const metric = lookup.get(String(post.id || "")) || lookup.get(normalizedPostHref(post.href)) || {};
    return {
      ...post,
      view_count: Number(metric.view_count) || 0,
      unique_count: Number(metric.unique_count) || 0,
      last_viewed_at: metric.last_viewed_at || "",
    };
  });
}

function mobilePostRow(post, index, options = {}) {
  const href = postHref(post) || "posts.html";
  const views = Number(post.view_count) || 0;
  const meta = [post.category, postDate(post), `조회 ${fmt.format(views)}`].filter(Boolean).join(" · ");
  const rank = options.rank ? `<b>${escapeHtml(index + 1)}</b>` : "";
  return `
    <a class="mobile-board-row mobile-post-row" href="${escapeHtml(href)}">
      ${rank}
      <span>
        <strong>${escapeHtml(post.title)}</strong>
        <small>${escapeHtml(meta)}</small>
      </span>
    </a>
  `;
}

function renderPopularPosts(posts, metrics) {
  const target = document.getElementById("popularPosts");
  if (!target) return;
  const items = postsWithMetrics(posts, metrics);
  const hasViews = items.some((post) => Number(post.view_count) > 0);
  const sorted = items.sort((a, b) => {
    if (hasViews) return (Number(b.view_count) || 0) - (Number(a.view_count) || 0) || postDate(b).localeCompare(postDate(a));
    return postDate(b).localeCompare(postDate(a));
  }).slice(0, 3);
  target.innerHTML = sorted.length
    ? sorted.map((post, index) => mobilePostRow(post, index, { rank: true })).join("")
    : '<div class="inline-empty">표시할 인기 글이 없습니다.</div>';
}

function renderMobileTrendBoard(posts, metrics) {
  const target = document.getElementById("mobileTrendBoard");
  if (!target) return;
  const items = postsWithMetrics(posts, metrics).slice(0, 6);
  target.innerHTML = items.length
    ? items.map((post, index) => mobilePostRow(post, index)).join("")
    : '<div class="inline-empty">표시할 최신 글이 없습니다.</div>';
}

function latestDailyRow(strategy, kind) {
  const rows = Array.isArray(strategy.daily) ? strategy.daily.filter((row) => row.type !== "gap") : [];
  const daily = rows.slice().sort((a, b) => String(b.date || b.label || "").localeCompare(String(a.date || a.label || "")))[0];
  if (daily) return { ...daily, source: "daily" };
  if (kind !== "actual") return null;
  const positions = Array.isArray(strategy.open_positions) ? strategy.open_positions : [];
  if (!positions.length) return null;
  const openPnl = positions.reduce((sum, position) => sum + (Number(position.unrealized_pnl_krw) || 0), 0);
  return {
    date: strategy.summary?.updated_at || "오픈 포지션",
    pnl_krw: openPnl,
    cumulative_pnl_krw: strategy.summary?.total_pnl_krw,
    trade_count: strategy.summary?.open_position_count,
    source: "open",
  };
}

function renderMobileDailyBoard(data, targetId, kind) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const page = kind === "actual" ? "actual.html" : "simulation.html";
  const rows = allPerformanceStrategies(data || {}).map(({ asset, ...strategy }) => {
    const daily = latestDailyRow(strategy, kind);
    if (!daily) return null;
    const pnl = Number(daily.pnl_krw) || 0;
    const pnlClass = pnl < 0 ? "negative" : pnl > 0 ? "positive" : "neutral";
    const date = String(daily.date || "-").split(" ")[0];
    const source = daily.source === "open" ? "오픈" : "일별";
    const href = `${page}?asset=${encodeURIComponent(asset.code || "")}&strategy=${encodeURIComponent(strategy.code || "")}`;
    const meta = [asset.label || asset.market, date, `${source} ${fmt.format(Number(daily.trade_count) || 0)}건`].filter(Boolean).join(" · ");
    return { date, html: `
      <a class="mobile-board-row mobile-result-row" href="${escapeHtml(href)}">
        <span>
          <strong>${escapeHtml(strategy.name || strategy.code || "전략")}</strong>
          <small>${escapeHtml(meta)}</small>
        </span>
        <em class="${pnlClass}">${escapeHtml(krw(daily.pnl_krw))}</em>
      </a>
    ` };
  }).filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
  target.innerHTML = rows.length
    ? rows.map((row) => row.html).join("")
    : '<div class="inline-empty">표시할 전략 결과가 없습니다.</div>';
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
  target.innerHTML = items.length
    ? items.map(postItem).join("")
    : '<article class="post-item"><div><h3>표시할 글이 없습니다.</h3><p>글 데이터가 추가되면 이 영역에 표시됩니다.</p></div></article>';
}

function renderPostLoadError(message) {
  const latest = document.getElementById("latestPosts");
  const postList = document.getElementById("postList");
  const text = message || "글 데이터를 불러오지 못했습니다.";
  if (latest) latest.innerHTML = `<div class="inline-empty">${escapeHtml(text)}</div>`;
  if (postList) {
    postList.innerHTML = `
      <article class="post-item">
        <div>
          <h3>최신 글을 불러오지 못했습니다.</h3>
          <p>${escapeHtml(text)}</p>
        </div>
      </article>
    `;
  }
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

function homeAssetTrail(asset) {
  const market = String(asset.market || asset.code || "").toUpperCase();
  if (market.includes("KOSPI")) return ["KOSPI", "KOSPI200"];
  return ["코인", "비트코인"];
}

function renderPositionItems(strategy, asset) {
  const positions = Array.isArray(strategy.open_positions) ? strategy.open_positions : [];
  if (!positions.length) {
    const trail = homeAssetTrail(asset);
    const label = trail[1] || asset.label || strategy.market || "투자 소재";
    return `
      <li>
        <strong>${escapeHtml(label)}</strong>
        <span>오픈 포지션 ${fmt.format(Number(strategy.summary?.open_position_count) || 0)}개 · 실현손익 ${krw(strategy.summary?.total_pnl_krw)}</span>
      </li>
    `;
  }
  return positions.slice(0, 12).map((position) => {
    const pnl = Number(position.unrealized_pnl_krw);
    const pnlClass = pnl < 0 ? "negative" : pnl > 0 ? "positive" : "neutral";
    return `
      <li>
        <strong>${escapeHtml(position.symbol || "-")}</strong>
        <span class="${pnlClass}">${krw(position.unrealized_pnl_krw)} · ${pct(position.unrealized_return_pct)}</span>
      </li>
    `;
  }).join("");
}

function renderVisitorSummary(visitor) {
  const target = document.getElementById("visitorSummary");
  if (!target) return;
  const home = visitor?.home || {};
  const updated = visitor?.updated_at ? `업데이트 ${visitor.updated_at}` : "export 대기";
  const cards = [
    ["오늘 방문 집계", countValue(home.today_visitors), updated],
    ["최근 7일 방문 집계", countValue(home.last_7d_visitors), "GA4 home path 기준"],
    ["최근 30일 방문 집계", countValue(home.last_30d_visitors), "정기 export 집계"],
    ["누적 페이지 조회", countValue(home.total_pageviews), "개인정보 미포함 공개 집계"],
  ];
  target.innerHTML = cards.map(([label, value, hint]) => metricCard(label, value, hint)).join("");
}

function renderHomeLiveStatus(actual) {
  const target = document.getElementById("homeLiveStatus");
  if (!target) return;
  const assets = getPerformanceAssets(actual || {});
  target.innerHTML = assets.map((asset) => {
    const strategy = asset.strategies[0] || {};
    const summary = strategy.summary || {};
    const trail = homeAssetTrail(asset);
    const href = `actual.html?asset=${encodeURIComponent(asset.code || "")}&strategy=${encodeURIComponent(strategy.code || "")}`;
    const openPnl = Number(summary.open_unrealized_pnl_krw);
    const openPnlClass = openPnl < 0 ? "negative" : openPnl > 0 ? "positive" : "neutral";
    return `
      <article class="live-status-card">
        <div class="live-trail">${trail.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        <div class="live-status-head">
          <div>
            <h3>${escapeHtml(strategy.name || asset.label || "실거래 전략")}</h3>
            <p>${escapeHtml(strategy.market || asset.market || "-")} · ${escapeHtml(strategy.bar_interval || "-")}</p>
          </div>
          <a href="${escapeHtml(href)}">상세</a>
        </div>
        <div class="live-status-metrics">
          <div><span>실현손익</span><strong>${krw(summary.total_pnl_krw)}</strong></div>
          <div><span>오픈 포지션</span><strong>${fmt.format(Number(summary.open_position_count) || 0)}개</strong></div>
          <div><span>미실현 손익</span><strong class="${openPnlClass}">${krw(summary.open_unrealized_pnl_krw)}</strong></div>
        </div>
        <ul class="live-position-list">${renderPositionItems(strategy, asset)}</ul>
      </article>
    `;
  }).join("");
}

async function initHome() {
  const [home, posts] = await Promise.all([
    readOptionalJson("data/home.json"),
    readOptionalPostsData(),
  ]);

  if (home) {
    renderHomeIntro(home);
    renderPublisherBusinessAreas(home);
    renderPublicationList(home);
    renderDigitalProducts(home);
    renderContact(home);
  }

  if (posts) {
    renderLatestPosts(posts);
    renderResearchNotes(posts);
  } else {
    renderPostLoadError("연구 노트 데이터를 불러오지 못했습니다.");
  }
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
  const posts = await readPostsData();
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

function performanceChartRows(strategy, kind) {
  const rows = Array.isArray(strategy.daily) ? strategy.daily : [];
  const visibleRows = rows.filter((row) => row.type !== "gap");
  if (visibleRows.length || kind !== "actual") return rows;
  const positions = Array.isArray(strategy.open_positions) ? strategy.open_positions : [];
  let cumulative = 0;
  return positions.map((position) => {
    const pnl = Number(position.unrealized_pnl_krw) || 0;
    cumulative += pnl;
    return {
      type: "open_position",
      date: position.symbol || position.label || "-",
      label: position.symbol || position.label || "-",
      pnl_krw: pnl,
      cumulative_pnl_krw: cumulative,
    };
  });
}

function updatePerformanceChartTitle(strategy, kind) {
  const heading = document.querySelector("#performanceChart")?.closest("section")?.querySelector(".section-heading h2");
  if (!heading) return;
  const rows = Array.isArray(strategy.daily) ? strategy.daily.filter((row) => row.type !== "gap") : [];
  const positions = Array.isArray(strategy.open_positions) ? strategy.open_positions : [];
  heading.textContent = kind === "actual" && !rows.length && positions.length
    ? "오픈 포지션 평가손익 그래프"
    : "일별 손익 그래프";
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
  const isActual = document.body.dataset.kind === "actual";
  if (isActual) {
    target.innerHTML = [
      metricCard("누적 실현손익", krw(summary.total_pnl_krw), summary.period),
      metricCard("일평균 실현손익", krw(summary.daily_avg_pnl_krw)),
      metricCard("승률", pct(summary.win_rate_pct), `${fmt.format(Number(metrics.win_count) || 0)}승 / ${fmt.format(Number(metrics.loss_count) || 0)}패`),
      metricCard("실현 거래 수", `${fmt.format(Number(summary.trade_count) || 0)}건`),
      metricCard("오픈 포지션", `${fmt.format(Number(summary.open_position_count) || 0)}개`, `현재 투입 ${krwAmount(summary.open_budget_krw)}`),
      metricCard("최대 투입 예산", krwAmount(metrics.max_input_budget_krw), "단일 포지션 기준"),
      metricCard("현재 미실현 손익", krw(metrics.open_unrealized_pnl_krw), pct(metrics.open_unrealized_return_pct)),
      metricCard("누적 실현수익률", pct(metrics.cumulative_return_pct), "실현손익 / 투입 예산 기준"),
      metricCard("목표수익률 범위", `${pct(metrics.min_target_profit_pct)} ~ ${pct(metrics.max_target_profit_pct)}`, `평균 ${pct(metrics.avg_target_profit_pct)}`),
      metricCard("손익비", multiple(metrics.profit_factor), "실현 이익 / 실현 손실"),
    ].join("");
    return;
  }
  target.innerHTML = [
    metricCard("누적 손익", krw(summary.total_pnl_krw), summary.period),
    metricCard("일평균 손익", krw(summary.daily_avg_pnl_krw)),
    metricCard("승률", pct(summary.win_rate_pct)),
    metricCard("거래 수", `${fmt.format(Number(summary.trade_count) || 0)}건`),
    metricCard("최대 투입 예산", krwAmount(metrics.max_input_budget_krw), "단일 거래 기준"),
    metricCard("일 평균 투입 예산", krwAmount(metrics.daily_avg_input_budget_krw), "일별 투입 예산 평균"),
    metricCard("누적 수익률", pct(metrics.cumulative_return_pct), "누적 손익 / 누적 투입 예산"),
    metricCard("실현 수익률", pct(metrics.realized_return_pct), "실현손익 / 투입 예산 기준"),
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

function bindGlobalMenu() {
  const menuItems = Array.from(document.querySelectorAll(".menu-item.has-panel"));
  if (!menuItems.length) return;

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const closePanels = (except = null) => {
    menuItems.forEach((item) => {
      if (item === except) return;
      item.classList.remove("is-open");
      const link = Array.from(item.children).find((child) => child.classList?.contains("menu-link"));
      if (link) link.setAttribute("aria-expanded", "false");
    });
  };

  menuItems.forEach((item) => {
    const link = Array.from(item.children).find((child) => child.classList?.contains("menu-link"));
    const panel = Array.from(item.children).find((child) => child.classList?.contains("menu-panel"));
    if (!link || !panel) return;

    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");

    link.addEventListener("click", (event) => {
      if (!mobileQuery.matches || item.classList.contains("is-open")) return;
      event.preventDefault();
      closePanels(item);
      item.classList.add("is-open");
      link.setAttribute("aria-expanded", "true");
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".global-menu")) return;
    closePanels();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closePanels();
    document.activeElement?.blur?.();
  });

  mobileQuery.addEventListener?.("change", () => closePanels());
}
function renderSelectedPerformance() {
  const kind = document.body.dataset.kind || "backtest";
  const data = performanceState.data || {};
  const asset = selectedPerformanceAsset();
  const strategy = selectedPerformanceStrategy();
  const summary = strategy.summary || {};
  const returnMetrics = strategy.return_metrics || {};
  const rows = Array.isArray(strategy.daily) ? strategy.daily : [];
  const chartRows = performanceChartRows(strategy, kind);
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
  updatePerformanceChartTitle(strategy, kind);
  renderGaps(rows, kind);
  renderDailyPnlRows(rows);
  window.MediaMakCharts?.renderPerformanceChart(document.getElementById("performanceChart"), chartRows);
  if (performanceState.resizeHandler) {
    window.removeEventListener("resize", performanceState.resizeHandler);
  }
  performanceState.resizeHandler = () => {
    const selected = selectedPerformanceStrategy();
    window.MediaMakCharts?.renderPerformanceChart(document.getElementById("performanceChart"), performanceChartRows(selected, document.body.dataset.kind || "backtest"));
  };
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
  bindGlobalMenu();
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

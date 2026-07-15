(function () {
  "use strict";

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmtKrw(value) {
    const parsed = number(value);
    return `${parsed > 0 ? "+" : ""}${Math.round(parsed).toLocaleString("ko-KR")} KRW`;
  }

  function xFor(index, count, left, width) {
    if (count <= 1) return left;
    return left + (index / (count - 1)) * width;
  }

  function renderPerformanceChart(canvas, rows) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || canvas.width || 960);
    const height = Math.max(260, rect.height || canvas.height || 360);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const data = Array.isArray(rows) ? rows.filter((row) => row.type !== "gap") : [];
    if (!data.length) {
      ctx.fillStyle = "#667085";
      ctx.font = "14px Malgun Gothic, Arial";
      ctx.fillText("표시할 데이터가 없습니다.", 18, 32);
      return;
    }

    const pad = { left: 76, right: 22, top: 24, bottom: 58 };
    const plotW = Math.max(1, width - pad.left - pad.right);
    const plotH = Math.max(1, height - pad.top - pad.bottom);
    const values = data.flatMap((row) => [number(row.pnl_krw), number(row.cumulative_pnl_krw)]);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = Math.max(1, max - min);
    const yFor = (value) => pad.top + (1 - ((number(value) - min) / span)) * plotH;
    const zeroY = yFor(0);

    ctx.strokeStyle = "#d9dee8";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = pad.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#98a2b3";
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(width - pad.right, zeroY);
    ctx.stroke();

    const barW = Math.max(4, Math.min(18, plotW / data.length * 0.52));
    data.forEach((row, index) => {
      const pnl = number(row.pnl_krw);
      const x = xFor(index, data.length, pad.left, plotW) - barW / 2;
      const y = yFor(pnl);
      ctx.fillStyle = pnl >= 0 ? "#dc2626" : "#2563eb";
      ctx.fillRect(x, Math.min(y, zeroY), barW, Math.max(1, Math.abs(zeroY - y)));
    });

    ctx.beginPath();
    data.forEach((row, index) => {
      const x = xFor(index, data.length, pad.left, plotW);
      const y = yFor(row.cumulative_pnl_krw);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#172033";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#667085";
    ctx.font = "12px Malgun Gothic, Arial";
    ctx.textAlign = "left";
    ctx.fillText(fmtKrw(max), 8, pad.top + 4);
    ctx.fillText(fmtKrw(min), 8, pad.top + plotH + 4);

    const tickCount = Math.min(6, data.length);
    ctx.textBaseline = "top";
    for (let i = 0; i < tickCount; i += 1) {
      const index = Math.round((i * (data.length - 1)) / Math.max(1, tickCount - 1));
      const x = xFor(index, data.length, pad.left, plotW);
      ctx.fillStyle = "#475467";
      ctx.textAlign = i === 0 ? "left" : i === tickCount - 1 ? "right" : "center";
      ctx.fillText(String(data[index].date || data[index].label || "").slice(5), x, pad.top + plotH + 12);
    }
    ctx.textAlign = "left";
    ctx.fillText("막대: 일별 손익 / 선: 누적 손익", pad.left, height - 18);
  }

  window.MediaMakCharts = { renderPerformanceChart };
})();

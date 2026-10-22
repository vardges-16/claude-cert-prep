// Diagram generator: JSON spec -> inline SVG string (themed with the app's CSS variables).
// kinds: flow, seq, compare, hub, decision, layers, bar, grid, roadmap
const W = 720, PAD = 14;
const TONES = {
  default: { fill: "var(--paper)", stroke: "var(--line)", text: "var(--ink)", sub: "var(--ink-soft)" },
  hi:   { fill: "var(--arch-accent-soft)", stroke: "var(--arch-accent)", text: "var(--ink)", sub: "var(--ink-soft)" },
  ok:   { fill: "var(--good-soft)", stroke: "var(--good)", text: "var(--ink)", sub: "var(--ink-soft)" },
  bad:  { fill: "var(--bad-soft)", stroke: "var(--bad)", text: "var(--ink)", sub: "var(--ink-soft)" },
  warn: { fill: "var(--accent-soft)", stroke: "var(--accent)", text: "var(--ink)", sub: "var(--ink-soft)" },
  mute: { fill: "var(--paper-2)", stroke: "var(--line)", text: "var(--ink)", sub: "var(--ink-soft)" },
  dark: { fill: "var(--ink)", stroke: "var(--ink)", text: "#ffffff", sub: "#cfd8d4" }
};
const tone = t => TONES[t] || TONES.default;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CW = 0.56; // avg char width factor (conservative)

function wrap(text, maxPx, fs, warn, ctx) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const maxCh = Math.max(4, Math.floor(maxPx / (fs * CW)));
  const lines = []; let cur = "";
  for (let w of words) {
    while (w.length > Math.ceil(maxCh * 1.45)) { // hard-break very long tokens
      if (cur) { lines.push(cur); cur = ""; }
      lines.push(w.slice(0, maxCh - 1) + "-"); w = w.slice(maxCh - 1);
      if (warn) warn.push(`long token broken in ${ctx}: ${w.slice(0, 12)}`);
    }
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxCh) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

class Canvas {
  constructor(uid) { this.uid = uid; this.parts = []; this.warn = []; }
  add(s) { this.parts.push(s); }
  text(x, y, lines, o = {}) {
    const fs = o.fs || 13, lh = o.lh || fs + 4, anchor = o.anchor || "middle";
    const fill = o.fill || "var(--ink)", wt = o.bold ? 700 : (o.weight || 400);
    const tsp = lines.map((l, i) => `<tspan x="${x}" y="${(y + i * lh).toFixed(1)}">${esc(l)}</tspan>`).join("");
    this.add(`<text text-anchor="${anchor}" style="font-family:var(--sans);font-size:${fs}px;font-weight:${wt};fill:${fill}"${o.italic ? ' font-style="italic"' : ""}>${tsp}</text>`);
  }
  rect(x, y, w, h, t, o = {}) {
    const T = tone(t);
    this.add(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${o.rx ?? 10}" style="fill:${o.fill || T.fill};stroke:${T.stroke};stroke-width:${o.sw || 1.5}${o.dash ? ";stroke-dasharray:5 4" : ""}"/>`);
  }
  // box with title lines (+ optional sub lines), vertically centered
  box(x, y, w, h, t, lines, sub, o = {}) {
    this.rect(x, y, w, h, t, o);
    const T = tone(t), fs = o.fs || 13, lh = fs + 4, sfs = 11, slh = 14;
    const th = lines.length * lh + (sub && sub.length ? 3 + sub.length * slh : 0);
    let ty = y + (h - th) / 2 + fs;
    this.text(x + w / 2, ty, lines, { fs, lh, bold: o.bold !== false, fill: T.text });
    if (sub && sub.length) this.text(x + w / 2, ty + lines.length * lh + 3 - 1, sub, { fs: sfs, lh: slh, fill: T.sub });
  }
  line(x1, y1, x2, y2, o = {}) {
    this.add(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="stroke:${o.color || "var(--ink-soft)"};stroke-width:${o.sw || 1.6}${o.dash ? ";stroke-dasharray:5 4" : ""}"${o.arrow ? ` marker-end="url(#ah-${this.uid})"` : ""}/>`);
  }
  path(d, o = {}) {
    this.add(`<path d="${d}" fill="none" style="stroke:${o.color || "var(--ink-soft)"};stroke-width:${o.sw || 1.6}${o.dash ? ";stroke-dasharray:5 4" : ""}"${o.arrow ? ` marker-end="url(#ah-${this.uid})"` : ""}/>`);
  }
  circle(cx, cy, r, t, label, o = {}) {
    const T = tone(t);
    this.add(`<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${o.fill || T.stroke};stroke:none"/>`);
    this.text(cx, cy + 4, [label], { fs: o.fs || 11, bold: true, fill: "#fff" });
  }
  finish(h, spec) {
    const title = spec.title ? esc(spec.title) : "Diagram";
    const alt = esc(spec.alt || spec.title || "diagram");
    const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Math.ceil(h)}" role="img" aria-label="${alt}" style="width:100%;height:auto;display:block"><title>${title}</title>` +
      `<defs><marker id="ah-${this.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-soft)"/></marker></defs>`;
    if (h > 640) this.warn.push("tall diagram: " + Math.ceil(h));
    return head + this.parts.join("") + "</svg>";
  }
}

function titleBlock(c, spec) {
  if (!spec.title) return PAD;
  c.text(PAD, PAD + 10, [spec.title], { fs: 12, bold: true, anchor: "start", fill: "var(--ink-soft)" });
  return PAD + 26;
}
const lines = (c, t, w, fs, ctx) => wrap(t || "", w, fs, c.warn, ctx);

/* ---------------- flow ---------------- */
function flow(c, spec) {
  const steps = spec.steps, n = steps.length;
  const vertical = spec.dir === "v";
  const perRow = vertical ? 1 : (spec.perRow || (n <= 4 ? n : n <= 6 ? 3 : 4));
  const gap = perRow === 1 ? 0 : 32;
  const bw = vertical ? Math.min(460, W - 2 * PAD) : (W - 2 * PAD - (perRow - 1) * gap) / perRow;
  let y = titleBlock(c, spec);
  const rows = []; for (let i = 0; i < n; i += perRow) rows.push(steps.slice(i, i + perRow).map((s, k) => ({ s, i: i + k })));
  const boxPos = {};
  rows.forEach((row, ri) => {
    const info = row.map(({ s }) => ({ L: lines(c, s.t, bw - 18, 13, "flow step"), S: s.sub ? lines(c, s.sub, bw - 18, 11, "flow sub") : [] }));
    const h = Math.max(46, ...info.map(f => f.L.length * 17 + (f.S.length ? 4 + f.S.length * 14 : 0) + 18));
    const totalW = row.length * bw + (row.length - 1) * gap;
    const x0 = vertical ? (W - bw) / 2 : (spec.dir === "h" || !spec.center ? PAD + (W - 2 * PAD - totalW) / 2 : PAD);
    row.forEach(({ s, i }, k) => {
      const x = x0 + k * (bw + gap);
      c.box(x, y, bw, h, s.tone, info[k].L, info[k].S);
      if (spec.numbered) c.circle(x + 6, y + 6, 9, s.tone === "default" || !s.tone ? "hi" : s.tone, String(i + 1));
      boxPos[i] = { x, y, w: bw, h, ri };
      if (k > 0) { const p = boxPos[i - 1]; c.line(p.x + p.w + 2, y + h / 2, x - 3, y + h / 2, { arrow: true }); }
    });
    let nextY = y + h;
    const loops = (spec.loops || (spec.loop ? [spec.loop] : [])).filter(l => boxPos[l.from] && boxPos[l.to] && boxPos[l.from].ri === ri && boxPos[l.to].ri === ri);
    let extra = 0;
    loops.forEach((l, li) => {
      const a = boxPos[l.from], b = boxPos[l.to]; const drop = 20 + li * 18 + 0;
      const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2, yb = y + h;
      c.path(`M${x1},${yb + 2} V${yb + drop} H${x2} V${yb + 4}`, { arrow: true, color: "var(--accent)", dash: true });
      if (l.label) c.text((x1 + x2) / 2, yb + drop + 13, [l.label], { fs: 11, fill: "var(--ink-soft)", italic: true });
      extra = Math.max(extra, drop + 20);
    });
    nextY += extra;
    if (ri < rows.length - 1) {
      const last = row[row.length - 1], first = rows[ri + 1][0];
      const nx = vertical ? 0 : null;
      const yb = y + h + extra, ym = yb + 18;
      if (vertical) { const p = boxPos[last.i]; c.line(p.x + p.w / 2, y + h + 2, p.x + p.w / 2, ym + 14, { arrow: true }); }
      else {
        const rowW = row.length * bw + (row.length - 1) * gap, xr = boxPos[last.i].x + bw / 2;
        const nrow = rows[ri + 1]; const nTot = nrow.length * bw + (nrow.length - 1) * gap;
        const xn = PAD + (W - 2 * PAD - nTot) / 2 + bw / 2;
        c.path(`M${xr},${y + h + 2 + (extra ? extra - 4 : 0)} V${ym} H${xn} V${ym + 16}`, { arrow: true });
      }
      y = nextY + 36;
    } else y = nextY;
  });
  return y + PAD;
}

/* ---------------- seq ---------------- */
function seq(c, spec) {
  const actors = spec.actors, n = actors.length;
  const colW = (W - 2 * PAD) / n, xs = actors.map((_, i) => PAD + colW * (i + 0.5));
  let y = titleBlock(c, spec);
  const hw = Math.min(colW - 10, 150);
  const aInfo = actors.map(a => lines(c, a.t, hw - 12, 12, "actor"));
  const hh = Math.max(34, ...aInfo.map(l => l.length * 15 + 14));
  const top = y;
  actors.forEach((a, i) => c.box(xs[i] - hw / 2, y, hw, hh, a.tone || "mute", aInfo[i], null, { fs: 12 }));
  y += hh;
  const lifeStart = y; const body = [];
  let cy = y + 12;
  (spec.rows || []).forEach(r => {
    if (r.note) {
      const idx = Array.isArray(r.over) ? r.over : [r.over ?? 0];
      const x1 = Math.min(...idx.map(i => xs[i])) - (idx.length > 1 ? colW * 0.42 : colW * 0.46);
      const x2 = Math.max(...idx.map(i => xs[i])) + (idx.length > 1 ? colW * 0.42 : colW * 0.46);
      const w = Math.min(x2 - x1, W - 2 * PAD), xx = Math.max(PAD, Math.min(x1, W - PAD - w));
      const L = lines(c, r.note, w - 14, 11.5, "note"); const h = L.length * 14 + 12;
      body.push({ type: "note", x: xx, y: cy, w, h, L, tone: r.tone || "warn" }); cy += h + 12;
    } else {
      const xf = xs[r.f], xt = xs[r.t], self = r.f === r.t;
      const span = self ? colW * 1.4 : Math.abs(xt - xf) - 12;
      const L = lines(c, r.text, Math.max(span + 30, 150), 11.5, "msg"); const h = L.length * 14 + 20;
      body.push({ type: "msg", xf, xt, self, y: cy, L, h, dashed: r.dashed, tone: r.tone, x: self ? xf + 40 : (xf + xt) / 2 });
      cy += h + (self ? 16 : 4);
    }
  });
  const bottom = cy + 4;
  actors.forEach((_, i) => c.line(xs[i], lifeStart, xs[i], bottom, { color: "var(--line)", dash: true, sw: 1.4 }));
  body.forEach(b => {
    if (b.type === "note") { c.rect(b.x, b.y, b.w, b.h, b.tone, { rx: 6 }); c.text(b.x + b.w / 2, b.y + 17, b.L, { fs: 11.5, lh: 14, fill: "var(--ink)" }); }
    else if (b.self) {
      const ay = b.y + b.L.length * 14 + 6;
      c.path(`M${b.xf},${ay - 12} H${b.xf + 34} V${ay + 6} H${b.xf + 3}`, { arrow: true, dash: b.dashed, color: b.tone ? tone(b.tone).stroke : undefined });
      c.text(b.xf + 40, b.y + 10, b.L, { fs: 11.5, lh: 14, anchor: "start", fill: "var(--ink)" });
    } else {
      const ay = b.y + b.L.length * 14 + 6;
      c.text(b.x, b.y + 10, b.L, { fs: 11.5, lh: 14, fill: "var(--ink)" });
      const dir = b.xt > b.xf ? 1 : -1;
      c.line(b.xf + dir * 3, ay, b.xt - dir * 4, ay, { arrow: true, dash: b.dashed, color: b.tone ? tone(b.tone).stroke : undefined });
    }
  });
  return bottom + PAD;
}

/* ---------------- compare ---------------- */
function compare(c, spec) {
  let y = titleBlock(c, spec);
  const gap = 36, cw = (W - 2 * PAD - gap) / 2;
  const mk = col => ({ H: lines(c, col.title, cw - 20, 13, "cmp title"), I: (col.items || []).map(t => lines(c, t, cw - 34, 12, "cmp item")) });
  const L = mk(spec.left), R = mk(spec.right);
  const hh = (m) => m.H.length * 17 + 14 + m.I.reduce((s, l) => s + l.length * 15 + 5, 0) + 12;
  const h = Math.max(hh(L), hh(R));
  [[spec.left, L, PAD], [spec.right, R, PAD + cw + gap]].forEach(([col, m, x]) => {
    const T = tone(col.tone);
    c.rect(x, y, cw, h, col.tone);
    c.add(`<rect x="${x}" y="${y}" width="${cw}" height="${m.H.length * 17 + 14}" rx="10" style="fill:${T.stroke};opacity:.16"/>`);
    c.text(x + cw / 2, y + 20, m.H, { fs: 13, lh: 17, bold: true, fill: T.text });
    let iy = y + m.H.length * 17 + 14 + 14;
    m.I.forEach(l => { c.text(x + 14, iy, ["•"], { fs: 12, anchor: "start", fill: T.stroke, bold: true }); c.text(x + 26, iy, l, { fs: 12, lh: 15, anchor: "start", fill: "var(--ink)" }); iy += l.length * 15 + 5; });
  });
  c.circle(W / 2, y + h / 2, 15, "mute", spec.vs || "vs", { fill: "var(--ink-soft)" });
  y += h;
  if (spec.verdict) {
    const V = lines(c, spec.verdict, W - 2 * PAD - 28, 12.5, "verdict"); const vh = V.length * 16 + 16;
    c.rect(PAD, y + 14, W - 2 * PAD, vh, spec.verdictTone || "ok");
    c.text(W / 2, y + 14 + 20, V, { fs: 12.5, lh: 16, bold: true, fill: "var(--ink)" }); y += vh + 14;
  }
  return y + PAD;
}

/* ---------------- hub (and tree) ---------------- */
function hub(c, spec) {
  let y = titleBlock(c, spec);
  const sp = spec.spokes, n = sp.length;
  const perRow = spec.perRow || (n <= 4 ? n : Math.ceil(n / 2));
  const gap = 30, bw = (W - 2 * PAD - (perRow - 1) * gap) / perRow;
  const cw = Math.min(300, W - 2 * PAD);
  const CL = lines(c, spec.center.t, cw - 20, 14, "hub center"), CS = spec.center.sub ? lines(c, spec.center.sub, cw - 20, 11, "hub csub") : [];
  const ch = CL.length * 18 + (CS.length ? 4 + CS.length * 14 : 0) + 20;
  c.box((W - cw) / 2, y, cw, ch, spec.center.tone || "hi", CL, CS, { fs: 14 });
  const cx = W / 2, cy = y + ch; y = cy + 34;
  const rows = []; for (let i = 0; i < n; i += perRow) rows.push(sp.slice(i, i + perRow));
  const firstRowTops = [];
  rows.forEach((row, ri) => {
    const info = row.map(s => ({ L: lines(c, s.t, bw - 16, 12.5, "hub spoke"), S: s.sub ? lines(c, s.sub, bw - 16, 11, "hub sub") : [], I: (s.items || []).map(t => lines(c, t, bw - 28, 11, "hub item")) }));
    const h = Math.max(46, ...info.map(f => f.L.length * 16 + (f.S.length ? 4 + f.S.length * 14 : 0) + f.I.reduce((s, l) => s + l.length * 14 + 3, 0) + 20));
    const totalW = row.length * bw + (row.length - 1) * gap, x0 = PAD + (W - 2 * PAD - totalW) / 2;
    row.forEach((s, k) => {
      const x = x0 + k * (bw + gap), T = tone(s.tone);
      c.rect(x, y, bw, h, s.tone);
      let ty = y + 8 + 12.5;
      c.text(x + bw / 2, ty, info[k].L, { fs: 12.5, lh: 16, bold: true, fill: T.text }); ty += info[k].L.length * 16;
      if (info[k].S.length) { c.text(x + bw / 2, ty + 1, info[k].S, { fs: 11, lh: 14, fill: T.sub }); ty += 4 + info[k].S.length * 14; }
      info[k].I.forEach(l => { c.text(x + 10, ty + 2, ["•"], { fs: 11, anchor: "start", fill: T.stroke, bold: true }); c.text(x + 20, ty + 2, l, { fs: 11, lh: 14, anchor: "start", fill: "var(--ink)" }); ty += l.length * 14 + 3; });
      if (ri === 0) {
        const mx = x + bw / 2, bus = cy + 17;
        c.path(`M${cx},${cy + 1} V${bus} H${mx} V${y - 3}`, { arrow: true });
        firstRowTops.push({ x, mx, y, h, bw });
      }
    });
    if (ri === 0 && spec.forbidden && row.length > 1) {
      for (let k = 0; k < row.length - 1; k++) {
        const gx = x0 + (k + 1) * bw + k * gap + gap / 2, gy = y + h / 2;
        c.line(gx - gap / 2 + 3, gy, gx + gap / 2 - 3, gy, { color: "var(--bad)", dash: true, sw: 2 });
        c.circle(gx, gy, 9, "bad", "✕", { fs: 10 });
      }
    }
    y += h + (ri < rows.length - 1 ? 24 : 0);
  });
  if (spec.note) {
    const N = lines(c, spec.note, W - 2 * PAD - 28, 12, "hub note"); const nh = N.length * 15 + 14;
    c.rect(PAD, y + 14, W - 2 * PAD, nh, spec.noteTone || "warn", { rx: 8 }); c.text(W / 2, y + 14 + 19, N, { fs: 12, lh: 15, fill: "var(--ink)" }); y += nh + 14;
  }
  return y + PAD;
}

/* ---------------- decision ---------------- */
function decision(c, spec) {
  let y = titleBlock(c, spec);
  const q = spec.q, br = spec.branches, n = br.length;
  const qw = Math.min(420, W - 2 * PAD), QL = lines(c, q.t, qw - 24, 13.5, "decision q"), QS = q.sub ? lines(c, q.sub, qw - 24, 11, "decision sub") : [];
  const qh = QL.length * 17 + (QS.length ? 4 + QS.length * 14 : 0) + 22;
  c.box((W - qw) / 2, y, qw, qh, q.tone || "warn", QL, QS, { fs: 13.5, rx: 22 });
  const cx = W / 2, cy = y + qh; y = cy + 58;
  const gap = 18, bw = (W - 2 * PAD - (n - 1) * gap) / n;
  const info = br.map(b => ({ L: lines(c, b.t, bw - 16, 12.5, "branch"), S: b.sub ? lines(c, b.sub, bw - 16, 11, "branch sub") : [] }));
  const h = Math.max(50, ...info.map(f => f.L.length * 16 + (f.S.length ? 4 + f.S.length * 14 : 0) + 20));
  br.forEach((b, k) => {
    const x = PAD + k * (bw + gap), mx = x + bw / 2;
    c.box(x, y, bw, h, b.tone, info[k].L, info[k].S, { fs: 12.5 });
    c.path(`M${cx},${cy + 1} V${cy + 18} H${mx} V${y - 3}`, { arrow: true });
    if (b.label) { const LW = Math.max(40, b.label.length * 6.4 + 14); const lx = mx; c.rect(lx - LW / 2, y - 30, LW, 18, "mute", { rx: 9, fill: "var(--card)", sw: 1 }); c.text(lx, y - 17, [b.label], { fs: 11, bold: true, fill: "var(--ink-soft)" }); }
  });
  y += h;
  if (spec.note) { const N = lines(c, spec.note, W - 2 * PAD - 28, 12, "dec note"); const nh = N.length * 15 + 14; c.rect(PAD, y + 14, W - 2 * PAD, nh, "mute", { rx: 8 }); c.text(W / 2, y + 14 + 19, N, { fs: 12, lh: 15 }); y += nh + 14; }
  return y + PAD;
}

/* ---------------- layers ---------------- */
function layers(c, spec) {
  let y = titleBlock(c, spec);
  const bw = spec.narrow ? Math.min(560, W - 2 * PAD) : W - 2 * PAD, x = (W - bw) / 2;
  spec.layers.forEach((l, i) => {
    const tagW = l.tag ? Math.min(150, l.tag.length * 6.6 + 20) : 0;
    const L = lines(c, l.t, bw - 24 - (tagW ? tagW + 8 : 0), 13, "layer"), S = l.sub ? lines(c, l.sub, bw - 24 - (tagW ? tagW + 8 : 0), 11.5, "layer sub") : [];
    const h = Math.max(40, L.length * 17 + (S.length ? 3 + S.length * 14 : 0) + 18);
    c.rect(x, y, bw, h, l.tone);
    const T = tone(l.tone), th = L.length * 17 + (S.length ? 3 + S.length * 14 : 0), ty = y + (h - th) / 2 + 13;
    const tx = x + 14;
    c.text(tx, ty, L, { fs: 13, lh: 17, bold: true, anchor: "start", fill: T.text });
    if (S.length) c.text(tx, ty + L.length * 17 + 2, S, { fs: 11.5, lh: 14, anchor: "start", fill: T.sub });
    if (l.tag) { c.rect(x + bw - tagW - 10, y + h / 2 - 11, tagW, 22, "mute", { rx: 11, fill: "var(--card)", sw: 1 }); c.text(x + bw - tagW / 2 - 10, y + h / 2 + 4, [l.tag], { fs: 10.5, bold: true, fill: "var(--ink-soft)" }); }
    y += h;
    if (i < spec.layers.length - 1) { if (spec.arrows) { c.line(W / 2, y + 2, W / 2, y + 20, { arrow: true }); y += 24; } else y += 8; }
  });
  return y + PAD;
}

/* ---------------- bar ---------------- */
function bar(c, spec) {
  let y = titleBlock(c, spec);
  const segs = spec.segments, tot = segs.reduce((s, g) => s + g.v, 0), full = W - 2 * PAD, minW = 54;
  let ws = segs.map(g => Math.max(minW, full * g.v / tot)); const scale = full / ws.reduce((a, b) => a + b, 0); ws = ws.map(w => w * scale);
  let x = PAD; const bh = 46;
  segs.forEach((g, i) => {
    c.rect(x, y, ws[i], bh, g.tone, { rx: i === 0 || i === segs.length - 1 ? 10 : 2 });
    const L = lines(c, g.t, ws[i] - 8, 11.5, "bar seg"); if (L.length <= 2 && ws[i] > 90) c.text(x + ws[i] / 2, y + bh / 2 - (L.length - 1) * 7 + 4, L, { fs: 11.5, lh: 14, bold: true, fill: "var(--ink)" });
    x += ws[i];
  });
  y += bh + 18;
  segs.forEach(g => {
    const S = lines(c, (g.t + (g.sub ? " — " + g.sub : "")), W - 2 * PAD - 26, 12, "bar legend");
    c.rect(PAD, y - 10, 14, 14, g.tone, { rx: 3 }); c.text(PAD + 22, y + 1, S, { fs: 12, lh: 15, anchor: "start", fill: "var(--ink)" }); y += S.length * 15 + 6;
  });
  if (spec.note) { const N = lines(c, spec.note, W - 2 * PAD - 28, 12, "bar note"); const nh = N.length * 15 + 14; c.rect(PAD, y + 4, W - 2 * PAD, nh, "ok", { rx: 8 }); c.text(W / 2, y + 4 + 19, N, { fs: 12, lh: 15, bold: true }); y += nh + 4; }
  return y + PAD;
}

/* ---------------- grid ---------------- */
function grid(c, spec) {
  let y = titleBlock(c, spec);
  const cols = spec.cols, nc = cols.length, fw = Math.min(190, (W - 2 * PAD) * 0.3), cwid = (W - 2 * PAD - fw) / nc;
  const HL = cols.map(t => lines(c, t, cwid - 12, 12, "grid head")); const hh = Math.max(32, ...HL.map(l => l.length * 15 + 12));
  if (spec.corner) c.box(PAD, y, fw - 4, hh, "default", lines(c, spec.corner, fw - 16, 11.5), null, { fs: 11.5, bold: false });
  cols.forEach((t, i) => c.box(PAD + fw + i * cwid, y, cwid - 4, hh, "mute", HL[i], null, { fs: 12 }));
  y += hh + 4;
  spec.rows.forEach(r => {
    const RL = lines(c, r.h, fw - 16, 12, "grid rowhead"), CL = r.cells.map(ce => lines(c, ce.t, cwid - 14, 11.5, "grid cell"));
    const h = Math.max(38, RL.length * 15 + 14, ...CL.map(l => l.length * 14 + 14));
    c.box(PAD, y, fw - 4, h, "default", RL, null, { fs: 12 });
    r.cells.forEach((ce, i) => c.box(PAD + fw + i * cwid, y, cwid - 4, h, ce.tone, CL[i], null, { fs: 11.5, bold: false }));
    y += h + 4;
  });
  return y + PAD - 4;
}

/* ---------------- roadmap ---------------- */
function roadmap(c, spec) {
  let y = titleBlock(c, spec);
  const lw = 210, gap = 14, rw = W - 2 * PAD - lw - gap;
  spec.parts.forEach((p, i) => {
    const LL = lines(c, p.t, lw - 50, 13, "road part"), RL = lines(c, p.items.join("  →  "), rw - 20, 11.5, "road items");
    const h = Math.max(46, LL.length * 17 + 16, RL.length * 15 + 16);
    c.rect(PAD, y, lw, h, p.tone || "hi"); c.circle(PAD + 22, y + h / 2, 12, p.tone || "hi", String(p.n ?? i + 1), { fs: 12 });
    c.text(PAD + 42, y + (h - LL.length * 17) / 2 + 13, LL, { fs: 13, lh: 17, bold: true, anchor: "start", fill: "var(--ink)" });
    c.rect(PAD + lw + gap, y, rw, h, "default"); c.line(PAD + lw + 2, y + h / 2, PAD + lw + gap - 3, y + h / 2, { arrow: true });
    c.text(PAD + lw + gap + 10, y + (h - RL.length * 15) / 2 + 12, RL, { fs: 11.5, lh: 15, anchor: "start", fill: "var(--ink)" });
    y += h; if (i < spec.parts.length - 1) { c.line(PAD + lw / 2, y + 1, PAD + lw / 2, y + 13, { arrow: true }); y += 14; }
  });
  return y + PAD;
}

const KINDS = { flow, seq, compare, hub, decision, layers, bar, grid, roadmap };
function render(spec, uid) {
  const c = new Canvas(uid || "d" + Math.random().toString(36).slice(2, 7));
  const fn = KINDS[spec.kind];
  if (!fn) throw new Error("unknown kind " + spec.kind);
  const h = fn(c, spec);
  return { svg: c.finish(h, spec), warnings: c.warn, height: Math.ceil(h) };
}
if (typeof module !== "undefined" && module.exports) module.exports = { render, KINDS };
else window.renderDiagram = function (spec, uid) { try { return render(spec, uid).svg; } catch (e) { return ""; } };

'use strict';
/* ELOC · Criador de Fichas — lógica */
const KEY = 'eloc_fichas';
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sg = (n) => (n > 0 ? '+' + n : '' + n);
const STEPS = [['ident', 'Identidade'], ['estilo', 'Estilo de Vida'], ['especie', 'Espécie'], ['attrs', 'Atributos'], ['exv', 'Experiência de Vida'], ['equip', 'Equipamento'], ['habs', 'Habilidades'], ['palavras', 'Palavras'], ['vida', 'Sociedade e Vida'], ['conceito', 'Conceito'], ['ficha', 'Ficha']];
const N_REQ = 9, FICHA = 10, MAX_IMG = 16;
const DISTANCIAS = [['Adjacente', '1,5 m'], ['Curto', '3 m'], ['Médio', '6 m'], ['Longo', '12 m'], ['Distante', '24 m'], ['Longínquo', '30 m']];
const distDefault = (a) => a && a.nome === 'Armas Frásicas' ? 'Médio' : 'Adjacente';
const MAX_PREP = 5, MAX_CAUSAS = 6, MAX_PROF = 6;
const stepIdx = (k) => STEPS.findIndex(x => x[0] === k);

/* ---------- estado ---------- */
const zeroAttrs = () => Object.fromEntries(ATTRS.map(a => [a.key, null]));
function defaultState() {
  return {
    id: 'f_' + Date.now() + '_' + Math.floor(Math.random() * 1000), step: 0,
    nome: '', jogador: '', idade: '', genero: '', aparencia: '', historia: '', conexoes: '', anotacoes: '', imagens: [], fotoId: '', habSec: false,
    expv: 0, estilo: '', sub: '', especie: '', variante: '', attrs: zeroAttrs(), evo: {},
    armaP: '', armaS: '', armadura: '', distP: '', distS: '', habs: [], palavras: [], arca: [], sociedade: '',
    experiencias: [], dinheiro: '', inventario: '', daiscitida: { nome: '', notas: '' },
    atual: { pv: null, pi: null, pe: null, arm: null, causas: 0 }, estado: 'Saúde',
  };
}
function migrate(raw) {
  const d = defaultState(), r = JSON.parse(JSON.stringify(raw || {}));
  const s = Object.assign(d, r);
  s.attrs = Object.assign(zeroAttrs(), r.attrs || {});
  s.atual = Object.assign({ pv: null, pi: null, pe: null, arm: null, causas: 0 }, r.atual || {});
  s.daiscitida = Object.assign({ nome: '', notas: '' }, r.daiscitida || {});
  if (r.foto && !(Array.isArray(r.imagens) && r.imagens.length)) { s.imagens = [{ id: 'i0', src: r.foto }]; s.fotoId = 'i0'; }
  delete s.foto;
  ['habs', 'palavras', 'arca', 'experiencias', 'imagens'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  s.palavras = s.palavras.map(p => Object.assign(defaultPalavra(), { nome: p.nome || '', proj: p.proj || p.tipo || 'dano', entrega: p.entrega || '', sent: p.sent || '', sent2: p.sent2 || '', dado: p.dado === 12 || p.dadoUp ? 12 : 8, desc: p.desc || '' }));
  if (typeof s.evo !== 'object' || !s.evo) s.evo = {};
  delete s.qualidades; delete s.lingua; delete s.criada;
  s.expv = Math.max(0, Math.min(100, Math.round((parseInt(s.expv, 10) || 0) / 10) * 10));
  return s;
}
const GENEROS = ['Masculino', 'Feminino', 'Não-binário', 'Outro'];
const defaultPalavra = () => ({ nome: '', proj: 'dano', entrega: '', sent: '', sent2: '', dado: 8, desc: '' });
let S = defaultState();
let HELP = { open: false, tab: 'passo', focus: '' };
let carIdx = 0;

/* ---------- getters ---------- */
const fotoSrc = (s = S) => { const m = (s.imagens || []).find(i => i.id === s.fotoId); return m ? m.src : ''; };
const getEstilo = (s = S) => ESTILOS_VIDA.find(e => e.id === s.estilo);
const getSub = (s = S) => { const e = getEstilo(s); return e && e.subs.find(x => x.nome === s.sub); };
const getEspecie = (s = S) => ESPECIES.find(e => e.id === s.especie);
const getVar = (s = S) => { const e = getEspecie(s); return e && e.variantes.find(v => v.nome === s.variante); };
const poolOf = (s = S) => (getEspecie(s) && getEspecie(s).pool) || POOL_PADRAO;
const armaRow = (nome, rank, sec) => nome ? ((LIVRO.armasRank[rank] || {})[sec ? 'secundaria' : 'principal'] || []).find(a => a.nome === nome) : null;
const nomeValido = (n) => /^[\p{L}][\p{L}\s'’-]*$/u.test(String(n || '').trim()) && (String(n).match(/\p{L}/gu) || []).length >= 2;
const peso2qual = (p) => 'Experiente em Armas ' + (p === 'Leve' ? 'Leves' : p === 'Médio' ? 'Médias' : 'Pesadas');
const QUAL_ESCOLHA = () => LIVRO.qualidades.filter(q => !/^Experiente em Armas/.test(q.nome));

/* ---------- ExV (Experiência de Vida) ---------- */
function evoCompute(s) {
  const r = { tiers: [], attrAdd: Object.fromEntries(ATTRS.map(a => [a.key, 0])), pv: 0, pi: 0, pe: 0, desvio: 0, hab: 0, quals: [], prof: 1, exp: 2, sociedade: false, completo: true, lingAttr: '', expB: [] };
  const marks = new Set(), usadas = new Set(), rankCnt = {}, inc = {};
  const sub = getSub(s), inher = sub && sub.fx && sub.fx.qualidade;
  for (let pct = 20; pct <= s.expv; pct += 10) {
    const rk = rankOf(pct), ru = RANKUP[pct];
    if (ru) { r.exp += ru.exp || 0; r.prof += ru.prof || 0; r.hab += ru.hab || 0; r.pe += ru.pe || 0; if (ru.sociedade) r.sociedade = true; if (ru.limpaMarcas) marks.clear(); }
    const lista = EVO_LISTA[rk];
    const ev = s.evo[pct] || {};
    const picks = ev.picks || ['', ''], at = ev.attrs || ['', ''];
    const cnt = r.exp, exps = Array.isArray(ev.exps) ? ev.exps : ['', ''];
    const t = { pct, rank: rk, lista, cnt, ev: { picks, attrs: at, exps, qual: ev.qual || '', ling: ev.ling || '' }, ok: true, marked: [...marks], ru };
    r.hab += 1;
    if (!picks[0] || !picks[1] || picks[0] === picks[1] || !lista.includes(picks[0]) || !lista.includes(picks[1])) t.ok = false;
    picks.forEach(p => {
      if (!lista.includes(p)) return;
      rankCnt[rk] = rankCnt[rk] || {}; rankCnt[rk][p] = (rankCnt[rk][p] || 0) + 1; if (rankCnt[rk][p] > 2) t.ok = false; // máx. 2x cada opção por Rank
      if (p === 'pv') r.pv++; else if (p === 'pi') r.pi++; else if (p === 'pe') r.pe++; else if (p === 'desvio') r.desvio++;
      else if (p === 'hab') r.hab++; else if (p === 'prof') r.prof++;
    });
    if (picks.includes('atr')) {
      if (!at[0] || !at[1] || at[0] === at[1] || marks.has(at[0]) || marks.has(at[1])) t.ok = false;
      else at.forEach(k => { r.attrAdd[k]++; marks.add(k); });
    }
    if (picks.includes('exp')) {
      const ix = exps.map(x => (x === '' || x == null ? -1 : Number(x)));
      if (ix[0] < 0 || ix[1] < 0 || ix[0] === ix[1] || ix.some(i => i >= cnt)) t.ok = false; else ix.forEach(i => { inc[i] = (inc[i] || 0) + 1; });
    }
    if (picks.includes('qual')) {
      const q = t.ev.qual;
      if (!q || !QUAL_ESCOLHA().some(x => x.nome === q) || usadas.has(q) || q === inher) t.ok = false;
      else { usadas.add(q); r.quals.push(q); if (q === 'Multilingue') { if (LINGUAS.some(l => l.attr === t.ev.ling) && t.ev.ling !== langBase(s)) r.lingAttr = t.ev.ling; else t.ok = false; } }
    }
    if (!t.ok) r.completo = false;
    r.tiers.push(t);
  }
  r.expB = Array.from({ length: r.exp }, (_, i) => 2 + (inc[i] || 0));
  return r;
}

/* ---------- ficha calculada ---------- */
function qualidadesInerentes(s) {
  const out = [], sub = getSub(s), p = armaRow(s.armaP, rankOf(s.expv), false);
  if (p) out.push(peso2qual(p.peso));
  if (sub && sub.fx && sub.fx.qualidade) out.push(sub.fx.qualidade);
  return out;
}
function langBase(s) {
  const est = getEstilo(s), sub = getSub(s);
  if (est && est.id === 'fluente' && sub && sub.fx && sub.fx.lingua) return sub.fx.lingua; // sub-estilo de Fluente
  return 'MEM';                                                                             // por defeito: Memória
}
function langAttr(s) { const ev = evoCompute(s); return ev.lingAttr || langBase(s); } // Multilingue sobrepõe-se
function langWhy(s) {
  const ev = evoCompute(s), est = getEstilo(s), sub = getSub(s);
  if (ev.lingAttr) return 'Qualidade Multilingue';
  if (est && est.id === 'fluente' && sub && sub.fx && sub.fx.lingua) return 'Fluente · ' + sub.nome;
  return 'por defeito';
}
const LINGUA_NOME = { MEM: 'Mud', VIT: 'Elementalista', CAR: 'Melódica', FDV: 'Linfântica' };
function ignoraFardo(s) { const sub = getSub(s); return !!(sub && sub.fx && sub.fx.ignoraFardo) || evoCompute(s).quals.includes('Grandalhão'); }
function estiloHabsInerentes(s) {
  const e = getEstilo(s), rank = rankOf(s.expv), out = [];
  if (!e) return out;
  [2, 3, 4].forEach(r => { if (rank >= r && ESTILO_HABS[e.id][r]) out.push({ ...ESTILO_HABS[e.id][r], f: e.nome + ' · Rank ' + r }); });
  return out;
}
function computeSheet(s) {
  const ev = evoCompute(s), est = getEstilo(s), sub = getSub(s), esp = getEspecie(s), vr = getVar(s);
  const rank = rankOf(s.expv);
  const fxs = [sub && sub.fx, vr && vr.fx].filter(Boolean);
  const fx = (k) => fxs.reduce((t, f) => t + (f[k] || 0), 0);
  const has = (k) => fxs.some(f => f[k]);
  const arm = (ARMADURAS.rank[rank] || []).find(a => a[0] === s.armadura);
  const asp = arm ? ARMADURAS.aspeto[arm[0]] : null;
  const attr = {};
  ATTRS.forEach(a => { attr[a.key] = (s.attrs[a.key] == null ? 0 : s.attrs[a.key]) + ev.attrAdd[a.key] + (a.key === 'AGI' && asp && asp.agi ? asp.agi : 0); });
  const quals = qualidadesInerentes(s).concat(ev.quals);
  const prof = Math.min(MAX_PROF, ev.prof);
  let pi = (est ? est.pi : 0) + ev.pi + fx('pi');
  const piSet = fxs.find(f => f.piSet);
  if (piSet) pi = piSet.piSet + ev.pi;
  const inc = Math.max(0, Math.floor((s.expv - RANK_INICIO[rank]) / 10));
  let lim1 = arm ? arm[1] + inc : null, lim2 = arm ? arm[2] + inc : null;
  if (arm && has('limRank')) { lim1 += rank - 1; lim2 += rank - 1; }
  if (arm && has('limProf')) lim2 += prof;
  if (arm && est && est.id === 'hesitante' && rank >= 3) { lim1 += rank; lim2 += rank; }
  return {
    ev, est, sub, esp, vr, rank, prof, attr, quals, arm, asp, lim1, lim2,
    pv: (est ? est.pv : 0) + ev.pv, pi: Math.max(0, pi), pe: (est ? est.pe : 0) + ev.pe + fx('pe'),
    desvio: (est ? est.desvio : 0) + ev.desvio + fx('desvio') + (asp && asp.desvio ? asp.desvio : 0),
    desloc: 4 + fx('desloc') + (quals.includes('Rápido') ? 1 : 0),
    armBase: arm ? arm[3] + fx('armadura') : 0,
    pP: armaRow(s.armaP, rank, false), pS: armaRow(s.armaS, rank, true), lingAttr: langAttr(s),
  };
}

/* ---------- habilidades (por ordem) ---------- */
function weaponSeq(s) {
  const h = LIVRO.habilidades[HAB_KEY(s.armaP || '', false)];
  if (!h) return [];
  const out = [];
  for (let r = 1; r <= 4; r++) (h.ranks[r] || []).forEach(x => out.push({ id: h.nome + '|' + x.nome, arma: h.nome, rank: r, n: out.length + 1, ...x }));
  return out;
}
const habSlots = (s) => 1 + evoCompute(s).hab;
const habUsed = (s) => s.habs.length + s.palavras.length + (s.habSec ? 1 : 0);
const secHabOf = (s) => { const w = armaRow(s.armaS, rankOf(s.expv), true); const h = w && LIVRO.habilidades[HAB_KEY(s.armaS, true)]; return h && h.ranks['0'] && h.ranks['0'][0] ? { ...h.ranks['0'][0], arma: s.armaS } : null; };
const palavraOk = (p) => !!(p.nome.trim() && p.entrega && p.proj && (p.proj === 'dano' || p.sent));
function normalize() {
  if (!S.imagens.some(i => i.id === S.fotoId)) S.fotoId = S.imagens[0] ? S.imagens[0].id : '';
  const ev = evoCompute(S);
  for (let pct = 20; pct <= S.expv; pct += 10) if (!S.evo[pct]) S.evo[pct] = { picks: ['', ''], attrs: ['', ''], exps: ['', ''], qual: '', ling: '' };
  Object.keys(S.evo).forEach(k => { if (+k > S.expv || +k < 20) delete S.evo[k]; });
  Object.keys(S.evo).forEach(k => { if (!Array.isArray(S.evo[k].exps)) S.evo[k].exps = ['', '']; });
  while (S.experiencias.length < ev.exp) S.experiencias.push({ t: '', b: 2 });
  while (S.experiencias.length > ev.exp && !S.experiencias[S.experiencias.length - 1].t) S.experiencias.pop();
  const seq = weaponSeq(S).map(h => h.id);
  const keep = []; for (let i = 0; i < S.habs.length; i++) { if (S.habs[i] === seq[i]) keep.push(S.habs[i]); else break; }
  S.habs = keep;
  if (!S.armaS || !secHabOf(S)) S.habSec = false;
  if (!S.habs.length) { S.palavras = []; S.habSec = false; }
  const max = habSlots(S);
  while (habUsed(S) > max) { if (S.palavras.length) S.palavras.pop(); else if (S.habSec) S.habSec = false; else S.habs.pop(); }
  S.experiencias.forEach((e, i) => { e.b = ev.expB[i] != null ? ev.expB[i] : 2; });
  if (S.armaS) {
    const p = armaRow(S.armaP, 1, false), row = armaRow(S.armaS, 1, true);
    if (!row || (p && p.fardo === 'Duas mãos' && !ignoraFardo(S))) S.armaS = '';
  }
  const ids = S.habs.concat(S.palavras.map((_, i) => 'P|' + i), S.habSec ? ['SEC'] : []);
  S.arca = S.arca.filter(a => ids.includes(a));
  carIdx = Math.max(0, Math.min(carIdx, Math.max(0, S.palavras.length - 1)));
}

/* ---------- validação ---------- */
function attrsOk(s) { const p = poolOf(s).slice().sort((a, b) => a - b), v = ATTRS.map(a => s.attrs[a.key]); return v.every(x => x != null) && JSON.stringify(v.slice().sort((a, b) => a - b)) === JSON.stringify(p); }
function stepDone(i, s = S) {
  switch (STEPS[i][0]) {
    case 'ident': return nomeValido(s.nome);
    case 'estilo': return !!getEstilo(s) && !!getSub(s);
    case 'especie': return !!getEspecie(s) && !!getVar(s);
    case 'attrs': return attrsOk(s);
    case 'exv': return evoCompute(s).completo;
    case 'equip': return !!armaRow(s.armaP, rankOf(s.expv), false) && !!s.armadura;
    case 'habs': return s.habs.length >= 1 && habUsed(s) === habSlots(s);
    case 'palavras': return s.palavras.every(palavraOk);
    case 'vida': return s.experiencias.length > 0 && s.experiencias.every(e => e.t.trim()) && (s.expv < 20 || !!s.sociedade);
    default: return true;
  }
}
function progresso() { let d = 0; const f = []; for (let i = 0; i < N_REQ; i++) { if (stepDone(i)) d++; else f.push(STEPS[i][1]); } return { d, f, pct: Math.round(d / N_REQ * 100) }; }

/* ---------- armazenamento ---------- */
let saveT = null, lastSaved = '', saveStatus = '';
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
const saveAll = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); return true; } catch (e) { return false; } };
function autosave() {
  const snap = JSON.stringify(S);
  if (snap === lastSaved) return;
  if (!S.nome.trim() && !S.estilo && !S.especie && !S.armaP) return;
  const l = loadAll(), i = l.findIndex(f => f.id === S.id), rec = { id: S.id, raw: JSON.parse(snap) };
  if (i >= 0) l[i] = rec; else l.push(rec);
  saveStatus = saveAll(l) ? 'ok' : 'erro'; if (saveStatus === 'ok') lastSaved = snap;
  renderSaveStatus();
}
function autosaveSoon() { saveStatus = 'a guardar…'; renderSaveStatus(); clearTimeout(saveT); saveT = setTimeout(autosave, 350); }
function renderSaveStatus() { const e = $('save-status'); if (e) e.textContent = saveStatus === 'ok' ? '✓ Guardado neste dispositivo' : saveStatus === 'erro' ? 'Não foi possível guardar' : saveStatus; }

/* ---------- vistas ---------- */
let lastStep = -1;
function showView(v) {
  lastStep = -1;
  $('view-list').hidden = v !== 'list'; $('view-editor').hidden = v !== 'editor';
  $('help').hidden = v !== 'editor'; document.body.classList.toggle('editing', v === 'editor'); window.scrollTo(0, 0);
  if (v === 'list') renderList();
}
function openFicha(id) {
  const rec = loadAll().find(f => f.id === id); if (!rec) return;
  S = migrate(rec.raw); S.id = id; carIdx = 0; normalize(); lastSaved = JSON.stringify(S);
  const f = [...Array(N_REQ).keys()].find(i => !stepDone(i));
  S.step = f == null ? FICHA : f; showView('editor'); mount();
}
function novaFicha() { S = defaultState(); lastSaved = ''; carIdx = 0; normalize(); showView('editor'); mount(); }
function sair() { clearTimeout(saveT); autosave(); showView('list'); }

function renderList() {
  const l = loadAll();
  $('list-body').innerHTML = l.length ? l.map(f => {
    const s = migrate(f.raw), e = getEstilo(s), sp = getEspecie(s);
    return `<article class="fcard">
      <div class="fc-av">${fotoSrc(s) ? `<img src="${fotoSrc(s)}" alt="">` : `<span>${esc((s.nome.trim()[0] || '?').toUpperCase())}</span>`}</div>
      <div class="fc-txt"><h3>${esc(s.nome || 'Sem nome')}</h3>
        <p>${esc([sp && sp.nome, e && e.nome, 'Rank ' + rankOf(s.expv) + ' · ExV ' + s.expv + '%'].filter(Boolean).join(' · '))}</p></div>
      <div class="fc-btns"><button class="btn sm" data-act="abrir" data-id="${esc(f.id)}"><span>Abrir</span></button>
        <button class="btn sm ghost" data-act="export" data-id="${esc(f.id)}"><span>JSON</span></button>
        <button class="btn sm danger" data-act="apagar" data-id="${esc(f.id)}"><span>Apagar</span></button></div></article>`;
  }).join('') : '<p class="empty">Ainda não tens fichas. Cria a primeira.</p>';
}

/* ---------- chrome do editor ---------- */
function mount(keepBody) {
  normalize();
  renderHead(); renderMenu(); renderProgress(); renderNav();
  if (!keepBody) { const b = $('ed-body'); b.innerHTML = renderStep(); const ch = lastStep !== S.step; lastStep = S.step; b.classList.remove('enter'); const card = b.closest('.ed-card'); if (card) card.classList.remove('sweep'); if (ch) { void b.offsetWidth; b.classList.add('enter'); if (card) card.classList.add('sweep'); } }
  renderHelp(); renderSaveStatus(); autosaveSoon();
}
function refreshChrome() { normalize(); renderHead(); renderMenu(); renderProgress(); renderNav(); renderSaveStatus(); autosaveSoon(); }
function renderHead() {
  const sh = computeSheet(S);
  const linha = [sh.esp && sh.esp.nome, sh.est && sh.est.nome, 'Rank ' + sh.rank].filter(Boolean).join(' · ');
  $('ed-head').innerHTML = `<h1 class="ed-title">${S.nome.trim() ? esc(S.nome.trim()) : 'Novo personagem'}</h1><p class="ed-sub">${esc(linha)}</p>`;
}
function renderMenu() {
  $('ed-tabs').innerHTML = STEPS.map(([k, l], i) => {
    const done = i < N_REQ && stepDone(i);
    return `<button class="tab ${i === S.step ? 'active' : ''} ${done ? 'done' : ''}" data-act="goto" data-i="${i}"><span class="tn">${done ? '✓' : i + 1}</span><span class="tl">${l}</span></button>`;
  }).join('');
}
function renderProgress() {
  const p = progresso();
  $('progress-fill').style.width = p.pct + '%';
  $('progress-text').textContent = p.d >= N_REQ ? 'Ficha completa' : `${p.d}/${N_REQ} etapas · falta: ${p.f.slice(0, 3).join(', ')}${p.f.length > 3 ? '…' : ''}`;
}
function renderNav() {
  const i = S.step;
  $('ed-nav').innerHTML = `<button class="btn ghost" data-act="sair"><span>← Fichas</span></button><span class="spacer"></span><span id="save-status" class="save-status"></span>
    ${i > 0 ? '<button class="btn ghost" data-act="prev"><span>‹ Anterior</span></button>' : ''}${i < FICHA ? '<button class="btn primary" data-act="next"><span>Seguinte ›</span></button>' : ''}`;
}
function renderHelp() {
  const key = STEPS[S.step][0], [t, html] = AJUDA[key];
  $('help').classList.toggle('open', HELP.open);
  const ev = evoCompute(S), mine = ev.quals.concat(qualidadesInerentes(S));
  $('help-body').innerHTML = HELP.tab === 'passo' ? `<h3>${t}</h3>${html}`
    : HELP.tab === 'qual' ? `<h3>Qualidades</h3><p class="note">Descrição de cada Qualidade. As tuas aparecem a dourado.</p>${LIVRO.qualidades.map(q => `<div class="qdesc ${mine.includes(q.nome) ? 'mine' : ''} ${HELP.focus === q.nome ? 'focus' : ''}" data-q="${esc(q.nome)}"><div class="hab-h"><b>${esc(q.nome)}</b><span class="tag">${esc(q.custo)}</span></div><p>${esc(q.texto)}</p></div>`).join('')}`
    : AJUDA_GERAL.map(([h, x]) => `<details><summary>${h}</summary>${x}</details>`).join('');
  document.querySelectorAll('.help-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === HELP.tab));
  if (HELP.tab === 'qual' && HELP.focus) { const f = $('help-body').querySelector('.focus'); if (f) f.scrollIntoView({ block: 'center' }); }
}

const head = (t, d) => `<h2 class="step-title"><span>${t}</span></h2>${d ? `<p class="step-desc">${d}</p>` : ''}`;
function renderStep() {
  switch (STEPS[S.step][0]) {
    case 'ident': return stepIdent(); case 'estilo': return stepEstilo(); case 'especie': return stepEspecie();
    case 'attrs': return stepAttrs(); case 'exv': return stepExv(); case 'equip': return stepEquip();
    case 'habs': return stepHabs(); case 'palavras': return stepPalavras(); case 'vida': return stepVida(); case 'conceito': return stepConceito(); default: return stepFicha();
  }
}
const habCard = (h, extra = '') => `<div class="hab ${extra}"><div class="hab-h"><b>${esc(h.nome)}</b><span class="tag">${esc(h.custo || '')}</span></div><p>${esc(h.texto)}</p></div>`;
const sel = (opts, cur, attrs, ph = 'Escolhe') => `<select ${attrs}>${ph !== null ? `<option value="">${ph}</option>` : ''}${opts.map(o => `<option value="${esc(o.v)}" ${String(cur) === String(o.v) ? 'selected' : ''} ${o.dis ? 'disabled' : ''}>${esc(o.t)}</option>`).join('')}</select>`;

/* ---- Identidade ---- */
function moodHTML() {
  const ims = S.imagens;
  return `<div class="mood">${ims.length < MAX_IMG ? `<label class="mimg madd"><span>+</span><small>Adicionar imagens</small><input type="file" accept="image/*" multiple data-imgs hidden></label>` : ''}${ims.map(im => `<figure class="mimg ${im.id === S.fotoId ? 'main' : ''}"><img src="${im.src}" alt="Imagem do personagem"><span class="mbadge">★ Principal</span><div class="mact"><button data-act="img-main" data-v="${im.id}" ${im.id === S.fotoId ? 'disabled' : ''}>★ Principal</button><button class="x" data-act="img-rm" data-v="${im.id}" aria-label="Remover imagem">×</button></div></figure>`).join('')}</div>
  <p class="muted sm">${ims.length}/${MAX_IMG} imagens · a que tem ★ é a foto principal da ficha. Passa o rato (ou toca) numa imagem para a escolher.</p>`;
}
function readImg(f) {
  return new Promise(res => {
    const r = new FileReader();
    r.onerror = () => res(null);
    r.onload = () => { const img = new Image(); img.onerror = () => res(null); img.onload = () => { const k = Math.min(1, 560 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.78)); }; img.src = r.result; };
    r.readAsDataURL(f);
  });
}
function stepIdent() {
  const bad = !nomeValido(S.nome), rank = rankOf(S.expv);
  return `${head('Identidade', 'Quem é o teu personagem?')}
  <div class="id-grid"><div class="id-l">
  <div class="grid g2">
    <label class="field span2"><span>Nome *</span><input type="text" id="in-nome" data-p="nome" value="${esc(S.nome)}" class="${bad ? 'invalid' : ''}" placeholder="Ex: Aurosa Lefebvre" autocomplete="off"><em class="err" id="nome-erro" ${bad ? '' : 'hidden'}>Pelo menos duas letras; só letras, espaços, hífen ou apóstrofo.</em></label>
    <label class="field"><span>Idade · opcional</span><input type="text" data-p="idade" value="${esc(S.idade)}"></label>
    <label class="field"><span>Género</span>${sel(GENEROS.map(g => ({ v: g, t: g })), S.genero, 'data-p="genero"', 'Escolhe')}</label>
    <label class="field span2"><span>Jogador · opcional</span><input type="text" data-p="jogador" value="${esc(S.jogador)}"></label>
  </div>
  <h3 class="sec">Experiência de Vida</h3>
  <div class="card slash-card"><div class="grid g2"><label class="field"><span>ExV (%)</span>${sel(Array.from({ length: 11 }, (_, i) => ({ v: i * 10, t: i * 10 + '%' })), S.expv, 'data-p="expv" data-num data-re', null)}</label>
    <div class="field"><span>Rank</span><div class="bigrank">Rank ${rank}</div></div></div>
    <p class="muted sm">Um personagem novo começa a 0%. A 10% só escolhes o Estilo de Vida; as escolhas de ExV começam aos 20%. Rank 1 · 0–10% · Rank 2 · 20–40% · Rank 3 · 50–70% · Rank 4 · 80–100%.</p></div>
  </div><div class="id-r"><h3 class="sec first">Imagens do personagem <small>coleção</small></h3>${moodHTML()}</div></div>`;
}

/* ---- Estilo ---- */
function stepEstilo() {
  const e = getEstilo();
  return `${head('Estilo de Vida', '«Quem desejas viver como, ou como mereces viver.» A 10% de ExV (Rank 1) esta é a tua única escolha.')}
  <div class="pick3">${ESTILOS_VIDA.map(x => `<button class="pick ${S.estilo === x.id ? 'on' : ''}" data-act="estilo" data-v="${x.id}">
    <b>${x.nome}</b><i>${x.apelido}</i><q>${x.cit}</q><div class="stats"><span>Desvio <b>${x.desvio}</b></span><span>PV <b>${x.pv}</b></span><span>PI <b>${x.pi}</b></span><span>PE <b>${x.pe}</b></span></div></button>`).join('')}</div>
  ${e ? `<h3 class="sec">Sub-estilo <small>escolhe 1</small></h3><div class="hablist">${e.subs.map(x => `<button class="hab pickable ${S.sub === x.nome ? 'on' : ''}" data-act="sub" data-v="${esc(x.nome)}"><div class="hab-h"><b>${esc(x.nome)}</b><span class="tag">${esc(x.custo)}</span></div><p>${esc(x.texto)}</p></button>`).join('')}</div>
  <h3 class="sec">Habilidades do Estilo <small>inerentes, por Rank</small></h3><div class="hablist">${[2, 3, 4].map(r => { const h = ESTILO_HABS[e.id][r]; return `<div class="hab ${rankOf(S.expv) < r ? 'locked' : ''}"><div class="hab-h"><b>${esc(h.nome)}</b><span class="tag">Rank ${r} · ${esc(h.custo)}</span></div><p>${esc(h.texto)}</p></div>`; }).join('')}</div>` : '<p class="muted">Escolhe um Estilo para veres os sub-estilos.</p>'}`;
}

/* ---- Espécie ---- */
function stepEspecie() {
  const e = getEspecie();
  return `${head('Espécie', 'Escolhe a espécie e a variante.')}
  <div class="chips">${ESPECIES.map(x => `<button class="chip ${S.especie === x.id ? 'on' : ''}" data-act="especie" data-v="${x.id}">${x.nome}${x.sub ? '<small>subespécie de Humano</small>' : ''}</button>`).join('')}</div>
  ${e ? `<div class="card slash-card"><h4>${e.nome}</h4><p class="muted">${esc(e.texto)}</p>${habCard(e.hab)}</div>
  <h3 class="sec">Variante <small>escolhe 1</small></h3><div class="hablist">${e.variantes.map(v => `<button class="hab pickable ${S.variante === v.nome ? 'on' : ''}" data-act="variante" data-v="${esc(v.nome)}"><div class="hab-h"><b>${esc(v.nome)}</b><span class="tag">${esc(v.hab.custo)}</span></div><p><b>${esc(v.hab.nome)}.</b> ${esc(v.hab.texto)}</p></button>`).join('')}</div>
  ${e.daiscitida ? `<h3 class="sec">Daíscitida</h3><div class="card"><p class="muted sm">Faz um teste da tua Língua, gastando 1 PE, para o Daíscitida entrar em Cena. Tem PV próprios e usa a tua proficiência no dano.</p>
    <div class="grid g2"><label class="field"><span>Nome</span><input type="text" data-p="daiscitida.nome" value="${esc(S.daiscitida.nome)}"></label>
    <label class="field"><span>Aparência / notas</span><input type="text" data-p="daiscitida.notas" value="${esc(S.daiscitida.notas)}" placeholder="animal esquelético, cor das pedras…"></label></div></div>` : ''}` : ''}`;
}

/* ---- Atributos ---- */
function stepAttrs() {
  const pool = poolOf(), used = ATTRS.map(a => S.attrs[a.key]).filter(v => v != null);
  const rem = pool.slice(); used.forEach(v => { const i = rem.indexOf(v); if (i >= 0) rem.splice(i, 1); });
  const sh = computeSheet(S);
  const fmt = pool.slice().sort((x, y) => x - y).map(v => (v > 0 ? '+' + v : '' + v)).join(' ; ');
  return `${head('Atributos', 'Distribui <b>' + fmt + '</b> pelos seis atributos, um valor por atributo.')}
  <div class="pool">${rem.length ? rem.slice().sort((x, y) => x - y).map(v => `<span class="pip">${sg(v)}</span>`).join('') : '<span class="ok">Tudo distribuído ✓</span>'}
    <button class="btn sm ghost" data-act="attrs-clear"><span>Limpar</span></button></div>
  <div class="attrgrid">${ATTRS.map(a => {
    const cur = S.attrs[a.key], opts = [...new Set(pool)].sort((x, y) => x - y).map(v => ({ v, t: sg(v), dis: !(rem.includes(v) || cur === v) }));
    return `<div class="attr"><b>${a.name}</b><small>${a.pericias}</small>${sel(opts, cur == null ? '' : cur, 'data-p="attrs.' + a.key + '" data-num data-re', '—')}<div class="final">Final <b>${sg(sh.attr[a.key])}</b></div></div>`;
  }).join('')}</div>`;
}

/* ---- Experiência de Vida ---- */
function stepExv() {
  const ev = evoCompute(S);
  if (S.expv < 20) return `${head('Experiência de Vida')}<div class="card"><p>${S.expv === 10 ? 'A 10% de ExV só escolhes o <b>Estilo de Vida</b>, que já fizeste.' : 'A 0% de ExV ainda não tens escolhas.'} As escolhas de ExV começam aos <b>20%</b>. Sobe a ExV na etapa <b>Identidade</b> se o personagem começar mais adiantado.</p></div>`;
  const taken = (pct) => ev.tiers.filter(t => t.pct !== pct && t.ev.picks.includes('qual')).map(t => t.ev.qual);
  const inher = qualidadesInerentes(S);
  return `${head('Experiência de Vida', 'Cada 10% de ExV (a partir dos 20%) dá duas opções da lista do teu Rank e +1 Habilidade. Cada opção só pode ser escolhida 2 vezes por Rank. Os extras de Rank aplicam-se automaticamente.')}
  ${ev.tiers.map(t => {
    const usedIn = (x) => ev.tiers.filter(o => o.rank === t.rank && o.pct !== t.pct && o.ev.picks.includes(x)).length;
    const sub = (i) => sel(t.lista.filter(x => x !== t.ev.picks[1 - i]).map(x => ({ v: x, t: EVO_OPCOES[x] + (usedIn(x) ? ` (${usedIn(x)}/2 neste Rank)` : ''), dis: usedIn(x) >= 2 })), t.ev.picks[i], `data-p="evo.${t.pct}.picks.${i}" data-re`);
    const exps = t.ev.picks.includes('exp') ? `<div class="grid g2">${[0, 1].map(i => sel(Array.from({ length: t.cnt }, (_, k) => ({ v: k, t: (k + 1) + '. ' + ((S.experiencias[k] && S.experiencias[k].t.trim()) || 'Experiência ' + (k + 1)), dis: String(t.ev.exps[1 - i]) === String(k) })), t.ev.exps[i], `data-p="evo.${t.pct}.exps.${i}" data-re`, 'Experiência +1')).join('')}</div>` : '';
    const atrs = t.ev.picks.includes('atr') ? `<div class="grid g2">${[0, 1].map(i => sel(ATTRS.map(a => ({ v: a.key, t: a.name + (t.marked.includes(a.key) ? ' (marcado)' : ''), dis: t.marked.includes(a.key) || t.ev.attrs[1 - i] === a.key })), t.ev.attrs[i], `data-p="evo.${t.pct}.attrs.${i}" data-re`, 'Atributo +1')).join('')}</div>` : '';
    const ban = taken(t.pct).concat(inher);
    const qual = t.ev.picks.includes('qual') ? `<div class="grid g2 qrow"><label class="field"><span>Qualidade</span>${sel(QUAL_ESCOLHA().map(q => ({ v: q.nome, t: q.nome + (q.custo === 'Passiva' ? '' : ' · ' + q.custo), dis: ban.includes(q.nome) })), t.ev.qual, `data-p="evo.${t.pct}.qual" data-re data-qual`)}</label>
      <div class="field"><span>Descrição</span><button class="btn sm" data-act="help-qual" data-v="${esc(t.ev.qual)}"><span>Ver na barra lateral →</span></button></div>
      ${t.ev.qual === 'Multilingue' ? `<label class="field span2"><span>Multilingue: passas a usar a Língua…</span>${sel(LINGUAS.map(l => ({ v: l.attr, t: l.nome + ' · ' + ATTRS.find(a => a.key === l.attr).name, dis: l.attr === langBase(S) })), t.ev.ling, `data-p="evo.${t.pct}.ling" data-re`, 'Escolhe a Língua')}</label>` : ''}</div>` : '';
    return `<div class="card tier ${t.ok ? 'ok' : ''}"><div class="tier-h"><span class="pct">${t.pct}%</span><span class="tag">Rank ${t.rank}</span>${t.ok ? '<span class="okmark">✓</span>' : ''}</div>
      ${t.ru ? `<p class="rankup">⬆ Rank ${rankOf(t.pct)}: ${t.ru.texto}</p>` : ''}
      <div class="grid g2"><label class="field"><span>Opção 1</span>${sub(0)}</label><label class="field"><span>Opção 2</span>${sub(1)}</label></div>${atrs}${exps}${qual}
      <p class="muted sm">+1 Habilidade (de arma ou Palavra, nas etapas Habilidades e Palavras).</p></div>`;
  }).join('')}`;
}

/* ---- Equipamento ---- */
function armaCard(a, act, cur, dis, motivo) {
  return `<button class="wcard ${cur === a.nome ? 'on' : ''}" ${dis ? 'disabled' : ''} data-act="${act}" data-v="${esc(a.nome)}"><b>${esc(a.nome)}</b>
    <div class="w-row"><span>${esc(a.attr)}</span><span class="dmg">${esc(a.dano)}</span></div><div class="w-row sm"><span>${esc(a.fardo)}</span><span>${esc(a.peso)}</span></div>${dis && motivo ? `<em class="sm">${motivo}</em>` : ''}</button>`;
}
function stepEquip() {
  const rank = rankOf(S.expv), t = LIVRO.armasRank[rank], p = armaRow(S.armaP, rank, false);
  const duas = p && p.fardo === 'Duas mãos' && !ignoraFardo(S);
  const sh = computeSheet(S);
  const hs = armaRow(S.armaS, rank, true) && LIVRO.habilidades[HAB_KEY(S.armaS, true)];
  return `${head('Equipamento', 'Rank ' + rank + '. Armas de outro Peso que a principal dão Desvantagem nos ataques.')}
  <h3 class="sec">Arma principal <small>obrigatória</small></h3>
  <div class="wgrid">${t.principal.map(a => armaCard(a, 'armaP', S.armaP)).join('')}</div>
  ${p ? `<p class="muted sm">${esc(p.nome)} · usa <b>${esc(p.attr)}</b> · ${esc(p.fardo)} · ${esc(p.peso)}. Qualidade obrigatória: <b>${peso2qual(p.peso)}</b>.</p>` : ''}
  <h3 class="sec">Arma secundária <small>opcional</small></h3>
  ${duas ? '<p class="muted sm">Armas de duas mãos não permitem arma secundária em simultâneo (salvo Lutador ou a Qualidade Grandalhão).</p>' : ''}
  <div class="wgrid">${t.secundaria.map(a => armaCard(a, 'armaS', S.armaS, duas || !p, duas ? 'Principal de duas mãos' : '')).join('')}</div>
  ${S.armaS && p && armaRow(S.armaS, rank, true) && armaRow(S.armaS, rank, true).peso !== p.peso ? '<p class="warn sm">Peso diferente da principal: Desvantagem nos ataques com a secundária.</p>' : ''}
  ${hs && hs.ranks['0'] ? `<p class="muted sm">A Habilidade desta arma secundária não vem de graça: gastas 1 Habilidade para a pegar, na etapa Habilidades.</p><div class="hablist">${hs.ranks['0'].map(h => habCard(h)).join('')}</div>` : ''}
  <h3 class="sec">Armadura <small>qualquer estilo pode usar qualquer armadura</small></h3>
  <div class="wgrid">${ARMADURAS.rank[rank].map(a => `<button class="wcard ${S.armadura === a[0] ? 'on' : ''}" data-act="armadura" data-v="${esc(a[0])}"><b>${a[0]}</b>
    <div class="w-row"><span>Limites</span><span class="dmg">${a[1]} / ${a[2]}</span></div><div class="w-row sm"><span>Valor Base</span><span>${a[3]}</span></div><em class="sm">${ARMADURAS.aspeto[a[0]].texto}</em></button>`).join('')}</div>
  <p class="muted sm">Os Limites sobem +1 a cada 10% de ExV dentro do Rank. Valor atual: ${sh.arm ? sh.lim1 + ' / ' + sh.lim2 : '—'}.</p>`;
}

/* ---- Habilidades (de arma, por ordem) ---- */
function prepCount(s) { const seq = weaponSeq(s); return s.habs.filter((id, i) => !(seq[i] && seq[i].livre)).length + s.palavras.length + (s.habSec ? 1 : 0); }
function stepHabs() {
  const slots = habSlots(S), used = habUsed(S), seq = weaponSeq(S), prep = prepCount(S);
  const inher = qualidadesInerentes(S);
  const falta = slots - used;
  return `${head('Habilidades', 'Cada Habilidade é <b>ou de arma ou Frásica (Palavra)</b>. As de arma escolhem-se <b>por ordem</b>, sem olhar ao Rank; a 1.ª tem de ser da arma — sem ela não podes criar Palavras.')}
  <div class="counters"><span class="count ${used === slots ? 'ok' : ''}">Habilidades <b>${used}/${slots}</b></span><span class="count">De arma <b>${S.habs.length + (S.habSec ? 1 : 0)}</b></span><span class="count">Palavras <b>${S.palavras.length}</b></span><span class="count ${prep > MAX_PREP ? 'bad' : ''}">Preparadas <b>${prep}/${MAX_PREP}</b></span></div>
  ${inher.length ? `<p class="muted sm">Qualidades inerentes: ${inher.map(esc).join(' · ')}</p>` : ''}
  <h3 class="sec">Habilidades da arma ${S.armaP ? '· ' + esc(S.armaP) : ''}</h3>
  ${seq.length ? `<div class="hablist">${seq.map((h, i) => {
    const on = S.habs.includes(h.id), next = i === S.habs.length, last = on && i === S.habs.length - 1;
    const dis = !(next && habUsed(S) < slots) && !last;
    return `<button class="hab pickable ${on ? 'on' : ''} ${next && !on ? 'next' : ''}" ${dis ? 'disabled' : ''} data-act="hab" data-v="${esc(h.id)}"><div class="hab-h"><b><span class="ord">${h.n}</span> ${esc(h.nome)}</b><span class="tag">${esc(h.custo)}</span></div><p>${esc(h.texto)}</p>${h.livre ? '<em class="sm">Não ocupa espaço das cartas preparadas</em>' : ''}</button>`;
  }).join('')}</div>` : '<p class="muted">Escolhe a arma principal na etapa Equipamento.</p>'}
  ${(() => { const h2 = secHabOf(S); if (!h2) return ''; const on = S.habSec, can = on || (S.habs.length >= 1 && habUsed(S) < slots); return `<h3 class="sec">Habilidade da arma secundária · ${esc(S.armaS)} <small>gasta 1 Habilidade</small></h3><div class="hablist"><button class="hab pickable ${on ? 'on' : ''}" ${can ? '' : 'disabled'} data-act="hab-sec"><div class="hab-h"><b>${esc(h2.nome)}</b><span class="tag">${esc(h2.custo)}</span></div><p>${esc(h2.texto)}</p><em class="sm">${on ? 'Escolhida · ocupa 1 Habilidade' : S.habs.length < 1 ? 'Escolhe primeiro a 1.ª Habilidade da arma principal' : 'Ocupa 1 Habilidade'}</em></button></div>`; })()}
  ${falta > 0 && S.habs.length >= 1 ? `<div class="card"><p>Ainda tens <b>${falta}</b> Habilidade${falta > 1 ? 's' : ''} livre${falta > 1 ? 's' : ''}: escolhe mais da arma aqui ou cria <b>Palavras</b> na etapa seguinte.</p><button class="btn sm" data-act="goto" data-i="${stepIdx('palavras')}"><span>Ir para Palavras →</span></button></div>` : ''}`;
}

/* ---- Palavras: diagramas de entrega e cartas ---- */
function entregaCells(nome) {
  const c = new Set(), self = new Set(), add = (x, y) => c.add(x + ',' + y);
  switch (nome) {
    case 'Próprio': self.add('3,3'); break;
    case 'Toque': self.add('2,3'); add(3, 3); break;
    case 'Remoto': self.add('0,3'); add(6, 3); break;
    case 'Cúbico': self.add('1,3'); add(4, 3); break;
    case 'Retângular': self.add('0,3'); for (let x = 2; x <= 3; x++) for (let y = 2; y <= 4; y++) add(x, y); break;
    case 'Linha': self.add('0,3'); for (let x = 1; x <= 6; x++) add(x, 3); break;
    case 'Esférico': self.add('0,3'); for (let x = 0; x < 7; x++) for (let y = 0; y < 7; y++) if ((x - 4) ** 2 + (y - 3) ** 2 <= 5 && !(x === 0 && y === 3)) add(x, y); break;
    case 'Aura': self.add('3,3'); for (let x = 0; x < 7; x++) for (let y = 0; y < 7; y++) if (Math.abs(x - 3) <= 2 && Math.abs(y - 3) <= 2 && !(x === 3 && y === 3)) add(x, y); break;
    case 'Glifo': self.add('1,3'); add(5, 3); add(5, 2); add(5, 4); add(4, 3); add(6, 3); break;
    default: break;
  }
  return { c, self };
}
function entregaSVG(nome, sz = 74) {
  if (!nome) return `<svg class="egrid" viewBox="0 0 7 7" width="${sz}" height="${sz}"><rect width="7" height="7" fill="none"/>${Array.from({ length: 49 }, (_, i) => `<rect x="${i % 7 + .06}" y="${Math.floor(i / 7) + .06}" width=".88" height=".88" class="g0"/>`).join('')}</svg>`;
  const { c, self } = entregaCells(nome);
  return `<svg class="egrid" viewBox="0 0 7 7" width="${sz}" height="${sz}" role="img" aria-label="Entrega ${esc(nome)}">${Array.from({ length: 49 }, (_, i) => {
    const x = i % 7, y = Math.floor(i / 7), k = x + ',' + y;
    return `<rect x="${x + .06}" y="${y + .06}" width=".88" height=".88" class="${self.has(k) ? 'gs' : c.has(k) ? 'g1' : 'g0'}"/>`;
  }).join('')}</svg>`;
}
function palavraCalc(p, sh) {
  const ent = ENTREGAS.find(e => e.nome === p.entrega);
  const mud = sh.sub && sh.sub.nome === 'Mud Periti';
  const ling = sh.sub && sh.sub.nome === 'Linfantico';
  const causas = (ling ? 0 : 1) + (p.proj === 'ambos' ? 1 : 0), pe = ling ? 1 : 0;
  const base = Math.max(1, Math.floor(sh.pi / 2));
  let nd = base; if (p.proj === 'ambos') nd = Math.max(1, Math.floor(nd / 2));
  const pi = ent ? Math.max(0, ent.custo - (mud ? 1 : 0)) + (p.dado === 12 && p.proj !== 'sentimento' ? 1 : 0) : 0;
  return { ent, causas, pe, pi, dano: p.proj === 'sentimento' ? '' : nd + 'd' + p.dado, nd, base, ling };
}
const PROJ = { dano: ['Infligir Dano', '✦'], sentimento: ['Causar Sentimento', '❂'], ambos: ['Dano + Sentimento', '✺'] };
const podeAddPalavra = () => S.habs.length >= 1 && habUsed(S) < habSlots(S);
/* A Palavra escreve-se letra a letra: cada letra é gravada numa laje ao ser escrita. */
function glyphsHTML(nome, animLast) {
  const chars = [...String(nome || '')];
  const cur = '<span class="gl-cur"></span>';
  if (!chars.join('').trim()) return '<span class="gl-empty">escreve a Palavra…</span>' + cur;
  return chars.map((c, i) => c === ' ' ? '<span class="gl sp"></span>' : `<span class="gl ${animLast && i === chars.length - 1 ? 'new' : ''}" style="--r:${((i * 37) % 7) - 3}deg;--y:${((i * 53) % 5) - 2}px">${esc(c.toUpperCase())}</span>`).join('') + cur;
}
let lastLen = 0;
function liveWord() {
  const p = S.palavras[carIdx]; if (!p) return;
  const g = $('word-glyphs'), n = (p.nome || '').length;
  if (g) { g.innerHTML = glyphsHTML(p.nome, n > lastLen); g.classList.toggle('long', n > 10); }
  lastLen = n;
  const c = $('pw-calc'); if (c) c.innerHTML = calcHTML(p, computeSheet(S));
}
const custoTxt = (c) => [c.causas ? c.causas + 'C' : '', c.pe ? c.pe + 'PE' : '', c.ent ? c.pi + 'PI' : ''].filter(Boolean).join(' · ');
function calcHTML(p, sh) {
  const c = palavraCalc(p, sh);
  return `<div class="dicebox"><div><small>Custo</small><b>${custoTxt(c) || '—'}</b></div>${c.dano ? `<div><small>Dano</small><b class="dmg">${c.dano}</b></div>` : ''}</div>
  ${c.dano ? `<p class="muted sm">Nº de dados = metade do teu PI máximo (${sh.pi} → ${c.base})${p.proj === 'ambos' ? `, e outra vez pela metade por levar Dano + Sentimento (→ ${c.nd})` : ''}. O dado é d8, ou d12 por +1 PI.</p>` : ''}${c.ling ? '<p class="muted sm">Linfântico: ativas a Palavra com 1 PE em vez de 1 Causa.</p>' : ''}`;
}
const TRI_L = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M20 3 4 14l16 11z"/></svg>', TRI_R = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M4 3l16 11L4 25z"/></svg>';
function stepPalavras() {
  const sh = computeSheet(S), la = ATTRS.find(a => a.key === sh.lingAttr), n = S.palavras.length;
  carIdx = Math.max(0, Math.min(carIdx, n - 1));
  const p = S.palavras[carIdx], prag = sh.sub && sh.sub.nome === 'Praguejador';
  const motivo = S.habs.length < 1 ? 'Primeiro escolhe a 1.ª Habilidade da arma' : habUsed(S) >= habSlots(S) ? 'Sem Habilidades livres' : '';
  lastLen = p ? (p.nome || '').length : 0;
  const bar = `<div class="pw-bar"><button class="pw-arrow" data-act="pal-prev" ${carIdx > 0 && p ? '' : 'disabled'} aria-label="Palavra anterior">${TRI_L}</button>
    <div class="slab"><div id="word-glyphs" class="wg ${lastLen > 10 ? 'long' : ''}">${p ? glyphsHTML(p.nome, false) : `<span class="gl-empty">${motivo || 'ainda sem Palavras'}</span>`}</div>${p ? `<input type="text" id="pal-nome" class="slab-in" data-p="palavras.${carIdx}.nome" value="${esc(p.nome)}" placeholder="Nome da Palavra" aria-label="Nome da Palavra" autocomplete="off" maxlength="60">` : ''}</div>
    <button class="pw-arrow" data-act="pal-next" ${carIdx < n - 1 ? '' : 'disabled'} aria-label="Palavra seguinte">${TRI_R}</button></div>`;
  const meta = `<div class="pw-meta"><span class="count">Palavra <b>${n ? carIdx + 1 : 0}/${n}</b></span><span class="count ${habUsed(S) === habSlots(S) ? 'ok' : ''}">Habilidades <b>${habUsed(S)}/${habSlots(S)}</b></span><span class="count" title="${esc(langWhy(S))}">Língua <b>${LINGUA_NOME[sh.lingAttr]} · ${la.name}</b> <small>(${esc(langWhy(S))})</small></span><span class="spacer"></span>${podeAddPalavra() ? '<button class="btn sm primary" data-act="palavra-add"><span>+ Nova Palavra</span></button>' : ''}${p ? '<button class="btn sm danger" data-act="pal-rm"><span>Apagar</span></button>' : ''}</div>`;
  if (!p) return `${head('Palavras')}${bar}${meta}<div class="card"><p class="muted">${motivo || 'Carrega em «Nova Palavra» e começa a escrever.'}</p></div>`;
  const c = palavraCalc(p, sh);
  const proj = `<div class="pw-proj">${Object.entries(PROJ).map(([k, v]) => `<button class="pbtn ${p.proj === k ? 'on' : ''}" ${prag && k === 'dano' ? 'disabled' : ''} data-act="pal-set" data-k="proj" data-v="${k}" title="${v[0]}"><b>${v[1]}</b><span>${v[0]}</span></button>`).join('')}</div>`;
  const dano = p.proj !== 'sentimento' ? `<p class="lbl">Dano</p><div class="seg two"><button class="segb ${p.dado === 8 ? 'on' : ''}" data-act="pal-set" data-k="dado" data-v="8"><b>d8</b>base</button><button class="segb ${p.dado === 12 ? 'on' : ''}" data-act="pal-set" data-k="dado" data-v="12"><b>d12</b>+1 PI</button></div>` : '';
  const sent = p.proj !== 'dano' ? `<p class="lbl">Sentimento</p>${sel(SENTIMENTOS.map(x => ({ v: x, t: x })), p.sent, `data-p="palavras.${carIdx}.sent" data-re`)}${prag ? sel(SENTIMENTOS.filter(x => x !== p.sent).map(x => ({ v: x, t: x })), p.sent2, `data-p="palavras.${carIdx}.sent2" data-re`, '2.º Sentimento (Praguejador)') : ''}` : '';
  const nota = (p.proj === 'ambos' ? '<p class="muted sm">Os dois: +1 Causa e o dano máximo fica pela metade.</p>' : '') + (prag ? '<p class="muted sm">Praguejador: nenhuma Palavra dá Dano sozinha.</p>' : '');
  return `${head('Palavras')}${bar}${proj}${meta}
  <div class="pw-cols"><div class="pw-l"><p class="lbl pw-t">Danos e Sentimentos</p>${dano}${sent}${nota}<div id="pw-calc">${calcHTML(p, sh)}</div></div>
    <div class="pw-r"><p class="lbl pw-t">Entregas</p><div class="egrid-list">${ENTREGAS.map(e => `<button class="ebtn ${p.entrega === e.nome ? 'on' : ''}" data-act="pal-set" data-k="entrega" data-v="${esc(e.nome)}">${entregaSVG(e.nome, 44)}<b>${e.nome}</b><small>${e.custo ? '+' + e.custo + ' PI' : 'grátis'}</small></button>`).join('')}</div>
      <p class="muted sm pw-ent">${c.ent ? `<b>${esc(c.ent.nome)}:</b> ${esc(c.ent.desc)} Aumento: ${esc(c.ent.aum)}.` : 'Escolhe como a Palavra é entregue.'}</p></div></div>`;
}

/* ---- Sociedade e Vida ---- */
function socOk(soc) {
  const m = /Aprendizagens (Elementalistas|Melódicas|Linfanticas|do Mud)/.exec(soc.nome);
  if (!m) return { ok: true };
  const need = { Elementalistas: 'VIT', 'Melódicas': 'CAR', Linfanticas: 'FDV', 'do Mud': 'MEM' }[m[1]];
  return { ok: langAttr(S) === need, need };
}
function stepVida() {
  const obrig = S.expv >= 20;
  return `${head('Sociedade e Vida')}
  <h3 class="sec">Sociedade <small>${obrig ? 'obrigatória a partir de 20%' : 'opcional até 20%'} · dá uma Habilidade inerente</small></h3>
  <div class="hablist"><button class="hab pickable ${!S.sociedade ? 'on' : ''}" data-act="soc" data-v=""><div class="hab-h"><b>Nenhuma</b></div><p>Ainda sem sociedade.</p></button>
  ${LIVRO.sociedades.map(x => { const o = socOk(x), n = x.nome.replace(/\s*:\s*$/, ''); return `<button class="hab pickable ${S.sociedade === n ? 'on' : ''}" ${o.ok ? '' : 'disabled'} data-act="soc" data-v="${esc(n)}"><div class="hab-h"><b>${esc(n)}</b><span class="tag">${esc(x.rec.custo)}</span></div><p><b>${esc(x.rec.nome)}.</b> ${esc(x.rec.texto)}</p>${o.ok ? '' : `<em class="sm">Exige Língua com ${ATTRS.find(a => a.key === o.need).name}</em>`}</button>`; }).join('')}</div>
  <h3 class="sec">Experiências</h3>
  <p class="muted sm">Palavras ou frases que representem o que o personagem aprendeu. Começas com duas, a +2. Ganhas uma nova (+2) a cada Rank. O bónus não se escreve à mão: só sobe com a opção «+1 em duas Experiências» da ExV.</p>
  <div class="card">${S.experiencias.map((e, i) => `<div class="exp-row"><input type="text" data-p="experiencias.${i}.t" value="${esc(e.t)}" placeholder="Experiência ${i + 1}"><span class="expb" title="Só sobe com «+1 em duas Experiências» na ExV">${sg(e.b)}</span></div>`).join('')}</div>
  <h3 class="sec">Inventário <small>opcional</small></h3>
  <div class="card"><div class="grid g2"><label class="field"><span>Dinheiro</span><input type="text" data-p="dinheiro" value="${esc(S.dinheiro)}"></label></div>
    <label class="field"><span>Itens (10 itens + 5 consumíveis de Rank 1; sobe com Força)</span><textarea rows="4" data-p="inventario">${esc(S.inventario)}</textarea></label></div>`;
}

/* ---- Conceito ---- */
function stepConceito() {
  return `${head('Conceito', 'O teu personagem para lá dos números. Tudo opcional.')}
  <div class="grid g2 conc">
    <label class="field"><span>História (ou link para um docs)</span><textarea rows="7" data-p="historia">${esc(S.historia)}</textarea></label>
    <label class="field"><span>Aparência / Personalidade</span><textarea rows="7" data-p="aparencia">${esc(S.aparencia)}</textarea></label>
    <label class="field"><span>Conexões · porque conheces quem conheces; perguntas para a equipa</span><textarea rows="7" data-p="conexoes">${esc(S.conexoes)}</textarea></label>
    <label class="field"><span>Anotações</span><textarea rows="7" data-p="anotacoes">${esc(S.anotacoes)}</textarea></label>
  </div>`;
}

/* ---- Ficha ---- */
function pips(tipo, max, cur, ro) {
  const left = cur == null ? max : Math.min(cur, max);
  return `<div class="pips">${Array.from({ length: max }, (_, i) => `<button class="pipb ${i < left ? 'full' : ''}" ${ro ? 'disabled' : `data-act="pip" data-t="${tipo}" data-i="${i}"`} aria-label="${tipo} ${i + 1}"></button>`).join('')}</div>`;
}
function habsTotal(sh) {
  const seq = weaponSeq(S), out = [];
  S.habs.forEach((id, i) => { const h = seq[i]; if (h) out.push({ id, ...h, tipo: 'arma' }); });
  const sh2 = secHabOf(S); if (S.habSec && sh2) out.push({ id: 'SEC', ...sh2, tipo: 'arma' });
  S.palavras.forEach((p, i) => { const c = palavraCalc(p, sh); out.push({ id: 'P|' + i, nome: p.nome || 'Palavra', custo: c.ent ? custoTxt(c) : '', texto: [p.entrega, p.proj !== 'dano' && [p.sent, p.sent2].filter(Boolean).join(' + '), c.dano, p.desc].filter(Boolean).join(' · '), tipo: 'frasica' }); });
  return out;
}
function habMini(h, ativa, podeAtivar) {
  return `<button class="hab pickable mini ${h.tipo}" data-act="arca" data-v="${esc(h.id)}" ${ativa || podeAtivar ? '' : 'disabled'} title="${ativa ? 'Mandar para a Arca' : 'Ativar'}"><div class="hab-h"><b>${esc(h.nome)}</b><span class="tag">${esc(h.custo || '')}</span></div><p>${esc(h.texto)}</p></button>`;
}
function stepFicha() {
  const sh = computeSheet(S), sub = sh.sub, esp = sh.esp, vr = sh.vr, p = sh.pP, sec = sh.pS, rank = sh.rank;
  const total = habsTotal(sh), ativas = total.filter(h => !S.arca.includes(h.id)), arca = total.filter(h => S.arca.includes(h.id));
  const prep = ativas.filter(h => !h.livre).length;
  const passivas = [];
  if (esp) passivas.push({ ...esp.hab, f: esp.nome }); if (vr) passivas.push({ ...vr.hab, f: vr.nome }); if (sub) passivas.push({ nome: sub.nome, custo: sub.custo, texto: sub.texto });
  estiloHabsInerentes(S).forEach(h => passivas.push(h));
  const soc = LIVRO.sociedades.find(x => x.nome.replace(/\s*:\s*$/, '') === S.sociedade); if (soc) passivas.push({ ...soc.rec });
  const quals = sh.quals.map(q => LIVRO.qualidades.find(z => z.nome === q)).filter(Boolean);
  const lg = ATTRS.find(a => a.key === sh.lingAttr), img = fotoSrc();
  const cur = (k, max) => S.atual[k] == null ? max : Math.min(S.atual[k], max);
  const rs = (cls, nome, tipo, max, v, extra = '') => `<div class="rs ${cls}"><div class="rs-h"><b>${nome}</b><em><i>${v}</i>/${max}</em></div>${pips(tipo, max, tipo === 'causas' ? S.atual.causas : S.atual[tipo])}${extra}</div>`;
  const wrow = (a, tag, k) => `<tr><td><b>${esc(a ? a.nome : '—')}</b><small>${tag}</small></td><td>${a ? esc(a.attr) + ' <i>(' + sg(sh.attr[ATTR_NOME[a.attr]]) + ')</i>' : '—'}</td><td>${a ? `<select class="dist" data-p="${k}" aria-label="Distância">${DISTANCIAS.map(([d, m]) => `<option value="${d}" ${(S[k] || distDefault(a)) === d ? 'selected' : ''}>${d} · ${m}</option>`).join('')}</select>` : '—'}</td><td class="dmg">${a ? esc(a.dano) : '—'}</td></tr>`;
  const estados = [...ESTADOS, ...SENTIMENTOS];
  const estadoSel = `<select data-p="estado" class="estado" aria-label="Estado"><optgroup label="Estados">${ESTADOS.map(x => `<option ${S.estado === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</optgroup><optgroup label="Condições">${SENTIMENTOS.map(x => `<option ${S.estado === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</optgroup>${estados.includes(S.estado) ? '' : `<option selected>${esc(S.estado)}</option>`}</select>`;
  const info = (l, v) => `<div><small>${l}</small><b>${v ? esc(v) : '—'}</b></div>`;
  const conceito = [['História', S.historia], ['Aparência / Personalidade', S.aparencia], ['Conexões', S.conexoes], ['Anotações', S.anotacoes]].filter(x => x[1]);
  return `<div class="fx" id="sheet">
    <div class="fh"><div class="fh-photo">${img ? `<img src="${img}" alt="">` : `<span>${esc((S.nome.trim()[0] || '?').toUpperCase())}</span>`}</div>
      <div class="fh-main"><h2>${esc(S.nome || 'Sem nome')}</h2>
        <div class="fh-grid">${info('ExV', S.expv + '%')}${info('Rank', '' + rank)}${info('Idade', S.idade)}${info('Género', S.genero)}${info('Espécie', esp ? esp.nome + (vr ? ' · ' + vr.nome : '') : '')}${info('Sociedade', S.sociedade)}${info('Estilo de Vida', sh.est ? sh.est.nome + (sub ? ' · ' + sub.nome : '') : '')}</div></div></div>
    <div class="fx-cols">
      <div class="fx-col">
        <div class="core"><div class="cb"><small>Desvio</small><b>${sh.desvio}</b></div><div class="cb"><small>Deslocamento</small><b>${sh.desloc}</b></div><div class="cb"><small>Armadura</small><b>${sh.armBase}</b></div></div>
        <div class="attrs6">${ATTRS.map(a => `<div class="at"><small>${a.name}</small><b>${sg(sh.attr[a.key])}</b></div>`).join('')}</div>
        <div class="blk"><h4>Recursos</h4>
          ${rs('pv', 'PV', 'pv', sh.pv, cur('pv', sh.pv))}${rs('pi', 'PI', 'pi', sh.pi, cur('pi', sh.pi))}${rs('ca', 'Causa', 'causas', MAX_CAUSAS, S.atual.causas)}${rs('pe', 'PE', 'pe', sh.pe, cur('pe', sh.pe))}
          ${sh.arm ? rs('ar', 'Armadura', 'arm', sh.armBase, cur('arm', sh.armBase)) : ''}
          <div class="estado-row"><b>Estado</b>${estadoSel}</div></div>
        <div class="blk"><h4>Limite de Dano</h4><div class="dl"><div class="d1"><small>Dano Menor ></small><b>${sh.arm ? sh.lim1 : '—'}</b></div><div class="d2"><small>Dano Grave ></small><b>${sh.arm ? sh.lim2 : '—'}</b></div><div class="d3"><small>Dano Severo</small><b>—</b><em>só por Habilidades</em></div></div></div>
        <div class="blk"><h4>Experiências</h4><ul class="explist">${S.experiencias.map(e => `<li><span>${esc(e.t || '—')}</span><b>${sg(e.b)}</b></li>`).join('')}</ul></div>
        <div class="blk"><h4>Língua</h4><p><b>${LINGUA_NOME[sh.lingAttr]}</b> · atributo <b>${lg.name}</b> (${sg(sh.attr[lg.key])}) <span class="muted sm">· ${esc(langWhy(S))}</span></p></div>
      </div>
      <div class="fx-col">
        <div class="blk"><h4>Armas &amp; Armadura <span class="prof">Proficiência ${sh.prof}/${MAX_PROF} ${Array.from({ length: MAX_PROF }, (_, i) => `<i class="pp ${i < sh.prof ? 'on' : ''}"></i>`).join('')}</span></h4>
          <table class="wtab"><thead><tr><th>Nome</th><th>Atributo</th><th>Distância</th><th>Dano</th></tr></thead><tbody>${wrow(p, 'Primária', 'distP')}${wrow(sec, 'Secundária', 'distS')}</tbody></table>
          <table class="wtab"><thead><tr><th>Armadura</th><th>Limites</th><th>Base</th><th>Aspeto</th></tr></thead><tbody><tr><td><b>${esc(sh.arm ? sh.arm[0] : '—')}</b></td><td>${sh.arm ? sh.lim1 + ' / ' + sh.lim2 : '—'}</td><td>${sh.arm ? sh.armBase : '—'}</td><td>${sh.asp ? esc(sh.asp.texto) : '—'}</td></tr></tbody></table></div>
        <div class="blk"><h4>Habilidades <span class="tag">Total ${total.length}</span><span class="tag ${prep > MAX_PREP ? 'bad' : ''}">Ativas ${prep}/${MAX_PREP}</span><span class="tag">Arca ${arca.length}</span></h4>
          <h5>Ativas</h5>${ativas.length ? ativas.map(h => habMini(h, true, true)).join('') : '<p class="muted sm">—</p>'}
          <h5>Arca <small>inativas</small></h5>${arca.length ? arca.map(h => habMini(h, false, prep < MAX_PREP)).join('') : '<p class="muted sm">—</p>'}</div>
        <div class="blk"><h4>Habilidades Inerentes</h4>${passivas.length ? passivas.map(h => habCard(h)).join('') : '<p class="muted sm">—</p>'}</div>
        <div class="blk"><h4>Qualidades</h4>${quals.length ? quals.map(h => habCard(h)).join('') : '<p class="muted sm">—</p>'}</div>
      </div>
    </div>
    <div class="fx-cols">
      <div class="blk"><h4>Inventário${S.dinheiro ? ` <span class="tag">Dinheiro ${esc(S.dinheiro)}</span>` : ''}</h4><p class="pre">${esc(S.inventario) || '—'}</p></div>
      <div class="blk"><h4>Conceito</h4>${conceito.length ? conceito.map(([t, v]) => `<h5>${t}</h5><p class="pre">${esc(v)}</p>`).join('') : '<p class="muted sm">—</p>'}${S.especie === 'rinascitida' ? `<h5>Daíscitida</h5><p class="sm">${esc(S.daiscitida.nome || '—')} ${esc(S.daiscitida.notas)}</p>` : ''}</div>
    </div>
    ${S.imagens.length ? `<div class="blk"><h4>Imagens</h4><div class="mood small">${S.imagens.map(im => `<figure class="mimg ${im.id === S.fotoId ? 'main' : ''}"><img src="${im.src}" alt=""></figure>`).join('')}</div></div>` : ''}
    <div class="fx-act"><button class="btn" data-act="export" data-id="${esc(S.id)}"><span>Exportar JSON</span></button></div></div>`;
}

/* ---------- eventos ---------- */
function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) { if (t[k[i]] == null) t[k[i]] = {}; t = t[k[i]]; } t[k[k.length - 1]] = v; }
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

document.addEventListener('click', (e) => {
  if (HELP.open && !e.target.closest('#help') && !e.target.closest('[data-act=help-qual]')) { HELP.open = false; $('help').classList.remove('open'); } // clicar fora fecha a barra lateral
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const act = b.dataset.act, v = b.dataset.v, i = b.dataset.i != null ? +b.dataset.i : null;
  switch (act) {
    case 'nova': return novaFicha();
    case 'abrir': return openFicha(b.dataset.id);
    case 'apagar': if (confirm('Apagar esta ficha?')) { saveAll(loadAll().filter(f => f.id !== b.dataset.id)); renderList(); } return;
    case 'export': { const id = b.dataset.id, rec = loadAll().find(f => f.id === id); download((rec ? migrate(rec.raw).nome || 'ficha' : S.nome || 'ficha').replace(/\W+/g, '_') + '.eloc.json', JSON.stringify(rec ? rec.raw : S, null, 1)); return; }
    case 'importar': return $('file-import').click();
    case 'sair': return sair();
    case 'goto': S.step = i; mount(); $('ed-body').scrollTop = 0; return;
    case 'next': S.step = Math.min(FICHA, S.step + 1); mount(); $('ed-body').scrollTop = 0; return;
    case 'prev': S.step = Math.max(0, S.step - 1); mount(); $('ed-body').scrollTop = 0; return;
    case 'estilo': S.estilo = v; S.sub = ''; break;
    case 'sub': S.sub = v; break;
    case 'especie': S.especie = v; S.variante = ''; S.attrs = zeroAttrs(); break;
    case 'variante': S.variante = v; break;
    case 'attrs-clear': S.attrs = zeroAttrs(); break;
    case 'armaP': S.armaP = v; S.habs = []; break;
    case 'armaS': S.armaS = S.armaS === v ? '' : v; break;
    case 'armadura': S.armadura = v; break;
    case 'hab-sec': S.habSec = !S.habSec; break;
    case 'hab': { const k = S.habs.indexOf(v); if (k >= 0) { if (S.habs.length === 1 && S.palavras.length) { alert('Não podes largar a 1.ª Habilidade da arma enquanto tiveres Palavras. Apaga primeiro as Palavras.'); return; } S.habs.splice(k, 1); } else S.habs.push(v); break; }
    case 'soc': S.sociedade = v; break;
    case 'img-main': S.fotoId = v; break;
    case 'img-rm': S.imagens = S.imagens.filter(x => x.id !== v); break;
    case 'arca': { const k = S.arca.indexOf(v); if (k >= 0) S.arca.splice(k, 1); else S.arca.push(v); break; }
    case 'pip': {
      const t = b.dataset.t, sh = computeSheet(S), idx = +b.dataset.i;
      if (t === 'causas') { S.atual.causas = S.atual.causas === idx + 1 ? idx : idx + 1; break; }
      const max = { pv: sh.pv, pi: sh.pi, pe: sh.pe, arm: sh.armBase }[t], cur = S.atual[t] == null ? max : S.atual[t];
      S.atual[t] = (cur === idx + 1) ? idx : idx + 1; break;
    }
    case 'help-toggle': HELP.open = !HELP.open; return renderHelp();
    case 'help-tab': HELP.tab = v; HELP.focus = ''; return renderHelp();
    case 'help-qual': HELP.open = true; HELP.tab = 'qual'; HELP.focus = v || ''; return renderHelp();
    case 'palavra-add': if (!podeAddPalavra()) return; S.palavras.push(defaultPalavra()); carIdx = S.palavras.length - 1; mount(); { const n = $('pal-nome'); if (n) n.focus(); } return;
    case 'pal-prev': carIdx = Math.max(0, carIdx - 1); mount(); return;
    case 'pal-next': carIdx = Math.min(S.palavras.length - 1, carIdx + 1); mount(); return;
    case 'pal-rm': if (S.palavras[carIdx] && confirm('Apagar esta Palavra?')) { S.palavras.splice(carIdx, 1); carIdx = Math.max(0, carIdx - 1); break; } return;
    case 'pal-set': { const pl = S.palavras[carIdx]; if (!pl) return; pl[b.dataset.k] = b.dataset.k === 'dado' ? +v : v; if (pl.proj === 'dano') { pl.sent = ''; pl.sent2 = ''; } if (pl.proj === 'sentimento') pl.dado = 8; break; }
    default: return;
  }
  mount();
});
function onField(e, final) {
  const el = e.target.closest('[data-p]'); if (!el) return;
  let val = el.value; if (el.hasAttribute('data-num')) val = val === '' ? null : Number(val);
  if (el.dataset.p === 'expv') val = val == null ? 0 : val;
  setPath(S, el.dataset.p, val);
  if (el.id === 'in-nome') { const bad = !nomeValido(el.value); el.classList.toggle('invalid', bad); $('nome-erro').hidden = !bad; }
  if (el.dataset.p === 'expv') { S.evo = Object.fromEntries(Object.entries(S.evo).filter(([k]) => +k <= S.expv)); }
  const wide = window.innerWidth >= 1300; // em ecrãs largos a barra lateral abre sozinha (sobrepõe-se, não empurra)
  if (el.hasAttribute('data-qual') && val) { HELP.tab = 'qual'; HELP.focus = val; if (wide) HELP.open = true; }
  if (/^evo\.\d+\.picks\.\d$/.test(el.dataset.p) && val === 'qual') { HELP.tab = 'qual'; HELP.focus = ''; if (wide) HELP.open = true; }
  if (el.hasAttribute('data-re') && final) { mount(); return; }
  refreshChrome(); if (el.id === 'pal-nome') liveWord();
}
document.addEventListener('input', (e) => { if (!e.target.matches('select')) onField(e, false); });
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-imgs]')) {
    const files = [...e.target.files].slice(0, MAX_IMG - S.imagens.length); e.target.value = '';
    Promise.all(files.map(readImg)).then(list => { list.filter(Boolean).forEach(src => S.imagens.push({ id: 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), src })); mount(); });
    return;
  }
  if (e.target.matches('#file-import')) {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { try { const s = migrate(JSON.parse(t)); s.id = 'f_' + Date.now(); const l = loadAll(); l.push({ id: s.id, raw: s }); saveAll(l); renderList(); } catch (er) { alert('Ficheiro inválido.'); } });
    e.target.value = ''; return;
  }
  if (e.target.matches('select[data-p]')) onField(e, true);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && HELP.open) { HELP.open = false; renderHelp(); }
});

/* ---------- arranque ---------- */
window.addEventListener('DOMContentLoaded', () => { showView('list'); });
window.addEventListener('beforeunload', () => { clearTimeout(saveT); if (!$('view-editor').hidden) autosave(); });

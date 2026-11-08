const STORAGE_KEY = 'exorcismus_fichas';
const MAX_ATTR = 3;

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => (n >= 0 ? '+' + n : '' + n);
const $ = (id) => document.getElementById(id);


const ICON_EDIT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const ICON_D20 = '<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M16 2l12 7v14l-12 7-12-7V9z"/><path d="M16 2v28M4 9l24 14M28 9L4 23"/><path d="M16 10l6 10H10z"/></svg>';
const ARROW_L = '<svg viewBox="0 0 64 40"><path d="M62 12H30V3L3 20l27 17v-9h32z"/></svg>';
const ARROW_R = '<svg viewBox="0 0 64 40"><path d="M2 12h32V3l27 17-27 17v-9H2z"/></svg>';


const ZERO_ATTRS = () => ({ FOR: 0, AGI: 0, VIG: 0, INT: 0, PRE: 0 });
const uid = () => 'ficha_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

function defaultVariante(){
  return { nome: '', descricao: '', foto: '', efeitoTipo: 'dano', efeitoQtd: 1, alcance: 'toque', duracao: 'instantaneo', area: 'unico', restricaoTipo: '', restricaoTexto: '' };
}
function defaultAprim(){ return { alvo: '', tipo: 'custo', valor: 1, nota: '' }; }
function defaultInvocacao(){ return { nome: '', tipo: 'Shikigami', traco: '', dano: '', deslocacao: 'Normal', notas: '' }; }
function defaultArmadura(){ return { id: 'nenhuma', nome: 'Sem armadura', rd: 0, espacos: 0, pen: '', aprovada: false }; }

function armaFromPreset(p){
  return { id: p.id || 'lend', nome: p.nome, nivel: p.nivel || 5, dano: p.dano, critico: p.critico || 'x2', alcance: p.alcance,
    tipo: p.tipo, espacos: p.espacos, prop: p.prop, custom: false, aprovada: false, requisito: p.requisito || '' };
}
function armaCustom(){
  return { id: 'custom', nome: '', nivel: 1, dano: '', critico: 'x2', alcance: 'Toque', tipo: 'C', espacos: 1, prop: '', custom: true, aprovada: false, requisito: '' };
}

function defaultState(){
  return {
    id: uid(), step: 0, concluida: false, criadaEm: new Date().toLocaleDateString('pt-PT'),
    // identidade
    nome: '', jogador: '', idade: 0, local: '', historia: '', aparencia: '', foto: '', grau: 0,
    // natureza
    naturezaId: null, naturezaBonusMap: ZERO_ATTRS(), naturezaBonusPicks: [],
    periciaLigada: '', fonteSustento: '', objeto: '', eraDourada: '', alienResist: '', alienVuln: '',
    tracoRaro: null, tracoRaroAprovado: false,
    // arquétipo / estilo
    arquetipoId: null, estiloNome: null,
    // atributos
    attrs: ZERO_ATTRS(), excedente: [], progAttrs: [],
    // perícias
    periciasEscolhidas: [], progPericias: [],
    // técnica
    tecnica: { conceito: '', invoca: false, itens: {} },
    // equipamento
    armas: [], semArma: false, armadura: defaultArmadura(), itens: '',
    // invocações
    invocacoes: [defaultInvocacao(), defaultInvocacao()],
    // recursos atuais (null = máximo)
    atual: { pv: null, pa: null, co: null },
  };
}

const STATE = defaultState();
const STEP_LABELS = ['Identidade', 'Conceito', 'Atributos', 'Perícias', 'Técnica', 'Equipamento', 'Ficha'];
const STEP = { IDENT: 0, CONC: 1, ATTR: 2, PERI: 3, TEC: 4, EQUIP: 5, FICHA: 6 };
const N_STEPS_REQ = 6; 


const EDIT = { open: false, closing: false, key: null, anim: null };
let carIdx = 0;          
let ficTab = 'hab';      
let sobreTab = 'main';   


function migrateRaw(raw){
  const d = defaultState();
  const r = JSON.parse(JSON.stringify(raw || {}));
  const s = Object.assign({}, d, r);
  s.attrs = Object.assign(ZERO_ATTRS(), r.attrs || {});
  s.naturezaBonusMap = Object.assign(ZERO_ATTRS(), r.naturezaBonusMap || {});
  ['naturezaBonusPicks', 'periciasEscolhidas', 'progAttrs', 'progPericias'].forEach(k => { if(!Array.isArray(s[k])) s[k] = []; });
  s.atual = Object.assign({ pv: null, pa: null, co: null }, r.atual || {});
  s.invocacoes = [0, 1].map(i => Object.assign(defaultInvocacao(), (r.invocacoes || [])[i] || {}));
  s.grau = Math.max(0, Math.min(6, parseInt(r.grau, 10) || 0));


  s.local = (r.local != null) ? r.local : (r.nacionalidade || '');
  delete s.nacionalidade;
  s.idade = parseInt(s.idade, 10) || 0;


  const t = r.tecnica || {};
  s.tecnica = { conceito: t.conceito || '', invoca: !!t.invoca, itens: t.itens || {} };
  if(Array.isArray(t.variantes)){
    if(t.variantes[0]) s.tecnica.itens['g4-0'] = Object.assign(defaultVariante(), t.variantes[0]);
    if(t.variantes[1]) s.tecnica.itens['apt'] = Object.assign(defaultVariante(), t.variantes[1]);
  }


  if(!Array.isArray(r.armas)){
    s.armas = [];
    let pid = r.armaId, nome = r.armaNome || '';
    if(!pid && r.armaCategoria){
      pid = ARMAS.padraoPorCategoria[r.armaCategoria];
      const base = ARMAS.lista.find(a => a.id === pid);
      nome = (r.armaNome && base && r.armaNome !== base.nome) ? r.armaNome : '';
    }
    const p = ARMAS.lista.find(a => a.id === pid);
    if(p){ const a = armaFromPreset(p); if(nome) a.nome = nome; s.armas.push(a); }
  }
  if(!r.armadura){
    const ar = ARMADURAS.find(a => a.id === r.armaduraId) || ARMADURAS[0];
    s.armadura = { id: ar.id, nome: ar.nome, rd: ar.rd, espacos: ar.espacos, pen: ar.pen, aprovada: !!r.armaduraAprovada };
  } else s.armadura = Object.assign(defaultArmadura(), r.armadura);

  if(r.concluida === undefined) s.concluida = true;
  if(r.excedente === undefined) s.excedente = undefined;
  return s;
}



function getNatureza(s = STATE){ return NATUREZAS.find(n => n.id === s.naturezaId); }
function getArquetipo(s = STATE){ return ARQUETIPOS.find(a => a.id === s.arquetipoId); }
function getEstilo(s = STATE){
  const arq = getArquetipo(s);
  return arq ? ESTILOS[arq.id].find(e => e.nome === s.estiloNome) : null;
}
function getTracoRaro(s = STATE){ return TRACOS_RAROS.find(t => t.id === s.tracoRaro); }

function nomeValido(n){
  const t = String(n || '').trim();
  return /^[\p{L}][\p{L}\s'’-]*$/u.test(t) && (t.match(/\p{L}/gu) || []).length >= 2;
}

function baseAttr(s, key){ return s.attrs[key] + (s.naturezaBonusMap[key] || 0); }
function excedenteTotal(s){ return ATTRS.reduce((t, a) => t + Math.max(0, baseAttr(s, a.key) - MAX_ATTR), 0); }
function excedenteValido(s){
  const total = excedenteTotal(s), extra = ZERO_ATTRS(), out = [];
  (s.excedente || []).forEach(k => {
    if(out.length >= total || !(k in extra)) return;
    if(Math.min(MAX_ATTR, baseAttr(s, k)) + extra[k] < MAX_ATTR){ extra[k]++; out.push(k); }
  });
  return out;
}
function excedenteTemEspaco(s){
  const extra = ZERO_ATTRS(); excedenteValido(s).forEach(k => extra[k]++);
  return ATTRS.some(a => Math.min(MAX_ATTR, baseAttr(s, a.key)) + extra[a.key] < MAX_ATTR);
}
function attrCriacao(s, key){
  const b = baseAttr(s, key);
  if(s.excedente === undefined) return b;
  return Math.min(MAX_ATTR, b) + excedenteValido(s).filter(k => k === key).length;
}
function progAttrsValidos(s){
  const out = [], extra = ZERO_ATTRS();
  (s.progAttrs || []).forEach(k => {
    if(out.length >= s.grau || !(k in extra)) return;
    if(attrCriacao(s, k) + extra[k] < ATTR_PROG_MAX){ extra[k]++; out.push(k); }
  });
  return out;
}
function progAttrsTemEspaco(s){
  const extra = ZERO_ATTRS(); progAttrsValidos(s).forEach(k => extra[k]++);
  return ATTRS.some(a => attrCriacao(s, a.key) + extra[a.key] < ATTR_PROG_MAX);
}
function attrFinalOf(s, key){ return attrCriacao(s, key) + progAttrsValidos(s).filter(k => k === key).length; }
function attrFinal(key){ return attrFinalOf(STATE, key); }

function attrPool(){ return 4 + Object.values(STATE.attrs).filter(v => v === -1).length; }
function attrSpent(){ return Object.values(STATE.attrs).reduce((t, v) => t + Math.max(0, v), 0); }
function attrRemaining(){ return attrPool() - attrSpent(); }

/* --- Perícias --- */
function periciasProgTotal(s){ return GRAU_FULL.slice(0, s.grau + 1).filter(Boolean).length; }
function periciasEscolhaTotal(s = STATE){
  const arq = getArquetipo(s);
  return arq ? arq.periciasEscolha + Math.max(0, attrFinalOf(s, arq.periciasExtraAttr)) : 0;
}
function periciasTreinadas(s){
  const arq = getArquetipo(s);
  return arq ? [...arq.periciasFixas, ...s.periciasEscolhidas, ...s.progPericias] : [];
}

function tecnicaSlots(s){
  const g = s.grau, fe = getNatureza(s) && getNatureza(s).id === 'feiticeiro', out = [];
  out.push({ key: 'g4-0', tipo: 'var', orc: TECNICA.orcamentoGrau4, label: 'Variante inicial (Grau 4)' });
  if(fe) out.push({ key: 'apt', tipo: 'var', orc: TECNICA.orcamentoGrau3, label: 'Variante extra - Aptidão Natural' });
  if(g >= 1){
    out.push({ key: 'g3-0', tipo: 'var', orc: TECNICA.orcamentoGrau3, label: 'Grau 3 variante nova (1 de 2)' });
    out.push({ key: 'g3-1', tipo: 'var', orc: TECNICA.orcamentoGrau3, label: 'Grau 3 variante nova (2 de 2)' });
  }
  if(g >= 2){ ['s2-0', 's2-1'].forEach((k, i) => out.push({ key: k, tipo: 'apr', grupo: 's2', label: `Semi-Grau 2 Aprimoramento ${i + 1} de 2` })); }
  if(g >= 3) out.push({ key: 'g2-0', tipo: 'var', orc: TECNICA.orcamentoGrau2, label: 'Grau 2 variante nova' });
  if(g >= 4){ ['s1-0', 's1-1'].forEach((k, i) => out.push({ key: k, tipo: 'apr', grupo: 's1', label: `Semi-Grau 1 Aprimoramento ${i + 1} de 2` })); }
  if(g >= 5) out.push({ key: 'g1-0', tipo: 'var', orc: TECNICA.orcamentoGrau1, label: 'Grau 1 variante nova' });
  if(g >= 6) out.push({ key: 'max', tipo: 'max', orc: TECNICA.orcamentoMaxima, label: 'Grau Especial Técnica Máxima (1x/sessão)' });
  return out;
}
function slotData(s, slot){
  const it = s.tecnica.itens;
  if(!it[slot.key]) it[slot.key] = slot.tipo === 'apr' ? defaultAprim() : defaultVariante();
  return it[slot.key];
}
function nomeVariante(s, key){
  const slot = tecnicaSlots(s).find(x => x.key === key);
  if(!slot || slot.tipo === 'apr') return '';
  return (s.tecnica.itens[key] && s.tecnica.itens[key].nome) || slot.label;
}
function varianteCalc(v, slot, s){
  const ef = TECNICA.efeitos.find(e => e.id === v.efeitoTipo) || TECNICA.efeitos[0];
  const cEfeito = ef.custoPor * Math.max(1, v.efeitoQtd | 0);
  const cAlc = (TECNICA.alcances.find(x => x.id === v.alcance) || TECNICA.alcances[0]).custo;
  const cDur = (TECNICA.duracoes.find(x => x.id === v.duracao) || TECNICA.duracoes[0]).custo;
  const cAre = (TECNICA.areas.find(x => x.id === v.area) || TECNICA.areas[0]).custo;
  const soma = cEfeito + cAlc + cDur + cAre;
  const rest = TECNICA.restricoes.find(r => r.id === v.restricaoTipo);
  const leveInvalida = slot.tipo === 'max' && v.restricaoTipo === 'leve'; // Técnica Máxima: só moderada/forte
  const desconto = (rest && !leveInvalida) ? rest.desconto : 0;
  let aprim = 0;
  tecnicaSlots(s).filter(x => x.tipo === 'apr').forEach(x => {
    const a = s.tecnica.itens[x.key];
    if(a && a.alvo === slot.key && a.tipo === 'custo') aprim += Math.max(1, Math.min(2, a.valor | 0));
  });
  const final = Math.max(1, soma - desconto - aprim);
  let jogo = final;
  const nat = getNatureza(s);
  if(nat && nat.id === 'reencarnado') jogo += 1;
  if(s.tracoRaro === 'seisolhos') jogo = Math.ceil(jogo / 2);
  return { soma, desconto, aprim, final, jogo, orc: slot.orc, dentro: soma <= slot.orc, leveInvalida };
}
function varianteResumo(v, s){
  const ef = TECNICA.efeitos.find(e => e.id === v.efeitoTipo) || TECNICA.efeitos[0];
  const q = Math.max(1, v.efeitoQtd | 0), nat = getNatureza(s);
  let t;
  if(ef.id === 'dano') t = `Dano ${q}d6` + (nat && nat.id === 'reencarnado' ? ` (Era Dourada: ${q}d8)` : '');
  else if(ef.id === 'controlo') t = `Controlo (${q} condiç${q > 1 ? 'ões leves' : 'ão leve'})`;
  else if(ef.id === 'buff') t = `Buff (×${q})`;
  else t = 'Utilidade';
  const g = (arr, id) => (arr.find(x => x.id === id) || {}).nome;
  return `${t} · ${g(TECNICA.alcances, v.alcance)} · ${g(TECNICA.duracoes, v.duracao)} · ${g(TECNICA.areas, v.area)}`;
}
function slotValido(s, slot){
  const d = slotData(s, slot);
  if(slot.tipo === 'apr'){
    if(!d.alvo || !d.tipo) return false;
    if(d.tipo === 'dado'){
      const alvo = s.tecnica.itens[d.alvo];
      if(!alvo || alvo.efeitoTipo !== 'dano') return false;
    }
    const irmaos = tecnicaSlots(s).filter(x => x.grupo === slot.grupo && x.key !== slot.key);
    return !irmaos.some(x => s.tecnica.itens[x.key] && s.tecnica.itens[x.key].alvo === d.alvo);
  }
  const c = varianteCalc(d, slot, s);
  return !!(d.nome.trim() && d.restricaoTipo && d.restricaoTexto.trim() && c.dentro && !c.leveInvalida);
}
function faltaSlot(s, slot){
  const d = slotData(s, slot), f = [];
  if(slot.tipo === 'apr'){
    if(!d.alvo) f.push('variante a aprimorar');
    else if(!slotValido(s, slot)) f.push('combinação inválida');
    return f;
  }
  const c = varianteCalc(d, slot, s);
  if(!d.nome.trim()) f.push('nome');
  if(!d.restricaoTipo) f.push('tipo de restrição');
  if(!d.restricaoTexto.trim()) f.push('descrição da restrição');
  if(!c.dentro) f.push('orçamento excedido');
  if(c.leveInvalida) f.push('restrição Leve não permitida na Técnica Máxima');
  return f;
}
function tecnicaValida(s){
  if(s.tracoRaro === 'celestial') return true;
  if(!s.tecnica.conceito.trim()) return false;
  return tecnicaSlots(s).every(sl => slotValido(s, sl));
}

function precisaInvocacao(s){
  const est = getEstilo(s);
  return !!((est && est.invoca) || (s.tecnica.invoca && s.tracoRaro !== 'celestial'));
}

function espacosInfo(s){
  const total = 6 + attrFinalOf(s, 'VIG');
  const usados = s.armas.reduce((t, a) => t + (+a.espacos || 0), 0) + (+s.armadura.espacos || 0);
  return { total, usados, excede: usados > total };
}
const TIPO_NOME = { C: 'Corte', I: 'Impacto', P: 'Perfurante' };
function penalizacaoArma(a, grau){
  const max = ARMA_NIVEL_MAX[grau], dif = (+a.nivel || 1) - max;
  return dif > 0 ? dif : 0;
}

function naturezaChoicesComplete(s){
  const n = getNatureza(s);
  if(!n) return false;
  const p = s.naturezaBonusPicks;
  if(n.bonusType === 'escolha-duas-mais1' && p.length !== 2) return false;
  if(n.bonusType === 'escolha-uma-mais2' && p.length !== 1) return false;
  if(n.bonusType === 'escolha-entre' && p.length !== 1) return false;
  if(n.bonusType === 'receptaculo' && (!p[0] || !p[1])) return false;
  if(n.pedeEraDourada && !s.eraDourada) return false;
  if(n.pedeFisiologia && !s.alienResist.trim()) return false;
  return true;
}
function armasValidas(s){
  if(!s.armas.length) return s.semArma;
  return s.armas.every(a => a.nome.trim() && a.dano.trim() && (!a.custom || a.aprovada)) &&
    (s.armadura.id !== 'pesada' || s.armadura.aprovada) && (s.armadura.id !== 'custom' || s.armadura.aprovada);
}
function stepDone(i, s = STATE){
  switch(i){
    case STEP.IDENT: return nomeValido(s.nome);
    case STEP.CONC:
      return !!s.naturezaId && naturezaChoicesComplete(s) && !!s.arquetipoId && !!s.estiloNome &&
        (!s.tracoRaro || s.tracoRaroAprovado);
    case STEP.ATTR:
      return !!s.naturezaId && (s === STATE ? attrRemaining() === 0 : true) &&
        (excedenteValido(s).length === excedenteTotal(s) || !excedenteTemEspaco(s)) &&
        (progAttrsValidos(s).length >= s.grau || !progAttrsTemEspaco(s));
    case STEP.PERI:
      return !!s.arquetipoId && s.periciasEscolhidas.length === periciasEscolhaTotal(s) &&
        s.progPericias.length === periciasProgTotal(s);
    case STEP.TEC: return !!s.naturezaId && tecnicaValida(s);
    case STEP.EQUIP: return armasValidas(s);
    default: return true;
  }
}
function progresso(s = STATE){
  let done = 0; const falta = [], faltaIdx = [];
  for(let i = 0; i < N_STEPS_REQ; i++){ if(stepDone(i, s)) done++; else { falta.push(STEP_LABELS[i]); faltaIdx.push(i); } }
  return { done, total: N_STEPS_REQ, pct: Math.round(done / N_STEPS_REQ * 100), falta, faltaIdx };
}
function stepAllowed(){ return true; }
function primeiraPorFazer(s){
  for(let i = 0; i < N_STEPS_REQ; i++) if(!stepDone(i, s)) return i;
  return STEP.FICHA;
}

function normalizeState(){
  STATE.excedente = excedenteValido(STATE);
  STATE.progAttrs = progAttrsValidos(STATE);
  const arq = getArquetipo();
  if(arq){
    const tot = periciasEscolhaTotal();
    if(STATE.periciasEscolhidas.length > tot) STATE.periciasEscolhidas = STATE.periciasEscolhidas.slice(0, tot);
    STATE.progPericias = STATE.progPericias.filter(p => !arq.periciasFixas.includes(p) && !STATE.periciasEscolhidas.includes(p)).slice(0, periciasProgTotal(STATE));
  }
}


function computeSheet(raw = STATE){
  const s = migrateRaw(raw);
  const n = getNatureza(s), arq = getArquetipo(s);
  const fa = {}; ATTRS.forEach(a => fa[a.key] = attrFinalOf(s, a.key));
  const celestial = s.tracoRaro === 'celestial', seisOlhos = s.tracoRaro === 'seisolhos';
  const g = s.grau;

  let pv = arq.pv.base + fa[arq.pv.attr] + n.ajuste.PV;
  let paN = arq.pa.base + fa[arq.pa.attr] + n.ajuste.PA;
  let co = arq.coesao.base + fa[arq.coesao.attr] + n.ajuste.Coesao;
  for(let i = 0; i < g; i++){
    pv += arq.pvInc[i] + fa[arq.pv.attr];
    paN += arq.paInc + fa[arq.pa.attr];
    co += arq.coInc + fa[arq.coesao.attr];
  }
  const pa = celestial ? 0 : paN;
  const defesa = 10 + fa.AGI * 2;
  const limitePA = seisOlhos ? null : LIMITE_PA[g];
  const reservaVigor = celestial ? LIMITE_PA[g] : 0;
  const esp = espacosInfo(s);
  const estilo = getEstilo(s);
  const slots = celestial ? [] : tecnicaSlots(s);
  return { s, n, arq, fa, pv, pa, co, defesa, limitePA, reservaVigor, esp, estilo, slots, celestial, seisOlhos, g,
    periciasFinal: periciasTreinadas(s) };
}


let saveStatus = 'idle', saveTimer = null, lastSaved = '';
function loadSheets(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch(e){ return []; }
}
function saveSheets(list){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; } catch(e){ return false; }
}
function snapshotState(){
  const snap = JSON.parse(JSON.stringify(STATE));
  snap.excedente = excedenteValido(STATE);
  return snap;
}
function estadoVazio(){
  const d = defaultState(); const a = snapshotState();
  ['id', 'criadaEm'].forEach(k => { delete a[k]; delete d[k]; });
  return JSON.stringify(a) === JSON.stringify(d);
}
function autosave(){
  if(estadoVazio()) return;
  const snap = snapshotState();
  const key = JSON.stringify(snap);
  if(key === lastSaved) return;
  const list = loadSheets();
  const rec = { id: STATE.id, criadaEm: STATE.criadaEm, editadaEm: new Date().toLocaleDateString('pt-PT'), raw: snap };
  const idx = list.findIndex(f => f.id === STATE.id);
  if(idx >= 0) list[idx] = Object.assign(list[idx], rec); else list.push(rec);
  saveStatus = saveSheets(list) ? 'ok' : 'erro';
  if(saveStatus === 'ok') lastSaved = key;
  renderSaveStatus();
}
function autosaveSoon(){
  saveStatus = 'a-guardar'; renderSaveStatus();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 350);
}
function renderSaveStatus(){
  const el = $('save-status'); if(!el) return;
  el.textContent = saveStatus === 'ok' ? '✓ Guardado neste dispositivo'
    : saveStatus === 'a-guardar' ? 'A guardar…'
    : saveStatus === 'erro' ? 'Não foi possível guardar (armazenamento cheio?)' : '';
  el.className = 'save-status ' + saveStatus;
}


function resetEdit(){
  _fxStep = null; EDIT.open = false; EDIT.closing = false; EDIT.anim = null; EDIT.key = null;
  const r = $('pe-root'); if(r) r.innerHTML = '';
  document.body.style.overflow = '';
  carIdx = 0;
}
let _curView = null;
const _reduceFx = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function viewFx(v){
  if(_reduceFx()) return;
  const el = $('view-' + v);
  if(v === 'home'){ el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
  if(v === 'list'){ el.classList.remove('view-in'); void el.offsetWidth; el.classList.add('view-in'); }
  if(_curView && _curView !== v){
    const w = document.createElement('div');
    w.className = 'fx-wipe fixed'; w.innerHTML = '<i class="a"></i><i class="b"></i><i class="c"></i>';
    document.body.appendChild(w); setTimeout(() => w.remove(), 950);
  }
}
function setupReveal(){
  if(_reduceFx() || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-rv');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    e.target.querySelectorAll('.fact-num').forEach(n => {
      const to = parseInt(n.textContent, 10); if(!(to > 0)) return;
      const t0 = performance.now(); n.dataset.to = to;
      const tick = t => { const k = Math.min(1, (t - t0) / 900); n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if(k < 1) requestAnimationFrame(tick); else n.textContent = to; };
      requestAnimationFrame(tick);
    });
  }), { threshold: 0, rootMargin: "0px 0px -60px 0px" });
  document.querySelectorAll('#view-home .block').forEach(b => { b.classList.add('rv'); io.observe(b); });
}
function showView(v){
  viewFx(v); _curView = v;
  ['home', 'list', 'editor'].forEach(x => { const el = $('view-' + x); if(el) el.hidden = (x !== v); });
  const bar = $('progress-bar'); if(bar) bar.hidden = (v !== 'editor');
  const mk = $('header-mark'); if(mk) mk.hidden = (v === 'editor');
  window.scrollTo(0, 0);
}
function openEditorFor(record){
  clearTimeout(saveTimer); resetEdit();
  const m = migrateRaw(record.raw);
  if(m.excedente === undefined) m.excedente = [];
  Object.assign(STATE, defaultState(), m, { id: record.id, criadaEm: record.criadaEm || m.criadaEm });
  lastSaved = JSON.stringify(snapshotState());
  normalizeState();
  STATE.step = record.raw.concluida === undefined || m.concluida ? STEP.FICHA : primeiraPorFazer(STATE);
  saveStatus = 'ok';
  showView('editor'); mount();
}
function startNew(){
  clearTimeout(saveTimer); resetEdit();
  Object.assign(STATE, defaultState());
  lastSaved = ''; saveStatus = 'idle';
  showView('editor'); mount();
}
function leaveEditor(){
  clearTimeout(saveTimer); autosave(); resetEdit();
  renderList(); showView('list');
}


let _fxStep = null, _fxTimer = null;
function stepFx(){
  const card = document.querySelector('.ed-card'), body = $('ed-body');
  const changed = _fxStep !== null && _fxStep !== STATE.step;
  const rev = _fxStep !== null && STATE.step < _fxStep;
  _fxStep = STATE.step;
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
  clearTimeout(_fxTimer); _fxTimer = setTimeout(() => body.classList.remove('enter'), 1500);
  if(changed && card){
    const w = document.createElement('div');
    w.className = 'fx-wipe' + (rev ? ' rev' : '');
    w.innerHTML = '<i class="a"></i><i class="b"></i><i class="c"></i>';
    card.appendChild(w); setTimeout(() => w.remove(), 950);
  }
}
function mount(opts = {}){
  normalizeState();
  renderHead(); renderTabs(); renderProgress(); renderNav();
  if(!opts.keepBody && !EDIT.open){
    $('ed-body').innerHTML = renderStep();
    if(_fxStep !== STATE.step) stepFx();
  }
  renderSaveStatus();
  if(EDIT.open) renderEditPanel();
  if(!opts.noSave) autosaveSoon();
}
function refreshChrome(){
  renderHead(); renderTabs(); renderProgress(); renderNav(); renderSaveStatus();
  autosaveSoon();
}

function renderHead(){
  const n = getNatureza(), arq = getArquetipo();
  const linha = [STATE.nome.trim(), n && n.nome, arq && arq.nome, GRAUS[STATE.grau]].filter(Boolean);
  $('ed-head').innerHTML = `
    <h1 class="ed-title">${STATE.concluida ? 'Editar Personagem' : 'Criar um Novo Personagem'}</h1>
    <p class="ed-sub">Sete etapas, na ordem que quiseres. O restante pode ser ajustado depois.</p>
    ${STATE.nome.trim() ? `<p class="ed-sub2">${esc(linha.join(' · '))}</p>` : ''}`;
}
function renderTabs(){
  $('ed-tabs').innerHTML = STEP_LABELS.map((l, i) => {
    const done = i < N_STEPS_REQ && stepDone(i);
    return `<button class="tab ${i === STATE.step ? 'active' : ''} ${done ? 'done' : ''}" data-act="goto" data-i="${i}">
      <span class="bar"></span><span class="tl">${done ? '✓ ' : ''}${l}</span></button>`;
  }).join('');
}
function renderProgress(){
  const p = progresso();
  $('progress-fill').style.width = p.pct + '%';
  $('progress-text').textContent = p.done >= p.total
    ? (STATE.concluida ? 'Ficha concluída' : 'Tudo preenchido, finaliza na aba Ficha')
    : `${p.done}/${p.total} etapas · falta${p.falta.length > 1 ? 'm' : ''}: ${p.falta.slice(0, 3).join(', ')}${p.falta.length > 3 ? '…' : ''}`;
}
function renderNav(){
  const i = STATE.step;
  $('ed-nav').innerHTML = `
    <button class="btn sm ghost" data-act="sair">← Fichas</button>
    <div class="spacer"></div>
    <span id="save-status" class="save-status"></span>
    ${i > 0 ? '<button class="btn sm ghost" data-act="prev">‹ Anterior</button>' : ''}
    ${i < STEP.FICHA ? '<button class="btn sm primary" data-act="next">Seguinte ›</button>' : ''}`;
}


function renderStep(){
  switch(STATE.step){
    case STEP.IDENT: return stepIdentidade();
    case STEP.CONC: return stepConceito();
    case STEP.ATTR: return stepAtributos();
    case STEP.PERI: return stepPericias();
    case STEP.TEC: return stepTecnica();
    case STEP.EQUIP: return stepEquipamento();
    case STEP.FICHA: return stepFicha();
    default: return '';
  }
}
const head = (t, d) => `<h2 class="step-title">${t}</h2>${d ? `<p class="step-desc">${d}</p>` : ''}`;
const needFirst = (titulo, texto, idx, label) =>
  `${head(titulo)}<div class="card warn"><p>${texto}</p><div class="row end"><button class="btn primary sm" data-act="goto" data-i="${idx}">Ir para ${label} →</button></div></div>`;

function stepIdentidade(){
  const inv = !nomeValido(STATE.nome);
  return `
    ${head('Identidade', 'Como será reconhecido o teu personagem na mesa?')}
    <div class="grid g2">
      <div class="span2">
        <label class="field"><span>Nome do personagem *</span>
          <input type="text" id="in-nome" class="${inv ? 'invalid' : ''}" data-bind="nome" value="${esc(STATE.nome)}" placeholder="Ex: Kaori Amasawa" autocomplete="off"></label>
        <p class="err sm" id="nome-erro" ${inv ? '' : 'hidden'}>Indica um nome com pelo menos duas letras; usa apenas letras, espaços, hífen ou apóstrofo.</p>
      </div>
      <div class="foto-card span2">
        <div class="fc-h"><b>Foto</b> <span class="muted">· opcional</span></div>
        <p class="muted sm">Podes também escolher ou enviar uma foto depois.</p>
        <div class="fc-row">
          <div class="photo big">${STATE.foto ? `<img src="${STATE.foto}" alt="Foto">` : '<span>?</span>'}</div>
          <div class="fc-btns">
            <label class="btn sm">Escolher foto do computador<input type="file" accept="image/*" data-foto hidden></label>
            ${STATE.foto ? '<button class="btn sm ghost" data-act="foto-remove">Remover</button>' : ''}
          </div>
        </div>
      </div>
      <label class="field"><span>Idade (0 = desconhecida)</span>
        <input type="number" min="0" data-bind="idade" data-num value="${esc(STATE.idade || 0)}"></label>
      <label class="field"><span>Local de nascimento · opcional</span>
        <input type="text" data-bind="local" value="${esc(STATE.local)}" placeholder="Ex: Lisboa, Portugal"></label>
      <label class="field span2"><span>Nome do jogador · opcional</span>
        <input type="text" data-bind="jogador" value="${esc(STATE.jogador)}"></label>
    </div>
    <h3 class="sec-title">História e aparência <small>(opcional · aparece em “Sobre” na ficha)</small></h3>
    <div class="card">
      <label class="field"><span>História</span><textarea rows="5" data-bind="historia" placeholder="De onde vem, o que viveu, porque luta…">${esc(STATE.historia)}</textarea></label>
      <label class="field"><span>Aparência / personalidade</span><textarea rows="3" data-bind="aparencia">${esc(STATE.aparencia)}</textarea></label>
    </div>`;
}
function updateNomeErro(el){
  const bad = !nomeValido(el.value);
  el.classList.toggle('invalid', bad);
  const m = $('nome-erro'); if(m) m.hidden = !bad;
}

/* ---------- Conceito (Grau · Natureza · Arquétipo · Estilo · Traço Raro) ---------- */
const sinal = (v) => (v >= 0 ? '+' : '') + v;
function isBonusPicked(key, idx){ const p = STATE.naturezaBonusPicks; return idx === undefined ? p.includes(key) : p[idx] === key; }
const selHTML = (opts, cur, attrs, disabled) =>
  `<select ${attrs} ${disabled ? 'disabled' : ''}><option value="">Escolhe</option>${opts.map(o =>
    `<option value="${esc(o.v)}" ${cur === o.v ? 'selected' : ''} ${o.dis ? 'disabled' : ''}>${esc(o.t)}</option>`).join('')}</select>`;

function stepConceito(){
  const n = getNatureza(), arq = getArquetipo(), est = getEstilo();
  const estilos = arq ? ESTILOS[arq.id].map(e => ({ v: e.nome, t: e.nome })) : [];
  return `
    ${head('Conceito', 'Define a base do personagem. Podes rever estas escolhas depois.')}
    <div class="grid g2">
      <label class="field span2"><span>Grau *</span>
        <select data-bind="grau" data-num data-rerender>${GRAUS.map((g, i) => `<option value="${i}" ${STATE.grau === i ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      <label class="field"><span>Natureza *</span>${selHTML(NATUREZAS.map(x => ({ v: x.id, t: x.nome })), STATE.naturezaId || '', 'data-sel-act="natureza"')}</label>
      <label class="field"><span>Arquétipo *</span>${selHTML(ARQUETIPOS.map(x => ({ v: x.id, t: x.nome })), STATE.arquetipoId || '', 'data-sel-act="arquetipo"')}</label>
      <label class="field"><span>Estilo *</span>${selHTML(estilos, STATE.estiloNome || '', 'data-sel-act="estilo"', !arq)}</label>
      <label class="field"><span>Traço Raro · opcional</span>${selHTML(TRACOS_RAROS.map(t => ({ v: t.id, t: t.nome + (t.disponivel ? '' : ' (por escrever)'), dis: !t.disponivel })), STATE.tracoRaro || '', 'data-sel-act="traco-set"')}</label>
    </div>
    <p class="muted sm">Um personagem novo começa no Grau 4. Se a campanha já vai adiantada, escolhe o Grau atual: PV, PA, Coesão, Atributos, Perícias, Técnica e armas ajustam-se e escolhes o que ganhaste em cada etapa.${arq ? '' : ' O Estilo abre depois de escolheres o Arquétipo.'}</p>
    ${n ? naturezaDetalhe(n) : ''}
    ${arq ? arquetipoDetalhe(arq) : ''}
    ${est ? `<div class="card accent"><h4>Estilo ${esc(est.nome)}</h4><p class="muted">${est.resumo}</p><p class="lbl">Habilidades</p>${estiloHabilidadesHTML(est, STATE.grau)}</div>` : ''}
    ${tracoRaroDetalhe()}`;
}
function naturezaDetalhe(n){
  const chips = (keys, act, idx) => keys.map(k => {
    const a = ATTRS.find(x => x.key === k);
    return `<button class="chip ${isBonusPicked(k, idx) ? 'on' : ''}" data-act="${act}" data-key="${k}">${a.name}</button>`;
  }).join('');
  const all = ATTRS.map(a => a.key);
  let bonus = '';
  if(n.bonusType === 'escolha-duas-mais1') bonus = `<p class="lbl">${n.bonusTexto} Escolhe 2</p><div class="chips">${chips(all, 'bonus-multi')}</div>`;
  else if(n.bonusType === 'escolha-uma-mais2') bonus = `<p class="lbl">${n.bonusTexto}</p><div class="chips">${chips(all, 'bonus-single')}</div>`;
  else if(n.bonusType === 'escolha-entre') bonus = `<p class="lbl">${n.bonusTexto}</p><div class="chips">${chips(n.bonusOpcoes, 'bonus-single')}</div>`;
  else if(n.bonusType === 'receptaculo') bonus = `<p class="lbl">+1 livre à escolha</p><div class="chips">${chips(all, 'bonus-i0', 0)}</div>
      <p class="lbl">+1 no Atributo associado ao Objeto Amaldiçoado</p><div class="chips">${chips(all, 'bonus-i1', 1)}</div>`;
  let extra = '';
  if(n.pedePericiaLigada) extra += `<label class="field"><span>Perícia ligada à Técnica Inata (a tua "paixão")</span>
      <select data-bind="periciaLigada"><option value="">Escolhe</option>${PERICIAS.map(p => `<option ${STATE.periciaLigada === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label>`;
  if(n.pedeFonteSustento) extra += `<label class="field"><span>Fonte de Sustento</span><input type="text" data-bind="fonteSustento" value="${esc(STATE.fonteSustento)}" placeholder="ex: sangue humano"></label>`;
  if(n.pedeObjeto) extra += `<label class="field"><span>Objeto Amaldiçoado</span><input type="text" data-bind="objeto" value="${esc(STATE.objeto)}" placeholder="ex: um espelho antigo"></label>`;
  if(n.pedeEraDourada) extra += `<div class="field"><span>Poder da Era Dourada - Controlo/Utilidade/Buff sobem… (fixo depois de decidido)</span>
      <div class="chips"><button class="chip ${STATE.eraDourada === 'duracao' ? 'on' : ''}" data-act="era" data-v="duracao">Duração +1 nível</button>
      <button class="chip ${STATE.eraDourada === 'area' ? 'on' : ''}" data-act="era" data-v="area">Área +1 nível</button></div></div>`;
  if(n.pedeFisiologia) extra += `<div class="grid g2"><label class="field"><span>Resistência a Dano contra…</span><input type="text" data-bind="alienResist" value="${esc(STATE.alienResist)}" list="dl-dano" placeholder="ex: Corte"></label>
      <label class="field"><span>…e vulnerável a (define com o mestre)</span><input type="text" data-bind="alienVuln" value="${esc(STATE.alienVuln)}" list="dl-dano"></label></div>
      <datalist id="dl-dano"><option value="Corte"><option value="Impacto"><option value="Perfurante"></datalist>`;
  return `<div class="card accent">
      <h4>Natureza ${esc(n.nome)}</h4><p class="muted">${n.resumo}</p>
      <div class="tags"><span class="tag">PV ${sinal(n.ajuste.PV)}</span><span class="tag">PA ${sinal(n.ajuste.PA)}</span><span class="tag">Coesão ${sinal(n.ajuste.Coesao)}</span></div>
      <ul class="plain sub">${n.tracos.map(([t, x]) => `<li><b>Traço Racial${t}:</b> ${x}</li>`).join('')}</ul>
      ${bonus ? `<div class="sub">${bonus}</div>` : ''}${extra ? `<div class="sub stack">${extra}</div>` : ''}</div>`;
}
function arquetipoDetalhe(arq){
  return `<div class="card accent"><h4>Arquétipo ${esc(arq.nome)}</h4><p class="muted">${arq.resumo}</p>
    <div class="tags"><span class="tag">PV ${arq.pv.base} + ${arq.pv.attr}</span><span class="tag">PA ${arq.pa.base} + ${arq.pa.attr}</span><span class="tag">Coesão ${arq.coesao.base} + ${arq.coesao.attr}</span></div>
    <p class="sub"><b>Habilidade de Arquétipo:</b> ${arq.habilidade}</p>
    <p><b>Perícias:</b> treinado em ${arq.periciasFixas.join(' e ')} (fixas), mais ${arq.periciasEscolha} à escolha, mais o mod. de ${arq.periciasExtraAttr} (mínimo 0).</p>
    <p><b>Ao subir de Grau:</b> PV +${arq.pvInc.join('/')} (+Vigor), PA +${arq.paInc} (+Intelecto), Coesão +${arq.coInc} (+Presença).</p></div>`;
}
function tracoRaroDetalhe(){
  const sel = getTracoRaro();
  if(!sel) return '';
  return `<div class="card accent"><h4>Traço Raro ${esc(sel.nome)}</h4><p class="muted">${sel.resumo}</p>
    <ul class="plain sub">${sel.texto.map(([t, x]) => `<li><b>${t}:</b> ${x}</li>`).join('')}</ul>
    <label class="check"><input type="checkbox" data-bind="tracoRaroAprovado" data-check data-rerender ${STATE.tracoRaroAprovado ? 'checked' : ''}><span>O mestre aprovou este traço para o meu personagem</span></label></div>`;
}
function estiloHabilidadesHTML(est, grau){
  return `<ul class="plain">${est.graus.map((g, i) => {
    const on = grau >= ESTILO_DESBLOQUEIO[i];
    return `<li class="${on ? '' : 'locked'}"><b>${g.grau} ${g.nome}</b> <span class="tag">${g.custo}</span> ${on ? '' : '<span class="tag dim"> Por desbloquear</span>'}<br>${g.texto}</li>`;
  }).join('')}</ul>`;
}

/* ---------- Atributos: selo amaldiçoado ---------- */
function starPath(cx, cy, r){
  const p = [0, 1, 2, 3, 4].map(k => { const a = (-90 + k * 72) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  return [0, 2, 4, 1, 3, 0].map((k, i) => (i ? 'L' : 'M') + p[k][0].toFixed(1) + ' ' + p[k][1].toFixed(1)).join(' ');
}
function selloHTML(edit){
  const cx = 210, cy = 205, R = 138, rn = 45;
  const seq = ['AGI', 'INT', 'VIG', 'PRE', 'FOR'];
  const exX = ZERO_ATTRS(); excedenteValido(STATE).forEach(k => exX[k]++);
  const pgX = ZERO_ATTRS(); progAttrsValidos(STATE).forEach(k => pgX[k]++);
  const pos = seq.map((k, i) => { const a = (-90 + i * 72) * Math.PI / 180; return { k, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  const lines = [0, 1, 2, 3, 4].map(i => {
    const a = pos[i], b = pos[(i + 2) % 5];
    return `<line class="sl-line" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`;
  }).join('');
  let ticks = '';
  for(let t = 0; t < 72; t++){
    const a = t * 5 * Math.PI / 180, r1 = 200, r2 = t % 6 === 0 ? 188 : 193;
    ticks += `<line class="sl-tick" x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + r2 * Math.cos(a)).toFixed(1)}" y2="${(cy + r2 * Math.sin(a)).toFixed(1)}"/>`;
  }
  const rem = attrRemaining();
  const core = edit
    ? `<text class="sl-lbl" x="${cx}" y="${cy - 14}">POR GASTAR</text><text class="sl-pts ${rem === 0 ? 'zero' : ''}" x="${cx}" y="${cy + 26}">${rem}</text>`
    : `<text class="sl-kanji" x="${cx}" y="${cy + 22}">呪</text>`;
  const nodes = pos.map(p => {
    const a = ATTRS.find(x => x.key === p.k), fin = attrFinal(p.k), base = STATE.attrs[p.k];
    const tags = [], nb = STATE.naturezaBonusMap[p.k] || 0;
    if(nb) tags.push(`nat ${fmt(nb)}`);
    if(exX[p.k]) tags.push(`exc ${fmt(exX[p.k])}`);
    if(pgX[p.k]) tags.push(`grau ${fmt(pgX[p.k])}`);
    const minusOff = base <= -1, plusOff = base >= MAX_ATTR || rem <= 0;
    const btn = (dx, dir, off, sym) => `<g class="sl-btn ${off ? 'off' : ''}" data-act="attr" data-key="${p.k}" data-dir="${dir}"><circle cx="${(p.x + dx).toFixed(1)}" cy="${(p.y + 31).toFixed(1)}" r="9"/><text x="${(p.x + dx).toFixed(1)}" y="${(p.y + 31).toFixed(1)}">${sym}</text></g>`;
    return `<g class="sl-node ${fin > 0 ? 'lit' : ''} ${fin < 0 ? 'neg' : ''}">
      <circle class="sl-n" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rn}"/>
      <text class="sl-val" x="${p.x.toFixed(1)}" y="${(p.y - 3).toFixed(1)}">${fmt(fin)}</text>
      <text class="sl-key" x="${p.x.toFixed(1)}" y="${(p.y + 14).toFixed(1)}">${p.k}</text>
      ${edit ? btn(-21, -1, minusOff, '−') + btn(21, 1, plusOff, '+') : ''}
      <text class="sl-name" x="${p.x.toFixed(1)}" y="${(p.y + rn + 14).toFixed(1)}">${a.name}</text>
      ${tags.length ? `<text class="sl-tag" x="${p.x.toFixed(1)}" y="${(p.y + rn + 26).toFixed(1)}">${tags.join(' · ')}</text>` : ''}
    </g>`;
  }).join('');
  return `<svg class="seal" viewBox="0 0 420 405" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Selo de atributos">
    <defs><filter id="slGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g class="sl-spin"><circle class="sl-ring" cx="${cx}" cy="${cy}" r="204"/>${ticks}</g>
    <circle class="sl-ring2" cx="${cx}" cy="${cy}" r="182"/>
    <path class="sl-star" d="${starPath(cx, cy, 182)}"/>
    ${lines}
    <circle class="sl-core" cx="${cx}" cy="${cy}" r="62"/>
    ${core}
    ${nodes}
  </svg>`;
}
function stepAtributos(){
  const n = getNatureza();
  const rem = attrRemaining(), pool = attrPool(), spent = attrSpent();
  const exTotal = excedenteTotal(STATE), exVal = excedenteValido(STATE);
  const extra = ZERO_ATTRS(); exVal.forEach(k => extra[k]++);
  const progV = progAttrsValidos(STATE);

  let exUI = '';
  if(exTotal > 0){
    const falta = exTotal - exVal.length;
    exUI = `<div class="card warn"><p><b>Excedente acima de +${MAX_ATTR}.</b> O teto é absoluto, mesmo com o bónus da Natureza: ${exTotal} ponto${exTotal > 1 ? 's' : ''} passa${exTotal > 1 ? 'm' : ''} para outro Atributo à tua escolha.</p>
      <div class="chips">${ATTRS.map(a => {
        const full = Math.min(MAX_ATTR, baseAttr(STATE, a.key)) + extra[a.key] >= MAX_ATTR;
        return `<button class="chip" data-act="exc-add" data-key="${a.key}" ${(full || falta === 0) ? 'disabled' : ''}>+1 ${a.name}</button>`;
      }).join('')}</div>
      ${exVal.length ? `<div class="chips">${exVal.map((k, i) => `<button class="chip on" data-act="exc-rem" data-i="${i}">${ATTRS.find(a => a.key === k).name} ✕</button>`).join('')}</div>` : ''}
      <div class="counter ${falta === 0 ? 'ok' : ''}">Por redirecionar: <b>${falta}</b> / ${exTotal}</div></div>`;
  }

  let progUI = '';
  if(STATE.grau > 0){
    const falta = STATE.grau - progV.length;
    progUI = `<div class="card accent"><p><b>Progressão de Grau (${GRAUS[STATE.grau]}).</b> Ganhas +1 Atributo à escolha em cada degrau (${STATE.grau} no total). Teto absoluto: +${ATTR_PROG_MAX}.</p>
      <div class="chips">${ATTRS.map(a => `<button class="chip" data-act="prog-add" data-key="${a.key}" ${(attrFinal(a.key) >= ATTR_PROG_MAX || falta === 0) ? 'disabled' : ''}>+1 ${a.name}</button>`).join('')}</div>
      ${progV.length ? `<div class="chips">${progV.map((k, i) => `<button class="chip on" data-act="prog-rem" data-i="${i}">${ATTRS.find(a => a.key === k).name} ✕</button>`).join('')}</div>` : ''}
      <div class="counter ${falta === 0 ? 'ok' : ''}">Por distribuir: <b>${falta}</b> / ${STATE.grau}</div></div>`;
  }

  let recursos = '<p class="muted sm">Escolhe a Natureza e o Arquétipo no Conceito para veres PV, PA e Coesão.</p>';
  if(STATE.naturezaId && STATE.arquetipoId){
    const c = computeSheet(STATE);
    recursos = `<div class="chips"><span class="chip static">PV <b>${c.pv}</b></span><span class="chip static">PA <b>${c.celestial ? '-' : c.pa}</b></span><span class="chip static">Coesão <b>${c.co}</b></span><span class="chip static">Defesa <b>${c.defesa}</b></span></div>`;
  }

  return `${head('Atributos', 'Edita os valores diretamente nos nós do selo. PV, PA e Coesão calculam-se sozinhos.')}
    ${n ? '' : `<div class="card warn"><p>Ainda não escolheste a Natureza: o bónus de Atributo dela só entra depois de a escolheres.</p><div class="row end"><button class="btn sm" data-act="goto" data-i="${STEP.CONC}">Ir para Conceito →</button></div></div>`}
    <div class="card pts">
      <div class="row between"><p><b>Pontos de atributo</b></p><span class="badge">Regra padrão · ${pool} pontos</span></div>
      <p><b>${pool}</b> pontos permitidos · <b>${spent}</b> distribuídos · <b class="${rem === 0 ? 'okc' : ''}">${rem}</b> restantes</p>
      <p class="muted sm">Cada atributo começa em 0 e vai até +${MAX_ATTR} na criação. Baixar um atributo para −1 concede +1 ponto. O bónus da Natureza soma-se depois, e o que passar de +${MAX_ATTR} é redirecionado.</p>
    </div>
    <div class="seal-wrap">${selloHTML(true)}</div>
    <div class="card"><p class="lbl">Recursos</p>${recursos}
      <p class="muted sm">Cada ponto positivo = +1 dado de vantagem (máx. 5d20). Atributo −1 = desvantagem. Como alvo passivo cada ponto vale +2 (Defesa = 10 + Agilidade × 2).</p></div>
    ${exUI}${progUI}`;
}

/* ---------- Perícias ---------- */
function stepPericias(){
  const arq = getArquetipo();
  if(!arq) return needFirst('Perícias', 'Escolhe primeiro o Arquétipo no Conceito: é ele que define as Perícias fixas e quantas podes escolher.', STEP.CONC, 'Conceito');
  const tot = periciasEscolhaTotal(), ch = STATE.periciasEscolhidas.length;
  const ptot = periciasProgTotal(STATE), pch = STATE.progPericias.length;
  const livre = (p) => !arq.periciasFixas.includes(p.name);
  const grid = (list, act, sel, cheio) => `<div class="chips">${list.map(p => {
    const on = sel.includes(p.name), off = !on && cheio;
    return `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-name="${esc(p.name)}" ${off ? 'disabled' : ''}>${p.name} <small>${p.attr}</small></button>`;
  }).join('')}</div>`;
  const disponiveisProg = PERICIAS.filter(p => livre(p) && !STATE.periciasEscolhidas.includes(p.name));
  return `${head('Perícias', `Treinada = +5 ao teste (perito +10). Fixas do Arquétipo: <b>${arq.periciasFixas.join(', ')}</b>.`)}
    <div class="counter ${ch === tot ? 'ok' : ''}">Da criação: <b>${ch}</b> / ${tot} <small>(${arq.periciasEscolha} do Arquétipo + mod. de ${arq.periciasExtraAttr})</small></div>
    ${grid(PERICIAS.filter(p => livre(p) && !STATE.progPericias.includes(p.name)), 'pericia', STATE.periciasEscolhidas, ch >= tot)}
    ${ptot > 0 ? `<h3 class="sec-title">Progressão de Grau</h3>
      <p class="muted">Ganhas +1 Perícia treinada em cada Grau cheio (Grau 3, 2, 1 e Especial).</p>
      <div class="counter ${pch === ptot ? 'ok' : ''}">Ganhas por Grau: <b>${pch}</b> / ${ptot}</div>
      ${grid(disponiveisProg, 'pericia-prog', STATE.progPericias, pch >= ptot)}` : ''}`;
}

/* ---------- Técnica Inata: carrossel de cartas ---------- */
function slotShort(sl){
  const m = { 'g4-0': 'Grau 4', 'apt': 'Aptidão', 'g3-0': 'Grau 3', 'g3-1': 'Grau 3', 'g2-0': 'Grau 2', 'g1-0': 'Grau 1', 'max': 'Máxima' };
  return m[sl.key] || sl.label;
}
const variantSlots = () => tecnicaSlots(STATE).filter(x => x.tipo !== 'apr');

function cartaHTML(sl, i){
  const d = slotData(STATE, sl), c = varianteCalc(d, sl, STATE), bad = faltaSlot(STATE, sl).length > 0;
  const o = i - carIdx, ao = Math.abs(o);
  const desc = d.descricao && d.descricao.trim();
  const apr = tecnicaSlots(STATE).some(x => x.tipo === 'apr' && STATE.tecnica.itens[x.key] && STATE.tecnica.itens[x.key].alvo === sl.key);
  return `<div class="ccard ${o === 0 ? 'center' : ''} ${ao > 2 ? 'far' : ''}" data-i="${i}" data-key="${sl.key}" ${o !== 0 ? 'data-act="car-go"' : ''} style="--o:${o};--ao:${ao};--z:${10 - ao}">
    <div class="ccard-in">
      <span class="c-tag">${slotShort(sl)}${apr ? ' ✦' : ''}</span><span class="c-cost">${c.jogo} PA</span>
      <span class="c-dot ${bad ? 'bad' : 'ok'}" title="${bad ? 'Por completar' : 'Completa'}"></span>
      ${d.foto ? `<div class="c-photo"><img src="${d.foto}" alt=""></div>` : ''}
      <div class="c-desc ${d.foto ? '' : 'full'}">${desc ? `<p class="pre">${esc(d.descricao)}</p>` : '<p class="muted">Sem descrição ainda.</p>'}</div>
    </div></div>`;
}
function carrosselHTML(readonly){
  const slots = variantSlots();
  carIdx = Math.max(0, Math.min(slots.length - 1, carIdx));
  const cur = slots[carIdx];
  return `<div class="car">
    <div class="car-row">
      <button class="car-arrow l" data-act="car-prev" aria-label="Anterior">${ARROW_L}</button>
      <div class="car-stage">${slots.map((sl, i) => cartaHTML(sl, i)).join('')}</div>
      <button class="car-arrow r" data-act="car-next" aria-label="Seguinte">${ARROW_R}</button>
    </div>
    <div class="car-dots">${slots.map((sl, i) => `<button class="dot ${i === carIdx ? 'on' : ''}" data-act="car-go" data-i="${i}" title="${esc(nomeVariante(STATE, sl.key))}"></button>`).join('')}</div>
    <div class="car-bar">
      ${readonly ? '' : `<button class="cb-btn" data-act="slot-edit" data-key="${cur.key}" title="Editar">${ICON_EDIT}</button>`}
      <div class="cb-name" id="car-name">${esc(nomeVariante(STATE, cur.key))}</div>
      ${readonly ? '' : `<button class="cb-btn danger" data-act="slot-clear" data-key="${cur.key}" title="Apagar conteúdo">${ICON_TRASH}</button>`}
    </div></div>`;
}
function carGo(n){
  const car = document.querySelector('.car'); if(!car) return;
  const slots = variantSlots();
  carIdx = Math.max(0, Math.min(slots.length - 1, n));
  car.querySelectorAll('.ccard').forEach(el => {
    const i = +el.dataset.i, o = i - carIdx, ao = Math.abs(o);
    el.style.setProperty('--o', o); el.style.setProperty('--ao', ao); el.style.setProperty('--z', 10 - ao);
    el.classList.toggle('center', o === 0); el.classList.toggle('far', ao > 2);
    if(o === 0) el.removeAttribute('data-act'); else el.setAttribute('data-act', 'car-go');
  });
  car.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('on', i === carIdx));
  const cur = slots[carIdx];
  const nm = car.querySelector('#car-name'); if(nm) nm.textContent = nomeVariante(STATE, cur.key);
  car.querySelectorAll('.cb-btn').forEach(b => { b.dataset.key = cur.key; });
}
function aprimRowHTML(readonly){
  const aps = tecnicaSlots(STATE).filter(x => x.tipo === 'apr');
  if(!aps.length) return '<p class="muted sm">Os aprimoramentos desbloqueiam no Semi-Grau 2.</p>';
  return `<h3 class="sec-title">Aprimoramentos <small>(cada um melhora uma variante)</small></h3>
    <div class="apr-row">${aps.map(sl => {
      const a = slotData(STATE, sl), bad = faltaSlot(STATE, sl).length > 0;
      const t = { custo: `−${a.valor} PA no custo`, bloco: '+1 bloco sem custo extra', dado: 'dado de dano +1 passo' }[a.tipo];
      return `<div class="acard" data-key="${sl.key}">
        <span class="c-dot ${bad ? 'bad' : 'ok'}"></span>
        <div class="ac-top">✦ ${esc(sl.label)}</div>
        <div class="ac-main">${a.alvo ? esc(nomeVariante(STATE, a.alvo)) : '<span class="muted">Sem variante escolhida</span>'}</div>
        <div class="ac-sub">${a.alvo ? t + (a.nota ? ' · ' + esc(a.nota) : '') : ''}</div>
        ${readonly ? '' : `<div class="ac-btns"><button class="btn sm" data-act="slot-edit" data-key="${sl.key}">Editar</button><button class="btn sm danger" data-act="slot-clear" data-key="${sl.key}">Apagar</button></div>`}
      </div>`;
    }).join('')}</div>`;
}
function stepTecnica(){
  if(STATE.tracoRaro === 'celestial') return `${head('Técnica Inata')}<div class="card warn"><p><b>Restrição Celestial:</b> não tens energia amaldiçoada, logo não tens Técnica Inata.</p></div>`;
  if(!STATE.naturezaId) return needFirst('Técnica Inata', 'Escolhe primeiro a Natureza no Conceito: ela decide variantes extra (Feiticeiro) e ajusta custos (Reencarnado).', STEP.CONC, 'Conceito');
  return `${head('Técnica Inata', 'Um <b>Conceito</b> fixo e, em cada Grau, uma carta nova: uma variante com 4 blocos (Efeito, Alcance, Duração, Área) e uma <b>Restrição</b> que dá desconto. Usa as setas para navegar e <b>Editar</b> para a abrir.')}
    <div class="card">
      <label class="field"><span>Conceito (em termos físicos o que a técnica faz, não muda)</span>
        <input type="text" data-bind="tecnica.conceito" value="${esc(STATE.tecnica.conceito)}" placeholder='ex: "manipula sombras como matéria sólida"'></label>
      <label class="check"><input type="checkbox" data-bind="tecnica.invoca" data-check data-rerender ${STATE.tecnica.invoca ? 'checked' : ''}><span>A minha técnica invoca entidades (shikigami, curses absorvidas, marionetes) abre a Ficha de Invocação</span></label>
    </div>
    ${carrosselHTML(false)}
    ${aprimRowHTML(false)}`;
}

function backHTML(slot){
  const nm = slot.tipo === 'apr' ? slot.label : nomeVariante(STATE, slot.key);
  return `<div class="back-in"><svg viewBox="0 0 200 200" class="back-star"><circle cx="100" cy="100" r="90"/><circle cx="100" cy="100" r="82"/><path d="${starPath(100, 100, 82)}"/></svg>
    <div class="back-name">${esc(nm)}</div><div class="back-sub">${esc(slotShort(slot))}</div></div>`;
}
function openEdit(key, srcEl){
  if(EDIT.open || !srcEl) return;
  const slot = tecnicaSlots(STATE).find(x => x.key === key); if(!slot) return;
  const root = $('pe-root'); if(!root) return;
  EDIT.open = true; EDIT.closing = false; EDIT.key = key;
  document.body.style.overflow = 'hidden';
  const rect = srcEl.getBoundingClientRect();
  root.innerHTML = `<div class="pe" id="pe">
    <div class="pe-bg" data-act="pe-close"></div>
    <div class="pe-slab s2"></div><div class="pe-slab s1"></div>
    <div class="pe-flip" id="pe-flip" style="left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px">
      <div class="pe-face front"></div><div class="pe-face back">${backHTML(slot)}</div>
    </div>
    <aside class="pe-panel" id="pe-panel">
      <header class="pe-ph"><div class="grow"><div class="pe-t" id="pe-title"></div><div class="pe-s" id="pe-sub"></div></div>
        <button class="btn sm ghost" data-act="pe-close">✕ Fechar</button></header>
      <div class="pe-pb fresh" id="pe-pb"></div>
      <footer class="pe-pf"><span class="muted sm">As alterações guardam-se sozinhas.</span><button class="btn primary" data-act="pe-close">Concluir</button></footer>
    </aside></div>`;
  const inner = srcEl.querySelector('.ccard-in') || srcEl;
  const clone = inner.cloneNode(true);
  clone.querySelectorAll('.ac-btns').forEach(b => b.remove());
  root.querySelector('.pe-face.front').appendChild(clone);
  renderEditPanel();
  setTimeout(() => { const pb = $('pe-pb'); if(pb) pb.classList.remove('fresh'); }, 1200);

  const vw = window.innerWidth, vh = window.innerHeight, narrow = vw < 820;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const s1 = Math.min(vh * 0.74 / rect.height, vw * 0.7 / rect.width, 1.8);
  const fx = narrow ? vw / 2 : vw * 0.27, fy = narrow ? vh * 0.19 : vh / 2;
  const s2 = narrow ? Math.min(vh * 0.27 / rect.height, 1) : Math.min(vh * 0.7 / rect.height, vw * 0.34 / rect.width, 1.6);
  const T = (x, y, z, ry, rz, s) => `translate(${x}px,${y}px) translateZ(${z}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flip = $('pe-flip');
  if(flip.animate){
    EDIT.anim = flip.animate([
      { transform: T(0, 0, 0, 0, 0, 1), offset: 0, easing: 'cubic-bezier(.2,.8,.2,1)' },
      { transform: T(vw / 2 - cx, vh / 2 - cy, 140, 0, 0, s1), offset: 0.4, easing: 'cubic-bezier(.6,0,.2,1)' },
      { transform: T(fx - cx, fy - cy, 0, 180, -4, s2), offset: 1 },
    ], { duration: reduce ? 1 : 1250, delay: reduce ? 0 : 120, fill: 'both' });
  }
  setTimeout(() => { const pe = $('pe'); if(pe && !EDIT.closing) pe.classList.add('open'); }, reduce ? 0 : 560);
}
function renderEditPanel(){
  const pb = $('pe-pb'); if(!pb) return;
  const slot = tecnicaSlots(STATE).find(x => x.key === EDIT.key);
  if(!slot){ closeEdit(); return; }
  const top = pb.scrollTop;
  $('pe-title').textContent = slot.tipo === 'apr' ? 'Editar aprimoramento' : 'Editar variante';
  $('pe-sub').textContent = slot.label;
  pb.innerHTML = slot.tipo === 'apr' ? aprimForm(slot) : varianteForm(slot);
  pb.scrollTop = top;
}
function closeEdit(){
  if(!EDIT.open || EDIT.closing) return;
  EDIT.closing = true;
  const pe = $('pe'); if(pe){ pe.classList.remove('open'); pe.classList.add('closing'); }
  let feito = false;
  const fim = () => {
    if(feito) return; feito = true;
    const r = $('pe-root'); if(r) r.innerHTML = '';
    document.body.style.overflow = '';
    EDIT.open = false; EDIT.closing = false; EDIT.anim = null; EDIT.key = null;
    mount();
  };
  if(EDIT.anim && EDIT.anim.reverse){
    EDIT.anim.addEventListener('finish', fim, { once: true });
    EDIT.anim.reverse();
    setTimeout(fim, 2000);
  } else fim();
}

function varianteForm(sl){
  const v = slotData(STATE, sl), c = varianteCalc(v, sl, STATE);
  const ef = TECNICA.efeitos.find(e => e.id === v.efeitoTipo) || TECNICA.efeitos[0];
  const p = `tecnica.itens.${sl.key}`;
  const grp = (field, lista) => lista.map(o => `<button class="chip ${v[field] === o.id ? 'on' : ''}" data-act="vset" data-key="${sl.key}" data-f="${field}" data-v="${o.id}">${o.nome} +${o.custo}${o.dist ? ` <small>${o.dist}</small>` : ''}</button>`).join('');
  const nat = getNatureza();
  const falta = faltaSlot(STATE, sl);
  return `
    <div class="pe-sec">
      <label class="field"><span>Nome da variante *</span><input type="text" data-bind="${p}.nome" value="${esc(v.nome)}" placeholder="ex: Lâmina de Sombra"></label>
    </div>
    <div class="pe-sec pe-img">
      <div class="pe-foto">${v.foto ? `<img src="${v.foto}" alt="">` : '<span>Sem imagem</span>'}</div>
      <div class="pe-img-btns">
        <label class="btn sm">Escolher imagem do computador<input type="file" accept="image/*" data-vfoto data-key="${sl.key}" hidden></label>
        ${v.foto ? `<button class="btn sm ghost" data-act="vfoto-remove" data-key="${sl.key}">Remover imagem</button>` : ''}
        <p class="muted sm">Opcional. Sem imagem, a carta mostra só a descrição.</p>
      </div>
    </div>
    <div class="pe-sec">
      <label class="field"><span>Descrição (é isto que aparece na carta)</span><textarea rows="4" data-bind="${p}.descricao" placeholder="O que faz a variante, como se vê, como soa…">${esc(v.descricao)}</textarea></label>
    </div>
    <div class="pe-sec">
      <p class="lbl">Efeito base</p>
      <div class="chips">${TECNICA.efeitos.map(e => `<button class="chip ${v.efeitoTipo === e.id ? 'on' : ''}" data-act="vset" data-key="${sl.key}" data-f="efeitoTipo" data-v="${e.id}">${e.nome}</button>`).join('')}</div>
      <p class="muted sm">${ef.desc}</p>
      <label class="field narrow"><span>${ef.qtdLabel}</span>
        <select data-bind="${p}.efeitoQtd" data-num data-rerender>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(q => `<option ${v.efeitoQtd === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
    </div>
    <div class="pe-sec">
      <p class="lbl">Alcance</p><div class="chips">${grp('alcance', TECNICA.alcances)}</div>
      <p class="lbl">Duração</p><div class="chips">${grp('duracao', TECNICA.duracoes)}</div>
      <p class="lbl">Área</p><div class="chips">${grp('area', TECNICA.areas)}</div>
    </div>
    <div class="pe-sec">
      <p class="lbl">Restrição natural <small>(obrigatória${sl.tipo === 'max' ? ' · só Moderada ou Forte' : ''})</small></p>
      <div class="chips">${TECNICA.restricoes.map(r => `<button class="chip ${v.restricaoTipo === r.id ? 'on' : ''}" data-act="vset" data-key="${sl.key}" data-f="restricaoTipo" data-v="${r.id}">${r.nome} −${r.desconto} PA</button>`).join('')}</div>
      <label class="field"><span>Descreve a restrição (o mestre tem a palavra final)</span><input type="text" data-bind="${p}.restricaoTexto" value="${esc(v.restricaoTexto)}" placeholder="ex: só funciona em contacto com uma sombra"></label>
      <details class="consult"><summary>Ideias de restrição (catálogo do Manual)</summary>
        ${TECNICA.catalogo.map((cat, ci) => `<p class="lbl">${cat.cat}</p><div class="chips">${cat.itens.map(([t, nv], ii) => `<button class="chip" data-act="vrest" data-key="${sl.key}" data-ci="${ci}" data-ii="${ii}">${t} <small>(${nv})</small></button>`).join('')}</div>`).join('')}
      </details>
    </div>
    <div class="pe-sec">
      <div class="counter ${c.dentro && !c.leveInvalida ? 'ok' : ''}">Blocos <b>${c.soma}</b> / ${sl.orc} · Restrição −${c.desconto}${c.aprim ? ` · Aprimoramentos −${c.aprim}` : ''} · Custo final <b>${c.final} PA</b></div>
      ${!c.dentro ? `<p class="err sm">Ultrapassa o orçamento (${sl.orc}): reduz Alcance/Duração/Área ou troca o efeito.</p>` : ''}
      ${c.leveInvalida ? '<p class="err sm">A Técnica Máxima não aceita restrição Leve.</p>' : ''}
      ${(nat && nat.id === 'reencarnado') ? `<p class="muted sm">Reencarnado: +1 PA por ativação e ${v.efeitoTipo === 'dano' ? 'o dado de dano sobe um passo' : (STATE.eraDourada === 'area' ? 'a Área sobe um nível' : 'a Duração sobe um nível')}.</p>` : ''}
      ${STATE.tracoRaro === 'seisolhos' ? '<p class="muted sm">Seis Olhos: custo em jogo a metade (arredondado para cima).</p>' : ''}
      ${c.jogo !== c.final ? `<p class="sm"><b>Custo em jogo com os teus traços: ${c.jogo} PA</b></p>` : ''}
      ${sl.tipo === 'max' ? '<p class="muted sm">Uso limitado: normalmente 1x por sessão. O Manual tem 22 e 26 de orçamento máximo em sítios diferentes; usei 26 (Passo 6).</p>' : ''}
      ${falta.length ? `<p class="warn-line sm">Falta: ${falta.join(', ')}.</p>` : '<p class="ok-line sm">✓ Carta completa.</p>'}
    </div>`;
}
function aprimForm(sl){
  const a = slotData(STATE, sl), p = `tecnica.itens.${sl.key}`;
  const alvos = tecnicaSlots(STATE).filter(x => x.tipo !== 'apr' && x.key !== sl.key);
  const ok = slotValido(STATE, sl);
  return `<div class="pe-sec"><div class="grid g2">
      <label class="field"><span>Variante a aprimorar</span>
        <select data-bind="${p}.alvo" data-rerender><option value="">Escolhe</option>${alvos.map(x => `<option value="${x.key}" ${a.alvo === x.key ? 'selected' : ''}>${esc(nomeVariante(STATE, x.key))}</option>`).join('')}</select></label>
      <label class="field"><span>Aprimoramento</span>
        <select data-bind="${p}.tipo" data-rerender>
          <option value="custo" ${a.tipo === 'custo' ? 'selected' : ''}>Reduzir o custo final (1 a 2 PA)</option>
          <option value="bloco" ${a.tipo === 'bloco' ? 'selected' : ''}>Subir um bloco sem pagar o custo extra</option>
          <option value="dado" ${a.tipo === 'dado' ? 'selected' : ''}>Subir o dado de dano um passo</option></select></label>
      ${a.tipo === 'custo' ? `<label class="field narrow"><span>Redução (PA)</span><select data-bind="${p}.valor" data-num data-rerender><option ${a.valor == 1 ? 'selected' : ''}>1</option><option ${a.valor == 2 ? 'selected' : ''}>2</option></select></label>` : ''}
      <label class="field"><span>Nota (ex: "Curto → Médio")</span><input type="text" data-bind="${p}.nota" value="${esc(a.nota)}"></label>
    </div></div>
    <div class="pe-sec">
      ${!ok && a.alvo ? '<p class="err sm">Cada variante só pode receber 1 aprimoramento por Semi-Grau; "subir dado" só em variantes de Dano.</p>' : ''}
      ${ok ? '<p class="ok-line sm">✓ Aprimoramento completo.</p>' : (a.alvo ? '' : '<p class="warn-line sm">Falta: variante a aprimorar.</p>')}
    </div>`;
}

function armaOpcoes(){
  const grupos = ARMAS.categorias.map(c => ({ nome: c.nome, itens: ARMAS.lista.filter(a => a.cat === c.id).map(a => ({ v: 'p:' + a.id, t: `${a.nome} (Nv ${a.nivel}, ${a.dano})` })) }));
  grupos.push({ nome: 'Lendárias (Grau Especial)', itens: ARMAS.lendarias.map((a, i) => ({ v: 'l:' + i, t: `${a.nome} (${a.dano})` })) });
  return grupos;
}
function armaCardHTML(a, i){
  const pen = penalizacaoArma(a, STATE.grau), p = `armas.${i}`;
  return `<div class="card weapon">
    <div class="row between"><b>${a.custom ? 'Arma personalizada' : 'Arma da tabela (editável)'}</b><button class="btn sm danger" data-act="arma-del" data-i="${i}">Remover</button></div>
    <div class="grid g3">
      <label class="field span2"><span>Nome</span><input type="text" data-bind="${p}.nome" value="${esc(a.nome)}"></label>
      <label class="field"><span>Nível</span><select data-bind="${p}.nivel" data-num data-rerender>${[1, 2, 3, 4, 5].map(n => `<option ${+a.nivel === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Dano</span><input type="text" data-bind="${p}.dano" value="${esc(a.dano)}" placeholder="ex: 1d6"></label>
      <label class="field"><span>Crítico</span><input type="text" data-bind="${p}.critico" value="${esc(a.critico)}" placeholder="x2"></label>
      <label class="field"><span>Alcance</span><input type="text" data-bind="${p}.alcance" value="${esc(a.alcance)}" list="dl-alc"></label>
      <label class="field"><span>Tipo</span><select data-bind="${p}.tipo"><option value="C" ${a.tipo === 'C' ? 'selected' : ''}>Corte</option><option value="I" ${a.tipo === 'I' ? 'selected' : ''}>Impacto</option><option value="P" ${a.tipo === 'P' ? 'selected' : ''}>Perfurante</option><option value="-" ${a.tipo === '-' ? 'selected' : ''}>Outro</option></select></label>
      <label class="field"><span>Espaços</span><input type="number" min="0" max="9" data-bind="${p}.espacos" data-num data-rerender value="${esc(a.espacos)}"></label>
      <label class="field span3"><span>Propriedade</span><input type="text" data-bind="${p}.prop" value="${esc(a.prop)}"></label>
    </div>
    ${a.custom ? `<label class="check"><input type="checkbox" data-bind="${p}.aprovada" data-check data-rerender ${a.aprovada ? 'checked' : ''}><span>Arma fora da tabela, aprovada pelo mestre</span></label>` : ''}
    ${a.requisito ? `<p class="muted sm">Requisito (lendária): ${esc(a.requisito)}. Sem cumprir, funciona só como Nível 5 genérico.</p>` : ''}
    ${pen ? `<p class="err sm">Acima do nível permitido para o teu Grau (Nível ${ARMA_NIVEL_MAX[STATE.grau]}): −2 no teste de ataque e +${pen} PA de custo.</p>` : ''}
  </div>`;
}
function tabelaArmasHTML(){
  const linhas = ARMAS.categorias.map(cat => `<tr class="cat"><td colspan="8">${cat.nome}</td></tr>` +
    ARMAS.lista.filter(a => a.cat === cat.id).map(a => `<tr><td>${a.nome}</td><td>${a.nivel}</td><td>${a.dano}</td><td>${a.critico}</td><td>${a.alcance}</td><td>${a.tipo}</td><td>${a.espacos}</td><td>${a.prop}</td></tr>`).join('')).join('');
  return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Arma</th><th>Nv</th><th>Dano</th><th>Crít.</th><th>Alcance</th><th>Tipo</th><th>Esp.</th><th>Propriedade</th></tr></thead><tbody>
    ${linhas}
    <tr class="cat"><td colspan="8">Lendárias (Grau Especial)</td></tr>
    ${ARMAS.lendarias.map(a => `<tr><td>${a.nome}</td><td>5</td><td>${a.dano}</td><td>x2</td><td>${a.alcance}</td><td>${a.tipo}</td><td>${a.espacos}</td><td>${a.prop} <em>Requisito: ${a.requisito}.</em></td></tr>`).join('')}
    <tr class="cat"><td colspan="8">Armaduras</td></tr>
    ${ARMADURAS.filter(a => a.id !== 'nenhuma').map(a => `<tr><td>${a.nome}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>${a.espacos}</td><td>Resistência a Dano +${a.rd}${a.pen && a.pen !== 'Nenhuma' ? ', ' + a.pen : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="muted sm">Tipo: C = Corte, I = Impacto, P = Perfurante. Crítico: 20 natural dobra o dano. Nível permitido por Grau: Grau 4 → 1 · Grau 3 → 2 · Grau 2 → 3 · Grau 1 → 4 · Grau Especial → 5. Acima: −2 no ataque e +1 PA por nível de diferença.</p>`;
}
function stepEquipamento(){
  const esp = espacosInfo(STATE), ar = STATE.armadura;
  return `${head('Equipamento', `Escolhe armas da tabela, edita os valores como precisares ou cria uma arma própria (fora da tabela, com aprovação do mestre). Nível sem penalização no ${GRAUS[STATE.grau]}: ${ARMA_NIVEL_MAX[STATE.grau]}.`)}
    ${STATE.armas.map(armaCardHTML).join('')}
    <div class="card">
      <p class="lbl">Adicionar arma</p>
      <div class="row">
        <select id="arma-sel" class="grow"><option value="">Escolhe da Tabela</option>${armaOpcoes().map(g => `<optgroup label="${g.nome}">${g.itens.map(o => `<option value="${o.v}">${esc(o.t)}</option>`).join('')}</optgroup>`).join('')}</select>
        <button class="btn" data-act="arma-add">Adicionar</button>
        <button class="btn ghost" data-act="arma-custom">+ Personalizada</button>
      </div>
      ${STATE.armas.length ? '' : `<label class="check"><input type="checkbox" data-bind="semArma" data-check data-rerender ${STATE.semArma ? 'checked' : ''}><span>Sem arma por agora</span></label>`}
      <datalist id="dl-alc"><option value="Toque"><option value="Curto"><option value="Médio"><option value="Longo"><option value="Muito longo"><option value="Extremo"></datalist>
    </div>

    <h3 class="sec-title">Armadura</h3>
    <div class="grid g2">
      ${ARMADURAS.map(a => `<div class="pick ${ar.id === a.id ? 'sel' : ''}" data-act="armadura" data-id="${a.id}"><h4>${a.nome}</h4><p>${a.desc}</p>
        ${a.id !== 'nenhuma' ? `<div class="formula">Resist. a Dano +${a.rd} · ${a.espacos} espaço${a.espacos > 1 ? 's' : ''}${a.pen && a.pen !== 'Nenhuma' ? ' · ' + a.pen : ''}</div>` : ''}</div>`).join('')}
      <div class="pick ${ar.id === 'custom' ? 'sel' : ''}" data-act="armadura" data-id="custom"><h4>Personalizada</h4><p>Armadura fora da tabela, aprovada pelo mestre.</p></div>
    </div>
    ${ar.id === 'custom' ? `<div class="card"><div class="grid g3">
      <label class="field span2"><span>Nome</span><input type="text" data-bind="armadura.nome" value="${esc(ar.nome)}"></label>
      <label class="field"><span>Resist. a Dano</span><input type="number" data-bind="armadura.rd" data-num data-rerender value="${esc(ar.rd)}"></label>
      <label class="field"><span>Espaços</span><input type="number" min="0" data-bind="armadura.espacos" data-num data-rerender value="${esc(ar.espacos)}"></label>
      <label class="field span2"><span>Penalização</span><input type="text" data-bind="armadura.pen" value="${esc(ar.pen)}"></label></div></div>` : ''}
    ${(ar.id === 'pesada' || ar.id === 'custom') ? `<label class="check"><input type="checkbox" data-bind="armadura.aprovada" data-check data-rerender ${ar.aprovada ? 'checked' : ''}><span>Aprovada pelo mestre / superior (missão)</span></label>` : ''}

    <div class="counter ${esp.excede ? '' : 'ok'}">Carga: <b>${esp.usados}</b> / ${esp.total} espaços <small>(6 + Vigor)</small></div>
    ${esp.excede ? '<p class="err sm">Ultrapassas os Espaços Totais: desvantagem em testes de Agilidade até largares algo.</p>' : ''}
    <label class="field"><span>Outros itens (livre)</span><textarea rows="2" data-bind="itens">${esc(STATE.itens)}</textarea></label>
    <details class="consult"><summary>Consultar tabela completa de armas e armaduras (Tabela 8.1)</summary>${tabelaArmasHTML()}</details>`;
}

const panel = (titulo, corpo, o = {}) => `<section class="panel ${o.cls || ''}">
  <header class="panel-h"><h3>${titulo}</h3><div class="ph-act">${o.edit != null ? `<button class="ico" data-act="goto" data-i="${o.edit}" title="Editar">${ICON_EDIT}</button>` : ''}</div></header>
  <div class="panel-b">${corpo}</div></section>`;
const fl = (label, valor, step) => `<div class="fl" ${step != null ? `data-act="goto" data-i="${step}"` : ''}><span class="fl-l">${label}</span><div class="fl-v">${valor || '-'}</div></div>`;

function curRes(s, key, max){ const v = s.atual[key]; return v == null ? max : Math.max(0, Math.min(max, v)); }
function resBig(cls, label, cur, max, key){
  const pct = max > 0 ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
  const b = (d, txt) => `<button class="rbtn" data-act="res" data-k="${key}" data-d="${d}">${txt}</button>`;
  return `<div class="rb"><div class="rb-t">${label}</div>
    <div class="rb-v"><span class="rb-btns">${key ? b(-5, '« −5') + b(-1, '‹ −1') : ''}</span><b>${cur} / ${max}</b><span class="rb-btns">${key ? b(1, '+1 ›') + b(5, '+5 »') : ''}</span></div>
    <div class="res-track big"><div class="res-fill ${cls}" style="width:${pct}%"></div></div></div>`;
}

function habilidadesHTML(c){
  const s = c.s, tr = getTracoRaro(s);
  return `<ul class="plain hab">
      <li><b>Arquétipo - ${c.arq.nome}:</b> ${c.arq.habilidade}</li>
      ${c.n.tracos.map(([t, x]) => `<li><b>${t}:</b> ${x}</li>`).join('')}
      ${s.eraDourada ? `<li><b>Era Dourada:</b> Controlo/Utilidade/Buff sobem ${s.eraDourada === 'area' ? 'a Área' : 'a Duração'} um nível.</li>` : ''}
      ${s.alienResist ? `<li><b>Fisiologia Estranha:</b> resistência a ${esc(s.alienResist)}${s.alienVuln ? ', vulnerável a ' + esc(s.alienVuln) : ''}.</li>` : ''}
      ${tr ? `<li><b>Traço Raro - ${tr.nome}:</b> ${tr.texto.map(([t]) => t).join(' · ')}${s.tracoRaroAprovado ? ' (aprovado)' : ''}</li>` : ''}
      ${s.periciaLigada ? `<li><b>Perícia ligada à Técnica:</b> ${esc(s.periciaLigada)}</li>` : ''}
      ${s.fonteSustento ? `<li><b>Fonte de Sustento:</b> ${esc(s.fonteSustento)}</li>` : ''}
      ${s.objeto ? `<li><b>Objeto Amaldiçoado:</b> ${esc(s.objeto)}</li>` : ''}
    </ul>
    ${c.estilo ? `<p class="lbl">Estilo: ${c.estilo.nome}</p>${estiloHabilidadesHTML(c.estilo, s.grau)}` : ''}`;
}
function poderesHTML(c){
  const g = c.s.grau;
  return `<ul class="plain">${TECNICAS_AMALDICOADAS.map(t => {
    const on = g >= t.grau;
    let custo = t.custo;
    if(custo === 'simples') custo = `${c.limitePA == null ? '-' : Math.ceil(c.limitePA / 2)} PA (reação, 1x/cena)`;
    if(custo === 'domain') custo = `${Math.ceil(c.pa * 0.8)} PA (80% do PA máx.) · 1x/sessão`;
    if(c.celestial && ['Reforço de Energia Amaldiçoada (Embuir)', 'Saída Máxima', 'Técnica Reversa (RCT)', 'Domain Expansion Incompleta', 'Domain Expansion Completa', 'Vermelho', 'Domínio Simples'].includes(t.nome)) return '';
    return `<li class="${on ? '' : 'locked'}"><b>${t.nome}</b> <span class="tag">${custo}</span> ${on ? '' : `<span class="tag dim"> ${GRAUS[t.grau]}</span>`}<br>${t.texto}</li>`;
  }).join('')}</ul>`;
}
function inventarioHTML(c){
  const s = c.s, esp = c.esp, g = s.grau;
  const pct = esp.total > 0 ? Math.min(100, esp.usados / esp.total * 100) : 100;
  const armas = s.armas.length ? `<div class="wlist">${s.armas.map(a => {
    const pen = penalizacaoArma(a, g);
    return `<div class="wcard"><div class="wc-n">${esc(a.nome) || 'Arma'} ${a.custom ? '<span class="tag">fora da tabela</span>' : ''}</div>
      <div class="tags"><span class="tag big">${esc(a.dano)}</span><span class="tag">${TIPO_NOME[a.tipo] || 'outro'}</span><span class="tag">crít. ${esc(a.critico)}</span><span class="tag">${esc(a.alcance)}</span><span class="tag">${a.espacos} esp.</span></div>
      ${a.prop ? `<p class="sm muted">${esc(a.prop)}</p>` : ''}${pen ? `<p class="err sm">Nível acima do permitido: −2 no ataque, +${pen} PA</p>` : ''}</div>`;
  }).join('')}</div>` : '<div class="empty">Nenhuma arma.</div>';
  const ar = s.armadura;
  return `<div class="inv-top"><span class="lbl">Carga</span><b>${esp.usados} / ${esp.total}</b></div>
    <div class="res-track"><div class="res-fill ${esp.excede ? 'pv' : 'co'}" style="width:${pct}%"></div></div>
    ${esp.excede ? '<p class="err sm">Excedida: desvantagem em testes de Agilidade.</p>' : ''}
    <div class="inv-h"><h4>Armas <small>(${s.armas.length})</small></h4></div>${armas}
    <div class="inv-h"><h4>Armadura</h4></div>
    ${ar.id === 'nenhuma' ? '<div class="empty">Sem armadura.</div>' : `<div class="wcard"><div class="wc-n">${esc(ar.nome)}</div><div class="tags"><span class="tag big">Resist. +${ar.rd}</span><span class="tag">${ar.espacos} esp.</span>${ar.pen && ar.pen !== 'Nenhuma' ? `<span class="tag warnt">${esc(ar.pen)}</span>` : ''}</div></div>`}
    <div class="inv-h"><h4>Itens</h4></div>
    ${s.itens && s.itens.trim() ? `<p class="pre">${esc(s.itens)}</p>` : '<div class="empty">Nenhum item.</div>'}`;
}
function sobreHTML(c){
  const s = c.s;
  const bon = ATTRS.filter(a => (s.naturezaBonusMap[a.key] || 0) !== 0).map(a => `${a.key} ${fmt(s.naturezaBonusMap[a.key])}`).join(' · ');
  const tr = getTracoRaro(s);
  const tabs = `<div class="seg sub-seg"><button class="${sobreTab === 'main' ? 'on' : ''}" data-act="st" data-v="main">Principal</button><button class="${sobreTab === 'det' ? 'on' : ''}" data-act="st" data-v="det">Detalhes</button></div>`;
  const body = sobreTab === 'main'
    ? `<label class="field"><span>História</span><textarea rows="8" data-bind="historia">${esc(STATE.historia)}</textarea></label>
       <label class="field"><span>Aparência / personalidade</span><textarea rows="4" data-bind="aparencia">${esc(STATE.aparencia)}</textarea></label>`
    : `<div class="fl-grid">
        ${fl('Natureza', c.n.nome, STEP.CONC)}
        ${fl('Bónus da Natureza', bon, STEP.CONC)}
        ${fl('Traço Raro', tr ? tr.nome + (s.tracoRaroAprovado ? ' (aprovado)' : '') : '', STEP.CONC)}
        ${fl('Local de nascimento', esc(s.local), STEP.IDENT)}
        ${s.fonteSustento ? fl('Fonte de Sustento', esc(s.fonteSustento), STEP.CONC) : ''}
        ${s.objeto ? fl('Objeto Amaldiçoado', esc(s.objeto), STEP.CONC) : ''}
        ${s.periciaLigada ? fl('Perícia ligada', esc(s.periciaLigada), STEP.CONC) : ''}
        ${s.alienResist ? fl('Resiste / vulnerável', esc(s.alienResist) + (s.alienVuln ? ' / ' + esc(s.alienVuln) : ''), STEP.CONC) : ''}
        ${fl('Criada em', esc(s.criadaEm))}
      </div>`;
  return `<section class="panel"><header class="panel-h"><h3>Sobre</h3></header><div class="panel-b">${tabs}${body}</div></section>`;
}

function fichaHTML(c){
  const s = c.s, g = s.grau;
  const cur = (k, m) => curRes(s, k, m);

  const infos = panel('Informações', `<div class="fl-grid">
      ${fl('Nome', esc(s.nome), STEP.IDENT)}${fl('Jogador', esc(s.jogador), STEP.IDENT)}
      ${fl('Natureza', c.n.nome, STEP.CONC)}${fl('Arquétipo', c.arq.nome, STEP.CONC)}
      ${fl('Estilo', c.estilo ? c.estilo.nome : '', STEP.CONC)}${fl('Grau', GRAUS[g], STEP.CONC)}
      ${fl('Idade', s.idade ? esc(s.idade) : '', STEP.IDENT)}${fl('Local de nascimento', esc(s.local), STEP.IDENT)}
    </div>`, { edit: STEP.IDENT });

  const principal = panel('Principal', `
      <div class="portrait">${s.foto ? `<img src="${s.foto}" alt="">` : '<span>Sem foto</span>'}</div>
      ${resBig('pv', 'Vida (PV)', cur('pv', c.pv), c.pv, 'pv')}
      ${resBig('pa', c.celestial ? 'Reserva de Vigor' : 'Energia (PA)', c.celestial ? c.reservaVigor : cur('pa', c.pa), c.celestial ? c.reservaVigor : c.pa, c.celestial ? null : 'pa')}
      ${resBig('co', 'Coesão', cur('co', c.co), c.co, 'co')}
      <div class="chips stats center">
        <span class="chip static">Defesa <b>${c.defesa}</b></span>
        <span class="chip static">Limite PA/turno <b>${c.limitePA == null ? '∞' : c.limitePA}</b></span>
        ${c.arq.id === 'reforcador' ? `<span class="chip static">Corpo como Arma <b>${CORPO_ARMA[g]}</b></span>` : ''}
        ${s.naturezaId === 'maldicao' ? `<span class="chip static">Regeneração <b>${REGEN_MALDICAO[g]}</b>/cena</span>` : ''}
        ${s.armadura.rd ? `<span class="chip static">Resist. Dano <b>+${s.armadura.rd}</b></span>` : ''}
      </div>
      <div class="row center"><button class="btn sm" data-act="rest-curto">Descanso curto (+25%)</button><button class="btn sm" data-act="rest-longo">Descanso longo (100%)</button></div>`,
    { edit: STEP.IDENT });

  const atributos = panel('Atributos', `<div class="seal-wrap">${selloHTML(false)}</div>
      ${c.celestial ? `<p class="muted sm">Restrição Celestial: +1 dado em testes físicos (FOR/AGI/VIG)${s.estiloNome === 'Restrito' ? ', +2 nas habilidades do Estilo Restrito' : ''}.</p>` : ''}`, { edit: STEP.ATTR });

  const pericias = panel('Perícias', c.periciasFinal.length
    ? `<div class="pgrid">${c.periciasFinal.map(nome => {
        const p = PERICIAS.find(x => x.name === nome) || { attr: '' };
        return `<div class="pcard">${ICON_D20}<b class="pb">+5</b><span class="pn">${esc(nome)}</span><small>${p.attr} ${p.attr ? fmt(c.fa[p.attr]) : ''}</small></div>`;
      }).join('')}</div><p class="muted sm center">Só aparecem as perícias treinadas (+5).</p>`
    : '<div class="empty">Sem perícias treinadas.</div>', { edit: STEP.PERI });

  const hp = `<section class="panel"><header class="panel-h"><div class="seg"><button class="${ficTab === 'hab' ? 'on' : ''}" data-act="ft" data-v="hab">Habilidades</button><button class="${ficTab === 'pod' ? 'on' : ''}" data-act="ft" data-v="pod">Poderes</button></div></header>
      <div class="panel-b">${ficTab === 'hab' ? habilidadesHTML(c) : poderesHTML(c)}</div></section>`;

  let tecnica;
  if(c.celestial) tecnica = '<div class="empty">Restrição Celestial: sem Técnica Inata.</div>';
  else if(!s.tecnica.conceito.trim() && !Object.keys(s.tecnica.itens).length) tecnica = '<div class="empty">Ainda não definida.</div>';
  else tecnica = `${s.tecnica.conceito.trim() ? `<p class="center"><b>Conceito:</b> ${esc(s.tecnica.conceito)}</p>` : ''}${carrosselHTML(true)}${aprimRowHTML(true)}`;
  const tecPanel = panel('Técnica Inata', tecnica, { edit: STEP.TEC, cls: 'full' });

  const inv = panel('Inventário', inventarioHTML(c), { edit: STEP.EQUIP, cls: 'full' });
  const summon = precisaInvocacao(s) ? invocacaoHTML(c, true) : '';

  return `<div class="fgrid">${infos}${principal}${atributos}${pericias}${hp}${sobreHTML(c)}${tecPanel}${inv}${summon}</div>`;
}
function invocacaoHTML(c, edit){
  const s = c.s, pvInv = Math.ceil(c.pv / 2), defInv = 10 + s.grau * 2;
  const blocos = s.invocacoes.map((inv, i) => {
    if(!edit && !inv.nome.trim() && !inv.notas.trim() && !inv.dano.trim()) return '';
    const stats = `<div class="chips"><span class="chip static">PV <b>${pvInv}</b></span><span class="chip static">Defesa <b>${defInv}</b></span><span class="chip static">Dano <b>${esc(inv.dano) || '-'}</b></span><span class="chip static">Desloc. <b>${esc(inv.deslocacao) || '-'}</b></span></div>`;
    if(!edit){
      const t = CURSE_TRACOS.find(x => x[0] === inv.traco);
      return `<div class="inv"><p><b>${esc(inv.nome) || 'Invocação ' + (i + 1)}</b> (${inv.tipo})</p>${stats}${t ? `<p class="sm"><b>${t[0]}:</b> ${t[1]}</p>` : ''}${inv.notas ? `<p class="sm">${esc(inv.notas)}</p>` : ''}</div>`;
    }
    const p = `invocacoes.${i}`;
    return `<div class="inv"><p class="lbl">Invocação ${i + 1}</p><div class="grid g2">
      <label class="field"><span>Nome</span><input type="text" data-bind="${p}.nome" value="${esc(inv.nome)}"></label>
      <label class="field"><span>Tipo</span><select data-bind="${p}.tipo">${INVOCACAO_TIPOS.map(t => `<option ${inv.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Traço da lista de Curses (opcional)</span><select data-bind="${p}.traco"><option value="">Nenhum</option>${CURSE_TRACOS.map(t => `<option ${inv.traco === t[0] ? 'selected' : ''}>${t[0]}</option>`).join('')}</select></label>
      <label class="field"><span>Dano de ataque (definido pela habilidade)</span><input type="text" data-bind="${p}.dano" value="${esc(inv.dano)}" placeholder="ex: 2d6"></label>
      <label class="field"><span>Deslocação</span><input type="text" data-bind="${p}.deslocacao" value="${esc(inv.deslocacao)}"></label></div>
      ${stats}<label class="field"><span>Habilidades / notas</span><textarea rows="2" data-bind="${p}.notas">${esc(inv.notas)}</textarea></label></div>`;
  }).join('');
  if(!blocos.trim()) return '';
  return `<div class="card summon"><p class="lbl">Ficha de Invocação shikigami, curses absorvidas e marionetes</p>
    <p class="muted sm">PV = metade do PV do invocador (${pvInv}) · Defesa = 10 + Grau × 2 na escala 0-6 do Choque de Domínios (${GRAUS[s.grau]} = ${defInv}) · age na iniciativa do invocador.</p>${blocos}</div>`;
}
function stepFicha(){
  const f = progresso();
  const pronto = STATE.naturezaId && STATE.arquetipoId && (STATE.concluida || f.done >= f.total);
  if(!pronto){
    return `${head('Ficha')}<div class="card warn"><p>Ainda falta completar: <b>${f.falta.join(', ')}</b>. Clica numa etapa para lá ires:</p>
      <div class="chips">${f.faltaIdx.map(i => `<button class="chip" data-act="goto" data-i="${i}">${STEP_LABELS[i]} →</button>`).join('')}</div></div>`;
  }
  return `${fichaHTML(computeSheet(STATE))}
    <div class="card finish">
      ${STATE.concluida
        ? '<p>✓ Ficha concluída e guardada neste dispositivo. Podes continuar a editar qualquer etapa.</p>'
        : '<p>Está tudo preenchido. Finaliza para marcar a ficha como concluída (já está a ser guardada automaticamente).</p><button class="btn primary" data-act="finalizar">Finalizar ficha</button>'}
    </div>`;
}


function renderList(){
  const root = $('sheets-root'); if(!root) return;
  const list = loadSheets();
  if(!list.length){
    root.innerHTML = `<div class="card"><p class="muted">Ainda não tens fichas. Clica em <b>Criar Ficha</b> para começar, vai sendo guardada sozinha.</p></div>`;
    return;
  }
  root.innerHTML = `<div class="grid g2">${list.map(f => {
    const s = migrateRaw(f.raw), p = progresso(s), c = (() => { try{ return stepDone(STEP.CONC, s) ? computeSheet(s) : null; } catch(e){ return null; } })();
    const n = getNatureza(s), arq = getArquetipo(s);
    const incompleta = !s.concluida && p.done < p.total;
    return `<div class="sheet-card" data-act="abrir" data-id="${f.id}">
      <div class="sc-top"><div class="photo sm">${s.foto ? `<img src="${s.foto}" alt="">` : '<span>-</span>'}</div>
        <div class="grow"><div class="sc-name">${esc(s.nome) || 'Sem nome'}</div>
        <div class="muted sm">${[n && n.nome, arq && arq.nome, GRAUS[s.grau]].filter(Boolean).join(' · ')}</div></div>
        ${incompleta ? `<span class="tag warnt">Em criação</span>` : ''}</div>
      ${incompleta
        ? `<div class="mini-progress"><div style="width:${p.pct}%"></div></div><div class="muted sm">${p.done}/${p.total} etapas · falta: ${p.falta.slice(0, 3).join(', ')}${p.falta.length > 3 ? '…' : ''}</div>`
        : (c ? `<div class="chips"><span class="chip static">PV <b>${c.pv}</b></span><span class="chip static">PA <b>${c.celestial ? '-' : c.pa}</b></span><span class="chip static">Coesão <b>${c.co}</b></span><span class="chip static">Defesa <b>${c.defesa}</b></span></div>` : '')}
      <div class="row end"><button class="btn sm" data-act="abrir" data-id="${f.id}">${incompleta ? 'Continuar' : 'Abrir'}</button>
        <button class="btn sm danger" data-act="apagar" data-id="${f.id}">Apagar</button></div></div>`;
  }).join('')}</div>`;
}


function setPath(obj, path, val){
  const parts = path.split('.'); let o = obj;
  for(let i = 0; i < parts.length - 1; i++){
    if(o[parts[i]] == null) o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts[parts.length - 1]] = val;
}

function resizarFoto(file, cb){
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 360, k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL('image/jpeg', 0.82));
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}

function toggle(arr, v){ const i = arr.indexOf(v); if(i >= 0) arr.splice(i, 1); else arr.push(v); }

function onAct(act, el){
  const d = el.dataset;
  switch(act){
    case 'goto': { const i = +d.i; STATE.step = i; mount(); window.scrollTo(0, 0); return; }
    case 'next': if(STATE.step < STEP.FICHA){ STATE.step++; mount(); window.scrollTo(0, 0); } return;
    case 'prev': if(STATE.step > 0){ STATE.step--; mount(); window.scrollTo(0, 0); } return;
    case 'sair': leaveEditor(); return;
    case 'foto-remove': STATE.foto = ''; break;
    case 'finalizar': STATE.concluida = true; break;

    case 'car-prev': carGo(carIdx - 1); return;
    case 'car-next': carGo(carIdx + 1); return;
    case 'car-go': carGo(+d.i); return;
    case 'slot-edit': openEdit(d.key, el.closest('.acard') || document.querySelector('.car .ccard.center')); return;
    case 'pe-close': closeEdit(); return;
    case 'slot-clear': {
      const slot = tecnicaSlots(STATE).find(x => x.key === d.key); if(!slot) return;
      if(!confirm('Apagar o conteúdo desta carta? Não dá para desfazer.')) return;
      STATE.tecnica.itens[d.key] = slot.tipo === 'apr' ? defaultAprim() : defaultVariante(); break; }
    case 'vfoto-remove': { const it = STATE.tecnica.itens[d.key]; if(it) it.foto = ''; break; }

    case 'ft': ficTab = d.v; break;
    case 'st': sobreTab = d.v; break;

    case 'natureza':
      STATE.naturezaId = d.id || null; STATE.naturezaBonusMap = ZERO_ATTRS(); STATE.naturezaBonusPicks = [];
      STATE.eraDourada = ''; STATE.alienResist = ''; STATE.alienVuln = ''; break;
    case 'bonus-multi':
      toggle(STATE.naturezaBonusPicks, d.key);
      if(STATE.naturezaBonusPicks.length > 2) STATE.naturezaBonusPicks = STATE.naturezaBonusPicks.slice(-2);
      STATE.naturezaBonusMap = ZERO_ATTRS(); STATE.naturezaBonusPicks.forEach(k => STATE.naturezaBonusMap[k] += 1); break;
    case 'bonus-single': {
      const n = getNatureza(); STATE.naturezaBonusPicks = [d.key];
      STATE.naturezaBonusMap = ZERO_ATTRS(); STATE.naturezaBonusMap[d.key] = n.bonusType === 'escolha-uma-mais2' ? 2 : n.bonusValor; break; }
    case 'bonus-i0': case 'bonus-i1': {
      STATE.naturezaBonusPicks[act === 'bonus-i0' ? 0 : 1] = d.key;
      STATE.naturezaBonusMap = ZERO_ATTRS(); STATE.naturezaBonusPicks.forEach(k => { if(k) STATE.naturezaBonusMap[k] += 1; }); break; }
    case 'era': STATE.eraDourada = d.v; break;
    case 'traco-set': STATE.tracoRaro = d.id || null; STATE.tracoRaroAprovado = false; break;
    case 'arquetipo': STATE.arquetipoId = d.id || null; STATE.periciasEscolhidas = []; STATE.progPericias = []; STATE.estiloNome = null; break;
    case 'estilo': STATE.estiloNome = d.id || null; break;

    case 'attr': {
      const next = STATE.attrs[d.key] + (+d.dir);
      if(next < -1 || next > MAX_ATTR) return;
      if(+d.dir > 0 && attrRemaining() <= 0) return;
      STATE.attrs[d.key] = next; break; }
    case 'exc-add': STATE.excedente = excedenteValido(STATE).concat(d.key); break;
    case 'exc-rem': { const l = excedenteValido(STATE); l.splice(+d.i, 1); STATE.excedente = l; break; }
    case 'prog-add': STATE.progAttrs = progAttrsValidos(STATE).concat(d.key); break;
    case 'prog-rem': { const l = progAttrsValidos(STATE); l.splice(+d.i, 1); STATE.progAttrs = l; break; }

    case 'pericia': toggle(STATE.periciasEscolhidas, d.name); break;
    case 'pericia-prog': toggle(STATE.progPericias, d.name); break;

    case 'vset': { const v = STATE.tecnica.itens[d.key]; if(v) v[d.f] = d.v; break; }
    case 'vrest': {
      const [txt, nv] = TECNICA.catalogo[+d.ci].itens[+d.ii], v = STATE.tecnica.itens[d.key];
      if(v){ v.restricaoTipo = nv; v.restricaoTexto = txt; } break; }

    case 'arma-add': {
      const val = $('arma-sel').value; if(!val) return;
      const [t, id] = val.split(':');
      const p = t === 'p' ? ARMAS.lista.find(a => a.id === id) : ARMAS.lendarias[+id];
      if(p){ STATE.armas.push(armaFromPreset(p)); STATE.semArma = false; } break; }
    case 'arma-custom': STATE.armas.push(armaCustom()); STATE.semArma = false; break;
    case 'arma-del': STATE.armas.splice(+d.i, 1); break;
    case 'armadura': {
      if(d.id === 'custom') STATE.armadura = { id: 'custom', nome: '', rd: 0, espacos: 0, pen: '', aprovada: false };
      else { const a = ARMADURAS.find(x => x.id === d.id); STATE.armadura = { id: a.id, nome: a.nome, rd: a.rd, espacos: a.espacos, pen: a.pen, aprovada: false }; }
      break; }

    case 'res': {
      const c = computeSheet(STATE), max = { pv: c.pv, pa: c.pa, co: c.co }[d.k];
      STATE.atual[d.k] = Math.max(0, Math.min(max, curRes(STATE, d.k, max) + (+d.d))); break; }
    case 'rest-curto': {
      const c = computeSheet(STATE);
      STATE.atual.pv = Math.min(c.pv, curRes(STATE, 'pv', c.pv) + Math.ceil(c.pv * 0.25));
      STATE.atual.pa = Math.min(c.pa, curRes(STATE, 'pa', c.pa) + Math.ceil(c.pa * 0.25)); break; }
    case 'rest-longo': STATE.atual = { pv: null, pa: null, co: null }; break;
    default: return;
  }
  mount();
}

document.addEventListener('DOMContentLoaded', () => {
  const ed = $('view-editor');

  ed.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if(!el || el.disabled) return;
    if(el.tagName === 'LABEL') return;
    onAct(el.dataset.act, el);
  });

  const applyBind = (el, rerenderAllowed) => {
    const path = el.dataset.bind; if(!path) return;
    let val = el.hasAttribute('data-check') ? el.checked : el.value;
    if(el.hasAttribute('data-num')) val = parseFloat(val) || 0;
    setPath(STATE, path, val);
    if(el.hasAttribute('data-rerender') && rerenderAllowed) mount();
    else refreshChrome();
  };
  ed.addEventListener('input', (e) => {
    const el = e.target;
    if(el.dataset.bind && (el.type === 'text' || el.tagName === 'TEXTAREA')){
      applyBind(el, false);
      if(el.dataset.bind === 'nome') updateNomeErro(el);
    }
  });
  ed.addEventListener('change', (e) => {
    const el = e.target;
    if(el.dataset.selAct){ onAct(el.dataset.selAct, { dataset: { id: el.value, v: el.value } }); return; }
    if(el.hasAttribute('data-foto')){
      const f = el.files && el.files[0]; if(!f) return;
      resizarFoto(f, (url) => { STATE.foto = url; mount(); });
      return;
    }
    if(el.hasAttribute('data-vfoto')){
      const f = el.files && el.files[0]; if(!f) return;
      const key = el.dataset.key;
      resizarFoto(f, (url) => { const it = STATE.tecnica.itens[key]; if(it){ it.foto = url; mount(); } });
      return;
    }
    if(el.dataset.bind && !(el.type === 'text' || el.tagName === 'TEXTAREA')) applyBind(el, true);
    else if(el.dataset.bind && el.hasAttribute('data-rerender')) mount();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && EDIT.open){ closeEdit(); return; }
    if(EDIT.open || $('view-editor').hidden) return;
    const t = e.target;
    if(t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if(e.key === 'ArrowLeft') carGo(carIdx - 1);
    if(e.key === 'ArrowRight') carGo(carIdx + 1);
  });
  let tx = null;
  ed.addEventListener('touchstart', (e) => { tx = e.target.closest('.car-stage') ? e.touches[0].clientX : null; }, { passive: true });
  ed.addEventListener('touchend', (e) => {
    if(tx == null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if(Math.abs(dx) > 40) carGo(carIdx + (dx < 0 ? 1 : -1));
  });

  $('btn-criar-ficha').addEventListener('click', startNew);
  $('btn-ver-fichas').addEventListener('click', () => { renderList(); showView('list'); });
  $('btn-nova-da-lista').addEventListener('click', startNew);
  $('btn-voltar-home').addEventListener('click', () => showView('home'));

  $('sheets-root').addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if(!el) return;
    const id = el.dataset.id;
    if(el.dataset.act === 'apagar'){
      e.stopPropagation();
      if(confirm('Apagar esta ficha? Não dá para desfazer.')){ saveSheets(loadSheets().filter(f => f.id !== id)); renderList(); }
      return;
    }
    if(el.dataset.act === 'abrir'){
      const rec = loadSheets().find(f => f.id === id); if(rec) openEditorFor(rec);
    }
  });

  const rasc = loadSheets().filter(f => { const m = migrateRaw(f.raw); return !m.concluida; });
  const bc = $('btn-continuar');
  if(bc){
    if(rasc.length){ bc.hidden = false; bc.textContent = `Continuar ficha em criação (${rasc.length})`; bc.addEventListener('click', () => { renderList(); showView('list'); }); }
  }
  renderList();
  setupReveal();
  showView('home');
});

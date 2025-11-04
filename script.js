// Formatação BR
const br = {
  toNumber(v){
    if(typeof v === 'number') return v;
    if(!v) return 0;
    const clean = (v+"").replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}\b)/g,'');
    const normalized = clean.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  },
  money(n){
    return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  },
  pct(n){
    return (n*100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  }
};

// Constantes 2025
const INSS_TETO = 951.62;
const INSS_FAIXAS = [
  { lim: 1518.00, aliq: 0.075 },
  { lim: 2793.88, aliq: 0.09 },
  { lim: 4190.83, aliq: 0.12 },
  { lim: 8157.41, aliq: 0.14 }
];
const IRRF_FAIXAS = [
  { ate: 2428.80, aliq: 0.00, ded: 0.00 },
  { ate: 2826.65, aliq: 0.075, ded: 182.16 },
  { ate: 3751.05, aliq: 0.15,  ded: 394.16 },
  { ate: 4664.68, aliq: 0.225, ded: 675.49 },
  { ate: Infinity, aliq: 0.275, ded: 908.73 }
];
const DEP_VAL = 189.59;
const DESC_SIMPLIFICADO = 607.20;

// Funções de cálculo
function calcularINSSProgressivo(salBruto){
  let restante = salBruto, baseAnterior = 0, contribuicao = 0;
  const linhas = [];
  for(const f of INSS_FAIXAS){
    const faixaBase = Math.max(0, Math.min(restante, f.lim - baseAnterior));
    const valorFaixa = faixaBase * f.aliq;
    if(faixaBase > 0){
      linhas.push({ base: faixaBase, aliq: f.aliq, valor: valorFaixa });
    }
    contribuicao += valorFaixa;
    restante -= faixaBase;
    baseAnterior = f.lim;
    if(restante <= 0) break;
  }
  contribuicao = Math.min(contribuicao, INSS_TETO);
  return { inss: Math.floor(contribuicao * 100) / 100, linhas };
}

function faixaIRRF(base){
  return IRRF_FAIXAS.find(f => base <= f.ate);
}
function calcularIRRF_DeducaoLegal(salBruto, inss, dependentes, pensao){
  const base = Math.max(0, salBruto - inss - dependentes*DEP_VAL - pensao);
  const f = faixaIRRF(base);
  return { base, ir: Math.max(0, base * f.aliq - f.ded), aliq: f.aliq, ded: f.ded };
}
function calcularIRRF_Simplificado(salBruto){
  const base = Math.max(0, salBruto - DESC_SIMPLIFICADO);
  const f = faixaIRRF(base);
  return { base, ir: Math.max(0, base * f.aliq - f.ded), aliq: f.aliq, ded: f.ded };
}

// Elementos
const el = id => document.getElementById(id);
const kInss = el('kpi-inss'), kIrrf = el('kpi-irrf'), kLiq = el('kpi-liquido'), badgeModo = el('badge-modo');
const tblINSS = el('tbl-inss'), tblIRRF = el('tbl-irrf');

// Toggle modo
['modo-auto','modo-legal','modo-simplificado'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    ['modo-auto','modo-legal','modo-simplificado'].forEach(m => el(m).classList.remove('active'));
    el(id).classList.add('active');
  });
});
function modoAtual(){
  if(el('modo-legal').classList.contains('active')) return 'legal';
  if(el('modo-simplificado').classList.contains('active')) return 'simplificado';
  return 'auto';
}

// Render tabelas
function renderTabelaINSS(linhas, total){
  if(!linhas.length){ tblINSS.innerHTML = '<div class="note">Sem base para INSS.</div>'; return; }
  tblINSS.innerHTML = `
    <table>
      <thead><tr><th>Faixa</th><th>Base</th><th>Alíquota</th><th>Valor</th></tr></thead>
      <tbody>
        ${linhas.map(l => `<tr><td>Até faixa</td><td>${br.money(l.base)}</td><td>${br.pct(l.aliq)}</td><td>${br.money(l.valor)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="3">Total</td><td>${br.money(total)}</td></tr></tfoot>
    </table>`;
}
function renderTabelaIRRF(modo, det){
  const { base, ir, aliq, ded } = det;
  tblIRRF.innerHTML = `
    <table>
      <thead><tr><th>Base</th><th>Alíquota</th><th>Dedução</th><th>IRRF</th></tr></thead>
      <tbody><tr><td>${br.money(base)}</td><td>${br.pct(aliq)}</td><td>${br.money(ded)}</td><td>${br.money(ir)}</td></tr></tbody>
      <tfoot><tr><td colspan="3">Modo</td><td>${modo}</td></tr></tfoot>
    </table>`;
}

// Cálculo principal
function calcular(){
  const salario = br.toNumber(el('salario').value);
  const dependentes = Math.max(0, parseInt(el('dependentes').value || '0', 10));
  const pensao = br.toNumber(el('pensao').value);
  if(!salario || salario <= 0){ alert('Informe um salário válido'); return; }

  const { inss, linhas } = calcularINSSProgressivo(salario);
  const detLegal = calcularIRRF_DeducaoLegal(salario, inss, dependentes, pensao);
  const detSimpl = calcularIRRF_Simplificado(salario);

  let modo = modoAtual();
  let det = detLegal;
  if(modo === 'simplificado') det = detSimpl;
  if(modo === 'auto') det = detLegal.ir <= detSimpl.ir ? detLegal : detSimpl;

  const irrf = det.ir;
  const liquido = salario - inss - irrf;

  kInss.textContent = br.money(inss);
  kIrrf.textContent = br.money(irrf);
  kLiq.textContent = br.money(liquido);
  badgeModo.textContent = `Modo: ${modo}`;

  renderTabelaINSS(linhas, inss);
  renderTabelaIRRF(modo, det);
}

// Eventos
el('btn-calcular').addEventListener('click', calcular);
['salario','dependentes','pensao'].forEach(id => el(id).addEventListener('keydown', e => { if(e.key==='Enter') calcular(); }));

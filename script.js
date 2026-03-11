```javascript
// ======================
// FORMATAÇÃO BR
// ======================

const br = {
  toNumber(v){
    if(typeof v === 'number') return v;
    if(!v) return 0;

    const clean = (v+"")
      .replace(/[^0-9.,-]/g,'')
      .replace(/,(?=\d{3}\b)/g,'');

    const normalized = clean
      .replace(/\.(?=\d{3}(\D|$))/g,'')
      .replace(',', '.');

    const n = parseFloat(normalized);

    return isNaN(n) ? 0 : n;
  },

  money(n){
    return n.toLocaleString('pt-BR',{
      style:'currency',
      currency:'BRL'
    });
  },

  pct(n){
    return (n*100).toLocaleString('pt-BR',{
      maximumFractionDigits:2
    }) + '%';
  }
};

// ======================
// CONSTANTES 2026
// ======================

const INSS_TETO = 988.07;

const IRRF_FAIXAS = [
  { ate: 2428.80, aliq: 0.00, ded: 0.00 },
  { ate: 2826.65, aliq: 0.075, ded: 182.16 },
  { ate: 3751.05, aliq: 0.15,  ded: 394.16 },
  { ate: 4664.68, aliq: 0.225, ded: 675.49 },
  { ate: Infinity, aliq: 0.275, ded: 908.73 }
];

const DEP_VAL = 189.59;
const DESC_SIMPLIFICADO = 607.20;

// ======================
// BUSCAR FAIXA IRRF
// ======================

function faixaIRRF(base){
  return IRRF_FAIXAS.find(f => base <= f.ate);
}

// ======================
// CÁLCULO INSS
// ======================

function calcularINSSProgressivo(salBruto){

  let aliq = 0;
  let ded = 0;

  if (salBruto <= 1621.00){
    aliq = 0.075;
    ded = 0;
  }
  else if (salBruto <= 2902.84){
    aliq = 0.09;
    ded = 24.32;
  }
  else if (salBruto <= 4354.27){
    aliq = 0.12;
    ded = 111.42;
  }
  else if (salBruto <= 8475.55){
    aliq = 0.14;
    ded = 198.50;
  }
  else{
    return {
      inss: INSS_TETO,
      linhas:[{
        base: salBruto,
        aliq:0.14,
        valor:INSS_TETO
      }]
    };
  }

  let valor = (salBruto * aliq) - ded;

  valor = Math.floor(valor * 100) / 100;

  return{
    inss:valor,
    linhas:[{
      base:salBruto,
      aliq:aliq,
      valor:valor
    }]
  };
}

// ======================
// CÁLCULO IRRF LEGAL
// ======================

function calcularIRRF_DeducaoLegal(salBruto,inss,dependentes,pensao){

  const base = Math.max(
    0,
    salBruto - inss - dependentes*DEP_VAL - pensao
  );

  const f = faixaIRRF(base);

  const ir = Math.max(
    0,
    Math.floor((base*f.aliq - f.ded)*100)/100
  );

  return{
    base,
    ir,
    aliq:f.aliq,
    ded:f.ded
  };
}

// ======================
// CÁLCULO IRRF SIMPLIFICADO
// ======================

function calcularIRRF_Simplificado(salBruto){

  const base = Math.max(
    0,
    salBruto - DESC_SIMPLIFICADO
  );

  const f = faixaIRRF(base);

  const ir = Math.max(
    0,
    Math.floor((base*f.aliq - f.ded)*100)/100
  );

  return{
    base,
    ir,
    aliq:f.aliq,
    ded:f.ded
  };
}

// ======================
// REDUTOR IRRF
// ======================

function aplicarRedutorIRRF(irCalculado,salarioBruto){

  if(salarioBruto <= 5000){
    return{
      irFinal:0,
      redutor:irCalculado
    };
  }

  if(salarioBruto <= 7350){

    const redutor =
      978.62 - (0.133145 * salarioBruto);

    const irFinal =
      Math.max(0, irCalculado - redutor);

    return{
      irFinal,
      redutor
    };
  }

  return{
    irFinal:irCalculado,
    redutor:0
  };
}

// ======================
// ELEMENTOS HTML
// ======================

const el = id => document.getElementById(id);

const kInss = el('kpi-inss');
const kIrrf = el('kpi-irrf');
const kLiq = el('kpi-liquido');
const badgeModo = el('badge-modo');

const tblINSS = el('tbl-inss');
const tblIRRF = el('tbl-irrf');

// ======================
// MODO SELECIONADO
// ======================

['modo-auto','modo-legal','modo-simplificado']
.forEach(id=>{

  el(id).addEventListener('click',()=>{

    ['modo-auto','modo-legal','modo-simplificado']
    .forEach(m=>el(m).classList.remove('active'));

    el(id).classList.add('active');

  });

});

function modoAtual(){

  if(el('modo-legal').classList.contains('active'))
    return 'legal';

  if(el('modo-simplificado').classList.contains('active'))
    return 'simplificado';

  return 'auto';
}

// ======================
// TABELA INSS
// ======================

function renderTabelaINSS(linhas,total){

  if(!linhas.length){

    tblINSS.innerHTML =
      '<div class="note">Sem base para INSS.</div>';

    return;
  }

  const limites = [
    1621.00,
    2902.84,
    4354.27,
    8475.55
  ];

  tblINSS.innerHTML=`

  <table>

    <thead>
      <tr>
        <th>Faixa</th>
        <th>Base</th>
        <th>Alíquota</th>
        <th>Valor</th>
      </tr>
    </thead>

    <tbody>

      ${linhas.map((l,i)=>{

        let faixa;

        if(i===0){
          faixa=`Até ${br.money(limites[i])}`;
        }
        else{
          faixa=
          `${br.money(limites[i-1])}
           até
           ${br.money(limites[i])}`;
        }

        return`
        <tr>
          <td>${faixa}</td>
          <td>${br.money(l.base)}</td>
          <td>${br.pct(l.aliq)}</td>
          <td>${br.money(l.valor)}</td>
        </tr>
        `
      }).join('')}

    </tbody>

    <tfoot>
      <tr>
        <td colspan="3">Total</td>
        <td>${br.money(total)}</td>
      </tr>
    </tfoot>

  </table>
  `;
}

// ======================
// TABELA IRRF
// ======================

function renderTabelaIRRF(modo,det,redutor,irFinal){

  const {base,ir,aliq,ded} = det;

  const irBruto = ir;

  const hasRedutor =
    redutor>0 || (irBruto>0 && irFinal===0);

  let redutorRow='';

  if(hasRedutor){

    redutorRow=`
    <tr>
      <td colspan="3" style="text-align:right;">
      Redutor IRRF
      </td>
      <td>- ${br.money(redutor)}</td>
    </tr>`;
  }

  tblIRRF.innerHTML=`

  <table>

    <thead>
      <tr>
        <th>Base</th>
        <th>Alíquota</th>
        <th>Dedução</th>
        <th>IR Bruto</th>
      </tr>
    </thead>

    <tbody>

      <tr>
        <td>${br.money(base)}</td>
        <td>${br.pct(aliq)}</td>
        <td>${br.money(ded)}</td>
        <td>${br.money(irBruto)}</td>
      </tr>

      ${redutorRow}

    </tbody>

    <tfoot>

      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;">
        IRRF Final
        </td>
        <td style="font-weight:bold;">
        ${br.money(irFinal)}
        </td>
      </tr>

      <tr>
        <td colspan="3">Modo</td>
        <td>${modo}</td>
      </tr>

    </tfoot>

  </table>
  `;
}

// ======================
// CÁLCULO PRINCIPAL
// ======================

function calcular(){

  const salario =
    br.toNumber(el('salario').value);

  const dependentes =
    Math.max(
      0,
      parseInt(el('dependentes').value||'0',10)
    );

  const pensao =
    br.toNumber(el('pensao').value);

  if(!salario || salario<=0){

    alert('Informe um salário válido');

    return;
  }

  const {inss,linhas} =
    calcularINSSProgressivo(salario);

  const detLegal =
    calcularIRRF_DeducaoLegal(
      salario,inss,dependentes,pensao
    );

  const detSimpl =
    calcularIRRF_Simplificado(salario);

  let modo = modoAtual();

  let det = detLegal;

  if(modo==='simplificado')
    det = detSimpl;

  if(modo==='auto')
    det = detLegal.ir <= detSimpl.ir
      ? detLegal
      : detSimpl;

  const irrfCalculado = det.ir;

  const {irFinal,redutor} =
    aplicarRedutorIRRF(
      irrfCalculado,
      salario
    );

  const irrf = irFinal;

  const liquido =
    salario - inss - irrf;

  kInss.textContent = br.money(inss);
  kIrrf.textContent = br.money(irrf);
  kLiq.textContent = br.money(liquido);

  badgeModo.textContent = `Modo: ${modo}`;

  renderTabelaINSS(linhas,inss);

  renderTabelaIRRF(modo,det,redutor,irrf);
}

// ======================
// EVENTOS
// ======================

el('btn-calcular')
.addEventListener('click',calcular);

['salario','dependentes','pensao']
.forEach(id=>{

  el(id).addEventListener('keydown',e=>{

    if(e.key==='Enter')
      calcular();

  });

});
```

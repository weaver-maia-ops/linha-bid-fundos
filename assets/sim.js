let DATA = null;
let PARAMS = null;

const FP = {A:0.85, B:1.05, C:1.25, D:1.45};
const CATS = {
  SAN:{nome:'Infraestrutura · saneamento e água', infra:true, part:[0.80,0.70]},
  INF:{nome:'Infraestrutura', infra:true, part:[0.60,0.50]},
  SP: {nome:'Serviço público', infra:false, part:[0.60,0.50]},
  EST:{nome:'Estruturador', infra:false, part:[0.55,0.45]},
  OUT:{nome:'Outros setores', infra:false, part:[0.50,0.40]}
};
const GENERIC_SETORES = [
  {id:'SAN', titulo:'Saneamento e abastecimento de água', cat:'SAN', desc:'Abastecimento de água, esgotamento sanitário e resíduos sólidos.'},
  {id:'INF', titulo:'Infraestrutura', cat:'INF', desc:'Energia (geração, transmissão e distribuição), telecomunicações, transporte e logística, irrigação, gás e dutos, portos e terminais, aeroportos, petróleo e biocombustíveis.'},
  {id:'SP', titulo:'Serviço público', cat:'SP', desc:'Empreendimentos de interesse público e iniciativa privada voltados à prestação de serviços, como saúde e educação conveniadas.'},
  {id:'EST', titulo:'Estruturador', cat:'EST', desc:'Empreendimentos que ampliam a estrutura produtiva local, com impacto relevante em novos negócios, empregos e renda regional.'},
  {id:'OUT', titulo:'Outros setores prioritários', cat:'OUT', desc:'Demais setores listados nas prioridades setoriais do fundo (indústria, agroindústria, turismo, serviços etc.).'}
];
const FUNDS = {
  FDA:{sup:'Sudam', regiao:'Norte', cdr:0.68, agente:'Banco da Amazônia e demais IFs autorizadas',
       ufs:['AC','AM','AP','MA','MT','PA','RO','RR','TO']},
  FDNE:{sup:'Sudene', regiao:'Nordeste', cdr:0.64, agente:'Banco do Nordeste e demais IFs autorizadas',
       ufs:['AL','BA','CE','MA','PB','PE','PI','RN','SE']},
  FDCO:{sup:'Sudeco', regiao:'Centro-Oeste', cdr:1.00, agente:'IFs autorizadas pelo Banco Central',
       ufs:['DF','GO','MS','MT']}
};
const UFNOME = {AC:'Acre',AM:'Amazonas',AP:'Amapá',MA:'Maranhão',MT:'Mato Grosso',PA:'Pará',RO:'Rondônia',RR:'Roraima',TO:'Tocantins',AL:'Alagoas',BA:'Bahia',CE:'Ceará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',RN:'Rio Grande do Norte',SE:'Sergipe',DF:'Distrito Federal',GO:'Goiás',MS:'Mato Grosso do Sul'};

const $ = id => document.getElementById(id);
const st = {fund:'FDA', imp:null};
const fmtPct = (x,d=2) => (x*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const fmtM = (x,d=1) => x.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtR = x => 'R$ '+fmtM(x)+' mi';
const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : NaN; };

function municipios(fund, uf){
  if (fund==='FDA') return (DATA.FDA[uf]||[]).map(([n,p])=>({nome:n, prio:p}));
  const reg = fund==='FDNE' ? DATA.NE : DATA.CO;
  return (reg[uf]||[]).map(([n,c])=>({nome:n, capital:c}));
}
function setores(fund){ return fund==='FDA' ? DATA.FDA_SETORES : GENERIC_SETORES; }

function fillUF(){
  const f = FUNDS[st.fund];
  const prev = $('uf').value;
  $('uf').innerHTML = '<option value="">Selecione</option>'+f.ufs.map(u=>`<option value="${u}">${UFNOME[u]}</option>`).join('');
  $('uf').value = f.ufs.includes(prev) ? prev : '';
  fillMun();
}
function fillMun(){
  if (!$('uf').value){
    $('mun').innerHTML = '<option value="">Selecione primeiro o estado</option>';
    showBlank('Selecione o estado, o município e o setor para iniciar a simulação.');
    return;
  }
  const list = municipios(st.fund, $('uf').value);
  $('mun').innerHTML = '<option value="">Selecione</option>'+list.map((m,i)=>`<option value="${i}">${m.nome}</option>`).join('');
  showBlank('Selecione o município e o setor para iniciar a simulação.');
}
function onMun(){
  const list = municipios(st.fund, $('uf').value);
  const m = list[+$('mun').value];
  if (!m){ showBlank('Selecione o município e o setor para iniciar a simulação.'); return; }
  if (st.fund==='FDA' && m.prio!=null){
    $('prioWrap').hidden = true;
    $('prioAuto').innerHTML = `<span class="pill ${m.prio?'p':'d'}">${m.prio?'Área prioritária':'Demais áreas'}</span><span class="muted">conforme o simulador oficial da Sudam</span>`;
  } else if (st.fund==='FDA'){
    $('prioWrap').hidden = false;
    $('prioAuto').innerHTML = `<span class="pill s">A confirmar</span>`;
    $('prio').value = '1';
    $('prioHint').textContent = 'O simulador oficial da Sudam não classifica este município corretamente (nome com apóstrofo ou fora da lista). Confirme na Res. Condel/Sudam nº 134/2025: PNDR baixa ou média renda, Faixa de Fronteira, Marajó/Bailique e municípios das portarias do MMA.';
  } else {
    $('prioWrap').hidden = false;
    $('prioAuto').innerHTML = '';
    if (st.fund==='FDNE'){
      $('prio').value = '0';
      $('prioHint').textContent = 'Padrão conservador. A prioridade depende da Resolução Condel/Sudene nº 193/2025 e do Anexo I: polo regional, Semiárido, tipologia PNDR, RIDE, bacias do São Francisco e Parnaíba, cidades intermediadoras ou áreas NIB/PTE. Confirme antes de selecionar área prioritária.';
    } else {
      $('prio').value = '0';
      $('prioHint').textContent = 'Padrão conservador. São prioritários: Faixa de Fronteira, municípios goianos da RIDE-DF, microrregiões PNDR de baixa ou média renda, cidades médias e cidades vinculadas à PNDR. Confirme na Resolução Condel/Sudeco nº 166/2025, alterada pela nº 178/2026.';
    }
  }
  calc();
}
function fillSetor(){
  const list = setores(st.fund);
  if (st.fund==='FDA'){
    const groups = [...new Set(list.map(s=>s.grupo))];
    $('setor').innerHTML = '<option value="">Selecione</option>'+groups.map(g=>`<optgroup label="${g}">`+list.filter(s=>s.grupo===g).map(s=>`<option value="${s.id}">${s.codigo} ${s.titulo}</option>`).join('')+'</optgroup>').join('');
  } else {
    $('setor').innerHTML = '<option value="">Selecione</option>'+list.map(s=>`<option value="${s.id}">${s.titulo}</option>`).join('');
  }
}

function showBlank(message){
  $('rate').textContent = '—';
  $('formula').textContent = message;
  $('rateNote').textContent = 'Resultado indicativo. A análise e a contratação dependem da superintendência e do agente operador.';
  $('chips').innerHTML = '';
  $('typegrid').innerHTML = '';
  $('kpis').innerHTML = '';
  $('alerts').innerHTML = `<div class="alert info">${message}</div>`;
  $('rules').innerHTML = '';
}

function calc(){
  if (!st.fund || !$('uf').value || $('mun').value==='' || !$('setor').value){
    showBlank('Selecione fundo, estado, município e setor para iniciar a simulação.');
    return;
  }
  const fund = st.fund, F = FUNDS[fund];
  const list = municipios(fund, $('uf').value);
  const m = list[+$('mun').value] || {};
  const prio = (fund==='FDA' && m.prio!=null) ? (m.prio===1) : $('prio').value==='1';
  const setor = setores(fund).find(s=>s.id===$('setor').value) || setores(fund)[0];
  const cat = CATS[setor.cat];
  $('setorDesc').innerHTML = `<b>${cat.nome}</b> · ${setor.desc}`;
  const tipo = cat.infra ? (prio?'A':'C') : (prio?'B':'D');
  const fp = FP[tipo];
  const tlp = num('tlp')/100, cdr = num('cdr'), ipca = num('ipca')/100;
  const taxa = cdr*fp*tlp;

  // prazo máximo definido pela Resolução CMN nº 4.960/2021
  const maxAnos = cat.infra ? 20 : 12;

  // participação
  const inv = num('inv')||0, fixo = isFinite(num('fixo')) ? num('fixo') : inv;
  const pct = cat.part[prio?0:1];
  const limPct = inv*pct, limFixo = fixo*0.90;
  const lim = Math.min(limPct, limFixo, inv*0.80);
  const ped = num('pedido');
  const valor = isFinite(ped) && ped>0 ? Math.min(ped, lim) : lim;
  const proprios = inv*0.20;
  const outras = Math.max(0, inv - valor - proprios);

  // texto da taxa
  $('rate').textContent = fmtPct(taxa);
  $('formula').innerHTML = `TFD = CDR × FP × TLP<sub>pré</sub> = <b>${cdr.toFixed(2).replace('.',',')}</b> × <b>${fp.toFixed(2).replace('.',',')}</b> × <b>${fmtPct(tlp)}</b> = <b>${fmtPct(taxa,3)}</b>`;
  const nominal = (1+taxa)*(1+ipca)-1;
  $('rateNote').textContent = `Com IPCA de ${fmtPct(ipca,1)}, a taxa nominal equivalente é ${fmtPct(nominal)} a.a. A parte prefixada é travada no mês da contratação; o saldo é corrigido pelo IPCA (FAM).`;

  $('chips').innerHTML = [
    `<span class="pill t">Tipo ${tipo} · FP ${fp.toFixed(2).replace('.',',')}</span>`,
    `<span class="pill ${prio?'p':'d'}">${prio?'Área prioritária':'Demais áreas'}</span>`,
    `<span class="pill s">${cat.infra?'Infraestrutura':'Não infraestrutura'}</span>`,
    `<span class="pill s">${fund==='FDA'?'Setor prioritário':'Enquadramento setorial a confirmar'}</span>`
  ].join('');
  const rowsT = [['Infraestrutura','A','C'],['Demais setores','B','D']];
  let tg = '<div>Setor</div><div>Prioritária</div><div>Demais áreas</div>';
  for (const [lab,a,b] of rowsT){
    tg += `<div>${lab}</div>`;
    for (const t of [a,b]) tg += `<div class="${t===tipo?'on':''}"><span class="num">${t} · ${fmtPct(cdr*FP[t]*tlp)}</span></div>`;
  }
  $('typegrid').innerHTML = tg;

  $('kpis').innerHTML = [
    ['Teto indicativo', inv>0 ? fmtR(valor) : 'Informe o investimento', inv>0 ? `${fmtPct(valor/inv,0)} do investimento total` : 'sujeito ao investimento elegível'],
    ['Participação máxima', fmtPct(pct,0), `${cat.nome.toLowerCase()}, ${prio?'área prioritária':'demais áreas'}`],
    ['Prazo máximo', `${maxAnos} anos`, 'inclui o período de carência'],
    ['Carência máxima', 'Obra + até 12 meses', 'juros capitalizados durante a carência']
  ].map(([k,v,s])=>`<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');

  // alertas
  const al = [];
  if (isFinite(ped) && ped > lim) al.push(`O valor solicitado (${fmtR(ped)}) passa do limite. O simulador usou o máximo de ${fmtR(lim)}.`);
  if (limFixo < limPct && limFixo < inv*0.8) al.push(`O limite ficou em 90% do investimento fixo (${fmtR(limFixo)}), abaixo do percentual setorial.`);

  if (fund==='FDNE'){
    const semi = prio; // aproximação: limite reduzido para semiárido/RIDE
    const minV = st.imp ? (semi?20:30) : (semi?15:25);
    if (inv < minV) al.push(`Porte mínimo do FDNE: R$ ${minV} mi para ${st.imp?'implantação':'ampliação/modernização'} ${semi?'no Semiárido ou em RIDE':'nas demais áreas'}. A Sudene pode reduzir até R$ 5 mi por relevância do projeto.`);
  }
  if (fund==='FDCO' && inv < 10) al.push('O FDCO exige projeto de no mínimo R$ 10 mi (Res. Condel/Sudeco nº 177/2025).');
  if (fund==='FDNE') al.push({info:true, t:'Para o FDNE, confirme a prioridade espacial na Resolução Condel/Sudene nº 193/2025 e no seu Anexo I. A simulação usa a opção selecionada como premissa indicativa.'});
  if (fund==='FDCO') al.push({info:true, t:'Para o FDCO, confirme a prioridade espacial na Resolução Condel/Sudeco nº 166/2025, alterada pela nº 178/2026. A simulação usa a opção selecionada como premissa indicativa.'});
  $('alerts').innerHTML = al.map(a=> typeof a==='string' ? `<div class="alert">${a}</div>` : `<div class="alert info">${a.t}</div>`).join('');

  $('rules').innerHTML = [
    `Agente operador: ${F.agente}. Risco integral do agente.`,
    `CDR ${F.regiao}: ${cdr.toFixed(2).replace('.',',')} (IBGE). Fatores de programa (Anexo III da Res. 4.960): A 0,85 · B 1,05 · C 1,25 · D 1,45.`,
    `Participação do fundo até 80% do investimento total e 90% do investimento fixo, dentro do limite setorial do Anexo II.`,
    `Recursos próprios: no mínimo 20% do investimento total.`,
    `Prazo: até 20 anos para infraestrutura e 12 anos para os demais, incluída a carência de até 1 ano após a entrada em operação.`,
    `Amortizações e juros semestrais; juros capitalizados na carência.`
  ].map(t=>`<li>${t}</li>`).join('');
}

function setFund(fund){
  st.fund = fund;
  document.querySelectorAll('.funds button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.fund===fund)));
  $('cdr').value = FUNDS[fund].cdr.toFixed(2);
  $('cdrHint').textContent = FUNDS[fund].regiao;
  fillSetor(); fillUF();
}
function segBind(attr, key, conv){
  document.querySelectorAll(`[data-${attr}]`).forEach(b=>b.addEventListener('click',()=>{
    st[key] = conv(b.dataset[attr]);
    document.querySelectorAll(`[data-${attr}]`).forEach(o=>o.setAttribute('aria-pressed', String(o===b)));
    calc();
  }));
}
document.querySelectorAll('.funds button').forEach(b=>b.addEventListener('click',()=>setFund(b.dataset.fund)));
segBind('imp','imp',v=>v==='1');
$('uf').addEventListener('change', fillMun);
$('mun').addEventListener('change', onMun);
['prio','setor','inv','fixo','pedido','tlp','cdr','ipca'].forEach(id=>$(id).addEventListener('input', calc));
$('f').addEventListener('submit', e=>e.preventDefault());


// ---- carregamento de dados e parâmetros ----
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function mesAno(iso){ const [y,m] = String(iso||'').split('-'); return (MES[(+m||1)-1]||'')+'/'+(y||''); }
async function getJSON(url){ const r = await fetch(url, {cache:'no-store'}); if(!r.ok) throw new Error(url+' '+r.status); return r.json(); }

// Projeção de IPCA: mediana do Focus (Banco Central) para o ano seguinte; se falhar, usa o valor de params.json
async function ipcaFocus(){
  const ano = new Date().getFullYear() + 1;
  const url = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=40&$filter=Indicador%20eq%20'IPCA'%20and%20DataReferencia%20eq%20'"+ano+"'&$orderby=Data%20desc&$format=json&$select=Data,DataReferencia,Mediana,baseCalculo";
  const j = await getJSON(url);
  const row = (j.value||[]).find(r=>r.baseCalculo===0) || (j.value||[])[0];
  if (!row || !isFinite(row.Mediana)) throw new Error('focus vazio');
  return {valor: +row.Mediana, data: row.Data, ano};
}

async function boot(){
  const status = $('paramStatus');
  try{
    [PARAMS, DATA] = await Promise.all([getJSON('data/params.json'), getJSON('data/municipios.json')]);
  }catch(e){
    if (status) status.textContent = 'Não foi possível carregar os dados do simulador. Recarregue a página.';
    return;
  }
  for (const f of Object.keys(FUNDS)) if (PARAMS.cdr && isFinite(PARAMS.cdr[f])) FUNDS[f].cdr = PARAMS.cdr[f];
  $('tlp').value = PARAMS.tlp_pre.valor;
  $('ipca').value = PARAMS.ipca_proj_fallback;
  let ipcaTxt = `IPCA projetado de ${String(PARAMS.ipca_proj_fallback).replace('.',',')}% a.a. (premissa)`;
  const tlpTxt = `TLP pré de ${mesAno(PARAMS.tlp_pre.mes_ref)}: ${String(PARAMS.tlp_pre.valor).replace('.',',')}% a.a.`;
  const cdrTxt = `CDR ${PARAMS.cdr.fonte||'IBGE'}, vigente de ${PARAMS.cdr.vigencia||''}`;
  const paint = () => {
    if (status) status.textContent = `${tlpTxt} · ${cdrTxt} · ${ipcaTxt}. Atualizado em ${PARAMS.atualizado_em.split('-').reverse().join('/')}.`;
    const ack = $('ackParams'); if (ack) ack.textContent = `Parâmetros de ${mesAno(PARAMS.tlp_pre.mes_ref)}.`;
  };
  paint();
  setFund('FDA');
  document.dispatchEvent(new CustomEvent('sim:ready', {detail: PARAMS}));
  try{
    const f = await ipcaFocus();
    $('ipca').value = f.valor.toFixed(2);
    ipcaTxt = `IPCA projetado de ${f.valor.toFixed(2).replace('.',',')}% para ${f.ano} (Focus/BCB, ${f.data.split('-').reverse().join('/')})`;
    paint(); calc();
  }catch(e){ /* mantém a premissa de params.json */ }
}
boot();

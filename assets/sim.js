let DATA = null;
let PARAMS = null;

// Idioma da página (pt ou en) e raiz do site, para os dados funcionarem em / e em /en/
const LANG = (document.documentElement.lang || 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt';
const LOC = LANG === 'en' ? 'en-US' : 'pt-BR';
const ROOT = new URL('..', (document.currentScript && document.currentScript.src) || location.href);

const FP = {A:0.85, B:1.05, C:1.25, D:1.45};
const CATS = {
  SAN:{infra:true, part:[0.80,0.70]},
  INF:{infra:true, part:[0.60,0.50]},
  SP: {infra:false, part:[0.60,0.50]},
  EST:{infra:false, part:[0.55,0.45]},
  OUT:{infra:false, part:[0.50,0.40]}
};
const CAT_NOME = {
  pt:{SAN:'Infraestrutura · saneamento e água', INF:'Infraestrutura', SP:'Serviço público', EST:'Estruturador', OUT:'Outros setores'},
  en:{SAN:'Infrastructure · water and sanitation', INF:'Infrastructure', SP:'Public service', EST:'Structuring sector', OUT:'Other sectors'}
};
const BID_SETORES_TXT = {
  pt:[
    {id:'SAN', titulo:'Água e saneamento', cat:'SAN', desc:'Abastecimento de água, esgotamento sanitário e soluções de saneamento elegíveis.'},
    {id:'LOG', titulo:'Transporte e logística', cat:'INF', desc:'Rodovias, ferrovias, hidrovias, portos, terminais, aeroportos, mobilidade e infraestrutura logística.'}
  ],
  en:[
    {id:'SAN', titulo:'Water and sanitation', cat:'SAN', desc:'Water supply, sewerage and eligible sanitation solutions.'},
    {id:'LOG', titulo:'Transport and logistics', cat:'INF', desc:'Highways, railways, waterways, ports, terminals, airports, urban mobility and logistics infrastructure.'}
  ]
};
// Tradução dos três enquadramentos do FDA usados pela linha BID (os dados vêm em português)
const FDA_SETOR_EN = {
  '2211':{titulo:'Water, sewerage, waste management and remediation', desc:'All divisions, groups and classes.', grupo:'Infrastructure'},
  '2214':{titulo:'Transport, storage and mail', desc:'Land, water and air transport, including highways, railways, waterways and airports; intermodal freight transport and ports.', grupo:'Infrastructure'},
  '2221':{titulo:'Transport, storage and mail', desc:'Storage, loading and unloading.', grupo:'Structuring sector'}
};
const FUNDS = {
  FDA:{sup:'Sudam', regiao:{pt:'Norte', en:'North'}, cdr:0.68,
       agente:{pt:'Banco da Amazônia e demais IFs autorizadas', en:'Banco da Amazônia and other authorized financial institutions'},
       ufs:['AC','AM','AP','MA','MT','PA','RO','RR','TO']},
  FDNE:{sup:'Sudene', regiao:{pt:'Nordeste', en:'Northeast'}, cdr:0.64,
       agente:{pt:'Banco do Nordeste e demais IFs autorizadas', en:'Banco do Nordeste and other authorized financial institutions'},
       ufs:['AL','BA','CE','MA','PB','PE','PI','RN','SE']},
  FDCO:{sup:'Sudeco', regiao:{pt:'Centro-Oeste', en:'Central-West'}, cdr:1.00,
       agente:{pt:'IFs autorizadas pelo Banco Central', en:'Financial institutions authorized by the Central Bank of Brazil'},
       ufs:['DF','GO','MS','MT']}
};
const UFNOME = {AC:'Acre',AM:'Amazonas',AP:'Amapá',MA:'Maranhão',MT:'Mato Grosso',PA:'Pará',RO:'Rondônia',RR:'Roraima',TO:'Tocantins',AL:'Alagoas',BA:'Bahia',CE:'Ceará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',RN:'Rio Grande do Norte',SE:'Sergipe',DF:'Distrito Federal',GO:'Goiás',MS:'Mato Grosso do Sul'};

const $ = id => document.getElementById(id);
const st = {fund:'FDA', imp:null};
const dec = (x,d=2) => x.toLocaleString(LOC,{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtPct = (x,d=2) => dec(x*100,d)+'%';
const fmtM = (x,d=1) => dec(x,d);
const fmtR = x => LANG==='en' ? 'BRL '+fmtM(x)+' million' : 'R$ '+fmtM(x)+' mi';
const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : NaN; };
const pctStr = v => LANG==='en' ? String(v) : String(v).replace('.',',');
const dataBR = iso => { const [y,m,d] = String(iso||'').split('-'); return LANG==='en' ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(+m||1)-1]} ${+d}, ${y}` : `${d}/${m}/${y}`; };

const MES = {
  pt:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],
  en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
};
function mesAno(iso){ const [y,m] = String(iso||'').split('-'); return (MES[LANG][(+m||1)-1]||'')+(LANG==='en'?' ':'/')+(y||''); }
// Na versão em inglês, converte datas e meses que vêm em português do params.json
function enTexto(s){
  if (LANG!=='en') return s;
  return String(s)
    .replace(/(\d{1,2})º?\/(\d{1,2})\/(\d{4})/g, (_,d,m,y)=>`${MES.en[+m-1]} ${+d}, ${y}`)
    .replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/(\d{4})/gi, (_,m,y)=>`${MES.en[MES.pt.indexOf(m.toLowerCase())]} ${y}`)
    .replace(/\s+a\s+/g, ' to ');
}

const T = {
  pt:{
    selecione:'Selecione', selUF:'Selecione primeiro o estado',
    blankUF:'Selecione o estado, o município e o setor para iniciar a simulação.',
    blankMun:'Selecione o município e o setor para iniciar a simulação.',
    blankAll:'Selecione fundo, estado, município e setor para iniciar a simulação.',
    rateNoteBlank:'Resultado indicativo. A análise e a contratação dependem da superintendência e do agente operador.',
    prioArea:'Área prioritária', demais:'Demais áreas', aConfirmar:'A confirmar', conformeSudam:'conforme o simulador oficial da Sudam',
    hintFDA:'O simulador oficial da Sudam não classifica este município corretamente (nome com apóstrofo ou fora da lista). Confirme na Res. Condel/Sudam nº 134/2025: PNDR baixa ou média renda, Faixa de Fronteira, Marajó/Bailique e municípios das portarias do MMA.',
    hintFDNE:'Padrão conservador. A prioridade depende da Resolução Condel/Sudene nº 193/2025 e do Anexo I: polo regional, Semiárido, tipologia PNDR, RIDE, bacias do São Francisco e Parnaíba, cidades intermediadoras ou áreas NIB/PTE. Confirme antes de selecionar área prioritária.',
    hintFDCO:'Padrão conservador. São prioritários: Faixa de Fronteira, municípios goianos da RIDE-DF, microrregiões PNDR de baixa ou média renda, cidades médias e cidades vinculadas à PNDR. Confirme na Resolução Condel/Sudeco nº 166/2025, alterada pela nº 178/2026.',
    rateNote:(ipca,nom)=>`Com IPCA de ${ipca}, a taxa nominal equivalente é ${nom} a.a. A parte prefixada é travada no mês da contratação; o saldo é corrigido pelo IPCA (FAM).`,
    tipo:'Tipo', infra:'Infraestrutura', naoInfra:'Não infraestrutura', setorPrio:'Setor prioritário', setorConf:'Enquadramento setorial a confirmar',
    tgSetor:'Setor', tgPrio:'Prioritária', tgDemais:'Demais áreas', tgInfra:'Infraestrutura', tgOutros:'Demais setores',
    kTeto:'Teto indicativo', kInformeInv:'Informe o investimento', kDoInv:p=>`${p} do investimento total`, kSujeito:'sujeito ao investimento elegível',
    kPart:'Participação máxima', kLimite:n=>`limite da linha BID, ${n.toLowerCase()}`,
    kPrazo:'Prazo máximo', kAnos:n=>`${n} anos`, kInclui:'inclui o período de carência',
    kCar:'Carência máxima', kCarV:'Obra + até 12 meses', kCarS:'juros capitalizados durante a carência',
    alPedido:(p,l)=>`O valor solicitado (${p}) passa do limite. O simulador usou o máximo de ${l}.`,
    alFixo:l=>`O limite ficou em 90% do investimento fixo (${l}), abaixo do percentual setorial.`,
    alFDNEmin:(v,imp,semi)=>`Porte mínimo do FDNE: R$ ${v} mi para ${imp?'implantação':'ampliação/modernização'} ${semi?'no Semiárido ou em RIDE':'nas demais áreas'}. A Sudene pode reduzir até R$ 5 mi por relevância do projeto.`,
    alFDCOmin:'O FDCO exige projeto de no mínimo R$ 10 mi (Res. Condel/Sudeco nº 177/2025).',
    alFDNEinfo:'Para o FDNE, confirme a prioridade espacial na Resolução Condel/Sudene nº 193/2025 e no seu Anexo I. A simulação usa a opção selecionada como premissa indicativa.',
    alFDCOinfo:'Para o FDCO, confirme a prioridade espacial na Resolução Condel/Sudeco nº 166/2025, alterada pela nº 178/2026. A simulação usa a opção selecionada como premissa indicativa.',
    rules:(F,reg,cdr)=>[
      `Agente operador: ${F}. Risco integral do agente.`,
      `CDR ${reg}: ${cdr} (IBGE). Fatores de programa (Anexo III da Res. 4.960): A 0,85 · B 1,05 · C 1,25 · D 1,45.`,
      `Participação da linha BID até 60% do investimento total, também limitada a 90% do investimento fixo.`,
      `Recursos próprios: no mínimo 20% do investimento total.`,
      `Prazo: até 20 anos para infraestrutura e 12 anos para os demais, incluída a carência de até 1 ano após a entrada em operação.`,
      `Amortizações e juros semestrais; juros capitalizados na carência.`
    ],
    erroDados:'Não foi possível carregar os dados do simulador. Recarregue a página.',
    ipcaPrem:v=>`IPCA projetado de ${v}% a.a. (premissa)`,
    tlpTxt:(m,v)=>`TLP pré de ${m}: ${v}% a.a.`,
    cdrTxt:(f,v)=>`CDR ${f}, vigente de ${v}`,
    atualizado:d=>`Atualizado em ${d}.`,
    ackParams:m=>`Parâmetros de ${m}.`,
    ipcaFocus:(v,a,d)=>`IPCA projetado de ${v}% para ${a} (Focus/BCB, ${d})`
  },
  en:{
    selecione:'Select', selUF:'Select the state first',
    blankUF:'Select the state, the municipality and the sector to start the simulation.',
    blankMun:'Select the municipality and the sector to start the simulation.',
    blankAll:'Select the fund, state, municipality and sector to start the simulation.',
    rateNoteBlank:'Indicative result. Assessment and contracting depend on the regional development agency and the operating bank.',
    prioArea:'Priority area', demais:'Other areas', aConfirmar:'To be confirmed', conformeSudam:'per Sudam’s official simulator',
    hintFDA:'Sudam’s official simulator does not classify this municipality correctly (name with an apostrophe or missing from the list). Confirm under Condel/Sudam Resolution No. 134/2025: low- or middle-income PNDR areas, the Border Strip, Marajó/Bailique and municipalities listed in Ministry of Environment ordinances.',
    hintFDNE:'Conservative default. Priority depends on Condel/Sudene Resolution No. 193/2025 and its Annex I: regional hubs, the Semi-arid region, PNDR typology, RIDE metropolitan areas, the São Francisco and Parnaíba basins, intermediate cities or NIB/PTE areas. Confirm before selecting a priority area.',
    hintFDCO:'Conservative default. Priority areas are the Border Strip, Goiás municipalities in the Federal District metropolitan region (RIDE-DF), low- or middle-income PNDR micro-regions, medium-sized cities and cities linked to the PNDR. Confirm under Condel/Sudeco Resolution No. 166/2025, as amended by No. 178/2026.',
    rateNote:(ipca,nom)=>`With IPCA inflation of ${ipca}, the equivalent nominal rate is ${nom} per year. The fixed component is locked in the month the contract is signed; the outstanding balance is indexed to IPCA.`,
    tipo:'Type', infra:'Infrastructure', naoInfra:'Non-infrastructure', setorPrio:'Priority sector', setorConf:'Sector classification to be confirmed',
    tgSetor:'Sector', tgPrio:'Priority area', tgDemais:'Other areas', tgInfra:'Infrastructure', tgOutros:'Other sectors',
    kTeto:'Indicative ceiling', kInformeInv:'Enter the investment', kDoInv:p=>`${p} of total investment`, kSujeito:'subject to eligible investment',
    kPart:'Maximum share', kLimite:n=>`IDB credit line limit, ${n.toLowerCase()}`,
    kPrazo:'Maximum term', kAnos:n=>`${n} years`, kInclui:'includes the grace period',
    kCar:'Maximum grace period', kCarV:'Construction + up to 12 months', kCarS:'interest capitalized during the grace period',
    alPedido:(p,l)=>`The requested amount (${p}) exceeds the limit. The simulator used the maximum of ${l}.`,
    alFixo:l=>`The limit was set at 90% of fixed investment (${l}), below the sector percentage.`,
    alFDNEmin:(v,imp,semi)=>`FDNE minimum project size: BRL ${v} million for ${imp?'new projects':'expansion or modernization'} ${semi?'in the Semi-arid region or a RIDE':'in other areas'}. Sudene may lower it by up to BRL 5 million for relevant projects.`,
    alFDCOmin:'FDCO requires a minimum project size of BRL 10 million (Condel/Sudeco Resolution No. 177/2025).',
    alFDNEinfo:'For FDNE, confirm spatial priority under Condel/Sudene Resolution No. 193/2025 and its Annex I. The simulation uses the selected option as an indicative assumption.',
    alFDCOinfo:'For FDCO, confirm spatial priority under Condel/Sudeco Resolution No. 166/2025, as amended by No. 178/2026. The simulation uses the selected option as an indicative assumption.',
    rules:(F,reg,cdr)=>[
      `Operating bank: ${F}. The bank bears the full credit risk.`,
      `Regional coefficient (CDR) for the ${reg}: ${cdr} (IBGE). Program factors (Annex III of CMN Resolution 4,960): A 0.85 · B 1.05 · C 1.25 · D 1.45.`,
      `IDB credit line share of up to 60% of total investment, also capped at 90% of fixed investment.`,
      `Sponsor equity: at least 20% of total investment.`,
      `Term: up to 20 years for infrastructure and 12 years for other sectors, including a grace period of up to 1 year after operations begin.`,
      `Semiannual principal and interest payments; interest capitalized during the grace period.`
    ],
    erroDados:'The simulator data could not be loaded. Please reload the page.',
    ipcaPrem:v=>`Projected IPCA of ${v}% per year (assumption)`,
    tlpTxt:(m,v)=>`Fixed-rate TLP for ${m}: ${v}% per year`,
    cdrTxt:(f,v)=>`CDR ${f}, valid ${v}`,
    atualizado:d=>`Updated on ${d}.`,
    ackParams:m=>`${m} parameters.`,
    ipcaFocus:(v,a,d)=>`Projected IPCA of ${v}% for ${a} (Focus survey, Central Bank of Brazil, ${d})`
  }
}[LANG];

function municipios(fund, uf){
  if (fund==='FDA') return (DATA.FDA[uf]||[]).map(([n,p])=>({nome:n, prio:p}));
  const reg = fund==='FDNE' ? DATA.NE : DATA.CO;
  return (reg[uf]||[]).map(([n,c])=>({nome:n, capital:c}));
}
function setores(fund){
  if (fund!=='FDA') return BID_SETORES_TXT[LANG];
  // A linha BID cobre transporte, logística, água e saneamento. Mantêm-se os
  // dois enquadramentos FDA de transporte porque têm regras de prioridade distintas.
  const list = DATA.FDA_SETORES.filter(s=>['2211','2214','2221'].includes(s.id));
  return LANG==='en' ? list.map(s=>Object.assign({}, s, FDA_SETOR_EN[s.id]||{})) : list;
}

function fillUF(){
  const f = FUNDS[st.fund];
  const prev = $('uf').value;
  $('uf').innerHTML = `<option value="">${T.selecione}</option>`+f.ufs.map(u=>`<option value="${u}">${UFNOME[u]}</option>`).join('');
  $('uf').value = f.ufs.includes(prev) ? prev : '';
  fillMun();
}
function fillMun(){
  if (!$('uf').value){
    $('mun').innerHTML = `<option value="">${T.selUF}</option>`;
    showBlank(T.blankUF);
    return;
  }
  const list = municipios(st.fund, $('uf').value);
  $('mun').innerHTML = `<option value="">${T.selecione}</option>`+list.map((m,i)=>`<option value="${i}">${m.nome}</option>`).join('');
  showBlank(T.blankMun);
}
function onMun(){
  const list = municipios(st.fund, $('uf').value);
  const m = list[+$('mun').value];
  if (!m){ showBlank(T.blankMun); return; }
  if (st.fund==='FDA' && m.prio!=null){
    $('prioWrap').hidden = true;
    $('prioAuto').innerHTML = `<span class="pill ${m.prio?'p':'d'}">${m.prio?T.prioArea:T.demais}</span><span class="muted">${T.conformeSudam}</span>`;
  } else if (st.fund==='FDA'){
    $('prioWrap').hidden = false;
    $('prioAuto').innerHTML = `<span class="pill s">${T.aConfirmar}</span>`;
    $('prio').value = '1';
    $('prioHint').textContent = T.hintFDA;
  } else {
    $('prioWrap').hidden = false;
    $('prioAuto').innerHTML = '';
    $('prio').value = '0';
    $('prioHint').textContent = st.fund==='FDNE' ? T.hintFDNE : T.hintFDCO;
  }
  calc();
}
function fillSetor(){
  const list = setores(st.fund);
  if (st.fund==='FDA'){
    const groups = [...new Set(list.map(s=>s.grupo))];
    $('setor').innerHTML = `<option value="">${T.selecione}</option>`+groups.map(g=>`<optgroup label="${g}">`+list.filter(s=>s.grupo===g).map(s=>`<option value="${s.id}">${s.codigo} ${s.titulo}</option>`).join('')+'</optgroup>').join('');
  } else {
    $('setor').innerHTML = `<option value="">${T.selecione}</option>`+list.map(s=>`<option value="${s.id}">${s.titulo}</option>`).join('');
  }
}

function showBlank(message){
  $('rate').textContent = '—';
  $('formula').textContent = message;
  $('rateNote').textContent = T.rateNoteBlank;
  $('chips').innerHTML = '';
  $('typegrid').innerHTML = '';
  $('kpis').innerHTML = '';
  $('alerts').innerHTML = `<div class="alert info">${message}</div>`;
  $('rules').innerHTML = '';
}

function calc(){
  if (!st.fund || !$('uf').value || $('mun').value==='' || !$('setor').value){
    showBlank(T.blankAll);
    return;
  }
  const fund = st.fund, F = FUNDS[fund];
  const list = municipios(fund, $('uf').value);
  const m = list[+$('mun').value] || {};
  const prio = (fund==='FDA' && m.prio!=null) ? (m.prio===1) : $('prio').value==='1';
  const setor = setores(fund).find(s=>s.id===$('setor').value) || setores(fund)[0];
  const cat = CATS[setor.cat], catNome = CAT_NOME[LANG][setor.cat];
  $('setorDesc').innerHTML = `<b>${catNome}</b> · ${setor.desc}`;
  const tipo = cat.infra ? (prio?'A':'C') : (prio?'B':'D');
  const fp = FP[tipo];
  const tlp = num('tlp')/100, cdr = num('cdr'), ipca = num('ipca')/100;
  const taxa = cdr*fp*tlp;

  // prazo máximo definido pela Resolução CMN nº 4.960/2021
  const maxAnos = cat.infra ? 20 : 12;

  // participação
  const inv = num('inv')||0, fixo = isFinite(num('fixo')) ? num('fixo') : inv;
  const pct = Math.min(cat.part[prio?0:1], 0.60);
  const limPct = inv*pct, limFixo = fixo*0.90;
  const lim = Math.min(limPct, limFixo, inv*0.80);
  const ped = num('pedido');
  const valor = isFinite(ped) && ped>0 ? Math.min(ped, lim) : lim;

  // texto da taxa
  $('rate').textContent = fmtPct(taxa);
  $('formula').innerHTML = `TFD = CDR × FP × TLP<sub>${LANG==='en'?'fixed':'pré'}</sub> = <b>${dec(cdr)}</b> × <b>${dec(fp)}</b> × <b>${fmtPct(tlp)}</b> = <b>${fmtPct(taxa,3)}</b>`;
  const nominal = (1+taxa)*(1+ipca)-1;
  $('rateNote').textContent = T.rateNote(fmtPct(ipca,1), fmtPct(nominal));

  $('chips').innerHTML = [
    `<span class="pill t">${T.tipo} ${tipo} · FP ${dec(fp)}</span>`,
    `<span class="pill ${prio?'p':'d'}">${prio?T.prioArea:T.demais}</span>`,
    `<span class="pill s">${cat.infra?T.infra:T.naoInfra}</span>`,
    `<span class="pill s">${fund==='FDA'?T.setorPrio:T.setorConf}</span>`
  ].join('');
  const rowsT = [[T.tgInfra,'A','C'],[T.tgOutros,'B','D']];
  let tg = `<div>${T.tgSetor}</div><div>${T.tgPrio}</div><div>${T.tgDemais}</div>`;
  for (const [lab,a,b] of rowsT){
    tg += `<div>${lab}</div>`;
    for (const t of [a,b]) tg += `<div class="${t===tipo?'on':''}"><span class="num">${t} · ${fmtPct(cdr*FP[t]*tlp)}</span></div>`;
  }
  $('typegrid').innerHTML = tg;

  $('kpis').innerHTML = [
    [T.kTeto, inv>0 ? fmtR(valor) : T.kInformeInv, inv>0 ? T.kDoInv(fmtPct(valor/inv,0)) : T.kSujeito],
    [T.kPart, fmtPct(pct,0), T.kLimite(catNome)],
    [T.kPrazo, T.kAnos(maxAnos), T.kInclui],
    [T.kCar, T.kCarV, T.kCarS]
  ].map(([k,v,s])=>`<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');

  // alertas
  const al = [];
  if (isFinite(ped) && ped > lim) al.push(T.alPedido(fmtR(ped), fmtR(lim)));
  if (limFixo < limPct && limFixo < inv*0.8) al.push(T.alFixo(fmtR(limFixo)));

  if (fund==='FDNE'){
    const semi = prio; // aproximação: limite reduzido para semiárido/RIDE
    const minV = st.imp ? (semi?20:30) : (semi?15:25);
    if (inv < minV) al.push(T.alFDNEmin(minV, st.imp, semi));
  }
  if (fund==='FDCO' && inv < 10) al.push(T.alFDCOmin);
  if (fund==='FDNE') al.push({info:true, t:T.alFDNEinfo});
  if (fund==='FDCO') al.push({info:true, t:T.alFDCOinfo});
  $('alerts').innerHTML = al.map(a=> typeof a==='string' ? `<div class="alert">${a}</div>` : `<div class="alert info">${a.t}</div>`).join('');

  $('rules').innerHTML = T.rules(F.agente[LANG], F.regiao[LANG], dec(cdr)).map(t=>`<li>${t}</li>`).join('');
}

function setFund(fund){
  st.fund = fund;
  document.querySelectorAll('.funds button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.fund===fund)));
  $('cdr').value = FUNDS[fund].cdr.toFixed(2);
  $('cdrHint').textContent = FUNDS[fund].regiao[LANG];
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
    [PARAMS, DATA] = await Promise.all([
      getJSON(new URL('data/params.json', ROOT).href),
      getJSON(new URL('data/municipios.json', ROOT).href)
    ]);
  }catch(e){
    if (status) status.textContent = T.erroDados;
    return;
  }
  for (const f of Object.keys(FUNDS)) if (PARAMS.cdr && isFinite(PARAMS.cdr[f])) FUNDS[f].cdr = PARAMS.cdr[f];
  $('tlp').value = PARAMS.tlp_pre.valor;
  $('ipca').value = PARAMS.ipca_proj_fallback;
  let ipcaTxt = T.ipcaPrem(pctStr(PARAMS.ipca_proj_fallback));
  const tlpTxt = T.tlpTxt(mesAno(PARAMS.tlp_pre.mes_ref), pctStr(PARAMS.tlp_pre.valor));
  const cdrTxt = T.cdrTxt(enTexto(PARAMS.cdr.fonte||'IBGE'), enTexto(PARAMS.cdr.vigencia||''));
  const paint = () => {
    if (status) status.textContent = `${tlpTxt} · ${cdrTxt} · ${ipcaTxt}. ${T.atualizado(dataBR(PARAMS.atualizado_em))}`;
    const ack = $('ackParams'); if (ack) ack.textContent = T.ackParams(mesAno(PARAMS.tlp_pre.mes_ref));
  };
  paint();
  setFund('FDA');
  document.dispatchEvent(new CustomEvent('sim:ready', {detail: PARAMS}));
  try{
    const f = await ipcaFocus();
    $('ipca').value = f.valor.toFixed(2);
    ipcaTxt = T.ipcaFocus(dec(f.valor), f.ano, dataBR(f.data));
    paint(); calc();
  }catch(e){ /* mantém a premissa de params.json */ }
}
boot();

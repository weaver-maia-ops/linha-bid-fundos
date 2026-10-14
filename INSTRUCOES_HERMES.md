# Instruções para o Hermes: site "Linha BID para os Fundos de Desenvolvimento Regional"

Este documento explica o que é o site, como publicar, como ele se mantém atualizado e como o simulador calcula a taxa. Leia tudo antes de publicar.

## 1. O que é

Página estática e independente da Weaver Advisory, voltada a investidores, que apresenta:

- a linha de US$ 500 milhões do BID para capitalizar o FDA (Sudam), o FDNE (Sudene) e o FDCO (Sudeco);
- quem faz o quê (superintendência, fundo, banco operador);
- as condições gerais de financiamento;
- o caminho de acesso (consulta prévia ao desembolso);
- um simulador de taxa, enquadramento e limites;
- os termos da simulação e o papel da Weaver.

Não fica dentro do Wix. É um site separado.

## 2. Arquivos

```
index.html                              página (HTML e CSS)
assets/sim.js                           lógica do simulador
assets/logo.png, assets/favicon.png     marca
data/params.json                        parâmetros do mês (TLP pré, CDR, IPCA de reserva)
data/municipios.json                    municípios e setores por fundo
scripts/atualizar_parametros.py         atualiza a TLP pré a partir da Sudam
.github/workflows/atualizar-parametros.yml   rotina mensal no GitHub Actions
tests/sudam_exemplo.html                resposta real da Sudam para testar o script
README.md                               resumo
INSTRUCOES_HERMES.md                    este documento
```

Não há build nem dependências. Todos os caminhos são relativos, então o site funciona em qualquer repositório, conta ou domínio.

Atenção: a pasta `.github` começa com ponto e pode ficar oculta no computador. Ela precisa ir para o repositório, senão a atualização automática não roda.

## 3. Publicação

O repositório e a conta do GitHub ficam a seu critério (não precisa ser a conta pessoal do Aureo).

1. Criar um repositório **público** (GitHub Pages gratuito exige repositório público).
2. Enviar todos os arquivos mantendo as pastas, inclusive `.github/workflows/`. Pelo git: `git add -A && git commit && git push`. Pelo navegador, o upload de pastas ocultas pode falhar; nesse caso crie o arquivo do workflow pelo botão "Add file > Create new file" com o caminho `.github/workflows/atualizar-parametros.yml` e cole o conteúdo.
3. Settings > Pages: Source "Deploy from a branch", branch `main`, pasta `/ (root)`.
4. Settings > Actions > General > Workflow permissions: marcar **Read and write permissions** (o workflow precisa gravar o `params.json` e abrir issues).
5. Aba Actions: habilitar workflows se o GitHub pedir. Rodar uma vez manualmente: "Atualizar parâmetros do simulador" > Run workflow. Deve terminar verde com "Sem mudança" ou com um commit.
6. Opcional: domínio próprio em Settings > Pages > Custom domain.

Teste depois de publicar (precisa ser pelo endereço publicado; abrir o index.html direto do disco não carrega os dados):

- o topo mostra "4,4% a 11,8%" (com os parâmetros de out/2026);
- o simulador abre em FDA, Pará, Barcarena, setor 2.2.1.4, com IPCA + 4,69%;
- trocando para Belém e setor 2.2.1.3, a taxa vira IPCA + 6,90%;
- o rodapé do simulador mostra "TLP pré de [mês]" e "Atualizado em [data]";
- no celular não há rolagem lateral.

## 4. Como a taxa é calculada

### 4.1 Regra legal

Resolução CMN nº 4.960/2021, art. 1º, § 7º, para operações contratadas a partir de 2/3/2018:

```
TFD = FAM × [1 + (CDR × FP × TLP_pré)]^(DU/252) − 1
```

- **FAM**: fator de atualização monetária pelo IPCA. É a parte pós-fixada. Por isso a taxa é expressa como "IPCA + x%".
- **TLP_pré**: taxa de juros prefixada da TLP do mês da contratação (divulgada pelo Banco Central no último dia útil do mês anterior). Fica travada no contrato.
- **CDR**: coeficiente de desequilíbrio regional, divulgado pelo IBGE até 31 de maio, válido para contratos de 1º/7 a 30/6 (Decreto nº 9.291/2018). Valores vigentes: Norte 0,68 (FDA), Nordeste 0,64 (FDNE), Centro-Oeste 1,00 (FDCO).
- **FP**: fator de programa, pelo tipo do projeto (Anexo III da Resolução):

| Tipo | Prioridade espacial | Infraestrutura | FP |
|---|---|---|---|
| A | sim | sim | 0,85 |
| B | sim | não | 1,05 |
| C | não | sim | 1,25 |
| D | não | não | 1,45 |

- **DU/252**: capitalização por dias úteis. Em base anual o expoente é 1, então a parte real anual é exatamente CDR × FP × TLP_pré.

### 4.2 O que o simulador faz

1. **Tipo do projeto**: o setor escolhido tem uma categoria (saneamento, infraestrutura, serviço público, estruturador ou outros). Saneamento e infraestrutura contam como "infraestrutura". A prioridade espacial vem do município. Com isso define A, B, C ou D.
2. **Taxa real**: `taxa = CDR × FP × TLP_pré`. Exemplo FDA, Barcarena (prioritária), transporte (infraestrutura), tipo A: 0,68 × 0,85 × 8,12% = 4,69%.
3. **Taxa nominal equivalente** (só informativa): `(1 + taxa) × (1 + IPCA projetado) − 1`.
4. **Faixa do topo da página**: mínimo = menor CDR × 0,85 × TLP; máximo = maior CDR × 1,45 × TLP. Em out/2026: 0,64 × 0,85 × 8,12% = 4,4% e 1,00 × 1,45 × 8,12% = 11,8%.
5. **Limite de participação do fundo** (Anexo II), em % do investimento total:

| Setor | Área prioritária | Demais áreas |
|---|---|---|
| Infraestrutura: saneamento e água | 80% | 70% |
| Infraestrutura (demais) | 60% | 50% |
| Serviço público | 60% | 50% |
| Estruturador | 55% | 45% |
| Outros setores | 50% | 40% |

   O valor financiado é o menor entre: esse percentual do investimento total, 90% do investimento fixo, 80% do investimento total e o valor pedido pelo usuário. Recursos próprios: mínimo de 20% do total.
6. **Prazo**: até 20 anos para infraestrutura e 12 anos para os demais, incluída a carência. Carência = tempo até operar + até 12 meses depois da entrada em operação.
7. **Parcelas** (usadas nos indicadores "1ª parcela" e "total pago"): pagamentos semestrais, taxa semestral `(1 + taxa)^(1/2) − 1`, juros capitalizados durante a carência, SAC ou Price. Valores em reais de hoje (sem inflação). Liberação considerada em parcela única na contratação.

### 4.3 Validação contra o simulador oficial da Sudam (13/10/2026)

| Caso | Tipo | Sudam | Nosso cálculo |
|---|---|---|---|
| Belém/PA, setor 2.2.1.3 | C | IPCA + 6,902% | 0,68 × 1,25 × 8,12% = 6,902% |
| Belém/PA, setor 2.2.2.1 | D | IPCA + 8,0063% | 0,68 × 1,45 × 8,12% = 8,006% |
| Afuá/PA, setor 2.2.1.2 | A | IPCA + 4,6934% | 0,68 × 0,85 × 8,12% = 4,693% |
| Afuá/PA, setor 2.2.2.1 | B | IPCA + 5,7977% | 0,68 × 1,05 × 8,12% = 5,798% |

## 5. Como os dados se atualizam

| Dado | Muda | Como atualiza |
|---|---|---|
| IPCA projetado | semanal | Automático no navegador, a cada visita: mediana do boletim Focus (API Olinda do Banco Central) para o ano seguinte. Se falhar, usa `ipca_proj_fallback` do params.json. |
| TLP pré | mensal | Automático pelo GitHub Actions (abaixo). |
| CDR do Norte (FDA) | anual (julho) | Automático pelo GitHub Actions, lido no simulador da Sudam. |
| CDR do Nordeste (FDNE) e do Centro-Oeste (FDCO) | anual (julho) | Manual. Quando o CDR do Norte muda, o workflow abre uma issue lembrando de atualizar estes dois. |
| Municípios e setores | anual (janeiro) | Manual, quando saírem as novas resoluções de prioridades. |

### 5.1 TLP pré automática

O workflow `atualizar-parametros.yml` roda do dia 1 ao 10 de cada mês, às 9h de Brasília, e pode ser disparado à mão. Ele executa `scripts/atualizar_parametros.py`, que:

1. envia ao simulador oficial da Sudam o caso de referência Belém/PA + setor 2.2.1.3;
2. lê na resposta a taxa do BNDES (`IPCA + 9,7418%`) e a constante informada pela Sudam (`1,015`);
3. calcula `TLP_pré = (1 + taxa BNDES) / 1,015 − 1` (em out/2026: 1,097418 / 1,015 − 1 = 8,12%);
4. calcula o CDR do Norte: `taxa FDA / (1,25 × TLP)`, arredondado a duas casas (em out/2026: 6,902% / (1,25 × 8,12%) = 0,68);
5. valida faixas plausíveis (TLP entre 3% e 15%, CDR entre 0,5 e 1);
6. grava `tlp_pre.valor`, `tlp_pre.mes_ref`, `tlp_pre.fonte` e `atualizado_em` em `data/params.json`; se o CDR do Norte mudou, grava também `cdr.FDA` e `cdr.vigencia` e abre a issue "Simulador: CDR do Norte mudou, atualizar Nordeste"; depois faz o commit.

Se a Sudam estiver fora do ar ou mudar o layout, o workflow abre uma issue "Simulador: falha ao atualizar a TLP". Nesse caso, atualize à mão (seção 5.2).

Teste local do script sem internet: `python3 scripts/atualizar_parametros.py --html tests/sudam_exemplo.html --dry-run`.

Observação: o GitHub desativa workflows agendados em repositórios sem atividade por 60 dias. Como o workflow faz commit todo mês, isso não deve ocorrer. Se ocorrer, reative na aba Actions.

### 5.2 Atualização manual (se a automática falhar)

Editar `data/params.json`:

- `tlp_pre.valor`: taxa prefixada da TLP do mês, em % (ex.: 8.12). Fontes: comunicado mensal do Banco Central sobre a TLP, página "Taxa de Longo Prazo (TLP)" do BNDES, ou a taxa do BNDES no simulador da Sudam dividida como no item 5.1.
- `tlp_pre.mes_ref`: `AAAA-MM`.
- `atualizado_em`: `AAAA-MM-DD`.

### 5.3 CDR (todo julho)

O CDR do Norte se atualiza sozinho quando a Sudam passa a usar o novo valor. Ao receber a issue "CDR do Norte mudou", ver a divulgação do IBGE (fim de maio), atualizar `cdr.FDNE` (Nordeste) e conferir `cdr.FDCO` (Centro-Oeste, normalmente 1.00). Conferir também se o novo `cdr.FDA` bate com o IBGE; se não bater, corrigir à mão. Depois fechar a issue.

### 5.4 Municípios (todo janeiro)

`data/municipios.json` tem:

- `FDA`: por UF, lista `[nome, prioridade]`, onde 1 = área prioritária, 0 = demais áreas, `null` = a confirmar. Extraído do simulador oficial da Sudam em 13/10/2026 (53 municípios em demais áreas, a maioria em MT, mais Belém e Palmas). Os 19 `null` são nomes com apóstrofo, que o simulador da Sudam lê errado, e 4 municípios que não constam na lista da Sudam.
- `FDA_SETORES`: setores prioritários do FDA (Res. Condel/Sudam nº 134/2025), com a categoria usada no enquadramento.
- `NE` e `CO`: municípios do Nordeste e do Centro-Oeste, `[nome, capital]`. A prioridade espacial do FDNE e do FDCO é escolhida pelo usuário, com sugestão automática (FDNE: prioritária fora das capitais; FDCO: demais áreas, conservador).

Quando saírem as novas resoluções de diretrizes e prioridades (Condel/Sudam, Condel/Sudene, Condel/Sudeco), avisar a Weaver para regenerar este arquivo.

## 6. Regras de conteúdo

- Português do Brasil. Público: investidores.
- Nenhum travessão (em dash ou en dash) em textos. Use vírgula, parênteses ou dois pontos.
- Não usar a palavra "crucial".
- Manter os termos da simulação e o parágrafo sobre o papel da Weaver: a Weaver é consultora do BID na preparação da operação, não é agente comissionado e não influencia análises nem decisões de crédito.
- Não publicar valores, prazos ou condições da linha BID que não estejam no anúncio oficial do BID ou nos documentos aprovados pela Weaver.

## 7. Antes de cada publicação

- `node --check assets/sim.js`
- `python3 -m json.tool data/params.json` e `python3 -m json.tool data/municipios.json`
- `python3 -c "import sys;t=open('index.html',encoding='utf-8').read()+open('assets/sim.js',encoding='utf-8').read();print('travessoes:',t.count(chr(8212))+t.count(chr(8211)))"` deve mostrar 0
- Abrir o endereço publicado e repetir o teste da seção 3.

## 8. Fontes

- BID, anúncio da operação: https://www.iadb.org/pt-br/noticias/bid-apoiara-investimentos-em-infraestrutura-nas-regioes-norte-nordeste-e-centro-oeste-do-brasil
- Resolução CMN nº 4.960/2021: https://www.bcb.gov.br/content/estabilidadefinanceira/especialnor/Resolu%C3%A7%C3%A3o4960.pdf
- Simulador FDA da Sudam: https://investimentos.sudam.gov.br/simulador-fda/
- Regulamento do FDA (Res. Condel/Sudam nº 82/2019) e Diretrizes FDA 2026 (Res. Condel/Sudam nº 134/2025)
- Banco do Nordeste, FDNE: https://www.bnb.gov.br/fdne
- Sudeco, FDCO: https://www.gov.br/sudeco/pt-br/assuntos/fundo-de-desenvolvimento-do-centro-oeste
- Decreto nº 9.291/2018 (CDR) e IBGE, CDR 2025 (divulgado em maio de 2026)
- Banco Central, boletim Focus (API Olinda)

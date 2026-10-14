#!/usr/bin/env python3
"""
Atualiza data/params.json com a TLP pré do mês.

Fonte: simulador oficial da Sudam (FDA, FNO e BNDES). A página da Sudam mostra
  - a taxa do BNDES:  IPCA + B%, onde (1 + B) = (1 + TLP) x K, com K = 1.015 (informado na própria página)
  - a taxa do FDA:    IPCA + F%, onde F = CDR_Norte x FP x TLP
Daqui saem a TLP pré e o CDR do Norte (ambos gravados automaticamente).

Uso:
  python3 scripts/atualizar_parametros.py              # busca na Sudam e grava data/params.json
  python3 scripts/atualizar_parametros.py --html x.html  # usa um HTML salvo (teste)
  python3 scripts/atualizar_parametros.py --dry-run    # mostra o resultado sem gravar

Saída: código 0 se gravou ou se não havia mudança; código 2 se falhou (o workflow abre uma issue).
Só usa a biblioteca padrão do Python.
"""
import argparse, datetime, html as htmlmod, json, os, re, sys, urllib.parse, urllib.request

URL = "https://investimentos.sudam.gov.br/investApps/calcFdaFnoBndes/"
# Caso de referência: Belém/PA (demais áreas) + setor 2.2.1.3 (infraestrutura) => projeto tipo C, FP = 1,25
FORM = {
    "localizacao": "Belém/PA",
    "setorEconomico": "2213",
    "investTotal": "100000000",
    "receitaBrutAnual": "100000000",
    "calcular": "calcular",
}
FP_TIPO_C = 1.25
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARAMS = os.path.join(ROOT, "data", "params.json")


def baixar_html():
    data = urllib.parse.urlencode(FORM).encode("utf-8")
    req = urllib.request.Request(URL, data=data, method="POST", headers={
        "User-Agent": "Mozilla/5.0 (atualizador de parametros; contato info@weaveradvisory.com)",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def texto(html):
    t = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", htmlmod.unescape(t))


def extrair(html):
    t = texto(html)
    def num(padrao, nome):
        m = re.search(padrao, t)
        if not m:
            raise ValueError(f"não encontrei {nome} na página da Sudam")
        return float(m.group(1))
    bndes = num(r"Taxa de Juros do BNDES\s*IPCA \+ ([\d.]+)%", "a taxa do BNDES") / 100
    fda = num(r"Taxa de Juros Estimada do FDA\s*IPCA \+ ([\d.]+)%", "a taxa do FDA") / 100
    k_m = re.search(r"constante igual a ([\d.]+)", t)
    k = float(k_m.group(1)) if k_m else 1.015
    tlp = (1 + bndes) / k - 1
    cdr_norte = fda / (FP_TIPO_C * tlp)
    data_m = re.search(r"Simulação realizada em (\d{2}/\d{2}/\d{4})", t)
    return {
        "tlp": round(tlp * 100, 2),
        "cdr_norte": round(cdr_norte, 2),
        "bndes": bndes, "fda": fda, "k": k,
        "data_sudam": data_m.group(1) if data_m else None,
    }


def validar(r, hoje=None, exigir_data_atual=False):
    erros = []
    if not (3.0 <= r["tlp"] <= 15.0):
        erros.append(f"TLP fora da faixa plausível: {r['tlp']}%")
    if not (0.5 <= r["cdr_norte"] <= 1.0):
        erros.append(f"CDR Norte implícito fora da faixa: {r['cdr_norte']}")
    if exigir_data_atual:
        if not r["data_sudam"]:
            erros.append("não encontrei a data da simulação da Sudam")
        else:
            data_sudam = datetime.datetime.strptime(r["data_sudam"], "%d/%m/%Y").date()
            if (data_sudam.year, data_sudam.month) != (hoje.year, hoje.month):
                erros.append(f"a simulação da Sudam é de {r['data_sudam']}, não do mês corrente")
    return erros


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", help="arquivo HTML salvo do simulador da Sudam (teste)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    try:
        html = open(a.html, encoding="utf-8").read() if a.html else baixar_html()
        r = extrair(html)
    except Exception as e:
        print(f"FALHA: {e}", file=sys.stderr)
        return 2

    hoje = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).date()
    # Em execução automática, não atualiza parâmetros a partir de uma resposta
    # velha ou datada em mês futuro. Fixtures locais preservam o teste histórico.
    erros = validar(r, hoje=hoje, exigir_data_atual=not bool(a.html))
    if erros:
        print("FALHA: " + "; ".join(erros), file=sys.stderr)
        return 2

    params = json.load(open(PARAMS, encoding="utf-8"))
    mes = hoje.strftime("%Y-%m")

    # CDR Norte: lido da Sudam e atualizado automaticamente quando muda (troca anual, a partir de 1º de julho)
    aviso = None
    cdr = params.setdefault("cdr", {})
    cdr_atual = cdr.get("FDA")
    cdr_mudou = cdr_atual is None or abs(r["cdr_norte"] - cdr_atual) > 0.005
    if cdr_mudou:
        ano_ini = hoje.year if hoje.month >= 7 else hoje.year - 1
        aviso = (f"O CDR do Norte (FDA) foi atualizado automaticamente de {cdr_atual} para {r['cdr_norte']}, "
                 f"conforme o simulador oficial da Sudam em {r['data_sudam'] or hoje.isoformat()}. "
                 "O IBGE divulga os três CDRs juntos: atualizar à mão em data/params.json o cdr.FDNE (Nordeste) "
                 "e conferir o cdr.FDCO (Centro-Oeste, normalmente 1.00) com a divulgação do IBGE de maio. "
                 "Se a mudança parecer errada, reverter o commit.")

    mudou = (params["tlp_pre"]["valor"] != r["tlp"]) or (params["tlp_pre"].get("mes_ref") != mes) or cdr_mudou
    print(json.dumps({"tlp_pre": r["tlp"], "cdr_norte_implicito": r["cdr_norte"],
                      "taxa_bndes": r["bndes"], "taxa_fda_belem_tipoC": r["fda"],
                      "constante_bndes": r["k"], "data_sudam": r["data_sudam"],
                      "mes_ref": mes, "mudou": mudou, "cdr_norte_mudou": cdr_mudou,
                      "aviso": aviso}, ensure_ascii=False, indent=2))

    if not mudou or a.dry_run:
        return 0

    if cdr_mudou:
        cdr["FDA"] = r["cdr_norte"]
        cdr["vigencia"] = f"1º/7/{ano_ini} a 30/6/{ano_ini + 1}"
        cdr["fonte"] = f"Norte implícito no simulador da Sudam ({r['data_sudam'] or hoje.isoformat()}); demais IBGE"
        with open(os.path.join(ROOT, "aviso_cdr.txt"), "w", encoding="utf-8") as f:
            f.write(aviso + "\n")

    params["tlp_pre"]["valor"] = r["tlp"]
    params["tlp_pre"]["mes_ref"] = mes
    params["tlp_pre"]["fonte"] = (f"Implícita no simulador oficial da Sudam em {r['data_sudam'] or hoje.isoformat()}: "
                                  f"(1 + taxa BNDES {r['bndes']*100:.4f}%) / {r['k']} - 1")
    params["atualizado_em"] = hoje.isoformat()
    with open(PARAMS, "w", encoding="utf-8") as f:
        json.dump(params, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("params.json atualizado")
    return 0


if __name__ == "__main__":
    sys.exit(main())

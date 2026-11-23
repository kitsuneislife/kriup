#!/usr/bin/env python3
"""Sync the Kriup Trello board with the files in this repository.

For every card in the "Entrega acadêmica" and "Diagramas" lists, uploads the
matching file as a real attachment (the per-item .docx from saida/secoes/ or
the diagram PNG), replacing an older upload with the same name, and trims the
description to its summary plus one GitHub link. With --board it also makes
the board public and sets docs/design/marca/trello-fundo.png as background.

Run `python3 docs/faculdade/gerar-docx.py` first so the .docx files are
current. Credentials come from ~/.config/trello/env (TRELLO_KEY and
TRELLO_TOKEN lines), never from the repository. Standard library only.

    python3 docs/faculdade/trello-sync.py [--board] [--dry-run]
"""

import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SECOES = RAIZ / "docs" / "faculdade" / "saida" / "secoes"
DIAGRAMAS = RAIZ / "docs" / "faculdade" / "img" / "diagramas"
FUNDO = RAIZ / "docs" / "design" / "marca" / "trello-fundo.png"
QUADRO = "eCZtlNHZ"
API = "https://api.trello.com/1"
LISTAS = ("Entrega acadêmica", "Diagramas")


def credenciais():
    env = Path.home() / ".config" / "trello" / "env"
    valores = dict(os.environ)
    if env.exists():
        for linha in env.read_text().splitlines():
            if "=" in linha and not linha.lstrip().startswith("#"):
                k, v = linha.split("=", 1)
                valores.setdefault(k.strip(), v.strip().strip("'\""))
    try:
        return valores["TRELLO_KEY"], valores["TRELLO_TOKEN"]
    except KeyError:
        sys.exit(f"Faltam TRELLO_KEY e TRELLO_TOKEN em {env}")


KEY, TOKEN = credenciais()


def chamar(metodo, caminho, params=None, arquivo=None):
    query = {"key": KEY, "token": TOKEN, **(params or {})}
    url = f"{API}{caminho}?{urllib.parse.urlencode(query)}"
    corpo, cabecalhos = None, {}
    if arquivo is not None:
        limite = uuid.uuid4().hex
        tipo = mimetypes.guess_type(arquivo.name)[0] or "application/octet-stream"
        corpo = (
            f'--{limite}\r\nContent-Disposition: form-data; name="file"; '
            f'filename="{arquivo.name}"\r\nContent-Type: {tipo}\r\n\r\n'
        ).encode() + arquivo.read_bytes() + f"\r\n--{limite}--\r\n".encode()
        cabecalhos["Content-Type"] = f"multipart/form-data; boundary={limite}"
    req = urllib.request.Request(url, data=corpo, method=metodo, headers=cabecalhos)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            texto = resp.read().decode()
    except urllib.error.HTTPError as erro:
        sys.exit(f"{metodo} {caminho}: HTTP {erro.code} {erro.read().decode()[:300]}")
    return json.loads(texto) if texto else None


def arquivo_do_cartao(nome):
    """Map a card title to its local file, or None when it has no file."""
    if m := re.match(r"Figura 2\.(\d+)\b", nome):
        return DIAGRAMAS / f"cap2-{int(m[1]):02d}.png"
    if m := re.match(r"(\d)\.(\d)\b", nome):
        achados = sorted(SECOES.glob(f"{m[1]}-{m[2]}-*.docx"))
    elif m := re.match(r"Apêndice ([A-Z])\b", nome):
        achados = sorted(SECOES.glob(f"apendice-{m[1].lower()}-*.docx"))
    else:
        return None
    return achados[0] if achados else None


def descricao_curta(desc):
    """Keep the summary and a single GitHub link to the source text."""
    if re.search(r"^GitHub: ", desc, re.M):
        return desc
    link = re.search(r"(?:Texto-fonte|Código Mermaid): (\S+)", desc)
    resumo = re.split(r"\n\n(?:Arquivo \(|Imagem: )", desc, maxsplit=1)[0].strip()
    return f"{resumo}\n\nGitHub: {link[1]}" if link else resumo


def sincronizar_cartoes(simular):
    listas = {l["id"]: l["name"] for l in chamar("GET", f"/boards/{QUADRO}/lists")}
    cartoes = chamar("GET", f"/boards/{QUADRO}/cards", {"fields": "name,desc,idList"})
    for cartao in cartoes:
        if listas.get(cartao["idList"]) not in LISTAS:
            continue
        arquivo = arquivo_do_cartao(cartao["name"])
        if arquivo is None or not arquivo.exists():
            print(f"sem arquivo: {cartao['name']}")
            continue
        nova = descricao_curta(cartao["desc"])
        print(f"{cartao['name']} <- {arquivo.name}")
        if simular:
            continue
        for anexo in chamar("GET", f"/cards/{cartao['id']}/attachments"):
            if anexo["isUpload"] and anexo["name"] == arquivo.name:
                chamar("DELETE", f"/cards/{cartao['id']}/attachments/{anexo['id']}")
        chamar("POST", f"/cards/{cartao['id']}/attachments", {"name": arquivo.name}, arquivo)
        if nova != cartao["desc"]:
            chamar("PUT", f"/cards/{cartao['id']}", {"desc": nova})


def configurar_quadro(simular):
    print(f"quadro: público, fundo {FUNDO.name}")
    if simular:
        return
    fundo = chamar("POST", "/members/me/boardBackgrounds", arquivo=FUNDO)
    chamar("PUT", f"/boards/{QUADRO}", {"prefs/background": fundo["id"]})
    chamar("PUT", f"/boards/{QUADRO}", {"prefs/permissionLevel": "public"})


def main():
    simular = "--dry-run" in sys.argv
    if "--board" in sys.argv:
        configurar_quadro(simular)
    sincronizar_cartoes(simular)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Gera o .docx da documentação a partir dos capítulos em Markdown.

Usa o pacote do modelo da faculdade (modelo/template-docs-startup.docx) e
mantém o cabeçalho, o logotipo e as margens dele. Só a biblioteca padrão.

Regras de formatação pedidas para o trabalho:
- corpo em Arial 11, justificado, espaçamento 1,5;
- títulos em negrito (Arial 11, sem cor);
- itálico só para destaques e legendas, com moderação.

Uso: python3 docs/faculdade/gerar-docx.py
Saída: docs/faculdade/saida/documentacao.docx

Os diagramas Mermaid entram como PNG de img/diagramas/cap2-NN.png, na ordem
em que aparecem no capítulo 2. Para refazê-los, renderize cada bloco com
@mermaid-js/mermaid-cli (mmdc -b white -s 3).
"""

import re
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

BASE = Path(__file__).resolve().parent
MODELO = BASE / "modelo" / "template-docs-startup.docx"
SAIDA = BASE / "saida" / "documentacao.docx"
CAPITULOS = [
    "01-introducao.md",
    "02-engenharia-e-modelagem.md",
    "03-ambiente-de-desenvolvimento.md",
    "04-apendices.md",
]

# Legendas dos 18 diagramas do capítulo 2, na ordem dos blocos mermaid.
LEGENDAS_DIAGRAMAS = [
    "Diagrama de contexto",
    "Diagrama de contêineres",
    "Camadas e regra de dependência",
    "Diagrama de implantação",
    "Casos de uso: visão geral",
    "Casos de uso do reembolso (inclusão e extensão)",
    "Diagrama de classes: modelo de domínio",
    "Diagrama de classes: portas e adaptadores",
    "Diagrama entidade-relacionamento",
    "Sequência: compra e liberação do acesso (UC-02)",
    "Sequência: reembolso fora da garantia com escalonamento",
    "Sequência: convite e aceite de coprodução (UC-08)",
    "Estados do pedido",
    "Estados do pedido de reembolso",
    "Estados de um valor no extrato",
    "Atividade: criação guiada (UC-01)",
    "Atividade: job diário (UC-13)",
    "Mapa de navegação",
]

LARGURA_TEXTO = 9026  # dxa: A4 (11906) menos margens de 1440 dos dois lados
EMU_POR_DXA = 635
MAX_LARGURA_EMU = LARGURA_TEXTO * EMU_POR_DXA
MAX_ALTURA_EMU = int(7.3 * 914400)
# Diagramas largos demais para retrato vão numa página em paisagem.
DIAGRAMAS_DEITADOS = {7, 9, 11, 18}
LARGURA_DEITADA = 16838 - 2 * 1440
ALTURA_DEITADA_EMU = int(4.8 * 914400)
DXA_POR_CARACTERE = 125  # média de um caractere em Arial 11, com folga

FONTE = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>'


# --------------------------------------------------------------- estilos


def estilo_par(sid, nome, ppr, rpr="", base="Corpo", proximo="Corpo"):
    return (
        f'<w:style w:type="paragraph" w:customStyle="1" w:styleId="{sid}">'
        f'<w:name w:val="{nome}"/><w:basedOn w:val="{base}"/>'
        f'<w:next w:val="{proximo}"/><w:qFormat/>'
        f"<w:pPr>{ppr}</w:pPr><w:rPr>{rpr}</w:rPr></w:style>"
    )


def titulo(n, antes, depois, extra=""):
    return (
        f'<w:style w:type="paragraph" w:styleId="Heading{n}">'
        f'<w:name w:val="heading {n}"/><w:basedOn w:val="Corpo"/>'
        f'<w:next w:val="Corpo"/><w:qFormat/>'
        f'<w:pPr><w:keepNext/><w:keepLines/>{extra}'
        f'<w:spacing w:before="{antes}" w:after="{depois}" w:line="360" w:lineRule="auto"/>'
        f'<w:jc w:val="left"/><w:outlineLvl w:val="{n - 1}"/></w:pPr>'
        f'<w:rPr>{FONTE}<w:b/><w:bCs/><w:color w:val="000000"/>'
        f'<w:sz w:val="22"/><w:szCs w:val="22"/>{"<w:caps/>" if n == 1 else ""}</w:rPr></w:style>'
    )


ESTILOS_NOVOS = "".join(
    [
        # Corpo: base de todo o texto do documento. O cabeçalho do modelo
        # continua no estilo Normal, sem mudança.
        '<w:style w:type="paragraph" w:customStyle="1" w:styleId="Corpo">'
        '<w:name w:val="Corpo"/><w:basedOn w:val="Normal"/><w:qFormat/>'
        '<w:pPr><w:spacing w:before="80" w:after="120" w:line="360" w:lineRule="auto"/>'
        '<w:ind w:left="0" w:right="0" w:firstLine="0"/><w:jc w:val="both"/></w:pPr>'
        f'<w:rPr>{FONTE}<w:color w:val="000000"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>',
        titulo(1, 0, 240, "<w:pageBreakBefore/>"),
        titulo(2, 240, 120),
        titulo(3, 200, 80),
        titulo(4, 160, 80),
        estilo_par(
            "Legenda",
            "Legenda",
            '<w:spacing w:before="60" w:after="240" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>',
        ),
        estilo_par(
            "Figura",
            "Figura",
            '<w:keepNext/><w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>',
            proximo="Legenda",
        ),
        estilo_par(
            "Lista",
            "Lista",
            '<w:spacing w:before="0" w:after="60" w:line="360" w:lineRule="auto"/>',
        ),
        estilo_par(
            "Citacao",
            "Citação",
            '<w:spacing w:before="120" w:after="200" w:line="360" w:lineRule="auto"/><w:ind w:left="1134" w:right="567"/>',
            "<w:i/><w:iCs/>",
        ),
        estilo_par(
            "Comando",
            "Comando",
            '<w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:left="720"/><w:jc w:val="left"/>',
        ),
        estilo_par(
            "TextoTabela",
            "Texto de tabela",
            '<w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>',
            proximo="TextoTabela",
        ),
        estilo_par(
            "TOC1",
            "toc 1",
            '<w:spacing w:before="120" w:after="0"/><w:jc w:val="left"/>',
            "<w:b/><w:bCs/>",
        ),
        estilo_par(
            "TOC2",
            "toc 2",
            '<w:spacing w:before="0" w:after="0"/><w:ind w:left="360"/><w:jc w:val="left"/>',
        ),
        estilo_par(
            "TOC3",
            "toc 3",
            '<w:spacing w:before="0" w:after="0"/><w:ind w:left="720"/><w:jc w:val="left"/>',
        ),
        estilo_par(
            "Capa",
            "Capa",
            '<w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>',
        ),
        '<w:style w:type="table" w:customStyle="1" w:styleId="Tabela">'
        '<w:name w:val="Tabela"/><w:basedOn w:val="TableNormal"/>'
        "<w:tblPr><w:tblBorders>"
        + "".join(
            f'<w:{b} w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>'
            for b in ("top", "left", "bottom", "right", "insideH", "insideV")
        )
        + '</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
        '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>',
    ]
)


def montar_estilos(original):
    # Troca os títulos do modelo (Times New Roman azul) pelos do trabalho.
    sem_titulos = re.sub(
        r'<w:style w:type="paragraph" w:styleId="Heading[1-4]">.*?</w:style>',
        "",
        original,
        flags=re.S,
    )
    return sem_titulos.replace("</w:styles>", ESTILOS_NOVOS + "</w:styles>")


# ------------------------------------------------------------- numeração


def montar_numeracao(listas_numeradas):
    w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    marcador = (
        '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>'
        '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>'
        '<w:lvlText w:val="•"/><w:lvlJc w:val="left"/>'
        '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>'
        f"<w:rPr>{FONTE}</w:rPr></w:lvl></w:abstractNum>"
    )
    decimal = (
        '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>'
        '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/>'
        '<w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>'
        '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>'
        f"<w:rPr>{FONTE}</w:rPr></w:lvl></w:abstractNum>"
    )
    nums = '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
    # Cada lista numerada recomeça em 1.
    for num_id in listas_numeradas:
        nums += (
            f'<w:num w:numId="{num_id}"><w:abstractNumId w:val="1"/>'
            '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:numbering xmlns:w="{w}">{marcador}{decimal}{nums}</w:numbering>'
    )


# ---------------------------------------------------------- texto inline

TOKEN = re.compile(
    r"(\*\*.+?\*\*"  # negrito
    r"|`[^`]+`"  # código: vira texto comum
    r"|\[[^\]]+\]\([^)]+\)"  # link
    r"|(?<![\w*])\*(?!\s)[^*]+?\*(?![\w*]))"  # itálico
)
PLACEHOLDER = re.compile(r"(\{\{[A-Z_]+\}\})")


def run(texto, negrito=False, italico=False):
    if not texto:
        return ""
    partes = []
    for pedaco in PLACEHOLDER.split(texto):
        if not pedaco:
            continue
        rpr = FONTE
        if negrito:
            rpr += "<w:b/><w:bCs/>"
        if italico:
            rpr += "<w:i/><w:iCs/>"
        if PLACEHOLDER.fullmatch(pedaco):
            # Placeholder ainda a preencher: marcado em amarelo para achar fácil.
            rpr += '<w:highlight w:val="yellow"/>'
        partes.append(
            f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{escape(pedaco)}</w:t></w:r>'
        )
    return "".join(partes)


def inline(texto, negrito=False, italico=False):
    saida = []
    pos = 0
    for m in TOKEN.finditer(texto):
        saida.append(run(texto[pos : m.start()], negrito, italico))
        t = m.group(0)
        if t.startswith("**"):
            saida.append(inline(t[2:-2], True, italico))
        elif t.startswith("`"):
            saida.append(run(t[1:-1], negrito, italico))
        elif t.startswith("["):
            rotulo, url = re.match(r"\[([^\]]+)\]\(([^)]+)\)", t).groups()
            saida.append(inline(rotulo, negrito, italico))
            saida.append(run(f" ({url})", negrito, italico))
        else:
            saida.append(inline(t[1:-1], negrito, True))
        pos = m.end()
    saida.append(run(texto[pos:], negrito, italico))
    return "".join(saida)


def par(conteudo_xml, estilo="Corpo", ppr_extra=""):
    # Endereço longo justificado abre buracos entre as palavras da linha.
    if "http" in conteudo_xml and estilo in ("Corpo", "Lista"):
        ppr_extra += '<w:jc w:val="left"/>'
    return f'<w:p><w:pPr><w:pStyle w:val="{estilo}"/>{ppr_extra}</w:pPr>{conteudo_xml}</w:p>'


# --------------------------------------------------------------- imagens


class Imagens:
    def __init__(self):
        self.itens = []  # (rId, nome no pacote, caminho de origem)

    def adicionar(self, caminho):
        n = len(self.itens) + 1
        rid = f"rIdImg{n}"
        nome = f"figura{n:03d}{caminho.suffix.lower()}"
        self.itens.append((rid, nome, caminho))
        return rid, n


def tamanho_png(caminho):
    with open(caminho, "rb") as f:
        cabecalho = f.read(24)
    if cabecalho[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"não é PNG: {caminho}")
    return struct.unpack(">II", cabecalho[16:24])


def par_secao(secao, deitada):
    """Parágrafo que fecha uma seção (retrato ou paisagem) com o mesmo cabeçalho."""
    s = re.sub(r"<w:pgNumType[^>]*/>", "", secao)
    if deitada:
        s = re.sub(
            r"<w:pgSz [^>]*/>", '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>', s
        )
    return f"<w:p><w:pPr>{s}</w:pPr></w:p>"


def figura(caminho, imagens, descricao, max_largura=MAX_LARGURA_EMU, max_altura=MAX_ALTURA_EMU):
    if not caminho.exists():
        raise FileNotFoundError(caminho)
    largura_px, altura_px = tamanho_png(caminho)
    escala = min(max_largura / largura_px, max_altura / altura_px)
    # Capturas de tela não passam de 96 dpi; diagramas vêm em escala 3.
    if "telas" in caminho.parts:
        escala = min(escala, 914400 / 96 * 0.75)
    cx, cy = int(largura_px * escala), int(altura_px * escala)
    rid, n = imagens.adicionar(caminho)
    desc = escape(descricao, {'"': "&quot;"})
    desenho = (
        '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:docPr id="{100 + n}" name="Figura {n}" descr="{desc}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:pic><pic:nvPicPr><pic:cNvPr id="{100 + n}" name="figura{n}.png" descr="{desc}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
        "</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"
    )
    return par(desenho, "Figura")


def legenda(texto):
    m = re.match(r"(Figura [\w.]+):\s*(.*)", texto)
    if m:
        return par(run(m.group(1) + ": ") + inline(m.group(2)), "Legenda")
    return par(inline(texto), "Legenda")


# ---------------------------------------------------------------- tabelas


def celulas(linha):
    return [c.strip() for c in linha.strip().strip("|").split("|")]


def tabela(linhas):
    cabecalho = celulas(linhas[0])
    corpo = [celulas(l) for l in linhas[2:]]
    ncol = len(cabecalho)
    corpo = [(r + [""] * ncol)[:ncol] for r in corpo]
    # Cada coluna ganha no mínimo a largura da sua palavra mais longa (para
    # não quebrar palavra no meio); o que sobra vai proporcional ao texto.
    def limpo(t):
        return re.sub(r"[*`]|\[([^\]]+)\]\([^)]+\)", r"\1", t)

    minimos, pesos = [], []
    for i in range(ncol):
        textos = [limpo(r[i]) for r in [cabecalho] + corpo]
        palavra = max((len(p) for t in textos for p in t.split()), default=1)
        minimos.append(palavra * DXA_POR_CARACTERE + 260)
        pesos.append(min(max(max(len(t) for t in textos), 4), 80))
    sobra = LARGURA_TEXTO - sum(minimos)
    if sobra > 0:
        larguras = [m + int(sobra * p / sum(pesos)) for m, p in zip(minimos, pesos)]
    else:
        larguras = [int(LARGURA_TEXTO * m / sum(minimos)) for m in minimos]
    larguras[-1] += LARGURA_TEXTO - sum(larguras)

    def celula(texto, largura, cab):
        sombra = '<w:shd w:val="clear" w:color="auto" w:fill="EDEDED"/>' if cab else ""
        conteudo = inline(texto, negrito=cab) if texto else ""
        return (
            f'<w:tc><w:tcPr><w:tcW w:w="{largura}" w:type="dxa"/>{sombra}</w:tcPr>'
            f"{par(conteudo, 'TextoTabela')}</w:tc>"
        )

    xml = (
        '<w:tbl><w:tblPr><w:tblStyle w:val="Tabela"/>'
        f'<w:tblW w:w="{LARGURA_TEXTO}" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        "</w:tblPr><w:tblGrid>"
        + "".join(f'<w:gridCol w:w="{l}"/>' for l in larguras)
        + "</w:tblGrid>"
    )
    xml += (
        '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>'
        + "".join(celula(c, l, True) for c, l in zip(cabecalho, larguras))
        + "</w:tr>"
    )
    for r in corpo:
        xml += (
            "<w:tr><w:trPr><w:cantSplit/></w:trPr>"
            + "".join(celula(c, l, False) for c, l in zip(r, larguras))
            + "</w:tr>"
        )
    xml += "</w:tbl>"
    # Um respiro depois da tabela.
    return xml + par("", "Corpo", '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>')


# ------------------------------------------------------------- conversão


class Conversor:
    def __init__(self):
        self.imagens = Imagens()
        self.listas_numeradas = []
        self.titulos = []  # (nível, texto) para o sumário
        self.diagrama = 0
        self.marcadores = 0

    def num_lista_nova(self):
        num_id = len(self.listas_numeradas) + 2
        self.listas_numeradas.append(num_id)
        return num_id

    def converter(self, md):
        md = re.sub(r"[ \t]*\[(measured|inferred|unverified)\]", "", md)
        linhas = md.split("\n")
        saida = []
        i = 0
        num_atual = None
        while i < len(linhas):
            linha = linhas[i]
            s = linha.strip()

            if s and not re.match(r"\d+\.\s", s):
                num_atual = None

            if not s:
                i += 1
                continue

            # Bloco de citação: o "Summary" é nota interna e fica de fora.
            if s.startswith(">"):
                bloco = []
                while i < len(linhas) and linhas[i].strip().startswith(">"):
                    bloco.append(linhas[i].strip()[1:].strip())
                    i += 1
                texto = " ".join(bloco)
                if not texto.startswith("**Summary.**"):
                    saida.append(par(inline(texto), "Citacao"))
                continue

            # Bloco de código.
            if s.startswith("```"):
                lingua = s[3:].strip()
                i += 1
                corpo = []
                while not linhas[i].strip().startswith("```"):
                    corpo.append(linhas[i])
                    i += 1
                i += 1
                if lingua == "mermaid":
                    self.diagrama += 1
                    caminho = BASE / "img" / "diagramas" / f"cap2-{self.diagrama:02d}.png"
                    texto_legenda = LEGENDAS_DIAGRAMAS[self.diagrama - 1]
                    texto_figura = f"Figura 2.{self.diagrama}: {texto_legenda}."
                    if self.diagrama in DIAGRAMAS_DEITADOS:
                        # Diagrama largo: página própria em paisagem para dar
                        # para ler. A seção retrato anterior fecha antes dela.
                        saida.append(par_secao(self.secao, deitada=False))
                        saida.append(
                            figura(caminho, self.imagens, texto_legenda, LARGURA_DEITADA * EMU_POR_DXA, ALTURA_DEITADA_EMU)
                        )
                        saida.append(legenda(texto_figura))
                        saida.append(par_secao(self.secao, deitada=True))
                        continue
                    # O parágrafo que apresenta o diagrama fica na mesma página dele.
                    if saida and saida[-1].startswith('<w:p><w:pPr><w:pStyle w:val="Corpo"/>'):
                        saida[-1] = saida[-1].replace(
                            '<w:pStyle w:val="Corpo"/>', '<w:pStyle w:val="Corpo"/><w:keepNext/>', 1
                        )
                    saida.append(figura(caminho, self.imagens, texto_legenda))
                    saida.append(legenda(texto_figura))
                else:
                    for k, c in enumerate(corpo):
                        extra = ""
                        if k == 0:
                            extra += '<w:spacing w:before="120" w:after="0" w:line="276" w:lineRule="auto"/>'
                        if k == len(corpo) - 1:
                            extra = '<w:spacing w:before="0" w:after="200" w:line="276" w:lineRule="auto"/>'
                        saida.append(par(run(c), "Comando", extra))
                continue

            # Título.
            m = re.match(r"(#{1,4})\s+(.*)", s)
            if m:
                nivel = len(m.group(1))
                texto = m.group(2).strip()
                self.titulos.append((nivel, texto))
                self.marcadores += 1
                marca = f"_Toc{self.marcadores:04d}"
                conteudo = (
                    f'<w:bookmarkStart w:id="{self.marcadores}" w:name="{marca}"/>'
                    + run(texto)
                    + f'<w:bookmarkEnd w:id="{self.marcadores}"/>'
                )
                saida.append(par(conteudo, f"Heading{nivel}"))
                i += 1
                continue

            # Tabela.
            if s.startswith("|"):
                bloco = []
                while i < len(linhas) and linhas[i].strip().startswith("|"):
                    bloco.append(linhas[i])
                    i += 1
                saida.append(tabela(bloco))
                continue

            # Imagem com a legenda na linha seguinte.
            m = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", s)
            if m:
                alt, caminho = m.groups()
                saida.append(figura(BASE / caminho, self.imagens, alt))
                i += 1
                if i < len(linhas) and re.match(r"\*Figura .*\*$", linhas[i].strip()):
                    saida.append(legenda(linhas[i].strip()[1:-1]))
                    i += 1
                continue

            # Lista com marcador.
            if s.startswith("- "):
                saida.append(
                    par(inline(s[2:]), "Lista", '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')
                )
                i += 1
                continue

            # Lista numerada.
            m = re.match(r"\d+\.\s+(.*)", s)
            if m:
                if num_atual is None:
                    num_atual = self.num_lista_nova()
                saida.append(
                    par(
                        inline(m.group(1)),
                        "Lista",
                        f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_atual}"/></w:numPr>',
                    )
                )
                i += 1
                continue

            # Parágrafo: junta linhas seguidas.
            bloco = [s]
            i += 1
            while i < len(linhas):
                prox = linhas[i].strip()
                if not prox or re.match(r"(#|\||>|```|- |\d+\.\s|!\[)", prox):
                    break
                bloco.append(prox)
                i += 1
            saida.append(par(inline(" ".join(bloco))))
        return "".join(saida)


def capa(imagens):
    vazio = par("", "Capa")
    logo = BASE.parent / "design" / "marca" / "kriup-logo.png"
    return (
        vazio * 6
        + par(run("DOCUMENTAÇÃO DO PROJETO", negrito=True), "Capa")
        + vazio
        + figura(logo, imagens, "Logo do Kriup", int(2.6 * 914400), int(1.4 * 914400))
        + vazio
        + par(run("Plataforma de venda de produtos digitais para quem não tem time técnico"), "Capa")
        + vazio * 7
        + par(run("Cascavel"), "Capa")
        + par(run("23 de novembro de 2026"), "Capa")
    )


def sumario(titulos):
    # Campo TOC do Word com as entradas já preenchidas (sem página).
    # No Word: clique com o botão direito > Atualizar campo para numerar.
    xml = par(run("SUMÁRIO", negrito=True), "Capa", "<w:pageBreakBefore/>")
    entradas = [(n, t) for n, t in titulos if n <= 2]
    for k, (nivel, texto) in enumerate(entradas):
        inicio = ""
        if k == 0:
            inicio = (
                '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
                '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r>'
                '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
            )
        fim = '<w:r><w:fldChar w:fldCharType="end"/></w:r>' if k == len(entradas) - 1 else ""
        xml += par(inicio + run(texto.upper() if nivel == 1 else texto) + fim, f"TOC{nivel}")
    return xml


def main():
    with zipfile.ZipFile(MODELO) as z:
        pacote = {n: z.read(n) for n in z.namelist() if not n.endswith("/")}

    documento = pacote["word/document.xml"].decode("utf-8")
    raiz = documento[: documento.index("<w:body>")]
    secao = re.search(r"<w:sectPr>.*?</w:sectPr>", documento, re.S).group(0)
    if "w:gutter=" not in secao:  # o esquema exige o atributo; o modelo não traz
        secao = secao.replace("<w:pgMar ", '<w:pgMar w:gutter="0" ')

    conv = Conversor()
    conv.secao = secao
    corpo = "".join(conv.converter((BASE / c).read_text(encoding="utf-8")) for c in CAPITULOS)
    if conv.diagrama != len(LEGENDAS_DIAGRAMAS):
        raise SystemExit(f"{conv.diagrama} diagramas no texto, {len(LEGENDAS_DIAGRAMAS)} legendas no script")

    pacote["word/document.xml"] = (
        raiz + "<w:body>" + capa(conv.imagens) + sumario(conv.titulos) + corpo + secao + "</w:body></w:document>"
    ).encode("utf-8")
    pacote["word/styles.xml"] = montar_estilos(pacote["word/styles.xml"].decode("utf-8")).encode("utf-8")
    pacote["word/numbering.xml"] = montar_numeracao(conv.listas_numeradas).encode("utf-8")

    rels = pacote["word/_rels/document.xml.rels"].decode("utf-8")
    tipo = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    novas = "".join(
        f'<Relationship Id="{rid}" Type="{tipo}" Target="media/{nome}"/>' for rid, nome, _ in conv.imagens.itens
    )
    pacote["word/_rels/document.xml.rels"] = rels.replace("</Relationships>", novas + "</Relationships>").encode(
        "utf-8"
    )
    for _, nome, origem in conv.imagens.itens:
        pacote[f"word/media/{nome}"] = origem.read_bytes()

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    ordem = ["[Content_Types].xml"] + sorted(n for n in pacote if n != "[Content_Types].xml")
    with zipfile.ZipFile(SAIDA, "w", zipfile.ZIP_DEFLATED) as z:
        for nome in ordem:
            z.writestr(nome, pacote[nome])
    print(f"{SAIDA.relative_to(BASE.parent.parent)}: {len(conv.imagens.itens)} figuras, {len(conv.titulos)} títulos")


if __name__ == "__main__":
    main()

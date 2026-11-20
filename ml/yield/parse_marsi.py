import re
import itertools

AREA_MAP = {"LAPPI": "Lappi", "OULU": "Oulu-Kainuu", "ITÄ": "Ita-Suomi", "LÄNSI": "Lansi-Suomi", "KOKO": "Koko maa"}
BERRY_MAP = {"Mustikka": "bilberry", "Puolukka": "lingonberry", "Lakka": "cloudberry"}


def area_of(s):
    s = (s or "").upper()
    for k, v in AREA_MAP.items():
        if s.strip().startswith(k):
            return v
    return None


def num(s):
    """'5 511 730' -> 5511730.0 ; '1 038,0' -> 1038.0 ; '...' -> None"""
    if s is None:
        return None
    s = s.strip().replace(" ", " ")
    if not s or set(s) <= set(".…- "):
        return None
    s = s.replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_table_rows(rows, report_year):
    """rows: list of cell lists from pdfplumber. Returns list of dicts (block index, area, berry, total_kg)."""
    out, area, block, seen = [], None, 0, set()
    for cells in rows:
        cells = [(c or "").replace("\n", " ").strip() for c in cells]
        if len(cells) < 9:
            continue
        a = area_of(cells[0])
        if a:
            if a in seen:            # same area again -> previous-year block starts
                block += 1
                seen = set()
            seen.add(a)
            area = a
        berry = BERRY_MAP.get(cells[1])
        if not area or not berry:
            continue
        raw = cells[8]
        v = num(raw)
        if v is None:
            continue
        thousands = ("," in raw) or report_year >= 2021
        out.append({"block": block, "area": area, "berry": berry,
                    "total_kg": v * 1000 if thousands else v, "raw": raw})
    return out


def split_kg_eur(tokens, price):
    """tokens like ['1','932','633','2','862','950'] -> pick split where kg*price ~= eur."""
    best = None
    for i in range(1, len(tokens)):
        kg_t, eur_t = tokens[:i], tokens[i:]
        if any(len(t) != 3 for t in kg_t[1:]) or any(len(t) != 3 for t in eur_t[1:]):
            continue
        kg, eur = float("".join(kg_t)), float("".join(eur_t))
        if kg <= 0:
            continue
        err = abs(kg * price - eur) / max(eur, 1)
        if best is None or err < best[0]:
            best = (err, kg, eur)
    return best


def parse_text_line(line):
    """'ITÄ-SUOMI Mustikka 58 946 208 055 3,53 1 551 635 2 228 318 1,44 1 610 581 2 436 373 1,51'"""
    m = re.match(r"^\s*(\S.*?)?\s*(Mustikka|Puolukka|Lakka)\s+(.*)$", line)
    if not m:
        return None
    toks = m.group(3).split()
    prices = [i for i, t in enumerate(toks) if re.fullmatch(r"\d+,\d+", t)]
    if len(prices) < 1:
        return None
    last = prices[-1]
    prev = prices[-2] if len(prices) >= 2 else -1
    group = toks[prev + 1:last]
    group = [t for t in group if re.fullmatch(r"\d+", t)]
    best = split_kg_eur(group, float(toks[last].replace(",", ".")))
    if not best or best[0] > 0.05:
        return None
    return {"area": area_of(m.group(1) or ""), "berry": BERRY_MAP[m.group(2)], "total_kg": best[1]}


if __name__ == "__main__":
    # tests from the real log
    print(parse_text_line("ITÄ-SUOMI Mustikka 58 946 208 055 3,53 1 551 635 2 228 318 1,44 1 610 581 2 436 373 1,51"))
    print(parse_text_line("LAPPI Mustikka 400 800 2,00 1 932 233 2 862 150 1,48 1 932 633 2 862 950 1,48"))
    print(parse_text_line("KOKO MAA Mustikka 108 209 450 492 4,16 5 758 119 9 584 041 1,66 5 866 328 10 034 534 1,71"))
    print(parse_text_line("Puolukka 1 234 5 678 4,60 100 200 150 300 1,50 101 434 155 978 1,54"))
    rows = [["LAPPI", "Mustikka", "...", "...", "...", "1 976", "2,64", "1,34", "1 977", "2,65", "1,34"],
            ["", "Puolukka", "...", "...", "...", "10", "0,01", "1,0", "10", "0,01", "1,0"],
            ["OULU+KAINUU", "Mustikka", "7,8", "0,033", "4,24", "761", "1,02", "1,34", "768", "1,05", "1,36"],
            ["KOKO MAA", "Mustikka", "54,3", "0,244", "", "3 963", "5,38", "1,36", "4 018", "5,62", "1,40"],
            ["LAPPI", "Mustikka", "...", "...", "...", "2 992", "3,95", "1,32", "2 993", "3,95", "1,32"]]
    for r in parse_table_rows(rows, 2023):
        print(r)
    rows16 = [["KOKO MAA", "Mustikka", "130 970", "427 740", "3,27", "5 380 750", "6 034 490", "1,12", "5 511 730", "6 462 230", "1,17"]]
    print(parse_table_rows(rows16, 2016))
    rows17 = [["LAPPI", "Mustikka", "0,0", "0,0", "0,00", "1 038,0", "1 868,1", "1,80", "1 038,0", "1 868,1", "1,80"]]
    print(parse_table_rows(rows17, 2017))

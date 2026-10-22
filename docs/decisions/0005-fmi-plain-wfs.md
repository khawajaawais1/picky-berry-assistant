# ADR 0005 – FMI weather via plain WFS + requests, not fmiopendata

* **Status:** accepted · **Date:** 2026-10-22 · **Deciders:** Awais · **Feature(s):** 6.2, 6.6

## Context
The architecture doc names `fmiopendata`. Its 0.5.0 sdist fails to build on current
setuptools / Python 3.12+.

## Decision
A ~150-line client in `data/src/picky_data/weather/fmi.py` using the stored queries
`fmi::ef::stations` and `fmi::observations::weather::daily::simple`, cached per month.

## Consequences
No extra dependency; parsing is unit-tested with recorded XML. If FMI changes its XML we fix
one module.

#!/usr/bin/env bash
# Scans the staged changes for secrets before a commit is created (SECURITY.md §9).
#
# CI runs the same gitleaks and `.gitleaks.toml` over every commit. This is the earlier
# chance: a key stopped here never enters the history, where removing it means a rewrite and
# a rotation. Only the index is read, so the hook stays fast enough to run on every commit.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

version="8.30.1"

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c - >/dev/null
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c - >/dev/null
  else
    echo "pre-commit: neither sha256sum nor shasum is available; refusing to run an unverified binary." >&2
    return 1
  fi
}

gitleaks_bin=""
if command -v gitleaks >/dev/null 2>&1; then
  # A developer's own install wins: it is their tool, and `--staged` requires 8.19 or later.
  gitleaks_bin="$(command -v gitleaks)"
else
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)
      asset="darwin_arm64"
      checksum="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"
      ;;
    Darwin-x86_64)
      asset="darwin_x64"
      checksum="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709"
      ;;
    Linux-x86_64)
      asset="linux_x64"
      checksum="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
      ;;
    Linux-aarch64 | Linux-arm64)
      asset="linux_arm64"
      checksum="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080"
      ;;
    *)
      echo "pre-commit: gitleaks is not installed and this platform has no pinned build here." >&2
      echo "Install gitleaks $version from https://github.com/gitleaks/gitleaks/releases and commit again." >&2
      exit 1
      ;;
  esac

  # The cache lives inside the package it belongs to, so it is git-ignored and is removed by
  # the same `npm ci` that would otherwise leave a stale scanner behind.
  cache_dir="$repo_root/app/node_modules/.cache/gitleaks/$version"
  gitleaks_bin="$cache_dir/gitleaks"

  if [ ! -x "$gitleaks_bin" ]; then
    if [ ! -d "$repo_root/app/node_modules" ]; then
      echo "pre-commit: app/node_modules is missing; run 'npm install' in app/ first." >&2
      exit 1
    fi

    mkdir -p "$cache_dir"
    archive="$(mktemp "${TMPDIR:-/tmp}/gitleaks-archive.XXXXXX")"
    trap 'rm -f "$archive"' EXIT
    echo "pre-commit: fetching gitleaks $version ($asset) once..."

    if ! curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v$version/gitleaks_${version}_${asset}.tar.gz" -o "$archive"; then
      echo "pre-commit: could not download gitleaks; refusing to commit unscanned." >&2
      exit 1
    fi

    if ! printf '%s  %s\n' "$checksum" "$archive" | sha256; then
      echo "pre-commit: gitleaks failed its checksum; refusing to run it." >&2
      exit 1
    fi

    tar -xzf "$archive" -C "$cache_dir" gitleaks
    chmod +x "$gitleaks_bin"
  fi
fi

if ! "$gitleaks_bin" git . --pre-commit --staged --config .gitleaks.toml --redact --verbose; then
  echo "" >&2
  echo "pre-commit: the staged secret scan failed, so the commit was stopped." >&2
  echo "If a secret was reported above, remove it and rotate it before staging the fix." >&2
  echo "Do not commit around this hook: CI scans the same history again (secrets.yml)." >&2
  exit 1
fi

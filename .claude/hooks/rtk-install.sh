#!/bin/sh
# SessionStart -> install RTK and register it GLOBALLY (~/.claude).
#
# RTK (https://github.com/rtk-ai/rtk) filters command output before it reaches
# the model, cutting bash output substantially on common dev commands.
#
# Why this lives in the repo: Claude Code on the web provisions a fresh
# container per session and reclaims it at teardown, so ~/.claude and any
# binary installed into it do not survive. Git is the only durable surface, so
# the repo re-establishes the global install each session. The install itself
# is global (`rtk init -g`), not project-scoped: it applies to every project
# opened in the session, not just this one.
#
# Scope guard: web/remote sessions only. On a local machine this exits at once,
# so a `git clone` of this public repo never downloads a binary onto someone's
# laptop. Install RTK yourself there: `brew install rtk && rtk init -g`.
#
# Always exits 0. A failed install degrades to "commands run unfiltered",
# never to a broken session.

RTK_VERSION="v0.42.4"
RTK_REPO="rtk-ai/rtk"
INSTALL_DIR="${HOME}/.local/bin"

# Local machine, or a bare clone outside Claude Code: do nothing.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

install_rtk() {
  # Resolve the release asset for this platform. Anything unrecognised is a
  # silent no-op rather than a guess at the wrong binary.
  case "$(uname -s)" in
    Linux)
      case "$(uname -m)" in
        x86_64|amd64)  target="x86_64-unknown-linux-musl" ;;
        aarch64|arm64) target="aarch64-unknown-linux-gnu" ;;
        *) return 1 ;;
      esac ;;
    Darwin)
      case "$(uname -m)" in
        x86_64)       target="x86_64-apple-darwin" ;;
        arm64)        target="aarch64-apple-darwin" ;;
        *) return 1 ;;
      esac ;;
    *) return 1 ;;
  esac

  base="https://github.com/${RTK_REPO}/releases/download/${RTK_VERSION}"
  asset="rtk-${target}.tar.gz"

  tmp="$(mktemp -d)" || return 1
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" EXIT INT TERM

  # The release tarball and its checksums are fetched and verified here rather
  # than piping the upstream install.sh into a shell: same artifact, but the
  # only thing this repo executes is the binary it just checksummed.
  #
  # The version is pinned because upstream's installer resolves "latest" via
  # api.github.com, which returns 403 through the web sandbox proxy. Bump
  # RTK_VERSION above to upgrade.
  curl -fsSL "${base}/${asset}"      -o "${tmp}/rtk.tar.gz"    || return 1
  curl -fsSL "${base}/checksums.txt" -o "${tmp}/checksums.txt" || return 1

  expected="$(awk -v a="$asset" '$2 == a {print $1}' "${tmp}/checksums.txt")"
  [ -n "$expected" ] || return 1

  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "${tmp}/rtk.tar.gz" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "${tmp}/rtk.tar.gz" | awk '{print $1}')"
  else
    return 1
  fi

  [ "$expected" = "$actual" ] || {
    echo "RTK: checksum mismatch for ${asset}; refusing to install." >&2
    return 1
  }

  tar -xzf "${tmp}/rtk.tar.gz" -C "$tmp" || return 1
  [ -f "${tmp}/rtk" ] || return 1

  mkdir -p "$INSTALL_DIR" || return 1
  install -m 0755 "${tmp}/rtk" "${INSTALL_DIR}/rtk" || return 1
}

# Warm container, or an RTK the user installed themselves: keep it.
if ! command -v rtk >/dev/null 2>&1 && ! [ -x "${INSTALL_DIR}/rtk" ]; then
  install_rtk || {
    echo "RTK unavailable; commands will run unfiltered."
    exit 0
  }
fi

PATH="${INSTALL_DIR}:${PATH}"
export PATH

# Keep RTK on PATH for the rest of the session, so the hook the next step
# registers can actually find the binary it shells out to.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

# `rtk init -g` writes into ~/.claude but does not create it, and hard-fails
# if it is missing. It always exists in a real session; create it anyway so a
# cold container cannot leave RTK installed but unregistered.
mkdir -p "${HOME}/.claude" 2>/dev/null

# The global install: PreToolUse hook in ~/.claude/settings.json, plus
# ~/.claude/RTK.md and the @RTK.md reference in ~/.claude/CLAUDE.md.
# Idempotent, and it backs up any existing settings.json before patching.
if rtk init -g --auto-patch >/dev/null 2>&1; then
  echo "RTK $(rtk --version 2>/dev/null | awk '{print $2}') installed globally (~/.claude) - output filtering active."
else
  # Binary is present, so `rtk <cmd>` still works by hand; only the automatic
  # rewrite hook is missing. Do not claim success for a half-finished install.
  echo "RTK installed but global hook registration failed; commands will run unfiltered." >&2
fi

exit 0

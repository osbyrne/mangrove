#!/bin/sh
# Mangrove macOS and Linux installer. Inspect this script at /install.sh before running it.
set -eu

fail() { printf 'Mangrove: %s\n' "$*" >&2; exit 1; }
download() {
  curl --proto '=https' --proto-redir '=https' --tlsv1.2 --fail --silent --show-error --location --retry 3 "$@"
}
verify() {
  file=$1
  checksums=$2
  expected=$(awk -v name="$file" '$2 == name || $2 == "./" name { print $1 }' "$checksums")
  [ "${#expected}" -eq 64 ] || fail "Missing checksum for $file"
  case "$expected" in *[!0-9a-fA-F]*) fail "Invalid checksum for $file" ;; esac
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$work_dir/$file" | awk '{print $1}')
  else
    actual=$(shasum -a 256 "$work_dir/$file" | awk '{print $1}')
  fi
  [ "$actual" = "$expected" ] || fail "Checksum mismatch for $file; nothing was installed"
}
cleanup() {
  [ -z "${staged:-}" ] || rm -f -- "$staged"
  [ -z "${work_dir:-}" ] || rm -rf -- "$work_dir"
}
install_binary() {
  source_file=$1
  binary_name=$2
  staged=$(mktemp "$bin_dir/.${binary_name}.XXXXXXXX")
  cp "$source_file" "$staged"
  chmod 755 "$staged"
  mv -f "$staged" "$bin_dir/$binary_name"
  staged=
}
main() {
  tag=${MANGROVE_VERSION:-}
  bin_dir=${MANGROVE_INSTALL_DIR:-${HOME:?Set HOME or MANGROVE_INSTALL_DIR}/.local/bin}
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --version) [ "$#" -ge 2 ] || fail '--version needs a release version'; tag=$2; shift 2 ;;
      --bin-dir) [ "$#" -ge 2 ] || fail '--bin-dir needs an absolute path'; bin_dir=$2; shift 2 ;;
      --help)
        printf '%s\n' 'Usage: sh install.sh [--version v0.1.2] [--bin-dir /absolute/path]' \
          'Defaults: latest stable release, $HOME/.local/bin. macOS 13+ and Linux glibc, x64/ARM64.' \
          'Requires curl, tar, and a SHA-256 tool.'
        return ;;
      *) fail "Unknown argument: $1" ;;
    esac
  done
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin)
      os=darwin
      mac_version=$(sw_vers -productVersion)
      mac_major=${mac_version%%.*}
      case "$mac_major" in ''|*[!0-9]*) fail 'Cannot determine the macOS version' ;; esac
      [ "$mac_major" -ge 13 ] || fail 'Mangrove requires macOS 13 or later'
      ;;
    *) fail 'Supported systems: macOS and Linux' ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) arch=x64 ;;
    aarch64|arm64) arch=arm64 ;;
    *) fail 'Supported architectures: x64 and ARM64' ;;
  esac
  # Prefer native Apple Silicon binaries when the shell is running under Rosetta.
  if [ "$os" = darwin ] && command -v sysctl >/dev/null 2>&1 && [ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ]; then
    arch=arm64
  fi
  case "$bin_dir" in /*) ;; *) fail 'The install directory must be an absolute path' ;; esac
  for tool in curl tar awk mktemp cp chmod mv mkdir grep uname rm; do command -v "$tool" >/dev/null 2>&1 || fail "Install $tool first"; done
  command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || fail 'Install sha256sum or shasum first'
  if [ "$os" = linux ] && command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
    fail 'Alpine/musl is not supported; use a glibc Linux distribution'
  fi
  if [ -z "$tag" ]; then
    latest=$(download --output /dev/null --write-out '%{url_effective}' https://github.com/osbyrne/mangrove/releases/latest)
    case "$latest" in https://github.com/osbyrne/mangrove/releases/tag/*) tag=${latest##*/} ;; *) fail 'Could not resolve the latest release' ;; esac
  fi
  tag=v${tag#v}
  case "$tag" in *[!0-9A-Za-z.-]*) fail 'Invalid release version' ;; esac
  printf '%s\n' "$tag" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z]+([.-][0-9A-Za-z]+)*)?$' || fail 'Invalid release version'
  work_dir=$(mktemp -d "${TMPDIR:-/tmp}/mangrove-install.XXXXXXXX")
  staged=
  trap cleanup 0
  trap 'exit 1' HUP INT TERM
  name="mangrove-${tag}-${os}-${arch}"
  base="https://github.com/osbyrne/mangrove/releases/download/$tag"
  printf 'Downloading Mangrove %s for %s %s…\n' "$tag" "$os" "$arch"
  download "$base/$name.tar.gz" --output "$work_dir/$name.tar.gz"
  download "$base/SHA256SUMS.txt" --output "$work_dir/SHA256SUMS.txt"
  verify "$name.tar.gz" "$work_dir/SHA256SUMS.txt"
  server_entry="$name/mangrove"
  tar -tzf "$work_dir/$name.tar.gz" > "$work_dir/archive-entries.txt"
  if ! grep -Fx "$server_entry" "$work_dir/archive-entries.txt" >/dev/null; then
    # v0.1.0 used the previous executable name; install every version as mangrove.
    server_entry="$name/mangrove-server"
  fi
  tar -xzf "$work_dir/$name.tar.gz" -C "$work_dir" "$server_entry"
  [ -f "$work_dir/$server_entry" ] && [ ! -L "$work_dir/$server_entry" ] || fail 'The archive contains no regular server executable'
  mkdir -p "$bin_dir"
  [ -w "$bin_dir" ] || fail "Cannot write to $bin_dir; choose --bin-dir or run with suitable permissions"
  # Verify every download before replacing any installed executable.
  install_binary "$work_dir/$server_entry" mangrove
  printf 'Installed Mangrove %s to %s/mangrove\n' "$tag" "$bin_dir"
  printf 'Add the install directory to PATH, then start the server:\n  export PATH="%s:$PATH"\n  mangrove\n' "$bin_dir"
  printf '%s\n' 'Service setup and upgrades: https://github.com/osbyrne/mangrove/blob/trunk/deploy/releases.md'
}
main "$@"

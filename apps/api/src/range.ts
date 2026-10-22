export type ByteRange =
  | { readonly kind: "full" }
  | { readonly kind: "partial"; readonly start: number; readonly end: number }
  | { readonly kind: "unsatisfiable" };

/** A single byte range; unsupported multipart and malformed ranges return 416. */
export function parseByteRange(header: string | null, size: number): ByteRange {
  if (header === null) return { kind: "full" };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) {
    return { kind: "unsatisfiable" };
  }

  // BigInt preserves correct clamping for values larger than Number.MAX_SAFE_INTEGER.
  const total = BigInt(size);
  if (!match[1]) {
    const suffix = BigInt(match[2]!);
    return suffix === 0n
      ? { kind: "unsatisfiable" }
      : { kind: "partial", start: Number(suffix >= total ? 0n : total - suffix), end: size - 1 };
  }

  const start = BigInt(match[1]);
  const end = match[2] ? BigInt(match[2]) : total - 1n;
  if (start >= total || end < start) return { kind: "unsatisfiable" };
  return { kind: "partial", start: Number(start), end: Number(end >= total ? total - 1n : end) };
}

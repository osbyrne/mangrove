/** Keep listeners on loopback or the Tailscale IPv4 range, never all interfaces. */
export function listenHost(value = process.env.HOST ?? "127.0.0.1") {
  const octets = value.split(".").map(Number);
  if (value === "127.0.0.1" || (octets.length === 4 && octets.every((n, i) => Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === value.split(".")[i]) && octets[0] === 100 && octets[1]! >= 64 && octets[1]! <= 127)) return value;
  throw new Error("HOST must be 127.0.0.1 or this server's Tailscale IPv4 address");
}

import { createSignal } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { styles } from "../styles";

export function InstallServer() {
  const origin = window.location.protocol === "https:" ? window.location.origin : "https://mangrove-web.osbyrne.workers.dev";
  const command = `curl -fsSL ${origin}/install.sh | sh`;
  const [copyStatus, setCopyStatus] = createSignal("");
  async function copy() {
    try { await navigator.clipboard.writeText(command); setCopyStatus("Copied"); }
    catch { setCopyStatus("Select and copy the command above."); }
  }
  return (
    <details {...stylex.attrs(styles.base, styles.installDetails)}>
      <summary {...stylex.attrs(styles.base, styles.focusRing, styles.installSummary)}>Install server</summary>
      <div {...stylex.attrs(styles.base, styles.installBody)}>
        <code {...stylex.attrs(styles.base, styles.installCommand)}>{command}</code>
        <button type="button" onClick={() => void copy()}
          {...stylex.attrs(styles.base, styles.button, styles.textButton, styles.focusRing, styles.touchTarget)}>Copy command</button>
        <span role="status" {...stylex.attrs(styles.base)}>{copyStatus()}</span>
        <p {...stylex.attrs(styles.base, styles.textReset)}>Linux x64 or ARM64. Installs to ~/.local/bin and adds rclone if needed.</p>
        <a href="/install.sh" {...stylex.attrs(styles.base, styles.link, styles.focusRing)}>View installer</a>
      </div>
    </details>
  );
}

import * as stylex from "@stylexjs/stylex";
import { theme } from "./tokens.stylex";

const spin = stylex.keyframes({ to: { transform: "rotate(360deg)" } });
const equalize = stylex.keyframes({ "50%": { transform: "scaleY(.4)" } });

export const styles = stylex.create({
  installDetails: { marginTop: 24, fontSize: 14 },
  installSummary: { cursor: "pointer", width: "fit-content" },
  installBody: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, paddingTop: 16 },
  installCommand: { overflowWrap: "anywhere", userSelect: "text" },

  uploadControls: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 24 },
  uploadStatus: { fontSize: 14 },

  appLogo: {
    display: "block",
    width: 64,
    height: 64,
    objectFit: "contain",
    margin: "20px auto 0",
  },
  documentRoot: {
    color: "#293e33",
    backgroundColor: "#f7f6f0",
    fontSynthesis: "none",
    textRendering: "optimizeLegibility",
    WebkitFontSmoothing: "antialiased",
    fontWeight: "400",
  },
  base: {
    boxSizing: "border-box",
    "::selection": {
      backgroundColor: "#dce4d2",
    },
    scrollBehavior: {
      default: null,
      "@media (prefers-reduced-motion: reduce)": "auto",
    },
  },
  body: {
    marginTop: "0",
    marginRight: "0",
    marginBottom: "0",
    marginLeft: "0",
    margin: 0,
  },
  tapTarget: {
    WebkitTapHighlightColor: "transparent",
  },
  controlFont: {
    fontSize: "inherit",
    fontWeight: "inherit",
    fontStyle: "inherit",
    lineHeight: "inherit",
  },
  touchTarget: {
    touchAction: "manipulation",
  },
  button: {
    cursor: {
      default: "pointer",
      ":disabled": "default",
    },
    opacity: {
      default: null,
      ":disabled": ".45",
    },
    color: "inherit",
    borderWidth: "0",
    borderStyle: "none",
    borderColor: "currentColor",
  },
  link: {
    color: "inherit",
    textDecoration: "none",
  },
  focusRing: {
    outlineWidth: {
      default: null,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: null,
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: null,
      ":focus-visible": "#527956",
    },
    outlineOffset: {
      default: null,
      ":focus-visible": 5,
    },
  },
  buttonIcon: {
    flexShrink: "0",
  },
  textReset: {
    marginTop: "0",
    marginRight: "0",
    marginBottom: "0",
    marginLeft: "0",
  },
  svg: {
    display: "block",
    flexShrink: 0,
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    paddingTop: "0",
    paddingRight: "0",
    paddingBottom: "0",
    paddingLeft: "0",
    marginTop: "-1px",
    marginRight: "-1px",
    marginBottom: "-1px",
    marginLeft: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    borderWidth: "0",
    borderStyle: "none",
    borderColor: "currentColor",
  },
  skipLink: {
    position: "fixed",
    top: {
      default: "-100px",
      ":focus": "12px",
    },
    left: "20px",
    paddingTop: "12px",
    paddingRight: "12px",
    paddingBottom: "12px",
    paddingLeft: "12px",
    backgroundColor: `${theme.green}`,
    color: "white",
    zIndex: "20",
  },
  appShell: {
    minHeight: "100vh",
    paddingBottom: {
      default: "112px",
      "@media (max-width:760px)": "145px",
    },
  },
  sidebar: {
    position: {
      default: "fixed",
      "@media (max-width:760px)": "relative",
    },
    top: "0",
    left: "0",
    bottom: "112px",
    width: {
      default: "234px",
      "@media (max-width:1200px)": "200px",
      "@media (max-width:980px)": "175px",
      "@media (max-width:760px)": "auto",
    },
    backgroundColor: "#f0f0e7",
    borderRightWidth: {
      default: "1px",
      "@media (max-width:760px)": "0",
    },
    borderRightStyle: {
      default: "solid",
      "@media (max-width:760px)": "none",
    },
    borderRightColor: {
      default: `${theme.line}`,
      "@media (max-width:760px)": "currentColor",
    },
    display: "flex",
    flexDirection: {
      default: "column",
      "@media (max-width:760px)": "row",
    },
    paddingTop: {
      default: "36px",
      "@media (max-width:980px)": "30px",
      "@media (max-width:760px)": "0",
      "@media (max-width:520px)": "0",
    },
    paddingRight: {
      default: "24px",
      "@media (max-width:1200px)": "19px",
      "@media (max-width:980px)": "15px",
      "@media (max-width:760px)": "24px",
      "@media (max-width:520px)": "21px",
    },
    paddingBottom: {
      default: "23px",
      "@media (max-width:980px)": "20px",
      "@media (max-width:760px)": "0",
      "@media (max-width:520px)": "0",
    },
    paddingLeft: {
      default: "24px",
      "@media (max-width:1200px)": "19px",
      "@media (max-width:980px)": "15px",
      "@media (max-width:760px)": "24px",
      "@media (max-width:520px)": "21px",
    },
    height: {
      default: null,
      "@media (max-width:760px)": "78px",
      "@media (max-width:520px)": "74px",
    },
    borderBottomWidth: {
      default: null,
      "@media (max-width:760px)": "1px",
    },
    borderBottomStyle: {
      default: null,
      "@media (max-width:760px)": "solid",
    },
    borderBottomColor: {
      default: null,
      "@media (max-width:760px)": `${theme.line}`,
    },
    alignItems: {
      default: null,
      "@media (max-width:760px)": "center",
    },
    justifyContent: {
      default: null,
      "@media (max-width:760px)": "space-between",
    },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: "9px",
      "@media (max-width:1200px)": "6px",
      "@media (max-width:980px)": "5px",
      "@media (max-width:760px)": "7px",
    },
    fontSize: {
      default: "30px",
      "@media (max-width:1200px)": "27px",
      "@media (max-width:980px)": "25px",
      "@media (max-width:760px)": "29px",
      "@media (max-width:520px)": "28px",
    },
    letterSpacing: "-1.3px",
    lineHeight: "1",
  },
  brandIcon: {
    width: {
      default: "35px",
      "@media (max-width:1200px)": "32px",
      "@media (max-width:980px)": "28px",
      "@media (max-width:760px)": "33px",
    },
    height: {
      default: "35px",
      "@media (max-width:760px)": "33px",
    },
    color: "#426447",
  },
  brandDot: {
    color: "#768763",
  },
  sidebarBody: {
    marginTop: {
      default: "69px",
      "@media (max-width:760px)": "0",
    },
    marginRight: {
      default: null,
      "@media (max-width:760px)": "0",
    },
    marginBottom: {
      default: null,
      "@media (max-width:760px)": "0",
    },
    marginLeft: {
      default: null,
      "@media (max-width:760px)": "0",
    },
  },
  sidebarLabel: {
    fontSize: "11px",
    color: "#858a79",
    marginTop: "0",
    marginRight: "0",
    marginBottom: "17px",
    marginLeft: {
      default: "12px",
      "@media (max-width:980px)": "8px",
    },
    display: {
      default: null,
      "@media (max-width:760px)": "none",
    },
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: "11px",
      "@media (max-width:980px)": "8px",
      "@media (max-width:760px)": "7px",
    },
    position: "relative",
    fontSize: {
      default: "12px",
      "@media (max-width:980px)": "11px",
      "@media (max-width:760px)": "11px",
      "@media (max-width:520px)": "10px",
    },
    fontWeight: "550",
    backgroundColor: {
      default: "#e3e8da",
      "@media (max-width:760px)": "transparent",
    },
    borderWidth: {
      default: "1px",
      "@media (max-width:760px)": "0",
    },
    borderStyle: {
      default: "solid",
      "@media (max-width:760px)": "none",
    },
    borderColor: {
      default: "#dce2d2",
      "@media (max-width:760px)": "currentColor",
    },
    paddingTop: {
      default: "14px",
      "@media (max-width:980px)": "12px",
      "@media (max-width:760px)": "10px",
    },
    paddingRight: {
      default: "12px",
      "@media (max-width:980px)": "9px",
      "@media (max-width:760px)": "0",
    },
    paddingBottom: {
      default: "14px",
      "@media (max-width:980px)": "12px",
      "@media (max-width:760px)": "10px",
    },
    paddingLeft: {
      default: "12px",
      "@media (max-width:980px)": "9px",
      "@media (max-width:760px)": "0",
    },
    borderRadius: "5px",
    color: "#34503a",
  },
  navIndicator: {
    marginLeft: "auto",
    height: "5px",
    width: "5px",
    borderRadius: "50%",
    backgroundColor: "#638063",
    display: {
      default: null,
      "@media (max-width:760px)": "none",
    },
  },
  sidebarNote: {
    marginTop: "auto",
    paddingTop: "70px",
    paddingRight: {
      default: "13px",
      "@media (max-width:980px)": "0",
    },
    paddingBottom: "48px",
    paddingLeft: {
      default: "13px",
      "@media (max-width:980px)": "8px",
    },
    color: "#7f9275",
    display: {
      default: null,
      "@media (max-width:760px)": "none",
    },
  },
  sidebarWave: {
    opacity: ".7",
    marginBottom: "24px",
    width: 132,
    height: 45,
    fill: "none",
  },
  sidebarQuote: {
    fontSize: {
      default: "28px",
      "@media (max-width:980px)": "25px",
    },
    lineHeight: "1.2",
    letterSpacing: "-.65px",
    color: "#52684c",
  },
  sidebarDescription: {
    display: "block",
    marginTop: "14px",
    color: "#909381",
    fontSize: "11px",
    lineHeight: "1.9",
  },
  sidebarFoot: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#dddfd2",
    paddingTop: "21px",
    paddingRight: "8px",
    paddingBottom: "0",
    paddingLeft: {
      default: "8px",
      "@media (max-width:980px)": "4px",
    },
    display: {
      default: "flex",
      "@media (max-width:760px)": "none",
    },
    alignItems: "center",
    gap: {
      default: "9px",
      "@media (max-width:980px)": "4px",
    },
    color: "#959a87",
    fontSize: {
      default: "10px",
      "@media (max-width:980px)": "8px",
    },
  },
  sidebarFootIcon: {
    width: "19px",
    height: "19px",
  },
  mainShell: {
    marginLeft: "0",
    marginTop: {
      default: null,
      "@media (max-width:760px)": "0",
    },
    marginRight: {
      default: null,
      "@media (max-width:760px)": "0",
    },
    marginBottom: {
      default: null,
      "@media (max-width:760px)": "0",
    },
  },
  topbar: {
    height: {
      default: "83px",
      "@media (max-width:980px)": "75px",
      "@media (max-width:760px)": "54px",
      "@media (max-width:520px)": "48px",
    },
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: `${theme.line}`,
    paddingTop: {
      default: "0",
      "@media (max-width:1200px)": "0",
      "@media (max-width:980px)": "0",
      "@media (max-width:760px)": "0",
      "@media (max-width:520px)": "0",
    },
    paddingRight: {
      default: "48px",
      "@media (max-width:1200px)": "37px",
      "@media (max-width:980px)": "30px",
      "@media (max-width:760px)": "25px",
      "@media (max-width:520px)": "22px",
    },
    paddingBottom: {
      default: "0",
      "@media (max-width:1200px)": "0",
      "@media (max-width:980px)": "0",
      "@media (max-width:760px)": "0",
      "@media (max-width:520px)": "0",
    },
    paddingLeft: {
      default: "48px",
      "@media (max-width:1200px)": "37px",
      "@media (max-width:980px)": "30px",
      "@media (max-width:760px)": "25px",
      "@media (max-width:520px)": "22px",
    },
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: {
      default: "11px",
      "@media (max-width:760px)": "10px",
    },
  },
  topbarLocation: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#657160",
  },
  topbarNote: {
    color: "#91917f",
    display: {
      default: "flex",
      "@media (max-width:520px)": "none",
    },
    alignItems: "center",
    gap: {
      default: "20px",
      "@media (max-width:980px)": "10px",
    },
    fontSize: {
      default: "10px",
      "@media (max-width:980px)": "9px",
      "@media (max-width:760px)": "9px",
    },
  },
  topbarArrow: {
    fontSize: "17px",
    color: "#738264",
  },
  mainContent: {
    maxWidth: "1320px",
    marginTop: "auto",
    marginRight: "auto",
    marginBottom: "auto",
    marginLeft: "auto",
    paddingTop: {
      default: "43px",
      "@media (min-width:1550px)": "55px",
      "@media (max-width:1200px)": "38px",
      "@media (max-width:980px)": "32px",
      "@media (max-width:760px)": "29px",
      "@media (max-width:520px)": "29px",
    },
    paddingRight: {
      default: "58px",
      "@media (max-width:1200px)": "37px",
      "@media (max-width:980px)": "30px",
      "@media (max-width:760px)": "27px",
      "@media (max-width:520px)": "24px",
    },
    paddingBottom: {
      default: "26px",
      "@media (max-width:1200px)": "25px",
      "@media (max-width:980px)": "22px",
      "@media (max-width:760px)": "25px",
      "@media (max-width:520px)": "24px",
    },
    paddingLeft: {
      default: "58px",
      "@media (max-width:1200px)": "37px",
      "@media (max-width:980px)": "30px",
      "@media (max-width:760px)": "27px",
      "@media (max-width:520px)": "24px",
    },
  },
  pageIntro: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: {
      default: "35px",
      "@media (min-width:1550px)": "45px",
      "@media (max-width:760px)": "28px",
      "@media (max-width:520px)": "27px",
    },
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: {
      default: "10px",
      "@media (max-width:520px)": "9px",
    },
    color: "#7c8872",
    marginBottom: {
      default: "11px",
      "@media (max-width:520px)": "11px",
    },
  },
  eyebrowDot: {
    height: "5px",
    width: "5px",
    borderRadius: "50%",
    backgroundColor: "#81946c",
  },
  pageHeading: {
    fontStyle: "normal",
    fontWeight: "400",
    fontSize: {
      default: "46px",
      "@media (max-width:980px)": "40px",
      "@media (max-width:760px)": "42px",
      "@media (max-width:520px)": "42px",
    },
    lineHeight: "1.12",
    letterSpacing: "-1.6px",
    color: "#2c4836",
  },
  pageDescription: {
    fontSize: {
      default: "12px",
      "@media (max-width:760px)": "11px",
      "@media (max-width:520px)": "10px",
    },
    color: "#8a8c7e",
    marginTop: "11px",
    lineHeight: {
      default: "1.7",
      "@media (max-width:520px)": "1.8",
    },
    maxWidth: {
      default: null,
      "@media (max-width:520px)": "220px",
    },
  },
  introOrnament: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: {
      default: "15px",
      "@media (max-width:760px)": "10px",
    },
    marginRight: {
      default: "14px",
      "@media (max-width:760px)": "2px",
      "@media (max-width:520px)": "0",
    },
    marginBottom: {
      default: "0",
      "@media (max-width:760px)": "0",
    },
    marginLeft: {
      default: "0",
      "@media (max-width:760px)": "0",
    },
    width: {
      default: "62px",
      "@media (max-width:760px)": "48px",
      "@media (max-width:520px)": "43px",
    },
    height: {
      default: "62px",
      "@media (max-width:760px)": "48px",
      "@media (max-width:520px)": "43px",
    },
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#dfe3d3",
    borderRadius: "50%",
    color: "#a6b294",
  },
  ornamentIcon: {
    width: {
      default: "31px",
      "@media (max-width:760px)": "26px",
    },
    height: {
      default: "31px",
      "@media (max-width:760px)": "26px",
    },
  },
  featured: {
    display: {
      default: "grid",
      "@media (max-width:520px)": "flex",
    },
    gridTemplateColumns: "minmax(0,1fr)",
    gap: {
      default: "51px",
      "@media (min-width:1550px)": "72px",
      "@media (max-width:1200px)": "32px",
      "@media (max-width:980px)": "28px",
      "@media (max-width:760px)": "27px",
      "@media (max-width:520px)": "30px",
    },
    alignItems: {
      default: "center",
      "@media (max-width:520px)": "stretch",
    },
    marginBottom: {
      default: "42px",
      "@media (max-width:760px)": "32px",
      "@media (max-width:520px)": "31px",
    },
    flexDirection: {
      default: null,
      "@media (max-width:520px)": "column",
    },
  },
  sleeveWrap: {
    position: "relative",
    isolation: "isolate",
    width: {
      default: null,
      "@media (max-width:520px)": "100%",
    },
    maxWidth: {
      default: null,
      "@media (max-width:520px)": "380px",
    },
    marginTop: {
      default: null,
      "@media (max-width:520px)": "auto",
    },
    marginRight: {
      default: null,
      "@media (max-width:520px)": "auto",
    },
    marginBottom: {
      default: null,
      "@media (max-width:520px)": "auto",
    },
    marginLeft: {
      default: null,
      "@media (max-width:520px)": "auto",
    },
    paddingTop: {
      default: null,
      "@media (max-width:520px)": "0",
    },
    paddingRight: {
      default: null,
      "@media (max-width:520px)": "8px",
    },
    paddingBottom: {
      default: null,
      "@media (max-width:520px)": "0",
    },
    paddingLeft: {
      default: null,
      "@media (max-width:520px)": "8px",
    },
  },
  sleeveArtwork: {
    boxShadow: "0 2px 2px #152d2620,0 18px 25px -17px #283e3470",
    outline: "1px solid #243b3620",
    outlineOffset: "-1px",
  },
  sleeveShadow: {
    position: "absolute",
    zIndex: "-1",
    top: {
      default: "14px",
      "@media (max-width:520px)": "12px",
    },
    right: {
      default: "-9px",
      "@media (max-width:520px)": "0",
    },
    bottom: {
      default: "-8px",
      "@media (max-width:520px)": "-6px",
    },
    left: {
      default: "11px",
      "@media (max-width:520px)": "18px",
    },
    backgroundColor: "#e8e7dc",
    transform: "rotate(2deg)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#dddfd2",
  },
  featuredDetails: {
    paddingTop: {
      default: "4px",
      "@media (max-width:520px)": "0",
    },
  },
  sectionKicker: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    fontSize: {
      default: "10px",
      "@media (max-width:980px)": "9px",
      "@media (max-width:520px)": "9px",
    },
    color: "#8a8e7f",
    marginBottom: {
      default: "21px",
      "@media (max-width:980px)": "15px",
      "@media (max-width:520px)": "12px",
    },
  },
  fineLine: {
    width: "20px",
    height: "1px",
    backgroundColor: "#99a68c",
  },
  songTitle: {
    fontStyle: "normal",
    fontWeight: "400",
    fontSize: {
      default: "clamp(36px,3.6vw,58px)",
      "@media (min-width:1550px)": "64px",
      "@media (max-width:1200px)": "43px",
      "@media (max-width:980px)": "37px",
      "@media (max-width:760px)": "38px",
      "@media (max-width:520px)": "44px",
    },
    lineHeight: "1.09",
    letterSpacing: {
      default: "-1.8px",
      "@media (max-width:980px)": "-1.3px",
      "@media (max-width:520px)": "-1.7px",
    },
    maxWidth: {
      default: "400px",
      "@media (max-width:520px)": "100%",
    },
    overflowWrap: "anywhere",
    color: "#2e4937",
  },
  artistName: {
    marginTop: {
      default: "16px",
      "@media (max-width:980px)": "12px",
      "@media (max-width:520px)": "12px",
    },
    fontSize: {
      default: "14px",
      "@media (max-width:980px)": "12px",
      "@media (max-width:520px)": "13px",
    },
    color: "#737c6d",
  },
  recordingDetails: {
    display: {
      default: "flex",
      "@media (max-width:760px)": "block",
    },
    flexWrap: "wrap",
    gap: {
      default: "9px",
      "@media (max-width:1200px)": "6px",
    },
    alignItems: "center",
    marginTop: {
      default: "17px",
      "@media (max-width:980px)": "12px",
      "@media (max-width:520px)": "12px",
    },
    color: "#8b8f80",
    fontSize: {
      default: "10px",
      "@media (max-width:980px)": "9px",
      "@media (max-width:760px)": "9px",
      "@media (max-width:520px)": "10px",
    },
    lineHeight: "1.8",
  },
  detailDot: {
    color: "#bbc0ae",
    paddingTop: {
      default: null,
      "@media (max-width:760px)": "0",
    },
    paddingRight: {
      default: null,
      "@media (max-width:760px)": "5px",
    },
    paddingBottom: {
      default: null,
      "@media (max-width:760px)": "0",
    },
    paddingLeft: {
      default: null,
      "@media (max-width:760px)": "5px",
    },
  },
  heroActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: {
      default: "16px",
      "@media (max-width:520px)": "14px",
    },
    marginTop: {
      default: "29px",
      "@media (min-width:1550px)": "35px",
      "@media (max-width:980px)": "22px",
      "@media (max-width:520px)": "21px",
    },
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "11px",
    minHeight: {
      default: "45px",
      "@media (max-width:760px)": "44px",
    },
    backgroundColor: {
      default: "#36583f",
      ":hover": "#24472f",
    },
    color: "#fcfcf6",
    paddingTop: {
      default: "0",
      "@media (max-width:760px)": "0",
      "@media (max-width:520px)": "0",
    },
    paddingRight: {
      default: "22px",
      "@media (max-width:760px)": "16px",
      "@media (max-width:520px)": "18px",
    },
    paddingBottom: {
      default: "0",
      "@media (max-width:760px)": "0",
      "@media (max-width:520px)": "0",
    },
    paddingLeft: {
      default: "22px",
      "@media (max-width:760px)": "16px",
      "@media (max-width:520px)": "18px",
    },
    borderRadius: "5px",
    fontSize: {
      default: "11px",
      "@media (max-width:760px)": "11px",
    },
    fontWeight: "500",
    transition: {
      default: "background .15s,transform .15s",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    whiteSpace: "nowrap",
    transform: {
      default: null,
      ":active": "translateY(1px)",
    },
  },
  heroListeningNote: {
    display: {
      default: "flex",
      "@media (max-width:1200px)": "none",
      "@media (max-width:520px)": "flex",
    },
    alignItems: "center",
    gap: "6px",
    fontSize: {
      default: "9px",
      "@media (max-width:520px)": "9px",
    },
    color: "#8e9582",
  },
  sleeveCaption: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#e3e6d9",
    paddingTop: {
      default: "20px",
      "@media (max-width:980px)": "16px",
    },
    marginTop: {
      default: "30px",
      "@media (max-width:980px)": "22px",
      "@media (max-width:760px)": "20px",
    },
    fontStyle: "italic",
    fontWeight: "400",
    fontSize: {
      default: "13px",
      "@media (max-width:980px)": "11px",
      "@media (max-width:760px)": "11px",
    },
    lineHeight: "1.5",
    color: "#9a9d8c",
    display: {
      default: null,
      "@media (max-width:520px)": "none",
    },
  },
  emptyHeading: {
    fontStyle: "normal",
    fontWeight: "400",
    fontSize: {
      default: "36px",
      "@media (max-width:520px)": "37px",
    },
    lineHeight: "1.16",
    letterSpacing: "-.7px",
  },
  emptyDescription: {
    fontSize: "12px",
    color: `${theme.muted}`,
    lineHeight: "1.8",
    marginTop: "20px",
    marginRight: "0",
    marginBottom: "20px",
    marginLeft: "0",
  },
  collectionSection: {
    marginTop: {
      default: "30px",
      "@media (min-width:1550px)": "45px",
      "@media (max-width:760px)": "26px",
      "@media (max-width:520px)": "29px",
    },
  },
  collectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: {
      default: "18px",
      "@media (max-width:520px)": "15px",
    },
  },
  collectionHeading: {
    fontStyle: "normal",
    fontWeight: "400",
    fontSize: {
      default: "24px",
      "@media (max-width:980px)": "22px",
      "@media (max-width:520px)": "24px",
    },
    lineHeight: "1.3",
    letterSpacing: "-.65px",
  },
  collectionHeadingDot: {
    color: "#8b997a",
  },
  collectionCount: {
    fontSize: {
      default: "10px",
      "@media (max-width:520px)": "9px",
    },
    color: "#8e9584",
    backgroundColor: "#edf0e6",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e1e5d7",
    paddingTop: {
      default: "5px",
      "@media (max-width:520px)": "4px",
    },
    paddingRight: {
      default: "9px",
      "@media (max-width:520px)": "7px",
    },
    paddingBottom: {
      default: "5px",
      "@media (max-width:520px)": "4px",
    },
    paddingLeft: {
      default: "9px",
      "@media (max-width:520px)": "7px",
    },
    borderRadius: "4px",
  },
  trackTableHead: {
    display: "grid",
    gridTemplateColumns: {
      default: "32px minmax(0,1fr) 140px 62px 36px",
      "@media (max-width:980px)": "22px minmax(0,1fr) 90px 37px 32px",
      "@media (max-width:520px)": "19px minmax(0,1fr) 34px 32px",
    },
    gap: {
      default: "10px",
      "@media (max-width:980px)": "8px",
      "@media (max-width:520px)": "7px",
    },
    alignItems: "center",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: `${theme.line}`,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: `${theme.line}`,
    paddingTop: "12px",
    paddingRight: {
      default: "14px",
      "@media (max-width:980px)": "10px",
      "@media (max-width:520px)": "9px",
    },
    paddingBottom: "12px",
    paddingLeft: {
      default: "14px",
      "@media (max-width:980px)": "10px",
      "@media (max-width:520px)": "9px",
    },
    color: "#979b8d",
    fontSize: "9px",
  },
  trackRow: {
    display: "grid",
    gridTemplateColumns: {
      default: "32px minmax(0,1fr) 140px 62px 36px",
      "@media (max-width:980px)": "22px minmax(0,1fr) 90px 37px 32px",
      "@media (max-width:520px)": "19px minmax(0,1fr) 34px 32px",
    },
    gap: {
      default: "10px",
      "@media (max-width:980px)": "8px",
      "@media (max-width:520px)": "7px",
    },
    alignItems: "center",
    paddingTop: {
      default: "16px",
      "@media (max-width:520px)": "14px",
    },
    paddingRight: {
      default: "14px",
      "@media (max-width:980px)": "10px",
      "@media (max-width:520px)": "9px",
    },
    paddingBottom: {
      default: "16px",
      "@media (max-width:520px)": "14px",
    },
    paddingLeft: {
      default: "14px",
      "@media (max-width:980px)": "10px",
      "@media (max-width:520px)": "9px",
    },
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: `${theme.line}`,
    minHeight: {
      default: "81px",
      "@media (max-width:520px)": "76px",
    },
    fontSize: {
      default: "11px",
      "@media (max-width:980px)": "10px",
    },
    color: "#8b9382",
  },
  trackRowActive: {
    backgroundColor: "#eef0e6",
  },
  trackNumber: {
    fontSize: "10px",
    color: "#9da58f",
    fontVariantNumeric: "tabular-nums",
  },
  trackTitleCell: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: "13px",
      "@media (max-width:520px)": "9px",
    },
    minWidth: "0",
  },
  trackTitleText: {
    minWidth: "0",
  },
  trackThumb: {
    backgroundColor: "#dfe6d7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: {
      default: "40px",
      "@media (max-width:520px)": "34px",
    },
    height: {
      default: "40px",
      "@media (max-width:520px)": "34px",
    },
    flexShrink: "0",
    color: "#7e9472",
  },
  trackThumbIcon: {
    width: {
      default: "27px",
      "@media (max-width:520px)": "24px",
    },
    height: {
      default: "27px",
      "@media (max-width:520px)": "24px",
    },
  },
  trackTitle: {
    display: "block",
    color: "#3e5c41",
    fontWeight: "550",
    fontSize: {
      default: "11px",
      "@media (max-width:520px)": "10px",
    },
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  trackArtist: {
    display: "block",
    fontSize: {
      default: "9px",
      "@media (max-width:520px)": "8px",
    },
    color: "#9aa18e",
    marginTop: "5px",
  },
  durationColumn: {
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
  },
  iconButton: {
    backgroundColor: {
      default: "transparent",
      ":hover": "#e7ecdf",
    },
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    color: {
      default: "#86917b",
      ":hover": "#3b5d3b",
    },
    transition: {
      default: "color .15s,background .15s",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  rowPlay: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d4ddca",
    width: "29px",
    height: "29px",
    color: "#68815e",
    marginLeft: {
      default: "7px",
      "@media (max-width:520px)": "3px",
    },
    backgroundColor: {
      default: null,
      ":hover": "#dfe7d6",
    },
  },
  roomFooter: {
    display: "flex",
    alignItems: {
      default: "center",
      "@media (max-width:520px)": "flex-start",
    },
    justifyContent: "space-between",
    gap: {
      default: "16px",
      "@media (max-width:520px)": "6px",
    },
    paddingTop: {
      default: "25px",
      "@media (max-width:520px)": "21px",
    },
    fontSize: {
      default: "9px",
      "@media (max-width:980px)": "8px",
      "@media (max-width:520px)": "9px",
    },
    color: "#a2a594",
    flexDirection: {
      default: null,
      "@media (max-width:520px)": "column",
    },
  },
  connectionStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: {
      default: "9px",
      "@media (max-width:980px)": "8px",
      "@media (max-width:520px)": "8px",
    },
    minHeight: "22px",
  },
  statusDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    backgroundColor: "#7e986b",
    flexShrink: "0",
  },
  statusPending: {
    backgroundColor: "#b1ad89",
  },
  statusOffline: {
    backgroundColor: "#b17b5f",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: "12px",
      "@media (max-width:520px)": "9px",
    },
    paddingTop: {
      default: "14px",
      "@media (max-width:520px)": "13px",
    },
    paddingRight: {
      default: "16px",
      "@media (max-width:520px)": "12px",
    },
    paddingBottom: {
      default: "14px",
      "@media (max-width:520px)": "13px",
    },
    paddingLeft: {
      default: "16px",
      "@media (max-width:520px)": "12px",
    },
    backgroundColor: "#f0eade",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e3d9c8",
    borderRadius: "4px",
    marginTop: "0",
    marginRight: "0",
    marginBottom: "25px",
    marginLeft: "0",
    color: "#7b674b",
    fontSize: {
      default: "12px",
      "@media (max-width:760px)": "11px",
    },
    lineHeight: "1.7",
    flexWrap: {
      default: null,
      "@media (max-width:760px)": "wrap",
    },
  },
  noticeIcon: {
    flexShrink: "0",
  },
  noticeText: {
    flexGrow: "1",
    flexShrink: "1",
    flexBasis: "0%",
    minWidth: {
      default: null,
      "@media (max-width:760px)": "180px",
    },
  },
  textButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "inherit",
    backgroundColor: "transparent",
    paddingTop: "4px",
    paddingRight: "4px",
    paddingBottom: "4px",
    paddingLeft: "4px",
    whiteSpace: "nowrap",
    fontSize: "11px",
    textDecoration: {
      default: null,
      ":hover": "underline",
    },
  },
  trackLoading: {
    minHeight: "81px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: `${theme.muted}`,
    fontSize: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: `${theme.line}`,
    paddingTop: "20px",
    paddingRight: "20px",
    paddingBottom: "20px",
    paddingLeft: "20px",
  },
  emptyCollection: {
    paddingTop: "24px",
    paddingRight: "14px",
    paddingBottom: "24px",
    paddingLeft: "14px",
    fontSize: "12px",
    color: `${theme.muted}`,
    lineHeight: "1.8",
  },
  player: {
    position: "fixed",
    top: "auto",
    right: "0",
    bottom: "0",
    left: "0",
    minHeight: {
      default: "112px",
      "@media (max-width:760px)": "130px",
    },
    backgroundColor: "#fafaf5f5",
    backdropFilter: "blur(16px)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#dde2d4",
    paddingTop: {
      default: "19px",
      "@media (max-width:760px)": "16px",
    },
    paddingRight: {
      default: "32px",
      "@media (max-width:1200px)": "25px",
      "@media (max-width:980px)": "22px",
      "@media (max-width:760px)": "25px",
      "@media (max-width:520px)": "21px",
    },
    paddingBottom: {
      default: "19px",
      "@media (max-width:760px)": "max(10px,env(safe-area-inset-bottom))",
    },
    paddingLeft: {
      default: "32px",
      "@media (max-width:1200px)": "25px",
      "@media (max-width:980px)": "22px",
      "@media (max-width:760px)": "25px",
      "@media (max-width:520px)": "21px",
    },
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(185px,1fr) minmax(280px,490px) minmax(185px,1fr)",
      "@media (max-width:1200px)":
        "minmax(180px,1fr) minmax(260px,400px) minmax(130px,1fr)",
      "@media (max-width:980px)": "minmax(165px,1fr) minmax(230px,1.4fr) 105px",
      "@media (max-width:760px)": "minmax(0,1fr) auto",
    },
    alignItems: "center",
    gap: {
      default: "32px",
      "@media (max-width:1200px)": "20px",
      "@media (max-width:980px)": "17px",
      "@media (max-width:760px)": "10px 20px",
    },
    zIndex: "5",
  },
  playerTrack: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: "14px",
      "@media (max-width:980px)": "10px",
    },
    minWidth: "0",
  },
  playerEmptyArt: {
    width: 55,
    flexShrink: 0,
    borderRadius: 3,
    height: "55px",
    backgroundColor: "#e3e9d9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#829478",
  },
  emptyArtworkIcon: {
    width: "30px",
    height: "30px",
  },
  playerTrackText: {
    minWidth: "0",
  },
  playerTrackName: {
    fontSize: {
      default: "11px",
      "@media (max-width:980px)": "10px",
      "@media (max-width:760px)": "11px",
    },
    fontWeight: "550",
    color: "#3c553d",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  playerTrackArtist: {
    fontSize: {
      default: "9px",
      "@media (max-width:980px)": "8px",
      "@media (max-width:760px)": "9px",
    },
    color: "#929b86",
    marginTop: "6px",
  },
  transport: {
    display: {
      default: "flex",
      "@media (max-width:760px)": "contents",
    },
    flexDirection: "column",
    gap: "12px",
  },
  transportButtons: {
    display: "flex",
    alignItems: "center",
    justifyContent: {
      default: "center",
      "@media (max-width:760px)": "flex-start",
    },
    gap: {
      default: "20px",
      "@media (max-width:980px)": "14px",
    },
    position: "relative",
    height: {
      default: "34px",
      "@media (max-width:760px)": "38px",
    },
    gridColumn: {
      default: null,
      "@media (max-width:760px)": "2",
    },
    gridRow: {
      default: null,
      "@media (max-width:760px)": "1",
    },
    width: {
      default: null,
      "@media (max-width:760px)": "86px",
    },
  },
  playerPlay: {
    width: {
      default: "36px",
      "@media (max-width:760px)": "38px",
    },
    height: {
      default: "36px",
      "@media (max-width:760px)": "38px",
    },
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: {
      default: "#36583f",
      ":hover": "#25472e",
    },
    color: "#fafbf5",
    flexShrink: "0",
    transition: {
      default: "background .15s",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  playerPlayIcon: {
    flexShrink: "0",
  },
  playIcon: {
    marginLeft: "2px",
  },
  playbackState: {
    position: "absolute",
    right: {
      default: "calc(50% + 46px)",
      "@media (max-width:980px)": "calc(50% + 31px)",
    },
    fontSize: {
      default: "8px",
      "@media (max-width:980px)": "7px",
    },
    color: "#a0a58f",
    whiteSpace: "nowrap",
    display: {
      default: null,
      "@media (max-width:760px)": "none",
    },
  },
  repeatButton: {
    position: "absolute",
    left: {
      default: "calc(50% + 37px)",
      "@media (max-width:760px)": "48px",
    },
    flexDirection: "column",
    gap: "0",
  },
  repeatDot: {
    width: "3px",
    height: "3px",
    borderRadius: "50%",
    position: "absolute",
    bottom: "0",
    backgroundColor: "transparent",
  },
  repeatActive: {
    color: "#3d643d",
    backgroundColor: "#e8eedf",
  },
  repeatDotActive: {
    backgroundColor: "#648450",
  },
  seekControl: {
    display: "flex",
    alignItems: "center",
    gap: {
      default: "12px",
      "@media (max-width:760px)": "10px",
    },
    minWidth: "0",
    gridRow: {
      default: null,
      "@media (max-width:760px)": "2",
    },
    gridColumn: {
      default: null,
      "@media (max-width:760px)": "1/-1",
    },
  },
  time: {
    fontSize: {
      default: "9px",
      "@media (max-width:760px)": "9px",
    },
    fontVariantNumeric: "tabular-nums",
    color: "#909a83",
    width: "28px",
    flexShrink: "0",
  },
  timeEnd: {
    textAlign: "right",
  },
  range: {
    appearance: "none",
    WebkitAppearance: "none",
    backgroundColor: "transparent",
    height: "16px",
    cursor: {
      default: "pointer",
      ":disabled": "default",
    },
    marginTop: "0",
    marginRight: "0",
    marginBottom: "0",
    marginLeft: "0",
    minWidth: "0",
    outlineOffset: { default: "3px", ":focus-visible": "5px" },
    "::-webkit-slider-runnable-track": {
      height: "3px",
      backgroundImage:
        "linear-gradient(to right,#66845a 0%,#66845a var(--progress),#dfe5d4 var(--progress),#dfe5d4 100%)",
      borderRadius: "5px",
    },
    "::-moz-range-track": {
      height: "3px",
      backgroundImage:
        "linear-gradient(to right,#66845a 0%,#66845a var(--progress),#dfe5d4 var(--progress),#dfe5d4 100%)",
      borderRadius: "5px",
    },
    "::-webkit-slider-thumb": {
      appearance: "none",
      WebkitAppearance: "none",
      width: "9px",
      height: "9px",
      backgroundColor: "#66845a",
      borderRadius: "50%",
      marginTop: "-3px",
      transition: {
        default: "box-shadow .15s",
        "@media (prefers-reduced-motion: reduce)": "none",
      },
      boxShadow: {
        default: null,
        ":hover": "0 0 0 4px #66845a15",
      },
    },
    "::-moz-range-thumb": {
      width: "9px",
      height: "9px",
      backgroundColor: "#66845a",
      borderWidth: "0",
      borderStyle: "none",
      borderColor: "currentColor",
      borderRadius: "50%",
    },
    opacity: {
      default: null,
      ":disabled": ".45",
    },
  },
  seekRange: {
    flexGrow: "1",
    flexShrink: "1",
    flexBasis: "0%",
    width: "100%",
  },
  volumeControl: {
    display: "flex",
    alignItems: "center",
    justifyContent: {
      default: "flex-end",
      "@media (max-width:760px)": "flex-end",
    },
    gap: {
      default: "8px",
      "@media (max-width:980px)": "2px",
      "@media (max-width:760px)": "8px",
    },
    gridColumn: {
      default: null,
      "@media (max-width:760px)": "1/-1",
    },
    gridRow: {
      default: null,
      "@media (max-width:760px)": "3",
    },
    height: {
      default: null,
      "@media (max-width:760px)": "20px",
    },
  },
  volumeRange: {
    width: {
      default: "82px",
      "@media (max-width:1200px)": "65px",
      "@media (max-width:980px)": "55px",
      "@media (max-width:760px)": "65px",
    },
  },
  volumeLabel: {
    fontSize: {
      default: "8px",
      "@media (max-width:760px)": "8px",
    },
    color: "#a3ac96",
    width: "25px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    display: {
      default: null,
      "@media (max-width:1200px)": "none",
      "@media (max-width:760px)": "block",
    },
  },
  equalizer: {
    height: "15px",
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  equalizerBar: {
    height: "8px",
    width: "2px",
    backgroundColor: "#6b895a",
    animationName: {
      default: equalize,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.1s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  equalizerBarSecond: {
    height: "14px",
    animationDelay: "-.3s",
  },
  equalizerBarThird: {
    height: "10px",
    animationDelay: "-.7s",
  },
  spin: {
    animationName: {
      default: spin,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.2s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  notFound: {
    maxWidth: "600px",
    marginTop: "15vh",
    marginRight: "auto",
    marginBottom: "15vh",
    marginLeft: "auto",
    paddingTop: "30px",
    paddingRight: "30px",
    paddingBottom: "30px",
    paddingLeft: "30px",
  },
  notFoundHeading: {
    fontStyle: "normal",
    fontWeight: "400",
    fontSize: "42px",
    lineHeight: "1.2",
    marginBottom: "20px",
  },
  notFoundDescription: {
    color: `${theme.muted}`,
    marginBottom: "20px",
  },
  notFoundLink: {
    textDecoration: "underline",
  },
  navIcon: {
    width: {
      default: null,
      "@media (max-width:980px)": "16px",
      "@media (max-width:520px)": "16px",
    },
  },
  volumeButton: {
    height: {
      default: null,
      "@media (max-width:760px)": "24px",
    },
    width: {
      default: null,
      "@media (max-width:760px)": "24px",
    },
  },
  volumeIcon: {
    width: {
      default: null,
      "@media (max-width:760px)": "15px",
    },
    height: {
      default: null,
      "@media (max-width:760px)": "15px",
    },
  },
  noticeButton: {
    marginLeft: {
      default: null,
      "@media (max-width:760px)": "28px",
    },
  },
  heroNoteIcon: {
    width: {
      default: null,
      "@media (max-width:520px)": "13px",
    },
  },
  dateColumn: {
    display: {
      default: null,
      "@media (max-width:520px)": "none",
    },
  },
  footerButton: {
    fontSize: {
      default: null,
      "@media (max-width:520px)": "9px",
    },
  },
  waveLine: {
    stroke: "currentColor",
    strokeWidth: 1.2,
  },
  icon13: {
    width: 13,
    height: 13,
  },
  icon14: {
    width: 14,
    height: 14,
  },
  icon15: {
    width: 15,
    height: 15,
  },
  icon16: {
    width: 16,
    height: 16,
  },
  icon17: {
    width: 17,
    height: 17,
  },
  icon18: {
    width: 18,
    height: 18,
  },
  icon19: {
    width: 19,
    height: 19,
  },
  stroke15: {
    strokeWidth: 1.5,
  },
  stroke16: {
    strokeWidth: 1.6,
  },
  stroke17: {
    strokeWidth: 1.7,
  },
  filledIcon: {
    fill: "currentColor",
  },
});

export const dynamicStyles = stylex.create({
  progress: (value: string) => ({ "--progress": value }),
});

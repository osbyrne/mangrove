import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  artwork: {
    aspectRatio: 1,
    width: "100%",
    backgroundColor: "#244333",
    overflow: "hidden",
  },
  small: {
    width: {
      default: 55,
      "@media (max-width: 980px)": 47,
      "@media (max-width: 760px)": 43,
    },
    flexShrink: 0,
    borderRadius: 3,
  },
  artworkSvg: {
    width: "100%",
    height: "100%",
    display: "block",
    fill: "none",
  },
  botanicalMark: {
    display: "block",
    fill: "none",
  },
  botanicalPath: {
    stroke: "currentColor",
    strokeWidth: "1.8px",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  gradientStart: { stopColor: "#345c49" },
  gradientEnd: { stopColor: "#142f2a" },
  patternLine: {
    stroke: "#e3e0ba",
    strokeOpacity: 0.035,
  },
  sleeveFill: { fill: "url(#sleeve)" },
  smallSleeveFill: { fill: "url(#sleeve-small)" },
  sun: { fill: "#dbd9b9" },
  outerSunRing: { stroke: "#314d3c", strokeOpacity: 0.11 },
  middleSunRing: { stroke: "#314d3c", strokeOpacity: 0.09 },
  innerSunRing: { stroke: "#314d3c", strokeOpacity: 0.07 },
  sunCenter: { fill: "#c8c7a7" },
  sunDot: { fill: "#2b4d3d" },
  branches: {
    stroke: "#8fa282",
    strokeWidth: "2px",
    strokeLinecap: "round",
  },
  leaves: { fill: "#71876a", stroke: "none" },
  leafVeins: {
    stroke: "#233f31",
    strokeWidth: "1.5px",
    strokeOpacity: 0.7,
  },
  ground: { fill: "#1b362c", fillOpacity: 0.7 },
  linesFill: { fill: "url(#lines)" },
  smallLinesFill: { fill: "url(#lines-small)" },
  lettering: {
    fill: "#e2e2c9",
    textAnchor: "middle",
  },
  title: { fontSize: "20px", letterSpacing: "1px" },
  tagline: { fontSize: "12px", letterSpacing: "2px" },
});

import { continueRender, delayRender, staticFile } from "remotion";

// Font chữ Việt đóng gói sẵn trong public/fonts (OFL) — không cần mạng khi render.
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const VIET = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";

const FACES: [string, string, string, string][] = [
  ...["400", "600", "700", "800"].map((w) => ["BVP", `be-vietnam-pro-%s-${w}-normal`, w, "normal"] as [string, string, string, string]),
  ...["600", "700", "800"].map((w) => ["PFD", `playfair-display-%s-${w}-normal`, w, "normal"] as [string, string, string, string]),
  ["PFD", "playfair-display-%s-400-italic", "400", "italic"],
  ["PFD", "playfair-display-%s-500-italic", "500", "italic"],
];

let started = false;

export function loadFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("fonts");
  const all: Promise<unknown>[] = [];
  for (const [family, file, weight, style] of FACES) {
    for (const [sub, range] of [["latin", LATIN], ["vietnamese", VIET]]) {
      const url = staticFile(`fonts/${file.replace("%s", sub)}.woff2`);
      const face = new FontFace(family, `url(${url}) format('woff2')`, { weight, style, unicodeRange: range });
      document.fonts.add(face);
      all.push(face.load().catch(() => null));
    }
  }
  Promise.all(all).then(() => continueRender(handle));
}

import { mkdirSync, writeFileSync } from "node:fs";

const USER = process.env.GH_USER || "TeixeiraCamila";
const TOKEN = process.env.STATS_TOKEN;

if (!TOKEN) throw new Error("Defina a variável STATS_TOKEN");

// ---------- dados ----------

const query = `
query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: USER } }),
});
const { data, errors } = await res.json();
if (errors) throw new Error(JSON.stringify(errors));

const u = data.user;
const repos = u.repositories.nodes;

const stars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);
const commits =
  u.contributionsCollection.totalCommitContributions +
  u.contributionsCollection.restrictedContributionsCount;
const prs = u.pullRequests.totalCount;
const issues = u.issues.totalCount;
const followers = u.followers.totalCount;

const langMap = {};
for (const repo of repos) {
  for (const { size, node } of repo.languages.edges) {
    langMap[node.name] ??= { size: 0, color: node.color || "#94b0c2" };
    langMap[node.name].size += size;
  }
}
const langs = Object.entries(langMap)
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 6);
const totalSize = langs.reduce((sum, [, l]) => sum + l.size, 0);

// nível de "jogador": só uma brincadeira baseada nas estatísticas
const score = commits + prs * 3 + issues + stars * 2;
const level = Math.floor(Math.sqrt(score)) + 1;
const progress = (score - (level - 1) ** 2) / (level ** 2 - (level - 1) ** 2);

// ---------- pixel art ----------

const FONT = {
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], 1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f], 3: [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], 5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], 7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], 9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a], X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04], Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c], "%": [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0], "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "-": [0, 0, 0, 0x1f, 0, 0, 0], ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0], " ": [0, 0, 0, 0, 0, 0, 0],
};

const STAR = ["...XX...", "...XX...", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "..XXXX..", ".XX..XX.", ".X....X."];
const SWORD = ["...XX...", "...XX...", "...XX...", "...XX...", "...XX...", ".XXXXXX.", "...XX...", "...XX..."];
const MERGE = ["XX....XX", "XX....XX", ".X....X.", ".XX..XX.", "..XXXX..", "...XX...", "...XX...", "..XXXX.."];
const BUG = ["X..XX..X", ".X.XX.X.", "..XXXX..", "XXXXXXXX", "..XXXX..", "XXXXXXXX", ".X.XX.X.", "X..XX..X"];
const HEART = [".XX..XX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "...XX...", "........"];
const VUE = ["XXX....XXX", ".XXX..XXX.", "..XXXXXX..", "...XXXX...", "....XX...."];
const VUE_INNER = ["..........", "..........", "...XXXX...", "....XX....", ".........."];
const SPARK = [".X.", "XXX", ".X."];

const BG = "#1a1c2c";
const BORDER = "#566c86";
const GREY = "#94b0c2";
const WHITE = "#f4f4f4";
const YELLOW = "#ffcd75";
const EMPTY = "#29366f";

// converte linhas "X./." em um path SVG (uma barra por sequência de pixels)
const draw = (rows, x, y, s) => {
  let d = "";
  rows.forEach((row, r) => {
    for (const m of row.matchAll(/X+/g)) {
      const w = m[0].length * s;
      d += `M${x + m.index * s} ${y + r * s}h${w}v${s}h-${w}z`;
    }
  });
  return d;
};

const sprite = (rows, x, y, s, fill) => `<path d="${draw(rows, x, y, s)}" fill="${fill}"/>`;

const glyph = (bits) =>
  bits.map((b) => b.toString(2).padStart(5, "0").replace(/1/g, "X").replace(/0/g, "."));

const textWidth = (str, s) => str.length * 6 * s - s;

const text = (str, x, y, s, fill) => {
  const d = [...str.toUpperCase()]
    .map((ch, i) => (FONT[ch] ? draw(glyph(FONT[ch]), x + i * 6 * s, y, s) : ""))
    .join("");
  return `<path d="${d}" fill="${fill}"/>`;
};

const textRight = (str, xEnd, y, s, fill) => text(str, xEnd - textWidth(str, s), y, s, fill);

const W = 340;
const H = 270;

// retângulo com cantos "escada"
const shape = (inset) => {
  const w = W - 2 * inset - 8;
  const h = H - 2 * inset - 8;
  return `M${inset + 4} ${inset}h${w}v4h4v${h}h-4v4h-${w}v-4h-4v-${h}h4z`;
};

const sparkles = (points) =>
  points.map(([x, y]) => sprite(SPARK, x, y, 2, BORDER)).join("\n  ");

const card = (body, spots) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <path d="${shape(0)}" fill="${BORDER}"/>
  <path d="${shape(4)}" fill="${BG}"/>
  ${sparkles(spots)}
  ${body}
</svg>`;

// ---------- card 1: player ----------

const rows = [
  ["STARS", stars, STAR, YELLOW],
  ["COMMITS 12M", commits, SWORD, "#73eff7"],
  ["PRS", prs, MERGE, "#a7f070"],
  ["ISSUES", issues, BUG, "#ef7d57"],
  ["FOLLOWERS", followers, HEART, "#ff6b81"],
]
  .map(([label, value, icon, color], i) => {
    const y = 116 + i * 28;
    return [
      sprite(icon, 24, y - 1, 2, color),
      text(label, 50, y + 1, 2, GREY),
      textRight(String(value), W - 24, y + 1, 2, color),
    ].join("\n  ");
  })
  .join("\n  ");

const xpBlocks = Array.from({ length: 20 }, (_, i) => {
  const color = i < Math.round(progress * 20) ? "#38b764" : EMPTY;
  return `<rect x="${90 + i * 11}" y="84" width="9" height="10" fill="${color}"/>`;
}).join("");

const player = card(
  [
    text("PLAYER 1", 24, 24, 3, YELLOW),
    text(USER, 24, 52, 2, GREY),
    sprite(VUE, W - 64, 24, 4, "#41b883"),
    sprite(VUE_INNER, W - 64, 24, 4, "#35495e"),
    text(`LV ${level}`, 24, 82, 2, WHITE),
    xpBlocks,
    rows,
  ].join("\n  "),
  [[200, 26], [236, 52], [262, 70], [300, 66]],
);

// ---------- card 2: inventory ----------

const SEGMENTS = 29;
let acc = 0;
const cumulative = langs.map(([, l]) => (acc += l.size / totalSize));

const langColorAt = (t) => {
  const i = cumulative.findIndex((c) => t < c);
  return langs[i === -1 ? langs.length - 1 : i][1].color;
};

const langBar = langs.length
  ? Array.from({ length: SEGMENTS }, (_, i) => {
      const color = langColorAt((i + 0.5) / SEGMENTS);
      return `<rect x="${24 + i * 10}" y="84" width="8" height="12" fill="${color}"/>`;
    }).join("")
  : "";

const legend = langs
  .map(([name, l], i) => {
    const y = 114 + i * 24;
    const pct = `${((l.size / totalSize) * 100).toFixed(1)}%`;
    return [
      `<rect x="24" y="${y + 1}" width="12" height="12" fill="${l.color}"/>`,
      text(name.slice(0, 14), 46, y, 2, WHITE),
      textRight(pct, W - 24, y, 2, GREY),
    ].join("\n  ");
  })
  .join("\n  ");

const inventory = card(
  [text("INVENTORY", 24, 24, 3, YELLOW), text("TOP LANGUAGES", 24, 52, 2, GREY), langBar, legend].join("\n  "),
  [[210, 24], [250, 40], [290, 28], [300, 60], [262, 64]],
);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/stats.svg", player);
writeFileSync("assets/langs.svg", inventory);

console.log("assets/stats.svg e assets/langs.svg gerados");
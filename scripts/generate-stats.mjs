import { mkdirSync, writeFileSync } from "node:fs";

const USER = process.env.GH_USER || "TeixeiraCamila";
const TOKEN = process.env.STATS_TOKEN;

if (!TOKEN) throw new Error("Defina a variável STATS_TOKEN");

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

const stats = {
  Stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
  "Commits (12 meses)":
    u.contributionsCollection.totalCommitContributions +
    u.contributionsCollection.restrictedContributionsCount,
  "Pull Requests": u.pullRequests.totalCount,
  Issues: u.issues.totalCount,
  Seguidores: u.followers.totalCount,
};

const langMap = {};
for (const repo of repos) {
  for (const { size, node } of repo.languages.edges) {
    langMap[node.name] ??= { size: 0, color: node.color || "#888" };
    langMap[node.name].size += size;
  }
}
const langs = Object.entries(langMap)
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 6);
const totalSize = langs.reduce((sum, [, l]) => sum + l.size, 0);

const BG = "#282c34";
const TITLE = "#e4bf7a";
const TEXT = "#abb2bf";
const FONT = "font-family='Segoe UI, Ubuntu, sans-serif'";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const card = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="4.5" fill="${BG}" stroke="#e4e2e2" stroke-opacity="0.2"/>
  <text x="25" y="35" ${FONT} font-size="18" font-weight="600" fill="${TITLE}">${esc(title)}</text>
  ${body}
</svg>`;

const statsBody = Object.entries(stats)
  .map(([label, value], i) => {
    const y = 70 + i * 26;
    return `<text x="25" y="${y}" ${FONT} font-size="14" fill="${TEXT}">${esc(label)}</text>
  <text x="300" y="${y}" ${FONT} font-size="14" font-weight="600" fill="${TEXT}" text-anchor="end">${value.toLocaleString("pt-BR")}</text>`;
  })
  .join("\n  ");

let offset = 0;
const bar = langs
  .map(([, l]) => {
    const w = (l.size / totalSize) * 250;
    const rect = `<rect x="${25 + offset}" y="55" width="${w}" height="8" fill="${l.color}"/>`;
    offset += w;
    return rect;
  })
  .join("\n  ");

const legend = langs
  .map(([name, l], i) => {
    const y = 95 + i * 22;
    const pct = ((l.size / totalSize) * 100).toFixed(1);
    return `<circle cx="30" cy="${y - 4}" r="5" fill="${l.color}"/>
  <text x="42" y="${y}" ${FONT} font-size="13" fill="${TEXT}">${esc(name)}</text>
  <text x="275" y="${y}" ${FONT} font-size="13" fill="${TEXT}" text-anchor="end">${pct}%</text>`;
  })
  .join("\n  ");

mkdirSync("assets", { recursive: true });
writeFileSync("assets/stats.svg", card(325, 210, `${USER} - GitHub Stats`, statsBody));
writeFileSync("assets/langs.svg", card(300, 240, "Top Languages", `${bar}\n  ${legend}`));

console.log("assets/stats.svg e assets/langs.svg gerados");
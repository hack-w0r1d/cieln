// 各ツールのリポジトリから「update:」で始まるcommitを集め、更新履歴を生成する。
// 出力: data/updates.json / index.html と updates.html の UPDATES マーカー間
import { readFile, writeFile } from "node:fs/promises";

const OWNER = "hack-w0r1d";
const PREFIX = /^update:\s*/i;
const PAGE_LIMIT = 200;
const INDEX_LIMIT = 5;

const tools = JSON.parse(await readFile("data/tools.json", "utf8"));
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
};

const entries = [];
for (const tool of tools) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${tool.repo}/commits?per_page=100`, { headers });
  // 1つでも取得に失敗したら中断し、前回の内容を保つ
  if (!res.ok) throw new Error(`${tool.repo}: ${res.status} ${res.statusText}`);
  for (const c of await res.json()) {
    const subject = c.commit.message.split("\n")[0].trim();
    if (!PREFIX.test(subject)) continue;
    const message = subject.replace(PREFIX, "").trim();
    if (!message) continue;
    entries.push({ tool: tool.name, url: tool.url, message, date: c.commit.committer.date });
  }
}
entries.sort((a, b) => new Date(b.date) - new Date(a.date));
const list = entries.slice(0, PAGE_LIMIT);

const fmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function formatJst(iso) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}
const esc = (s) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function render(items) {
  if (!items.length) return '<p class="update-empty">公開できる更新はまだありません。</p>';
  const lis = items.map((e) => `      <li class="update-item">
        <time datetime="${e.date}">${formatJst(e.date)}</time>
        <a class="update-item__tool" href="${e.url}" target="_blank" rel="noopener">${esc(e.tool)}</a>
        <span class="update-item__msg">${esc(e.message)}</span>
      </li>`).join("\n");
  return `<ul class="update-list">\n${lis}\n    </ul>`;
}

async function inject(file, html) {
  const src = await readFile(file, "utf8");
  const re = /<!-- UPDATES:START -->[\s\S]*?<!-- UPDATES:END -->/;
  if (!re.test(src)) throw new Error(`${file}: UPDATES マーカーが見つかりません`);
  await writeFile(file, src.replace(re, `<!-- UPDATES:START -->\n    ${html}\n    <!-- UPDATES:END -->`));
}

await inject("index.html", render(list.slice(0, INDEX_LIMIT)));
await inject("updates.html", render(list));
await writeFile("data/updates.json", JSON.stringify(list, null, 2) + "\n");
console.log(`${list.length} 件の更新を出力しました`);

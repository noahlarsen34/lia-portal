import fs from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2];
const outputPath = path.join(process.cwd(), "data/curriculum/wordpress-pages.json");

if (!inputPath) {
  console.error("Usage: node scripts/parse-wordpress-export.mjs /path/to/export.xml");
  process.exit(1);
}

function getTagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return cleanValue(match?.[1] ?? "");
}

function cleanValue(value) {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;|&#8243;/g, '"')
    .replace(/&#8211;/g, "-")
    .trim();
}

const xml = await fs.readFile(inputPath, "utf8");
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);

const pages = items
  .map((item) => ({
    id: Number(getTagValue(item, "wp:post_id")),
    title: getTagValue(item, "title"),
    slug: getTagValue(item, "wp:post_name"),
    link: getTagValue(item, "link"),
    type: getTagValue(item, "wp:post_type"),
    status: getTagValue(item, "wp:status"),
    parentId: Number(getTagValue(item, "wp:post_parent")),
    menuOrder: Number(getTagValue(item, "wp:menu_order")),
    content: getTagValue(item, "content:encoded"),
  }))
  .filter((page) => page.type === "page" && page.status === "publish" && page.slug);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(pages, null, 2));

console.log(`Imported ${pages.length} pages to ${outputPath}`);

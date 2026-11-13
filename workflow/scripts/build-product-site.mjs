// Builds the GitHub Pages product website into site-dist/.
// Copies the static pages in src/product-site/ and renders the User Guide and
// Developer Guide from docs/ into site pages so they are readable on the
// website itself, not only on GitHub. Usage: node workflow/scripts/build-product-site.mjs
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = resolve(root, 'src/product-site');
const out = resolve(root, 'site-dist');
const repository =
  'https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4';
const mermaidModule =
  'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';

export const guides = [
  {
    markdown: 'docs/UserGuide.md',
    page: 'user-guide.html',
    nav: 'User Guide',
    description:
      'Codewise User Guide: access, sign-in, instructor and student walkthroughs, and troubleshooting.',
  },
  {
    markdown: 'docs/DeveloperGuide.md',
    page: 'developer-guide.html',
    nav: 'Developer Guide',
    description:
      'Codewise Developer Guide: architecture, UML, data integrity, local setup, verification and workflow.',
  },
];

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const textOf = (node) =>
  'value' in node ? node.value : (node.children ?? []).map(textOf).join('');

// GitHub-compatible heading anchors, so links such as
// DeveloperGuide.md#local-setup keep working on the website.
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

// remark plugin: heading ids, an "On this page" list, and Mermaid blocks
// rendered as <pre class="mermaid"> for the browser-side Mermaid script.
function remarkSitePage(toc) {
  return (tree) => {
    const seen = new Map();
    walk(tree, (node) => {
      if (node.type === 'heading') {
        const base = slugify(textOf(node));
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const id = count ? `${base}-${count}` : base;
        node.data = { ...node.data, hProperties: { id } };
        if (node.depth === 2) toc.push({ id, text: textOf(node) });
      }
    });
    tree.children = tree.children.map((node) =>
      node.type === 'code' && node.lang === 'mermaid'
        ? {
            type: 'mermaid',
            data: {
              hName: 'pre',
              hProperties: { className: ['mermaid'] },
              hChildren: [{ type: 'text', value: node.value }],
            },
          }
        : node,
    );
  };
}

// Guide-to-guide links stay on the website; other repository files open on GitHub.
function rewriteHref(href, markdownPath) {
  if (/^([a-z]+:|#)/i.test(href)) return href;
  const [path, hash] = href.split('#');
  const target = posix.normalize(posix.join(posix.dirname(markdownPath), path));
  const guide = guides.find((g) => g.markdown === target);
  if (guide) return guide.page + (hash ? `#${hash}` : '');
  return `${repository}/blob/main/${target}${hash ? `#${hash}` : ''}`;
}

const header = (current) => `<a class="skip" href="#main">Skip to content</a>
    <header>
      <a class="brand" href="./">Codewise</a>
      <nav aria-label="Project navigation">
        <a href="./#features">Features</a>
${guides
  .map(
    (g) =>
      `        <a href="${g.page}"${g.page === current ? ' aria-current="page"' : ''}>${g.nav}</a>`,
  )
  .join('\n')}
        <a href="${repository}">Source</a>
      </nav>
    </header>`;

function renderGuide(guide) {
  const markdown = readFileSync(resolve(root, guide.markdown), 'utf8');
  const toc = [];
  const body = renderToStaticMarkup(
    createElement(
      Markdown,
      {
        remarkPlugins: [remarkGfm, () => remarkSitePage(toc)],
        components: {
          a: ({ href = '', children }) => {
            const target = rewriteHref(href, guide.markdown);
            return createElement('a', { href: target }, children);
          },
          table: ({ children }) =>
            createElement(
              'div',
              { className: 'table-scroll', tabIndex: 0 },
              createElement('table', null, children),
            ),
        },
      },
      markdown,
    ),
  );
  const title = guide.nav;
  const tocHtml = toc.length
    ? `<nav class="toc" aria-label="On this page">
          <p class="eyebrow">On this page</p>
          <ol>
${toc.map((t) => `            <li><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join('\n')}
          </ol>
        </nav>`
    : '';
  const hasMermaid = body.includes('class="mermaid"');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(guide.description)}" />
    <title>${escapeHtml(title)} · Codewise</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${header(guide.page)}
    <main id="main" class="guide-layout">
      ${tocHtml}
      <article class="guide">
${body}
        <p class="source-note">
          Rendered from
          <a href="${repository}/blob/main/${guide.markdown}">${guide.markdown}</a>
          on the main branch.
        </p>
      </article>
    </main>
    <footer>
      <p>
        Built by Darryl and Keith for CS3227 MP4.
        <a href="https://codewise-production.codewise-cs3227-2610.workers.dev/sign-in">Open Codewise</a>
        ·
        <a href="${repository}">Repository</a>
      </p>
    </footer>${
      hasMermaid
        ? `
    <script type="module">
      import mermaid from '${mermaidModule}';
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral' });
      await mermaid.run({ querySelector: 'pre.mermaid' });
    </script>`
        : ''
    }
  </body>
</html>
`;
}

export function buildProductSite() {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(source, out, { recursive: true });
  for (const guide of guides)
    writeFileSync(resolve(out, guide.page), renderGuide(guide));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = buildProductSite();
  console.log(
    `Built product site in ${dir} (${guides.map((g) => g.page).join(', ')})`,
  );
}

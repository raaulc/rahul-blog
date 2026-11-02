#!/usr/bin/env node
/**
 * transform.js
 *
 * Reads an Obsidian vault, filters notes tagged #publish, transforms
 * Obsidian-specific syntax to standard markdown, copies images, and
 * writes output to src/content/posts/.
 *
 * Usage:
 *   node scripts/transform.js --vault /path/to/vault [--attachments attachments]
 *
 * Options:
 *   --vault        Path to the Obsidian vault directory (required)
 *   --attachments  Name of the attachments subfolder inside the vault (default: "attachments")
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'chokidar';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
}

const vaultPath = getArg('--vault');
const attachmentsFolderName = getArg('--attachments') || 'attachments';
const watchMode = args.includes('--watch');

if (!vaultPath) {
  console.error('Error: --vault <path> is required');
  process.exit(1);
}

if (!fs.existsSync(vaultPath)) {
  console.error(`Error: vault path does not exist: ${vaultPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const postsOutDir = path.join(projectRoot, 'src', 'content', 'posts');
// Short takeaways tagged #note go to their own collection.
const notesOutDir = path.join(projectRoot, 'src', 'content', 'notes');
const imagesOutDir = path.join(projectRoot, 'public', 'images');
const attachmentsDir = path.join(vaultPath, attachmentsFolderName);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Parse YAML-style frontmatter block at the top of a markdown file.
 * Returns { data: object, body: string }.
 * If no frontmatter, data is {} and body is the full content.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const rawYaml = match[1];
  const body = match[2];

  // Minimal YAML parser -- handles string and array values only
  const data = {};
  for (const line of rawYaml.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim();
    const raw = kv[2].trim();

    // Inline array: [a, b, c] or [a,b]
    if (raw.startsWith('[')) {
      data[key] = raw
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      data[key] = raw.replace(/^['"]|['"]$/g, '');
    }
  }

  // Also handle multi-line list values (- item)
  // Simple approach: look for keys followed by list items on next lines
  const multiLineMatch = rawYaml.match(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m);
  if (multiLineMatch) {
    data.tags = multiLineMatch[1]
      .split('\n')
      .map((l) => l.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  return { data, body };
}

function serializeFrontmatter(data) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(', ')}]`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Check if a note should be published.
 * Returns true if #publish appears in:
 *   - frontmatter tags array (as "publish" or "#publish")
 *   - body text as the literal string #publish
 */
function hasTag(frontmatter, body, tag) {
  const tags = frontmatter.tags || [];
  if (tags.some((t) => t === tag || t === `#${tag}`)) return true;
  // Match the tag only when it appears on its own line (Obsidian tag convention)
  return new RegExp(`^#${tag}\\s*$`, 'm').test(body);
}

function isPublished(frontmatter, body) {
  return hasTag(frontmatter, body, 'publish');
}

function isNote(frontmatter, body) {
  return hasTag(frontmatter, body, 'note');
}

/**
 * Build a map of { noteName -> slug } for all published notes.
 * Used to resolve wikilinks.
 */
function buildSlugMap(notes) {
  // name -> URL path, so wikilinks can point at a post or a note.
  const map = new Map();
  for (const { filename, frontmatter, kind } of notes) {
    const baseName = path.basename(filename, '.md');
    const slug = frontmatter.slug || slugify(baseName);
    const href = `/${kind === 'note' ? 'notes' : 'posts'}/${slug}`;
    map.set(baseName.toLowerCase(), href);
    if (frontmatter.title) map.set(String(frontmatter.title).toLowerCase(), href);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

/**
 * Strip #publish from body text and from frontmatter tags array.
 */
function stripPublishTag(frontmatter, body) {
  const control = ['publish', '#publish', 'note', '#note'];
  const newFrontmatter = { ...frontmatter };
  if (newFrontmatter.tags) {
    newFrontmatter.tags = newFrontmatter.tags.filter((t) => !control.includes(t));
  }
  const newBody = body
    .replace(/^#(publish|note)\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n') // collapse extra blank lines
    .trim();
  return { frontmatter: newFrontmatter, body: newBody };
}

/**
 * Transform Obsidian wikilinks to standard markdown links.
 *   [[Note Title]]         → [Note Title](/posts/note-title)
 *   [[Note Title|Alias]]   → [Alias](/posts/note-title)
 *   ![[image.png]]         → handled separately by transformImages
 */
function transformWikilinks(body, slugMap) {
  // Non-image wikilinks (no ! prefix)
  return body.replace(/(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const href = slugMap.get(target.toLowerCase());
    const label = alias || target;
    // Links to notes that are not published stay as plain text, never a dead link.
    return href ? `[${label}](${href})` : label;
  });
}

/**
 * Transform Obsidian image embeds to standard markdown.
 *   ![[image.png]]  → ![image](/images/image.png)
 * Collects all referenced images for copying.
 */
function transformImages(body, referencedImages) {
  return body.replace(/!\[\[([^\]]+)\]\]/g, (_, filename) => {
    const name = path.basename(filename);
    referencedImages.add(name);
    const label = path.basename(name, path.extname(name));
    return `![${label}](/images/${name})`;
  });
}

/**
 * Transform Obsidian callouts to standard blockquotes.
 *   > [!NOTE] Optional title
 *   > body text
 *
 * Becomes:
 *   > **Note: Optional title**
 *   > body text
 */
function transformCallouts(body) {
  return body.replace(
    /^(> \[!(\w+)\](?:\s+(.+))?\n)((?:> .*\n?)*)/gm,
    (_, firstLine, type, title, rest) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      const heading = title ? `**${label}: ${title}**` : `**${label}**`;
      return `> ${heading}\n${rest}`;
    }
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function collectMarkdownFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === attachmentsFolderName) continue;
    if (entry.isDirectory() && entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function run() {
  ensureDir(postsOutDir);
  ensureDir(notesOutDir);
  ensureDir(imagesOutDir);

  // 1. Scan vault for all markdown files
  const allFiles = collectMarkdownFiles(vaultPath);
  console.log(`Found ${allFiles.length} markdown files in vault`);

  // 2. Parse frontmatter + body for each file
  const parsed = allFiles.map((filepath) => {
    const content = fs.readFileSync(filepath, 'utf8');
    const { data: frontmatter, body } = parseFrontmatter(content);
    return { filepath, filename: filepath, frontmatter, body };
  });

  // 3. Keep only what is tagged for the site: #publish (post) or #note (short note)
  const toPublish = parsed
    .map((n) => ({ ...n, kind: isNote(n.frontmatter, n.body) ? 'note' : isPublished(n.frontmatter, n.body) ? 'post' : null }))
    .filter((n) => n.kind);
  const noteCount = toPublish.filter((n) => n.kind === 'note').length;
  console.log(`Publishing ${toPublish.length - noteCount} posts and ${noteCount} notes of ${allFiles.length} files`);

  // 4. Build slug map from all published notes
  const slugMap = buildSlugMap(toPublish);

  // 5. Transform and write each note
  const referencedImages = new Set();

  for (const { filepath, frontmatter, body, kind } of toPublish) {
    const baseName = path.basename(filepath, '.md');
    const slug = frontmatter.slug || slugify(baseName);

    // Strip #publish tag
    const { frontmatter: cleanFm, body: cleanBody } = stripPublishTag(frontmatter, body);

    // Apply transformers
    let transformed = cleanBody;
    transformed = transformCallouts(transformed);
    transformed = transformImages(transformed, referencedImages);
    transformed = transformWikilinks(transformed, slugMap);

    // Ensure required frontmatter fields
    const outputFm = {
      title: cleanFm.title || baseName,
      date: cleanFm.date || new Date().toISOString().slice(0, 10),
      slug,
      ...(cleanFm.description ? { description: cleanFm.description } : {}),
      ...(cleanFm.tags && cleanFm.tags.length > 0 ? { tags: cleanFm.tags } : {}),
      ...(cleanFm.type ? { type: cleanFm.type } : {}),
      ...(cleanFm.category ? { category: cleanFm.category } : {}),
    };

    const output = `${serializeFrontmatter(outputFm)}\n\n${transformed}\n`;
    const outPath = path.join(kind === 'note' ? notesOutDir : postsOutDir, `${slug}.md`);
    fs.writeFileSync(outPath, output, 'utf8');
    console.log(`  ✓ ${baseName} → ${slug}.md`);
  }

  // 6. Copy referenced images
  let copiedImages = 0;
  for (const imageName of referencedImages) {
    const srcPath = path.join(attachmentsDir, imageName);
    const destPath = path.join(imagesOutDir, imageName);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copiedImages++;
    } else {
      console.warn(`  Warning: image not found in attachments: ${imageName}`);
    }
  }

  if (referencedImages.size > 0) {
    console.log(`Copied ${copiedImages}/${referencedImages.size} images`);
  }

  console.log('Transform complete.');
}

run();

if (watchMode) {
  console.log(`\nWatching vault for changes: ${vaultPath}`);
  const watcher = watch(vaultPath, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
  });

  let debounceTimer = null;
  const debounced = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('\nChange detected -- re-running transform...');
      run();
    }, 300);
  };

  watcher.on('add', debounced);
  watcher.on('change', debounced);
  watcher.on('unlink', debounced);
}

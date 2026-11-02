import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  // Written by scripts/transform.js from Obsidian notes tagged #publish.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    type: z.string().optional().default('post'),
    series: z.string().optional(),
    category: z.string().optional(),
  }),
});

const notes = defineCollection({
  // Short takeaways, written by scripts/transform.js from Obsidian notes tagged #note.
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string().optional().default('Notes'),
    tags: z.array(z.string()).optional().default([]),
  }),
});

// Hand-curated lists, one entry per item.
const papers = defineCollection({
  loader: file('src/content/papershelf.yaml'),
  schema: z.object({
    title: z.string(),
    url: z.url(),
    year: z.number().optional(),
    topic: z.string(),
    take: z.string().optional(), // one line on why it matters
    implemented: z.string().optional(), // link to my implementation, if any
    added: z.coerce.date(),
  }),
});

const books = defineCollection({
  loader: file('src/content/bookshelf.yaml'),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    url: z.url().optional(),
    take: z.string().optional(),
    added: z.coerce.date(),
  }),
});

const videos = defineCollection({
  loader: file('src/content/videos.yaml'),
  schema: z.object({
    title: z.string(),
    youtube: z.string(), // video id
    description: z.string().optional(),
    published: z.coerce.date(),
  }),
});

export const collections = { posts, notes, papers, books, videos };

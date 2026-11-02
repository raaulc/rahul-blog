// Content sections and their sizes. The nav and the homepage overview only show sections that have content.
import { getCollection } from 'astro:content';
import { experiments, notebooks, selected } from '../data/work';

export type NavId = 'work' | 'writing' | 'notes' | 'videos' | 'papershelf' | 'bookshelf' | 'about';

export interface Section {
  id: 'work' | 'writing' | 'notes' | 'videos' | 'papershelf' | 'bookshelf';
  label: string;
  href: string;
  count: number;
  noun: string; // used in the overview, e.g. "12 notes"
  one: string; // singular, e.g. "1 note"
}

export async function getSections(): Promise<Section[]> {
  const [posts, notes, videos, papers, books] = await Promise.all([
    getCollection('posts', (p) => p.data.type === 'post'),
    getCollection('notes'),
    getCollection('videos'),
    getCollection('papers'),
    getCollection('books'),
  ]);
  return [
    { id: 'work', label: 'work', href: '/projects', count: selected.length + experiments.length + notebooks.length, noun: 'projects', one: 'project' },
    { id: 'writing', label: 'writing', href: '/writing', count: posts.length, noun: 'posts', one: 'post' },
    { id: 'notes', label: 'notes', href: '/notes', count: notes.length, noun: 'notes', one: 'note' },
    { id: 'videos', label: 'videos', href: '/videos', count: videos.length, noun: 'videos', one: 'video' },
    { id: 'papershelf', label: 'papers', href: '/papershelf', count: papers.length, noun: 'papers', one: 'paper' },
    { id: 'bookshelf', label: 'books', href: '/bookshelf', count: books.length, noun: 'books', one: 'book' },
  ];
}

/** Sections worth linking to: the core ones always, the rest once they have content. */
export async function getNavSections() {
  return (await getSections()).filter((s) => s.id === 'work' || s.id === 'writing' || s.count > 0);
}

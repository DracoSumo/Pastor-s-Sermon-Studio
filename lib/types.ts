// lib/types.ts
export type Sermon = {
  id?: string;
  title: string;
  theme: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  passages: string[];     // e.g., ["John 3:16", "Psalm 23:1"]
  notes: string;
  setlist: number[];      // song ids
  isSeriesItem: boolean;
  seriesId: string;       // series UUID or ''
};

export type Series = {
  id: string;
  name: string;
  color: string;
};

export type Song = {
  id: number;
  title: string;
  artist: string;
  themes: string[];
  tempo: 'slow' | 'mid' | 'up';
};

export type Verse = {
  ref: string;
  text: Record<string, string>; // { KJV: '...', ESV: '...' }
  themes: string[];
};

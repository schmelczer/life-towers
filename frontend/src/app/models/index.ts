export interface HslColor {
  h: number; // 0-1
  s: number; // 0-1
  l: number; // 0-1
}

export interface Block {
  id: string;
  tag: string;
  description: string;
  is_done: boolean;
  created_at: number;
}

export interface Tower {
  id: string;
  name: string;
  base_color: HslColor;
  blocks: Block[];
}

export interface Page {
  id: string;
  name: string;
  hide_create_tower_button: boolean;
  keep_tasks_open: boolean;
  default_date_from: number | null;
  default_date_to: number | null;
  towers: Tower[];
}

export interface TreeDto {
  pages: Page[];
}

export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'retrying'
  | 'error' // generic / network — will keep trying
  | 'too-large' // 413 — payload exceeds the server cap, won't retry
  | 'rate-limited' // 429 — will retry after Retry-After
  | 'invalid'; // 400 — server rejected the body, won't retry

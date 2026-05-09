/** Chave `page` alinhada às rotas e ao check SQL. */
export type SavedViewPage = 'dashboard' | 'submissions' | 'approvals' | 'audit';

export type SavedViewRow = {
  id: string;
  user_id: string;
  name: string;
  page: SavedViewPage;
  filters: Record<string, unknown>;
  sort: Record<string, unknown> | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

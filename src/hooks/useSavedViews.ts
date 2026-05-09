import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedViewFiltersV1 } from '../features/saved-views/savedViewFilters';
import { filtersToJson } from '../features/saved-views/savedViewFilters';
import type { SavedViewPage, SavedViewRow } from '../features/saved-views/savedView.types';
import { getSupabaseClient } from '../lib/supabase';

export function useSavedViewsList(userId: string | undefined, page: SavedViewPage | null | undefined) {
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['saved-views', userId, page ?? 'none'],
    queryFn: async (): Promise<SavedViewRow[]> => {
      if (!supabase || !page) {
        return [];
      }
      const { data, error } = await supabase
        .from('saved_views')
        .select('*')
        .eq('page', page)
        .order('is_pinned', { ascending: false })
        .order('name', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as SavedViewRow[];
    },
    enabled: Boolean(supabase && userId && page),
  });
}

/** Vistas fixadas para a secção da sidebar (todas as páginas). Contagens por vista seriam N+1 — omitidas (exibimos **—**). */
export function usePinnedSavedViews(userId: string | undefined) {
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['saved-views', userId, 'pinned'],
    queryFn: async (): Promise<SavedViewRow[]> => {
      if (!supabase) {
        throw new Error('Cliente Supabase indisponível.');
      }
      const { data, error } = await supabase
        .from('saved_views')
        .select('*')
        .eq('is_pinned', true)
        .order('page', { ascending: true })
        .order('name', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as SavedViewRow[];
    },
    enabled: Boolean(supabase && userId),
  });
}

export function useSavedViewById(userId: string | undefined, viewId: string | null | undefined) {
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['saved-view', userId, viewId],
    queryFn: async (): Promise<SavedViewRow | null> => {
      if (!supabase || !viewId) {
        return null;
      }
      const { data, error } = await supabase.from('saved_views').select('*').eq('id', viewId).maybeSingle();
      if (error) {
        throw error;
      }
      return (data as SavedViewRow | null) ?? null;
    },
    enabled: Boolean(supabase && userId && viewId),
  });
}

export function useSavedViewsMutations(userId: string | undefined) {
  const qc = useQueryClient();
  const supabase = getSupabaseClient();

  const invalidate = () => {
    if (!userId) {
      return;
    }
    void qc.invalidateQueries({ queryKey: ['saved-views', userId] });
    void qc.invalidateQueries({ queryKey: ['saved-view', userId] });
  };

  const insertMutation = useMutation({
    mutationFn: async (payload: {
      page: SavedViewPage;
      name: string;
      filters: SavedViewFiltersV1;
      sort?: Record<string, unknown> | null;
      isPinned: boolean;
    }) => {
      if (!supabase || !userId) {
        throw new Error('Sessão inválida.');
      }
      const { page, name, filters, sort = null, isPinned } = payload;
      const { data, error } = await supabase
        .from('saved_views')
        .insert({
          user_id: userId,
          name: name.trim(),
          page,
          filters: filtersToJson(filters),
          sort,
          is_pinned: isPinned,
        })
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return data as SavedViewRow;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name?: string; is_pinned?: boolean }) => {
      if (!supabase) {
        throw new Error('Cliente Supabase indisponível.');
      }
      const patch: Record<string, unknown> = {};
      if (payload.name !== undefined) {
        patch.name = payload.name.trim();
      }
      if (payload.is_pinned !== undefined) {
        patch.is_pinned = payload.is_pinned;
      }
      const { error } = await supabase.from('saved_views').update(patch).eq('id', payload.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('Cliente Supabase indisponível.');
      }
      const { error } = await supabase.from('saved_views').delete().eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  return { insertMutation, updateMutation, deleteMutation };
}

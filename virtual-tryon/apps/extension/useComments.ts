'use client';
import { useState, useEffect, useCallback } from 'react';

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

export function useComments(outfitId: string, limit = 20) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/outfits/${outfitId}/comments?limit=${limit}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        setError('Invalid content-type');
        return;
      }
      const json = await res.json();
      if (json?.success) {
        setComments(json.data || []);
      } else {
        setError(json?.error || 'Unknown error');
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || String(e?.message).includes('aborted')) {
        return;
      }
      setError(e?.message || 'Network error');
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [outfitId, limit]);

  const addComment = useCallback(
    async (content: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(`/api/outfits/${outfitId}/comments`, {
          method: 'POST',
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ outfitId, content }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        if (json?.success && json?.data) {
          setComments((prev) => [json.data, ...prev].slice(0, limit));
          return true;
        }
        return false;
      } catch (e: any) {
        if (e?.name === 'AbortError' || String(e?.message).includes('aborted')) {
          return false;
        }
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [outfitId, limit]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchComments();
    return () => controller.abort();
  }, [fetchComments]);

  return { comments, isLoading, error, refresh: fetchComments, addComment };
}

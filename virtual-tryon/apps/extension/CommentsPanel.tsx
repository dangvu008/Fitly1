/**
 * File: CommentsPanel.tsx
 * Purpose: Comments UI cho homepage (copy vào dự án web)
 */

'use client';
import { useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { Loader2, X } from 'lucide-react';

export default function CommentsPanel({ outfitId, onClose }: { outfitId: string; onClose: () => void }) {
  const { comments, isLoading, error, addComment, refresh } = useComments(outfitId, 50);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const ok = await addComment(input.trim());
    if (ok) {
      setInput('');
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold">Bình luận</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--accent)] flex items-center justify-center">
            <X className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          )}
          {error && <div className="text-xs text-red-500">Lỗi: {error}</div>}
          {!isLoading && comments.length === 0 && (
            <div className="text-xs text-[var(--muted-foreground)] text-center">Chưa có bình luận nào</div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                {c.user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium">{c.user.name}</div>
                <div className="text-sm">{c.content}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={sending || !input.trim()}
              className="h-9 px-4 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-50"
            >
              {sending ? 'Đang gửi...' : 'Gửi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
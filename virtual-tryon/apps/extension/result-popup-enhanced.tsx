'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  X, Download, Copy, Check, Share2, ShoppingBag, Wand2, Shirt, Edit3
} from 'lucide-react';

function ResultPopupContent() {
  const searchParams = useSearchParams();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [name, setName] = useState<string>('Kết quả thử đồ');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const img = searchParams.get('imageUrl');
    const source = searchParams.get('sourceUrl');
    const displayName = searchParams.get('name');
    if (img) setImageUrl(decodeURIComponent(img));
    if (source) setSourceUrl(decodeURIComponent(source));
    if (displayName) setName(decodeURIComponent(displayName));
  }, [searchParams]);

  const handleClose = () => window.close();

  const handleCopy = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('fetch image failed');
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      try {
        await navigator.clipboard.writeText(imageUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('fetch image failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitly-result-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: 'Xem kết quả thử đồ của tôi trên Fitly!',
          url: window.location.href,
        });
      } catch {}
    }
  };

  const handleVisitProduct = () => {
    if (sourceUrl) window.open(sourceUrl, '_blank');
  };

  const handleSaveWardrobe = async () => {
    if (!imageUrl || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          name,
          category: 'outfit',
          source_url: sourceUrl || undefined,
          brand: undefined,
          color: undefined,
          tags: ['tryon'],
        }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {}
    setSaving(false);
  };

  const quickSuggestions = [
    'đổi màu áo sang đen',
    'thêm kính râm',
    'thêm mũ',
    'xóa background',
  ];

  const handleEditImage = async () => {
    if (!editPrompt.trim() || editing) return;
    setEditing(true);
    try {
      const res = await fetch('/api/tryon/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tryonId: undefined,
          editPrompt: editPrompt.trim(),
          resultImageUrl: imageUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.imageUrl) {
          setImageUrl(data.imageUrl);
          setEditPrompt('');
        }
      }
    } catch {}
    setEditing(false);
  };

  if (!imageUrl) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400">Không có ảnh kết quả</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">F</span>
          </div>
          <span className="text-xs font-medium text-white truncate max-w-[140px]">
            {name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden bg-[#0a0a0a]">
        <img
          src={imageUrl}
          alt="Kết quả thử đồ"
          className="max-h-[420px] max-w-full object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
      </div>

      {/* Actions */}
      <div className="px-2 py-2 bg-[#1a1a1a] border-t border-[#2a2a2a] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {sourceUrl && (
              <button
                onClick={handleVisitProduct}
                className="p-1.5 rounded bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] hover:text-white transition-colors"
                title="Mua ngay"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] hover:text-white transition-colors"
              title="Copy ảnh"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] hover:text-white transition-colors"
              title="Tải xuống"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 rounded bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] hover:text-white transition-colors"
              title="Chia sẻ"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveWardrobe}
              disabled={saving}
              className="px-2 py-1 rounded text-[10px] font-medium bg-orange-500 text-white disabled:opacity-50"
            >
              Lưu vào tủ đồ
            </button>
          </div>
        </div>

        {/* Edit section (inspired by FitlyExt) */}
        <div className="rounded-lg border border-[#2a2a2a] p-2">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-gray-300" />
            <input
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Nhập yêu cầu chỉnh sửa (vd: đổi màu áo sang đen)"
              className="flex-1 h-8 px-3 rounded bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none"
            />
            <button
              onClick={handleEditImage}
              disabled={editing || !editPrompt.trim()}
              className="h-8 px-3 rounded bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-medium disabled:opacity-50"
            >
              Sửa ảnh
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {quickSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setEditPrompt(s)}
                className="px-2 py-1 rounded bg-[#2a2a2a] text-[11px] text-gray-300 hover:bg-[#3a3a3a]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultPopupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResultPopupContent />
    </Suspense>
  );
}

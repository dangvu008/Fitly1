/**
 * File: page.tsx (Home) - Updated with Supabase integration
 * Purpose: Trang chủ với i18n support và realtime data từ Supabase
 * 
 * Thay đổi chính:
 * - Sử dụng hooks useNewArrivals, useTrendingOutfits, useForYouOutfits
 * - Thay thế mock data bằng data thật từ Supabase
 * - Giữ fallback với mock data khi không có data thật
 * - Thêm loading states và error handling
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MobileLayout } from '@/components/layout';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Sparkles,
  Flame,
  Clock,
  Star,
  Plus,
  ChevronRight,
  Play,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useTryOnHistory } from '@/hooks/useTryOnHistory';
import { useNewArrivals } from '@/hooks/useNewArrivals';
import { useTrendingOutfits } from '@/hooks/useTrendingOutfits';
import { useForYouOutfits } from '@/hooks/useForYouOutfits';

// Types
interface OutfitItem {
  id: string;
  imageUrl: string;
  user: { name: string; avatar: string };
  likes: number;
  comments: number;
  isSaved?: boolean;
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

// Mock data fallback
import { MOCK_TRYON_RESULTS, MOCK_OUTFITS } from '@/lib/mockData';

// Vietnamese names for mock users (fallback)
const VIETNAMESE_NAMES = [
  'Linh N.', 'Minh T.', 'Hà P.', 'Đức A.', 'Mai L.', 'Tuấn K.', 
  'Vy N.', 'Hoàng D.', 'An T.', 'Bình N.', 'Chi L.', 'Dung P.'
];

// Generate mock data fallback
const MOCK_NEW_ARRIVALS_FALLBACK: OutfitItem[] = MOCK_TRYON_RESULTS.slice(0, 4).map((url, idx) => ({
  id: `na${idx}`,
  imageUrl: url,
  user: { name: VIETNAMESE_NAMES[idx], avatar: '' },
  likes: [205, 312, 178, 289][idx] || 200,
  comments: [12, 23, 8, 15][idx] || 10,
}));

const MOCK_TRENDING_FALLBACK: OutfitItem[] = MOCK_TRYON_RESULTS.slice(4, 8).map((url, idx) => ({
  id: `tr${idx}`,
  imageUrl: url,
  user: { name: VIETNAMESE_NAMES[idx + 4], avatar: '' },
  likes: [487, 623, 512, 789][idx] || 500,
  comments: [34, 45, 28, 56][idx] || 30,
}));

const MOCK_FOR_YOU_FALLBACK: OutfitItem[] = [
  ...MOCK_OUTFITS.slice(0, 6).map((outfit, idx) => ({
    id: `fy${idx}`,
    imageUrl: outfit.result_image_url,
    user: { name: VIETNAMESE_NAMES[idx + 8] || `User ${idx}`, avatar: '' },
    likes: [234, 456, 189, 378, 512, 298][idx] || 200,
    comments: [18, 34, 12, 28, 42, 19][idx] || 15,
    isSaved: outfit.is_favorite,
  })),
  ...MOCK_TRYON_RESULTS.slice(8, 10).map((url, idx) => ({
    id: `fy${idx + 10}`,
    imageUrl: url,
    user: { name: VIETNAMESE_NAMES[(idx + 10) % VIETNAMESE_NAMES.length], avatar: '' },
    likes: [423, 345][idx] || 200,
    comments: [31, 25][idx] || 15,
  })),
];

// Section Header Component
function SectionHeader({
  icon: Icon,
  title,
  showViewAll = false,
  viewAllText,
  onViewAll,
}: {
  icon: React.ElementType;
  title: string;
  showViewAll?: boolean;
  viewAllText?: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 mb-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {showViewAll && (
        <button onClick={onViewAll} className="text-xs text-orange-500 flex items-center gap-0.5">
          {viewAllText}
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Horizontal Outfit Card
function HorizontalCard({ item, onTry }: { item: OutfitItem; onTry?: () => void }) {
  return (
    <div className="flex-shrink-0 w-32 rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-sm">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-orange-400/10 to-pink-500/10">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="Outfit" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-500/30 animate-spin" />
          </div>
        )}
        {/* Try button overlay */}
        <button
          onClick={onTry}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
        >
          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
        </button>
      </div>
      <div className="p-2">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-[6px] font-bold">
            {item.user.name.charAt(0)}
          </div>
          <span className="text-[10px] font-medium truncate">{item.user.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-0.5">
            <Heart className="w-2.5 h-2.5" />
            {item.likes}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5" />
            {item.comments}
          </span>
        </div>
      </div>
    </div>
  );
}

// Grid Card for "For You"
function GridCard({ item, onLike, onSave }: {
  item: OutfitItem;
  onLike: () => void;
  onSave: () => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(item.isSaved || false);

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-sm">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-orange-400/10 to-pink-500/10">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="Outfit" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-orange-500/30 animate-spin" />
          </div>
        )}
        {/* Save button */}
        <button
          onClick={() => { setIsSaved(!isSaved); onSave(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center"
        >
          <Bookmark className={`w-4 h-4 text-white ${isSaved ? 'fill-white' : ''}`} />
        </button>
        {/* Try button */}
        <Link
          href="/tryon"
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
        >
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </Link>
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold">
              {item.user.name.charAt(0)}
            </div>
            <span className="text-xs font-medium truncate">{item.user.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
          <button onClick={() => { setIsLiked(!isLiked); onLike(); }} className="flex items-center gap-1">
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{item.likes + (isLiked ? 1 : 0)}</span>
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {item.comments}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations('home');
  const { history, isLoading: historyLoading } = useTryOnHistory(10);
  
  // Fetch real data from Supabase
  const { data: newArrivals, isLoading: newArrivalsLoading } = useNewArrivals(8);
  const { data: trendingOutfits, isLoading: trendingLoading } = useTrendingOutfits(8);
  const { data: forYouOutfits, isLoading: forYouLoading } = useForYouOutfits(12);

  // Use real data if available, otherwise use mock data
  const displayNewArrivals = newArrivals.length > 0 ? newArrivals : MOCK_NEW_ARRIVALS_FALLBACK;
  const displayTrending = trendingOutfits.length > 0 ? trendingOutfits : MOCK_TRENDING_FALLBACK;
  const displayForYou = forYouOutfits.length > 0 ? forYouOutfits : MOCK_FOR_YOU_FALLBACK;

  return (
    <MobileLayout>
      <div className="animate-fade-in pb-2">

        {/* 1. YOUR RECENT LOOKS - Realtime synced */}
        <section className="py-3">
          <SectionHeader 
            icon={Clock} 
            title={t('recent_looks')} 
            showViewAll 
            viewAllText={t('view_all')}
            onViewAll={() => { }} 
          />
          <div className="px-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {/* NEW Try-On Button */}
              <Link
                href="/tryon"
                className="flex-shrink-0 w-16 h-24 rounded-xl border-2 border-dashed border-orange-500/50 bg-orange-500/5 flex flex-col items-center justify-center gap-1 hover:bg-orange-500/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-[9px] font-medium text-orange-500">{t('new_button')}</span>
              </Link>

              {/* Loading state */}
              {historyLoading && (
                <div className="flex-shrink-0 w-16 h-24 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500/50" />
                </div>
              )}

              {/* Real History Items from Database */}
              {!historyLoading && history.map((item) => (
                <Link
                  key={item.id}
                  href={`/tryon?result=${item.id}`}
                  className="flex-shrink-0 w-16 rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-sm hover:border-orange-500/50 transition-colors"
                >
                  <div className="relative h-24 bg-gradient-to-br from-pink-400/20 to-orange-500/20">
                    {item.result_image_url ? (
                      <img 
                        src={item.result_image_url} 
                        alt="Recent try-on" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-orange-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-1 left-1 right-1 text-[7px] text-white/80 text-center">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </Link>
              ))}

              {/* Empty state */}
              {!historyLoading && history.length === 0 && (
                <div className="flex-shrink-0 w-32 h-24 rounded-xl bg-[var(--muted)]/30 border border-dashed border-[var(--border)] flex items-center justify-center">
                  <span className="text-[10px] text-[var(--muted-foreground)] text-center px-2">
                    Chưa có lịch sử thử đồ
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. NEW ARRIVALS - Horizontal Scroll */}
        <section className="py-3">
          <SectionHeader 
            icon={Sparkles} 
            title={t('new_arrivals')} 
            showViewAll 
            viewAllText={t('view_all')}
          />
          <div className="px-3">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
              {newArrivalsLoading ? (
                // Loading state
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0 w-32 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                    <div className="aspect-[3/4] bg-gradient-to-br from-orange-400/10 to-pink-500/10 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500/30" />
                    </div>
                  </div>
                ))
              ) : (
                // Real data
                displayNewArrivals.map((item) => (
                  <HorizontalCard key={item.id} item={item} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* 3. TRENDING STYLES - Horizontal Scroll */}
        <section className="py-3">
          <SectionHeader 
            icon={Flame} 
            title={t('trending')} 
            showViewAll 
            viewAllText={t('view_all')}
          />
          <div className="px-3">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
              {trendingLoading ? (
                // Loading state
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0 w-32 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                    <div className="aspect-[3/4] bg-gradient-to-br from-orange-400/10 to-pink-500/10 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500/30" />
                    </div>
                  </div>
                ))
              ) : (
                // Real data
                displayTrending.map((item) => (
                  <HorizontalCard key={item.id} item={item} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* 4. FOR YOU - 2 Column Grid */}
        <section className="py-3 px-3">
          <SectionHeader icon={Star} title={t('for_you')} />
          <div className="grid grid-cols-2 gap-2.5">
            {forYouLoading ? (
              // Loading state
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--border)]">
                  <div className="aspect-[3/4] bg-gradient-to-br from-orange-400/10 to-pink-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500/30" />
                  </div>
                </div>
              ))
            ) : (
              // Real data
              displayForYou.map((item) => (
                <GridCard
                  key={item.id}
                  item={item}
                  onLike={() => { }}
                  onSave={() => { }}
                />
              ))
            )}
          </div>
        </section>

        {/* End of Feed */}
        <div className="py-4 text-center">
          <p className="text-xs text-[var(--muted-foreground)]">{t('end_of_feed')} ✨</p>
        </div>
      </div>
    </MobileLayout>
  );
}
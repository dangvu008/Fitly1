/**
 * File: proxy.ts
 * Purpose: Next.js proxy cho auth và i18n (thay thế middleware cũ)
 * Next.js 16 khuyên dùng proxy thay vì middleware export default
 */

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/popup',
  '/result/popup',
  '/api/auth',
  '/api/stripe/webhook',
  '/api/home',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = await updateSession(request);
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    return response;
  }
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !pathname.startsWith('/_next') && !pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)) {
    // Có thể thêm logic redirect nếu cần
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
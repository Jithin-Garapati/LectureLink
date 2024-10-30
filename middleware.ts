import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not signed in and trying to access protected routes
  if (!session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url));
  }

  // If user is signed in and trying to access auth routes
  if (session && (req.nextUrl.pathname === '/auth/sign-in')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/',
    '/auth/sign-in',
    '/lecture/:path*'  // Protect lecture routes as well
  ],
}; 
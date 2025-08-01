import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 🚫 Bloquear source maps em produção (SEGURANÇA CRÍTICA)
  if (process.env.NODE_ENV === 'production') {
    if (request.nextUrl.pathname.endsWith('.map') || 
        request.nextUrl.pathname.includes('_next/static/chunks/') ||
        request.nextUrl.pathname.includes('.ts') ||
        request.nextUrl.pathname.includes('.tsx')) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  // Headers básicos de segurança
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // 🛡️ Headers extras de segurança
  response.headers.set('X-Powered-By', '') // Remove header que revela tecnologia
  response.headers.set('Server', '') // Remove header do servidor
  
  // CSP mais restritivo
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'", // Bloqueia iframes
    "object-src 'none'", // Bloqueia plugins
    "base-uri 'self'", // Restringe <base>
    "form-action 'self'", // Restringe formulários
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)

  // HTTPS obrigatório em produção
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    
    // 🔒 Headers extras para produção
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

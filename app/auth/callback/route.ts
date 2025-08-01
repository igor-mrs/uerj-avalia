import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/'
  
  console.log('🔗 Callback recebido:', {
    searchParams: Object.fromEntries(requestUrl.searchParams.entries()),
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type
  })

  if (token_hash && type) {
    // Magic link - redirecionar para o client-side processar
    // O processamento de magic links deve acontecer no client-side
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('token_hash', token_hash)
    redirectUrl.searchParams.set('type', type)
    
    console.log('🔗 Redirecionando magic link para client-side')
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    // Código OAuth - também redirecionar para client-side processar
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('code', code)
    
    console.log('🔗 Redirecionando código OAuth para client-side')
    return NextResponse.redirect(redirectUrl)
  }

  // Fallback - redirecionar para home
  console.log('ℹ️ Callback sem parâmetros válidos, redirecionando para home')
  return NextResponse.redirect(new URL(next, request.url))
}

// Esta rota não é mais necessária com Supabase Auth
// O Supabase gerencia automaticamente o envio de emails de verificação
// Mantendo apenas para compatibilidade com código legado

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'Esta API foi substituída pelo Supabase Auth. Use o hook useAuth() para autenticação.',
    success: false,
    deprecated: true
  })
}

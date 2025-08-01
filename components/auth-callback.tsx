"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 Verificando hash da URL para sessão...')
        
        // Verificar se há hash fragments na URL (magic link)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const tokenType = hashParams.get('token_type')

        if (accessToken && refreshToken && tokenType) {
          console.log('🔗 Magic link detectado, estabelecendo sessão...')
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('❌ Erro ao estabelecer sessão:', error)
          } else {
            console.log('✅ Sessão estabelecida:', data.user?.email)
            
            // Limpar hash da URL
            window.history.replaceState(null, '', window.location.pathname)
            
            // Recarregar para atualizar estado da aplicação
            window.location.reload()
          }
        } else {
          console.log('ℹ️ Nenhum token encontrado no hash')
        }
      } catch (error) {
        console.error('❌ Erro no callback:', error)
      }
    }

    // Executar apenas no cliente
    if (typeof window !== 'undefined') {
      handleAuthCallback()
    }
  }, [router])

  return null // Componente invisível
}

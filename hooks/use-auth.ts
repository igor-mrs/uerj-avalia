import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Logging seguro para autenticação
const authLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUTH] ${message}`, data)
  }
}

const authError = (message: string, error?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[AUTH ERROR] ${message}`, error)
  } else {
    console.error(`[AUTH ERROR] ${message}`)
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      authLog('Inicializando autenticação...')
      
      // Verificar sessão atual do Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        authError('Erro ao obter sessão', error)
      } else {
        authLog('Sessão verificada', { hasSession: !!session, hasUser: !!session?.user })
      }
      
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initializeAuth()

    // Escutar mudanças na autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authLog('Auth state change', { event, hasUser: !!session?.user })
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Função para enviar magic link - APENAS SUPABASE com PKCE (mais seguro)
  const signInWithEmail = async (email: string) => {
    // Validação de email UERJ
    const emailRegex = /^[^\s@]+@graduacao\.uerj\.br$/
    if (!emailRegex.test(email)) {
      throw new Error('Use seu email institucional @graduacao.uerj.br')
    }

    authLog('Enviando magic link', { email })

    // Usar signInWithOtp que funciona com PKCE flow (mais seguro)
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        shouldCreateUser: true // Permitir criação automática de usuários UERJ
      }
    })

    if (error) {
      authError('Erro do Supabase', error)
      throw error
    }

    authLog('Magic link enviado com sucesso')
    return data
  }

  // Função para logout - APENAS SUPABASE
  const signOut = async () => {
    authLog('Fazendo logout')
    const { error } = await supabase.auth.signOut()
    if (error) {
      authError('Erro ao fazer logout', error)
      throw error
    }
    authLog('Logout realizado com sucesso')
  }

  return {
    user,
    loading,
    signInWithEmail,
    signOut,
    isAuthenticated: !!user,
    supabase
  }
}

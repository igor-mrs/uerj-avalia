"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SimpleAuthTest() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const testMagicLink = async () => {
    if (!email.endsWith('@graduacao.uerj.br')) {
      setMessage('❌ Use seu email @graduacao.uerj.br')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      console.log('🔄 Enviando magic link para:', email)
      console.log('🔧 APP URL:', process.env.NEXT_PUBLIC_APP_URL)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          shouldCreateUser: true
        }
      })

      console.log('📊 Resultado:', { data, error })

      if (error) {
        setMessage(`❌ Erro: ${error.message}`)
      } else {
        setMessage('✅ Magic link enviado! Verifique seu email e clique no link.')
      }
    } catch (err: any) {
      console.error('❌ Erro inesperado:', err)
      setMessage(`❌ Erro: ${err.message || 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const checkSupabaseConfig = async () => {
    try {
      console.log('🔧 Verificando configuração do Supabase...')
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
      
      // Teste simples para ver se o Supabase responde
      const { data, error } = await supabase.auth.getSession()
      console.log('📊 Teste de conexão:', { data: !!data, error })
      
      if (error) {
        setMessage(`❌ Erro de configuração: ${error.message}`)
      } else {
        setMessage('✅ Configuração do Supabase OK')
      }
    } catch (err: any) {
      console.error('❌ Erro de configuração:', err)
      setMessage(`❌ Erro de configuração: ${err.message}`)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🧪 Teste de Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="seu.email@graduacao.uerj.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={testMagicLink} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Enviando...' : '📧 Enviar Magic Link'}
          </Button>
          
          <Button 
            onClick={checkSupabaseConfig} 
            variant="outline"
            className="w-full"
          >
            🔧 Testar Configuração
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded text-sm ${
            message.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
        
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>URL Supabase:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
          <div><strong>App URL:</strong> {window.location.origin}</div>
          <div><strong>Callback:</strong> {window.location.origin}/auth/callback</div>
        </div>
      </CardContent>
    </Card>
  )
}

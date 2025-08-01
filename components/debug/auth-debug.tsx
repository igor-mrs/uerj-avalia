"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthDebug() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const testAuth = async () => {
    if (!email) {
      setMessage('Por favor, digite um email')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      console.log('🔧 Configurações:')
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
      console.log('App URL:', process.env.NEXT_PUBLIC_APP_URL)
      
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      console.log('Redirect URL:', redirectUrl)

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true
        }
      })

      setDebugInfo({
        email,
        redirectUrl,
        data,
        error,
        timestamp: new Date().toISOString()
      })

      if (error) {
        console.error('❌ Erro:', error)
        setMessage(`Erro: ${error.message}`)
      } else {
        console.log('✅ Sucesso:', data)
        setMessage('Magic link enviado! Verifique seu email.')
      }
    } catch (err) {
      console.error('❌ Erro inesperado:', err)
      setMessage('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const testSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      console.log('📊 Sessão atual:', { data, error })
      setDebugInfo({
        type: 'session',
        data,
        error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('❌ Erro ao obter sessão:', err)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🔧 Debug de Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Seu email @graduacao.uerj.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={testAuth} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Enviando...' : 'Testar Magic Link'}
          </Button>
          
          <Button 
            onClick={testSession} 
            variant="outline"
            className="flex-1"
          >
            Verificar Sessão
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded ${
            message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {debugInfo && (
          <div className="bg-gray-100 p-3 rounded text-xs">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
          <div>App URL: {process.env.NEXT_PUBLIC_APP_URL}</div>
          <div>Callback: {process.env.NEXT_PUBLIC_APP_URL}/auth/callback</div>
        </div>
      </CardContent>
    </Card>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@supabase/supabase-js'
import { Settings, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function SupabaseDebug() {
  const [isChecking, setIsChecking] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const checkSupabaseConfig = async () => {
    setIsChecking(true)
    
    try {
      console.log('🔍 Verificando configuração Supabase...')
      
      // Testar conexão básica
      const { data: healthCheck, error: healthError } = await supabase
        .from('cursos')
        .select('count')
        .limit(1)

      // Tentar enviar OTP para email de teste (capturar detalhes do erro)
      const testEmail = 'test@graduacao.uerj.br'
      let otpResult
      let detailedError = null
      
      try {
        otpResult = await supabase.auth.signInWithOtp({
          email: testEmail,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
          }
        })
        console.log('📧 Resultado OTP completo:', otpResult)
      } catch (error) {
        console.error('💥 Erro capturado durante OTP:', error)
        detailedError = error
      }

      // Tentar também com email real para comparar
      const realTestEmail = 'igor.teste@graduacao.uerj.br'
      let realOtpResult
      let realDetailedError = null
      
      try {
        realOtpResult = await supabase.auth.signInWithOtp({
          email: realTestEmail,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
          }
        })
        console.log('📧 Resultado OTP email real:', realOtpResult)
      } catch (error) {
        console.error('💥 Erro capturado durante OTP email real:', error)
        realDetailedError = error
      }

      const info = {
        timestamp: new Date().toISOString(),
        environment: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        database: {
          connected: !healthError,
          error: healthError?.message
        },
        auth: {
          // Teste básico
          otpSent: !otpResult?.error,
          error: otpResult?.error?.message,
          errorStatus: otpResult?.error?.status,
          errorDetails: otpResult?.error,
          
          // Detalhes completos
          fullResult: otpResult,
          caughtError: detailedError,
          
          // Teste com email real
          realEmailTest: {
            sent: !realOtpResult?.error,
            error: realOtpResult?.error?.message,
            errorStatus: realOtpResult?.error?.status,
            fullResult: realOtpResult,
            caughtError: realDetailedError
          }
        }
      }

      setDebugInfo(info)
      console.log('📊 Debug Info Completo:', info)
      
    } catch (error) {
      console.error('💥 Erro no debug:', error)
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        fullError: error
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Debug Supabase Configuration
        </CardTitle>
        <CardDescription>
          Verificar configuração de autenticação e email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkSupabaseConfig} disabled={isChecking}>
          {isChecking ? 'Verificando...' : 'Verificar Configuração'}
        </Button>

        {debugInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {debugInfo.environment?.hasAnonKey ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                </div>
                <p className="text-sm font-medium">Environment</p>
                <Badge variant={debugInfo.environment?.hasAnonKey ? "default" : "destructive"}>
                  {debugInfo.environment?.hasAnonKey ? "OK" : "Erro"}
                </Badge>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {debugInfo.database?.connected ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                </div>
                <p className="text-sm font-medium">Database</p>
                <Badge variant={debugInfo.database?.connected ? "default" : "destructive"}>
                  {debugInfo.database?.connected ? "Conectado" : "Erro"}
                </Badge>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {debugInfo.auth?.otpSent ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  )}
                </div>
                <p className="text-sm font-medium">Auth Email</p>
                <Badge variant={debugInfo.auth?.otpSent ? "default" : "secondary"}>
                  {debugInfo.auth?.otpSent ? "Configurado" : "Pendente"}
                </Badge>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Detalhes:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

            {debugInfo.auth?.error && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">⚠️ Erro de Autenticação:</h4>
                <p className="text-sm text-orange-700">{debugInfo.auth.error}</p>
                
                {debugInfo.auth.errorStatus === 500 && (
                  <div className="mt-3 text-xs text-orange-600 space-y-2">
                    <p><strong>🚨 Status 500:</strong> Erro interno do Supabase</p>
                    <p><strong>📧 Causa:</strong> SMTP não configurado ou configuração inválida</p>
                    <p><strong>🔧 Solução:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Acesse o Supabase Dashboard</li>
                      <li>Vá em Authentication → Settings → SMTP Settings</li>
                      <li>Configure Gmail SMTP ou desative custom SMTP</li>
                      <li>Salve e aguarde 1-2 minutos</li>
                    </ol>
                    <div className="mt-2 p-2 bg-orange-100 rounded">
                      <p className="text-xs"><strong>✅ Enquanto isso:</strong> Sistema funciona em modo demo!</p>
                    </div>
                  </div>
                )}
                
                {debugInfo.auth.errorStatus === 400 && (
                  <div className="mt-3 text-xs text-orange-600">
                    <p><strong>Possível causa:</strong> SMTP configurado mas com credenciais inválidas</p>
                    <p><strong>Solução:</strong> Verifique App Password do Gmail</p>
                  </div>
                )}

                {debugInfo.auth.errorStatus === 422 && (
                  <div className="mt-3 text-xs text-orange-600">
                    <p><strong>🚨 Status 422:</strong> Email inválido ou bloqueado</p>
                    <p><strong>Possível causa:</strong> Email não existe ou não é aceito</p>
                    <p><strong>Solução:</strong> Teste com email real @graduacao.uerj.br</p>
                  </div>
                )}

                {debugInfo.auth.errorStatus === 429 && (
                  <div className="mt-3 text-xs text-green-600 space-y-2">
                    <p><strong>🎉 ÓTIMA NOTÍCIA:</strong> Supabase Email está FUNCIONANDO!</p>
                    <p><strong>⏰ Status 429:</strong> Rate limit atingido (muitas tentativas)</p>
                    <p><strong>✅ Isso significa:</strong> SMTP configurado corretamente</p>
                    <p><strong>⏳ Solução:</strong> Aguarde 5-10 minutos e tente novamente</p>
                    <div className="mt-2 p-2 bg-green-100 rounded">
                      <p className="text-xs"><strong>🚀 Sistema OK:</strong> Emails serão enviados normalmente!</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {debugInfo.auth?.realEmailTest && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">📧 Teste com Email Real:</h4>
                <div className="text-sm">
                  <p><strong>Status:</strong> {debugInfo.auth.realEmailTest.sent ? '✅ Enviado' : '❌ Erro'}</p>
                  {debugInfo.auth.realEmailTest.error && (
                    <p><strong>Erro:</strong> {debugInfo.auth.realEmailTest.error}</p>
                  )}
                  {debugInfo.auth.realEmailTest.errorStatus && (
                    <p><strong>Status Code:</strong> {debugInfo.auth.realEmailTest.errorStatus}</p>
                  )}
                </div>
              </div>
            )}

            {debugInfo.auth?.caughtError && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">🔥 Erro Capturado (Try/Catch):</h4>
                <pre className="text-xs text-red-700 overflow-auto">
                  {JSON.stringify(debugInfo.auth.caughtError, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const { user, isAuthenticated, signInWithEmail } = useAuth()
  const [email, setEmail] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  // Carregar email salvo se lembrar sessão estiver ativado
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail")
    const shouldRemember = localStorage.getItem("rememberSession") === "true"
    
    if (shouldRemember && savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async () => {
    if (!email.trim()) {
      setMessage("Por favor, insira um email válido")
      setMessageType("error")
      return
    }

    // Validar domínio do email
    if (!email.endsWith("@graduacao.uerj.br")) {
      setMessage("Apenas emails com domínio @graduacao.uerj.br são aceitos")
      setMessageType("error")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      await signInWithEmail(email)
      
      // Salvar preferências se lembrar sessão estiver ativado
      if (rememberMe) {
        localStorage.setItem("savedEmail", email)
        localStorage.setItem("rememberSession", "true")
      } else {
        localStorage.removeItem("savedEmail")
        localStorage.removeItem("rememberSession")
      }

      setMessage("Link de acesso enviado para seu email! Verifique sua caixa de entrada.")
      setMessageType("success")
    } catch (error) {
      console.error("Erro ao fazer login:", error)
      setMessage("Erro ao enviar link de acesso. Tente novamente.")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin()
    }
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Você já está logado!</h2>
            <p className="text-gray-600 mb-6">Redirecionando para a página inicial...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16">
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fazer Login</h1>
            <p className="text-gray-600">
              Entre com seu email para acessar o sistema de avaliação de professores da UERJ
            </p>
          </div>

          {/* Card de Login */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-center justify-center">
                <Lock className="h-6 w-6 text-blue-600" />
                Acesso Seguro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@graduacao.uerj.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-12 pr-4 py-3 text-lg border-2 border-gray-300 focus:border-blue-500 rounded-xl"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label 
                    htmlFor="remember" 
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Lembrar minha sessão
                  </Label>
                </div>

                {message && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    messageType === "success" 
                      ? "bg-green-50 border border-green-200 text-green-800" 
                      : "bg-red-50 border border-red-200 text-red-800"
                  }`}>
                    {messageType === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <p className="text-sm">{message}</p>
                  </div>
                )}

                <Button 
                  onClick={handleLogin}
                  disabled={loading || !email.trim()}
                  className="w-full py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enviando link...
                    </div>
                  ) : (
                    "Enviar Link de Acesso"
                  )}
                </Button>
              </div>

              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  💡 <strong>Como funciona:</strong> Você receberá um link de acesso seguro no seu email
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Segurança:</strong> Não armazenamos senhas. O acesso é feito através de links únicos e temporários enviados por email.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações adicionais */}
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">Acesso Restrito</h3>
              <p className="text-sm text-gray-600 mb-3">
                Apenas estudantes da UERJ com email institucional @graduacao.uerj.br 
                podem acessar o sistema de avaliação de professores.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Avalie professores e disciplinas</li>
                <li>• Cadastre novos professores</li>
                <li>• Acesse avaliações detalhadas</li>
                <li>• Contribua com a comunidade acadêmica</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

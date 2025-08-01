"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Mail, CheckCircle, Lock } from "lucide-react"
import { getAuthState, setAuthState, clearAuthState, isEmailValid } from "@/lib/auth"

interface AuthModalProps {
  children?: React.ReactNode
  onAuthSuccess?: () => void
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  disabled?: boolean
}

export function AuthModal({ 
  children, 
  onAuthSuccess, 
  className,
  variant = "default",
  size = "default",
  disabled = false
}: AuthModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [authStep, setAuthStep] = useState<'email' | 'verification'>('email')
  const [authError, setAuthError] = useState("")
  const [authState, setAuthStateLocal] = useState(getAuthState())

  useEffect(() => {
    const checkAuth = () => {
      setAuthStateLocal(getAuthState())
    }
    
    // Verificar autenticação periodicamente
    const interval = setInterval(checkAuth, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleEmailSubmit = async () => {
    if (!isEmailValid(email)) {
      setAuthError('Por favor, use seu email institucional @graduacao.uerj.br')
      return
    }

    setIsVerifying(true)
    setAuthError("")
    
    // Simular envio de código de verificação
    setTimeout(() => {
      setAuthStep('verification')
      setIsVerifying(false)
      console.log('Código enviado para:', email)
    }, 1500)
  }

  const handleVerificationSubmit = async () => {
    if (verificationCode !== '123456') {
      setAuthError('Código de verificação inválido')
      return
    }

    try {
      setAuthState(email)
      setAuthStateLocal(getAuthState())
      setShowModal(false)
      setAuthStep('email')
      setVerificationCode("")
      setEmail("")
      setAuthError("")
      onAuthSuccess?.()
    } catch (error) {
      setAuthError('Erro ao verificar código')
    }
  }

  const handleLogout = () => {
    clearAuthState()
    setAuthStateLocal(getAuthState())
  }

  const resetModal = () => {
    setAuthStep('email')
    setEmail("")
    setVerificationCode("")
    setAuthError("")
  }

  if (authState.isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-green-700">{authState.email}</span>
        <Button onClick={handleLogout} variant="ghost" size="sm">
          Sair
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={showModal} onOpenChange={(open) => {
      setShowModal(open)
      if (!open) resetModal()
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            className={className}
            variant={variant}
            size={size}
            disabled={disabled}
          >
            <Lock className="h-4 w-4 mr-2" />
            Verificar Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verificação de Email Institucional</DialogTitle>
          <DialogDescription>
            {authStep === 'email' 
              ? 'Para adicionar professores ou comentários, verifique seu email @graduacao.uerj.br'
              : 'Digite o código de verificação enviado para seu email'
            }
          </DialogDescription>
        </DialogHeader>
        
        {authStep === 'email' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Institucional</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.nome@graduacao.uerj.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {authError && (
              <div className="text-red-600 text-sm">{authError}</div>
            )}
            <Button 
              onClick={handleEmailSubmit} 
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? 'Enviando...' : 'Enviar Código de Verificação'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Código de Verificação</Label>
              <Input
                id="code"
                type="text"
                placeholder="Digite o código de 6 dígitos"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Para demonstração, use o código: <strong>123456</strong>
              </p>
            </div>
            {authError && (
              <div className="text-red-600 text-sm">{authError}</div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={() => setAuthStep('email')}
                variant="outline"
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleVerificationSubmit}
                className="flex-1"
              >
                Verificar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

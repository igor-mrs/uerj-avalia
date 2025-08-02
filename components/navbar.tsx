"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, User, Bug, Menu, Home } from 'lucide-react'
import { useState } from 'react'
import { SimpleModal } from "@/components/ui/simple-modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createFeedback } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { user, loading, signOut, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState({ tipo: 'erro' as 'erro' | 'sugestao' | 'bug', titulo: '', descricao: '' })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const handleEnviarFeedback = async () => {
    if (!feedback.titulo.trim() || !feedback.descricao.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título e a descrição",
      })
      return
    }

    if (!user?.email) {
      toast({
        variant: "destructive",
        title: "Login necessário",
        description: "Você precisa estar logado para enviar feedback",
      })
      return
    }

    setSubmittingFeedback(true)
    try {
      await createFeedback(
        user.email,
        feedback.tipo,
        feedback.titulo,
        feedback.descricao,
        typeof window !== 'undefined' ? window.location.pathname : undefined
      )

      setFeedback({ tipo: 'erro' as 'erro' | 'sugestao' | 'bug', titulo: '', descricao: '' })
      setShowFeedbackModal(false)
      
      toast({
        title: "Feedback enviado!",
        description: "Obrigado pelo seu feedback. Ele nos ajuda a melhorar o sistema!",
      })
    } catch (error) {
      console.error("Erro ao enviar feedback:", error)
      toast({
        variant: "destructive",
        title: "Erro ao enviar feedback",
        description: "Tente novamente em alguns instantes",
      })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary">
              UERJ Avalia
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-sm font-medium">
                  Início
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="text-sm font-medium"
                onClick={() => setShowFeedbackModal(true)}
              >
                Reportar Erro
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-gray-700">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button className="text-sm font-medium">
                  Entrar
                </Button>
              </Link>
            )}
            
            {/* Menu móvel */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Início
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowFeedbackModal(true)}>
                    <Bug className="h-4 w-4 mr-2" />
                    Reportar Erro
                  </DropdownMenuItem>
                  
                  {isAuthenticated && user ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.email?.split('@')[0]}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-600"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/login" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Entrar
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
    
    {/* Modal de Feedback Simples */}
    <SimpleModal
      isOpen={showFeedbackModal}
      onClose={() => setShowFeedbackModal(false)}
      title="Reportar Problema ou Sugestão"
      className="max-w-md sm:max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo *</Label>
          <Select value={feedback.tipo} onValueChange={(value) => setFeedback({ ...feedback, tipo: value as 'erro' | 'sugestao' | 'bug' })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="erro">Erro no Sistema</SelectItem>
              <SelectItem value="bug">Bug/Falha</SelectItem>
              <SelectItem value="sugestao">Sugestão de Melhoria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            value={feedback.titulo}
            onChange={(e) => setFeedback({ ...feedback, titulo: e.target.value })}
            placeholder="Descreva brevemente o problema..."
          />
        </div>
        <div>
          <Label htmlFor="descricao">Descrição *</Label>
          <Textarea
            id="descricao"
            value={feedback.descricao}
            onChange={(e) => setFeedback({ ...feedback, descricao: e.target.value })}
            placeholder="Detalhe o problema ou sua sugestão..."
            rows={4}
          />
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleEnviarFeedback}
            disabled={submittingFeedback || !feedback.titulo.trim() || !feedback.descricao.trim()}
            className="flex-1"
          >
            {submittingFeedback ? "Enviando..." : "Enviar Feedback"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFeedbackModal(false)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </SimpleModal>
    </>
  )
}

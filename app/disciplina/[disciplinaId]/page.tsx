"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Star, Plus, Sparkles, User, Lock, Shield, BookOpen, MessageSquare } from "lucide-react"
import Link from "next/link"
import { use } from "react"
import {
  getDisciplinaByCode,
  getDisciplinaCompleta,
  getProfessoresByDisciplina,
  createProfessor,
  linkProfessorToDisciplina,
  createAvaliacao,
  checkUserAvaliacao,
} from "@/lib/database"
import type { ProfessorStats } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface PageProps {
  params: Promise<{ disciplinaId: string }>
}

export default function DisciplinaPage({ params }: PageProps) {
  const { disciplinaId } = use(params)
  const { user, isAuthenticated, signInWithEmail } = useAuth()
  const { toast } = useToast()
  const [disciplina, setDisciplina] = useState<any>(null)
  const [professores, setProfessores] = useState<ProfessorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingProf, setSubmittingProf] = useState(false)
  const [submittingAvaliacao, setSubmittingAvaliacao] = useState(false)
  const [novoProf, setNovoProf] = useState({ nome: "", email: "" })
  const [avaliacao, setAvaliacao] = useState({ professor: "", estrelas: 0, comentario: "" })
  const [showResumoIA, setShowResumoIA] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authEmail, setAuthEmail] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [showProfessorModal, setShowProfessorModal] = useState(false)
  const [searchProfessor, setSearchProfessor] = useState("")
  const [professoresExistentes, setProfessoresExistentes] = useState<any[]>([])
  const [selectedProfessor, setSelectedProfessor] = useState<any>(null)
  const [showCreateNew, setShowCreateNew] = useState(false)

  // Função para fazer login
  const handleLogin = async () => {
    if (!authEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      })
      return
    }

    // Validar domínio do email
    if (!authEmail.endsWith("@graduacao.uerj.br")) {
      toast({
        title: "Email inválido",
        description: "Apenas emails com domínio @graduacao.uerj.br são aceitos",
        variant: "destructive",
      })
      return
    }

    setAuthLoading(true)
    try {
      await signInWithEmail(authEmail)
      toast({
        title: "Link enviado!",
        description: "Verifique seu email para acessar sua conta",
      })
      setShowAuthModal(false)
      setAuthEmail("")
    } catch (error) {
      console.error("Erro ao fazer login:", error)
      toast({
        title: "Erro ao enviar link",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      })
    } finally {
      setAuthLoading(false)
    }
  }

  // Função utilitária para pluralização de avaliações
  const formatAvaliacoes = (count: number): string => {
    if (count === 0) return 'Nenhuma avaliação'
    if (count === 1) return '1 avaliação'
    return `${count} avaliações`
  }

  useEffect(() => {
    async function loadData() {
      try {
        const disciplinaData = await getDisciplinaByCode(disciplinaId)
        if (disciplinaData) {
          const [disciplinaCompleta, professoresData] = await Promise.all([
            getDisciplinaCompleta(disciplinaData.id),
            getProfessoresByDisciplina(disciplinaData.id),
          ])

          setDisciplina(disciplinaCompleta)
          setProfessores(professoresData)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [disciplinaId])

  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => interactive && onStarClick?.(star)}
          />
        ))}
      </div>
    )
  }

  const handleCadastrarProfessor = async () => {
    console.log("handleCadastrarProfessor chamado", { novoProf, disciplina })
    
    if (!novoProf.nome.trim() || !disciplina) {
      console.log("Validação falhou", { nome: novoProf.nome.trim(), disciplina: !!disciplina })
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do professor",
      })
      return
    }

    setSubmittingProf(true)
    try {
      console.log("Criando professor...")
      const professor = await createProfessor(novoProf.nome, novoProf.email || undefined)
      console.log("Professor criado:", professor)
      
      console.log("Associando professor à disciplina...")
      await linkProfessorToDisciplina(professor.id, disciplina.id)
      
      console.log("Recarregando lista de professores...")
      // Recarregar lista de professores
      const professoresData = await getProfessoresByDisciplina(disciplina.id)
      setProfessores(professoresData)

      setNovoProf({ nome: "", email: "" })
      setShowProfessorModal(false)
      setShowCreateNew(false)
      
      toast({
        title: "Professor cadastrado!",
        description: `${novoProf.nome} foi adicionado à disciplina com sucesso`,
      })
    } catch (error) {
      console.error("Erro ao cadastrar professor:", error)
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar professor",
        description: "Tente novamente em alguns instantes",
      })
    } finally {
      setSubmittingProf(false)
    }
  }

  const searchProfessoresExistentes = async (termo: string) => {
    if (termo.length < 2) {
      setProfessoresExistentes([])
      return
    }

    try {
      const { supabase } = await import("@/lib/supabase")
      const { data, error } = await supabase
        .from("professores")
        .select("id, nome, email")
        .ilike("nome", `%${termo}%`)
        .limit(10)

      if (error) throw error
      setProfessoresExistentes(data || [])
    } catch (error) {
      console.error("Erro ao buscar professores:", error)
      setProfessoresExistentes([])
    }
  }

  const associarProfessorExistente = async (professor: any) => {
    if (!disciplina) return

    setSubmittingProf(true)
    try {
      await linkProfessorToDisciplina(professor.id, disciplina.id)

      // Recarregar lista de professores
      const professoresData = await getProfessoresByDisciplina(disciplina.id)
      setProfessores(professoresData)

      setShowProfessorModal(false)
      setSelectedProfessor(null)
      setSearchProfessor("")
      
      toast({
        title: "Professor associado!",
        description: `${professor.nome} foi associado à disciplina com sucesso`,
      })
    } catch (error) {
      console.error("Erro ao associar professor:", error)
      toast({
        variant: "destructive",
        title: "Erro ao associar professor",
        description: "Tente novamente em alguns instantes",
      })
    } finally {
      setSubmittingProf(false)
    }
  }

  const handleAvaliarProfessor = async (professorId: string) => {
    console.log('🚀 Iniciando avaliação de professor:', { professorId, avaliacao, disciplina: disciplina?.id })
    
    if (avaliacao.estrelas === 0 || !disciplina) {
      console.log('❌ Validação falhou:', { estrelas: avaliacao.estrelas, disciplina: !!disciplina })
      return
    }

    if (!user?.id) {
      console.log('❌ Usuário não autenticado')
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Você precisa estar logado para avaliar professores",
      })
      return
    }

    setSubmittingAvaliacao(true)
    try {
      console.log('🔍 Verificando se já avaliou...')
      // Verificar se já avaliou
      const jaAvaliou = await checkUserAvaliacao(professorId, disciplina.id, user.id)
      console.log('📊 Resultado da verificação:', jaAvaliou)
      
      if (jaAvaliou) {
        console.log('⚠️ Já avaliou este professor')
        toast({
          variant: "destructive",
          title: "Avaliação já enviada",
          description: "Você já avaliou este professor nesta disciplina",
        })
        return
      }

      console.log('✅ Criando nova avaliação...')
      await createAvaliacao(
        professorId,
        disciplina.id,
        user.id,
        avaliacao.estrelas,
        avaliacao.comentario || undefined,
      )

      console.log('🔄 Recarregando dados dos professores...')
      // Recarregar dados dos professores
      const professoresData = await getProfessoresByDisciplina(disciplina.id)
      setProfessores(professoresData)

      setAvaliacao({ professor: "", estrelas: 0, comentario: "" })
      
      console.log('✅ Avaliação criada com sucesso!')
      toast({
        title: "Avaliação enviada!",
        description: "Sua avaliação foi registrada com sucesso",
      })
    } catch (error) {
      console.error("❌ Erro ao enviar avaliação:", error)
      toast({
        variant: "destructive",
        title: "Erro ao enviar avaliação",
        description: "Tente novamente em alguns instantes",
      })
    } finally {
      setSubmittingAvaliacao(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando disciplina...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 p-4 mt-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{disciplina?.nome || 'Carregando...'}</h1>
            <p className="text-gray-600">
              {disciplina?.codigo || ''} 
            </p>
          </div>
        </div>

        {/* Card de informações da disciplina */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Informações da Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Código</span>
                </div>
                <p className="text-lg font-semibold">{disciplina?.codigo}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Professores</span>
                </div>
                <p className="text-lg font-semibold">{professores.length}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Avaliações</span>
                </div>
                <p className="text-lg font-semibold">
                  {professores.reduce((total, prof) => total + prof.total_avaliacoes, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professores da disciplina */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <User className="h-6 w-6 text-green-600" />
                Professores
              </CardTitle>
              {isAuthenticated ? (
                <Dialog open={showProfessorModal} onOpenChange={setShowProfessorModal}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setShowProfessorModal(true)
                        setShowCreateNew(false)
                        setSearchProfessor("")
                        setProfessoresExistentes([])
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Professor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Professor à Disciplina</DialogTitle>
                      <DialogDescription>
                        Busque um professor existente ou cadastre um novo
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!showCreateNew ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="search">Buscar Professor Existente</Label>
                          <Input
                            id="search"
                            value={searchProfessor}
                            onChange={(e) => {
                              setSearchProfessor(e.target.value)
                              searchProfessoresExistentes(e.target.value)
                            }}
                            placeholder="Digite o nome do professor..."
                          />
                        </div>
                        
                        {professoresExistentes.length > 0 && (
                          <div className="border rounded-lg max-h-40 overflow-y-auto">
                            {professoresExistentes.map((prof) => (
                              <div 
                                key={prof.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                                onClick={() => setSelectedProfessor(prof)}
                              >
                                <div>
                                  <p className="font-medium">{prof.nome}</p>
                                  {prof.email && <p className="text-sm text-gray-500">{prof.email}</p>}
                                </div>
                                {selectedProfessor?.id === prof.id && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      associarProfessorExistente(prof)
                                    }}
                                    disabled={submittingProf}
                                  >
                                    {submittingProf ? "Associando..." : "Associar"}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {searchProfessor.length >= 2 && professoresExistentes.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            Nenhum professor encontrado com esse nome.
                          </div>
                        )}
                        
                        <div className="flex gap-3 pt-4 border-t">
                          <Button 
                            variant="outline"
                            onClick={() => setShowCreateNew(true)}
                            className="flex-1"
                          >
                            Criar Novo Professor
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nome">Nome do Professor *</Label>
                          <Input
                            id="nome"
                            value={novoProf.nome}
                            onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })}
                            placeholder="Ex: Dr. João Silva Santos"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">E-mail Institucional (opcional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={novoProf.email}
                            onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })}
                            placeholder="professor@uerj.br"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline"
                            onClick={() => setShowCreateNew(false)}
                            className="flex-1"
                          >
                            Voltar à Busca
                          </Button>
                          <Button 
                            onClick={handleCadastrarProfessor}
                            disabled={submittingProf || !novoProf.nome.trim()}
                            className="flex-1"
                          >
                            {submittingProf ? "Cadastrando..." : "Cadastrar Professor"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              ) : (
                <Link href="/login">
                  <Button 
                    variant="outline"
                    size="sm"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Login para Cadastrar
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {professores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {professores.map((professor) => (
                  <Card key={professor.id} className="hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Link 
                          href={`/professor/${professor.id}`}
                          className="hover:text-blue-600 transition-colors flex-1"
                        >
                          <h4 className="font-medium text-gray-900 mb-1 hover:underline">{professor.nome}</h4>
                        </Link>
                        {professor.total_avaliacoes > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{professor.media_avaliacoes.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatAvaliacoes(professor.total_avaliacoes)}
                      </p>
                      
                      <div className="mt-3 flex gap-2">
                        {isAuthenticated ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="flex-1"
                              >
                                Avaliar Professor
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Avaliar {professor.nome}</DialogTitle>
                                <DialogDescription>
                                  Compartilhe sua experiência com este professor na disciplina {disciplina?.nome}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Nota *</Label>
                                  <div className="mt-2">
                                    {renderStars(avaliacao.estrelas, true, (star) =>
                                      setAvaliacao({ ...avaliacao, estrelas: star })
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="comentario">Comentário (opcional)</Label>
                                  <Textarea
                                    id="comentario"
                                    value={avaliacao.comentario}
                                    onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })}
                                    placeholder="Conte como foi sua experiência..."
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <Button 
                                    onClick={() => handleAvaliarProfessor(professor.id)}
                                    disabled={submittingAvaliacao || avaliacao.estrelas === 0}
                                    className="flex-1"
                                  >
                                    {submittingAvaliacao ? "Enviando..." : "Enviar Avaliação"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Link href="/login" className="flex-1">
                            <Button 
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Login para Avaliar
                            </Button>
                          </Link>
                        )}
                        
                        <Link href={`/professor/${professor.id}`}>
                          <Button 
                            variant="outline"
                            size="sm"
                          >
                            Ver Perfil
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum professor cadastrado</h3>
                <p className="text-gray-600 mb-4">Seja o primeiro a cadastrar um professor para esta disciplina</p>
                
                {isAuthenticated ? (
                  <Dialog open={showProfessorModal} onOpenChange={setShowProfessorModal}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setShowProfessorModal(true)
                          setShowCreateNew(false)
                          setSearchProfessor("")
                          setProfessoresExistentes([])
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Primeiro Professor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Adicionar Professor à Disciplina</DialogTitle>
                        <DialogDescription>
                          Busque um professor existente ou cadastre um novo
                        </DialogDescription>
                      </DialogHeader>
                      
                      {!showCreateNew ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="search">Buscar Professor Existente</Label>
                            <Input
                              id="search"
                              value={searchProfessor}
                              onChange={(e) => {
                                setSearchProfessor(e.target.value)
                                searchProfessoresExistentes(e.target.value)
                              }}
                              placeholder="Digite o nome do professor..."
                            />
                          </div>
                          
                          {professoresExistentes.length > 0 && (
                            <div className="border rounded-lg max-h-40 overflow-y-auto">
                              {professoresExistentes.map((prof) => (
                                <div 
                                  key={prof.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                                  onClick={() => setSelectedProfessor(prof)}
                                >
                                  <div>
                                    <p className="font-medium">{prof.nome}</p>
                                    {prof.email && <p className="text-sm text-gray-500">{prof.email}</p>}
                                  </div>
                                  {selectedProfessor?.id === prof.id && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        associarProfessorExistente(prof)
                                      }}
                                      disabled={submittingProf}
                                    >
                                      {submittingProf ? "Associando..." : "Associar"}
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {searchProfessor.length >= 2 && professoresExistentes.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                              Nenhum professor encontrado com esse nome.
                            </div>
                          )}
                          
                          <div className="flex gap-3 pt-4 border-t">
                            <Button 
                              variant="outline"
                              onClick={() => setShowCreateNew(true)}
                              className="flex-1"
                            >
                              Criar Novo Professor
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nome">Nome do Professor *</Label>
                            <Input
                              id="nome"
                              value={novoProf.nome}
                              onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })}
                              placeholder="Ex: Dr. João Silva Santos"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">E-mail Institucional (opcional)</Label>
                            <Input
                              id="email"
                              type="email"
                              value={novoProf.email}
                              onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })}
                              placeholder="professor@uerj.br"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline"
                              onClick={() => setShowCreateNew(false)}
                              className="flex-1"
                            >
                              Voltar à Busca
                            </Button>
                            <Button 
                              onClick={handleCadastrarProfessor}
                              disabled={submittingProf || !novoProf.nome.trim()}
                              className="flex-1"
                            >
                              {submittingProf ? "Cadastrando..." : "Cadastrar Professor"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Link href="/login">
                    <Button variant="outline">
                      <Lock className="h-4 w-4 mr-2" />
                      Fazer Login para Cadastrar Professor
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Login */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fazer Login</DialogTitle>
            <DialogDescription>
              Insira seu email para receber um link de acesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="seu@graduacao.uerj.br"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleLogin} 
                disabled={authLoading}
                className="flex-1"
              >
                {authLoading ? "Enviando..." : "Enviar Link de Acesso"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAuthModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

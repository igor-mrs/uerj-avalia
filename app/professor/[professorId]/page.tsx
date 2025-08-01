"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Star, User, Mail, BookOpen, MessageSquare, Plus, Lock, Award, TrendingUp } from "lucide-react"
import Link from "next/link"
import { use } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
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

interface PageProps {
  params: Promise<{ professorId: string }>
}

interface Professor {
  id: string
  nome: string
  email?: string
}

interface Avaliacao {
  id: string
  estrelas: number
  comentario?: string
  created_at: string
  disciplinas: {
    nome: string
    codigo: string
  } | null
}

interface DisciplinaAssociada {
  id: string
  nome: string
  codigo: string
  total_avaliacoes: number
  media_estrelas: number
}

export default function ProfessorPage({ params }: PageProps) {
  const { professorId } = use(params)
  const { user, isAuthenticated, signInWithEmail } = useAuth()
  const { toast } = useToast()
  const [professor, setProfessor] = useState<Professor | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [disciplinas, setDisciplinas] = useState<DisciplinaAssociada[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAvaliacoes: 0,
    mediaEstrelas: 0,
    totalDisciplinas: 0
  })
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false)
  const [novaAvaliacao, setNovaAvaliacao] = useState({
    disciplinaId: "",
    estrelas: 0,
    comentario: ""
  })

  useEffect(() => {
    loadProfessorData()
  }, [professorId])

  // Função utilitária para pluralização de avaliações
  const formatAvaliacoes = (count: number): string => {
    if (count === 0) return 'Nenhuma avaliação'
    if (count === 1) return '1 avaliação'
    return `${count} avaliações`
  }

  const loadProfessorData = async () => {
    try {
      // Buscar dados do professor
      const { data: professorData, error: professorError } = await supabase
        .from("professores")
        .select("id, nome, email")
        .eq("id", professorId)
        .single()

      if (professorError) throw professorError
      setProfessor(professorData)

      // Buscar avaliações do professor
      const { data: avaliacoesData, error: avaliacoesError } = await supabase
        .from("avaliacoes")
        .select(`
          id,
          estrelas,
          comentario,
          created_at,
          disciplinas (
            nome,
            codigo
          )
        `)
        .eq("professor_id", professorId)
        .order("created_at", { ascending: false })

      if (avaliacoesError) throw avaliacoesError
      
      // Corrigir o tipo das avaliações
      const avaliacoesFormatadas = (avaliacoesData || []).map(av => ({
        ...av,
        disciplinas: Array.isArray(av.disciplinas) ? av.disciplinas[0] : av.disciplinas
      }))
      setAvaliacoes(avaliacoesFormatadas)

      // Buscar disciplinas associadas com estatísticas
      const { data: disciplinasData, error: disciplinasError } = await supabase
        .from("professor_disciplinas")
        .select(`
          disciplinas (
            id,
            nome,
            codigo
          )
        `)
        .eq("professor_id", professorId)

      if (disciplinasError) throw disciplinasError

      // Para cada disciplina, calcular estatísticas
      const disciplinasComStats = await Promise.all(
        (disciplinasData || []).map(async (item) => {
          const disciplina = item.disciplinas as any
          
          // Buscar avaliações específicas desta disciplina para este professor
          const { data: disciplinaAvaliacoes } = await supabase
            .from("avaliacoes")
            .select("estrelas")
            .eq("professor_id", professorId)
            .eq("disciplina_id", disciplina.id)

          const totalAvaliacoes = disciplinaAvaliacoes?.length || 0
          const mediaEstrelas = totalAvaliacoes > 0 && disciplinaAvaliacoes
            ? disciplinaAvaliacoes.reduce((sum, av) => sum + av.estrelas, 0) / totalAvaliacoes
            : 0

          return {
            id: disciplina.id,
            nome: disciplina.nome,
            codigo: disciplina.codigo,
            total_avaliacoes: totalAvaliacoes,
            media_estrelas: Number(mediaEstrelas.toFixed(1))
          }
        })
      )

      setDisciplinas(disciplinasComStats)

      // Calcular estatísticas gerais
      const totalAvaliacoes = avaliacoesData?.length || 0
      const mediaEstrelas = totalAvaliacoes > 0
        ? avaliacoesData.reduce((sum, av) => sum + av.estrelas, 0) / totalAvaliacoes
        : 0

      setStats({
        totalAvaliacoes,
        mediaEstrelas: Number(mediaEstrelas.toFixed(1)),
        totalDisciplinas: disciplinasComStats.length
      })

    } catch (error) {
      console.error("Erro ao carregar dados do professor:", error)
    } finally {
      setLoading(false)
    }
  }

  // Função para criar avaliação
  const handleCreateAvaliacao = async () => {
    console.log('🚀 Iniciando criação de avaliação')
    
    if (!novaAvaliacao.disciplinaId || novaAvaliacao.estrelas === 0) {
      console.log('❌ Campos obrigatórios faltando')
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, selecione uma disciplina e dê uma nota",
      })
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

    try {
      console.log('🔍 Verificando avaliação existente para:', {
        professorId,
        disciplinaId: novaAvaliacao.disciplinaId,
        usuarioId: user.id
      })

      // Verificar se já avaliou esta combinação professor/disciplina
      const { data: existingAvaliacoes, error: checkError } = await supabase
        .from("avaliacoes")
        .select("id")
        .eq("professor_id", professorId)
        .eq("disciplina_id", novaAvaliacao.disciplinaId)
        .eq("usuario_id", user.id)

      console.log('📊 Resultado da verificação:', { existingAvaliacoes, checkError })

      if (checkError) {
        console.error('❌ Erro ao verificar avaliação existente:', checkError)
        // Se houver erro na verificação, tentar inserir e deixar o banco decidir
      } else if (existingAvaliacoes && existingAvaliacoes.length > 0) {
        console.log('⚠️ Avaliação já existe, mostrando toast')
        
        toast({
          title: "⚠️ Avaliação já existe",
          description: "Você já avaliou este professor nesta disciplina",
          variant: "destructive",
        })
        
        return
      }

      console.log('✅ Nenhuma avaliação existente encontrada, prosseguindo com inserção')

      const { data, error } = await supabase
        .from("avaliacoes")
        .insert({
          professor_id: professorId,
          disciplina_id: novaAvaliacao.disciplinaId,
          usuario_id: user.id,
          estrelas: novaAvaliacao.estrelas,
          comentario: novaAvaliacao.comentario.trim() || null
        })
        .select()

      console.log('📝 Resultado da inserção:', { data, error })

      if (error) {
        console.error('❌ Erro Supabase:', error)
        
        // Se for erro de duplicata (unique constraint violation)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
          console.log('🔄 Erro de duplicata detectado')
          toast({
            variant: "destructive",
            title: "Avaliação já existe",
            description: "Você já avaliou este professor nesta disciplina",
          })
          return
        }
        
        throw error
      }

      console.log('Avaliação criada:', data)

      toast({
        title: "Avaliação enviada!",
        description: "Sua avaliação foi registrada com sucesso",
      })
      
      setShowAvaliacaoModal(false)
      setNovaAvaliacao({ disciplinaId: "", estrelas: 0, comentario: "" })
      loadProfessorData() // Recarregar dados
    } catch (error) {
      console.error("Erro ao criar avaliação:", error)
      toast({
        variant: "destructive",
        title: "Erro ao criar avaliação",
        description: `Erro: ${error instanceof Error ? error.message : 'Tente novamente em alguns instantes'}`,
      })
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-500 fill-current" : "text-gray-300"
        }`}
      />
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!professor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Professor não encontrado</h1>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900">{professor.nome}</h1>
            <p className="text-gray-600">Perfil do Professor</p>
          </div>
        </div>

        {/* Estatísticas do professor - Layout redesenhado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avaliação Geral */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.mediaEstrelas > 0 ? stats.mediaEstrelas : '—'}
                  </div>
                  <div className="flex justify-center mt-2">
                    {stats.mediaEstrelas > 0 ? renderStars(Math.round(stats.mediaEstrelas)) : (
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className="h-4 w-4 text-gray-300" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {formatAvaliacoes(stats.totalAvaliacoes)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disciplinas */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalDisciplinas}</div>
                  <p className="text-sm text-gray-600 mt-2">
                    {stats.totalDisciplinas === 1 ? 'Disciplina' : 'Disciplinas'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 break-all">
                    {professor.email || 'Não informado'}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Email de contato</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disciplinas lecionadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-green-600" />
              Disciplinas Lecionadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {disciplinas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {disciplinas.map((disciplina) => (
                  <Link 
                    key={disciplina.id}
                    href={`/disciplina/${disciplina.id}`}
                    className="block hover:scale-105 transition-transform"
                  >
                    <Card className="hover:shadow-md cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {disciplina.codigo}
                          </Badge>
                          {disciplina.total_avaliacoes > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{disciplina.media_estrelas}</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{disciplina.nome}</h4>
                        <p className="text-sm text-gray-600">
                          {formatAvaliacoes(disciplina.total_avaliacoes)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Nenhuma disciplina cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Avaliações recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
                Avaliações Recentes
              </CardTitle>
              {isAuthenticated && disciplinas.length > 0 ? (
                <Button 
                  onClick={() => setShowAvaliacaoModal(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Avaliação
                </Button>
              ) : !isAuthenticated ? (
                <Link href="/login">
                  <Button 
                    variant="outline"
                    size="sm"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Login para Avaliar
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {avaliacoes.length > 0 ? (
              <div className="space-y-4">
                {avaliacoes.slice(0, 10).map((avaliacao) => (
                  <div key={avaliacao.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {avaliacao.disciplinas?.codigo || 'N/A'}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {avaliacao.disciplinas?.nome || 'Disciplina não encontrada'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {renderStars(avaliacao.estrelas)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(avaliacao.created_at)}
                        </span>
                      </div>
                    </div>
                    {avaliacao.comentario && (
                      <p className="text-gray-700 text-sm">{avaliacao.comentario}</p>
                    )}
                  </div>
                ))}
                {avaliacoes.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-4">
                    E mais {avaliacoes.length - 10} avaliações...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Nenhuma avaliação encontrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Avaliação */}
      <Dialog open={showAvaliacaoModal} onOpenChange={setShowAvaliacaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar {professor?.nome}</DialogTitle>
            <DialogDescription>
              Compartilhe sua experiência com este professor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="disciplina-select">Disciplina</Label>
              <select
                id="disciplina-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={novaAvaliacao.disciplinaId}
                onChange={(e) => setNovaAvaliacao({...novaAvaliacao, disciplinaId: e.target.value})}
              >
                <option value="">Selecione uma disciplina</option>
                {disciplinas.map((disciplina) => (
                  <option key={disciplina.id} value={disciplina.id}>
                    {disciplina.codigo} - {disciplina.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Nota (estrelas)</Label>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNovaAvaliacao({...novaAvaliacao, estrelas: i + 1})}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        i < novaAvaliacao.estrelas 
                          ? "text-yellow-500 fill-current" 
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="comentario">Comentário (opcional)</Label>
              <Textarea
                id="comentario"
                placeholder="Compartilhe sua experiência..."
                value={novaAvaliacao.comentario}
                onChange={(e) => setNovaAvaliacao({...novaAvaliacao, comentario: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleCreateAvaliacao}
                className="flex-1"
                disabled={!novaAvaliacao.disciplinaId || novaAvaliacao.estrelas === 0}
              >
                Enviar Avaliação
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAvaliacaoModal(false)
                  setNovaAvaliacao({ disciplinaId: "", estrelas: 0, comentario: "" })
                }}
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

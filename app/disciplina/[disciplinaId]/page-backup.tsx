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
import { ArrowLeft, Star, Plus, Sparkles, User } from "lucide-react"
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

interface PageProps {
  params: Promise<{ disciplinaId: string }>
}

export default function DisciplinaPage({ params }: PageProps) {
  const { disciplinaId } = use(params)
  const [disciplina, setDisciplina] = useState<any>(null)
  const [professores, setProfessores] = useState<ProfessorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingProf, setSubmittingProf] = useState(false)
  const [submittingAvaliacao, setSubmittingAvaliacao] = useState(false)
  const [novoProf, setNovoProf] = useState({ nome: "", email: "" })
  const [avaliacao, setAvaliacao] = useState({ professor: "", estrelas: 0, comentario: "" })
  const [showResumoIA, setShowResumoIA] = useState<string | null>(null)

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
    if (!novoProf.nome.trim() || !disciplina) return

    setSubmittingProf(true)
    try {
      const professor = await createProfessor(novoProf.nome, novoProf.email || undefined)
      await linkProfessorToDisciplina(professor.id, disciplina.id)

      // Recarregar lista de professores
      const professoresData = await getProfessoresByDisciplina(disciplina.id)
      setProfessores(professoresData)

      setNovoProf({ nome: "", email: "" })
    } catch (error) {
      console.error("Erro ao cadastrar professor:", error)
      alert("Erro ao cadastrar professor. Tente novamente.")
    } finally {
      setSubmittingProf(false)
    }
  }

  const handleAvaliarProfessor = async (professorId: string) => {
    if (avaliacao.estrelas === 0 || !disciplina) return

    // Simular usuário logado (você implementará autenticação depois)
    const usuarioId = "temp-user-id"

    setSubmittingAvaliacao(true)
    try {
      // Verificar se já avaliou
      const jaAvaliou = await checkUserAvaliacao(professorId, disciplina.id, usuarioId)
      if (jaAvaliou) {
        alert("Você já avaliou este professor nesta disciplina.")
        return
      }

      await createAvaliacao(
        professorId,
        disciplina.id,
        usuarioId,
        avaliacao.estrelas,
        avaliacao.comentario || undefined,
      )

      // Recarregar dados dos professores
      const professoresData = await getProfessoresByDisciplina(disciplina.id)
      setProfessores(professoresData)

      setAvaliacao({ professor: "", estrelas: 0, comentario: "" })
      alert("Avaliação enviada com sucesso!")
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error)
      alert("Erro ao enviar avaliação. Tente novamente.")
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb e título */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{disciplina?.nome}</h1>
              <p className="text-lg text-gray-600 mt-2">
                {disciplina?.codigo} • {disciplina?.periodo} • {disciplina?.enfases?.cursos?.nome}
              </p>
            </div>
          </div>

          {/* Cadastrar Novo Professor */}
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Professor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Professor</DialogTitle>
                <DialogDescription>Adicione um professor para esta disciplina.</DialogDescription>
              </DialogHeader>
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
                <Button 
                  className="w-full" 
                  onClick={handleCadastrarProfessor}
                  disabled={submittingProf}
                >
                  {submittingProf ? "Cadastrando..." : "Cadastrar Professor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Professores */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {professores.map((professor) => (
            <Card key={professor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{professor.nome}</CardTitle>
                  <Badge variant="outline">
                    {professor.total_avaliacoes} avaliações
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(professor.media_avaliacoes)}
                  <span className="text-sm text-gray-600">
                    {professor.media_avaliacoes.toFixed(1)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResumoIA(showResumoIA === professor.id ? null : professor.id)}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Resumo IA
                  </Button>
                </div>

                {showResumoIA === professor.id && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700">Resumo IA não disponível para este professor.</p>
                  </div>
                )}

                {/* Avaliar Professor */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Avaliar Professor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Avaliar {professor.nome}</DialogTitle>
                      <DialogDescription>
                        Compartilhe sua experiência com este professor na disciplina {disciplina?.nome}.
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
                          placeholder="Conte como foi sua experiência com este professor..."
                          rows={4}
                        />
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => handleAvaliarProfessor(professor.id)}
                        disabled={submittingAvaliacao || avaliacao.estrelas === 0}
                      >
                        {submittingAvaliacao ? "Enviando..." : "Enviar Avaliação"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {professores.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum professor cadastrado</h3>
            <p className="text-gray-600 mb-4">Seja o primeiro a cadastrar um professor para esta disciplina.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Professor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Professor</DialogTitle>
                  <DialogDescription>Adicione um professor para esta disciplina.</DialogDescription>
                </DialogHeader>
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
                  <Button 
                    className="w-full" 
                    onClick={handleCadastrarProfessor}
                    disabled={submittingProf}
                  >
                    {submittingProf ? "Cadastrando..." : "Cadastrar Professor"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  )
}

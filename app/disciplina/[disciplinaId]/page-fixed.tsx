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

  const handleCadastrarProfessor = async () => {
    if (!novoProf.nome || !novoProf.email || !disciplina) return

    setSubmittingProf(true)
    try {
      const professor = await createProfessor(novoProf.nome, novoProf.email)
      await linkProfessorToDisciplina(professor.id, disciplina.id)

      // Recarregar professores
      const professoresData = await getProfessoresByDisciplina(disciplina.id)
      setProfessores(professoresData)

      setNovoProf({ nome: "", email: "" })
      alert("Professor cadastrado com sucesso!")
    } catch (error) {
      console.error("Erro ao cadastrar professor:", error)
      alert("Erro ao cadastrar professor. Verifique se o email já não está em uso.")
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
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Professor</DialogTitle>
                <DialogDescription>
                  Adicione um novo professor que leciona esta disciplina.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nome" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="nome"
                    value={novoProf.nome}
                    onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })}
                    className="col-span-3"
                    placeholder="Dr. João Silva"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoProf.email}
                    onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })}
                    className="col-span-3"
                    placeholder="joao.silva@uerj.br"
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
        <div className="space-y-6">
          {professores.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum professor encontrado</h3>
                <p className="text-gray-600 mb-4">
                  Ainda não há professores cadastrados para esta disciplina.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar primeiro professor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Professor</DialogTitle>
                      <DialogDescription>
                        Adicione um novo professor que leciona esta disciplina.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nome" className="text-right">
                          Nome
                        </Label>
                        <Input
                          id="nome"
                          value={novoProf.nome}
                          onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })}
                          className="col-span-3"
                          placeholder="Dr. João Silva"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={novoProf.email}
                          onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })}
                          className="col-span-3"
                          placeholder="joao.silva@uerj.br"
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
              </CardContent>
            </Card>
          ) : (
            professores.map((professor) => (
              <Card key={professor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{professor.nome}</CardTitle>
                      <p className="text-gray-600">{professor.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.floor(professor.media_avaliacoes || 0)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="ml-2 font-medium">
                          {professor.media_avaliacoes?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {professor.total_avaliacoes || 0} avaliações
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Botão para mostrar resumo da IA */}
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowResumoIA(showResumoIA === professor.id ? null : professor.id)
                      }
                      className="mb-3"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {showResumoIA === professor.id ? "Ocultar" : "Ver"} Resumo IA
                    </Button>

                    {showResumoIA === professor.id && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Resumo gerado por IA
                        </h4>
                        <p className="text-blue-800 text-sm">
                          {professor.resumo_ia || "Resumo não disponível ainda."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Formulário de Avaliação */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Avaliar Professor</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Nota (1-5 estrelas)</Label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setAvaliacao({
                                  ...avaliacao,
                                  professor: professor.id,
                                  estrelas: star,
                                })
                              }
                              className="p-1"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= avaliacao.estrelas && avaliacao.professor === professor.id
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="comentario" className="text-sm font-medium">
                          Comentário (opcional)
                        </Label>
                        <Textarea
                          id="comentario"
                          placeholder="Compartilhe sua experiência com este professor..."
                          value={
                            avaliacao.professor === professor.id ? avaliacao.comentario : ""
                          }
                          onChange={(e) =>
                            setAvaliacao({
                              ...avaliacao,
                              professor: professor.id,
                              comentario: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={() => handleAvaliarProfessor(professor.id)}
                        disabled={
                          avaliacao.estrelas === 0 ||
                          avaliacao.professor !== professor.id ||
                          submittingAvaliacao
                        }
                        className="w-full"
                      >
                        {submittingAvaliacao ? "Enviando..." : "Enviar Avaliação"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

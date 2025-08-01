"use client"

import { useEffect, useState, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, BookOpen, Clock, GraduationCap, Users, AlertCircle } from "lucide-react"
import Link from "next/link"
import {
  getCursoByCode,
  getEnfasesByCurso,
  getDisciplinasBasicasCurso,
  getDisciplinasEspecificasEnfase,
  debugCurso,
} from "@/lib/database"
import type { Curso, Enfase } from "@/lib/supabase"

interface DisciplinaCompleta {
  id: string
  codigo: string
  nome: string
  periodo: string | null
  tipo?: string
  carga_horaria: number | null
  periodo_sugerido: string | null
  obrigatoria: boolean
  total_professores: number
  total_avaliacoes: number
}

interface PageProps {
  params: Promise<{ cursoId: string }>
}

export default function CursoPage({ params }: PageProps) {
  const { cursoId } = use(params)
  const [curso, setCurso] = useState<Curso | null>(null)
  const [enfases, setEnfases] = useState<Enfase[]>([])
  const [enfaseSelecionada, setEnfaseSelecionada] = useState<string>("")
  const [disciplinasBasicas, setDisciplinasBasicas] = useState<DisciplinaCompleta[]>([])
  const [disciplinasEnfase, setDisciplinasEnfase] = useState<DisciplinaCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // Debug primeiro
        const debug = await debugCurso(cursoId)
        setDebugInfo(debug)

        const cursoData = await getCursoByCode(cursoId)
        if (cursoData) {
          setCurso(cursoData)

          const [enfasesData, disciplinasBasicasData] = await Promise.all([
            getEnfasesByCurso(cursoData.id),
            getDisciplinasBasicasCurso(cursoId),
          ])

          setEnfases(enfasesData)
          setDisciplinasBasicas(disciplinasBasicasData)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cursoId])

  useEffect(() => {
    async function loadDisciplinasEnfase() {
      if (enfaseSelecionada && enfaseSelecionada !== "default" && curso) {
        try {
          const disciplinasData = await getDisciplinasEspecificasEnfase(cursoId, enfaseSelecionada)
          setDisciplinasEnfase(disciplinasData)
        } catch (error) {
          console.error("Erro ao carregar disciplinas da ênfase:", error)
          setDisciplinasEnfase([])
        }
      } else {
        setDisciplinasEnfase([])
      }
    }

    loadDisciplinasEnfase()
  }, [enfaseSelecionada, cursoId, curso])

  // Organizar disciplinas por período
  const organizarPorPeriodo = (disciplinas: DisciplinaCompleta[]) => {
    const periodos: { [key: string]: DisciplinaCompleta[] } = {}

    disciplinas.forEach((disciplina) => {
      const periodo = disciplina.periodo_sugerido || disciplina.periodo || "Eletivas"
      if (!periodos[periodo]) {
        periodos[periodo] = []
      }
      periodos[periodo].push(disciplina)
    })

    return periodos
  }

  const periodosBasicos = organizarPorPeriodo(disciplinasBasicas)
  const periodosEnfase = organizarPorPeriodo(disciplinasEnfase)

  // Combinar períodos
  const todosPeriodos = { ...periodosBasicos }
  Object.keys(periodosEnfase).forEach((periodo) => {
    if (todosPeriodos[periodo]) {
      // Avoid duplicates by checking if discipline already exists
      const existingIds = new Set(todosPeriodos[periodo].map(d => d.id))
      const newDisciplines = periodosEnfase[periodo].filter(d => !existingIds.has(d.id))
      todosPeriodos[periodo] = [...todosPeriodos[periodo], ...newDisciplines]
    } else {
      todosPeriodos[periodo] = periodosEnfase[periodo]
    }
  })

  const periodosOrdenados = Object.keys(todosPeriodos).sort((a, b) => {
    // Extrair números dos períodos para ordenação correta
    const getNumero = (periodo: string) => {
      const match = periodo.match(/(\d+)/)
      return match ? parseInt(match[1]) : 999 // períodos sem número vão para o final
    }
    
    const numeroA = getNumero(a)
    const numeroB = getNumero(b)
    
    // Se ambos têm números, ordenar numericamente
    if (numeroA !== 999 && numeroB !== 999) {
      return numeroA - numeroB
    }
    
    // Se apenas um tem número, o com número vem primeiro
    if (numeroA !== 999) return -1
    if (numeroB !== 999) return 1
    
    // Se nenhum tem número, ordenar alfabeticamente (Eletivas vem antes de Sem período)
    if (a === "Eletivas" && b !== "Eletivas") return -1
    if (b === "Eletivas" && a !== "Eletivas") return 1
    return a.localeCompare(b)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando curso...</p>
        </div>
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Curso não encontrado</h1>
          <p className="text-gray-600 mb-4">O curso "{cursoId.toUpperCase()}" não existe ou não está disponível.</p>
          {debugInfo && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
              <h3 className="font-medium text-yellow-800 mb-2">Informações de Debug:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>Curso encontrado: {debugInfo.curso ? "Sim" : "Não"}</li>
                <li>Disciplinas básicas: {debugInfo.disciplinas}</li>
                <li>Associações: {debugInfo.associacoes}</li>
                <li>Disciplinas específicas: {debugInfo.especificas}</li>
              </ul>
            </div>
          )}
          <Link href="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen 0">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        {/* Breadcrumb e título */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {curso.nome}
              {enfaseSelecionada && enfaseSelecionada !== "default" && (
                <span className="text-blue-600">
                  {" - "}
                  {enfases.find(e => e.codigo === enfaseSelecionada)?.nome}
                </span>
              )}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              {disciplinasBasicas.length} disciplinas básicas
              {enfaseSelecionada &&
                enfaseSelecionada !== "default" &&
                ` + ${disciplinasEnfase.length} disciplinas da ênfase`}
            </p>
          </div>
        </div>

        {/* Seletor de Ênfase */}
        {enfases.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Selecionar Ênfase</CardTitle>
              <CardDescription>Escolha uma ênfase para ver as disciplinas específicas adicionais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={enfaseSelecionada} onValueChange={setEnfaseSelecionada}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione uma ênfase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Apenas disciplinas básicas</SelectItem>
                    {enfases.map((enfase) => (
                      <SelectItem key={enfase.id} value={enfase.codigo}>
                        {enfase.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {enfaseSelecionada && enfaseSelecionada !== "default" && (
                  <Badge variant="secondary" className="text-sm">
                    {enfases.find((e) => e.codigo === enfaseSelecionada)?.nome}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fluxograma Interativo */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-center text-gray-900">Fluxograma do Curso</h2>

          {periodosOrdenados.map((periodo) => (
            <div key={periodo} className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2">
                {periodo.match(/\d+/) ? `${periodo}° período` : periodo}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {todosPeriodos[periodo].map((disciplina) => {
                  const isEnfase = disciplinasEnfase.some((d) => d.id === disciplina.id)

                  return (
                    <Link key={disciplina.id} href={`/disciplina/${disciplina.id}`}>
                      <Card
                        className={`hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${
                          isEnfase ? "border-purple-300 bg-purple-50" : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium text-gray-900 mb-1 leading-tight">
                                {disciplina.nome}
                              </CardTitle>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {disciplina.codigo}
                                </Badge>
                                {disciplina.carga_horaria && (
                                  <Badge variant="secondary" className="text-xs">
                                    {disciplina.carga_horaria}h
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{disciplina.total_professores} prof.</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{disciplina.total_avaliacoes} aval.</span>
                            </div>
                          </div>

                          {isEnfase && (
                            <Badge variant="outline" className="mt-2 text-xs bg-purple-100 text-purple-700">
                              Ênfase
                            </Badge>
                          )}

                          {disciplina.tipo === "básica" && (
                            <Badge variant="outline" className="mt-2 text-xs bg-green-100 text-green-700">
                              Básica
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {periodosOrdenados.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma disciplina encontrada</h3>
              <p className="text-gray-600 mb-4">
                Não foram encontradas disciplinas para este curso. Isso pode indicar que:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• O curso não tem disciplinas associadas no banco de dados</li>
                <li>• As disciplinas básicas não foram associadas a este curso</li>
                <li>• Há um problema na estrutura do banco de dados</li>
              </ul>
              {debugInfo && (
                <div className="bg-gray-50 border rounded-lg p-4 max-w-md mx-auto mb-4">
                  <h4 className="font-medium mb-2">Informações técnicas:</h4>
                  <div className="text-sm text-left space-y-1">
                    <div>Disciplinas básicas no sistema: {debugInfo.disciplinas}</div>
                    <div>Associações encontradas: {debugInfo.associacoes}</div>
                    <div>Disciplinas específicas: {debugInfo.especificas}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Estatísticas do Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{disciplinasBasicas.length}</div>
                <div className="text-sm text-gray-600">Disciplinas Básicas</div>
              </div>
              {enfaseSelecionada && enfaseSelecionada !== "default" && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{disciplinasEnfase.length}</div>
                  <div className="text-sm text-gray-600">Disciplinas da Ênfase</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{enfases.length}</div>
                <div className="text-sm text-gray-600">Ênfases Disponíveis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {disciplinasBasicas.length + disciplinasEnfase.length}
                </div>
                <div className="text-sm text-gray-600">Total de Disciplinas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

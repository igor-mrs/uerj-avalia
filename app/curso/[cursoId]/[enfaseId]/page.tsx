"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, BookOpen, Clock } from "lucide-react"
import Link from "next/link"
import { use } from "react"
import { getCursoByCode, getEnfaseByCode, getDisciplinasByEnfase } from "@/lib/database"
import type { Curso, Enfase, DisciplinaStats } from "@/lib/supabase"

// Dados mockados das disciplinas por ênfase
const disciplinasPorEnfase = {
  "civil-estruturas": [
    {
      id: "resistencia-materiais",
      nome: "Resistência dos Materiais I",
      codigo: "ENG001",
      periodo: "4º",
      professores: 3,
    },
    { id: "concreto-armado", nome: "Concreto Armado I", codigo: "ENG002", periodo: "6º", professores: 2 },
    { id: "analise-estrutural", nome: "Análise Estrutural I", codigo: "ENG003", periodo: "5º", professores: 4 },
    { id: "estruturas-aco", nome: "Estruturas de Aço", codigo: "ENG004", periodo: "7º", professores: 2 },
    { id: "fundacoes", nome: "Fundações", codigo: "ENG005", periodo: "8º", professores: 3 },
  ],
  "mecanica-termofluidos": [
    { id: "termodinamica", nome: "Termodinâmica I", codigo: "MEC001", periodo: "4º", professores: 3 },
    { id: "mecanica-fluidos", nome: "Mecânica dos Fluidos I", codigo: "MEC002", periodo: "5º", professores: 4 },
    { id: "transferencia-calor", nome: "Transferência de Calor", codigo: "MEC003", periodo: "6º", professores: 2 },
    { id: "maquinas-termicas", nome: "Máquinas Térmicas", codigo: "MEC004", periodo: "7º", professores: 3 },
  ],
}

const cursosInfo = {
  civil: { nome: "Engenharia Civil", enfases: { estruturas: "Estruturas" } },
  mecanica: { nome: "Engenharia Mecânica", enfases: { termofluidos: "Termofluidos" } },
}

interface PageProps {
  params: Promise<{ cursoId: string; enfaseId: string }>
}

export default function EnfasePage({ params }: PageProps) {
  const { cursoId, enfaseId } = use(params)
  const [searchTerm, setSearchTerm] = useState("")

  // Função utilitária para pluralização de avaliações
  const formatAvaliacoes = (count: number): string => {
    if (count === 0) return 'nenhuma avaliação'
    if (count === 1) return '1 avaliação'
    return `${count} avaliações`
  }

  // Função utilitária para pluralização de professores
  const formatProfessores = (count: number): string => {
    if (count === 0) return 'nenhum professor'
    if (count === 1) return '1 professor'
    return `${count} professores`
  }

  const [curso, setCurso] = useState<Curso | null>(null)
  const [enfase, setEnfase] = useState<Enfase | null>(null)
  const [disciplinas, setDisciplinas] = useState<DisciplinaStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [cursoData, enfaseData] = await Promise.all([getCursoByCode(cursoId), getEnfaseByCode(cursoId, enfaseId)])

        if (cursoData && enfaseData) {
          setCurso(cursoData)
          setEnfase(enfaseData)

          const disciplinasData = await getDisciplinasByEnfase(enfaseData.id)
          setDisciplinas(disciplinasData)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cursoId, enfaseId])

  const chaveEnfase = `${cursoId}-${enfaseId}` as keyof typeof disciplinasPorEnfase
  const disciplinasMock = disciplinasPorEnfase[chaveEnfase] || []
  const cursoInfo = cursosInfo[cursoId as keyof typeof cursosInfo]
  const enfaseNome = cursoInfo?.enfases[enfaseId as keyof typeof cursoInfo.enfases]

  const filteredDisciplinas = disciplinas.filter(
    (disciplina) =>
      disciplina.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disciplina.codigo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando disciplinas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb e título */}
        <div className="mb-8">
          <Link href={`/curso/${cursoId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para {curso?.nome}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {curso?.nome} - {enfase?.nome}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              {disciplinas.length} disciplinas da ênfase
            </p>
          </div>
        </div>
        {/* Search Section */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Disciplinas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDisciplinas.map((disciplina) => (
            <Link key={disciplina.id} href={`/disciplina/${disciplina.codigo.toLowerCase()}`}>
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-blue-700 mb-2">{disciplina.nome}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline">{disciplina.codigo}</Badge>
                        {disciplina.periodo && <Badge variant="secondary">{disciplina.periodo}° período</Badge>}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{formatProfessores(disciplina.total_professores)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatAvaliacoes(disciplina.total_avaliacoes)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredDisciplinas.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma disciplina encontrada</h3>
            <p className="text-gray-600">Tente ajustar sua busca ou navegue pelas outras ênfases.</p>
          </div>
        )}
      </main>
    </div>
  )
}

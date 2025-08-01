"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Search } from "lucide-react"
import {
  associarDisciplinaMultiplosCursos,
  removerDisciplinaCurso,
  listarCursosDaDisciplina,
} from "@/lib/disciplina-associations"
import { getCursos } from "@/lib/database"
import type { Curso } from "@/lib/supabase"

export default function DisciplinaAssociacaoAdmin() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [disciplinaCodigo, setDisciplinaCodigo] = useState("")
  const [cursosSelecionados, setCursosSelecionados] = useState<string[]>([])
  const [periodoSugerido, setPeriodoSugerido] = useState("")
  const [obrigatoria, setObrigatoria] = useState(true)
  const [associacoes, setAssociacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCursos()
  }, [])

  const loadCursos = async () => {
    try {
      const cursosData = await getCursos()
      setCursos(cursosData)
    } catch (error) {
      console.error("Erro ao carregar cursos:", error)
    }
  }

  const handleAssociar = async () => {
    if (!disciplinaCodigo || cursosSelecionados.length === 0) return

    setLoading(true)
    try {
      await associarDisciplinaMultiplosCursos(disciplinaCodigo, cursosSelecionados, periodoSugerido, obrigatoria)

      alert("Associações criadas com sucesso!")
      setDisciplinaCodigo("")
      setCursosSelecionados([])
      setPeriodoSugerido("")
      setObrigatoria(true)
    } catch (error) {
      console.error("Erro ao associar:", error)
      alert("Erro ao criar associações")
    } finally {
      setLoading(false)
    }
  }

  const handleBuscarAssociacoes = async () => {
    if (!disciplinaCodigo) return

    setLoading(true)
    try {
      const data = await listarCursosDaDisciplina(disciplinaCodigo)
      setAssociacoes(data || [])
    } catch (error) {
      console.error("Erro ao buscar associações:", error)
      setAssociacoes([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemoverAssociacao = async (cursoCodigo: string) => {
    if (!disciplinaCodigo) return

    try {
      await removerDisciplinaCurso(disciplinaCodigo, cursoCodigo)
      alert("Associação removida!")
      handleBuscarAssociacoes() // Recarregar lista
    } catch (error) {
      console.error("Erro ao remover associação:", error)
      alert("Erro ao remover associação")
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gerenciar Associações Disciplina-Curso</h1>

      {/* Formulário para Associar */}
      <Card>
        <CardHeader>
          <CardTitle>Associar Disciplina a Cursos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="disciplina">Código da Disciplina</Label>
            <Input
              id="disciplina"
              value={disciplinaCodigo}
              onChange={(e) => setDisciplinaCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: MAT001"
            />
          </div>

          <div>
            <Label>Cursos</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {cursos.map((curso) => (
                <div key={curso.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={curso.codigo}
                    checked={cursosSelecionados.includes(curso.codigo)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCursosSelecionados([...cursosSelecionados, curso.codigo])
                      } else {
                        setCursosSelecionados(cursosSelecionados.filter((c) => c !== curso.codigo))
                      }
                    }}
                  />
                  <Label htmlFor={curso.codigo} className="text-sm">
                    {curso.codigo} - {curso.nome}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periodo">Período Sugerido</Label>
              <Select value={periodoSugerido} onValueChange={setPeriodoSugerido}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "10º"].map((periodo) => (
                    <SelectItem key={periodo} value={periodo}>
                      {periodo} período
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Checkbox id="obrigatoria" checked={obrigatoria} onCheckedChange={setObrigatoria} />
              <Label htmlFor="obrigatoria">Disciplina Obrigatória</Label>
            </div>
          </div>

          <Button onClick={handleAssociar} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Associando..." : "Associar Disciplina aos Cursos"}
          </Button>
        </CardContent>
      </Card>

      {/* Buscar Associações Existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Consultar Associações Existentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={disciplinaCodigo}
              onChange={(e) => setDisciplinaCodigo(e.target.value.toUpperCase())}
              placeholder="Código da disciplina"
            />
            <Button onClick={handleBuscarAssociacoes} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {associacoes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Cursos associados:</h3>
              {associacoes.map((assoc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{assoc.cursos.codigo}</Badge>
                    <span>{assoc.cursos.nome}</span>
                    {assoc.periodo_sugerido && <Badge variant="secondary">{assoc.periodo_sugerido}</Badge>}
                    <Badge variant={assoc.obrigatoria ? "default" : "outline"}>
                      {assoc.obrigatoria ? "Obrigatória" : "Optativa"}
                    </Badge>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoverAssociacao(assoc.cursos.codigo)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

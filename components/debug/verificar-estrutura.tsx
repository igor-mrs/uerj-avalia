"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

export default function VerificarEstrutura() {
  const [tabelas, setTabelas] = useState<any[]>([])
  const [associacoes, setAssociacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const verificarTabelas = async () => {
    setLoading(true)
    try {
      // Verificar se as tabelas existem
      const { data: tabelasData, error: tabelasError } = await supabase.rpc("verificar_tabelas_associativas")

      if (tabelasError) {
        console.error("Erro ao verificar tabelas:", tabelasError)
        // Tentar método alternativo
        const { data, error } = await supabase
          .from("information_schema.tables")
          .select("table_name")
          .in("table_name", ["disciplina_cursos", "disciplina_enfases"])

        if (!error) {
          setTabelas(data || [])
        }
      } else {
        setTabelas(tabelasData || [])
      }

      // Tentar buscar algumas associações
      try {
        const { data: assocData, error: assocError } = await supabase
          .from("disciplina_cursos")
          .select(
            `
            id,
            periodo_sugerido,
            obrigatoria,
            disciplinas (codigo, nome),
            cursos (codigo, nome)
          `,
          )
          .limit(10)

        if (!assocError) {
          setAssociacoes(assocData || [])
        }
      } catch (error) {
        console.log("Tabela disciplina_cursos não existe ainda")
      }
    } catch (error) {
      console.error("Erro geral:", error)
    } finally {
      setLoading(false)
    }
  }

  const criarTabelasAssociativas = async () => {
    setLoading(true)
    try {
      // Executar SQL para criar tabelas
      const { error } = await supabase.rpc("criar_tabelas_associativas")

      if (error) {
        console.error("Erro ao criar tabelas:", error)
        alert("Erro ao criar tabelas. Verifique o console.")
      } else {
        alert("Tabelas criadas com sucesso!")
        verificarTabelas() // Recarregar
      }
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao criar tabelas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verificar Estrutura do Banco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={verificarTabelas} disabled={loading}>
              {loading ? "Verificando..." : "Verificar Tabelas"}
            </Button>
            <Button onClick={criarTabelasAssociativas} disabled={loading} variant="outline">
              Criar Tabelas Associativas
            </Button>
          </div>

          {tabelas.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Tabelas Encontradas:</h3>
              <div className="flex gap-2">
                {tabelas.map((tabela, index) => (
                  <Badge key={index} variant="outline">
                    {tabela.table_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {associacoes.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Associações Existentes:</h3>
              <div className="space-y-2">
                {associacoes.map((assoc) => (
                  <div key={assoc.id} className="p-2 border rounded text-sm">
                    <strong>{assoc.disciplinas?.codigo}</strong> - {assoc.disciplinas?.nome} →{" "}
                    <strong>{assoc.cursos?.codigo}</strong> - {assoc.cursos?.nome}
                    {assoc.periodo_sugerido && <Badge className="ml-2">{assoc.periodo_sugerido}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

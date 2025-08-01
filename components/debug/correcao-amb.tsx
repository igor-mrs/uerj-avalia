"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Play, RefreshCw } from "lucide-react"
import { executarCorrecaoAMB, debugCurso } from "@/lib/database"

export default function CorrecaoAMB() {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const executarCorrecao = async () => {
    setLoading(true)
    try {
      const result = await executarCorrecaoAMB()
      setResultado(result)

      // Fazer debug após correção
      const debug = await debugCurso("amb")
      setDebugInfo(debug)
    } catch (error) {
      console.error("Erro:", error)
      setResultado({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const verificarEstrutura = async () => {
    setLoading(true)
    try {
      const debug = await debugCurso("amb")
      setDebugInfo(debug)
    } catch (error) {
      console.error("Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Correção do Curso AMB
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={executarCorrecao} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? "Executando..." : "Executar Correção"}
            </Button>
            <Button onClick={verificarEstrutura} disabled={loading} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Estrutura
            </Button>
          </div>

          {resultado && (
            <div
              className={`p-4 rounded-lg border ${
                resultado.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {resultado.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${resultado.success ? "text-green-800" : "text-red-800"}`}>
                  {resultado.success ? "Sucesso" : "Erro"}
                </span>
              </div>
              <p className={`text-sm ${resultado.success ? "text-green-700" : "text-red-700"}`}>
                {resultado.message || resultado.error || "Operação concluída"}
              </p>
            </div>
          )}

          {debugInfo && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <h3 className="font-medium mb-3">Informações de Debug:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Curso encontrado:</span>
                    <Badge variant={debugInfo.curso ? "default" : "destructive"}>
                      {debugInfo.curso ? "Sim" : "Não"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disciplinas básicas:</span>
                    <Badge variant="outline">{debugInfo.disciplinas}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Associações:</span>
                    <Badge variant="outline">{debugInfo.associacoes}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disciplinas específicas:</span>
                    <Badge variant="outline">{debugInfo.especificas}</Badge>
                  </div>
                </div>
              </div>

              {debugInfo.curso && (
                <div className="mt-4 p-3 bg-white border rounded">
                  <h4 className="font-medium mb-2">Detalhes do Curso:</h4>
                  <div className="text-sm space-y-1">
                    <div>Nome: {debugInfo.curso.nome}</div>
                    <div>Código: {debugInfo.curso.codigo}</div>
                    <div>ID: {debugInfo.curso.id}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

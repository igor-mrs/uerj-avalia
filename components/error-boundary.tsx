"use client"

import { Component, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Erro de Configuração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">Ocorreu um erro ao carregar a aplicação:</p>
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 font-mono text-xs">
                  {this.state.error?.message || "Erro desconhecido"}
                </div>
              </div>

              {this.state.error?.message?.includes("SUPABASE") && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <h4 className="font-medium text-yellow-800 mb-2">Possível solução:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Verifique se as variáveis de ambiente do Supabase estão configuradas</li>
                    <li>• NEXT_PUBLIC_SUPABASE_URL deve estar definida</li>
                    <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY deve estar definida</li>
                  </ul>
                </div>
              )}

              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

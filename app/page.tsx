"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Users, 
  BookOpen, 
  GraduationCap, 
  AlertTriangle, 
  Star,
  Shield,
  Sparkles,
  TrendingUp,
  MessageCircle,
  ChevronRight,
  Mail,
  CheckCircle,
  XCircle,
  LogOut
} from "lucide-react"
import Link from "next/link"
import {
  getEstatisticasGerais,
  getCursos,
  getEnfasesByCurso,
  isSupabaseConfigured,
  getCursosMock,
  MOCK_DATA,
  searchDisciplinasEProfessores as searchDB,
  type SearchResult,
} from "@/lib/database"
import type { Curso, Enfase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

const HomePage = () => {
  const { user, loading: authLoading, signOut, isAuthenticated, supabase } = useAuth()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [enfasesPorCurso, setEnfasesPorCurso] = useState<Record<string, Enfase[]>>({})
  const [estatisticas, setEstatisticas] = useState({
    totalCursos: 0,
    totalDisciplinas: 0,
    totalProfessores: 0,
    totalAvaliacoes: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [usingMockData, setUsingMockData] = useState(false)

  // Processar parâmetros de autenticação vindos do callback
  useEffect(() => {
    const processAuthParams = async () => {
      // Verificar se está no lado do cliente
      if (typeof window === 'undefined') return
      
      const urlParams = new URLSearchParams(window.location.search)
      const tokenHash = urlParams.get('token_hash')
      const type = urlParams.get('type')
      const code = urlParams.get('code')

      if (tokenHash && type) {
        console.log('🔗 Processando magic link...')
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'magiclink' | 'signup' | 'invite' | 'recovery' | 'email_change'
          })

          if (error) {
            console.error('❌ Erro verifyOtp:', error)
          } else if (data?.user && data?.session) {
            console.log('✅ Sessão estabelecida via magic link:', data.user.email)
            // Limpar parâmetros da URL
            window.history.replaceState({}, '', '/')
          }
        } catch (err) {
          console.error('❌ Erro durante processamento do magic link:', err)
        }
      } else if (code) {
        console.log('🔗 Processando código OAuth...')
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('❌ Erro exchangeCodeForSession:', error)
          } else if (data?.session) {
            console.log('✅ Sessão estabelecida via código OAuth')
            // Limpar parâmetros da URL
            window.history.replaceState({}, '', '/')
          }
        } catch (err) {
          console.error('❌ Erro durante processamento do código OAuth:', err)
        }
      }
    }

    processAuthParams()
  }, [supabase])

  // Função de pesquisa para disciplinas e professores
  const searchDisciplinasEProfessores = async (termo: string) => {
    if (termo.length < 3) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    
    try {
      if (!isSupabaseConfigured()) {
        // Usar dados mock quando Supabase não está configurado
        const mockResults = [
          // Disciplinas
          {
            tipo: 'disciplina' as const,
            codigo: 'ENG-001',
            nome: 'Cálculo Diferencial e Integral I',
            professor: 'Prof. João Silva Santos',
            semestre: '2024.1'
          },
          {
            tipo: 'disciplina' as const, 
            codigo: 'ENG-002',
            nome: 'Álgebra Linear',
            professor: 'Profa. Maria José Costa',
            semestre: '2024.1'
          },
          // Professores
          {
            tipo: 'professor' as const,
            nome: 'João Silva Santos',
            departamento: 'Matemática Aplicada',
            disciplinas: ['Cálculo I', 'Cálculo II', 'Equações Diferenciais'],
            avaliacao: 4.2
          },
          {
            tipo: 'professor' as const,
            nome: 'Maria José Costa',
            departamento: 'Matemática Aplicada', 
            disciplinas: ['Álgebra Linear', 'Geometria Analítica'],
            avaliacao: 4.5
          }
        ]

        // Filtrar resultados baseado no termo de pesquisa
        const filtrados = mockResults.filter(item => {
          const termoLower = termo.toLowerCase()
          if (item.tipo === 'disciplina') {
            return (item as any).codigo?.toLowerCase().includes(termoLower) ||
                   (item as any).nome?.toLowerCase().includes(termoLower) ||
                   (item as any).professor?.toLowerCase().includes(termoLower)
          } else {
            return (item as any).nome?.toLowerCase().includes(termoLower)
          }
        })

        setSearchResults(filtrados)
      } else {
        // Usar busca real no banco de dados
        const results = await searchDB(termo)
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Erro na pesquisa:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Effect para pesquisa com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchDisciplinasEProfessores(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        if (!isSupabaseConfigured()) {
          console.warn("Supabase não configurado, usando dados mockados")
          setUsingMockData(true)
          setCursos(await getCursosMock())
          setEstatisticas({
            totalCursos: MOCK_DATA.cursos.length,
            totalDisciplinas: MOCK_DATA.disciplinas.length,
            totalProfessores: 15,
            totalAvaliacoes: 45,
          })
          setLoading(false)
          return
        }

        const [cursosData, estatisticasData] = await Promise.all([getCursos(), getEstatisticasGerais()])

        setCursos(cursosData)
        setEstatisticas(estatisticasData)

        // Carregar ênfases para cada curso
        const enfasesData: Record<string, Enfase[]> = {}
        for (const curso of cursosData) {
          const enfases = await getEnfasesByCurso(curso.id)
          enfasesData[curso.id] = enfases
        }
        setEnfasesPorCurso(enfasesData)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        // Em caso de erro, usar dados mockados
        setUsingMockData(true)
        setCursos(await getCursosMock())
        setEstatisticas({
          totalCursos: MOCK_DATA.cursos.length,
          totalDisciplinas: MOCK_DATA.disciplinas.length,
          totalProfessores: 15,
          totalAvaliacoes: 45,
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredCursos = cursos.filter(
    (curso) =>
      curso.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enfasesPorCurso[curso.id] || []).some((enfase) => enfase.nome.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cursos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-white opacity-10 rounded-full"></div>
          <div className="absolute bottom-20 left-32 w-12 h-12 bg-white opacity-10 rounded-full"></div>
          <div className="absolute bottom-32 right-16 w-24 h-24 bg-white opacity-10 rounded-full"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-white bg-opacity-25 rounded-full backdrop-blur-sm border border-white border-opacity-30 shadow-lg">
                <GraduationCap className="h-16 w-16 text-blue-900" />
              </div>
            </div>
            
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              UERJ Avalia
            </h1>
            
            <p className="text-2xl mb-4 font-light">
              Sistema de Avaliação de Professores
            </p>
            <p className="text-lg mb-8 max-w-3xl mx-auto opacity-90">
              Faculdade de Engenharia - Universidade do Estado do Rio de Janeiro
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 bg-opacity-90 rounded-xl px-6 py-4 backdrop-blur-sm border border-blue-300 border-opacity-30 shadow-lg hover:shadow-xl transition-all duration-300">
                <Shield className="h-6 w-6 mr-3 text-blue-100" />
                <div className="text-left">
                  <div className="font-semibold text-white">Verificação Segura</div>
                  <div className="text-sm text-blue-100">Email institucional</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 bg-opacity-90 rounded-xl px-6 py-4 backdrop-blur-sm border border-indigo-300 border-opacity-30 shadow-lg hover:shadow-xl transition-all duration-300">
                <Sparkles className="h-6 w-6 mr-3 text-yellow-200" />
                <div className="text-left">
                  <div className="font-semibold text-white">Avaliações Reais</div>
                  <div className="text-sm text-indigo-100">De estudantes verificados</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 bg-opacity-90 rounded-xl px-6 py-4 backdrop-blur-sm border border-purple-300 border-opacity-30 shadow-lg hover:shadow-xl transition-all duration-300">
                <TrendingUp className="h-6 w-6 mr-3 text-green-200" />
                <div className="text-left">
                  <div className="font-semibold text-white">Melhoria Contínua</div>
                  <div className="text-sm text-purple-100">Qualidade de ensino</div>
                </div>
              </div>
            </div>
            
            {/* Auth Status */}
            <div className="flex justify-center items-center gap-4">
              {isAuthenticated ? (
                <div className="text-center">
                  <div className="flex items-center justify-center bg-green-500 bg-opacity-25 backdrop-blur-sm rounded-full px-8 py-4 border border-green-400 border-opacity-30 mb-4">
                    <CheckCircle className="h-6 w-6 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Conta Verificada</div>
                      <div className="text-sm opacity-80">{user?.email}</div>
                    </div>
                    <Button 
                      onClick={handleLogout}
                      variant="ghost" 
                      size="sm" 
                      className="ml-6 text-white hover:bg-white hover:bg-opacity-20 border border-white border-opacity-30"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                  <p className="text-blue-100 text-sm">
                    ✅ Você pode agora adicionar professores e avaliações
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Link href="/login">
                    <Button className="bg-white text-blue-700 hover:bg-gray-100 px-10 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 mb-4">
                      <Mail className="h-5 w-5 mr-3" />
                      Entrar com e-mail institucional
                    </Button>
                  </Link>
                  <p className="text-blue-100 text-sm">
                    🔐 Necessário para adicionar professores e avaliações
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm opacity-75">
               Plataforma destinada para estudantes da Faculdade de Engenharia (FEN) - UERJ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Buscar Disciplinas e Professores</h2>
            <p className="text-gray-600">Digite o nome completo do professor ou código da disciplina com prefixo</p>
          </div>
          
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Ex: João Silva Santos ou ENG-001 ou Cálculo Diferencial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg border-2 border-gray-300 focus:border-blue-500 rounded-xl shadow-sm"
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              💡 <strong>Dicas:</strong> Use o nome completo do professor ou código da disciplina (ex: ENG-001, MAT-101)
            </p>
          </div>

          {/* Search Results Preview */}
          {searchTerm.length > 2 && (
            <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resultados da Pesquisa</h3>
              
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Buscando...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result, index) => {
                    const href = result.tipo === 'disciplina' 
                      ? `/disciplina/${result.id}` 
                      : `/professor/${result.id}`
                    
                    return (
                      <Link key={index} href={href} className="block hover:scale-105 transition-transform">
                        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                          {result.tipo === 'disciplina' ? (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-gray-800">{result.codigo}</span>
                                <Badge variant="secondary" className="text-xs">Disciplina</Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">{result.nome}</h4>
                              <p className="text-sm text-gray-600">Professor(es): {result.professor}</p>

                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-5 w-5 text-green-600" />
                                <Badge variant="secondary" className="text-xs">Professor</Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">{result.nome}</h4>
                              {result.email && (
                                <p className="text-sm text-gray-600 mb-2">{result.email}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < Math.round(result.avaliacao || 0) 
                                          ? "text-yellow-500 fill-current" 
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-medium">{result.avaliacao || '0.0'}</span>
                                <span className="text-xs text-gray-500">
                                  • Disciplina(s): {result.disciplinas?.join(', ') || 'Não informado'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum resultado encontrado para "{searchTerm}"</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Tente buscar por nome completo do professor ou código da disciplina
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Um sistema transparente e seguro para avaliar professores e melhorar a qualidade do ensino
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verificação Segura</h3>
              <p className="text-gray-600">
                Apenas estudantes com email @graduacao.uerj.br podem adicionar avaliações
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Avaliações Construtivas</h3>
              <p className="text-gray-600">
                Compartilhe sua experiência para ajudar outros estudantes e professores
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Melhoria Contínua</h3>
              <p className="text-gray-600">
                Contribua para a evolução do ensino na Faculdade de Engenharia
              </p>
            </Card>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Aviso sobre dados mockados */}
        {usingMockData && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Modo de Demonstração</p>
                  <p className="text-sm">O banco de dados não está configurado. Exibindo dados de exemplo.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.totalDisciplinas}</p>
                  <p className="text-gray-600">Disciplinas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.totalProfessores}</p>
                  <p className="text-gray-600">Professores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.totalCursos}</p>
                  <p className="text-gray-600">Cursos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.totalAvaliacoes}</p>
                  <p className="text-gray-600">Avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Grid */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Cursos de Engenharia</h2>
            <p className="text-lg text-gray-600 mb-8">
              Selecione seu curso para ver disciplinas e avaliar professores
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCursos.map((curso) => {
              const enfases = enfasesPorCurso[curso.id] || []
              return (
                <Link key={curso.id} href={`/curso/${curso.codigo.toLowerCase()}`}>
                  <Card className="transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl text-blue-700 mb-2">{curso.nome}</CardTitle>
                          <CardDescription className="text-base">
                            {enfases.length > 0 ? `${enfases.length} ênfases disponíveis` : "Curso disponível"}
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-6 w-6 text-gray-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          📋 Ver fluxograma completo e disciplinas<br />
                          ⭐ Avaliar professores por disciplina<br />
                        </p>

                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info Section */}
        <section className="mt-16 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
          <div className="text-center max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Sobre o Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Para Estudantes</h4>
                <p className="text-gray-600 text-sm">
                  Encontre os melhores professores e tome decisões informadas sobre suas disciplinas
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Para Professores</h4>
                <p className="text-gray-600 text-sm">
                  Receba feedback valioso para aprimorar suas metodologias de ensino
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Para a UERJ</h4>
                <p className="text-gray-600 text-sm">
                  Promova a excelência acadêmica através da transparência e melhoria contínua
                </p>
              </div>
            </div>
            
            <p className="text-gray-600 text-center max-w-2xl mx-auto">
              Compartilhe suas experiências com professores para ajudar colegas na escolha de disciplinas. 
              Avalie de forma construtiva e contribua para a melhoria do ensino na Faculdade de Engenharia.
            </p>
          </div>
        </section>

      </main>
      
    </div>
  )
}

export default HomePage

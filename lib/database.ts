import { supabase } from "./supabase"
import type { Curso, Enfase, Disciplina, Professor, Avaliacao, ProfessorStats } from "./supabase"

// Utilitários de validação e sanitização
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return ''
  return str.trim().replace(/[<>'"&]/g, '').substring(0, 255) // Remove caracteres perigosos e limita tamanho
}

const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const cleaned = email.trim().toLowerCase()
  return emailRegex.test(cleaned) ? cleaned : ''
}

const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

const validateEstrelas = (estrelas: number): boolean => {
  return Number.isInteger(estrelas) && estrelas >= 1 && estrelas <= 5
}

// Rate limiting simples (em memória - para produção usar Redis)
const rateLimiter = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const RATE_LIMIT_MAX = 10 // 10 ações por minuto

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now()
  const limit = rateLimiter.get(identifier)
  
  if (!limit || now > limit.resetTime) {
    rateLimiter.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  limit.count++
  return true
}

//  Logging seguro
const secureLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    // Em desenvolvimento, mostrar logs completos
    console.log(`[DATABASE] ${message}`, data)
  } else {
    // Em produção, logs mínimos sem dados sensíveis
    console.log(`[DATABASE] ${message}`)
  }
}

const secureError = (message: string, error?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[DATABASE ERROR] ${message}`, error)
  } else {
    // Em produção, não vazar detalhes do erro
    console.error(`[DATABASE ERROR] ${message}`)
  }
}
export interface DisciplinaCompleta {
  id: string
  nome: string
  codigo: string
  periodo: string | null
  tipo?: string
  carga_horaria: number | null
  pre_requisitos: string[] | null
  curso_nome: string | null
  curso_codigo: string | null
  enfase_nome: string | null
  enfase_codigo: string | null
  periodo_sugerido: string | null
  obrigatoria: boolean
  total_professores: number
  total_avaliacoes: number
}

// Função para verificar se o Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Wrapper para funções que precisam do Supabase
async function withSupabase<T>(fn: () => Promise<T>): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não está configurado. Verifique as variáveis de ambiente.")
  }
  return fn()
}

// Funções para Cursos
export async function getCursos(): Promise<Curso[]> {
  return withSupabase(async () => {
    const { data, error } = await supabase.from("cursos").select("*").order("nome")
    if (error) throw error
    return data || []
  })
}

export async function getCursoByCode(codigo: string): Promise<Curso | null> {
  return withSupabase(async () => {
    const codigoClean = sanitizeString(codigo).toUpperCase()
    if (!codigoClean) {
      throw new Error('Código do curso é obrigatório')
    }

    secureLog('Buscando curso com código', { codigo: codigoClean })
    const { data, error } = await supabase.from("cursos").select("*").eq("codigo", codigoClean).single()

    if (error) {
      secureError('Erro ao buscar curso', error)
      return null
    }
    secureLog('Curso encontrado', { id: data?.id })
    return data
  })
}

// Funções para Ênfases
export async function getEnfasesByCurso(cursoId: string): Promise<Enfase[]> {
  return withSupabase(async () => {
    const { data, error } = await supabase.from("enfases").select("*").eq("curso_id", cursoId).order("nome")
    if (error) throw error
    return data || []
  })
}

export async function getEnfaseByCode(cursoCode: string, enfaseCode: string): Promise<Enfase | null> {
  return withSupabase(async () => {
    const { data, error } = await supabase
      .from("enfases")
      .select(`
        *,
        cursos!inner(codigo)
      `)
      .eq("codigo", enfaseCode.toUpperCase())
      .eq("cursos.codigo", cursoCode.toUpperCase())
      .single()

    if (error) return null
    return data
  })
}

// Função auxiliar para calcular estatísticas de uma disciplina
async function calcularEstatisticasDisciplina(disciplinaId: string) {
  const [professoresResult, avaliacoesResult] = await Promise.all([
    supabase
      .from("professor_disciplinas")
      .select("professor_id", { count: "exact", head: true })
      .eq("disciplina_id", disciplinaId),
    supabase
      .from("avaliacoes")
      .select("id", { count: "exact", head: true })
      .eq("disciplina_id", disciplinaId)
  ])

  return {
    total_professores: professoresResult.count || 0,
    total_avaliacoes: avaliacoesResult.count || 0,
  }
}

// Função para buscar disciplinas básicas e comuns de um curso (sem ênfase específica)
export async function getDisciplinasBasicasCurso(cursoCode: string): Promise<DisciplinaCompleta[]> {
  return withSupabase(async () => {
    const cursoCodeClean = sanitizeString(cursoCode).toUpperCase()
    if (!cursoCodeClean) {
      throw new Error('Código do curso é obrigatório')
    }

    secureLog('Buscando disciplinas básicas para curso', { curso: cursoCodeClean })

    const { data, error } = await supabase
      .from("disciplina_cursos")
      .select(`
        periodo_sugerido,
        obrigatoria,
        disciplinas (
          id,
          codigo,
          nome,
          periodo,
          carga_horaria
        ),
        cursos!inner (codigo)
      `)
      .eq("cursos.codigo", cursoCodeClean)
      .order("periodo_sugerido")

    if (error) {
      secureError('Erro ao buscar disciplinas básicas', error)
      throw error
    }

    secureLog('Disciplinas básicas encontradas', { count: data?.length || 0 })

    // Calcular estatísticas para cada disciplina
    const disciplinasComEstatisticas = await Promise.all(
      (data || []).map(async (item) => {
        const disciplina = Array.isArray(item.disciplinas) ? item.disciplinas[0] : item.disciplinas
        const estatisticas = await calcularEstatisticasDisciplina(disciplina.id)
        
        return {
          id: disciplina.id,
          codigo: disciplina.codigo,
          nome: disciplina.nome,
          periodo: disciplina.periodo,
          carga_horaria: disciplina.carga_horaria,
          periodo_sugerido: item.periodo_sugerido,
          obrigatoria: item.obrigatoria,
          ...estatisticas,
          tipo: "básica",
          pre_requisitos: null,
          curso_nome: null,
          curso_codigo: null,
          enfase_nome: null,
          enfase_codigo: null,
        } as DisciplinaCompleta
      })
    )

    return disciplinasComEstatisticas
  })
}

// Função para buscar apenas disciplinas específicas de uma ênfase
export async function getDisciplinasEspecificasEnfase(
  cursoCode: string,
  enfaseCode: string,
): Promise<DisciplinaCompleta[]> {
  return withSupabase(async () => {
    const { data, error } = await supabase
      .from("disciplina_enfases")
      .select(`
        periodo_sugerido,
        obrigatoria,
        disciplinas (
          id,
          codigo,
          nome,
          periodo,
          carga_horaria
        ),
        enfases!inner (
          codigo,
          cursos!inner (codigo)
        )
      `)
      .eq("enfases.codigo", enfaseCode.toUpperCase())
      .eq("enfases.cursos.codigo", cursoCode.toUpperCase())
      .order("periodo_sugerido")

    if (error) throw error

    // Calcular estatísticas para cada disciplina
    const disciplinasComEstatisticas = await Promise.all(
      (data || []).map(async (item) => {
        const disciplina = Array.isArray(item.disciplinas) ? item.disciplinas[0] : item.disciplinas
        const estatisticas = await calcularEstatisticasDisciplina(disciplina.id)
        
        return {
          id: disciplina.id,
          codigo: disciplina.codigo,
          nome: disciplina.nome,
          periodo: disciplina.periodo,
          carga_horaria: disciplina.carga_horaria,
          periodo_sugerido: item.periodo_sugerido,
          obrigatoria: item.obrigatoria,
          ...estatisticas,
          tipo: "específica",
          pre_requisitos: null,
          curso_nome: null,
          curso_codigo: null,
          enfase_nome: null,
          enfase_codigo: null,
        } as DisciplinaCompleta
      })
    )

    return disciplinasComEstatisticas
  })
}

// Função para debug - verificar se curso existe e tem disciplinas - VERSÃO SEGURA
export async function debugCurso(cursoCode: string) {
  return withSupabase(async () => {
    secureLog('=== DEBUG CURSO ===')

    const cursoCodeClean = sanitizeString(cursoCode)
    if (!cursoCodeClean) {
      throw new Error('Código do curso é obrigatório')
    }

    // 1. Verificar se curso existe
    const curso = await getCursoByCode(cursoCodeClean)
    secureLog('Curso encontrado', { exists: !!curso })

    if (!curso) return { curso: null, disciplinas: 0, associacoes: 0 }

    // 2. Verificar disciplinas associadas
    const { data: associacoes, error: errorAssoc } = await supabase
      .from("disciplina_cursos")
      .select("*")
      .eq("curso_id", curso.id)

    secureLog('Associações disciplina-curso', { count: associacoes?.length || 0 })
    if (errorAssoc) secureError('Erro nas associações', errorAssoc)

    // 3. Verificar disciplinas básicas
    const { data: disciplinasBasicas, error: errorBasicas } = await supabase
      .from("disciplinas")
      .select("*")
      .eq("tipo", "básica")

    secureLog('Disciplinas básicas no sistema', { count: disciplinasBasicas?.length || 0 })
    if (errorBasicas) secureError('Erro disciplinas básicas', errorBasicas)

    // 4. Verificar disciplinas específicas do curso
    const codigoBusca = cursoCodeClean === "amb" ? "FEN07-12%" : `%${cursoCodeClean}%`
    const { data: disciplinasEspecificas, error: errorEsp } = await supabase
      .from("disciplinas")
      .select("*")
      .ilike("codigo", codigoBusca)

    secureLog('Disciplinas específicas', { count: disciplinasEspecificas?.length || 0 })
    if (errorEsp) secureError('Erro disciplinas específicas', errorEsp)

    return {
      curso,
      disciplinas: disciplinasBasicas?.length || 0,
      associacoes: associacoes?.length || 0,
      especificas: disciplinasEspecificas?.length || 0,
    }
  })
}

// Função para executar scripts de correção - VERSÃO SEGURA
export async function executarCorrecaoAMB() {
  return withSupabase(async () => {
    try {
      // Lista de códigos de disciplinas básicas (hardcoded por segurança)
      const disciplinasBasicas = [
        'IME01-00508', 'IME01-00854', 'IME01-03646', 'IME03-01913', 'IME02-01388',
        'IME02-04629', 'IME04-04541', 'IME05-05316', 'FIS01-05095', 'FIS02-05143',
        'FIS03-05185', 'FIS04-05212', 'QUI07-03793', 'QUI07-03865', 'IME03-02046',
        'IME03-00587', 'IME03-00738', 'IME04-00627', 'FEN03-05787', 'FEN07-02162',
        'FAF03-04439', 'FCE02-04657', 'FEN07-02722'
      ]

      // Usar queries Supabase seguras em vez de SQL direto
      const { error } = await supabase
        .from("disciplinas")
        .update({ tipo: 'básica' })
        .in('codigo', disciplinasBasicas)

      if (error) {
        console.error("Erro na correção:", error)
        return { success: false, error: error.message }
      }

      return { success: true, message: "Correção executada com sucesso usando queries seguras" }
    } catch (error) {
      console.error("Erro na correção:", error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  })
}

// Restante das funções...
export async function getDisciplinaByCode(codigoOuId: string): Promise<Disciplina | null> {
  return withSupabase(async () => {
    // Primeiro tenta buscar por código
    let { data, error } = await supabase
      .from("disciplinas")
      .select("*")
      .eq("codigo", codigoOuId.toUpperCase())
      .single()
    
    // Se não encontrou por código, tenta buscar por ID
    if (error || !data) {
      const { data: dataById, error: errorById } = await supabase
        .from("disciplinas")
        .select("*")
        .eq("id", codigoOuId)
        .single()
      
      if (errorById) return null
      return dataById
    }
    
    return data
  })
}

export async function getDisciplinaCompleta(disciplinaId: string): Promise<DisciplinaCompleta | null> {
  return withSupabase(async () => {
    const { data, error } = await supabase
      .from("disciplinas")
      .select(`
        id,
        codigo,
        nome,
        periodo,
        carga_horaria,
        disciplina_cursos (
          periodo_sugerido,
          obrigatoria,
          cursos (
            nome,
            codigo
          )
        )
      `)
      .eq("id", disciplinaId)
      .single()

    if (error) return null

    // Contar professores e avaliações
    const [professoresResult, avaliacoesResult] = await Promise.all([
      supabase
        .from("professor_disciplinas")
        .select("professor_id", { count: "exact", head: true })
        .eq("disciplina_id", disciplinaId),
      supabase
        .from("avaliacoes")
        .select("id", { count: "exact", head: true })
        .eq("disciplina_id", disciplinaId)
    ])

    const disciplinaCurso = Array.isArray(data.disciplina_cursos) ? data.disciplina_cursos[0] : data.disciplina_cursos
    const curso = Array.isArray(disciplinaCurso?.cursos) ? disciplinaCurso.cursos[0] : disciplinaCurso?.cursos

    return {
      id: data.id,
      codigo: data.codigo,
      nome: data.nome,
      periodo: data.periodo,
      carga_horaria: data.carga_horaria,
      periodo_sugerido: disciplinaCurso?.periodo_sugerido || null,
      obrigatoria: disciplinaCurso?.obrigatoria || false,
      total_professores: professoresResult.count || 0,
      total_avaliacoes: avaliacoesResult.count || 0,
      pre_requisitos: null,
      curso_nome: curso?.nome || null,
      curso_codigo: curso?.codigo || null,
      enfase_nome: null,
      enfase_codigo: null,
    }
  })
}

export async function getProfessoresByDisciplina(disciplinaId: string): Promise<ProfessorStats[]> {
  return withSupabase(async () => {
    // Buscar professores associados à disciplina
    const { data, error } = await supabase
      .from("professor_disciplinas")
      .select(`
        professor_id,
        professores (
          id,
          nome,
          email
        )
      `)
      .eq("disciplina_id", disciplinaId)

    if (error) throw error

    const professores: ProfessorStats[] = []
    
    for (const item of data || []) {
      const professor = Array.isArray(item.professores) ? item.professores[0] : item.professores
      if (!professor) continue

      // Calcular estatísticas do professor
      const [avaliacoesResult, disciplinasResult] = await Promise.all([
        supabase
          .from("avaliacoes")
          .select("estrelas")
          .eq("professor_id", professor.id),
        supabase
          .from("professor_disciplinas")
          .select("disciplina_id", { count: "exact", head: true })
          .eq("professor_id", professor.id)
      ])

      let mediaAvaliacoes = 0
      const totalAvaliacoes = avaliacoesResult.data?.length || 0
      
      if (avaliacoesResult.data && avaliacoesResult.data.length > 0) {
        const somaEstrelas = avaliacoesResult.data.reduce((soma, avaliacao) => soma + avaliacao.estrelas, 0)
        mediaAvaliacoes = somaEstrelas / avaliacoesResult.data.length
      }

      professores.push({
        id: professor.id,
        nome: professor.nome,
        email: professor.email,
        total_disciplinas: disciplinasResult.count || 0,
        total_avaliacoes: totalAvaliacoes,
        media_avaliacoes: mediaAvaliacoes
      })
    }

    return professores.sort((a, b) => a.nome.localeCompare(b.nome))
  })
}

// Função de busca para disciplinas e professores
export interface SearchResult {
  tipo: 'disciplina' | 'professor'
  codigo?: string
  nome: string
  professor?: string
  semestre?: string
  departamento?: string
  disciplinas?: string[]
  avaliacao?: number
  id?: string
  email?: string
}

export async function searchDisciplinasEProfessores(termo: string): Promise<SearchResult[]> {
  return withSupabase(async () => {
    if (termo.length < 3) {
      return []
    }

    const results: SearchResult[] = []
    const termoUpper = termo.toUpperCase()
    const termoLower = termo.toLowerCase()

    // Buscar disciplinas por código ou nome
    const { data: disciplinas, error: errorDisciplinas } = await supabase
      .from("disciplinas")
      .select(`
        id,
        codigo,
        nome,
        professor_disciplinas (
          professores (
            nome
          )
        )
      `)
      .or(`codigo.ilike.%${termoUpper}%,nome.ilike.%${termoLower}%`)
      .limit(10)

    if (!errorDisciplinas && disciplinas) {
      for (const disciplina of disciplinas) {
        const professores = disciplina.professor_disciplinas?.map((pd: any) => pd.professores?.nome).filter(Boolean) || []
        
        results.push({
          tipo: 'disciplina',
          id: disciplina.id,
          codigo: disciplina.codigo,
          nome: disciplina.nome,
          professor: professores.length > 0 ? professores.join(', ') : 'Não informado',
          semestre: '2024.1' // Placeholder - ajustar conforme necessário
        })
      }
    }

    // Buscar professores por nome
    const { data: professores, error: errorProfessores } = await supabase
      .from("professores")
      .select(`
        id,
        nome,
        email,
        professor_disciplinas (
          disciplinas (
            nome
          )
        )
      `)
      .ilike('nome', `%${termoLower}%`)
      .limit(10)

    if (!errorProfessores && professores) {
      for (const professor of professores) {
        const disciplinas = professor.professor_disciplinas?.map((pd: any) => pd.disciplinas?.nome).filter(Boolean) || []
        
        // Calcular média das avaliações diretamente da tabela avaliacoes
        const { data: avaliacoes } = await supabase
          .from("avaliacoes")
          .select("estrelas")
          .eq("professor_id", professor.id)
        
        let mediaEstrelas = 0
        if (avaliacoes && avaliacoes.length > 0) {
          const somaEstrelas = avaliacoes.reduce((soma, avaliacao) => soma + avaliacao.estrelas, 0)
          mediaEstrelas = somaEstrelas / avaliacoes.length
        }
        
        results.push({
          tipo: 'professor',
          id: professor.id,
          nome: professor.nome,
          email: professor.email,
          departamento: 'Não informado', // Placeholder - ajustar conforme estrutura do banco
          disciplinas: disciplinas.slice(0, 3), // Mostrar apenas as 3 primeiras
          avaliacao: mediaEstrelas
        })
      }
    }

    return results
  })
}

export async function createProfessor(nome: string, email?: string): Promise<Professor> {
  return withSupabase(async () => {
    // Validação e sanitização
    const nomeClean = sanitizeString(nome)
    if (!nomeClean || nomeClean.length < 2) {
      throw new Error('Nome do professor deve ter pelo menos 2 caracteres')
    }

    let emailClean: string | undefined
    if (email) {
      emailClean = sanitizeEmail(email)
      if (email && !emailClean) {
        throw new Error('Email inválido')
      }
    }

    // Rate limiting baseado no nome (previne spam)
    const rateLimitKey = `create_prof_${nomeClean.toLowerCase()}`
    if (!checkRateLimit(rateLimitKey)) {
      throw new Error('Muitas tentativas de cadastro. Tente novamente em alguns instantes.')
    }

    secureLog('Criando professor', { nome: nomeClean, hasEmail: !!emailClean })

    const { data, error } = await supabase
      .from("professores")
      .insert({ nome: nomeClean, email: emailClean })
      .select()
      .single()
      
    if (error) {
      secureError('Erro ao criar professor', error)
      throw error
    }
    
    secureLog('Professor criado com sucesso', { id: data.id })
    return data
  })
}

export async function linkProfessorToDisciplina(professorId: string, disciplinaId: string) {
  return withSupabase(async () => {
    // Validação de UUIDs
    if (!validateUUID(professorId)) {
      throw new Error('ID do professor inválido')
    }
    if (!validateUUID(disciplinaId)) {
      throw new Error('ID da disciplina inválido')
    }

    // Rate limiting
    const rateLimitKey = `link_${professorId}_${disciplinaId}`
    if (!checkRateLimit(rateLimitKey)) {
      throw new Error('Muitas tentativas de associação. Tente novamente em alguns instantes.')
    }

    // Verificar se associação já existe
    const { data: existing } = await supabase
      .from("professor_disciplinas")
      .select("id")
      .eq("professor_id", professorId)
      .eq("disciplina_id", disciplinaId)
      .single()

    if (existing) {
      throw new Error('Professor já está associado a esta disciplina')
    }

    secureLog('Associando professor à disciplina', { professorId, disciplinaId })

    const { error } = await supabase
      .from("professor_disciplinas")
      .insert({ professor_id: professorId, disciplina_id: disciplinaId })
      
    if (error) {
      secureError('Erro ao associar professor', error)
      throw error
    }

    secureLog('Professor associado com sucesso')
  })
}

export async function createAvaliacao(
  professorId: string,
  disciplinaId: string,
  usuarioId: string,
  estrelas: number,
  comentario?: string,
): Promise<Avaliacao> {
  return withSupabase(async () => {
    // Validação rigorosa de entrada
    if (!validateUUID(professorId)) {
      throw new Error('ID do professor inválido')
    }
    if (!validateUUID(disciplinaId)) {
      throw new Error('ID da disciplina inválido')
    }
    if (!validateUUID(usuarioId)) {
      throw new Error('ID do usuário inválido')
    }
    if (!validateEstrelas(estrelas)) {
      throw new Error('Número de estrelas deve ser entre 1 e 5')
    }

    let comentarioClean: string | undefined
    if (comentario) {
      comentarioClean = sanitizeString(comentario)
      if (comentarioClean.length > 1000) {
        throw new Error('Comentário muito longo (máximo 1000 caracteres)')
      }
      if (comentarioClean.length === 0) {
        comentarioClean = undefined
      }
    }

    // Rate limiting por usuário (previne spam de avaliações)
    const rateLimitKey = `avaliacao_${usuarioId}`
    if (!checkRateLimit(rateLimitKey)) {
      throw new Error('Muitas avaliações em pouco tempo. Aguarde antes de avaliar novamente.')
    }

    // Verificar se já existe avaliação (dupla proteção)
    const jaAvaliou = await checkUserAvaliacao(professorId, disciplinaId, usuarioId)
    if (jaAvaliou) {
      throw new Error('Você já avaliou este professor nesta disciplina')
    }

    secureLog('Criando avaliação', { 
      professorId, 
      disciplinaId, 
      usuarioId, 
      estrelas,
      hasComentario: !!comentarioClean 
    })

    const { data, error } = await supabase
      .from("avaliacoes")
      .insert({
        professor_id: professorId,
        disciplina_id: disciplinaId,
        usuario_id: usuarioId,
        estrelas,
        comentario: comentarioClean,
      })
      .select()
      .single()

    if (error) {
      secureError('Erro ao criar avaliação', error)
      throw error
    }

    secureLog('Avaliação criada com sucesso', { id: data.id })
    return data
  })
}

export async function checkUserAvaliacao(
  professorId: string,
  disciplinaId: string,
  usuarioId: string,
): Promise<boolean> {
  return withSupabase(async () => {
    // Validação de UUIDs
    if (!validateUUID(professorId) || !validateUUID(disciplinaId) || !validateUUID(usuarioId)) {
      secureError('IDs inválidos fornecidos para verificação de avaliação')
      return false
    }

    const { data, error } = await supabase
      .from("avaliacoes")
      .select("id")
      .eq("professor_id", professorId)
      .eq("disciplina_id", disciplinaId)
      .eq("usuario_id", usuarioId)

    if (error) {
      secureError('Erro ao verificar avaliação existente', error)
      return false // Em caso de erro, assumir que não existe
    }

    const exists = !!(data && data.length > 0)
    secureLog('Verificação de avaliação existente', { exists })
    return exists
  })
}

export async function getEstatisticasGerais() {
  return withSupabase(async () => {
    const [cursosResult, disciplinasResult, professoresResult, avaliacoesResult] = await Promise.all([
      supabase.from("cursos").select("id", { count: "exact", head: true }),
      supabase.from("disciplinas").select("id", { count: "exact", head: true }),
      supabase.from("professores").select("id", { count: "exact", head: true }),
      supabase.from("avaliacoes").select("id", { count: "exact", head: true }),
    ])

    return {
      totalCursos: cursosResult.count || 0,
      totalDisciplinas: disciplinasResult.count || 0,
      totalProfessores: professoresResult.count || 0,
      totalAvaliacoes: avaliacoesResult.count || 0,
    }
  })
}

// Função para reportar erro/feedback - VERSÃO SEGURA
export async function createFeedback(
  usuarioEmail: string,
  tipo: 'erro' | 'sugestao' | 'bug',
  titulo: string,
  descricao: string,
  pagina?: string
) {
  return withSupabase(async () => {
    // Validação e sanitização rigorosa
    const emailClean = sanitizeEmail(usuarioEmail)
    if (!emailClean) {
      throw new Error('Email inválido')
    }

    const tituloClean = sanitizeString(titulo)
    if (!tituloClean || tituloClean.length < 5) {
      throw new Error('Título deve ter pelo menos 5 caracteres')
    }
    if (tituloClean.length > 100) {
      throw new Error('Título muito longo (máximo 100 caracteres)')
    }

    const descricaoClean = sanitizeString(descricao)
    if (!descricaoClean || descricaoClean.length < 10) {
      throw new Error('Descrição deve ter pelo menos 10 caracteres')
    }
    if (descricaoClean.length > 2000) {
      throw new Error('Descrição muito longa (máximo 2000 caracteres)')
    }

    const tiposValidos = ['erro', 'sugestao', 'bug']
    if (!tiposValidos.includes(tipo)) {
      throw new Error('Tipo de feedback inválido')
    }

    let paginaClean: string | undefined
    if (pagina) {
      paginaClean = sanitizeString(pagina)
      if (paginaClean.length > 255) {
        paginaClean = paginaClean.substring(0, 255)
      }
    }

    // Rate limiting por email (previne spam)
    const rateLimitKey = `feedback_${emailClean}`
    if (!checkRateLimit(rateLimitKey)) {
      throw new Error('Muitos feedbacks enviados. Aguarde antes de enviar outro.')
    }

    secureLog('Criando feedback', { 
      email: emailClean, 
      tipo, 
      tituloLength: tituloClean.length,
      descricaoLength: descricaoClean.length 
    })

    const { data, error } = await supabase
      .from("feedbacks")
      .insert({
        usuario_email: emailClean,
        tipo,
        titulo: tituloClean,
        descricao: descricaoClean,
        pagina: paginaClean,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      secureError('Erro ao criar feedback', error)
      throw error
    }

    secureLog('Feedback criado com sucesso', { id: data.id })
    return data
  })
}

// Dados mockados para quando o Supabase não estiver configurado
export const MOCK_DATA = {
  cursos: [
    { id: "1", nome: "Engenharia Civil", codigo: "CIV", created_at: "", updated_at: "" },
    { id: "2", nome: "Engenharia Mecânica", codigo: "MEC", created_at: "", updated_at: "" },
    { id: "3", nome: "Engenharia Elétrica", codigo: "ELE", created_at: "", updated_at: "" },
    { id: "4", nome: "Engenharia de Produção", codigo: "PRO", created_at: "", updated_at: "" },
    { id: "5", nome: "Engenharia Ambiental e Sanitária", codigo: "AMB", created_at: "", updated_at: "" },
  ],
  enfases: [
    { id: "1", nome: "Estruturas", codigo: "EST", curso_id: "1", created_at: "", updated_at: "" },
    { id: "2", nome: "Geotecnia", codigo: "GEO", curso_id: "1", created_at: "", updated_at: "" },
    { id: "3", nome: "Hidráulica", codigo: "HID", curso_id: "1", created_at: "", updated_at: "" },
  ],
  disciplinas: [
    {
      id: "1",
      codigo: "MAT001",
      nome: "Cálculo I",
      periodo: "1º",
      tipo: "básica",
      carga_horaria: 75,
      periodo_sugerido: "1º",
      obrigatoria: true,
      total_professores: 3,
      total_avaliacoes: 15,
      pre_requisitos: null,
      curso_nome: null,
      curso_codigo: null,
      enfase_nome: null,
      enfase_codigo: null,
    },
    {
      id: "2",
      codigo: "FEN07-12779",
      nome: "Sociedade e Meio Ambiente",
      periodo: "1º",
      tipo: "específica",
      carga_horaria: 30,
      periodo_sugerido: "1º",
      obrigatoria: true,
      total_professores: 2,
      total_avaliacoes: 8,
      pre_requisitos: null,
      curso_nome: null,
      curso_codigo: null,
      enfase_nome: null,
      enfase_codigo: null,
    },
  ],
}

// Funções que retornam dados mockados quando Supabase não está configurado
export async function getCursosMock(): Promise<Curso[]> {
  return MOCK_DATA.cursos
}

export async function getCursoByCodeMock(codigo: string): Promise<Curso | null> {
  return MOCK_DATA.cursos.find((c) => c.codigo.toLowerCase() === codigo.toLowerCase()) || null
}

export async function getDisciplinasBasicasCursoMock(cursoCode: string): Promise<DisciplinaCompleta[]> {
  if (cursoCode.toLowerCase() === "amb") {
    return MOCK_DATA.disciplinas
  }
  return MOCK_DATA.disciplinas.filter((d) => d.tipo === "básica")
}

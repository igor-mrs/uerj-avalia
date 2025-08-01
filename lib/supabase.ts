import { createClient } from "@supabase/supabase-js"

// Validar se as variáveis de ambiente existem
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL")
}

if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos TypeScript para o banco de dados
export interface Curso {
  id: string
  nome: string
  codigo: string
  created_at: string
  updated_at: string
}

export interface Enfase {
  id: string
  nome: string
  codigo: string
  curso_id: string
  created_at: string
  updated_at: string
}

export interface Disciplina {
  id: string
  nome: string
  codigo: string
  periodo: string | null
  enfase_id: string
  created_at: string
  updated_at: string
}

export interface Professor {
  id: string
  nome: string
  email: string | null
  created_at: string
  updated_at: string
}

export interface Avaliacao {
  id: string
  professor_id: string
  disciplina_id: string
  usuario_id: string
  estrelas: number
  comentario: string | null
  created_at: string
  updated_at: string
}

export interface ProfessorStats {
  id: string
  nome: string
  email: string | null
  total_disciplinas: number
  total_avaliacoes: number
  media_avaliacoes: number
}

export interface DisciplinaStats {
  id: string
  nome: string
  codigo: string
  periodo: string | null
  enfase_nome: string
  curso_nome: string
  total_professores: number
  total_avaliacoes: number
}

export interface Feedback {
  id: string
  usuario_email: string
  tipo: 'erro' | 'sugestao' | 'bug'
  titulo: string
  descricao: string
  pagina: string | null
  created_at: string
}

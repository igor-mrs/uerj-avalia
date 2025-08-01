import { supabase } from "./supabase"

// Função para associar disciplina a curso via TypeScript
export async function associarDisciplinaCurso(
  disciplinaCodigo: string,
  cursoCodigo: string,
  periodoSugerido?: string,
  obrigatoria = true,
) {
  // Buscar IDs pelos códigos
  const [disciplinaResult, cursoResult] = await Promise.all([
    supabase.from("disciplinas").select("id").eq("codigo", disciplinaCodigo.toUpperCase()).single(),
    supabase.from("cursos").select("id").eq("codigo", cursoCodigo.toUpperCase()).single(),
  ])

  if (disciplinaResult.error) {
    throw new Error(`Disciplina ${disciplinaCodigo} não encontrada`)
  }

  if (cursoResult.error) {
    throw new Error(`Curso ${cursoCodigo} não encontrado`)
  }

  // Inserir associação
  const { error } = await supabase.from("disciplina_cursos").upsert({
    disciplina_id: disciplinaResult.data.id,
    curso_id: cursoResult.data.id,
    periodo_sugerido: periodoSugerido,
    obrigatoria,
  })

  if (error) throw error
}

// Função para associar disciplina a múltiplos cursos
export async function associarDisciplinaMultiplosCursos(
  disciplinaCodigo: string,
  cursosCodigos: string[],
  periodoSugerido?: string,
  obrigatoria = true,
) {
  for (const cursoCodigo of cursosCodigos) {
    await associarDisciplinaCurso(disciplinaCodigo, cursoCodigo, periodoSugerido, obrigatoria)
  }
}

// Função para remover associação
export async function removerDisciplinaCurso(disciplinaCodigo: string, cursoCodigo: string) {
  // Buscar IDs pelos códigos
  const [disciplinaResult, cursoResult] = await Promise.all([
    supabase.from("disciplinas").select("id").eq("codigo", disciplinaCodigo.toUpperCase()).single(),
    supabase.from("cursos").select("id").eq("codigo", cursoCodigo.toUpperCase()).single(),
  ])

  if (disciplinaResult.error || cursoResult.error) {
    throw new Error("Disciplina ou curso não encontrado")
  }

  const { error } = await supabase
    .from("disciplina_cursos")
    .delete()
    .eq("disciplina_id", disciplinaResult.data.id)
    .eq("curso_id", cursoResult.data.id)

  if (error) throw error
}

// Função para listar associações de uma disciplina
export async function listarCursosDaDisciplina(disciplinaCodigo: string) {
  const { data, error } = await supabase
    .from("disciplina_cursos")
    .select(`
      periodo_sugerido,
      obrigatoria,
      cursos (nome, codigo),
      disciplinas (nome, codigo)
    `)
    .eq("disciplinas.codigo", disciplinaCodigo.toUpperCase())

  if (error) throw error
  return data
}

// Função para listar disciplinas de um curso
export async function listarDisciplinasDoCurso(cursoCodigo: string) {
  const { data, error } = await supabase
    .from("disciplina_cursos")
    .select(`
      periodo_sugerido,
      obrigatoria,
      disciplinas (nome, codigo, tipo, carga_horaria),
      cursos (nome, codigo)
    `)
    .eq("cursos.codigo", cursoCodigo.toUpperCase())
    .order("periodo_sugerido")

  if (error) throw error
  return data
}

// Exemplos de uso:
/*
// Associar uma disciplina a um curso
await associarDisciplinaCurso('MAT001', 'CIV', '1º', true);

// Associar uma disciplina a múltiplos cursos
await associarDisciplinaMultiplosCursos('MAT001', ['CIV', 'MEC', 'ELE'], '1º', true);

// Remover associação
await removerDisciplinaCurso('MAT001', 'PRO');

// Listar cursos que têm uma disciplina
const cursos = await listarCursosDaDisciplina('MAT001');

// Listar disciplinas de um curso
const disciplinas = await listarDisciplinasDoCurso('CIV');
*/

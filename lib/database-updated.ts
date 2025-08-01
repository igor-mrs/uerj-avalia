import { supabase } from "./supabase"

// Função atualizada para buscar disciplinas por curso
export async function getDisciplinasByCurso(cursoCode: string) {
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
        tipo,
        carga_horaria
      )
    `)
    .eq("cursos.codigo", cursoCode.toUpperCase())
    .order("periodo_sugerido")

  if (error) throw error
  return (
    data?.map((item) => ({
      ...item.disciplinas,
      periodo_sugerido: item.periodo_sugerido,
      obrigatoria: item.obrigatoria,
    })) || []
  )
}

// Função atualizada para buscar disciplinas por ênfase
export async function getDisciplinasByEnfase(cursoCode: string, enfaseCode: string) {
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
        tipo,
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
  return (
    data?.map((item) => ({
      ...item.disciplinas,
      periodo_sugerido: item.periodo_sugerido,
      obrigatoria: item.obrigatoria,
    })) || []
  )
}

// Função para estatísticas por curso
export async function getEstatisticasCurso(cursoCode: string) {
  const [disciplinasResult, enfasesResult] = await Promise.all([
    supabase
      .from("disciplina_cursos")
      .select("disciplina_id", { count: "exact", head: true })
      .eq("cursos.codigo", cursoCode.toUpperCase()),
    supabase.from("enfases").select("id", { count: "exact", head: true }).eq("cursos.codigo", cursoCode.toUpperCase()),
  ])

  return {
    totalDisciplinas: disciplinasResult.count || 0,
    totalEnfases: enfasesResult.count || 0,
  }
}

# UERJ Professor Rating System

Sistema de avaliação de professores da Universidade do Estado do Rio de Janeiro (UERJ).

## 🚀 Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Linguagem de programação
- **Tailwind CSS** - Framework CSS
- **Supabase** - Backend as a Service
- **Shadcn/ui** - Componentes de UI

## 📋 Funcionalidades

- ✅ Visualização de cursos e disciplinas
- ✅ Sistema de avaliação de professores
- ✅ Autenticação com Supabase
- ✅ Interface responsiva
- ✅ Fluxograma interativo dos cursos
- ✅ Filtros por ênfases

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/igor-mrs/uerj-avalia.git
cd uerj-avalia
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Configure o Supabase:
- Crie um projeto no [Supabase](https://supabase.com)
- Configure as variáveis no `.env.local`
- Execute os scripts SQL da pasta `sql/`

5. Execute o projeto:
```bash
pnpm dev
```

## 🌐 Deploy

### Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com)
2. Conecte com GitHub
3. Selecione este repositório
4. Configure as variáveis de ambiente
5. Deploy automático!

### Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico
```

## 📊 Estrutura do Banco

- **cursos** - Cursos de graduação
- **enfases** - Ênfases por curso
- **disciplinas** - Disciplinas oferecidas
- **professores** - Professores da universidade
- **avaliacoes** - Avaliações dos professores
- **disciplina_associacoes** - Relacionamento disciplina-curso
- **disciplina_enfase_associacoes** - Relacionamento disciplina-ênfase

## 🎓 Cursos Suportados

- Engenharia Ambiental e Sanitária
- Engenharia Cartográfica
- Engenharia Civil
- Engenharia Elétrica
- Engenharia Mecânica
- Engenharia de Produção
- Engenharia Química (Diurno e Noturno)

## 📝 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Desenvolvedor

Desenvolvido por Igor Moreira para a UERJ.

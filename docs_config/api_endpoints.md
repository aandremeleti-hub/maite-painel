# 📂 Referência de Arquitetura: Camada de API, RPCs & Supabase Client

**Última Atualização:** 2026-10-29  
**Origem do Conhecimento:** `14.11_relatorio_fase3.md`, `14.12_plano_fase4_recuperado.md`, `15_implementation_plan_v4.md`, `15.1_relatorio_fase4_tipagem_testes.md`, `15.3_relatorio_fase4_completo.md`, `finalizacao-painel-maite_plan.md` (Fases 6, 7 e 8 As-Built)

---

## 🎯 1. Escopo e Regras de Negócio

### 1.1. Propósito da Camada
Esta frente padroniza toda a comunicação de dados entre a aplicação frontend React e o banco de dados Supabase PostgreSQL. Não são utilizadas rotas de API server-side tradicionais (Node/Express/Next API routes); em seu lugar, adota-se o **Supabase Client SDK v2** operando sobre PostgreSQL com **Row Level Security (RLS)** e orquestrado reativamente pelo **TanStack Query v5 (React Query)**.

### 1.2. Regras de Negócio e Convenções
1. **Conexão Singleton Única (`src/lib/supabase.ts`):**  
   O cliente do Supabase é instanciado uma única vez como singleton tipado via `Database` (`createClient<Database>`). Isso previne vazamentos de memória, conexões WebSocket órfãs e sobrecarga de requisições no navegador.
2. **Estratégia de Cache e Estabilidade TanStack Query:**
   - **Tempo de Frescor Padrão (`staleTime`):** 5 minutos (`5 * 60 * 1000`) para consultas gerais de alunos, dados bancários e listas base, reduzindo a taxa de chamadas ao banco.
   - **Refetch em Foco Desabilitado (`refetchOnWindowFocus: false`):** Evita refetches involuntários e piscar de tela ao alternar entre abas do navegador.
   - **Tentativas de Falha (`retry: 1`):** Apenas 1 retry automático para evitar loops em requisições rejeitadas por RLS.
3. **Fábrica Tipada de Chaves de Cache (`queryKeys`):**
   - Todas as chaves do React Query são centralizadas em `src/lib/queryKeys.ts` como tuplas imutáveis (`as const`). Proibido o uso de strings arbitrárias espalhadas nos componentes.
4. **Invalidação de Cache em Cascata (Mutações Financeiras):**
   - Ao criar, editar ou excluir uma aula (`useAddLesson`, `useUpdateLesson`, `useDeleteLesson`), a mutação invalida obrigatoriamente:
     - `queryKeys.lessons.all`
     - `['monthly_totals']` (Totais da competência)
     - `['student_monthly_detail']` (Extrato detalhado do aluno)
     - `['student_monthly_revenue']` (Receita do aluno)
   - Ao fechar ou reabrir mês (`useCloseMonth`, `useReopenMonth`), invalidam-se `closings.all`, `closings.totals` e `closings.status`.
   - Ao inativar ou atualizar aluno (`useInactivateStudent`, `useUpdateStudent`), invalidam-se simultaneamente `queryKeys.students.all` e `queryKeys.students.detail(id)`.
5. **Interceptação Contábil de Exclusão (`useDeleteStudent` - ADR 0002):**
   - A mutação intercepta o código de erro PostgreSQL `23503` disparado por `ON DELETE RESTRICT` e notifica o usuário via Sonner Toast com aviso orientativo para usar a Inativação Lógica.
6. **Tipagem Estrita sem Supressões:**
   - Proibido o uso de `@ts-expect-error` ou casts para `any`.
   - Todas as Stored Procedures e tabelas estão formalmente tipadas no bloco `Database` de `src/types/database.types.ts`.
7. **Manipulação de Datas Literais (ADR 0001):**
   - Datas transitam exclusivamente como strings no padrão ISO `'YYYY-MM-DD'`. Proibido o parsing via `new Date('YYYY-MM-DD')` no cliente, que gera retrocesso de 1 dia no fuso de Brasília (UTC-3).

---

## ⚙️ 2. Especificação Técnica e Códigos-Chave

### 2.1. Instanciação Singleton do Cliente Supabase (`src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Variáveis de ambiente do Supabase não encontradas no arquivo .env.local");
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
```

---

### 2.2. Configuração de Cache (`queryClient.ts`) e Chaves Tipadas (`queryKeys.ts`)

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos de frescor padrão
      refetchOnWindowFocus: false, // Sem refetch involuntário ao mudar de aba
      retry: 1,
    },
  },
});
```

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  students: {
    all: ['students'] as const,
    list: (status?: string) => [...queryKeys.students.all, { status }] as const,
    detail: (id: string) => [...queryKeys.students.all, id] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    byMonth: (year: number, month: number, studentId?: string) =>
      [...queryKeys.lessons.all, { year, month, studentId }] as const,
    list: (studentId?: string, month?: number, year?: number) =>
      ['lessons', studentId, month, year] as const,
  },
  closings: {
    all: ['closings'] as const,
    byYear: (year?: number) => [...queryKeys.closings.all, { year }] as const,
    totals: (year: number, month: number) => ['monthly_totals', year, month] as const,
    status: (year: number, month: number) => ['month_status', year, month] as const,
    studentDetail: (studentId: string | undefined, year: number, month: number) =>
      ['student_monthly_detail', studentId, year, month] as const,
    studentRevenue: (studentId: string | undefined, year: number, month: number) =>
      ['student_monthly_revenue', studentId, year, month] as const,
  },
  paymentInfo: {
    all: ['payment_info'] as const,
  },
};
```

---

### 2.3. Contratos de Dados (DTOs e Interfaces)

```typescript
import type { Database } from '../types/database.types';

// Tipos de Alunos
export type IStudent = Database['public']['Tables']['students']['Row'];
export type ICreateStudentDTO = Omit<Database['public']['Tables']['students']['Insert'], 'owner_id' | 'id' | 'created_at' | 'updated_at'>;
export type IUpdateStudentDTO = Omit<Database['public']['Tables']['students']['Update'], 'id'> & { id: string };
export interface IUpdateStudentStatusDTO {
  id: string;
  status: 'active' | 'inactive';
}

// Tipos de Aulas
export type ILesson = Database['public']['Tables']['lessons']['Row'];
export type ICreateLessonDTO = Omit<Database['public']['Tables']['lessons']['Insert'], 'owner_id' | 'hourly_rate_snapshot' | 'id' | 'created_at' | 'updated_at'>;
export type IUpdateLessonDTO = Omit<Database['public']['Tables']['lessons']['Update'], 'id'> & { id: string };

// Tipos de Pagamento e Chave PIX
export type IPaymentInfo = Database['public']['Tables']['payment_info']['Row'];
export type ICreatePaymentInfoDTO = Omit<Database['public']['Tables']['payment_info']['Insert'], 'owner_id' | 'id' | 'created_at' | 'updated_at'>;
export type IUpdatePaymentInfoDTO = Omit<Database['public']['Tables']['payment_info']['Update'], 'id'> & { id: string };

// Tipos de Fechamento Contábil
export type IClosing = Database['public']['Tables']['monthly_closings']['Row'];

export interface IMonthlyTotals {
  total_lessons: number;
  total_revenue: number;
}

export interface IStudentMonthlyDetail {
  lesson_date: string;
  category: string;
  multiplier: number;
  content_notes: string | null;
  hourly_rate_snapshot: number;
  lesson_value: number;
}
```

---

### 2.4. Hook de Domínio de Alunos (`src/hooks/useStudents.ts`)

```typescript
// useStudents - Listagem alfabética de todos os alunos
export function useStudents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.students.all,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        toast.error('Erro ao carregar os alunos');
        throw error;
      }
      return (data ?? []) as IStudent[];
    },
    enabled: !!user,
  });
}

// useStudent - Detalhe individual para deep-linking e F5 (/alunos/:id - ADR 0005)
export function useStudent(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.students.detail(id ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!id) throw new Error('Student ID is required');
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error('Erro ao carregar os dados do aluno');
        throw error;
      }
      return data as IStudent;
    },
    enabled: !!id && !!user,
  });
}

// useInactivateStudent - Inativação lógica com invalidação de caches
export function useInactivateStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: IUpdateStudentStatusDTO) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('students')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as IStudent;
    },
    onSuccess: (_data, variables) => {
      const isInactive = variables.status === 'inactive';
      toast.success(isInactive ? 'Aluno inativado com sucesso!' : 'Aluno ativado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status do aluno: ${error.message}`);
    },
  });
}

// useDeleteStudent - Intercepta violação de FK 23503 via ON DELETE RESTRICT (ADR 0002)
export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      toast.success('Aluno excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.removeQueries({ queryKey: queryKeys.students.detail(id) });
    },
    onError: (error: { code?: string; message?: string; details?: string }) => {
      const isFkViolation =
        error?.code === '23503' ||
        error?.message?.includes('23503') ||
        error?.message?.includes('foreign key') ||
        error?.details?.includes('23503');

      if (isFkViolation) {
        toast.error(
          'Não é possível excluir permanentemente este aluno pois existem aulas históricas vinculadas. Utilize a Inativação Lógica para preservar o histórico.',
          { duration: 6000 }
        );
        return;
      }
      toast.error(`Erro ao excluir aluno: ${error.message || 'Erro inesperado'}`);
    },
  });
}
```

---

### 2.5. Hook de Domínio de Aulas (`src/hooks/useLessons.ts`)

```typescript
// useLessons - Consulta com filtro opcional de competência e aluno
export function useLessons(studentId?: string, month?: number, year?: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.lessons.list(studentId, month, year),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('lessons')
        .select('*')
        .order('lesson_date', { ascending: false });

      if (studentId) query = query.eq('student_id', studentId);

      if (month && year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonthYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const endExclusive = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;
        query = query.gte('lesson_date', startDate).lt('lesson_date', endExclusive);
      }

      const { data, error } = await query;
      if (error) {
        toast.error('Erro ao carregar as aulas');
        throw error;
      }
      return (data ?? []) as ILesson[];
    },
    enabled: !!user,
  });
}

// useAddLesson - Injeção de owner_id e invalidação em cascata
export function useAddLesson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lesson: ICreateLessonDTO) => {
      if (!user) throw new Error('Not authenticated');
      const payload = { ...lesson, owner_id: user.id };
      const { data, error } = await supabase.from('lessons').insert(payload).select().single();
      if (error) throw error;
      return data as ILesson;
    },
    onSuccess: () => {
      toast.success('Aula registrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: ['monthly_totals'] });
      queryClient.invalidateQueries({ queryKey: ['student_monthly_detail'] });
      queryClient.invalidateQueries({ queryKey: ['student_monthly_revenue'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar aula: ${error.message}`);
    },
  });
}
```

---

### 2.6. Hooks de Fechamento Contábil e Stored Procedures (`src/hooks/useClosing.ts`)

```typescript
// useCalculateMonthlyTotals - Consulta à RPC de Totais
export function useCalculateMonthlyTotals(year: number, month: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.closings.totals(year, month),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .rpc('fn_calculate_monthly_totals', { p_owner_id: user.id, p_year: year, p_month: month })
        .maybeSingle();
      if (error) {
        toast.error(`Erro ao calcular totais: ${error.message}`);
        throw error;
      }
      return (data ?? { total_lessons: 0, total_revenue: 0 }) as IMonthlyTotals;
    },
    enabled: !!user && !!year && !!month,
  });
}

// useMonthStatus - Status do Cadeado Contábil ('open' | 'closed')
export function useMonthStatus(year: number, month: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.closings.status(year, month),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('monthly_closings')
        .select('status, closed_at')
        .eq('owner_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) {
        toast.error(`Erro ao consultar status do mês: ${error.message}`);
        throw error;
      }
      return (data?.status ?? 'open') as 'open' | 'closed';
    },
    enabled: !!user && !!year && !!month,
  });
}

// useCloseMonth - Disparo da RPC fn_close_month (ADR 0003)
export function useCloseMonth() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .rpc('fn_close_month', { p_owner_id: user.id, p_year: year, p_month: month });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Mês fechado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.totals(variables.year, variables.month) });
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.status(variables.year, variables.month) });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fechar o mês: ${error.message}`);
    },
  });
}

// useReopenMonth - Disparo da RPC fn_reopen_month
export function useReopenMonth() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('fn_reopen_month', { p_year: year, p_month: month });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Mês reaberto com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.totals(variables.year, variables.month) });
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.status(variables.year, variables.month) });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reabrir o mês: ${error.message}`);
    },
  });
}
```

---

## 🔗 3. Arquivos Ativos e Referências no Projeto

- [supabase.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/lib/supabase.ts) — *Instanciação singleton do Supabase Client fortemente tipado com Database.*
- [queryClient.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/lib/queryClient.ts) — *Configuração de opções globais do TanStack Query v5.*
- [queryKeys.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/lib/queryKeys.ts) — *Fábrica tipada e centralizada de chaves de cache.*
- [formatters.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/lib/formatters.ts) — *Formatadores pt-BR de moeda, telefone, datas literais sem fuso (ADR 0001) e máscara progressiva.*
- [currencyUtils.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/lib/currencyUtils.ts) — *Utilitário puro de moeda BRL desacoplado para o Time Sheet e geração de PDF.*
- [closingAggregator.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Closing/utils/closingAggregator.ts) — *Agregação em memória O(N+M) para alimentação da tabela em acordeão do Closing.*
- [useStudents.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useStudents.ts) — *Hooks de listagem, busca individual, inativação lógica e exclusão protegida de alunos.*
- [useLessons.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useLessons.ts) — *Hooks de listagem por competência e mutações CRUD de aulas com invalidação em cascata.*
- [useClosing.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useClosing.ts) — *Hooks de integração com as 5 RPCs financeiras e mutações de fechamento/reabertura.*
- [usePaymentInfo.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/usePaymentInfo.ts) — *Hooks de consulta e atualização de chave PIX e dados bancários.*

---

## 🧠 4. Lições Aprendidas, Erros Comuns & Gotchas (Essencial)

> [!IMPORTANT]
> **Gotchas e Erros Evitados na Camada de API:**
> 
> 1. **Interceptação de Erro 23503 (`ON DELETE RESTRICT`):**  
>    O Supabase retorna objetos de erro contendo `code: '23503'`. No hook `useDeleteStudent`, a verificação deve checar `error?.code === '23503'` e também fazer fallback para `error?.message?.includes('23503')`. Isso viabiliza feedback imediato e previne que o usuário acredite em uma falha de sistema.
> 
> 2. **Remoção de Cache vs Invalidação (`removeQueries` vs `invalidateQueries`):**  
>    Ao deletar um registro com sucesso, chamar `queryClient.removeQueries({ queryKey: queryKeys.students.detail(id) })` impede que requisições antigas em cache continuem existindo no estado do React Query, enquanto `invalidateQueries` sincroniza as listas agregadas.
> 
> 3. **Uso de `.maybeSingle()` vs `.single()` para Status de Competência:**  
>    Ao consultar o status de um mês que ainda não teve fechamento registrado em `monthly_closings`, o método `.single()` dispara exceção HTTP 406 (`PGRST116: JSON object requested, multiple (or no) rows returned`). Deve-se utilizar obrigatoriamente `.maybeSingle()`, fornecendo fallback seguro `data?.status ?? 'open'`.
> 
> 4. **Armadilha de Fuso Horário em Filtros de Data (ADR 0001):**  
>    Ao filtrar aulas por mês, nunca monte limites usando `new Date(year, month, 1)`. Use formatação estrita de strings literais:  
>    `startDate = `${year}-${String(month).padStart(2, '0')}-01``  
>    `endExclusive = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01``  
>    Aplicando `.gte('lesson_date', startDate).lt('lesson_date', endExclusive)`.
> 
> 5. **Invalidação Transversal Obrigatória após Mutações:**  
>    Registrar uma aula altera o faturamento do mês e o extrato do aluno. O hook de mutação de aula DEVE invalidar `monthly_totals` e `student_monthly_detail`. Caso contrário, a UI exibe valores defasados por conta do `staleTime: 5 min`.
> 
> 6. **Propagação Segura de `owner_id` em Mutações:**  
>    O payload enviado via Supabase Client deve injetar `owner_id: user.id`. Se o payload omitir o `owner_id`, o RLS do Supabase rejeitará a operação com erro de violação de política (`new row violates row-level security policy`).

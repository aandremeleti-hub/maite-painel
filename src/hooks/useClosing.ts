import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '../types/database.types';

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

export type IClosing = Database['public']['Tables']['monthly_closings']['Row'];

/**
 * Hook para consultar os totais de aulas e receita calculados pela Stored Procedure no DB.
 */
export function useCalculateMonthlyTotals(year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.closings.totals(year, month),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('fn_calculate_monthly_totals', {
          p_owner_id: user.id,
          p_year: year,
          p_month: month,
        })
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

/**
 * Hook para buscar o extrato mensal detalhado de um aluno (usado na geração do Time Sheet).
 */
export function useStudentMonthlyDetail(studentId: string | undefined, year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.closings.studentDetail(studentId, year, month),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!studentId) throw new Error('ID do aluno é obrigatório');

      const { data, error } = await supabase
        .rpc('fn_get_student_monthly_detail', {
          p_student_id: studentId,
          p_year: year,
          p_month: month,
        });

      if (error) {
        toast.error(`Erro ao buscar detalhamento: ${error.message}`);
        throw error;
      }

      return (data ?? []) as IStudentMonthlyDetail[];
    },
    enabled: !!user && !!studentId && !!year && !!month,
  });
}

/**
 * Hook para calcular a receita mensal total de um aluno específico via RPC.
 */
export function useStudentMonthlyRevenue(studentId: string | undefined, year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.closings.studentRevenue(studentId, year, month),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!studentId) throw new Error('ID do aluno é obrigatório');

      const { data, error } = await supabase
        .rpc('fn_calculate_student_monthly_revenue', {
          p_student_id: studentId,
          p_year: year,
          p_month: month,
        });

      if (error) {
        toast.error(`Erro ao calcular receita do aluno: ${error.message}`);
        throw error;
      }

      return Number(data ?? 0);
    },
    enabled: !!user && !!studentId && !!year && !!month,
  });
}

/**
 * Hook para consultar o status de fechamento ('open' | 'closed') de uma competência.
 */
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

/**
 * Hook consolidado para listar o histórico de fechamentos de meses.
 */
export function useClosings(year?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: year ? queryKeys.closings.byYear(year) : queryKeys.closings.all,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('monthly_closings')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Erro ao carregar os fechamentos de mês');
        throw error;
      }
      return (data ?? []) as IClosing[];
    },
    enabled: !!user,
  });
}

/**
 * Hook para selar o fechamento de uma competência (chama Stored Procedure fn_close_month).
 */
export function useCloseMonth() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .rpc('fn_close_month', {
          p_owner_id: user.id,
          p_year: year,
          p_month: month,
        });

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

/**
 * Hook para reabrir uma competência fechada (chama Stored Procedure fn_reopen_month).
 */
export function useReopenMonth() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .rpc('fn_reopen_month', {
          p_year: year,
          p_month: month,
        });

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

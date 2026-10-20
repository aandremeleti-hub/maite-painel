import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

import type { Database } from '../types/database.types';

type LessonRow = Database['public']['Tables']['lessons']['Row'];
type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type LessonUpdate = Database['public']['Tables']['lessons']['Update'];

export type ILesson = LessonRow;
export type ICreateLessonDTO = Omit<LessonInsert, 'owner_id' | 'hourly_rate_snapshot' | 'id' | 'created_at' | 'updated_at'>;
export type IUpdateLessonDTO = Omit<LessonUpdate, 'id'> & { id: string };

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

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

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

export function useAddLesson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lesson: ICreateLessonDTO) => {
      if (!user) throw new Error('Not authenticated');

      const payload: LessonInsert = {
        ...lesson,
        owner_id: user.id,
      };

      const { data, error } = await supabase
        .from('lessons')
        .insert(payload)
        .select()
        .single();

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

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IUpdateLessonDTO) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('lessons')
        .update(updates as LessonUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ILesson;
    },
    onSuccess: () => {
      toast.success('Aula atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: ['monthly_totals'] });
      queryClient.invalidateQueries({ queryKey: ['student_monthly_detail'] });
      queryClient.invalidateQueries({ queryKey: ['student_monthly_revenue'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar aula: ${error.message}`);
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success('Aula removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: ['monthly_totals'] });
      queryClient.invalidateQueries({ queryKey: ['student_monthly_detail'] });
      queryClient.invalidateQueries({ queryKey: ['student_monthly_revenue'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover aula: ${error.message}`);
    },
  });
}

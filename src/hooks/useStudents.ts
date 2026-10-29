import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type { Database } from '../types/database.types';

type StudentRow = Database['public']['Tables']['students']['Row'];
type StudentInsert = Database['public']['Tables']['students']['Insert'];
type StudentUpdate = Database['public']['Tables']['students']['Update'];

export type IStudent = StudentRow;
export type ICreateStudentDTO = Omit<StudentInsert, 'owner_id' | 'id' | 'created_at' | 'updated_at'>;
export type IUpdateStudentDTO = Omit<StudentUpdate, 'id'> & { id: string };
export interface IUpdateStudentStatusDTO {
  id: string;
  status: 'active' | 'inactive';
}
export type StudentFilterStatus = 'active' | 'inactive' | 'all';

const SYNC_STORAGE_KEY = 'maite_synced_inactive_students';
interface SyncRpcClient {
  rpc: (fn: 'fn_sync_inactive_students', args: { p_owner_id: string }) => Promise<{ data: number | null; error: unknown }>;
}

export function useStudents(status?: StudentFilterStatus) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    try {
      if (sessionStorage.getItem(SYNC_STORAGE_KEY)) return;
    } catch {
      return;
    }

    (supabase as unknown as SyncRpcClient)
      .rpc('fn_sync_inactive_students', { p_owner_id: user.id })
      .then(({ data, error }) => {
        if (error) {
          console.warn('Falha silenciosa ao sincronizar alunos inativos:', error);
          return;
        }
        try { sessionStorage.setItem(SYNC_STORAGE_KEY, new Date().toISOString()); } catch { /* ignore */ }
        if (typeof data === 'number' && data > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
        }
      })
      .catch((err) => console.warn('Falha silenciosa ao sincronizar alunos inativos:', err));
  }, [user, queryClient]);

  const activeFilter = status && status !== 'all' ? status : undefined;

  return useQuery({
    queryKey: activeFilter ? queryKeys.students.list(activeFilter) : queryKeys.students.all,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      let query = supabase.from('students').select('*').order('name', { ascending: true });
      if (activeFilter) query = query.eq('status', activeFilter);
      const { data, error } = await query;
      if (error) {
        toast.error('Erro ao carregar os alunos');
        throw error;
      }
      return (data ?? []) as IStudent[];
    },
    enabled: !!user,
  });
}

export function useStudent(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.students.detail(id ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!id) throw new Error('Student ID is required');
      const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
      if (error) { toast.error('Erro ao carregar os dados do aluno'); throw error; }
      return data as IStudent;
    },
    enabled: !!id && !!user,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (student: ICreateStudentDTO) => {
      if (!user) throw new Error('Not authenticated');
      const payload: StudentInsert = { ...student, owner_id: user.id };
      const { data, error } = await supabase.from('students').insert(payload).select().single();
      if (error) throw error;
      return data as IStudent;
    },
    onSuccess: () => {
      toast.success('Aluno cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
    onError: (error: Error) => toast.error(`Erro ao cadastrar aluno: ${error.message}`),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: IUpdateStudentDTO) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('students').update(updates as StudentUpdate).eq('id', id).select().single();
      if (error) throw error;
      return data as IStudent;
    },
    onSuccess: (_data, variables) => {
      toast.success('Aluno atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(variables.id) });
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar aluno: ${error.message}`),
  });
}

export function useInactivateStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: IUpdateStudentStatusDTO) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('students').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data as IStudent;
    },
    onSuccess: (_data, variables) => {
      const isInactive = variables.status === 'inactive';
      toast.success(isInactive ? 'Aluno inativado com sucesso!' : 'Aluno ativado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(variables.id) });
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar status do aluno: ${error.message}`),
  });
}

export const useUpdateStudentStatus = useInactivateStudent;

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
      const isFkViolation = error?.code === '23503' || error?.message?.includes('23503') ||
        error?.message?.includes('foreign key') || error?.details?.includes('23503');
      if (isFkViolation) {
        toast.error('Não é possível excluir permanentemente este aluno pois existem aulas históricas vinculadas. Utilize a Inativação Lógica para preservar o histórico.', { duration: 6000 });
        return;
      }
      toast.error(`Erro ao excluir aluno: ${error.message || 'Erro inesperado'}`);
    },
  });
}

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

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (student: ICreateStudentDTO) => {
      if (!user) throw new Error('Not authenticated');

      const payload: StudentInsert = { ...student, owner_id: user.id };

      const { data, error } = await supabase
        .from('students')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as IStudent;
    },
    onSuccess: () => {
      toast.success('Aluno cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar aluno: ${error.message}`);
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IUpdateStudentDTO) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('students')
        .update(updates as StudentUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as IStudent;
    },
    onSuccess: () => {
      toast.success('Aluno atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar aluno: ${error.message}`);
    },
  });
}

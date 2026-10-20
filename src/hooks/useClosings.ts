/**
 * @file useClosings.ts
 * @description Hook retrocompatível para consulta do histórico de fechamentos.
 * Conforme o plano mestre (Fase 4), as operações de fechamento e reabertura
 * foram unificadas em `src/hooks/useClosing.ts` via Stored Procedures.
 */

export { useClosings } from './useClosing';
export type { IClosing } from './useClosing';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '../types/database.types';

type ClosingInsert = Database['public']['Tables']['monthly_closings']['Insert'];
type ClosingUpdate = Database['public']['Tables']['monthly_closings']['Update'];

export type ICreateClosingDTO = Omit<ClosingInsert, 'owner_id' | 'id' | 'created_at'>;
export type IUpdateClosingDTO = Omit<ClosingUpdate, 'id'> & { id: string };

/**
 * @deprecated Utilize `useCloseMonth()` de `useClosing.ts` para fechamentos de mês via Stored Procedure.
 */
export function useCreateClosing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (closing: ICreateClosingDTO) => {
      if (!user) throw new Error('Not authenticated');

      const payload: ClosingInsert = { ...closing, owner_id: user.id };

      const { data, error } = await supabase
        .from('monthly_closings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Mês fechado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fechar o mês: ${error.message}`);
    },
  });
}

/**
 * @deprecated Utilize `useReopenMonth()` de `useClosing.ts` para alterar o status da competência via Stored Procedure.
 */
export function useUpdateClosing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IUpdateClosingDTO) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('monthly_closings')
        .update(updates as ClosingUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Status do fechamento atualizado!');
      queryClient.invalidateQueries({ queryKey: queryKeys.closings.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar fechamento: ${error.message}`);
    },
  });
}

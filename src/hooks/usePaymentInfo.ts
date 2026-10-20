import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type { Database } from '../types/database.types';

type PaymentInfoRow = Database['public']['Tables']['payment_info']['Row'];
type PaymentInfoInsert = Database['public']['Tables']['payment_info']['Insert'];
type PaymentInfoUpdate = Database['public']['Tables']['payment_info']['Update'];

export type IPaymentInfo = PaymentInfoRow;
export type ICreatePaymentInfoDTO = Omit<PaymentInfoInsert, 'owner_id' | 'id' | 'created_at' | 'updated_at'>;
export type IUpdatePaymentInfoDTO = Omit<PaymentInfoUpdate, 'id'> & { id: string };

export function usePaymentInfo() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.paymentInfo.all,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payment_info')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar os dados de pagamento');
        throw error;
      }
      return (data ?? []) as IPaymentInfo[];
    },
    enabled: !!user,
  });
}

export function useCreatePaymentInfo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (paymentInfo: ICreatePaymentInfoDTO) => {
      if (!user) throw new Error('Not authenticated');

      const payload: PaymentInfoInsert = { ...paymentInfo, owner_id: user.id };

      const { data, error } = await supabase
        .from('payment_info')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as IPaymentInfo;
    },
    onSuccess: () => {
      toast.success('Dados bancários salvos com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentInfo.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar dados de pagamento: ${error.message}`);
    },
  });
}

export function useUpdatePaymentInfo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IUpdatePaymentInfoDTO) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payment_info')
        .update(updates as PaymentInfoUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as IPaymentInfo;
    },
    onSuccess: () => {
      toast.success('Dados bancários atualizados!');
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentInfo.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar dados: ${error.message}`);
    },
  });
}

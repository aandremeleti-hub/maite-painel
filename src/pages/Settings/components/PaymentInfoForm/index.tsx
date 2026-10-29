import { useState, type FC, type FormEvent, type ChangeEvent } from 'react';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { useCreatePaymentInfo, useUpdatePaymentInfo, type IPaymentInfo } from '../../../../hooks/usePaymentInfo';
import styles from './styles.module.css';

export type PixType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface IPaymentInfoFormData {
  account_holder: string;
  bank_name: string;
  pix_type: PixType;
  pix_key: string;
}

export interface IPaymentInfoFormProps {
  initialData?: IPaymentInfo | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const PIX_OPTIONS = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone Celular' },
  { value: 'random', label: 'Chave Aleatória' },
];

const PIX_CONFIG: Record<PixType, { placeholder: string; helper: string }> = {
  cpf: { placeholder: '000.000.000-00', helper: 'Ex: 123.456.789-00' },
  cnpj: { placeholder: '00.000.000/0000-00', helper: 'Ex: 12.345.678/0001-90' },
  email: { placeholder: 'exemplo@dominio.com', helper: 'E-mail cadastrado na conta' },
  phone: { placeholder: '(11) 98765-4321', helper: 'DDD + número celular' },
  random: { placeholder: '123e4567-e89b-12d3-a456-426614174000', helper: 'Chave EVP alfanumérica' },
};

function maskPixKey(value: string, type: PixType): string {
  if (!value) return '';
  const d = value.replace(/\D/g, '');
  if (type === 'cpf') return d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  if (type === 'cnpj') return d.slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  if (type === 'phone') {
    const s = d.slice(0, 11);
    return s.length <= 10 ? s.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2') : s.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
  return value;
}

interface IFormErrors {
  accountHolder?: string;
  pixKey?: string;
}

function validatePix(holder: string, key: string, type: PixType): IFormErrors {
  const errs: IFormErrors = {};
  if (!holder.trim()) errs.accountHolder = 'O nome do titular é obrigatório.';
  const clean = key.trim();
  const digits = clean.replace(/\D/g, '');
  if (!clean) errs.pixKey = 'A chave PIX é obrigatória.';
  else if (type === 'cpf' && digits.length !== 11) errs.pixKey = 'CPF deve conter exatamente 11 dígitos.';
  else if (type === 'cnpj' && digits.length !== 14) errs.pixKey = 'CNPJ deve conter exatamente 14 dígitos.';
  else if (type === 'phone' && (digits.length < 10 || digits.length > 11)) errs.pixKey = 'Telefone deve conter DDD + número (10 ou 11 dígitos).';
  else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) errs.pixKey = 'Informe um endereço de e-mail válido.';
  else if (type === 'random' && clean.length < 20) errs.pixKey = 'Chave aleatória inválida.';
  return errs;
}

export const PaymentInfoForm: FC<IPaymentInfoFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  className,
}) => {
  const createMutation = useCreatePaymentInfo();
  const updateMutation = useUpdatePaymentInfo();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [accountHolder, setAccountHolder] = useState(() => initialData?.account_holder || '');
  const [bankName, setBankName] = useState(() => initialData?.bank_name || '');
  const [pixType, setPixType] = useState<PixType>(() => (initialData?.pix_type as PixType) || 'cpf');
  const [pixKey, setPixKey] = useState(() => initialData?.pix_key || '');
  const [errors, setErrors] = useState<IFormErrors>({});

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value as PixType;
    setPixType(nextType);
    setPixKey((prev) => maskPixKey(prev, nextType));
    setErrors((prev) => ({ ...prev, pixKey: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const valErrors = validatePix(accountHolder, pixKey, pixType);
    if (Object.keys(valErrors).length > 0) return setErrors(valErrors);

    try {
      const payload = {
        account_holder: accountHolder.trim(),
        bank_name: bankName.trim() || null,
        pix_type: pixType,
        pix_key: pixKey.trim(),
        is_default: true,
      };
      if (initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      // toast tratado pelo hook
    }
  };

  const formClasses = [styles.form, className || ''].filter(Boolean).join(' ');

  return (
    <form className={formClasses} onSubmit={handleSubmit} noValidate>
      <div className={styles.fieldsGrid}>
        <Input
          id="account_holder"
          label="Nome do Titular da Conta"
          placeholder="Ex: Maite Sartori"
          value={accountHolder}
          onChange={(e) => {
            setAccountHolder(e.target.value);
            if (errors.accountHolder) setErrors((prev) => ({ ...prev, accountHolder: undefined }));
          }}
          error={errors.accountHolder}
          disabled={isPending}
          required
        />
        <Input
          id="bank_name"
          label="Instituição Bancária"
          placeholder="Ex: Nubank, Banco do Brasil, Itaú"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          disabled={isPending}
        />
        <div className={styles.row}>
          <Select
            id="pix_type"
            label="Tipo de Chave PIX"
            value={pixType}
            onChange={handleTypeChange}
            options={PIX_OPTIONS}
            disabled={isPending}
          />
          <Input
            id="pix_key"
            label="Chave PIX"
            placeholder={PIX_CONFIG[pixType].placeholder}
            helperText={PIX_CONFIG[pixType].helper}
            value={pixKey}
            onChange={(e) => {
              setPixKey(maskPixKey(e.target.value, pixType));
              if (errors.pixKey) setErrors((prev) => ({ ...prev, pixKey: undefined }));
            }}
            error={errors.pixKey}
            disabled={isPending}
            required
          />
        </div>
      </div>
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" isPending={isPending}>
          {initialData ? 'Salvar Alterações' : 'Cadastrar Chave PIX'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentInfoForm;

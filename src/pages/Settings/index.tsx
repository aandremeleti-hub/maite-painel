import { useState, type HTMLAttributes } from 'react';
import { Settings, User, CreditCard, Shield, Pencil, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentInfo } from '../../hooks/usePaymentInfo';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PaymentInfoForm } from './components/PaymentInfoForm';
import styles from './styles.module.css';

export interface ISettingsPageProps extends HTMLAttributes<HTMLDivElement> {}

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone Celular',
  random: 'Chave Aleatória',
};

export function SettingsPage({ className, ...restProps }: ISettingsPageProps) {
  const { user, profile } = useAuth();
  const { data: paymentInfoList, isLoading: isLoadingPayment } = usePaymentInfo();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const defaultPayment = paymentInfoList?.find((p) => p.is_default) || paymentInfoList?.[0];
  const teacherName = profile?.full_name || 'Professora Maite';
  const teacherEmail = user?.email || 'contato@maite.com.br';

  const containerClasses = [styles.container, className || ''].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...restProps}>
      <header className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Configurações</h1>
        <p className={styles.pageDescription}>
          Perfil da professora, credenciais e dados bancários para recebimento de honorários.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className={styles.moduleHero}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <Settings className={styles.moduleIcon} />
            </div>
            <div className={styles.heroMeta}>
              <h2 className={styles.heroTitle}>Configurações & PIX</h2>
              <p className={styles.heroSubtitle}>
                Gerencie os dados que aparecem nos relatórios de faturamento e demonstrativos em PDF.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className={styles.cardContent}>
          <div className={styles.sectionsGrid}>
            <section className={styles.sectionBlock} aria-labelledby="profile-heading">
              <div className={styles.sectionHeader}>
                <User className={styles.sectionIcon} aria-hidden="true" />
                <h3 id="profile-heading" className={styles.sectionTitle}>
                  Perfil da Professora
                </h3>
              </div>

              <div className={styles.dataList}>
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Nome Completo:</span>
                  <span className={styles.dataValue}>{teacherName}</span>
                </div>
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>E-mail de Acesso:</span>
                  <span className={styles.dataValue}>{teacherEmail}</span>
                </div>
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Perfil no Sistema:</span>
                  <div>
                    <Badge variant="standard" size="sm">Administradora</Badge>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="payment-heading">
              <div className={styles.sectionHeader}>
                <CreditCard className={styles.sectionIcon} aria-hidden="true" />
                <h3 id="payment-heading" className={styles.sectionTitle}>
                  Dados Bancários & Chave PIX
                </h3>
              </div>

              {isLoadingPayment ? (
                <p className={styles.emptyNotice}>Carregando informações financeiras...</p>
              ) : defaultPayment ? (
                <>
                  <div className={styles.dataList}>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Titular da Conta:</span>
                      <span className={styles.dataValue}>{defaultPayment.account_holder || 'Não informado'}</span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Instituição / Banco:</span>
                      <span className={styles.dataValue}>{defaultPayment.bank_name || 'Não informado'}</span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Chave PIX:</span>
                      <span className={styles.dataValue}>{defaultPayment.pix_key}</span>
                    </div>
                    <div className={styles.dataItem}>
                      <span className={styles.dataLabel}>Tipo de Chave:</span>
                      <span className={styles.dataValue}>
                        {PIX_TYPE_LABELS[defaultPayment.pix_type || ''] || defaultPayment.pix_type?.toUpperCase() || 'PIX'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.paymentActions}>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Pencil size={14} />}
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      Editar Dados Bancários
                    </Button>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyNotice}>
                    Nenhuma chave PIX cadastrada para recebimento de honorários.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    Cadastrar Chave PIX
                  </Button>
                </div>
              )}
            </section>
          </div>

          <section className={styles.sectionBlock} aria-labelledby="security-heading">
            <div className={styles.sectionHeader}>
              <Shield className={styles.sectionIcon} aria-hidden="true" />
              <h3 id="security-heading" className={styles.sectionTitle}>
                Segurança e Governança
              </h3>
            </div>
            <p className={styles.emptyNotice}>
              Ambiente protegido por RLS (Row Level Security) e autenticação criptografada Supabase Auth.
            </p>
          </section>
        </CardBody>
      </Card>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={defaultPayment ? 'Editar Dados Bancários' : 'Cadastrar Chave PIX'}
        description="Os dados cadastrados serão exibidos nos demonstrativos mensais (Time Sheet) gerados para os alunos."
        size="md"
      >
        <PaymentInfoForm
          initialData={defaultPayment}
          onSuccess={() => setIsPaymentModalOpen(false)}
          onCancel={() => setIsPaymentModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default SettingsPage;

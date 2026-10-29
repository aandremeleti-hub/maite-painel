import { useState, useMemo, type FC } from 'react';
import { Plus, Search, X, Users, SearchX, AlertCircle } from 'lucide-react';
import { useStudents, type IStudent } from '../../hooks/useStudents';
import { StudentCard } from '../../components/students/StudentCard';
import {
  StudentStatusFilter,
  type StudentStatusFilterType,
} from '../../components/students/StudentStatusFilter';
import { StudentFormModal } from '../../components/students/StudentFormModal';
import { StudentDeleteModal } from '../../components/students/StudentDeleteModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './styles.module.css';

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const StudentsPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<StudentStatusFilterType>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<IStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<IStudent | null>(null);

  const { data: students = [], isLoading, isError, refetch } = useStudents();

  const counts = useMemo(() => {
    let active = 0, inactive = 0;
    for (const s of students) {
      if (s.status === 'active') active++;
      else if (s.status === 'inactive') inactive++;
    }
    return { all: students.length, active, inactive };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const term = normalize(searchTerm.trim());
    return students.filter((s) => {
      const matchStatus = status === 'all' || s.status === status;
      return matchStatus && (!term || normalize(s.name).includes(term));
    });
  }, [students, status, searchTerm]);

  const liveText = useMemo(() => {
    if (isLoading) return 'Carregando lista de alunos...';
    const c = filteredStudents.length;
    return `${c} ${c === 1 ? 'aluno encontrado' : 'alunos encontrados'}.`;
  }, [isLoading, filteredStudents.length]);

  return (
    <div className={styles.container}>
      <header className={styles.headerSection}>
        <div className={styles.headerTitleArea}>
          <h1 className={styles.pageTitle}>Alunos</h1>
          <p className={styles.pageDescription}>
            Gestão cadastral, valores de hora/aula e histórico de atendimentos.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus size={18} />}>
          Novo Aluno
        </Button>
      </header>

      <section className={styles.toolbar} aria-label="Filtros e busca de alunos">
        <div className={styles.searchArea}>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do aluno..."
            aria-label="Buscar aluno por nome"
            leftIcon={<Search size={16} aria-hidden="true" />}
          />
          {searchTerm && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setSearchTerm('')}
              aria-label="Limpar busca"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <StudentStatusFilter currentStatus={status} counts={counts} onSelectStatus={setStatus} />
      </section>

      <div aria-live="polite" className={styles.srOnly}>{liveText}</div>

      <main id="students-list" role="tabpanel" aria-labelledby={`tab-${status}`}>
        {isLoading && (
          <div className={styles.grid} aria-label="Carregando alunos...">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} aria-hidden="true" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}><AlertCircle size={28} /></div>
            <h2 className={styles.emptyTitle}>Erro ao carregar alunos</h2>
            <p className={styles.emptyText}>Não foi possível consultar os dados no servidor.</p>
            <Button variant="secondary" onClick={() => refetch()}>Tentar Novamente</Button>
          </div>
        )}

        {!isLoading && !isError && students.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}><Users size={28} /></div>
            <h2 className={styles.emptyTitle}>Nenhum aluno cadastrado</h2>
            <p className={styles.emptyText}>Comece cadastrando o primeiro aluno da Maite.</p>
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus size={18} />}>
              Cadastrar Primeiro Aluno
            </Button>
          </div>
        )}

        {!isLoading && !isError && students.length > 0 && filteredStudents.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}><SearchX size={28} /></div>
            <h2 className={styles.emptyTitle}>Nenhum aluno encontrado</h2>
            <p className={styles.emptyText}>
              {searchTerm
                ? 'Não encontramos alunos para o filtro ou busca informados.'
                : 'Não há alunos nesta categoria de filtro.'}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setStatus('all');
              }}
            >
              {searchTerm ? 'Limpar busca' : 'Ver todos os alunos'}
            </Button>
          </div>
        )}

        {!isLoading && !isError && filteredStudents.length > 0 && (
          <div className={styles.grid}>
            {filteredStudents.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                onEdit={(stu) => setStudentToEdit(stu)}
                onDelete={(stu) => setStudentToDelete(stu)}
              />
            ))}
          </div>
        )}
      </main>

      <StudentFormModal
        isOpen={isCreateOpen || Boolean(studentToEdit)}
        studentToEdit={studentToEdit}
        onClose={() => { setIsCreateOpen(false); setStudentToEdit(null); }}
      />

      <StudentDeleteModal
        isOpen={Boolean(studentToDelete)}
        student={studentToDelete}
        onClose={() => setStudentToDelete(null)}
      />
    </div>
  );
};

export default StudentsPage;

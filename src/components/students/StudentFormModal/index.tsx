import type { FC } from 'react';
import { Modal } from '../../ui/Modal';
import type { IStudent } from '../../../hooks/useStudents';
import { StudentFormContent } from './StudentFormContent';

export interface IStudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: IStudent | null;
  onSuccess?: () => void;
}

export const StudentFormModal: FC<IStudentFormModalProps> = ({
  isOpen,
  onClose,
  studentToEdit,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(studentToEdit);
  const modalTitle = isEditing ? 'Editar Aluno' : 'Novo Aluno';
  const modalDescription = isEditing
    ? 'Atualize os dados contratuais e cadastrais do aluno.'
    : 'Preencha as informações para cadastrar um novo aluno.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      size="md"
    >
      <StudentFormContent
        key={`${studentToEdit?.id ?? 'new'}`}
        studentToEdit={studentToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
};

export { StudentFormContent };

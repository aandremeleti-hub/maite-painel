# 0002 - Inativação Lógica Estrita e Salvaguarda por ON DELETE RESTRICT

Para blindar o patrimônio contábil de 4.834 aulas reais históricas da professora Maite, a chave estrangeira de `lessons.student_id` opera sob `ON DELETE RESTRICT`, impedindo a deleção em cascata. O encerramento do vínculo de alunos com aulas registradas é operado estritamente por inativação lógica (`status = 'inactive'`), permitindo exclusão física (`DELETE`) unicamente para cadastros criados por engano com zero aulas associadas.

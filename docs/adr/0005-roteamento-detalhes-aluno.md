# 0005 - Roteamento Dedicado para Detalhes do Aluno (/alunos/:id)

A visualização aprofundada do perfil do aluno, seu histórico de aulas e dados de contrato são estruturados através da sub-rota `/alunos/:id` integrada ao `PanelLayout`, em vez de modais ou gavetas sem URL própria. Essa abordagem habilita deep-linking direto a partir dos módulos de Fechamento e Time Sheet, persistência no histórico de navegação (`back`/`forward`) e resiliência a recarregamento de página (`F5`).

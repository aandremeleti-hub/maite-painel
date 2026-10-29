# Painel de Atendimento Maite

Sistema centralizado de gestão cadastral de alunos, apontamento de aulas, apuração contábil mensal e geração de demonstrativos de cobrança (Time Sheet) para a professora Maite.

## Language

**Aluno**:
O estudante que recebe as aulas particulares ministradas pela professora Maite.
_Avoid_: Cliente, Usuário

**Competência**:
O mês e ano civil de apuração contábil e pedagógica (ex: 08/2026, 10/2026).
_Avoid_: Período, Data de referência

**Fechamento (Closing)**:
O processo e a visão executiva consolidada de apuração de todas as aulas ministradas e faturamento bruto acumulado pela professora em uma competência.
_Avoid_: Balanço, Fechamento Externo

**Time Sheet**:
O demonstrativo mensal individual gerado para um aluno específico, contendo o extrato data a data das aulas ministradas, anotações de conteúdo, valor final consolidado e dados bancários para transferência PIX.
_Avoid_: Fatura, Boleto, Nota de Cobrança

**Preço Snapshot (`hourly_rate_snapshot`)**:
O valor monetário da hora-aula gravado de forma imutável no registro da aula no momento de sua criação, garantindo que reajustes cadastrais futuros no perfil do aluno jamais alterem o faturamento de meses passados.
_Avoid_: Preço Histórico, Tarifa Congelada

**Status da Competência**:
A condição contábil do mês (`open` para aberto a edições e novos apontamentos; `closed` para travado pelo cadeado contábil contra qualquer mutação).
_Avoid_: Situação, Bloqueio

**Categoria de Aula**:
A classificação volumétrica e financeira de um evento de aula na agenda:
- `standard`: Aula regular com carga horária de 1 hora (multiplicador 1.0x).
- `extended`: Aula estendida ou reposição com carga horária de 1,5 horas ou mais (multiplicador 1.5x+).
- `absence`: Falta do aluno, vinculada à regra de negócio `charge_absence` (cobrada se `true` ou abonada se `false`).
- `cancelled`: Aula cancelada pela professora (multiplicador 0.0x, faturamento R$ 0,00).
- `courtesy`: Aula experimental de degustação (tasting), nivelamento ou cortesia comercial (multiplicador 0.0x, faturamento R$ 0,00, mantendo registro histórico).
_Avoid_: Tipo de aula, Modalidade

**Inativação Lógica**:
A mudança de status do aluno de `active` para `inactive`, preservando todo o patrimônio de registros e histórico contábil no banco de dados e removendo-o dos fluxos ativos de novos agendamentos.
_Avoid_: Exclusão lógica, Soft delete

**Registro Canônico**:
O registro único, oficial e definitivo de um aluno ou aula mantido no banco de dados após processos de saneamento e deduplicação, servindo como chave estrangeira de destino para histórico de aulas e relatórios contábeis.
_Avoid_: Registro primário, Registro mestre, Registro original

**Inativação Automática (Regra dos 90 Dias)**:
A transição sistêmica do status do aluno de `active` para `inactive`, disparada quando o aluno permanece mais de 90 dias sem nenhuma aula registrada (ou para cadastros novos sem aulas criados há mais de 90 dias), garantindo a limpeza visual das listagens cotidianas sem perda do patrimônio contábil.
_Avoid_: Desativação, Arquivamento, Exclusão temporária

**Reativação Automática**:
O retorno atômico e transparente do aluno do status `inactive` para `active` efetuado no banco de dados diretamente na inserção de uma nova aula, refletindo reativamente na interface sem exigir edição manual prévia de cadastro pela professora.
_Avoid_: Desbloqueio, Reativação manual, Recadastro

**Saneamento Transacional (Deduplicação)**:
A rotina atômica de banco de dados (`BEGIN ... COMMIT`) que cria tabelas físicas de salvaguarda, reatribui chaves estrangeiras para os registros canônicos, elimina cópias idênticas e audita os totais antes de persistir as alterações.
_Avoid_: Limpeza manual, Purga, Reset de banco

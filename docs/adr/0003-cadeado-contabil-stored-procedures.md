# 0003 - Cadeado Contábil de Fechamento de Mês no PostgreSQL e RPC de Reabertura

Para garantir a imutabilidade das declarações contábeis e fiscais, a trava de fechamento mensal é executada diretamente no motor PostgreSQL através da trigger `trg_check_closed_month` e da Stored Procedure `fn_close_month`. Qualquer alteração retrospectiva exige a invocação explícita da RPC `fn_reopen_month` por um diálogo de alta fricção na interface, impedindo que mutações acidentais no frontend corrompam competências contábeis já encerradas.

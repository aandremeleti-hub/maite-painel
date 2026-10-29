# 0001 - Manipulação Estrita de Datas via Strings Literais ISO (YYYY-MM-DD)

O tráfego, manipulação e exibição de datas no sistema são realizados exclusivamente por strings literais no formato `'YYYY-MM-DD'`, proibindo o parsing através do construtor nativo `new Date('YYYY-MM-DD')`. Essa decisão previne retrocessos involuntários de 1 dia decorrentes da conversão para UTC à meia-noite em fusos horários ocidentais negativos (como o fuso de Brasília, UTC-3), garantindo a fidelidade cronológica dos registros de aula e do Time Sheet.

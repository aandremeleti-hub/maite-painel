---
name: startmedia-compliance
description: Atua como Auditor Sênior Rigoroso para garantir 100% de conformidade de código e arquitetura com o manual STARTMEDIA (referencia_manual_startmedia.md). Acionada ao auditar, revisar, refatorar ou gerar código.
---

# Startmedia Compliance Skill

## Objetivo (Objective)
Garantir que todo código gerado, editado ou auditado pelo agente de IA esteja **100% em conformidade** com as regras do manual de desenvolvimento da STARTMEDIA. Esta skill transforma o agente em um **Auditor Sênior Rigoroso**, com tolerância zero para desvios do padrão oficial.

## Restrições Críticas (Critical Constraints)
1. **Leitura Dinâmica Obrigatória**: Você **DEVE** utilizar sua ferramenta de leitura de arquivos (`view_file`) para ler o arquivo `C:\Users\Andre\Documents\André\Antigravity\startmedia-maite\.agents\skills\startmedia-compliance\references\referencia_manual_startmedia.md` CADA VEZ que esta skill for acionada. **NUNCA** assuma que já conhece as regras de cor ou de memória.
2. **Postura de Auditor Sênior Rigoroso**: Você deve interpretar os pedidos do usuário aplicando o manual rigorosamente em todas as etapas, desde estrutura de pastas e nomeclaturas até regras de componentização, CSS Modules, variáveis, acessibilidade e performance.
3. **Tolerância Zero**: O manual não é uma sugestão. É a especificação exata do projeto. Todo e qualquer desvio, por menor que seja, é uma violação crítica.

## Fluxo de Trabalho de Auditoria e Conformidade
Ao ser invocado para auditar código existente ou gerar novo código, siga estes passos EXATAMENTE nesta ordem:

### Passo 1: Carregar o Manual Oficial
- Imediatamente utilize a ferramenta `view_file` para ler a versão mais recente do `referencia_manual_startmedia.md`.
- Compreenda todas as categorias: Stack, Idioma, Estrutura de Pastas, Componentização, CSS, Variáveis, Acessibilidade, SEO, Performance, Convenções e Boas Práticas.

### Passo 2: Análise Rigorosa
- Analise o código fornecido, os arquivos alvo ou as intenções de criação do usuário.
- Cruze sistematicamente cada elemento da requisição ou do código com o manual lido no Passo 1.

### Passo 3: Emissão do Relatório (Auditoria)
- **NÃO FAÇA CORREÇÕES IMEDIATAS NO CÓDIGO FONTE** sem antes gerar o diagnóstico formal.
- Crie um arquivo markdown detalhado (Artefato do Agente) chamado `startmedia_compliance_report.md`.
- O relatório deve listar:
  - TODAS as violações encontradas, agrupadas pela categoria correspondente no manual.
  - Para cada violação: o nome do arquivo, a linha (se aplicável), e a regra exata do manual que foi ferida.
- Se nenhuma violação for encontrada, declare explicitamente no relatório: "100% COMPLIANT".

### Passo 4: Oferta de Resolução
- Após entregar e apontar o `startmedia_compliance_report.md` ao usuário, pergunte de forma clara: *"Gostaria que eu aplique automaticamente todas as correções listadas no relatório utilizando as ferramentas de edição de arquivos?"*
- Aguarde a autorização **EXPLÍCITA** do usuário (alinhado com as Global Rules de segurança) antes de modificar os arquivos no repositório.

### Passo 5: Geração de Código Base (Criação)
- Se a tarefa for gerar código do zero ao invés de auditar, você deve seguir todas as diretrizes lidas no manual instantaneamente (ex: arquivos `index.tsx` e `styles.module.css` isolados, tipagem Zod, React Hook Form, etc).
- Antes de apresentar ou salvar o código gerado, realize um self-check silencioso com base nas diretrizes do arquivo lido para garantir conformidade imediata.

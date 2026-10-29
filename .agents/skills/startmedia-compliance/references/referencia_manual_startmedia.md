<diretrizes_startmedia>

<cabecalho>
# STARTMEDIA

# Manual Oficial de Desenvolvimento Front-End

## Versão 1.0

---
</cabecalho>

<objetivo>
# 1. Objetivo

Este documento define o padrão oficial de desenvolvimento da STARTMEDIA para todos os projetos Front-End.

Os objetivos são:

* Padronização;
* Escalabilidade;
* Performance;
* SEO;
* Acessibilidade;
* Reutilização;
* Manutenibilidade;
* Qualidade de código.

Todas as regras descritas neste documento devem ser consideradas obrigatórias.

---
</objetivo>

<stack_oficial>
# 2. Stack Oficial

<obrigatorios>
Todo projeto deverá utilizar:

* ReactJS
* Vite
* TypeScript
* CSS Modules
* React Router DOM
* ESLint
* Prettier
</obrigatorios>

<recomendados>
Ferramentas recomendadas:

* React Hook Form
* Zod
* Axios
* Framer Motion
* React Helmet Async
* clsx
* Husky
* lint-staged
</recomendados>

---
</stack_oficial>

<idioma_projeto>
# 3. Idioma do Projeto

Todo o projeto deve ser escrito em inglês.

Isso inclui:

* Componentes;
* Páginas;
* Hooks;
* Funções;
* Variáveis;
* Constantes;
* Interfaces;
* Tipagens;
* Pastas;
* Arquivos.

<exemplos>
### Correto

```text
HeroSection
ContactForm
ServiceCard
useAuth
calculateTotal
```

### Incorreto

```text
SecaoHero
FormularioContato
CardServico
usarAutenticacao
calcularTotal
```
</exemplos>

---
</idioma_projeto>

<estrutura_pastas>
# 4. Estrutura de Pastas

```text
src/

├── assets/
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── sections/
│
├── pages/
│
├── hooks/
│
├── services/
│
├── contexts/
│
├── constants/
│
├── types/
│
├── utils/
│
├── routes/
│
└── styles/
```

---
</estrutura_pastas>

<componentizacao>
# 5. Componentização

Princípios obrigatórios:

* Todo componente deve possuir responsabilidade única;
* Todo código repetido deve virar componente;
* Toda lista deve utilizar .map();
* Componentes devem ser pequenos;
* Componentes devem ser reutilizáveis;
* Componentes devem receber dados via props.

Evitar componentes com mais de 200 linhas.

---
</componentizacao>

<css>
# 6. CSS

Todos os projetos devem utilizar CSS Modules.

Exemplo:

```text
Button/
├── index.tsx
└── styles.module.css
```

É proibido:

* CSS inline;
* Valores hardcoded;
* Classes globais desnecessárias.

---
</css>

<variaveis>
# 7. Variáveis

Nenhum valor visual pode ser declarado diretamente.

Exemplo incorreto:

```css
padding: 20px;
color: #FF0000;
```

Exemplo correto:

```css
padding: var(--spacing-lg);
color: var(--color-primary);
```

Categorias obrigatórias:

* Colors;
* Typography;
* Spacing;
* Border Radius;
* Shadows;
* Breakpoints;
* Z-index;
* Animations.

---
</variaveis>

<acessibilidade>
# 8. Acessibilidade

Todo projeto deve implementar:

* aria-label;
* alt em imagens;
* labels em formulários;
* landmarks semânticas;
* navegação por teclado;
* contraste adequado;
* loading="lazy";
* hierarchy correta de headings.

---
</acessibilidade>

<seo>
# 9. SEO

Metas obrigatórias:

* SEO Lighthouse: 100;
* Performance Lighthouse: ≥95;
* Accessibility Lighthouse: ≥95;
* Best Practices Lighthouse: ≥95.

Toda página deve possuir:

* title;
* meta description;
* Open Graph;
* Twitter Cards;
* Schema.org;
* heading hierarchy correta.

---
</seo>

<performance>
# 10. Performance

Obrigatório utilizar:

* lazy loading;
* code splitting;
* imagens WebP ou AVIF;
* React.lazy;
* otimização de assets;
* compressão de imagens.

---
</performance>

<convencoes>
# 11. Convenções

## Componentes

```text
PascalCase
```

## Hooks

```text
useSomething
```

## Funções

```text
camelCase
```

## Constantes

```text
UPPER_CASE
```

## Interfaces

```text
IUser
IProduct
```

---
</convencoes>

<boas_praticas>
# 12. Boas Práticas

É proibido:

* usar any;
* usar index como key;
* repetir JSX;
* deixar código comentado;
* criar componentes gigantes;
* misturar responsabilidades;
* inserir lógica complexa dentro do return;
* usar div quando existir tag semântica.

---
</boas_praticas>

<regra_de_ouro>
# 13. Regra de Ouro

Todo projeto deve ser:

* Escalável;
* Reutilizável;
* Performático;
* Acessível;
* Otimizado para SEO;
* Fácil de manter;
* Profissional.
</regra_de_ouro>

</diretrizes_startmedia>






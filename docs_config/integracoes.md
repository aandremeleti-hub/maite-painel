# 📂 Referência de Arquitetura: Integrações Externas e Serviços

**Última Atualização:** 2026-10-29  
**Origem do Conhecimento:** `1. briefing_estrategico.md`, `10.1_9_24jul_implementation_plan_v2.md`, `14.9_relatorio_fase1.md`, `14.11_relatorio_fase3.md`, `15_implementation_plan_v4.md`, `15.3_relatorio_fase4_completo.md`, `finalizacao-painel-maite_plan.md` (Fases 6, 7 e 8 As-Built)

---

## 🎯 1. Escopo e Regras de Negócio

### 1.1. Propósito da Camada
Esta frente consolida a arquitetura de integrações do Painel Maite com serviços de terceiros e subsistemas externos: **Supabase GoTrue Auth** (gerenciamento de sessão e tokens JWT), **Motor de Exportação Documental PDF** (`html2pdf.js`), **Dados de Faturamento e PIX** (`payment_info`), bem como a interface com canais de captação de leads e contato do ecossistema Maite (WhatsApp e Formspree).

### 1.2. Regras de Negócio e Diretrizes de Segurança
1. **Autenticação Segura via Supabase GoTrue (Usuário Único / Single-User):**
   - Apenas a professora Maite possui credenciais ativas de acesso ao painel de gestão.
   - O estado da sessão persiste automaticamente em `localStorage` gerenciado pelo SDK do Supabase.
   - O ciclo de vida da autenticação escuta o evento `onAuthStateChange()` para sincronizar tokens renovados (*token refresh*) em background.
   - Ao deslogar (`signOut`), o cache do TanStack Query e o perfil são imediatamente limpos para impedir exposição de dados.
2. **Motor de Exportação de PDF com Code-Splitting Obrigatório (ADR 0004):**
   - A biblioteca `html2pdf.js` pesa aproximadamente 935 kB (incluindo dependências como `jspdf` e `html2canvas`).
   - É **mandatório** utilizar **Dynamic Import** assíncrono (`await import('html2pdf.js')`) acionado exclusivamente quando o usuário clica para gerar o documento. Isso mantém o bundle inicial da aplicação em ~519 kB, garantindo carregamento instantâneo.
   - O documento gerado deve aderir à norma física **DIN A4 (210mm x 297mm)**, orientação retrato, renderização vetorial com escala 2x (`html2canvas: { scale: 2 }`) para evitar pixelização ou texto embaçado, e regras de quebra (`pagebreak`) evitando corte de linhas da tabela contábil (`avoid: ['tr', '.no-break']`).
3. **Faturamento e Cobrança via PIX:**
   - A tabela `payment_info` armazena a chave PIX padrão da professora (`pix_key`, tipos: `cpf`, `cnpj`, `email`, `phone`, `random`) e o banco emissor (`bank_name`).
   - Os dados são carimbados no rodapé da fatura/Time Sheet para que o aluno ou responsável realize a transferência imediatamente após a conferência das aulas.
   - O Time Sheet disponibiliza botão interativo de cópia para a área de transferência (`navigator.clipboard.writeText`), acompanhado de toast feedback via Sonner.
   - Botões interativos de cópia e ações recebem classe utilitária `.hideOnPrint` para não poluírem a folha impressa ou o PDF exportado.
   - A `TimeSheetToolbar` monitora a existência de dados bancários e exibe banner de alerta preventivo caso a professora ainda não tenha cadastrado sua chave PIX.
4. **Impressão Nativa Vetorial (`window.print()`):**
   - Suporte a impressão direta via atalho ou comando sem necessidade de compilação em canvas, utilizando regras `@media print` que ocultam menus, topbars e fundos.
5. **Canais de Captação e Contato no Ecossistema Maite:**
   - No site institucional (`web/`), o contato prioriza o canal WhatsApp e formulário de fricção mínima integrado com **Formspree** para o e-mail oficial `maipersonalclass@gmail.com`.
   - Conformidade com a **LGPD:** A coleta de depoimentos e contatos não expõe dados sensíveis sem consentimento expresso. Depoimentos no painel/site são anonimizados (primeiro nome e inicial do sobrenome).

### 1.3. Limitações Técnicas Conhecidas
- **Supabase MCP Server vs. GoTrue Auth:** O protocolo MCP opera consultas SQL com privilégios de banco, mas **não pode criar usuários** em `auth.users` diretamente via comandos SQL devido aos esquemas de criptografia de senhas do GoTrue. Usuários mestres devem ser criados via dashboard oficial do Supabase.
- **Fail-Safe de Scripts DDL:** Diante de instabilidades na conexão do MCP, a rota fail-safe comprovada na Fase 1 é fornecer o script SQL gerado localmente para execução direta no SQL Editor web do Supabase.

---

## ⚙️ 2. Especificação Técnica e Códigos-Chave

### 2.1. Serviço Assíncrono de Geração de PDF (`src/services/pdfGenerator.ts`)

```typescript
import type { Html2PdfOptions } from 'html2pdf.js';

/**
 * Gera e dispara o download do PDF do Time Sheet utilizando Dynamic Import
 * para isolar a biblioteca html2pdf.js em um chunk assíncrono separado (ADR 0004).
 */
export async function generateTimeSheetPDF(element: HTMLElement, filename: string): Promise<void> {
  if (!element) {
    throw new Error('Elemento DOM não fornecido para geração do PDF');
  }

  const safeFilename = filename?.trim() || 'extrato.pdf';
  
  // Dynamic import para preservar o tamanho leve do bundle inicial (~519 kB)
  const html2pdf = (await import('html2pdf.js')).default;

  const opt: Html2PdfOptions = {
    margin: [0, 0, 0, 0],
    filename: safeFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.no-break'] },
  };

  await html2pdf().set(opt).from(element).save();
}
```

---

### 2.2. Tipagem Estrita para `html2pdf.js` (`src/types/html2pdf.d.ts`)

```typescript
declare module 'html2pdf.js' {
  export interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: 'jpeg' | 'png' | 'webp'; quality?: number };
    enableLinks?: boolean;
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      letterRendering?: boolean;
      logging?: boolean;
      [key: string]: unknown;
    };
    jsPDF?: {
      unit?: string;
      format?: string | [number, number];
      orientation?: 'portrait' | 'landscape';
      [key: string]: unknown;
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }

  export interface Html2PdfWorker {
    from(element: HTMLElement | string): Html2PdfWorker;
    set(opt: Html2PdfOptions): Html2PdfWorker;
    save(): Promise<void>;
    outputPdf(type?: string): Promise<unknown>;
    toPdf(): Html2PdfWorker;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(element: HTMLElement | string, opt?: Html2PdfOptions): Html2PdfWorker;

  export default html2pdf;
}
```

---

### 2.3. Contexto e Hook de Autenticação Supabase (`AuthContext.tsx` e `useAuth.ts`)

```typescript
// src/contexts/AuthContext.tsx (Trecho de Gerenciamento de Sessão)
export function AuthProvider({ children }: IAuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Recupera sessão inicial em cache
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Escuta mudanças na autenticação em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

```typescript
// src/hooks/useAuth.ts (Métodos de Ação)
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { ...context, signIn, signOut };
}
```

---

### 2.4. Gestão de Chave PIX e Integração com o Time Sheet

#### Formatação Desacoplada de Moeda para Renderização Documental (`currencyUtils.ts`):
```typescript
const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return 'R$ 0,00';
  }
  // Substitui caractere de espaço não-quebrável (NBSP) por espaço simples para o html2canvas
  return BRL_CURRENCY_FORMATTER.format(value).replace(/\u00a0/g, ' ');
}
```

#### Carimbo PIX e Cópia para Clipboard (`TimeSheetDocument/index.tsx`):
```typescript
const handleCopyPix = async () => {
  if (!paymentInfo?.pix_key) return;
  try {
    await navigator.clipboard.writeText(paymentInfo.pix_key);
    toast.success('Chave PIX copiada para a área de transferência!');
  } catch {
    toast.error('Erro ao copiar a chave PIX');
  }
};

// No JSX do Rodapé:
<div className={styles.pixSection}>
  <div className={styles.pixDetails}>
    <p><strong>Titular:</strong> {paymentInfo.account_holder}</p>
    <p><strong>Banco:</strong> {paymentInfo.bank_name}</p>
    <p><strong>Chave PIX ({paymentInfo.pix_type}):</strong> {paymentInfo.pix_key}</p>
  </div>
  <button 
    type="button" 
    onClick={handleCopyPix} 
    className={[styles.copyPixButton, styles.hideOnPrint].join(' ')}
  >
    <Copy size={16} /> Copiar Chave PIX
  </button>
</div>
```

---

## 🔗 3. Arquivos Ativos e Referências no Projeto

- [pdfGenerator.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/services/pdfGenerator.ts) — *Módulo assíncrono para renderização e download do Time Sheet em PDF via Dynamic Import.*
- [html2pdf.d.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/types/html2pdf.d.ts) — *Arquivo de definições e interfaces TypeScript para html2pdf.js.*
- [currencyUtils.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/lib/currencyUtils.ts) — *Utilitário puro de conversão de moeda BRL compatível com html2canvas.*
- [AuthContext.tsx](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/contexts/AuthContext.tsx) — *Provedor de contexto global que escuta a sessão do Supabase GoTrue.*
- [useAuth.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useAuth.ts) — *Hook para consumo da sessão e operações `signIn` e `signOut`.*
- [usePaymentInfo.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/usePaymentInfo.ts) — *Hook para leitura e gravação de chave PIX e dados bancários.*
- [PaymentInfoForm](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Settings/components/PaymentInfoForm/index.tsx) — *Formulário de cadastro e edição dos dados bancários e chave PIX da professora.*
- [TimeSheetDocument](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/TimeSheet/components/TimeSheetDocument/index.tsx) — *Componente com layout A4, carimbo PIX, botão de cópia e regras de impressão.*
- [TimeSheetToolbar](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/TimeSheet/components/TimeSheetToolbar/index.tsx) — *Barra de comandos com seletor de alunos, download de PDF, impressão e alerta de PIX pendente.*

---

## 🧠 4. Lições Aprendidas, Erros Comuns & Gotchas (Essencial)

> [!IMPORTANT]
> **Gotchas e Erros Evitados em Serviços e Integrações:**
> 
> 1. **Code-Splitting Mandatório para `html2pdf.js` (ADR 0004):**  
>    Importar `import html2pdf from 'html2pdf.js'` de forma estática no topo de componentes ou páginas embute os ~935 kB da biblioteca no bundle inicial da aplicação. Utilizar SEMPRE `await import('html2pdf.js')` dentro do corpo de `generateTimeSheetPDF()`. Isso faz o Vite gerar um chunk assíncrono separado (`dist/assets/html2pdf-*.js`), preservando o bundle principal em ~519 kB.
> 
> 2. **Espaço Não-Quebrável (NBSP) no `Intl.NumberFormat`:**  
>    O formatador padrão do navegador para `pt-BR` insere um caractere invisível `\u00a0` entre o "R$" e o numeral. Bibliotecas de renderização como o `html2canvas` frequentemente interpretam esse caractere como um símbolo corrompido ou ponto de interrogação. A sanitização `.replace(/\u00a0/g, ' ')` em `currencyUtils.ts` e `formatters.ts` é mandatória para evitar falhas de layout no PDF exportado.
> 
> 3. **Higienização de Caracteres no Nome do Arquivo:**  
>    Nomes de alunos contendo acentos ou caracteres especiais (ex: "José da Conceição") corrompem o cabeçalho `Content-Disposition` no download de arquivos em determinados navegadores. A função geradora executa normalização NFD removendo acentos (`cleanName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_')`), gerando nomes seguros como `TimeSheet_Jose_da_Conceicao_08_2026.pdf`.
> 
> 4. **Configuração de Canvas e Resolução para Impressão:**  
>    A exportação padrão do `html2canvas` com `scale: 1` produz faturas com tipografia serrilhada e ilegível ao imprimir em papel. A configuração mandatória é `scale: 2` com `useCORS: true` e `letterRendering: true`.
> 
> 5. **Ocultação de Elementos Interativos na Saída Gráfica (`.hideOnPrint`):**  
>    Botões como "Copiar Chave PIX" são úteis em tela, mas devem ser estritamente suprimidos na versão impressa ou PDF. A classe `.hideOnPrint` combinada com as opções do gerador garante que o documento físico permaneça limpo e com aspecto de nota oficial.

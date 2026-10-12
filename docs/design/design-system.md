# SellerOS Design System — Radar de Licitações

Este documento estabelece os padrões visuais, tokens semânticos e diretrizes de contraste para a interface da plataforma Radar de Licitações Públicas, consolidando a identidade SellerOS com suporte rigoroso e permanente aos modos claro (**Light Mode**) e escuro (**Dark Mode**).

---

## 1. Cores da Marca SellerOS

| Nome | Hexadecimal | Papel / Aplicação Principal |
|---|---|---|
| **Laranja SellerOS** | `#FF9900` | Cor primária da marca; botões de ação (CTA), destaques, foco e elementos ativos. |
| **Laranja Claro** | `#FFB84D` | Variação de alto contraste para ícones e textos secundários sobre superfícies escuras. |
| **Lilás SellerOS** | `#8844FF` | Acento complementar para categorias, tags secundárias e status informativos. |
| **Verde SellerOS** | `#44CC88` | Sucesso, prazos abertos, certidões regulares e indicadores positivos. |
| **Azul SellerOS** | `#4499FF` | Links externos, informações de auditoria e navegação auxiliar. |

---

## 2. Tokens Semânticos por Tema

Todos os componentes da aplicação devem utilizar os tokens semânticos centralizados em `main.css`, dispensando estilos inline com valores hexadecimais fixos.

| Token Semântico | Light Mode | Dark Mode | Descrição de Uso |
|---|---|---|---|
| `--color-background` | `#FFFFFF` | `#0F172A` | Fundo principal da página e viewport. |
| `--color-surface` | `#F8FAFC` | `#1E293B` | Superfície secundária (sidebar, cabeçalho de tabelas, seções alternadas). |
| `--color-surface-elevated` | `#FFFFFF` | `#243247` | Painéis, cards (`.panel`), modais e dropdowns. |
| `--color-text-primary` | `#111827` | `#F8FAFC` | Títulos, rótulos principais e textos de alta legibilidade. |
| `--color-text-secondary` | `#475569` | `#CBD5E1` | Parágrafos descritivos, metadados e navegação inativa. |
| `--color-text-muted` | `#64748b` | `#94A3B8` | Dicas secundárias, timestamps e legendas. |
| `--color-border` | `#E2E8F0` | `#334155` | Delimitação de cards, divisores e inputs. |
| `--color-primary` | `#FF9900` | `#FF9900` | Destaque principal e botões de ação primária. |
| `--color-primary-hover` | `#E07B00` | `#FFB84D` | Estado hover de botões e links interativos. |
| `--color-on-primary` | **`#111827`** | **`#111827`** | **Texto sobre fundo Laranja (Regra Estrita WCAG AA).** |
| `--color-focus-ring` | `#FF9900` | `#FFB84D` | Anel de foco acessível para navegação por teclado. |

---

## 3. Diretriz Obrigatória de Contraste (WCAG 2.2 AA)

### 3.1. Regra Crítica: Botões com Fundo Laranja (`#FF9900`)
- **Fórmula de Contraste:**
  - `#FF9900` com texto branco (`#FFFFFF`): Razão de **~2,1:1** — **REPROVADO** pelo WCAG AA (mínimo exigido: 4,5:1).
  - `#FF9900` com texto escuro (`#111827`): Razão de **~7,9:1** — **APROVADO com nível AAA**.
- **Regra do Projeto:** É expressamente proibido aplicar `text-white` em botões de fundo laranja. Todos os botões primários sólidos utilizam texto escuro (`#111827` / `text-slate-900`) em **ambos os temas**.

### 3.2. Relações Mínimas de Contraste
- **Textos Regulares (< 18pt):** Mínimo de 4,5:1 contra o fundo.
- **Títulos e Textos Grandes (>= 18pt ou 14pt bold):** Mínimo de 3:1.
- **Componentes Gráficos e Bordas de Input:** Mínimo de 3:1.

---

## 4. Componentes Auditados e Padronizados

- **Header (`.app-header`):** Fundo branco no Light (`#FFFFFF`), ardósia escuro no Dark (`#0F172A`), com borda sutil e seletor de empresa responsivo.
- **Sidebar (`.sidebar`):** Superfície clara no Light (`#F8FAFC`, borda `#E2E8F0`), superfície escura no Dark (`#0F172A`, borda `#334155`). Links ativos destacados com barra lateral laranja `#FF9900`.
- **Botões e Ações:** Botões primários com Laranja SellerOS e texto `#111827`. Botões secundários/outline com bordas adaptadas (`#E2E8F0` no Light, `#334155` no Dark).
- **Cards e Painéis (`.panel`):** Fundo branco no Light, `#1E293B` / `#243247` no Dark, mantendo distinção visual sobre o fundo principal.
- **Tabelas (`.data-table`):** Cabeçalho diferenciado com borda e linhas zebradas acessíveis nos dois modos.
- **Alternância de Tema:** Controle `<UColorModeButton />` presente no cabeçalho do painel privado, na barra de navegação pública e nas telas de autenticação.

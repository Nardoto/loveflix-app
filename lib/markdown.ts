// Pré-processamento do markdown do roteiro pra o ScriptReader.
//
// react-markdown não suporta sintaxe customizada nativamente. Em vez de
// escrever um remark plugin (overhead), fazemos uma transformação simples
// ANTES de passar pro <ReactMarkdown>: substituímos linhas tipo
// "{{img 3}}" por uma sintaxe markdown nativa de imagem que o renderer
// já entende, usando uma URL placeholder que o componente <img> custom
// detecta e troca pela imagem real da galeria.
//
// Sintaxe placeholder: `ebookimg:N` (resolvida em runtime no componente).
// Ex: "{{img 3}}" vira "![](ebookimg:3)".

const IMG_LINE_RE = /^[ \t]*\{\{img[ \t]+(\d+)\}\}[ \t]*$/gm;
const EBOOK_IMG_PROTOCOL = 'ebookimg:';

/**
 * Substitui marcadores `{{img N}}` em linha própria por uma imagem
 * markdown com src placeholder `ebookimg:N`. O ScriptReader intercepta
 * essa src e renderiza a imagem real da galeria.
 *
 * Markers fora de linha-própria são ignorados (deixa o admin escrever
 * "use {{img 1}}" como texto no comment sem virar render).
 */
export function preprocessScript(markdown: string): string {
  return markdown.replace(IMG_LINE_RE, (_, idx) => `![](${EBOOK_IMG_PROTOCOL}${idx})`);
}

/**
 * Dado uma src vinda do markdown, devolve o índice da imagem da galeria
 * (1-based) ou null se não for um placeholder.
 */
export function parseEbookImageSrc(src: string): number | null {
  if (!src.startsWith(EBOOK_IMG_PROTOCOL)) return null;
  const n = parseInt(src.slice(EBOOK_IMG_PROTOCOL.length), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Divide o markdown em capítulos baseado em headings H2. O primeiro
 * bloco (antes do primeiro H2) é tratado como prólogo/abertura sem
 * número. Útil pro footer com "Capítulo 3 de 12".
 */
export type Chapter = {
  /** Título (sem o "##"). null pra prólogo. */
  title: string | null;
  /** Conteúdo já com `![](ebookimg:N)`. */
  content: string;
};

export function splitIntoChapters(processed: string): Chapter[] {
  // Splits no início de linha que começa com "## ".
  const parts = processed.split(/^## (.+)$/m);
  // Parts vem como [prologo, title1, body1, title2, body2, ...].
  const chapters: Chapter[] = [];
  const prologue = parts[0]?.trim();
  if (prologue) chapters.push({ title: null, content: prologue });
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]?.trim() ?? null;
    const body = parts[i + 1]?.trim() ?? '';
    chapters.push({ title, content: body });
  }
  return chapters;
}

/** Estima minutos de leitura a 200 wpm. */
export function estimateReadingMinutes(markdown: string): number {
  const t = markdown.trim();
  if (!t) return 0;
  const words = t.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

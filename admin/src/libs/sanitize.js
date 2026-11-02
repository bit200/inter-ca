import DOMPurify from 'dompurify';
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize';


// Схема санитайзера markdown: стандартная (как на GitHub) + только классы,
// которые ставит подсветка кода (rehype-prism-plus): language-*, token, line-number и т.п.
const classNameAttr = ['className'];

export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...((defaultSchema.attributes || {}).code || []), ...classNameAttr],
    pre: [...((defaultSchema.attributes || {}).pre || []), ...classNameAttr],
    span: [...((defaultSchema.attributes || {}).span || []), ...classNameAttr],
    div: [...((defaultSchema.attributes || {}).div || []), ...classNameAttr],
  },
};

// Санитайзер ставим последним в цепочке rehype (после raw-html и подсветки кода).
export function markdownPluginsFilter(type, plugins) {
  if (type !== 'rehype') {
    return plugins;
  }
  return [...plugins, [rehypeSanitize, markdownSanitizeSchema]];
}

// Пропсы для <MDEditor.Markdown {...safeMarkdownProps} />
export const safeMarkdownProps = {pluginsFilter: markdownPluginsFilter};

// Контентный HTML (из БД, от пользователей) — только через DOMPurify.
export function sanitizeHtml(html) {
  if (html === null || html === undefined) {
    return '';
  }
  return DOMPurify.sanitize(String(html));
}

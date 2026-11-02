import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SafeMarkdown from './SafeMarkdown';
import {sanitizeHtml} from './sanitize';


const PAYLOAD = [
  '<img src=x onerror="alert(1)">',
  '<script>alert(2)</script>',
  '<a href="javascript:alert(3)">link</a>',
  '[md](javascript:alert(4))',
  '<svg onload="alert(5)"></svg>',
  '```js\nconst a = 1;\n```',
].join('\n\n');


describe('sanitize: markdown', () => {
  test('XSS-пэйлоад рендерится без обработчиков событий и javascript:', () => {
    const html = renderToStaticMarkup(<SafeMarkdown source={PAYLOAD}/>);

    expect(html).not.toMatch(/\son\w+=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<script/i);
  });

  test('блок кода остаётся с классами подсветки', () => {
    const html = renderToStaticMarkup(<SafeMarkdown source={'```js\nconst a = 1;\n```'}/>);

    expect(html).toMatch(/<code[^>]*class="[^"]*language-js/);
  });
});


describe('sanitize: html', () => {
  test('sanitizeHtml вырезает обработчики и javascript:, оставляя разметку', () => {
    const html = sanitizeHtml('<b onclick="x()">ok</b><a href="javascript:alert(1)">a</a><script>1</script>');

    expect(html).toContain('<b>ok</b>');
    expect(html).not.toMatch(/onclick|javascript:|<script/i);
  });

  test('sanitizeHtml терпит пустые значения', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});

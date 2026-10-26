// 网站中英切换：页面里只写中文，英文放在 <script type="application/json" id="i18n-en"> 里。
//   { "html": { 中文 innerHTML: 英文 innerHTML }, "attr": { 中文属性值: 英文 }, "title": 英文标题 }
// 哪些元素要换：含中文、里面没有块级元素的最外层元素（标题、段落、按钮、链接……），整段 innerHTML 一起换。
//
// 显示哪种语言：网址 ?lang=en / ?lang=zh > 上次在页面上选的 > 浏览器语言（中文显示中文，其他英文）。
// 搜索引擎爬虫一律看中文版。顶栏 [data-lang-toggle] 按钮切换，不刷新页面；切换后派发 'langchange' 事件。

(function () {
  const KEY = 'bda-site-lang';
  const CJK = /[㐀-鿿]/;
  const BLOCK = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'LI', 'UL', 'OL', 'DETAILS', 'SECTION', 'HEADER', 'NAV', 'FOOTER', 'MAIN', 'TABLE', 'FORM']);
  const ATTRS = ['aria-label', 'title', 'placeholder'];

  function candidates(root) {
    const out = [];
    (function walk(el) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      if (![...el.querySelectorAll('*')].some((c) => BLOCK.has(c.tagName))) {
        if (CJK.test(el.textContent)) out.push(el);
        return;
      }
      for (const c of el.children) walk(c);
    })(root);
    return out;
  }

  function pick() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') return q;
    try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'zh') return s; } catch { /* 没存过 */ }
    if (/bot|crawl|spider|slurp/i.test(navigator.userAgent)) return 'zh';
    return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  }

  let data = null, cands = null, attrEls = null, zhTitle = document.title, lang = 'zh';

  function apply(l) {
    if (!data) {
      const el = document.getElementById('i18n-en');
      data = el ? JSON.parse(el.textContent) : { html: {}, attr: {} };
      cands = candidates(document.body).map((e) => ({ e, zh: e.innerHTML }));
      attrEls = [];
      for (const e of document.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(','))) {
        for (const a of ATTRS) if (e.hasAttribute(a) && CJK.test(e.getAttribute(a))) attrEls.push({ e, a, zh: e.getAttribute(a) });
      }
    }
    lang = l;
    const en = l === 'en';
    for (const c of cands) {
      const t = data.html[c.zh];
      c.e.innerHTML = en && t != null ? t : c.zh;
    }
    for (const x of attrEls) {
      const t = data.attr[x.zh];
      x.e.setAttribute(x.a, en && t != null ? t : x.zh);
    }
    document.title = en && data.title ? data.title : zhTitle;
    document.documentElement.lang = en ? 'en' : 'zh-CN';
    for (const b of document.querySelectorAll('[data-lang-toggle]')) {
      b.textContent = en ? '中文' : 'EN';
      b.title = en ? '切换到中文' : 'Switch to English';
      b.lang = en ? 'zh-CN' : 'en';
    }
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }

  window.siteLang = () => lang;
  document.addEventListener('DOMContentLoaded', () => {
    const l = pick();
    if (l === 'en') apply('en'); else apply('zh');
    for (const b of document.querySelectorAll('[data-lang-toggle]')) {
      b.addEventListener('click', () => {
        const next = lang === 'en' ? 'zh' : 'en';
        try { localStorage.setItem(KEY, next); } catch { /* 记不住就只在这次生效 */ }
        apply(next);
      });
    }
  });
})();

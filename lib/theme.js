// 日间 / 夜间 / 跟随系统。放在 <head> 里同步执行，页面一出来就是对的颜色，不闪。
// 页面上带 data-theme-toggle 的按钮点一下在三种之间切换。

(function () {
  const KEY = 'bda-theme';
  const order = ['auto', 'light', 'dark'];
  const labels = { auto: '跟随系统', light: '日间', dark: '夜间' };
  const get = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } };
  const apply = (mode) => { document.documentElement.dataset.theme = mode; };
  apply(get());

  const ICONS = {
    auto: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  };

  function paint(btn) {
    const mode = get();
    btn.innerHTML = ICONS[mode];
    btn.title = `主题：${labels[mode]}（点一下切换）`;
    btn.setAttribute('aria-label', btn.title);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      paint(btn);
      btn.addEventListener('click', () => {
        const next = order[(order.indexOf(get()) + 1) % order.length];
        try { localStorage.setItem(KEY, next); } catch { /* 记不住就只在本页生效 */ }
        apply(next);
        document.querySelectorAll('[data-theme-toggle]').forEach(paint);
      });
    });
  });
})();

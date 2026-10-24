// 弹幕排版：给每条弹幕分配一条“轨道”，让它们尽量不重叠。ASS 导出和网页播放器共用这一套。
//
// 输入：按时间排好的弹幕 + 画面尺寸 + 设置；输出：每条弹幕的轨道 y、宽度、速度。
// 轨道满了的弹幕会被跳过（只影响显示，存档里的数据一条不少）。

(function (root) {
  const BDA = root.BDA = root.BDA || {};

  const DEFAULTS = {
    font: 'PingFang SC',
    fontSize: 42,      // B 站“标准字号 25”在 1080p 画面上的像素
    scrollTime: 10,    // 滚动弹幕从右到左走完一屏的秒数
    fixTime: 5,        // 顶部/底部弹幕停留秒数
    opacity: 0.85,
    area: 0.75,        // 滚动弹幕最多占画面高度的比例
    dropOverflow: true,
    showScroll: true,
    showTop: true,
    showBottom: true,
    offset: 0,         // 弹幕从视频第几秒开始；播放器里每个视频单独记，不进共用设置
    blockWords: '',    // 屏蔽词，一行一个
    showSubs: true,    // 播放器里显示用户加载的字幕
    subSize: 52,       // 字幕在 1080p 画面上的像素
  };

  function loadSettings() {
    let s;
    try {
      s = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('bda-settings') || '{}'));
    } catch { s = Object.assign({}, DEFAULTS); }
    s.offset = 0;
    return s;
  }

  function saveSettings(s) {
    const { offset, ...rest } = s;
    try { localStorage.setItem('bda-settings', JSON.stringify(rest)); } catch { /* 存不了就只在本次生效 */ }
  }

  function kindOf(m) {
    if (m >= 1 && m <= 3) return 'scroll';
    if (m === 6) return 'scroll';
    if (m === 4) return 'bottom';
    if (m === 5) return 'top';
    return null; // 7 高级弹幕 / 8 代码弹幕 / 9 BAS：不支持
  }

  function blocker(settings) {
    const words = (settings.blockWords || '').split('\n').map((w) => w.trim()).filter(Boolean);
    if (!words.length) return () => false;
    const res = words.map((w) => {
      const m = w.match(/^\/(.+)\/([a-z]*)$/);
      if (m) { try { return new RegExp(m[1], m[2]); } catch { return null; } }
      return null;
    });
    return (text) => words.some((w, i) => (res[i] ? res[i].test(text) : text.includes(w)));
  }

  // measure(text, px) → 文本宽度（像素）
  function layout(list, W, H, settings, measure) {
    const scale = H / 1080;
    const base = settings.fontSize * scale;
    const lineH = Math.round(base * 1.25);
    const isBlocked = blocker(settings);
    const scrollRows = Math.max(1, Math.floor((H * settings.area) / lineH));
    const fixRows = Math.max(1, Math.floor((H * 0.5) / lineH));
    const scrollTrack = new Array(scrollRows).fill(null);
    const topTrack = new Array(fixRows).fill(-Infinity);
    const bottomTrack = new Array(fixRows).fill(-Infinity);
    const D = settings.scrollTime, F = settings.fixTime;
    const out = [];

    for (const dm of list) {
      const kind = kindOf(dm.m);
      if (!kind || !dm.x) continue;
      if (kind === 'scroll' && !settings.showScroll) continue;
      if (kind === 'top' && !settings.showTop) continue;
      if (kind === 'bottom' && !settings.showBottom) continue;
      if (isBlocked(dm.x)) continue;
      const text = dm.x.replace(/\r?\n/g, ' ');
      const size = Math.round(base * (dm.s || 25) / 25);
      const w = measure(text, size);
      const t = dm.t + settings.offset;

      if (kind === 'scroll') {
        const v = (W + w) / D;
        let row = -1;
        for (let r = 0; r < scrollRows; r++) {
          const prev = scrollTrack[r];
          // 轨道可用：上一条的尾巴已经进入屏幕，而且新弹幕追不上它
          if (!prev || (t >= prev.t + prev.w / prev.v && t + W / v >= prev.t + D)) { row = r; break; }
        }
        if (row < 0) {
          if (settings.dropOverflow) continue;
          row = Math.floor(Math.random() * scrollRows);
        }
        scrollTrack[row] = { t, w, v };
        out.push({ dm, text, kind, t, end: t + D, w, v, size, y: row * lineH + (lineH - size) / 2 });
      } else {
        const track = kind === 'top' ? topTrack : bottomTrack;
        let row = track.findIndex((until) => t >= until);
        if (row < 0) {
          if (settings.dropOverflow) continue;
          row = 0;
        }
        track[row] = t + F;
        const y = kind === 'top' ? row * lineH + (lineH - size) / 2 : H - (row + 1) * lineH + (lineH - size) / 2;
        out.push({ dm, text, kind, t, end: t + F, w, v: 0, size, y });
      }
    }
    return out;
  }

  // 用 canvas 量文字宽度，带缓存
  function canvasMeasurer(font) {
    const ctx = document.createElement('canvas').getContext('2d');
    const cache = new Map();
    return (text, px) => {
      const key = px + '|' + text;
      let w = cache.get(key);
      if (w === undefined) {
        ctx.font = `${px}px "${font}", "PingFang SC", "Microsoft YaHei", sans-serif`;
        w = ctx.measureText(text).width;
        cache.set(key, w);
      }
      return w;
    };
  }

  Object.assign(BDA, { DEFAULTS, loadSettings, saveSettings, layout, canvasMeasurer, kindOf });
})(typeof self !== 'undefined' ? self : this);

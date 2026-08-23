/* LP試作2: ポップ演出＋ストーリースクラブ（main.jsとは独立） */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- ポップ・リビール ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('on');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.pop').forEach(function (el) { io.observe(el); });

  if (reduced) return;

  /* iOSはスクロール中にアドレスバーが開閉して innerHeight が変わる。
     毎回それを読むと進行度が飛んで画面が前後に動いて見えるので、
     幅が変わったとき（画面回転・リサイズ）だけ高さを取り直す */
  var isMobile = window.matchMedia('(max-width: 900px)').matches;
  var vpW = window.innerWidth;
  var vpH = window.innerHeight;

  /* ---- ストーリー：スクロール量で言葉とバンが進む ---- */
  var story = document.getElementById('story');
  var lines = story ? story.querySelectorAll('.p2-story-line') : [];
  var van = story ? story.querySelector('.p2-van-story') : null;
  /* 各行の表示区間 [イン開始, イン完了, アウト開始, アウト完了] */
  var zones = [
    [0.02, 0.10, 0.24, 0.31],
    [0.33, 0.41, 0.55, 0.62],
    [0.64, 0.72, 0.84, 0.90],
    [0.92, 0.97, 1.01, 1.02]
  ];
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }

  /* ---- コラージュ：写真とイラストが違う速度で動いて重なる ---- */
  var collages = Array.prototype.slice.call(document.querySelectorAll('.p2-collage')).map(function (box) {
    return {
      box: box,
      items: Array.prototype.slice.call(box.querySelectorAll('[data-drift]')).map(function (el) {
        return { el: el, speed: parseFloat(el.getAttribute('data-drift')) || 0, last: null };
      })
    };
  });

  var ticking = false;
  var vanW = 0;
  var lastP = null;

  /* 計測(getBoundingClientRect)と反映(style書き込み)を交互にやると
     1フレームに何度も強制レイアウトが走り、スマホで描画が遅れて揺れる。
     読み取りを先に全部済ませてから、まとめて書き込む */
  function update() {
    ticking = false;
    var vh = vpH;

    /* --- 読み取りフェーズ --- */
    var offsets = [];
    for (var i = 0; i < collages.length; i++) {
      var cr = collages[i].box.getBoundingClientRect();
      offsets[i] = (cr.bottom < -200 || cr.top > vh + 200)
        ? null
        : cr.top + cr.height / 2 - vh / 2; /* 画面中央からのズレ */
    }

    var p = null;
    if (story) {
      var r = story.getBoundingClientRect();
      if (r.bottom >= 0 && r.top <= vh) {
        var total = story.offsetHeight - vh;
        if (total > 0) p = clamp01(-r.top / total);
      }
    }
    if (van && !vanW) vanW = van.offsetWidth || 230;

    /* --- 書き込みフェーズ --- */
    for (var j = 0; j < collages.length; j++) {
      var c = offsets[j];
      if (c === null) continue;
      var items = collages[j].items;
      for (var k = 0; k < items.length; k++) {
        var v = (-c * items[k].speed).toFixed(1) + 'px';
        if (items[k].last === v) continue;
        items[k].last = v;
        items[k].el.style.setProperty('--dy', v);
      }
    }

    if (p === null || p === lastP) return;
    lastP = p;

    lines.forEach(function (line, i) {
      var z = zones[i];
      var o = seg(p, z[0], z[1]) * (1 - seg(p, z[2], z[3]));
      line.style.opacity = o;
      line.style.transform = 'translateY(' + (34 * (1 - seg(p, z[0], z[1]))) + 'px)';
    });

    if (van) {
      var x = (1 - p) * (vpW + vanW * 2 + 60);
      van.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    }
  }
  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  function onResize() {
    if (!isMobile || window.innerWidth !== vpW) { vpH = window.innerHeight; }
    vpW = window.innerWidth;
    vanW = 0;
    requestTick();
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', onResize);
  update();
})();

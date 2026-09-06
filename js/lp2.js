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
  }
  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  function onResize() {
    if (!isMobile || window.innerWidth !== vpW) { vpH = window.innerHeight; }
    vpW = window.innerWidth;
    requestTick();
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', onResize);
  update();
})();

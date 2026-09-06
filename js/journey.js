/* ストーリー：スクロール量で「出発→道中の夕暮れ→到着の夜」を進める。
   読み取り(getBoundingClientRect)と書き込み(style)を分け、rAFで1フレーム1回に間引く。 */
(function () {
  'use strict';

  var sec = document.getElementById('story');
  var stage = document.getElementById('journey');
  if (!sec || !stage) return;

  var lines = sec.querySelectorAll('.p2-story-line');
  var van = stage.querySelector('.jr-van');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    stage.style.setProperty('--oLit', '1');
    for (var n = 0; n < lines.length; n++) {
      lines[n].style.opacity = 1;
      lines[n].style.transform = 'none';
      lines[n].style.position = 'static';
      lines[n].style.margin = '26px 0';
    }
    return;
  }

  /* iOSはスクロール中にアドレスバーが開閉して innerHeight が変わる。
     毎回読むと進行度が飛ぶので、幅が変わったときだけ取り直す */
  var isMobile = window.matchMedia('(max-width: 900px)').matches;
  var vpW = window.innerWidth;
  var vpH = window.innerHeight;

  /* 各行の表示区間 [イン開始, イン完了, アウト開始, アウト完了] */
  var zones = [
    [0.02, 0.09, 0.19, 0.25],
    [0.30, 0.37, 0.47, 0.53],
    [0.57, 0.64, 0.73, 0.79],
    [0.85, 0.92, 1.02, 1.03]
  ];

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }
  function smooth(v) { return v * v * (3 - 2 * v); }
  function mix(a, b, t) { return a + (b - a) * t; }

  var ticking = false, lastP = null, driving = null, nightsky = null, vanW = 0;

  function paint(p) {
    var W = vpW;

    /* 停車：0.88 以降は進みを減速させて止める */
    var travel = p <= 0.88 ? p : 0.88 + 0.035 * (1 - Math.pow(1 - clamp01((p - 0.88) / 0.12), 3));

    /* 情景は不透明度の合計が常に1になるよう入れ替える（前の情景が透けないように） */
    var mid = smooth(seg(p, 0.20, 0.34));
    var camp = smooth(seg(p, 0.52, 0.68));
    var dusk = smooth(seg(p, 0.22, 0.42));
    var night = smooth(seg(p, 0.52, 0.74));
    var grade = smooth(seg(p, 0.26, 0.44)) * (1 - smooth(seg(p, 0.54, 0.74)));
    var star = smooth(seg(p, 0.56, 0.80));
    var lit = smooth(seg(p, 0.80, 0.96));
    var beam = smooth(seg(p, 0.44, 0.62));

    /* 車：左から入り、画面を横切って右端まで走り、減速して停まる */
    var xIn = W * 0.10;
    var xEnd = W - vanW - 24;
    var vanX;
    if (p < 0.14) {
      vanX = mix(-vanW - 40, xIn, smooth(p / 0.14));
    } else {
      vanX = xIn + (xEnd - xIn) * (1 - Math.pow(1 - clamp01((p - 0.14) / 0.80), 2));
    }

    var s = sec.style;
    s.setProperty('--bgFar', (-travel * 2400).toFixed(1) + 'px');
    s.setProperty('--bgNear', (-travel * 7600).toFixed(1) + 'px');
    s.setProperty('--bgRoad', (-travel * 11800).toFixed(1) + 'px');
    s.setProperty('--vanX', vanX.toFixed(1) + 'px');
    s.setProperty('--oCity', (1 - mid).toFixed(3));
    s.setProperty('--oMid', (mid * (1 - camp)).toFixed(3));
    s.setProperty('--oCamp', camp.toFixed(3));
    s.setProperty('--oDusk', dusk.toFixed(3));
    s.setProperty('--oNight', night.toFixed(3));
    s.setProperty('--oGrade', grade.toFixed(3));
    s.setProperty('--oStar', star.toFixed(3));
    s.setProperty('--oLit', lit.toFixed(3));
    s.setProperty('--oBeam', beam.toFixed(3));
    s.setProperty('--sunX', (-vpW * 0.12 * dusk).toFixed(1) + 'px');
    s.setProperty('--sunY', (vpH * 0.42 * smooth(seg(p, 0.16, 0.58))).toFixed(1) + 'px');

    /* 文字は背景が暗くなる前に白へ切り替える。
       行の表示区間の切れ目（0.53〜0.57）で入れ替えるので、切り替わる瞬間は誰にも見えない */
    var inkT = Math.max(smooth(seg(p, 0.52, 0.60)), night);
    var c = Math.round(mix(34, 255, inkT)) + ',' + Math.round(mix(48, 255, inkT)) + ',' + Math.round(mix(31, 255, inkT));
    s.setProperty('--jr-ink', 'rgb(' + c + ')');
    s.setProperty('--jr-shadow', 'rgba(8,14,32,' + (0.6 * inkT).toFixed(2) + ')');

    for (var i = 0; i < lines.length; i++) {
      var z = zones[i];
      var into = seg(p, z[0], z[1]);
      lines[i].style.opacity = into * (1 - seg(p, z[2], z[3]));
      lines[i].style.transform = 'translateY(' + (34 * (1 - into)).toFixed(1) + 'px)';
    }

    var run = p < 0.94;
    if (run !== driving) {
      driving = run;
      stage.classList.toggle('jr-drive', run);
    }

    var dark = night > 0.12;
    if (dark !== nightsky) {
      nightsky = dark;
      stage.classList.toggle('jr-nightsky', dark);
    }
  }

  function update() {
    ticking = false;
    var r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vpH) return;

    var total = sec.offsetHeight - vpH;
    if (total <= 0) return;
    if (!vanW && van) vanW = van.offsetWidth || 260;
    var p = clamp01(-r.top / total);
    if (p === lastP) return;
    lastP = p;
    paint(p);
  }

  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', function () {
    if (!isMobile || window.innerWidth !== vpW) { vpH = window.innerHeight; }
    vpW = window.innerWidth;
    vanW = 0;
    lastP = null;
    requestTick();
  });
  update();
}());

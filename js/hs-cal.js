/* ハイシーズン期間のミニカレンダー。main.js の HIGH_SEASONS だけを見て描く（3拠点共通） */
(function () {
  'use strict';

  var box = document.getElementById('hsx');
  if (!box) return;
  if (typeof HIGH_SEASONS === 'undefined' || !HIGH_SEASONS.length) { box.hidden = true; return; }

  var tabs = document.getElementById('hsxTabs');
  var months = document.getElementById('hsxMonths');
  var list = document.getElementById('hsxList');
  var DOW = ['日', '月', '火', '水', '木', '金', '土'];

  /* 日数条件つきの期間は色を変える。大阪は min7、支店は rule で持っている */
  function limited(s) { return !!(s.min7 || s.rule); }
  function limitText(s) { return s.rule === 'exact7' ? '7泊8日限定' : '7日間（6泊7日）以上'; }

  /* 年度＝4月始まり。1〜3月は前年の年度に入る */
  function fyOf(ymd) {
    var y = parseInt(ymd.slice(0, 4), 10);
    return parseInt(ymd.slice(5, 7), 10) >= 4 ? y : y - 1;
  }

  var years = [];
  HIGH_SEASONS.forEach(function (s) {
    var fy = fyOf(s.s);
    if (years.indexOf(fy) === -1) years.push(fy);
  });
  years.sort();

  function seasonAt(ymd, seasons) {
    for (var i = 0; i < seasons.length; i++) {
      if (ymd >= seasons[i].s && ymd <= seasons[i].e) return seasons[i];
    }
    return null;
  }

  function month(key, seasons) {
    var y = parseInt(key.slice(0, 4), 10);
    var m = parseInt(key.slice(5, 7), 10);
    var last = new Date(y, m, 0).getDate();
    var lead = new Date(y, m - 1, 1).getDay();

    var cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="hsx-d hsx-blank"></span>';
    for (var d = 1; d <= last; d++) {
      var ymd = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var hit = seasonAt(ymd, seasons);
      var dow = new Date(y, m - 1, d).getDay();
      var cls = 'hsx-d';
      if (hit) cls += limited(hit) ? ' hsx-lim' : ' hsx-hs';
      else if (dow === 0) cls += ' hsx-sun';
      else if (dow === 6) cls += ' hsx-sat';
      cells += '<span class="' + cls + '"' + (hit ? ' title="' + hit.label + '"' : '') + '>' + d + '</span>';
    }

    return '<div class="hsx-m"><div class="hsx-mt">' + y + '年' + m + '月</div><div class="hsx-g">'
      + DOW.map(function (w) { return '<span class="hsx-w">' + w + '</span>'; }).join('')
      + cells + '</div></div>';
  }

  function draw(fy) {
    var seasons = HIGH_SEASONS.filter(function (s) { return fyOf(s.s) === fy; });

    /* ハイシーズンを含む月だけを並べる */
    var keys = [];
    seasons.forEach(function (s) {
      var cur = new Date(s.s + 'T00:00:00');
      var end = new Date(s.e + 'T00:00:00');
      while (cur <= end) {
        var key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0');
        if (keys.indexOf(key) === -1) keys.push(key);
        cur.setDate(cur.getDate() + 1);
      }
    });
    keys.sort();

    months.innerHTML = keys.map(function (k) { return month(k, seasons); }).join('');
    list.innerHTML = seasons.map(function (s) {
      return '<b>' + s.label + '</b> ' + s.disp + (limited(s) ? '<i>（' + limitText(s) + '）</i>' : '');
    }).join('　/　');

    Array.prototype.forEach.call(tabs.children, function (b) {
      var on = parseInt(b.dataset.hsxYear, 10) === fy;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  tabs.innerHTML = years.map(function (fy) {
    return '<button type="button" class="hsx-tab" role="tab" data-hsx-year="' + fy + '">' + fy + '年度</button>';
  }).join('');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('.hsx-tab');
    if (b) draw(parseInt(b.dataset.hsxYear, 10));
  });

  /* 初期表示は今日が属する年度。データに無ければ最初の年度 */
  var now = new Date();
  var thisFy = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  draw(years.indexOf(thisFy) === -1 ? years[0] : thisFy);
}());

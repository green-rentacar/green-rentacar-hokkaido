/* 予約フォームの開閉と、料金相談モーダルへの受け渡し（3拠点共通） */
(function () {
  'use strict';

  var fold = document.getElementById('rsvFold');

  function openRsv() {
    if (!fold || fold.open) return;
    fold.open = true;
  }

  if (fold) {
    /* #contact へ飛んできた人は、そのまま入力できるよう開いておく */
    if (location.hash === '#contact') openRsv();
    window.addEventListener('hashchange', function () {
      if (location.hash === '#contact') openRsv();
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href$="#contact"]') : null;
      if (a) openRsv();
    });

    /* 仮見積もりを添付したら、続けて入力できるよう開く */
    if (typeof window.attachEstimateToForm === 'function') {
      var orig = window.attachEstimateToForm;
      window.attachEstimateToForm = function () {
        var r = orig.apply(this, arguments);
        openRsv();
        return r;
      };
    }
  }

  /* 料金・空き状況の相談。見積もり済みなら日程と金額を引き継ぐ */
  window.openConsultModal = function (fromEstimate) {
    if (typeof window.openAvailModal !== 'function') return;
    window.openAvailModal();

    var m = document.getElementById('avail-modal');
    if (!m || !fromEstimate) return;

    var pick = function (n) { return m.querySelector('[name="' + n + '"]'); };
    var ci = document.getElementById('est-checkin');
    var co = document.getElementById('est-checkout');
    if (ci && ci.value && pick('ご希望開始日')) pick('ご希望開始日').value = ci.value;
    if (co && co.value && pick('ご希望終了日')) pick('ご希望終了日').value = co.value;

    var note = pick('ひとこと');
    var total = document.getElementById('est-total');
    if (note && !note.value && total && total.textContent.trim()) {
      note.value = '【仮見積もりの合計目安】' + total.textContent.trim() + '\n\nご相談内容：';
    }
  };
}());

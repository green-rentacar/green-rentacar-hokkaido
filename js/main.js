// ===== ハイシーズン期間（年度ごとの絶対日付）=====
// rule: 'exact7' = 7泊限定 / 'min7' = 7日間（6泊7日）以上
const HIGH_SEASONS = [
  // 2026年度
  { s: '2026-04-29', e: '2026-05-06', label: 'GW',       disp: '4/29〜5/6' },
  { s: '2026-07-18', e: '2026-08-09', label: '夏休み',   disp: '7/18〜8/9' },
  { s: '2026-08-10', e: '2026-08-16', label: 'お盆',     disp: '8/10〜8/16', rule: 'exact7', ci: '8/10', co: '8/17' },
  { s: '2026-12-25', e: '2026-12-28', label: '年末',     disp: '12/25〜12/28' },
  { s: '2026-12-29', e: '2027-01-04', label: '冬休み',   disp: '12/29〜1/4',  rule: 'exact7', ci: '12/29', co: '1/5' },
  { s: '2027-01-05', e: '2027-01-06', label: '年始',     disp: '1/5〜1/6' },
  // 2027年度
  { s: '2027-04-29', e: '2027-05-05', label: 'GW',       disp: '4/29〜5/5' },
  { s: '2027-07-17', e: '2027-08-06', label: '夏休み',   disp: '7/17〜8/6' },
  { s: '2027-08-07', e: '2027-08-15', label: 'お盆',     disp: '2027/8/7〜8/15',        rule: 'min7' },
  { s: '2027-12-25', e: '2027-12-28', label: '冬休み',   disp: '12/25〜12/28' },
  { s: '2027-12-29', e: '2028-01-04', label: '年末年始', disp: '2027/12/29〜2028/1/4',  rule: 'min7' },
  { s: '2028-01-05', e: '2028-01-06', label: '年始',     disp: '2028/1/5〜1/6' }
];

// 期間にかかる予約の日数条件をチェック。問題なければ null、違反なら { season, message } を返す
function checkSeasonRule(checkinStr, checkoutStr, nights) {
  for (const s of HIGH_SEASONS) {
    if (!s.rule) continue;
    if (!(checkinStr <= s.e && checkoutStr > s.s)) continue;
    if (s.rule === 'exact7' && nights !== 7) {
      return { season: s, message: s.label + '期間（' + s.disp + '）のご予約は7日間レンタルのみ承っております。チェックイン ' + s.ci + '・チェックアウト ' + s.co + ' でお申し込みください。' };
    }
    if (s.rule === 'min7' && nights < 6) {
      return { season: s, message: s.label + '期間（' + s.disp + '）にかかるご予約は7日間（6泊7日）以上から承っております。' };
    }
  }
  return null;
}

// ===== 車両データ（アイスグリーン・カーキ）=====
const CARS = [
  {
    label : 'HAPPY1 アイスグリーン（14-11）',
    imgs  : [
      { src: 'images/happy1-car1.png', label: '全体' },
    ]
  },
  {
    label : 'HAPPY1 カーキ（14-59）',
    imgs  : [
      { src: 'images/happy1-main.jpg', label: '全体' },
    ]
  }
];

let _currentCar = 0;

function switchVehicleTab(carIdx) {
  _currentCar = carIdx;

  // タブのアクティブ切替
  document.querySelectorAll('.vehicle-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === carIdx);
  });

  const car = CARS[carIdx];

  // メイン画像を更新
  const mainEl = document.getElementById('vehicleMain');
  if (mainEl) mainEl.style.backgroundImage = `url('${car.imgs[0].src}')`;

  // 号車ラベルを更新
  const tagLabel = document.getElementById('vehicleTagLabel');
  if (tagLabel) tagLabel.textContent = car.label;

  // サムネイル一覧を再描画
  const thumbsWrap = document.querySelector('.vehicle-thumbs');
  if (thumbsWrap) {
    thumbsWrap.innerHTML = car.imgs.map((img, i) =>
      `<div class="vehicle-thumb${i === 0 ? ' active' : ''}" onclick="switchVehicleImg(${i})" style="background-image:url('${img.src}')"><span class="thumb-label">${img.label}</span></div>`
    ).join('');
  }
}

function switchVehicleImg(idx) {
  const car  = CARS[_currentCar];
  const main = document.getElementById('vehicleMain');
  if (main && car.imgs[idx]) main.style.backgroundImage = `url('${car.imgs[idx].src}')`;
  document.querySelectorAll('.vehicle-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });
}

// ===== 2028年以降 注意書きバナー（案A・案B）=====
function checkFutureYear(inputIds, noticeId) {
  const notice = document.getElementById(noticeId);
  if (!notice) return;
  const isFuture = inputIds.some(id => {
    const el = document.getElementById(id);
    if (!el || !el.value) return false;
    return parseInt(el.value.split('-')[0], 10) >= 2028;
  });
  notice.classList.toggle('visible', isFuture);
}

// ===== ハイシーズンカレンダー（年度切り替え）=====
const HS_DOW = ['日', '月', '火', '水', '木', '金', '土'];

function hsSeasonAt(ymd, seasons) {
  return seasons.find(s => ymd >= s.s && ymd <= s.e);
}

function renderHsMonth(key, seasons) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = parseInt(key.slice(5, 7), 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = new Date(y, m - 1, 1).getDay();
  const dowLabels = document.documentElement.lang === 'en'
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : HS_DOW;

  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="hsc-d hsc-blank"></span>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const hit = hsSeasonAt(ymd, seasons);
    const dow = new Date(y, m - 1, d).getDay();
    let cls = 'hsc-d';
    if (hit) cls += (hit.min7 || hit.rule) ? ' hsc-lim' : ' hsc-hs';
    else if (dow === 0) cls += ' hsc-sun';
    else if (dow === 6) cls += ' hsc-sat';
    const title = hit ? ' title="' + hit.label + '"' : '';
    cells += '<span class="' + cls + '"' + title + '>' + d + '</span>';
  }

  const mtitle = document.documentElement.lang === 'en'
    ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]
    : m + '月';

  return '<div class="hsc-month">'
    + '<div class="hsc-mtitle">' + mtitle + '</div>'
    + '<div class="hsc-grid">'
    + dowLabels.map((w, i) => '<span class="hsc-w' + (i === 0 ? ' hsc-sun' : i === 6 ? ' hsc-sat' : '') + '">' + w + '</span>').join('')
    + cells
    + '</div></div>';
}

function renderHsCalendar(fy, container) {
  if (!container) return;
  const fyStart = fy + '-04-01';
  const fyEnd   = (fy + 1) + '-03-31';
  const seasons = HIGH_SEASONS.filter(s => s.s >= fyStart && s.s <= fyEnd);

  // ハイシーズンを含む月だけを抽出（年度順）
  const months = [];
  seasons.forEach(s => {
    const cur = new Date(s.s + 'T00:00:00');
    const end = new Date(s.e + 'T00:00:00');
    while (cur <= end) {
      const key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0');
      if (months.indexOf(key) === -1) months.push(key);
      cur.setDate(cur.getDate() + 1);
    }
  });
  months.sort();

  // 暦年ごとに区切る（年度は2つの暦年にまたがるため）
  const isEn = document.documentElement.lang === 'en';
  const groups = [];
  months.forEach(key => {
    const y = key.slice(0, 4);
    let g = groups.filter(x => x.y === y)[0];
    if (!g) { g = { y: y, keys: [] }; groups.push(g); }
    g.keys.push(key);
  });

  container.innerHTML = groups.map(g =>
    '<div class="hsc-year">'
      + '<div class="hsc-yhead"><span>' + g.y + (isEn ? '' : '年') + '</span></div>'
      + '<div class="hsc-months">' + g.keys.map(key => renderHsMonth(key, seasons)).join('') + '</div>'
    + '</div>'
  ).join('');
}

function showHsYear(year) {
  document.querySelectorAll('.hs-tab').forEach(b => {
    const on = b.dataset.hsYear === year;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-hs-panel]').forEach(p => {
    p.hidden = p.dataset.hsPanel !== year;
  });
  renderHsCalendar(parseInt(year, 10), document.getElementById('hsCal'));
}

function initHsTabs() {
  const tabs = document.querySelectorAll('.hs-tab');
  if (!tabs.length) return;
  tabs.forEach(btn => btn.addEventListener('click', () => showHsYear(btn.dataset.hsYear)));
  const active = document.querySelector('.hs-tab.is-active') || tabs[0];
  showHsYear(active.dataset.hsYear);
}
document.addEventListener('DOMContentLoaded', initHsTabs);

// 仮見積もり（案A）
['est-checkin', 'est-checkout'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => checkFutureYear(['est-checkin', 'est-checkout'], 'estFutureYearNotice'));
});

// 予約フォーム（案B）
['checkin', 'checkout'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => checkFutureYear(['checkin', 'checkout'], 'formFutureYearNotice'));
});

// ===== ハンバーガーメニュー =====
const hamburger = document.getElementById('hamburger');
const navList   = document.querySelector('.nav-list');

hamburger.addEventListener('click', () => {
  navList.classList.toggle('open');
});
navList.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navList.classList.remove('open'));
});

// ===== ヘッダースクロール =====
const headerEl = document.getElementById('header');
if (headerEl && !headerEl.classList.contains('p2-header')) {
  let headerLifted = null;
  window.addEventListener('scroll', () => {
    const lifted = window.scrollY > 10;
    if (lifted === headerLifted) return;
    headerLifted = lifted;
    headerEl.style.boxShadow = lifted
      ? '0 2px 20px rgba(0,0,0,0.12)'
      : '0 1px 0 rgba(0,0,0,0.06)';
  }, { passive: true });
}

// ===== スクロールアニメーション =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.animate').forEach(el => observer.observe(el));

// ===== 郵便番号 → 住所 自動入力（zipcloud API） =====
let _postalTimer = null;

function onPostalInput(value) {
  const digits = value.replace(/[^0-9]/g, '');
  clearTimeout(_postalTimer);
  if (digits.length === 7) {
    _postalTimer = setTimeout(() => fetchAddress(digits), 300);
  }
}

async function fetchAddress(digits) {
  const loading = document.getElementById('postal-loading');
  if (loading) loading.style.display = 'inline-flex';

  try {
    const res  = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      // 都道府県セレクトを設定
      const prefSelect = document.getElementById('pref-select');
      if (prefSelect) {
        const options = Array.from(prefSelect.options);
        const match   = options.find(o => o.value === r.address1 || o.text === r.address1);
        if (match) prefSelect.value = r.address1;
      }
      // 市区町村に address2（市区）+ address3（町名）を結合して入力
      const cityInput = document.getElementById('city-input');
      if (cityInput) {
        cityInput.value = (r.address2 || '') + (r.address3 || '');
        cityInput.focus();  // 続きの番地入力に誘導
      }
    }
  } catch (e) {
    // APIエラー時は無視（手動入力で続けられる）
    console.warn('郵便番号検索失敗:', e);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// ===== Google Apps Script URL =====
const APPS_SCRIPT_URL = 'https://green-rentacar-hokkaido-proxy.shy-snow-b32c.workers.dev';

// ===== 空き確認エラー：上部バナー表示 =====
function showAvailErrorBanner(message) {
  // 既存バナーを削除
  document.querySelectorAll('.avail-top-banner').forEach(el => el.remove());

  const banner = document.createElement('div');
  banner.className = 'avail-top-banner';
  banner.innerHTML =
    '<span class="material-icons-round">event_busy</span>' +
    '<span class="banner-msg">' + message + '</span>' +
    '<button class="banner-close" aria-label="閉じる">&#x2715;</button>';

  banner.querySelector('.banner-close').addEventListener('click', () => banner.remove());
  document.body.prepend(banner);

  // 8秒後に自動消去
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 8000);
}

// ===== 予約フォーム バリデーション＆AJAX送信 =====
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // エラー表示をリセット
    const existingErr = form.querySelector('.booking-avail-error');
    if (existingErr) existingErr.remove();

    // 送信試行フラグ
    form.classList.add('was-submitted');

    let hasError = false;

    // ① HTML5バリデーション
    const standardInvalid = form.querySelectorAll('input:invalid, select:invalid, textarea:invalid');
    if (standardInvalid.length > 0) hasError = true;

    // ② 運転免許証の種類（セレクト）チェック
    const licenseGroup = document.getElementById('license-group');
    const licenseSelect = form.querySelector('select[name="運転免許証の種類"]');
    if (!licenseSelect || !licenseSelect.value) {
      licenseGroup.classList.add('group-error');
      hasError = true;
    } else {
      licenseGroup.classList.remove('group-error');
    }

    // ③ 重要事項同意チェックボックス
    const consentTerms     = document.getElementById('consent-terms');
    const consentTermsWrap = document.getElementById('consent-terms-wrap');
    if (consentTerms && consentTermsWrap) {
      if (!consentTerms.checked) {
        consentTermsWrap.classList.add('group-error');
        // 未確認の場合はメッセージ表示
        const notReadMsg = document.getElementById('terms-not-read-msg');
        if (notReadMsg && consentTerms.disabled) notReadMsg.style.display = 'block';
        hasError = true;
      } else {
        consentTermsWrap.classList.remove('group-error');
      }
    }

    // ④ 仮見積もりの添付チェック（必須）— 見積りなし予約を禁止
    const estAttachEl   = document.getElementById('est-attached-text');
    const estAttachWrap = form.querySelector('.form-est-attach-wrap');
    const estAttached   = estAttachEl && estAttachEl.value.trim() !== '';
    if (!estAttached) {
      if (estAttachWrap) estAttachWrap.classList.add('est-required-error');
      hasError = true;
    } else if (estAttachWrap) {
      estAttachWrap.classList.remove('est-required-error');
    }

    if (hasError) {
      const firstError =
        form.querySelector('.form-est-attach-wrap.est-required-error') ||
        form.querySelector('.group-error') ||
        form.querySelector('input:invalid, select:invalid');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // ===== バリデーション通過 → 空き確認 → 予約送信 =====
    const submitBtn = form.querySelector('[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> 空き確認中...';
    submitBtn.disabled = true;

    try {
      const formData = new FormData(form);

      // 送信データをまとめる
      const bookingData = {
        checkin:     formData.get('ご利用開始日')    || '',
        checkout:    formData.get('ご利用終了日')    || '',
        vehicle:     formData.get('ご希望の車両')    || 'どちらでも可',
        name:        formData.get('お名前')          || '',
        email:       formData.get('メールアドレス')  || '',
        postal:      formData.get('郵便番号')        || '',
        pref:        formData.get('都道府県')        || '',
        city:        formData.get('市区町村')        || '',
        street:      formData.get('番地')            || '',
        building:    formData.get('建物名・部屋番号')|| '',
        rentalType:  formData.get('受け取り方法')    || '',
        license:     formData.get('運転免許証の種類')|| '',
        extraDriver: formData.get('同乗者運転の事前申告') || '',
        estimate:    formData.get('仮見積もり内容') || '',
        message:     formData.get('ご質問・ご要望') || ''
      };

      // ① 特定期間 7日間制限チェック（フロントエンド）
      const ciDate = new Date(bookingData.checkin);
      const coDate = new Date(bookingData.checkout);
      const rentalDays = Math.round((coDate - ciDate) / 86400000);
      const violation = checkSeasonRule(bookingData.checkin, bookingData.checkout, rentalDays);
      if (violation) {
        form.querySelectorAll('.booking-avail-error').forEach(el => el.remove());
        const errDiv = document.createElement('div');
        errDiv.className = 'booking-avail-error';
        errDiv.innerHTML = '<span class="material-icons-round">event_busy</span><span><strong>' + violation.message + '</strong></span>';
        submitBtn.parentNode.insertBefore(errDiv, submitBtn);
        showAvailErrorBanner(violation.message + ' 日程をご確認ください。');
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // ② 空き確認（GET）— 失敗しても予約送信には進む
      const availUrl = APPS_SCRIPT_URL
        + '?action=check'
        + '&checkin='  + encodeURIComponent(bookingData.checkin)
        + '&checkout=' + encodeURIComponent(bookingData.checkout)
        + '&car='      + encodeURIComponent(bookingData.vehicle);

      let availData = { available: true };
      try {
        const availRes  = await fetch(availUrl, { redirect: 'follow' });
        const availText = await availRes.text();
        availData = JSON.parse(availText);
      } catch (availErr) {
        console.warn('空き確認スキップ（通信エラー）:', availErr);
      }

      if (availData.available === false) {
        const msg = availData.message || '選択された期間はすでにご予約が入っております。別の日程をご検討ください。';
        form.querySelectorAll('.booking-avail-error').forEach(el => el.remove());
        const errDiv = document.createElement('div');
        errDiv.className = 'booking-avail-error';
        errDiv.innerHTML = '<span class="material-icons-round">event_busy</span><span>' + msg + '</span>';
        submitBtn.parentNode.insertBefore(errDiv, submitBtn);
        showAvailErrorBanner('⚠ ご指定の日程はすでに予約が入っています。別の日程をご選択ください。');
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // ② 予約送信（POST: URLSearchParams で e.parameter に確実に届ける）
      submitBtn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> 仮予約申し込み中...';
      const postBody = new URLSearchParams();
      postBody.append('action',            'book');
      postBody.append('チェックイン日',      bookingData.checkin);
      postBody.append('チェックアウト日',    bookingData.checkout);
      postBody.append('ご希望の車両',        bookingData.vehicle);
      postBody.append('お名前',              bookingData.name);
      postBody.append('メールアドレス',      bookingData.email);
      postBody.append('電話番号',            formData.get('電話番号') || '');
      postBody.append('来店時間',            formData.get('来店時間') || '');
      postBody.append('返却時間',            formData.get('返却時間') || '');
      postBody.append('受け取り方法',        bookingData.rentalType);
      postBody.append('運転免許証の種類',    bookingData.license);
      postBody.append('同乗者運転の事前申告',bookingData.extraDriver);
      postBody.append('お支払い方法',        formData.get('お支払い方法') || '');
      postBody.append('認知経路',            formData.get('認知経路') || '');
      postBody.append('仮見積もり内容',      bookingData.estimate);
      postBody.append('ご質問・ご要望',      bookingData.message);
      postBody.append('合計金額',            _lastEstimate ? String(_lastEstimate.grandTotal) : '0');

      const bookRes  = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: postBody, redirect: 'follow' });
      const bookText = await bookRes.text();
      const bookData = JSON.parse(bookText);

      if (!bookData.success) throw new Error(bookData.message || bookData.error || '送信エラー');

      // メール送信ステータスをコンソールに記録（診断用）
      console.log('[予約送信結果]', bookData);
      if (bookData.mailStatus && bookData.mailStatus !== 'sent_ok') {
        console.warn('[お客様メール送信失敗]', bookData.mailStatus);
      }

      // 成功 → 確認モーダル表示
      showConfirmationModal(formData, bookData.receiptNo, bookData.carName);
      form.reset();
      form.classList.remove('was-submitted');

    } catch (err) {
      alert('送信に失敗しました。\n' + (err.message || '') + '\nお手数ですがお電話（050-1720-6116）にてご連絡ください。');
    } finally {
      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
    }
  });

  // 支払い方法選択で銀行情報を表示/非表示
  const paymentSelect = document.getElementById('payment');
  const paymentBankInfo = document.getElementById('payment-bank-info');
  if (paymentSelect && paymentBankInfo) {
    paymentSelect.addEventListener('change', function () {
      paymentBankInfo.style.display = this.value === '事前銀行振り込み' ? 'flex' : 'none';
    });
  }

  // チェックボックスを変更したらリアルタイムでエラー解除
  ['consent-terms'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      const wrap = this.closest('.consent-item');
      if (this.checked) wrap.classList.remove('group-error');
    });
  });

  // セレクトを変更したらエラー解除
  const licenseSelectEl = form.querySelector('select[name="運転免許証の種類"]');
  if (licenseSelectEl) {
    licenseSelectEl.addEventListener('change', function () {
      document.getElementById('license-group').classList.remove('group-error');
    });
  }

  // 受け取り方法が配車サービスのとき「来店時間」→「引き渡し時間」に切替
  const rentalTypeEl = document.getElementById('rental-type');
  if (rentalTypeEl) {
    rentalTypeEl.addEventListener('change', updateArrivalTimeLabel);
    updateArrivalTimeLabel();
  }
})();

// 受け取り方法に応じて来店時間ラベルを切り替える（配車＝引き渡し時間）
function updateArrivalTimeLabel() {
  const rt    = document.getElementById('rental-type');
  const label = document.getElementById('arrival-time-label');
  const note  = document.getElementById('arrival-haisha-note');
  if (!rt || !label) return;
  const isHaisha = rt.value.indexOf('配車') >= 0 || rt.value.indexOf('お届け') >= 0;
  label.textContent = isHaisha ? '引き渡し時間' : '来店時間';
  if (note) note.style.display = isHaisha ? 'flex' : 'none';
}

// ===== 仮見積もり基本料金 =====
const BASE_WEEKDAY   = 23760;
const BASE_WEEKEND   = Math.round(BASE_WEEKDAY * 1.2); // 28512
const HIGH_ADDON     = 11000;
const NORMAL_WEEKDAY = BASE_WEEKDAY;                   // 23760
const NORMAL_WEEKEND = BASE_WEEKEND;                   // 28512
const HIGH_WEEKDAY   = BASE_WEEKDAY + HIGH_ADDON;      // 34760
const HIGH_WEEKEND   = BASE_WEEKEND + HIGH_ADDON;      // 39512
const LONG_DISCOUNT_NIGHTS = 5;   // 5泊以上で割引
const LONG_DISCOUNT_RATE   = 0.1; // 10%引き

// ===== オプション定義 =====
const OPTIONS = [
  // グループ1: ファミリー・ペット
  { id: 'opt-pet',     type: 'check', name: 'ペット同乗',           price: 11000, unit: '1回' },
  // グループ2: 有料オプション
  { id: 'opt-ih',      type: 'check', name: 'IHコンロ',             price:   550, unit: '1台' },
  { id: 'opt-kettle',  type: 'check', name: '電気ケトル',           price:  1100, unit: '1台' },
  { id: 'opt-power',   type: 'check', name: 'ポータブル電源',       price:  3300, unit: '1台' },
  { id: 'opt-table',   type: 'qty',   name: '折りたたみテーブル',   price:  1100, unit: '1台' },
  { id: 'opt-chair',   type: 'qty',   name: 'ラウンジチェア',       price:  1100, unit: '1脚' },
  // ※ 新千歳空港お届け（¥16,500）は「受け取り方法」で選択。calcEstimate内で加算
];

// 新千歳空港お届けサービス料金（受け取り方法で選択）
const AIRPORT_DELIVERY_FEE = 16500;

// 数量型オプションの値を管理
const qtyValues = {};

// ===== 数量変更 =====
function changeQty(id, delta) {
  if (!(id in qtyValues)) qtyValues[id] = 0;
  const maxQty = id === 'opt-sleepingbag' ? 4 : id === 'opt-campset' ? 2 : 9;
  qtyValues[id] = Math.max(0, Math.min(maxQty, qtyValues[id] + delta));

  const span = document.getElementById(id);
  if (span) span.textContent = qtyValues[id];

  // 数量 > 0 のとき親カードに色を付ける
  const card = span ? span.closest('.est-opt-qty-card') : null;
  if (card) card.classList.toggle('has-qty', qtyValues[id] > 0);

  updateOptionPreview();
}

// ===== オプション合計計算 =====
function getOptionResults() {
  let total = 0;
  const lines = [];

  OPTIONS.forEach(opt => {
    let qty = 0;
    if (opt.type === 'check') {
      const el = document.getElementById(opt.id);
      qty = (el && el.checked) ? 1 : 0;
    } else {
      qty = qtyValues[opt.id] || 0;
    }
    if (qty > 0) {
      const amt = opt.price * qty;
      total += amt;
      lines.push({
        name: opt.name,
        qty,
        unit: opt.unit,
        price: opt.price,
        amt
      });
    }
  });

  return { total, lines };
}

// ===== リアルタイム合計プレビュー（オプション選択時） =====
function updateOptionPreview() {
  const { total } = getOptionResults();
  const wrap  = document.getElementById('est-opt-running');
  const label = document.getElementById('est-opt-running-total');

  if (wrap && label) {
    if (total > 0) {
      label.textContent = formatYen(total);
      wrap.style.display = 'flex';
    } else {
      wrap.style.display = 'none';
    }
  }
}

// ===== ユーティリティ =====
function toYmd(date) {
  return date.getFullYear() + '-'
    + String(date.getMonth() + 1).padStart(2, '0') + '-'
    + String(date.getDate()).padStart(2, '0');
}

function isPeak(date) {
  const key = toYmd(date);
  return HIGH_SEASONS.some(s => key >= s.s && key <= s.e);
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function formatYen(amount) {
  return '¥' + amount.toLocaleString('ja-JP');
}

function formatDate(dateStr) {
  const d    = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y    = d.getFullYear();
  const m    = String(d.getMonth() + 1).padStart(2, '0');
  const day  = String(d.getDate()).padStart(2, '0');
  const dow  = days[d.getDay()];
  return `${y}/${m}/${day}（${dow}）`;
}

// 見積セクションの受け取り方法を変更したら即再計算（日程入力済みのとき）
function onEstPickupChange() {
  const ci = document.getElementById('est-checkin');
  const co = document.getElementById('est-checkout');
  if (ci && co && ci.value && co.value) calcEstimate();
}

// ===== 見積もり計算（メイン） =====
let _lastEstimate = null;

function calcEstimate() {
  const checkinVal  = document.getElementById('est-checkin').value;
  const checkoutVal = document.getElementById('est-checkout').value;
  const result      = document.getElementById('est-result');
  const errorMsg    = document.getElementById('est-error');

  // 受け取り方法（計算前に取得）
  const pickupVal  = document.getElementById('est-pickup')?.value || '当日9時以降';
  const isPrevDay  = pickupVal === '前日夜18時〜（半額）';

  errorMsg.textContent = '';
  result.style.display = 'none';
  _lastEstimate = null;
  resetAttachButton();

  if (!checkinVal || !checkoutVal) {
    errorMsg.textContent = '日程を両方入力してください。';
    return;
  }

  const checkin  = new Date(checkinVal);
  const checkout = new Date(checkoutVal);
  // チェックイン〜チェックアウトの泊数（例：5/12〜5/13 = 1泊）
  const nights   = Math.round((checkout - checkin) / 86400000);

  if (nights < 1) {
    errorMsg.textContent = 'ご利用終了日はご利用開始日と同じかそれより後の日付を選んでください。';
    return;
  }

  // 特定期間の日数制限チェック（お盆・年末年始）
  const estViolation = checkSeasonRule(checkinVal, checkoutVal, nights);
  if (estViolation) {
    errorMsg.textContent = estViolation.message;
    return;
  }

  // ---- 基本料金計算（チェックイン日〜チェックアウト日の両日含む・1泊2日=2日分） ----
  let rentalSubtotal      = 0;
  let normalWeekdayNights = 0;
  let normalWeekendNights = 0;
  let highWeekdayNights   = 0;
  let highWeekendNights   = 0;

  for (let i = 0; i <= nights; i++) {
    const d = new Date(checkin);
    d.setDate(d.getDate() + i);
    const high    = isPeak(d);
    const weekend = isWeekend(d);
    if (high && weekend)        { rentalSubtotal += HIGH_WEEKEND;   highWeekendNights++; }
    else if (high && !weekend)  { rentalSubtotal += HIGH_WEEKDAY;   highWeekdayNights++; }
    else if (!high && weekend)  { rentalSubtotal += NORMAL_WEEKEND; normalWeekendNights++; }
    else                        { rentalSubtotal += NORMAL_WEEKDAY; normalWeekdayNights++; }
  }
  // 集計用（添付テキスト等で使用）
  const normalNights = normalWeekdayNights + normalWeekendNights;
  const highNights   = highWeekdayNights   + highWeekendNights;

  // ---- 前日18:00以降受け取りの場合：前日分を半額で加算 ----
  let prevDayAmount = 0;
  if (isPrevDay) {
    const prevDay = new Date(checkin);
    prevDay.setDate(prevDay.getDate() - 1);
    const high    = isPeak(prevDay);
    const weekend = isWeekend(prevDay);
    let dayRate = 0;
    if (high && weekend)        dayRate = HIGH_WEEKEND;
    else if (high && !weekend)  dayRate = HIGH_WEEKDAY;
    else if (!high && weekend)  dayRate = NORMAL_WEEKEND;
    else                        dayRate = NORMAL_WEEKDAY;
    prevDayAmount = Math.round(dayRate / 2);
    rentalSubtotal += prevDayAmount;
  }

  // ---- 長期割引（5泊以上 10%引き） ----
  let discountAmount = 0;
  if (nights >= LONG_DISCOUNT_NIGHTS) {
    discountAmount  = Math.round(rentalSubtotal * LONG_DISCOUNT_RATE);
    rentalSubtotal -= discountAmount;
  }

  // ---- オプション合計 ----
  let { total: optionTotal, lines: optionLines } = getOptionResults();

  // ---- 新千歳空港お届け（受け取り方法で選択）¥16,500 を加算 ----
  const isAirport = pickupVal.indexOf('新千歳空港お届け') >= 0;
  if (isAirport) {
    optionLines = optionLines.concat([
      { name: '新千歳空港お届けサービス', qty: 1, unit: '1回', price: AIRPORT_DELIVERY_FEE, amt: AIRPORT_DELIVERY_FEE }
    ]);
    optionTotal += AIRPORT_DELIVERY_FEE;
  }

  const grandTotal = rentalSubtotal + optionTotal;

  // ---- 結果表示 ----
  document.getElementById('est-nights').textContent = nights + '泊（' + (nights + 1) + '日間分）';

  // 料金内訳行を動的生成（カテゴリ別に平日・土日を分けて表示）
  const rateRows = document.getElementById('est-rate-rows');
  rateRows.innerHTML = '';
  function addRateRow(label, qty, rate) {
    if (qty <= 0) return;
    const row = document.createElement('div');
    row.className = 'est-row est-rate-detail-row';
    row.innerHTML = `<span>　${label}（${formatYen(rate)}/日）× ${qty}日</span><span>${formatYen(rate * qty)}</span>`;
    rateRows.appendChild(row);
  }
  addRateRow('通常期・平日',         normalWeekdayNights, NORMAL_WEEKDAY);
  addRateRow('通常期・土日祝',       normalWeekendNights, NORMAL_WEEKEND);
  addRateRow('ハイシーズン・平日',   highWeekdayNights,   HIGH_WEEKDAY);
  addRateRow('ハイシーズン・土日祝', highWeekendNights,   HIGH_WEEKEND);

  // 前日受け取り行
  const prevdayRow = document.getElementById('est-prevday-row');
  const prevdayAmt = document.getElementById('est-prevday-amt');
  if (isPrevDay && prevdayRow && prevdayAmt) {
    prevdayAmt.textContent = formatYen(prevDayAmount) + '（半額）';
    prevdayRow.style.display = 'flex';
  } else if (prevdayRow) {
    prevdayRow.style.display = 'none';
  }

  document.getElementById('est-subtotal').textContent = formatYen(rentalSubtotal + discountAmount);
  const discountRow = document.getElementById('est-discount-row');
  const discountEl  = document.getElementById('est-discount');
  if (discountAmount > 0 && discountRow && discountEl) {
    discountEl.textContent = '－' + formatYen(discountAmount) + '（5泊以上 10%割引）';
    discountRow.style.display = 'flex';
  } else if (discountRow) {
    discountRow.style.display = 'none';
  }

  // オプション明細行を動的生成
  const optRows = document.getElementById('est-option-rows');
  const optSubRow = document.getElementById('est-opt-subtotal-row');
  optRows.innerHTML = '';

  if (optionLines.length > 0) {
    optionLines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'est-row est-opt-detail-row';
      const qtyLabel = line.qty > 1
        ? `${line.qty}${line.unit.replace(/1/, '')} × ${formatYen(line.price)}`
        : line.unit;
      row.innerHTML = `<span>　${line.name}（${qtyLabel}）</span><span>${formatYen(line.amt)}</span>`;
      optRows.appendChild(row);
    });
    document.getElementById('est-opt-subtotal').textContent = formatYen(optionTotal);
    optSubRow.style.display = 'flex';
  } else {
    optSubRow.style.display = 'none';
  }

  document.getElementById('est-total').textContent = formatYen(grandTotal);
  result.style.display = 'block';

  // 計算結果をグローバル保存
  _lastEstimate = {
    checkinVal, checkoutVal, nights,
    normalNights, highNights,
    normalWeekdayNights, normalWeekendNights,
    highWeekdayNights, highWeekendNights,
    rentalSubtotal, discountAmount, optionTotal, grandTotal, optionLines,
    pickupVal, isPrevDay, prevDayAmount
  };
}

// ===== 「予約フォームに添付する」ボタン =====
function attachEstimateToForm() {
  if (!_lastEstimate) return;
  const {
    checkinVal, checkoutVal, nights,
    normalWeekdayNights, normalWeekendNights,
    highWeekdayNights, highWeekendNights,
    rentalSubtotal, discountAmount, optionTotal, grandTotal, optionLines,
    pickupVal, isPrevDay, prevDayAmount
  } = _lastEstimate;

  // 料金内訳テキスト（カテゴリ別）
  const rateLines = [];
  if (normalWeekdayNights > 0) rateLines.push(`通常期・平日 ${formatYen(NORMAL_WEEKDAY)}×${normalWeekdayNights}日`);
  if (normalWeekendNights > 0) rateLines.push(`通常期・土日祝 ${formatYen(NORMAL_WEEKEND)}×${normalWeekendNights}日`);
  if (highWeekdayNights   > 0) rateLines.push(`ハイシーズン・平日 ${formatYen(HIGH_WEEKDAY)}×${highWeekdayNights}日`);
  if (highWeekendNights   > 0) rateLines.push(`ハイシーズン・土日祝 ${formatYen(HIGH_WEEKEND)}×${highWeekendNights}日`);
  const rentalBreakdown = rateLines.join('、') || `${nights}日`;

  // 受け取り方法の表示ラベル
  const pickupLabel = isPrevDay
    ? '前日 18:00 以降 受け取り（前日分 半額オプション）'
    : pickupVal;

  // 添付テキスト生成
  let attachText =
    `■ 仮見積もり内容\n` +
    `チェックイン  ：${formatDate(checkinVal)}\n` +
    `チェックアウト：${formatDate(checkoutVal)}\n` +
    `ご利用泊数    ：${nights}泊（${nights + 1}日間分 / ${rentalBreakdown}）\n` +
    `受け取り方法  ：${pickupLabel}\n`;

  if (isPrevDay && prevDayAmount > 0) {
    attachText += `前日受け取り分：${formatYen(prevDayAmount)}（半額）\n`;
  }

  if (discountAmount > 0) {
    attachText += `レンタル小計  ：${formatYen(rentalSubtotal + discountAmount)}\n`;
    attachText += `長期割引（10%）：－${formatYen(discountAmount)}\n`;
    attachText += `割引後小計    ：${formatYen(rentalSubtotal)}\n`;
  } else {
    attachText += `レンタル小計  ：${formatYen(rentalSubtotal)}\n`;
  }

  if (optionLines.length > 0) {
    attachText += `\n■ 選択オプション\n`;
    optionLines.forEach(line => {
      const qtyLabel = line.qty > 1
        ? `${line.qty}${line.unit.replace(/1/, '')} × ${formatYen(line.price)}`
        : line.unit;
      attachText += `　${line.name}（${qtyLabel}）：${formatYen(line.amt)}\n`;
    });
    attachText += `オプション小計：${formatYen(optionTotal)}\n`;
  }

  attachText +=
    `\n────────────────────\n` +
    `合計目安      ：${formatYen(grandTotal)}（税込）\n` +
    `※ 祝日・詳細条件により実際の金額と異なる場合があります。`;

  // テキストエリアにセット
  const textarea = document.getElementById('est-attached-text');
  if (textarea) textarea.value = attachText;

  // フォームの日程を自動入力
  const fc = document.getElementById('checkin');
  const fo = document.getElementById('checkout');
  if (fc) fc.value = checkinVal;
  if (fo) fo.value = checkoutVal;

  // 受け取り方法セレクトを同期
  const rt = document.getElementById('rental-type');
  if (rt && pickupVal) { rt.value = pickupVal; updateArrivalTimeLabel(); }

  // 添付エリアの表示切り替え
  document.getElementById('form-est-attach-empty').style.display  = 'none';
  document.getElementById('form-est-attach-filled').style.display = 'block';
  // 添付できたら必須エラー表示を解除
  const _estWrap = document.querySelector('.form-est-attach-wrap');
  if (_estWrap) _estWrap.classList.remove('est-required-error');

  // 添付ボタンを「済み」に変更
  const btn     = document.getElementById('est-attach-btn');
  const doneMsg = document.getElementById('est-attach-done');
  if (btn) {
    btn.innerHTML = '<span class="material-icons-round">check_circle</span> 添付済み';
    btn.classList.add('attached');
    btn.disabled  = true;
  }
  if (doneMsg) doneMsg.style.display = 'flex';

  // フォームへスクロール
  setTimeout(() => {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

// ===== 「取り外す」ボタン =====
function detachEstimate() {
  const textarea = document.getElementById('est-attached-text');
  if (textarea) textarea.value = '';

  document.getElementById('form-est-attach-empty').style.display  = 'flex';
  document.getElementById('form-est-attach-filled').style.display = 'none';

  resetAttachButton();
}

function resetAttachButton() {
  const btn     = document.getElementById('est-attach-btn');
  const doneMsg = document.getElementById('est-attach-done');
  if (btn) {
    btn.innerHTML = '<span class="material-icons-round">attach_file</span> 予約フォームに添付する';
    btn.classList.remove('attached');
    btn.disabled  = false;
  }
  if (doneMsg) doneMsg.style.display = 'none';
}

// ===== 受付確認モーダル =====
function showConfirmationModal(formData, receiptNo, carName) {
  const body = document.getElementById('confirm-body');
  body.innerHTML = '';

  // 受付番号・車両名はサーバー（Apps Script）から受け取る
  receiptNo = receiptNo || ('GRC-' + Date.now());
  const now         = new Date();
  const receiptDate = now.toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // 受付番号ボックス
  const infoBox = document.createElement('div');
  infoBox.className = 'confirm-receipt-info';
  infoBox.innerHTML = `
    <div class="confirm-receipt-row">
      <span>受付番号</span><span class="receipt-val-id">${receiptNo}</span>
    </div>
    <div class="confirm-receipt-row">
      <span>受付日時</span><span class="receipt-val-date">${receiptDate}</span>
    </div>
    ${carName ? `<div class="confirm-receipt-row">
      <span>確定車両</span><span class="receipt-val-date">${carName}</span>
    </div>` : ''}`;
  body.appendChild(infoBox);

  // 住所を結合
  const postal  = formData.get('郵便番号') || '';
  const pref    = formData.get('都道府県') || '';
  const city    = formData.get('市区町村') || '';
  const street  = formData.get('番地')    || '';
  const bldg    = formData.get('建物名・部屋番号') || '';
  const address = [postal ? '〒' + postal : '', pref, city, street, bldg]
    .filter(Boolean).join(' ');

  // 日付を日本語表記に変換
  function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  // HTMLエスケープ
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 受け取り方法が配車サービスなら「来店時間」→「引き渡し時間」表示
  const _pickup    = formData.get('受け取り方法') || '';
  const _isHaisha  = _pickup.indexOf('配車') >= 0 || _pickup.indexOf('お届け') >= 0;

  // 表示フィールド定義
  const fields = [
    { label: 'お名前',               val: formData.get('お名前') },
    { label: '電話番号',             val: formData.get('電話番号') },
    { label: 'メールアドレス',       val: formData.get('メールアドレス') },
    { label: 'ご住所',               val: address },
    { label: 'ご利用開始日',         val: fmtDate(formData.get('ご利用開始日')) },
    { label: 'ご利用終了日',         val: fmtDate(formData.get('ご利用終了日')) },
    { label: _isHaisha ? '引き渡し時間' : '来店時間', val: formData.get('来店時間') },
    { label: '返却時間',             val: formData.get('返却時間') },
    { label: '受け取り方法',         val: formData.get('受け取り方法') },
    { label: 'ご希望の車両',         val: formData.get('ご希望の車両') },
    { label: '運転免許証の種類',     val: formData.get('運転免許証の種類') },
    { label: '同乗者運転の事前申告', val: formData.get('同乗者運転の事前申告') },
    { label: 'お支払い方法',         val: formData.get('お支払い方法') },
    { label: '仮見積もり内容',       val: formData.get('仮見積もり内容'), pre: true },
    { label: 'ご質問・ご要望',       val: formData.get('ご質問・ご要望'),  pre: true },
  ];

  const sep = document.createElement('div');
  sep.className = 'confirm-sep';
  body.appendChild(sep);

  fields.forEach(f => {
    if (!f.val || String(f.val).trim() === '') return;
    const rowEl = document.createElement('div');
    rowEl.className = 'confirm-row';
    if (f.pre) {
      rowEl.innerHTML = `<span class="confirm-label">${esc(f.label)}</span>`
        + `<pre class="confirm-value confirm-pre">${esc(f.val)}</pre>`;
    } else {
      rowEl.innerHTML = `<span class="confirm-label">${esc(f.label)}</span>`
        + `<span class="confirm-value">${esc(f.val)}</span>`;
    }
    body.appendChild(rowEl);
  });

  // 事前銀行振り込みの場合は振込先情報を追加
  const payment = formData.get('お支払い方法') || '';
  if (payment === '事前銀行振り込み') {
    const bankBox = document.createElement('div');
    bankBox.className = 'confirm-bank-info';
    bankBox.innerHTML = `
      <span class="material-icons-round">account_balance</span>
      <div>
        <strong>お振込先</strong><br>
        三井住友銀行　藤井寺支店（店番162）<br>普通口座　4180470<br>
        カ）トーワオート<br>
        <small>※ご予約確定後、3営業日以内にお振り込みください。</small>
      </div>`;
    body.appendChild(bankBox);
  }

  // モーダルを表示
  const modal = document.getElementById('confirmation-modal');
  modal.style.display = 'flex';
  modal.querySelector('.confirm-modal-content').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmation-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ===== 印刷 / PDF保存 =====
function printConfirmation() {
  const modal        = document.getElementById('confirmation-modal');
  const modalContent = modal?.querySelector('.confirm-modal-content');
  if (!modalContent) return;

  // モーダル内容をクローン（.confirm-modal-content 要素ごと）
  const clone = modalContent.cloneNode(true);
  const actions = clone.querySelector('.confirm-modal-actions');
  if (actions) actions.remove();
  const note = clone.querySelector('.confirm-modal-note');
  if (note) note.remove();

  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = '';
  // innerHTML ではなく appendChild で挿入 → .confirm-modal-content が
  // #print-area の子に入り @media print の CSS が正しく適用される
  printArea.appendChild(clone);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    alert('スクリーンショットを端末に保存してください。\n予約変更はメールにてご確認ください。');
    printArea.innerHTML = '';
    return;
  }

  // 元モーダルを一時非表示（position:fixed 要素が印刷に混入するブラウザ対策）
  const prevModalDisplay = modal.style.display;
  modal.style.display = 'none';

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = '';

  // PDFファイル名設定
  const prevTitle = document.title;
  const today = new Date();
  const yy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.title = `キャンピングカーレンタル契約書（${yy}年${mm}月${dd}日）`;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    printArea.innerHTML = '';
    document.body.style.overflow = prevOverflow;
    document.title = prevTitle;
    // モーダルを復元（印刷後も確認画面が見られるように）
    modal.style.display = prevModalDisplay;
  };

  window.addEventListener('afterprint', function onAfterPrint() {
    cleanup();
    window.removeEventListener('afterprint', onAfterPrint);
  });
  setTimeout(cleanup, 8000);

  // DOMレンダリングを待ってから印刷ダイアログを開く
  setTimeout(() => window.print(), 150);
}

// ===== 重要事項モーダル =====
(function() {
  function openTermsModal() {
    const modal = document.getElementById('terms-modal');
    if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  }
  function closeTermsModal() {
    const modal = document.getElementById('terms-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
  }
  function agreeTerms() {
    closeTermsModal();
    const cb = document.getElementById('consent-terms');
    const wrap = document.getElementById('consent-terms-wrap');
    const notReadMsg = document.getElementById('terms-not-read-msg');
    if (cb) { cb.disabled = false; cb.checked = true; }
    if (wrap) wrap.classList.remove('group-error');
    if (notReadMsg) notReadMsg.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function() {
    const openBtn   = document.getElementById('terms-open-btn');
    const closeBtn  = document.getElementById('terms-close-btn');
    const backBtn   = document.getElementById('terms-back-btn');
    const agreeBtn  = document.getElementById('terms-agree-btn');
    const overlay   = document.getElementById('terms-modal-overlay');
    const cb        = document.getElementById('consent-terms');

    if (openBtn)  openBtn.addEventListener('click',  openTermsModal);
    if (closeBtn) closeBtn.addEventListener('click', closeTermsModal);
    if (backBtn)  backBtn.addEventListener('click',  closeTermsModal);
    if (agreeBtn) agreeBtn.addEventListener('click', agreeTerms);
    if (overlay)  overlay.addEventListener('click',  closeTermsModal);

    // disabled状態でチェックしようとした場合にメッセージ表示
    if (cb) {
      cb.addEventListener('click', function(e) {
        if (cb.disabled) {
          e.preventDefault();
          const msg = document.getElementById('terms-not-read-msg');
          if (msg) msg.style.display = 'block';
        }
      });
    }

    // ESCキーで閉じる
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeTermsModal();
    });
  });
})();

// ===== キャンセルモーダル =====
let _cancelReceiptNo = '';
let _cancelEmail = '';

function setCancelStep(n) {
  [1,2,3].forEach(i => {
    const dot = document.getElementById('cancel-dot' + i);
    if (!dot) return;
    dot.classList.remove('active','done');
    if (i < n) dot.classList.add('done');
    else if (i === n) dot.classList.add('active');
  });
}

function openCancelModal() {
  const modal = document.getElementById('cancel-modal');
  if (!modal) return;
  // リセット
  document.getElementById('cancel-step1').style.display = '';
  document.getElementById('cancel-step2').style.display = 'none';
  document.getElementById('cancel-step3').style.display = 'none';
  document.getElementById('cancel-receipt').value = '';
  document.getElementById('cancel-email').value = '';
  document.getElementById('cancel-step1-err').style.display = 'none';
  setCancelStep(1);
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCancelModal() {
  const modal = document.getElementById('cancel-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function cancelBackToStep1() {
  document.getElementById('cancel-step2').style.display = 'none';
  document.getElementById('cancel-step1').style.display = '';
}

async function lookupCancel() {
  const receiptNo = document.getElementById('cancel-receipt').value.trim();
  const email = document.getElementById('cancel-email').value.trim();
  const errEl = document.getElementById('cancel-step1-err');
  const btn = document.getElementById('cancel-lookup-btn');

  if (!receiptNo || !email) {
    errEl.textContent = '受付番号とメールアドレスを入力してください。';
    errEl.style.display = '';
    return;
  }
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span>検索中...';

  try {
    const url = APPS_SCRIPT_URL + '?action=cancel_info&receiptNo=' + encodeURIComponent(receiptNo) + '&email=' + encodeURIComponent(email);
    const res = await fetch(url, { redirect: 'follow' });
    const data = await res.json();

    if (!data.ok) {
      errEl.textContent = data.message || '予約が見つかりません。';
      errEl.style.display = '';
      return;
    }

    _cancelReceiptNo = receiptNo;
    _cancelEmail = email;

    // Step2に表示
    const fmtCancelDate = s => {
      if (!s) return '—';
      const dateStr = String(s).split('T')[0];
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
      return s;
    };
    const infoEl = document.getElementById('cancel-booking-info');
    infoEl.innerHTML = `
      <div class="cancel-info-row"><span>受付番号</span><strong>${receiptNo}</strong></div>
      <div class="cancel-info-row"><span>お名前</span><strong>${data.name} 様</strong></div>
      <div class="cancel-info-row"><span>チェックイン</span><strong>${fmtCancelDate(data.checkin)}</strong></div>
      <div class="cancel-info-row"><span>チェックアウト</span><strong>${fmtCancelDate(data.checkout)}</strong></div>
      <div class="cancel-info-row"><span>車両</span><strong>${data.car || 'TREASURE1（TYPE M）'}</strong></div>
    `;

    const feeEl = document.getElementById('cancel-fee-box');
    if (data.cancelFee > 0) {
      feeEl.className = 'cancel-fee-box cancel-fee-warn';
      feeEl.innerHTML = `<span class="material-icons-round">warning</span><div><strong>${data.feeLabel}</strong><br>キャンセル料：¥${data.cancelFee.toLocaleString()}</div>`;
    } else {
      feeEl.className = 'cancel-fee-box cancel-fee-free';
      feeEl.innerHTML = `<span class="material-icons-round">check_circle</span><div><strong>キャンセル無料</strong><br>キャンセル料は発生しません。</div>`;
    }

    document.getElementById('cancel-step1').style.display = 'none';
    document.getElementById('cancel-step2').style.display = '';
    setCancelStep(2);

  } catch (err) {
    errEl.textContent = '通信エラーが発生しました。時間をおいて再度お試しください。';
    errEl.style.display = '';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">search</span>予約を検索';
  }
}

// ===== 日付min設定（開始日を選んだら終了日の最小値を同じ日に） =====
(function () {
  function syncDateMin(checkinId, checkoutId) {
    const ci = document.getElementById(checkinId);
    const co = document.getElementById(checkoutId);
    if (!ci || !co) return;
    ci.addEventListener('change', function () {
      co.min = this.value;
      if (co.value && co.value < this.value) co.value = this.value;
    });
  }
  syncDateMin('est-checkin', 'est-checkout');
  syncDateMin('checkin', 'checkout');
})();

async function confirmCancel() {
  const errEl = document.getElementById('cancel-step2-err');
  const btn = document.getElementById('cancel-confirm-btn');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span>処理中...';

  try {
    const body = new URLSearchParams({ action: 'cancel', receiptNo: _cancelReceiptNo, email: _cancelEmail });
    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: body.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'follow' });
    const data = await res.json();

    if (!data.ok) {
      errEl.textContent = data.message || 'キャンセル処理に失敗しました。';
      errEl.style.display = '';
      return;
    }

    const msg = document.getElementById('cancel-complete-msg');
    msg.textContent = data.cancelFee > 0
      ? `キャンセル料 ¥${data.cancelFee.toLocaleString()} が発生します。担当者よりご連絡いたします。`
      : 'キャンセル料は発生しません。';

    document.getElementById('cancel-step2').style.display = 'none';
    document.getElementById('cancel-step3').style.display = '';
    setCancelStep(3);

  } catch (err) {
    errEl.textContent = '通信エラーが発生しました。お電話（050-1720-6116）にてご連絡ください。';
    errEl.style.display = '';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">delete_forever</span>キャンセルを確定する';
  }
}

// ===== 空き状況チェッカー（日程→即判定・複数車両対応）=====
function _acFmtRange(a, b) {
  function f(s) { const d = s.split('-'); return d[1] + '/' + d[2]; }
  return f(a) + '〜' + f(b);
}
function _acCarLabel(v) { return (v || '').replace('HAPPY1 ', '').trim() || v; }
async function _acQuery(ci, co, car) {
  const url = APPS_SCRIPT_URL + '?action=check'
    + '&checkin=' + encodeURIComponent(ci)
    + '&checkout=' + encodeURIComponent(co)
    + '&car=' + encodeURIComponent(car);
  const res = await fetch(url, { redirect: 'follow' });
  return JSON.parse(await res.text());
}
function acGoEstimate(ci, co, car) {
  const e1 = document.getElementById('est-checkin');
  const e2 = document.getElementById('est-checkout');
  if (e1) { e1.value = ci; e1.dispatchEvent(new Event('change', { bubbles: true })); }
  if (e2) { e2.value = co; e2.dispatchEvent(new Event('change', { bubbles: true })); }
  if (car && car !== 'どちらでも可') {
    const radio = document.querySelector('input[name="ご希望の車両"][value="' + car + '"]');
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    const sel = document.querySelector('select[name="ご希望の車両"]');
    if (sel) { sel.value = car; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  const s = document.getElementById('estimate');
  if (s) s.scrollIntoView({ behavior: 'smooth' });
}
function _acShowOk(box, range, carLabelText, ci, co, car) {
  box.className = 'ac-result show ac-ok';
  box.innerHTML = '<div class="ac-big">🎉 空いています！</div>'
    + '<p>' + range + ' ' + carLabelText + ' は<strong>ご予約可能</strong>です</p>'
    + '<button type="button" class="ac-cta" onclick="acGoEstimate(\'' + ci + '\',\'' + co + '\',\'' + (car || '') + '\')"><span class="material-icons-round">calculate</span>この日程で見積り→予約する</button>';
}
function _acShowNg(box, range, message) {
  box.className = 'ac-result show ac-ng';
  box.innerHTML = '<div class="ac-big">満車です</div>'
    + '<p>' + range + ' は<strong>予約済み</strong>です</p>'
    + '<p class="ac-sub">' + (message || '別の日程でお試しください') + '</p>'
    + '<button type="button" class="ac-cta ac-cta-blue" onclick="openAvailModal()"><span class="material-icons-round">mail</span>空き状況を問い合わせる</button>';
}
async function runAvailCheck() {
  const ciEl = document.getElementById('ac-checkin');
  const coEl = document.getElementById('ac-checkout');
  const carEl = document.getElementById('ac-car');
  const box = document.getElementById('ac-result');
  if (!ciEl || !coEl || !box) return;
  if (!ciEl.value || !coEl.value) {
    box.className = 'ac-result show ac-warn';
    box.innerHTML = '出発日と返却日を選んでください';
    return;
  }
  if (coEl.value <= ciEl.value) {
    box.className = 'ac-result show ac-warn';
    box.innerHTML = '返却日は出発日より後の日付を選んでください';
    return;
  }
  box.className = 'ac-result show ac-loading';
  box.innerHTML = '<span class="material-icons-round spin">hourglass_empty</span> 空き状況を確認しています…';
  const ci = ciEl.value, co = coEl.value, range = _acFmtRange(ci, co);
  try {
    const cars = carEl ? Array.from(carEl.options).map(o => o.value).filter(v => v && v !== 'どちらでも可') : [];
    const selected = carEl ? carEl.value : 'どちらでも可';

    // 特定車を選択 or 車両が1台のサイト → 単一チェック
    if (selected !== 'どちらでも可' || cars.length < 2) {
      const car = (selected === 'どちらでも可' && cars.length === 1) ? cars[0] : selected;
      const data = await _acQuery(ci, co, car);
      const carLabelText = (car && car !== 'どちらでも可') ? '（' + _acCarLabel(car) + '）' : '';
      if (data.available) _acShowOk(box, range, carLabelText, ci, co, car === 'どちらでも可' ? '' : car);
      else _acShowNg(box, range, data.message);
      return;
    }

    // 「どちらでも可」→ 各車を個別チェックし、空車があればその車を案内
    const results = await Promise.all(cars.map(async c => ({ car: c, ok: (await _acQuery(ci, co, c)).available })));
    const free = results.filter(r => r.ok).map(r => r.car);
    if (free.length === 0) {
      _acShowNg(box, range, '選択された期間はすべての車両がご予約済みです。別の日程をご検討ください。');
    } else if (free.length === cars.length) {
      _acShowOk(box, range, '（' + cars.map(_acCarLabel).join('・') + ' どちらも空車）', ci, co, '');
    } else {
      const rec = free[0], recL = _acCarLabel(rec);
      const bookedL = results.filter(r => !r.ok).map(r => _acCarLabel(r.car)).join('・');
      box.className = 'ac-result show ac-ok';
      box.innerHTML = '<div class="ac-big">✅ ' + recL + ' が空いています！</div>'
        + '<p>' + range + ' は <strong>' + recL + '</strong> でご予約いただけます<br><span class="ac-sub">（' + bookedL + ' は予約済みです）</span></p>'
        + '<button type="button" class="ac-cta" onclick="acGoEstimate(\'' + ci + '\',\'' + co + '\',\'' + rec + '\')"><span class="material-icons-round">calculate</span>' + recL + 'で見積り→予約する</button>';
    }
  } catch (e) {
    box.className = 'ac-result show ac-warn';
    box.innerHTML = '確認できませんでした。お手数ですが<a href="tel:050-1720-6116">お電話</a>、または「空き状況を問い合わせる」からご連絡ください';
  }
}

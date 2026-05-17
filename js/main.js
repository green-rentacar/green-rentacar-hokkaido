// ===== 車両フォトギャラリー =====
const VEHICLE_IMGS = [
  'images/t1-main.jpg',    // 0: 全体（デフォルト）
  'images/t1-side.jpg',    // 1: 横
  'images/t1-front.jpg',   // 2: 前
  'images/t1-rear.jpg',    // 3: 後
];

function switchVehicleImg(idx) {
  const main = document.getElementById('vehicleMain');
  if (main) main.style.backgroundImage = `url('${VEHICLE_IMGS[idx]}')`;
  document.querySelectorAll('.vehicle-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });
}

// ===== 2027年以降 注意書きバナー（案A・案B）=====
function checkFutureYear(inputIds, noticeId) {
  const notice = document.getElementById(noticeId);
  if (!notice) return;
  const isFuture = inputIds.some(id => {
    const el = document.getElementById(id);
    if (!el || !el.value) return false;
    return parseInt(el.value.split('-')[0], 10) >= 2027;
  });
  notice.classList.toggle('visible', isFuture);
}

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
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  header.style.boxShadow = window.scrollY > 10
    ? '0 2px 20px rgba(0,0,0,0.12)'
    : '0 1px 0 rgba(0,0,0,0.06)';
});

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
const APPS_SCRIPT_URL = 'https://green-rentacar-proxy.shy-snow-b32c.workers.dev';

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

    // ② 運転免許証の種類（ラジオボタン）チェック
    const licenseGroup = document.getElementById('license-group');
    const licenseChecked = form.querySelector('input[name="運転免許証の種類"]:checked');
    if (!licenseChecked) {
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

    if (hasError) {
      const firstError =
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
      const ciYear = ciDate.getFullYear();

      // お盆（8/10〜8/16）: 7日間レンタルのみ ※nights=7 → checkin 8/10, checkout 8/17
      const bonStart = new Date(ciYear + '-08-10');
      const bonEnd   = new Date(ciYear + '-08-16');
      if (ciDate <= bonEnd && coDate > bonStart && rentalDays !== 7) {
        form.querySelectorAll('.booking-avail-error').forEach(el => el.remove());
        const errDiv = document.createElement('div');
        errDiv.className = 'booking-avail-error';
        errDiv.innerHTML = '<span class="material-icons-round">event_busy</span><strong>お盆期間（8/10〜8/16）のご予約は7日間レンタルのみ</strong>承っております。チェックイン 8/10・チェックアウト 8/17 でお申し込みください。';
        submitBtn.parentNode.insertBefore(errDiv, submitBtn);
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // 冬休み（12/29〜1/4）: 7日間レンタルのみ ※nights=7 → checkin 12/29, checkout 1/5
      const nyStart  = new Date(ciYear + '-12-29');
      const nyEnd    = new Date((ciYear + 1) + '-01-04');
      const nyStart2 = new Date((ciYear - 1) + '-12-29');
      const nyEnd2   = new Date(ciYear + '-01-04');
      if (((ciDate <= nyEnd && coDate > nyStart) || (ciDate <= nyEnd2 && coDate > nyStart2)) && rentalDays !== 7) {
        form.querySelectorAll('.booking-avail-error').forEach(el => el.remove());
        const errDiv = document.createElement('div');
        errDiv.className = 'booking-avail-error';
        errDiv.innerHTML = '<span class="material-icons-round">event_busy</span><strong>冬休み期間（12/29〜1/4）のご予約は7日間レンタルのみ</strong>承っております。チェックイン 12/29・チェックアウト 1/5 でお申し込みください。';
        submitBtn.parentNode.insertBefore(errDiv, submitBtn);
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
        form.querySelectorAll('.booking-avail-error').forEach(el => el.remove());
        const errDiv = document.createElement('div');
        errDiv.className = 'booking-avail-error';
        errDiv.innerHTML = '<span class="material-icons-round">event_busy</span>' + (availData.message || '空き確認に失敗しました');
        submitBtn.parentNode.insertBefore(errDiv, submitBtn);
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
      postBody.append('仮見積もり内容',      bookingData.estimate);
      postBody.append('ご質問・ご要望',      bookingData.message);
      postBody.append('合計金額',            _lastEstimate ? String(_lastEstimate.grandTotal) : '0');

      const bookRes  = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: postBody, redirect: 'follow' });
      const bookText = await bookRes.text();
      const bookData = JSON.parse(bookText);

      if (!bookData.success) throw new Error(bookData.message || bookData.error || '送信エラー');

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

  // ラジオボタンを変更したらエラー解除
  form.querySelectorAll('input[name="運転免許証の種類"]').forEach(radio => {
    radio.addEventListener('change', function () {
      document.getElementById('license-group').classList.remove('group-error');
    });
  });
})();

// ===== 仮見積もり基本料金 =====
const NORMAL_WEEKDAY = 27500;
const NORMAL_WEEKEND = 33000;
const HIGH_WEEKDAY   = 33000;
const HIGH_WEEKEND   = 37000;

// ===== オプション定義 =====
const OPTIONS = [
  // グループ1: ファミリー・ペット
  { id: 'opt-pet',         type: 'check', name: 'ペット同乗料金',                price: 5000, unit: '1回' },
  // グループ2: 手ぶらでキャンプ
  { id: 'opt-sleepingbag', type: 'qty',   name: '寝袋（シュラフ）セット',         price: 1500, unit: '1人分' },
  { id: 'opt-campset',     type: 'qty',   name: 'キャンプチェア＆テーブルセット', price: 3000, unit: '1セット' },
  // グループ3: サービス
];

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
function isPeak(date) {
  const m = date.getMonth();
  const d = date.getDate();
  // GW: 4/29〜5/6
  if (m === 3 && d >= 29)  return true;
  if (m === 4 && d <= 6)   return true;
  // 夏休み・お盆: 7/18〜8/16
  if (m === 6 && d >= 18)  return true;
  if (m === 7 && d <= 16)  return true;
  // 年末年始: 12/25〜1/6
  if (m === 11 && d >= 25) return true;
  if (m === 0 && d <= 6)   return true;
  return false;
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

  // 特定期間 7日間制限チェック（お盆・冬休み）
  const estYear = checkin.getFullYear();
  const estBonStart = new Date(estYear + '-08-10');
  const estBonEnd   = new Date(estYear + '-08-16');
  if (checkin <= estBonEnd && checkout > estBonStart && nights !== 7) {
    errorMsg.textContent = 'お盆期間（8/10〜8/16）のご利用は7日間レンタルのみ承っております。チェックイン 8/10・チェックアウト 8/17 でご入力ください。';
    return;
  }
  const estNyStart  = new Date(estYear + '-12-29');
  const estNyEnd    = new Date((estYear + 1) + '-01-04');
  const estNyStart2 = new Date((estYear - 1) + '-12-29');
  const estNyEnd2   = new Date(estYear + '-01-04');
  if (((checkin <= estNyEnd && checkout > estNyStart) || (checkin <= estNyEnd2 && checkout > estNyStart2)) && nights !== 7) {
    errorMsg.textContent = '冬休み期間（12/29〜1/4）のご利用は7日間レンタルのみ承っております。チェックイン 12/29・チェックアウト 1/5 でご入力ください。';
    return;
  }

  // ---- 基本料金計算（ご利用開始日〜ご利用終了日の各日・両日含む） ----
  let rentalSubtotal      = 0;
  let normalWeekdayNights = 0;
  let normalWeekendNights = 0;
  let highWeekdayNights   = 0;
  let highWeekendNights   = 0;

  for (let i = 0; i < nights; i++) {
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

  // ---- オプション合計 ----
  const { total: optionTotal, lines: optionLines } = getOptionResults();

  const grandTotal = rentalSubtotal + optionTotal;

  // ---- 結果表示 ----
  document.getElementById('est-nights').textContent = nights + '日';

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

  document.getElementById('est-subtotal').textContent = formatYen(rentalSubtotal);
  document.getElementById('est-discount-row').style.display = 'none';

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
    rentalSubtotal, optionTotal, grandTotal, optionLines,
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
    rentalSubtotal, optionTotal, grandTotal, optionLines,
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
    : '当日 9:00 以降 受け取り（通常）';

  // 添付テキスト生成
  let attachText =
    `■ 仮見積もり内容\n` +
    `チェックイン  ：${formatDate(checkinVal)}\n` +
    `チェックアウト：${formatDate(checkoutVal)}\n` +
    `ご利用泊数    ：${nights}泊（${rentalBreakdown}）\n` +
    `受け取り方法  ：${pickupLabel}\n`;

  if (isPrevDay && prevDayAmount > 0) {
    attachText += `前日受け取り分：${formatYen(prevDayAmount)}（半額）\n`;
  }

  attachText += `レンタル小計  ：${formatYen(rentalSubtotal)}\n`;

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
  if (rt && pickupVal) rt.value = pickupVal;

  // 添付エリアの表示切り替え
  document.getElementById('form-est-attach-empty').style.display  = 'none';
  document.getElementById('form-est-attach-filled').style.display = 'block';

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

  // 表示フィールド定義
  const fields = [
    { label: 'お名前',               val: formData.get('お名前') },
    { label: '電話番号',             val: formData.get('電話番号') },
    { label: 'メールアドレス',       val: formData.get('メールアドレス') },
    { label: 'ご住所',               val: address },
    { label: 'ご利用開始日',         val: fmtDate(formData.get('ご利用開始日')) },
    { label: 'ご利用終了日',         val: fmtDate(formData.get('ご利用終了日')) },
    { label: '来店時間',             val: formData.get('来店時間') },
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
        三井住友銀行　普通口座　4180470<br>
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

// ===== 印刷 / PDF保存（同一ページ内印刷 — PC・スマホ全端末対応） =====
function printConfirmation() {
  const modalContent = document.querySelector('#confirmation-modal .confirm-modal-content');
  if (!modalContent) return;

  const clone = modalContent.cloneNode(true);
  const actions = clone.querySelector('.confirm-modal-actions');
  if (actions) actions.remove();

  // 同一ページ内の #print-area にクローンを挿入して window.print() を呼ぶ。
  // window.open + document.write はiOS Safariで白画面になるため使用しない。
  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = clone.innerHTML;

  // iOS Safari ではモーダルで body overflow:hidden のままだと
  // 印刷ダイアログが表示されないため、一時的に解除する
  // モバイル（iPhone/Android）は window.print() が不安定なため案内を表示
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    alert('📸 スクリーンショットを端末に保存してください。\n予約変更はメールにてご確認ください。');
    return;
  }

  // PC用：window.print()
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = '';

  const cleanup = () => {
    printArea.innerHTML = '';
    document.body.style.overflow = prevOverflow;
  };
  window.addEventListener('afterprint', function onAfterPrint() {
    cleanup();
    window.removeEventListener('afterprint', onAfterPrint);
  });
  setTimeout(cleanup, 5000);

  window.print();
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

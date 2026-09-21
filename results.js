// 설문 결과 화면 그리기. 지금 설문의 결과 화면(admin.html)과
// 엄마가 만든 설문들의 결과 화면(manage.html)이 같이 쓴다.
//
// 이 파일은 인터넷으로 뭘 가져오지 않는다. 화면을 그리고, 지우기는 부르는 쪽에 맡긴다.
//   var view = SurveyResults({ mount: 그릴곳, survey: 설문도구, ask: 확인창, onRefresh: 새로불러오기, onDelete: 응답지우기, fileName: '설문결과' });
//   view.setData(응답목록, 깨진줄수, 불러온시각);   // 그린다
//   view.setFlash('지웠습니다.', true);            // 다음 그릴 때 안내 한 줄
//   view.showStale('방금 새로 못 불러왔습니다');    // 이미 그려둔 화면 위에 알림
// 되돌릴 수 없는 일(지우기) 앞에 뜨는 확인 창. 화면에 <dialog id="confirm"> 이 있어야 한다.
// 두 번째 창의 누르는 버튼은 delayMs 뒤에 눌린다 (연달아 톡톡 눌러 지워지는 것을 막는다).
window.SurveyConfirm = (function () {
  var askRun = 0;
  return function (title, body, okText, delayMs) {
    return new Promise(function (resolve) {
      var dlg = document.getElementById('confirm');
      if (!dlg || typeof dlg.showModal !== 'function') {
        resolve(window.confirm(title + '\n\n' + body));
        return;
      }
      var run = ++askRun;
      var okBtn = document.getElementById('confirm-ok');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-body').textContent = body;
      okBtn.textContent = okText;
      okBtn.disabled = !!delayMs;
      dlg.returnValue = '';
      dlg.addEventListener('close', function onClose() {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok');
      });
      dlg.showModal();
      document.getElementById('confirm-cancel').focus();
      if (delayMs) setTimeout(function () { if (run === askRun) okBtn.disabled = false; }, delayMs);
    });
  };
})();

window.SurveyResults = function (opts) {
  'use strict';

  var S = opts.survey;
  var mount = opts.mount;
  var openState = Object.create(null);   // 펼쳐 둔 목록은 다시 그려도 펼친 채로
  var data = null;
  var loadedAt = null;
  var flash = null;
  var errorEl = null;
  var busy = false;

  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k === 'hidden') node.hidden = true;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }

  // ---------- 세기
  function tally(q, responses) {
    var counts = Object.create(null);
    if (q.options) q.options.forEach(function (o) { counts[o] = 0; });
    var gone = Object.create(null);
    var answered = 0;
    var etcTexts = [];
    var detailTexts = [];
    var texts = [];

    responses.forEach(function (r) {
      var a = r && r.answers ? r.answers[q.id] : null;
      if (!a) return;
      var at = S.str(r.at);
      if (q.type === 'text') {
        var t = S.str(a.text);
        if (t) texts.push({ at: at, text: t });
        return;
      }
      var sel = S.sels(a);
      if (!sel.length) return;
      answered++;
      sel.forEach(function (s) {
        if (s in counts) counts[s]++;
        else gone[s] = (gone[s] || 0) + 1;
      });
      if (q.etc && sel.indexOf(q.etc) >= 0 && S.str(a.etc)) etcTexts.push({ at: at, text: S.str(a.etc) });
      if (S.showsDetail(q, a) && S.str(a.text)) detailTexts.push({ at: at, text: S.str(a.text) });
    });

    return { counts: counts, gone: gone, answered: answered, etcTexts: etcTexts, detailTexts: detailTexts, texts: texts };
  }

  // ---------- 그리기
  function textList(key, summaryText, items, open) {
    var list = items.slice().reverse();
    if (key in openState) open = openState[key];
    return el('details', { 'data-key': key, open: open ? '' : null }, [
      el('summary', { text: summaryText + ' ' + items.length + '건' }),
      list.length
        ? el('ul', { class: 'texts' }, list.map(function (it) {
            return el('li', null, [it.text, it.at ? el('span', { class: 'at', text: it.at }) : null]);
          }))
        : el('p', { class: 'empty', text: '아직 없습니다.' })
    ]);
  }

  function rowsFor(q, t) {
    var names = q.options.slice();
    Object.keys(t.gone).forEach(function (g) { names.push(g); });
    var max = 0;
    names.forEach(function (n) { max = Math.max(max, n in t.counts ? t.counts[n] : t.gone[n]); });

    return el('ul', { class: 'rows' }, names.map(function (n) {
      var isGone = !(n in t.counts);
      var c = isGone ? t.gone[n] : t.counts[n];
      var pct = t.answered ? Math.round(c / t.answered * 100) : 0;
      return el('li', { class: 'row' }, [
        el('span', { class: 'name' + (c > 0 && c === max ? ' top' : '') }, [
          n, isGone ? el('span', { class: 'gone', text: ' (지금 설문에 없는 선택지)' }) : null
        ]),
        el('span', { class: 'track', 'aria-hidden': 'true' }, [
          el('span', { class: 'fill', style: 'display:block;width:' + (t.answered ? c / t.answered * 100 : 0) + '%' })
        ]),
        el('span', { class: 'num', text: c + '명 (' + pct + '%)' })
      ]);
    }));
  }

  function card(q, responses) {
    var t = tally(q, responses);
    var nodes = [
      el('h2', { text: q.label + ' · ' + q.short }),
      q.title !== q.short ? el('p', { class: 'qtext', text: q.title }) : null
    ];

    if (q.type === 'text') {
      nodes.push(textList(q.id, '적어 주신 내용', t.texts, true));
      return el('section', { class: 'card' }, nodes);
    }

    var meta = '이 문항에 답한 사람 ' + t.answered + '명';
    if (q.type === 'many') meta += ' · ' + q.max + '개까지 고르는 문항이라 비율을 더하면 100%가 넘을 수 있습니다';
    nodes.push(el('p', { class: 'meta', text: meta }));
    nodes.push(rowsFor(q, t));
    if (q.etc) nodes.push(textList(q.id + '-etc', '"' + q.etc + '"에 적어 주신 내용', t.etcTexts, false));
    if (q.detail) nodes.push(textList(q.id + '-detail', '"' + q.detail.label + '"에 적어 주신 내용', t.detailTexts, false));
    return el('section', { class: 'card' }, nodes);
  }

  // ---------- 응답 하나씩 보기 · 지우기
  function hasId(r) {
    return !!(r && typeof r.id === 'string' && r.id);
  }

  function summaryOf(r) {
    return S.columns(r && r.answers).slice(0, 3).map(function (c) { return c[1] || '-'; }).join(' · ');
  }

  function eachSection(responses) {
    var list = responses.slice().reverse();
    var needsDeploy = opts.onDelete && list.some(function (r) { return !hasId(r); });
    return el('details', { class: 'each', 'data-key': 'each', open: openState.each ? '' : null }, [
      el('summary', { text: '응답 하나씩 보기' + (opts.onDelete ? ' · 지우기' : '') + ' (' + list.length + '개)' }),
      needsDeploy ? el('p', { class: 'notice', text: '구글 스크립트를 새 버전으로 배포해야 지우기 버튼이 나옵니다.' }) : null,
      el('ul', { class: 'resp-list' }, list.map(function (r) {
        var at = S.str(r && r.at) || '시각 없음';
        var ansKey = 'ans-' + (hasId(r) ? r.id : at);
        var answers = S.columns(r && r.answers).filter(function (c) { return c[1]; });
        var btn = null;
        if (opts.onDelete && hasId(r)) {
          btn = el('button', { type: 'button', class: 'btn danger-line', text: '이 응답 지우기' });
          btn.addEventListener('click', function () { removeResponse(r, btn); });
        }
        return el('li', { class: 'resp' }, [
          el('p', { class: 'resp-at', text: at }),
          el('p', { class: 'resp-sum', text: summaryOf(r) }),
          el('details', { 'data-key': ansKey, open: openState[ansKey] ? '' : null }, [
            el('summary', { text: '전체 답 보기' }),
            el('dl', null, answers.reduce(function (acc, c) {
              acc.push(el('dt', { text: c[0] }), el('dd', { text: c[1] }));
              return acc;
            }, []))
          ]),
          btn
        ]);
      }))
    ]);
  }

  function removeResponse(r, btn) {
    if (busy) return;
    busy = true;
    var at = S.str(r.at) || '시각 없음';
    opts.ask('이 응답을 지울까요?', '제출 시각: ' + at + '\n' + summaryOf(r), '지우기', 0)
      .then(function (yes) {
        if (!yes) return false;
        return opts.ask('정말 지우시겠어요?', '지운 응답은 결과에서 사라지고, 이 화면에서는 되살릴 수 없습니다.\n\n제출 시각: ' + at, '완전히 지우기', 1000);
      })
      .then(function (yes) {
        if (!yes) { busy = false; return null; }
        btn.disabled = true;
        btn.textContent = '지우는 중…';
        return opts.onDelete(r).then(function (d) {
          if (d && d.ok === true) flash = { ok: true, text: '응답 1개를 지웠습니다. (제출 시각 ' + at + ')' };
          else if (d && d.error === 'notfound') flash = { ok: true, text: '이미 지워진 응답입니다. 목록을 새로 불러왔습니다.' };
          else if (d && d.error === 'key') flash = { ok: false, text: '비밀번호가 맞지 않아 지우지 못했습니다.' };
          else throw new Error('bad');
          busy = false;
          if (opts.onRefresh) opts.onRefresh(); else draw();
        });
      })
      .catch(function () {
        busy = false;
        btn.disabled = false;
        btn.textContent = '이 응답 지우기';
        flash = { ok: false, text: '지우지 못했습니다. 인터넷 연결을 확인하시고 다시 해 주세요.' };
        if (data) draw();
      });
  }

  // ---------- 엑셀로 받기. 한글이 안 깨지게 맨 앞에 BOM 을 붙인다
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // 카카오톡·네이버·밴드 같은 앱 안에서 링크를 열면, 그 앱 속 작은 브라우저가
  // 이렇게 만든 파일 받기를 막는다 (눌러도 아무 일도 안 일어난다).
  // 카카오톡은 바깥 인터넷 앱으로 다시 여는 주소가 있어서 그리로 넘기고,
  // 다른 앱은 여는 법을 안내한다. 눌렀을 때 읽는다 (검사에서 바꿔 끼울 수 있게).
  function inKakao() { return /KAKAOTALK/i.test(navigator.userAgent || ''); }
  function inOtherApp() {
    return /NAVER\(inapp|DaumApps|BAND\/|Line\/|Instagram|FBAN|FBAV|everytimeApp|; wv\)/i.test(navigator.userAgent || '');
  }

  function downloadCsv() {
    if (!data) return;
    if (inKakao()) {
      flash = { ok: false, text: '카카오톡 안에서는 파일을 받을 수 없어서, 이 화면을 인터넷 앱(크롬·삼성 인터넷·사파리)으로 다시 엽니다. 열린 화면에서 "엑셀 파일(CSV)로 받기"를 한 번 더 눌러 주세요.' };
      draw();
      location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
      return;
    }
    var rows = [['제출 시각'].concat(S.columns({}).map(function (c) { return c[0]; }))];
    data.responses.forEach(function (r) {
      rows.push([S.str(r && r.at)].concat(S.columns(r && r.answers).map(function (c) { return c[1]; })));
    });
    var csv = '﻿' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    var now = new Date();
    var name = (opts.fileName || '설문결과') + '_' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '.csv';
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    // 아이폰은 "받을까요?" 를 묻는 동안에도 파일 주소가 살아 있어야 한다. 1초면 그 사이에 사라진다
    setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 60000);
    flash = inOtherApp()
      ? { ok: false, text: '지금 다른 앱 안에서 이 화면을 여셔서 파일이 안 받아질 수 있습니다. 안 받아지면 화면 위나 아래의 메뉴(⋮ 또는 …)에서 "다른 브라우저로 열기"를 누른 뒤 다시 눌러 주세요.' }
      : { ok: true, text: '"' + name + '" 파일을 받았습니다. 어디 있는지 모르겠으면 휴대폰은 "내 파일 → 다운로드", 아이폰은 "파일 → 다운로드", 컴퓨터는 "다운로드" 폴더를 봐 주세요.' };
    draw();
  }

  function draw() {
    if (!data) return;
    var responses = data.responses;
    var lastAt = responses.reduce(function (m, r) { var a = S.str(r && r.at); return a > m ? a : m; }, '');

    Array.prototype.forEach.call(mount.querySelectorAll('details[data-key]'), function (d) {
      openState[d.getAttribute('data-key')] = d.open;
    });
    errorEl = el('p', { class: 'notice', hidden: true });
    mount.textContent = '';
    if (opts.header) mount.appendChild(opts.header());
    mount.appendChild(el('div', { class: 'tiles' }, [
      el('div', { class: 'tile' }, [
        el('p', { class: 'label', text: '응답한 사람' }),
        el('p', { class: 'value hero', text: responses.length + '명' })
      ]),
      el('div', { class: 'tile' }, [
        el('p', { class: 'label', text: '마지막 응답' }),
        el('p', { class: 'value', text: lastAt || '아직 없음' })
      ]),
      el('div', { class: 'tile' }, [
        el('p', { class: 'label', text: '이 화면을 불러온 시각' }),
        el('p', { class: 'value', text: loadedAt ? clock(loadedAt) : '-' })
      ])
    ]));
    mount.appendChild(el('div', { class: 'actions' }, [
      opts.onRefresh ? el('button', { type: 'button', class: 'btn primary', text: '지금 새로 불러오기', onclick: opts.onRefresh }) : null,
      el('button', { type: 'button', class: 'btn', text: '엑셀 파일(CSV)로 받기', onclick: downloadCsv }),
      opts.refreshHint ? el('span', { class: 'hint', text: opts.refreshHint }) : null
    ]));
    mount.appendChild(errorEl);
    if (flash) {
      var flashEl = el('p', { class: 'notice' + (flash.ok ? ' ok' : ''), role: 'status', text: flash.text });
      mount.appendChild(flashEl);
      if (!flash.shown && flashEl.scrollIntoView) flashEl.scrollIntoView({ block: 'center' });
      flash.shown = true;
    }
    if (data.broken) {
      mount.appendChild(el('p', { class: 'notice', text: '시트에서 읽지 못한 응답이 ' + data.broken + '줄 있습니다. 구글 시트의 "원자료" 칸을 누가 고쳤는지 확인해 주세요.' }));
    }
    if (!responses.length) {
      mount.appendChild(el('p', { class: 'empty', text: '아직 들어온 응답이 없습니다.' }));
      return;
    }
    mount.appendChild(eachSection(responses));
    S.questions.forEach(function (q) { mount.appendChild(card(q, responses)); });
  }

  return {
    setData: function (responses, broken, when) {
      data = { responses: Array.isArray(responses) ? responses : [], broken: Number(broken) || 0 };
      loadedAt = when || new Date();
      draw();
    },
    hasData: function () { return !!data; },
    clearFlash: function () { flash = null; },
    setFlash: function (text, ok) { flash = { text: text, ok: !!ok }; },
    showStale: function (text) {
      if (!errorEl) return;
      errorEl.textContent = text;
      errorEl.hidden = false;
    },
    loadedClock: function () { return loadedAt ? clock(loadedAt) : ''; },
    nowClock: function () { return clock(new Date()); },
    draw: draw
  };
};

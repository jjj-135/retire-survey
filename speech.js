// 읽어주기.
//  1) 미리 만든 음성 파일(audio/)이 있는 줄은 그 파일을 튼다. PC·안드로이드·아이폰 어디서나 같은 목소리.
//     audio/manifest.js 가 "읽을 줄 -> 파일 번호" 를 알려 준다. 목소리는 여성/남성 중 고른다.
//  2) 파일이 없는 줄(사람이 직접 적은 글 등)은 기기에 들어 있는 목소리 중 가장 사람 같은 것으로 읽는다.
// 화면 글자를 사람이 소리 내어 읽는 말로 바꾸는 규칙(spoken)은 두 경우에 같이 쓴다.
//   "50~54세"        -> "50에서 54세"
//   "1개 있다"        -> "한 개 있다"      (일 개 X)
//   "1시간 30분"      -> "한 시간 30분"
//   "10,000원 이하"   -> "10000원 이하"    (쉼표에서 끊어 읽지 않게)
//   "취미·여가"       -> "취미, 여가"      (가운뎃점을 소리 내지 않게)
(function (root) {
  'use strict';

  // ---------- 글 다듬기

  var ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
  var TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

  // 단위 앞에 오는 고유어 수. 1 한, 2 두, 20 스무, 21 스물한. 1~99 만 바꾼다.
  function nativeNumber(n) {
    if (!(n >= 1 && n <= 99)) return null;
    var tens = Math.floor(n / 10);
    var ones = n % 10;
    if (ones === 0) return tens === 2 ? '스무' : TENS[tens];
    return TENS[tens] + ONES[ones];
  }

  // 한 개, 두 시간, 세 번째처럼 고유어로 세는 단위. 세·회·분·원·대 같은 것은 숫자 그대로 읽는다.
  var NATIVE_UNITS = '번째|시간|가지|마리|개|명|살|곳|권|잔|벌';

  function withUnit(digits, unit) {
    var n = parseInt(digits, 10);
    if (unit === '번째' && n === 1) return '첫 번째';
    var word = nativeNumber(n);
    return word ? word + ' ' + unit : digits + unit;
  }

  function spoken(text) {
    var s = String(text == null ? '' : text);
    var before;

    // 10,000 -> 10000
    do {
      before = s;
      s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
    } while (s !== before);

    // 50~54세 -> 50에서 54세 / 1~2개 -> 한 개에서 두 개
    s = s.replace(new RegExp('(\\d+)\\s*[~∼〜～]\\s*(\\d+)\\s*(' + NATIVE_UNITS + ')?', 'g'), function (m, a, b, unit) {
      return unit ? withUnit(a, unit) + '에서 ' + withUnit(b, unit) : a + '에서 ' + b;
    });

    // 1개 -> 한 개 / 3시간 -> 세 시간
    s = s.replace(new RegExp('(\\d+)\\s*(' + NATIVE_UNITS + ')', 'g'), function (m, a, unit) {
      return withUnit(a, unit);
    });

    s = s
      .replace(/[·ㆍ•∙]/g, ', ')             // 가운뎃점
      .replace(/[~∼〜～]/g, ' ')              // 남은 물결
      .replace(/[“”"「」『』‘’']/g, '')        // 따옴표
      .replace(/\s*[(（]\s*/g, ', ')           // 괄호는 잠깐 쉬는 곳으로
      .replace(/\s*[)）]\s*/g, ' ')
      .replace(/(\D)\s*:\s*/g, '$1, ')         // "기타: 주부" (12:30 같은 시각은 그대로)
      .replace(/…|\.{3}/g, ' ')
      .replace(/\s+([.,?!])/g, '$1')
      .replace(/,(\s*,)+/g, ',')
      .replace(/^[\s,]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }

  // ---------- 음성 파일 원고용: 숫자까지 전부 한글로 (파일 만들 때만 쓴다. 읽는 모델이 숫자를 헷갈리지 않게)
  //   "50에서 54세" -> "오십에서 오십사 세", "10000원" -> "만 원", "요구조사 8번." -> "요구조사 팔 번."

  var SINO = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var SINO_PLACES = ['', '십', '백', '천'];

  function sinoUnder10000(n) {
    var out = '';
    for (var i = 3; i >= 0; i--) {
      var d = Math.floor(n / Math.pow(10, i)) % 10;
      if (!d) continue;
      out += (d === 1 && i > 0 ? '' : SINO[d]) + SINO_PLACES[i];
    }
    return out;
  }

  // 한자어 수. 0~99999999. 10 십, 1000 천, 10000 만, 20000 이만.
  function sinoNumber(n) {
    if (!(n >= 0 && n <= 99999999)) return null;
    if (n === 0) return '영';
    var man = Math.floor(n / 10000);
    var rest = n % 10000;
    return (man ? (man === 1 ? '' : sinoUnder10000(man)) + '만' : '') + (rest ? sinoUnder10000(rest) : '');
  }

  var SINO_UNITS = '퍼센트|세|회|분|원|대|번|년|월|일|층|호|점|위|등|차|초|주';

  function forVoiceScript(text) {
    return spoken(text).replace(new RegExp('(\\d+)(\\s*)(' + SINO_UNITS + ')?', 'g'), function (m, digits, space, unit) {
      var word = sinoNumber(parseInt(digits, 10));
      if (!word) return m;
      return unit ? word + ' ' + unit : word + space;
    });
  }

  // ---------- 읽을 줄 만들기. 화면(index.html)과 음성 파일 목록(catalog)이 같은 것을 쓴다.
  // 사람이 직접 적은 글은 { free: '...' } 로 넘긴다. 미리 만든 음성이 없어서 기기 목소리로 읽는다.

  var PHRASE = {
    options: '고를 수 있는 답입니다.',
    picked: '고르셨습니다.',
    typed: '지금 적으신 내용입니다.',
    reviewStart: '고르신 답입니다.',
    notTyped: '적지 않으셨습니다.',
    notAnswered: '아직 답하지 않으셨습니다.',
    sent: '답이 잘 전달되었습니다.'
  };

  // "요구조사 8" 은 "요구조사 8번" 으로 읽는다
  function labelLine(q) {
    return q.label + (/\d$/.test(q.label) ? '번' : '') + '.';
  }

  function introLines(S) {
    return [S.title].concat(S.intro);
  }

  function questionLines(S, q, a) {
    a = a || {};
    var lines = [labelLine(q)];
    if (q.lead) lines.push(q.lead);
    lines.push(q.title);
    lines = lines.concat(S.helpLines(q));
    if (q.type === 'text') {
      var typed = S.str(a.text);
      if (typed) lines.push(PHRASE.typed, { free: typed });
      return lines;
    }
    var sel = S.sels(a);
    lines.push(PHRASE.options);
    q.options.forEach(function (o) {
      lines.push(o + '.');
      if (sel.indexOf(o) >= 0) lines.push(PHRASE.picked);
    });
    return lines;
  }

  function reviewLines(S, answers) {
    var lines = [PHRASE.reviewStart];
    S.questions.forEach(function (q) {
      var a = (answers && answers[q.id]) || {};
      lines.push(q.short + '.');
      if (q.type === 'text') {
        var typed = S.str(a.text);
        lines.push(typed ? { free: typed } : PHRASE.notTyped);
        return;
      }
      var sel = S.sels(a);
      if (!sel.length) {
        lines.push(PHRASE.notAnswered);
        return;
      }
      sel.forEach(function (s) {
        lines.push(s + '.');
        if (s === q.etc && S.str(a.etc)) lines.push({ free: S.str(a.etc) });
      });
      if (S.showsDetail(q, a) && S.str(a.text)) lines.push(q.detail.short + '.', { free: S.str(a.text) });
    });
    return lines;
  }

  function doneLines(S) {
    return [S.thanks, PHRASE.sent];
  }

  // 미리 음성 파일로 만들어 둘 줄 전부 (사람이 적는 글은 빼고)
  function catalog(S) {
    var list = [];
    function add(x) {
      if (typeof x === 'string' && spoken(x) && list.indexOf(x) < 0) list.push(x);
    }
    introLines(S).forEach(add);
    doneLines(S).forEach(add);
    Object.keys(PHRASE).forEach(function (k) { add(PHRASE[k]); });
    S.questions.forEach(function (q) {
      add(labelLine(q));
      if (q.lead) add(q.lead);
      add(q.title);
      S.helpLines(q).forEach(add);
      (q.options || []).forEach(function (o) { add(o + '.'); });
      add(q.short + '.');
      if (q.detail) add(q.detail.short + '.');
    });
    return list;
  }

  function textOf(item) {
    if (typeof item === 'string') return item;
    return item && item.free != null ? String(item.free) : '';
  }

  // ---------- 기기 목소리 고르기

  function isKorean(v) {
    return /^ko([-_]|$)/i.test(String(v && v.lang || ''));
  }

  // 높을수록 사람 같은 목소리. 이름에 품질이 드러나는 경우만 믿는다.
  function voiceScore(v) {
    var name = String(v.name || '') + ' ' + String(v.voiceURI || '');
    var score = 0;
    if (/natural|neural|wavenet|premium|enhanced|향상|고품질/i.test(name)) score += 100; // 엣지 선히·인준, 아이폰 향상된 음성
    if (/google/i.test(name)) score += 60;                                                 // 크롬 "Google 한국의"
    if (/online/i.test(name)) score += 10;
    if (/선히|sunhi|인준|injoon|yuna|유나|sora/i.test(name)) score += 5;
    if (/multilingual/i.test(name)) score -= 5;                                            // 여러 나라 말 목소리는 한국어가 조금 어색
    if (/heami|compact|eloquence/i.test(name)) score -= 50;                                // 기계 같은 옛 목소리
    return score;
  }

  function rankVoices(list, skip) {
    skip = skip || {};
    return (list || [])
      .filter(isKorean)
      .filter(function (v) { return !skip[v.voiceURI || v.name]; })
      .map(function (v, i) { return { v: v, s: voiceScore(v), i: i }; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .map(function (x) { return x.v; });
  }

  // ---------- 읽기

  function synth() { return root.speechSynthesis; }
  var synthSupported = !!(root.speechSynthesis && typeof root.SpeechSynthesisUtterance === 'function');
  var audioSupported = typeof root.Audio === 'function';
  var AUDIO = root.SURVEY_AUDIO && root.SURVEY_AUDIO.clips && root.SURVEY_AUDIO.voices ? root.SURVEY_AUDIO : null;
  var voice = AUDIO && AUDIO.voices[AUDIO.defaultVoice] ? AUDIO.defaultVoice : null;
  var supported = synthSupported || !!(AUDIO && audioSupported);

  // 크롬은 목소리 목록을 늦게 채운다. 미리 한 번 불러 둔다.
  if (synthSupported) {
    try {
      synth().getVoices();
      if ('onvoiceschanged' in synth() && !synth().onvoiceschanged) synth().onvoiceschanged = function () {};
    } catch (e) { /* 무시 */ }
  }

  var run = 0;
  var useAudio = true;     // 미리 만든 음성 파일 쓰기 (useClips(false) 로 끈다)
  var brokenVoices = {};   // 인터넷이 끊기는 등으로 실패한 기기 목소리는 이번 방문 동안 건너뛴다
  var audioEl = null;
  var currentUtterance = null;   // 크롬이 읽는 도중 이 객체를 치워 버려 끝 알림이 안 오는 것을 막는다

  function voices() {
    if (!AUDIO || !audioSupported || !useAudio) return [];
    return Object.keys(AUDIO.voices).map(function (id) { return { id: id, label: AUDIO.voices[id].label }; });
  }

  function getVoice() {
    return voice;
  }

  // 미리 만든 음성 파일을 쓸지. 서버에서 받은 새 설문에는 파일이 없어서 끈다.
  function useClips(on) {
    useAudio = !!on;
  }

  // 이 설문에서 읽는 줄 중 미리 만든 음성 파일이 있는 비율 (0~1).
  // 문항을 고치면 그 줄만 파일이 없어진다. 너무 적으면 목소리가 뒤섞이므로 부르는 쪽에서 아예 끈다.
  function clipCoverage(S) {
    if (!AUDIO || !audioSupported || !S) return 0;
    var lines = catalog(S);
    if (!lines.length) return 0;
    var have = 0;
    lines.forEach(function (line) { if (AUDIO.clips[line]) have++; });
    return have / lines.length;
  }

  function setVoice(id) {
    if (!AUDIO || !AUDIO.voices[id]) return false;
    voice = id;
    return true;
  }

  function clipUrl(line) {
    if (!AUDIO || !audioSupported || !useAudio || !voice || typeof line !== 'string') return null;
    var id = AUDIO.clips[line];
    return id ? AUDIO.voices[voice].dir + '/' + id + '.mp3' : null;
  }

  function stop() {
    run++;
    if (audioEl) {
      audioEl.onended = null;
      audioEl.onerror = null;
      try { audioEl.pause(); } catch (e) { /* 무시 */ }
    }
    if (synthSupported) synth().cancel();
  }

  function playClip(url, done, fail) {
    var mine = run;
    if (!audioEl) audioEl = new root.Audio();
    var a = audioEl;
    var settled = false;
    function settle(ok) {
      if (settled || mine !== run) return;
      settled = true;
      a.onended = null;
      a.onerror = null;
      if (ok) done(); else fail();
    }
    a.onended = function () { settle(true); };
    a.onerror = function () { settle(false); };
    try {
      a.src = url;
      var p = a.play();
      if (p && typeof p.catch === 'function') p.catch(function () { settle(false); });
    } catch (e) {
      settle(false);
    }
  }

  function sayWithDevice(text, done) {
    var mine = run;
    if (!synthSupported || !text) { done(); return; }
    var best = rankVoices(synth().getVoices(), brokenVoices)[0] || null;
    var u = new root.SpeechSynthesisUtterance(text);
    u.lang = best ? best.lang : 'ko-KR';
    if (best) u.voice = best;
    u.rate = 0.9;
    u.pitch = 1;
    var settled = false;
    u.onend = function () {
      if (settled || mine !== run) return;
      settled = true;
      done();
    };
    u.onerror = function (ev) {
      if (settled || mine !== run) return;
      var err = ev && ev.error;
      if (err === 'interrupted' || err === 'canceled') return;
      settled = true;
      if (best) {
        // 이 목소리가 안 되면 다음으로 좋은 목소리로 이 줄을 다시 읽는다
        brokenVoices[best.voiceURI || best.name] = true;
        synth().cancel();
        setTimeout(function () { if (mine === run) sayWithDevice(text, done); }, 60);
        return;
      }
      done();
    };
    currentUtterance = u;
    synth().speak(u);
  }

  // items 를 한 줄씩 차례로 읽는다. 끝까지 읽으면 onDone. 중간에 stop() 하면 onDone 은 안 불린다.
  function speak(items, onDone) {
    stop();
    if (!supported) return;
    var mine = run;
    var list = (items || []).filter(function (it) { return spoken(textOf(it)); });
    var i = 0;
    function next() {
      if (mine !== run) return;
      if (i >= list.length) {
        run++;
        currentUtterance = null;
        if (onDone) onDone();
        return;
      }
      var item = list[i++];
      var url = clipUrl(item);
      if (url) {
        playClip(url, next, function () { sayWithDevice(spoken(textOf(item)), next); });
      } else {
        sayWithDevice(spoken(textOf(item)), next);
      }
    }
    next();
  }

  root.SurveySpeech = {
    supported: supported,
    spoken: spoken,
    nativeNumber: nativeNumber,
    sinoNumber: sinoNumber,
    forVoiceScript: forVoiceScript,
    rankVoices: rankVoices,
    lines: { intro: introLines, question: questionLines, review: reviewLines, done: doneLines },
    catalog: catalog,
    textOf: textOf,
    voices: voices,
    getVoice: getVoice,
    setVoice: setVoice,
    useClips: useClips,
    clipCoverage: clipCoverage,
    speak: speak,
    stop: stop
  };
})(typeof window !== 'undefined' ? window : this);

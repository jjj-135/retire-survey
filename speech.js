// 읽어주기. 기기에 들어 있는 한국어 목소리 중 가장 사람 같은 것을 고르고,
// 화면 글자를 사람이 소리 내어 읽는 말로 바꿔서 읽는다.
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

  // ---------- 목소리 고르기

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
  var supported = !!(root.speechSynthesis && typeof root.SpeechSynthesisUtterance === 'function');

  // 크롬은 목소리 목록을 늦게 채운다. 미리 한 번 불러 둔다.
  if (supported) {
    try {
      synth().getVoices();
      if ('onvoiceschanged' in synth() && !synth().onvoiceschanged) synth().onvoiceschanged = function () {};
    } catch (e) { /* 무시 */ }
  }

  var run = 0;
  var brokenVoices = {};   // 인터넷이 끊기는 등으로 실패한 목소리는 이번 방문 동안 건너뛴다

  function stop() {
    run++;
    if (supported) synth().cancel();
  }

  // lines 를 한 줄씩 읽는다. 끝까지 읽으면 onDone. 중간에 stop() 하면 onDone 은 안 불린다.
  function speak(lines, onDone) {
    stop();
    if (!supported) return;
    var mine = run;
    var list = (lines || []).map(spoken).filter(Boolean);
    var attempt = 0;
    if (!list.length) { if (onDone) onDone(); return; }

    function finish() {
      if (mine !== run) return;
      run++;
      if (onDone) onDone();
    }

    function start(from) {
      if (mine !== run) return;
      var tryNo = ++attempt;
      var voice = rankVoices(synth().getVoices(), brokenVoices)[0] || null;
      // 긴 글을 한 번에 넘기면 중간에 끊기는 기기가 있어서 한 줄씩 넘긴다
      list.slice(from).forEach(function (line, k) {
        var index = from + k;
        var u = new root.SpeechSynthesisUtterance(line);
        u.lang = voice ? voice.lang : 'ko-KR';
        if (voice) u.voice = voice;
        u.rate = 0.9;
        u.pitch = 1;
        u.onend = function () {
          if (tryNo === attempt && index === list.length - 1) finish();
        };
        u.onerror = function (ev) {
          if (mine !== run || tryNo !== attempt) return;
          var err = ev && ev.error;
          if (err === 'interrupted' || err === 'canceled') return;
          if (voice) {
            // 이 목소리가 안 되면 다음으로 좋은 목소리로 그 줄부터 다시 읽는다
            brokenVoices[voice.voiceURI || voice.name] = true;
            attempt++;
            synth().cancel();
            setTimeout(function () { start(index); }, 60);
            return;
          }
          finish();
        };
        synth().speak(u);
      });
    }

    start(0);
  }

  root.SurveySpeech = {
    supported: supported,
    spoken: spoken,
    nativeNumber: nativeNumber,
    rankVoices: rankVoices,
    speak: speak,
    stop: stop
  };
})(typeof window !== 'undefined' ? window : this);

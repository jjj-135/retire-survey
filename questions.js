// 설문 문항. 설문 화면(index.html)과 결과 화면(admin.html)이 같이 쓴다.
//
// 선택지 글자를 바꾸면 이미 들어온 응답은 옛 글자로 남는다.
// 결과 화면은 그런 답을 "지금 설문에 없는 선택지"로 따로 보여준다.
//
// type: one = 하나만 고름, many = 여러 개 고름(max 개까지), text = 글로 적음
// etc: 이 선택지를 고르면 내용 적는 칸이 열린다 (etcAsk: 그 칸의 안내 글)
// none: 이 선택지는 다른 것과 같이 고를 수 없다 ("특별히 없음" 같은 것)
// detail: 이 문항에서 고른 답이 showUnless 가 아니면 추가로 적는 칸이 열린다
// 이 저장소에 들어 있는 기본 설문. 주소에 ?id= 가 없으면 이것으로 돈다.
// 엄마가 관리자 화면에서 만든 새 설문은 같은 모양의 정의를 서버에서 받아 쓴다.
var SURVEY_BUILT_IN = (function () {
  var title = '예비은퇴자 및 은퇴자 평생교육 프로그램 요구조사';

  var intro = [
    '본 설문은 퇴직을 앞두고 있거나 퇴직 후 새로운 생활을 준비하는 50·60대의 생각과 요구를 알아보고, 실제 참여하기 쉬운 평생교육 프로그램을 개발하기 위한 기초조사입니다.',
    '응답내용은 과제자료로만 활용하며 이름·연락처는 수집하지 않습니다.',
    '현재 자신의 생각과 가장 가까운 항목에 표시해 주세요.'
  ];

  var thanks = '설문에 참여해 주셔서 감사합니다.';

  var questions = [
    {
      id: 'q1', label: '1번', short: '성별',
      lead: '기본정보',
      title: '성별',
      type: 'one',
      options: ['남성', '여성', '기타 / 응답하지 않음']
    },
    {
      id: 'q2', label: '2번', short: '연령대',
      title: '연령대',
      type: 'one',
      options: ['50~54세', '55~59세', '60~64세', '65세 이상']
    },
    {
      id: 'q3', label: '3번', short: '현재 상태',
      title: '현재 상태',
      type: 'one',
      options: ['직장생활 중', '자영업', '1~5년 이내 퇴직 예정', '이미 퇴직함', '기타'],
      etc: '기타', etcAsk: '현재 상태를 적어 주세요'
    },
    {
      id: 'q4', label: '4번', short: '거주지역',
      title: '거주지역',
      type: 'one',
      options: ['광주광역시', '전라남도', '기타 지역'],
      etc: '기타 지역', etcAsk: '사시는 지역을 적어 주세요'
    },
    {
      id: 'q5', label: '5번', short: '은퇴 후 중요한 것',
      lead: '은퇴 이후 생활에 대한 생각',
      title: '퇴직 또는 은퇴 이후 가장 중요하다고 생각하는 것은 무엇입니까?',
      help: '2개까지 선택',
      type: 'many', max: 2,
      options: [
        '계속할 수 있는 일이나 소득활동',
        '건강관리',
        '취미·여가생활',
        '가족과 보내는 시간 또는 가족돌봄',
        '친구·이웃 등 인간관계',
        '봉사·사회공헌·지역사회 활동',
        '새로운 배움',
        '충분한 휴식과 나만의 시간',
        '아직 생각해 보지 않았다',
        '기타'
      ],
      none: '아직 생각해 보지 않았다',
      etc: '기타'
    },
    {
      id: 'q6', label: '6번', short: '은퇴 후 걱정',
      title: '은퇴 이후 가장 걱정되거나 준비가 필요하다고 생각하는 것은 무엇입니까?',
      help: '1개 선택',
      type: 'one',
      options: [
        '경제적인 문제',
        '할 일이 없어지는 것',
        '건강문제',
        '인간관계가 줄어드는 것',
        '가족관계 또는 돌봄문제',
        '새로운 일이나 역할을 찾는 것',
        '취미·여가생활을 찾는 것',
        '특별히 걱정되는 것이 없다',
        '기타'
      ],
      etc: '기타'
    },
    {
      id: 'q7', label: '7번', short: '해보고 싶은 활동',
      title: '은퇴 후 새롭게 해보고 싶은 활동이 있다면 무엇입니까?',
      help: '2개까지 선택',
      type: 'many', max: 2,
      options: [
        '재취업·시간제 일자리',
        '소규모 창업 또는 수입활동',
        '취미·여가활동',
        '봉사·사회공헌',
        '주민강사·재능나눔',
        '마을·지역사회 활동',
        '새로운 교육이나 자격과정',
        '가족돌봄',
        '여행·휴식',
        '아직 잘 모르겠다',
        '기타'
      ],
      none: '아직 잘 모르겠다',
      etc: '기타'
    },
    {
      id: 'q8', label: '8번', short: '프로그램 참여 의향',
      lead: '프로그램 참여 요구',
      title: '다음과 같은 프로그램이 있다면 참여해 볼 의향이 있습니까?',
      help: '「퇴직 후 첫 월요일」: 일·취미·가족·봉사·배움·쉼 등 여러 가능성을 탐색하고 자신에게 맞는 생활계획을 만드는 4회 프로그램',
      type: 'one',
      options: [
        '꼭 참여해 보고 싶다',
        '기회가 되면 참여하고 싶다',
        '잘 모르겠다',
        '별로 참여하고 싶지 않다',
        '전혀 참여하고 싶지 않다'
      ]
    },
    {
      id: 'q9', label: '9번', short: '직접 해보는 시간',
      title: '프로그램 안에서 관심 있는 활동을 짧게 직접 해보는 시간이 있다면 어떻습니까?',
      help: '예: 10~20분 미니수업, 취미활동 소개, 내가 할 수 있는 일 설명하기, 은퇴 후 하루 설계하기',
      type: 'one',
      options: ['매우 좋다', '좋다', '보통이다', '조금 부담스럽다', '참여하고 싶지 않다']
    },
    {
      id: 'q10', label: '10번', short: '적당한 운영기간',
      title: '프로그램에 참여한다면 가장 적당하다고 생각하는 운영기간은 어느 정도입니까?',
      type: 'one',
      options: ['1회 특강', '2회', '4회 정도', '6~8회 정도', '기간은 크게 상관없다']
    },
    {
      id: 'q11', label: '11번', short: '해보고 싶은 일·필요한 도움',
      lead: '자유의견',
      title: '내가 은퇴 후 가장 해보고 싶은 일 또는 꼭 필요한 도움은 무엇입니까?',
      help: '적지 않으셔도 됩니다.',
      type: 'text'
    },
    {
      id: 'q12', label: '12번', short: '프로그램에 바라는 점',
      title: '은퇴준비 프로그램에 바라는 점이 있다면 자유롭게 적어 주세요.',
      help: '적지 않으셔도 됩니다.',
      type: 'text'
    }
  ];

  return { title: title, intro: intro, thanks: thanks, questions: questions };
})();

// 설문 정의 하나를 받아, 설문 화면과 결과 화면이 쓰는 도구 묶음을 만든다.
window.SURVEY_MAKE = function (def) {
  def = def || {};
  var title = def.title || '';
  var intro = Array.isArray(def.intro) ? def.intro : [];
  var thanks = def.thanks || '설문에 참여해 주셔서 감사합니다.';
  var questions = Array.isArray(def.questions) ? def.questions : [];

  // 답 하나: { sel: [고른 선택지 글자...], etc: '기타 내용', text: '적은 글' }
  // 시트에서 읽어 온 답은 모양이 깨져 있을 수 있어서 글자로 바꿔 가며 읽는다.
  function sels(a) {
    return a && Array.isArray(a.sel) ? a.sel.map(String) : [];
  }

  function str(v) {
    return v == null ? '' : String(v).trim();
  }

  // 질문 아래 안내 줄. 화면과 읽어주기가 같이 쓴다.
  function helpLines(q) {
    var out = [];
    if (q.help) out.push(q.help);
    if (q.type === 'one') out.push('하나만 골라 주세요.');
    return out;
  }

  function showsDetail(q, a) {
    var s = sels(a);
    return !!(q.detail && s.length && s[0] !== q.detail.showUnless);
  }

  function selText(q, a) {
    var etc = str(a && a.etc);
    return sels(a).map(function (s) {
      return s === q.etc && etc ? s + ': ' + etc : s;
    }).join(', ');
  }

  // 구글 시트 한 줄, 엑셀 파일 한 줄. [제목, 값] 목록.
  function columns(answers) {
    var out = [];
    questions.forEach(function (q) {
      var a = answers ? answers[q.id] : null;
      var head = q.label + ' ' + q.short;
      if (q.type === 'text') {
        out.push([head, str(a && a.text)]);
        return;
      }
      out.push([head, selText(q, a)]);
      if (q.detail) {
        out.push([q.label + ' ' + q.detail.short, showsDetail(q, a) ? str(a.text) : '']);
      }
    });
    return out;
  }

  return {
    id: def.id || '',
    voice: def.voice !== false,   // 읽어주기 버튼을 보여 줄지 (설문마다 정한다)
    title: title,
    intro: intro,
    thanks: thanks,
    questions: questions,
    sels: sels,
    str: str,
    helpLines: helpLines,
    showsDetail: showsDetail,
    selText: selText,
    columns: columns
  };
};

window.SURVEY = window.SURVEY_MAKE(SURVEY_BUILT_IN);

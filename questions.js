// 설문 문항. 설문 화면(index.html)과 결과 화면(admin.html)이 같이 쓴다.
//
// 선택지 글자를 바꾸면 이미 들어온 응답은 옛 글자로 남는다.
// 결과 화면은 그런 답을 "지금 설문에 없는 선택지"로 따로 보여준다.
//
// type: one = 하나만 고름, many = 여러 개 고름(max 개까지), text = 글로 적음
// etc: 이 선택지를 고르면 내용 적는 칸이 열린다 (etcAsk: 그 칸의 안내 글)
// none: 이 선택지는 다른 것과 같이 고를 수 없다 ("특별히 없음" 같은 것)
// detail: 이 문항에서 고른 답이 showUnless 가 아니면 추가로 적는 칸이 열린다
window.SURVEY = (function () {
  var title = '예비 은퇴자 평생교육 프로그램 요구조사';

  var intro = [
    '안녕하세요.',
    '본 설문은 은퇴를 앞둔 50·60대의 취미·여가생활에 대한 요구를 알아보고, 실제 참여하기 쉬운 평생교육 프로그램을 개발하기 위한 기초조사입니다.',
    '응답내용은 평생교육 프로그램 개발을 위한 과제자료로만 활용하며, 이름이나 연락처 등 개인을 식별할 수 있는 정보는 수집하지 않습니다.',
    '정답은 없으니 현재 자신의 생각과 상황에 가장 가까운 항목에 표시해 주세요.'
  ];

  var thanks = '설문에 참여해 주셔서 감사합니다.';

  var questions = [
    {
      id: 'b1', label: '기본정보 1', short: '연령대',
      title: '연령대',
      type: 'one',
      options: ['50~54세', '55~59세', '60~64세', '기타'],
      etc: '기타', etcAsk: '연령대를 적어 주세요'
    },
    {
      id: 'b2', label: '기본정보 2', short: '현재 상태',
      title: '현재 상태',
      type: 'one',
      options: ['직장생활 중', '몇 년 이내 은퇴 예정', '이미 은퇴함', '자영업', '기타'],
      etc: '기타', etcAsk: '현재 상태를 적어 주세요'
    },
    {
      id: 'b3', label: '기본정보 3', short: '생활지역',
      title: '생활지역',
      type: 'one',
      options: ['광주광역시 광산구', '광주광역시 다른 지역', '기타 지역'],
      etc: '기타 지역', etcAsk: '사시는 지역을 적어 주세요'
    },
    {
      id: 'r1', label: '요구조사 1', short: '은퇴 후 걱정·준비',
      title: '은퇴 후 생활에서 가장 걱정되거나 준비가 필요하다고 생각하는 것은 무엇입니까?',
      help: '가장 중요한 것 2개까지 선택해 주세요.',
      type: 'many', max: 2,
      options: [
        '경제적인 문제', '건강관리', '늘어난 여가시간 활용', '취미생활',
        '가족·친구 등 인간관계', '사회적 역할이 줄어드는 것', '새로운 사람들과의 관계 형성',
        '재취업·창업', '봉사·사회참여', '특별히 걱정되는 것이 없음', '기타'
      ],
      none: '특별히 걱정되는 것이 없음',
      etc: '기타'
    },
    {
      id: 'r2', label: '요구조사 2', short: '현재 취미·여가활동',
      title: '현재 정기적으로 하고 있는 취미나 여가활동이 있습니까?',
      type: 'one',
      options: ['없다', '1개 있다', '2개 이상 있다'],
      detail: { showUnless: '없다', label: '있다면 어떤 활동입니까?', short: '어떤 활동' }
    },
    {
      id: 'r3', label: '요구조사 3', short: '취미생활이 어려운 이유',
      title: '취미생활을 시작하거나 계속하기 어려운 가장 큰 이유는 무엇입니까?',
      help: '2개까지 선택해 주세요.',
      type: 'many', max: 2,
      options: [
        '나에게 어떤 취미가 맞는지 모르겠다', '관련 정보를 찾기 어렵다', '비용이 부담된다',
        '시간이 부족하다', '함께할 사람이 없다', '가까운 장소나 프로그램을 찾기 어렵다',
        '체력이나 건강이 부담된다', '처음 시작하는 것이 부담스럽다', '특별히 어려움이 없다', '기타'
      ],
      none: '특별히 어려움이 없다',
      etc: '기타'
    },
    {
      id: 'r4', label: '요구조사 4', short: '취미로 얻고 싶은 것',
      title: '은퇴 후 취미·여가활동을 통해 가장 얻고 싶은 것은 무엇입니까?',
      help: '2개까지 선택해 주세요.',
      type: 'many', max: 2,
      options: [
        '즐거움과 재미', '건강관리', '스트레스 해소와 마음의 안정', '새로운 사람들과의 관계',
        '성취감', '규칙적인 생활', '새로운 것을 배우는 즐거움', '지역사회 활동 참여',
        '재능기부·봉사활동으로 발전', '소득이나 일자리와 연결', '기타'
      ],
      etc: '기타'
    },
    {
      id: 'r5', label: '요구조사 5', short: '체험하고 싶은 분야',
      title: '직접 체험해보고 싶은 취미·여가 분야는 무엇입니까?',
      help: '3개까지 선택해 주세요.',
      type: 'many', max: 3,
      options: [
        '걷기·스트레칭·생활체육', '요가·건강운동', '공예·생활소품 만들기', '원예·식물 가꾸기',
        '요리·음식 만들기', '음악·악기', '미술·그림', '사진·스마트폰 사진', '독서·글쓰기',
        '명상·마음건강', '여행·문화탐방', '디지털·스마트폰 활용', '봉사·사회공헌', '기타'
      ],
      etc: '기타'
    },
    {
      id: 'r6', label: '요구조사 6', short: '원하는 프로그램 방식',
      title: '어떤 방식의 프로그램에 참여하고 싶습니까?',
      type: 'one',
      options: [
        '설명을 듣는 강의형', '직접 해보는 체험형', '강의와 체험을 함께하는 방식',
        '소규모 그룹 활동', '지역의 시설이나 기관을 방문하는 현장체험',
        '참여자들과 함께하는 동아리 방식', '기타'
      ],
      etc: '기타'
    },
    {
      id: 'r7', label: '요구조사 7', short: '참여하기 편한 때',
      title: '프로그램이 운영된다면 언제가 가장 참여하기 편합니까?',
      type: 'one',
      options: [
        '평일 오전', '평일 오후', '평일 저녁', '토요일 오전', '토요일 오후', '일요일',
        '시간대와 관계없음', '기타'
      ],
      etc: '기타'
    },
    {
      id: 'r8a', label: '요구조사 8', short: '프로그램 기간',
      title: '부담 없이 참여할 수 있는 프로그램 기간은 어느 정도입니까?',
      type: 'one',
      options: [
        '1~2회 단기체험', '4회 정도', '6회 정도', '8회 정도', '10회 이상도 가능',
        '기간보다 프로그램 내용이 더 중요함'
      ]
    },
    {
      id: 'r8b', label: '요구조사 8', short: '1회 교육시간',
      title: '적당하다고 생각하는 1회 교육시간',
      type: 'one',
      options: ['1시간', '1시간 30분', '2시간', '3시간 정도']
    },
    {
      id: 'r9', label: '요구조사 9', short: '1회 본인부담금',
      title: '재료비나 체험비 등 본인부담금이 필요한 경우 어느 정도까지 부담할 수 있습니까?',
      help: '1회 기준',
      type: 'one',
      options: [
        '무료 프로그램만 참여하고 싶다', '5,000원 이하', '10,000원 이하', '20,000원 이하',
        '프로그램이 좋다면 비용과 관계없이 고려할 수 있다'
      ]
    },
    {
      id: 'r10', label: '요구조사 10', short: '끝난 뒤 원하는 모습',
      title: '프로그램이 끝난 뒤 가장 원하는 모습은 무엇입니까?',
      type: 'one',
      options: [
        '마음에 맞는 취미를 혼자 계속하고 싶다', '프로그램에서 만난 사람들과 함께 계속하고 싶다',
        '지역의 기존 동아리에 참여하고 싶다', '지역 평생학습기관의 관련 프로그램에 참여하고 싶다',
        '봉사·재능기부 등 지역활동으로 연결하고 싶다', '자격증·재취업·일자리 등으로 발전시키고 싶다',
        '여러 활동을 체험해보는 것만으로 충분하다', '아직 잘 모르겠다', '기타'
      ],
      etc: '기타'
    },
    {
      id: 'last', label: '마지막 질문', short: '꼭 참여하고 싶은 프로그램',
      lead: '마지막으로 한 말씀 부탁드립니다.',
      title: '“은퇴 후 이런 프로그램이 있다면 꼭 참여해보고 싶다”라고 생각하는 프로그램이나 활동이 있습니까?',
      help: '적지 않으셔도 됩니다.',
      type: 'text'
    }
  ];

  // 답 하나: { sel: [고른 선택지 글자...], etc: '기타 내용', text: '적은 글' }
  // 시트에서 읽어 온 답은 모양이 깨져 있을 수 있어서 글자로 바꿔 가며 읽는다.
  function sels(a) {
    return a && Array.isArray(a.sel) ? a.sel.map(String) : [];
  }

  function str(v) {
    return v == null ? '' : String(v).trim();
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
    title: title,
    intro: intro,
    thanks: thanks,
    questions: questions,
    sels: sels,
    str: str,
    showsDetail: showsDetail,
    selText: selText,
    columns: columns
  };
})();

// 구글 Apps Script 를 "웹 앱"으로 배포하고 받은 주소(https://script.google.com/macros/s/.../exec)를
// 아래 따옴표 안에 붙여 넣는다. 비어 있으면 설문을 낼 수 없다.

// 결과 화면(admin.html)이 쓰는 옛 주소. 지금까지 쌓인 응답은 이 주소로 읽는다.
window.SURVEY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwi4kaRY9-TEJfIYHO6Dqp55H2EDvLUZkdpe-wV5HomCLu7FccIXBjPRzn2R5eBsQWe/exec';

// 설문 화면(index.html)과 설문 만들기 화면(manage.html)이 쓰는 새 주소.
// 같은 스크립트를 "새 배포" 로 한 번 더 배포해서 받은 주소를 넣는다.
// 지금 돌고 있는 설문도 관리자 화면에서 고칠 수 있게 되면서 이 주소를 쓴다.
// 답은 예전과 같은 '응답' 탭에 그대로 쌓인다.
// 비워 두면 위 주소를 같이 쓴다.
window.SURVEY_ENDPOINT_NEW = 'https://script.google.com/macros/s/AKfycbzvGxrgHnTVD5atBJCRm2gDWB_UEU176sMEc__g5xq2oYm8_i_58H3rHulSzwWNqnnL/exec';

// 구글 Apps Script 를 "웹 앱"으로 배포하고 받은 주소(https://script.google.com/macros/s/.../exec)를
// 아래 따옴표 안에 붙여 넣는다. 비어 있으면 설문을 낼 수 없다.

// 지금 돌고 있는 설문(주소에 ?id= 가 없는 것)과 그 결과 화면(admin.html)이 쓰는 주소.
window.SURVEY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwi4kaRY9-TEJfIYHO6Dqp55H2EDvLUZkdpe-wV5HomCLu7FccIXBjPRzn2R5eBsQWe/exec';

// 새로 만드는 설문들(주소에 ?id= 가 붙는 것)과 설문 만들기 화면(manage.html)이 쓰는 주소.
// 같은 스크립트를 "새 배포" 로 한 번 더 배포해서 받은 주소를 넣는다.
// 이렇게 두면 새 기능을 고치는 동안에도 지금 설문은 옛 배포 그대로 돌아간다.
// 비워 두면 위 주소를 같이 쓴다.
window.SURVEY_ENDPOINT_NEW = 'https://script.google.com/macros/s/AKfycbxCFFYnzExiSOazeexDeqjCJNtf67PySGESFeegGdZtAzKhx9IVTzfqm-99amK5s52L/exec';

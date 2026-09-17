// 구글 스프레드시트에 붙이는 스크립트. 설문 응답을 받아 시트에 쌓고, 결과 화면에 돌려준다.
//
// 이 파일에는 비밀이 없다. 관리자 비밀번호는 setup() 을 돌릴 때 새로 만들어져
// 스크립트 속성(구글 쪽)에만 저장된다. 공개 저장소에 올려도 된다.
//
// 처음 한 번:  setup 실행 -> 실행 로그에 나온 비밀번호를 적어 둔다 -> 웹 앱으로 배포
// 링크가 샜을 때:  resetKey 실행 -> 새 비밀번호로 관리자 링크를 다시 만든다
// 이 파일을 고친 뒤:  배포 관리 -> 연필 -> 버전 "새 버전" -> 배포 (안 하면 옛 코드가 계속 돈다)

var SHEET_NAME = '응답';
var TRASH_NAME = '지운 응답';
var RAW_HEADER = '원자료(지우지 마세요)';
var MAX_BODY = 30000;
var MAX_COLUMNS = 60;
var MAX_TEXT = 2000;

function setup() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  var key = props.getProperty('ADMIN_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('ADMIN_KEY', key);
  }
  getSheet_();
  Logger.log('관리자 비밀번호: ' + key);
}

function resetKey() {
  var key = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  Logger.log('새 관리자 비밀번호: ' + key + '  (옛 관리자 링크는 이제 안 열린다)');
}

// 설문 제출, 그리고 결과 화면에서 응답 지우기
function doPost(e) {
  var body;
  try {
    var raw = e && e.postData ? e.postData.contents : '';
    if (!raw || raw.length > MAX_BODY) return json_({ ok: false, error: 'size' });
    body = JSON.parse(raw);
  } catch (err) {
    return json_({ ok: false, error: 'json' });
  }
  if (body && body.action === 'delete') return deleteResponse_(body);
  if (!body || typeof body.answers !== 'object' || body.answers === null || !Array.isArray(body.columns) ||
      body.columns.length > MAX_COLUMNS) {
    return json_({ ok: false, error: 'shape' });
  }
  var cols = [];
  for (var i = 0; i < body.columns.length; i++) {
    var c = body.columns[i];
    if (!Array.isArray(c) || typeof c[0] !== 'string' || !c[0] || c[0].length > 80) {
      return json_({ ok: false, error: 'shape' });
    }
    cols.push([c[0], cell_(String(c[1] == null ? '' : c[1]).slice(0, MAX_TEXT))]);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var at = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    var all = [['제출 시각', new Date()]].concat(cols);
    // id: 응답마다 붙는 고유 번호. 지울 때 줄 번호가 아니라 이것으로 찾는다.
    all.push([RAW_HEADER, JSON.stringify({ id: Utilities.getUuid(), at: at, answers: body.answers })]);

    // 칸은 순서가 아니라 제목으로 찾는다. 문항을 고쳐도 옛 칸이 밀리지 않는다.
    var headers = readHeaders_(sheet);
    var row = headers.map(function () { return ''; });
    all.forEach(function (pair) {
      var idx = headers.indexOf(pair[0]);
      if (idx < 0) {
        headers.push(pair[0]);
        idx = headers.length - 1;
        sheet.getRange(1, idx + 1).setValue(pair[0]).setFontWeight('bold');
        row.push('');
      }
      row[idx] = pair[1];
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// 결과 화면. 비밀번호가 맞을 때만 응답을 돌려준다.
function doGet(e) {
  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  var given = e && e.parameter ? e.parameter.key : '';
  if (!key || !given || given !== key) return json_({ ok: false, error: 'key' });

  var sheet = getSheet_();
  var headers = readHeaders_(sheet);
  var col = headers.indexOf(RAW_HEADER);
  var responses = [];
  var broken = 0;
  var last = sheet.getLastRow();
  if (col >= 0 && last > 1) {
    sheet.getRange(2, col + 1, last - 1, 1).getValues().forEach(function (r) {
      var v = String(r[0] || '');
      if (!v) return;
      var obj = parseRaw_(v);
      if (!obj) {
        broken++;
        return;
      }
      obj.id = rowId_(obj, v);
      responses.push(obj);
    });
  }
  return json_({ ok: true, responses: responses, broken: broken });
}

// 응답 하나 지우기. 비밀번호가 맞아야 하고, 지운 줄은 "지운 응답" 탭으로 옮겨 둔다.
// 줄 번호는 믿지 않는다. 지우는 순간 시트를 다시 읽어 id 가 같은 줄을 찾는다.
function deleteResponse_(body) {
  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || typeof body.key !== 'string' || body.key !== key) return json_({ ok: false, error: 'key' });
  if (typeof body.id !== 'string' || !body.id || body.id.length > 100) return json_({ ok: false, error: 'shape' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var headers = readHeaders_(sheet);
    var col = headers.indexOf(RAW_HEADER);
    var last = sheet.getLastRow();
    if (col < 0 || last < 2) return json_({ ok: false, error: 'notfound' });

    var raws = sheet.getRange(2, col + 1, last - 1, 1).getValues();
    for (var i = 0; i < raws.length; i++) {
      var v = String(raws[i][0] || '');
      var obj = v ? parseRaw_(v) : null;
      if (!obj || rowId_(obj, v) !== body.id) continue;

      var rowNum = i + 2;
      var values = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0].map(function (x) {
        return typeof x === 'string' ? cell_(x) : x;
      });
      var trash = getBook_().getSheetByName(TRASH_NAME) || getBook_().insertSheet(TRASH_NAME);
      trash.getRange(1, 1, 1, headers.length + 1).setValues([['지운 시각'].concat(headers)]);
      trash.setFrozenRows(1);
      trash.appendRow([new Date()].concat(values));
      sheet.deleteRow(rowNum);
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'notfound' });
  } finally {
    lock.releaseLock();
  }
}

function parseRaw_(v) {
  try {
    var obj = JSON.parse(v);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch (err) {
    return null;
  }
}

// 고유 번호가 없는 옛 응답은 원자료 글 자체로 번호를 만든다 (글이 같으면 번호도 같다)
function rowId_(obj, raw) {
  if (typeof obj.id === 'string' && obj.id) return obj.id;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return 'h-' + bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function getBook_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_() {
  var book = getBook_();
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readHeaders_(sheet) {
  var n = sheet.getLastColumn();
  if (!n) return [];
  return sheet.getRange(1, 1, 1, n).getValues()[0].map(String);
}

// = + - @ 로 시작하는 글은 시트가 수식으로 읽는다. 글자로 넣는다.
function cell_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

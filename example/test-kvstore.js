/*
 * test-kvstore.js — Тестовый воркфлоу для проверки работы Adv.KVStore
 *
 * Отдельное приложение-тестер. Загружается в YouTrack как самостоятельный пакет.
 * При нажатии команды `kvstore-test` на issue прогоняет серию тестов
 * через HTTP API эндпоинты KVStore (global scope):
 *   1. Flush — очистка
 *   2. Set — запись ключа
 *   3. Get — чтение ключа
 *   4. Blocks — список блоков
 *   5. TTL — запись с TTL
 *   6. Delete — удаление ключа
 *   7. Drop — удаление блока
 *   8. JSON value — объект как значение
 *   9. Verify — данные остались для проверки в admin panel
 *  10. Project Set — запись ключей в project scope
 *  11. Project Get — чтение из project scope
 *  12. Project Verify — данные на месте в project scope
 *
 * После тестов в storage остаются блоки:
 *   Global: __test_kvstore__, __test_ttl__, __test_json__
 *   Project: __test_project__
 *
 * Требования:
 *   - Adv.KVStore (axkvstore) установлен и настроен
 *   - ACL: Global Scope — Allowed Group включает текущего пользователя
 *   - Заданы YOUTRACK_URL и YOUTRACK_TOKEN (см. константы ниже)
 *
 * Результаты выводятся через workflow.message().
 */

var entities = require('@jetbrains/youtrack-scripting-api/entities');
var workflow = require('@jetbrains/youtrack-scripting-api/workflow');
var http = require('@jetbrains/youtrack-scripting-api/http');
var config = require('./config');

// --- Константы ---

var YOUTRACK_URL = config.YOUTRACK_URL;
var YOUTRACK_TOKEN = config.YOUTRACK_TOKEN;

var BASE = '/api/extensionEndpoints/axkvstore/be';
// Project scope base URL формируется динамически с projectId
var TEST_BLOCK = '__test_kvstore__';
var TEST_KEY = 'testKey';
var TEST_VALUE = 'hello-kvstore';

// --- HTTP helpers ---

/** Парсит ответ; при ошибке возвращает { error: ... } */
function parseResp(resp) {
  if (!resp) {
    return { error: 'null response' };
  }
  if (resp.exception) {
    return { error: 'exception: ' + resp.exception };
  }
  if (!resp.isSuccess) {
    var body = '';
    try { body = (resp.response || '').substring(0, 300); } catch (e) { body = '(unreadable)'; }
    return { error: 'HTTP ' + resp.code + ': ' + body };
  }
  try {
    return JSON.parse(resp.response || '{}');
  } catch (e) {
    return { error: 'JSON parse failed: ' + e.message + ', raw: ' + (resp.response || '').substring(0, 200) };
  }
}

/** GET запрос, возвращает распарсенный JSON или объект с ошибкой */
function httpGet(conn, path) {
  var resp = conn.getSync(path);
  return parseResp(resp);
}

/** POST запрос с JSON body */
function httpPost(conn, path, body) {
  var resp = conn.postSync(path, null, JSON.stringify(body));
  return parseResp(resp);
}

/** DELETE запрос (deleteSync) */
function httpDelete(conn, path) {
  var resp = conn.deleteSync(path);
  return parseResp(resp);
}

/** DELETE запрос (doSync) — альтернативный метод */
function httpDeleteAlt(conn, path) {
  var resp = conn.doSync('DELETE', path, null, null);
  return parseResp(resp);
}

// --- Test runner ---

function runTests(conn, tests) {
  var passed = 0;
  var failed = 0;
  var results = [];

  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var err = null;
    try {
      err = t.fn(conn);
    } catch (e) {
      err = 'EXCEPTION: ' + e.message;
    }
    if (err) {
      failed++;
      results.push('❌ ' + t.name + ' — ' + err);
    } else {
      passed++;
      results.push('✅ ' + t.name);
    }
  }

  return { passed: passed, failed: failed, summary: results.join('\n') };
}

// --- Тесты ---

function makeProjectBase(projectId) {
  return '/api/admin/projects/' + projectId + '/extensionEndpoints/axkvstore/be-project';
}

function makeTests(projectBase) {
  return [
    // 1. Flush: очистка перед тестами
    {
      name: 'Flush: очистка перед тестами',
      fn: function (conn) {
        var res = httpPost(conn, BASE + '/flush', {});
        if (res.error) return res.error;
        if (!res.ok) return 'flush не вернул ok';
        return null;
      }
    },

    // 2. Set: запись нескольких ключей в основной блок
    {
      name: 'Set: запись ключей (x7)',
      fn: function (conn) {
        var keys = [
          { key: TEST_KEY, value: TEST_VALUE },
          { key: 'config', value: { theme: 'dark', lang: 'ru', version: 2 } },
          { key: 'counter', value: 42 },
          { key: 'tags', value: ['alpha', 'beta', 'gamma'] },
          { key: 'empty', value: '' },
          { key: 'flag', value: true },
          { key: 'metadata', value: { created: '2026-01-01', author: 'test', nested: { deep: true } } }
        ];
        for (var i = 0; i < keys.length; i++) {
          var res = httpPost(conn, BASE + '/set', {
            block: TEST_BLOCK, key: keys[i].key, value: keys[i].value, ttl: 0
          });
          if (res.error) return 'key=' + keys[i].key + ': ' + res.error;
          if (!res.ok) return 'key=' + keys[i].key + ': set не вернул ok';
        }
        return null;
      }
    },

    // 3. Get: чтение ключа
    {
      name: 'Get: чтение записанного ключа',
      fn: function (conn) {
        var res = httpGet(conn, BASE + '/get?block=' + TEST_BLOCK + '&key=' + TEST_KEY);
        if (res.error) return res.error;
        if (res.value !== TEST_VALUE) return 'значение не совпадает: ' + res.value + ' !== ' + TEST_VALUE;
        return null;
      }
    },

    // 4. Blocks: список блоков
    {
      name: 'Blocks: блок виден в списке',
      fn: function (conn) {
        var res = httpGet(conn, BASE + '/blocks');
        if (res.error) return res.error;
        if (!res.blocks) return 'нет поля blocks';
        var found = false;
        for (var i = 0; i < res.blocks.length; i++) {
          if (res.blocks[i].name === TEST_BLOCK) { found = true; break; }
        }
        if (!found) return 'блок ' + TEST_BLOCK + ' не найден в списке';
        return null;
      }
    },

    // 5. TTL: запись нескольких ключей с TTL
    {
      name: 'TTL: блок с ttl (x5 ключей)',
      fn: function (conn) {
        var ttlKeys = [
          { key: 'cache_token', value: 'eyJhbGciOiJSUzI1NiJ9.temp' },
          { key: 'cache_user', value: { login: 'admin', name: 'Admin User' } },
          { key: 'cache_ts', value: Date.now() },
          { key: 'cache_list', value: [1, 2, 3, 4, 5] },
          { key: 'cache_flag', value: false }
        ];
        for (var i = 0; i < ttlKeys.length; i++) {
          var res = httpPost(conn, BASE + '/set', {
            block: '__test_ttl__', key: ttlKeys[i].key, value: ttlKeys[i].value, ttl: 300
          });
          if (res.error) return 'key=' + ttlKeys[i].key + ': ' + res.error;
        }
        // Проверяем через blocks
        var blocks = httpGet(conn, BASE + '/blocks');
        if (blocks.error) return blocks.error;
        var found = null;
        for (var i = 0; i < blocks.blocks.length; i++) {
          if (blocks.blocks[i].name === '__test_ttl__') { found = blocks.blocks[i]; break; }
        }
        if (!found) return 'TTL-блок не найден';
        if (found.ttl !== 300) return 'TTL != 300: ' + found.ttl;
        return null;
      }
    },

    // 6. Delete: удаление ключа (на отдельном блоке, чтобы основные данные остались)
    {
      name: 'Delete: удаление ключа',
      fn: function (conn) {
        // Создаём временный блок для теста удаления
        var setup = httpPost(conn, BASE + '/set', {
          block: '__test_delete__', key: 'delme', value: 'bye', ttl: 0
        });
        if (setup.error) return 'setup: ' + setup.error;
        var res = httpDelete(conn, BASE + '/delete?block=__test_delete__&key=delme');
        if (res.error) return res.error;
        if (!res.ok) return 'delete не вернул ok';
        // Проверяем что ключ удалён (404)
        var get = httpGet(conn, BASE + '/get?block=__test_delete__&key=delme');
        if (!get.error) return 'ключ всё ещё доступен после удаления';
        return null;
      }
    },

    // 7. Drop: удаление блока (на временном блоке)
    {
      name: 'Drop: удаление блока целиком',
      fn: function (conn) {
        // Блок __test_delete__ уже пустой после теста 6, но может существовать
        // Создаём заново чтобы точно был
        httpPost(conn, BASE + '/set', {
          block: '__test_drop__', key: 'x', value: '1', ttl: 0
        });
        var res = httpDelete(conn, BASE + '/drop?block=__test_drop__');
        if (res.error) return res.error;
        if (!res.ok) return 'drop не вернул ok';
        // Проверяем что блок пропал из списка
        var blocks = httpGet(conn, BASE + '/blocks');
        if (blocks.error) return blocks.error;
        for (var i = 0; i < blocks.blocks.length; i++) {
          if (blocks.blocks[i].name === '__test_drop__') return 'блок всё ещё в списке после drop';
        }
        return null;
      }
    },

    // 7b. Delete via doSync: проверяем альтернативный метод conn.doSync('DELETE', ...)
    {
      name: 'Delete via doSync: альтернативный метод',
      fn: function (conn) {
        // Создаём ключ
        var setup = httpPost(conn, BASE + '/set', {
          block: '__test_dosync__', key: 'delme', value: 'bye', ttl: 0
        });
        if (setup.error) return 'setup: ' + setup.error;
        // Удаляем через doSync
        var res = httpDeleteAlt(conn, BASE + '/delete?block=__test_dosync__&key=delme');
        if (res.error) return 'doSync DELETE: ' + res.error;
        if (!res.ok) return 'doSync DELETE не вернул ok';
        // Drop блок через doSync
        httpPost(conn, BASE + '/set', {
          block: '__test_dosync__', key: 'tmp', value: '1', ttl: 0
        });
        var drop = httpDeleteAlt(conn, BASE + '/drop?block=__test_dosync__');
        if (drop.error) return 'doSync DROP: ' + drop.error;
        if (!drop.ok) return 'doSync DROP не вернул ok';
        return null;
      }
    },

    // 8. JSON value: несколько объектов как значения
    {
      name: 'JSON value: объекты (x5 ключей)',
      fn: function (conn) {
        var jsonKeys = [
          { key: 'user_profile', value: { name: 'John', age: 30, roles: ['admin', 'dev'] } },
          { key: 'app_config', value: { debug: false, maxRetries: 3, endpoints: { api: '/api', ws: '/ws' } } },
          { key: 'matrix', value: [[1, 2], [3, 4], [5, 6]] },
          { key: 'mixed', value: { str: 'hello', num: 3.14, bool: true, nil: null, arr: [1, 'two'] } },
          { key: 'deep_nest', value: { a: { b: { c: { d: { e: 'deep' } } } } } }
        ];
        for (var i = 0; i < jsonKeys.length; i++) {
          var res = httpPost(conn, BASE + '/set', {
            block: '__test_json__', key: jsonKeys[i].key, value: jsonKeys[i].value, ttl: 0
          });
          if (res.error) return 'key=' + jsonKeys[i].key + ': ' + res.error;
        }
        // Проверяем один из ключей
        var get = httpGet(conn, BASE + '/get?block=__test_json__&key=user_profile');
        if (get.error) return get.error;
        var val = get.value;
        if (!val || val.name !== 'John' || val.age !== 30) return 'объект не сохранился: ' + JSON.stringify(val);
        return null;
      }
    },

    // 9. Verify: данные остались для проверки в admin panel
    {
      name: 'Verify: global данные на месте',
      fn: function (conn) {
        var blocks = httpGet(conn, BASE + '/blocks');
        if (blocks.error) return blocks.error;
        // Должны быть: __test_kvstore__, __test_ttl__, __test_json__
        var expected = [TEST_BLOCK, '__test_ttl__', '__test_json__'];
        var missing = [];
        for (var i = 0; i < expected.length; i++) {
          var found = false;
          for (var j = 0; j < blocks.blocks.length; j++) {
            if (blocks.blocks[j].name === expected[i]) { found = true; break; }
          }
          if (!found) missing.push(expected[i]);
        }
        if (missing.length > 0) return 'блоки не найдены: ' + missing.join(', ');
        return null;
      }
    },

    // --- Project scope tests ---

    // 10. Project Set: запись нескольких ключей в project scope
    {
      name: 'Project Set: запись ключей (x6)',
      fn: function (conn) {
        if (!projectBase) return 'projectBase не задан (нет projectId)';
        var projKeys = [
          { key: 'projKey', value: 'project-data' },
          { key: 'workflow_config', value: { autoAssign: true, defaultPriority: 'Normal' } },
          { key: 'sprint_cache', value: { current: 'Sprint 42', startDate: '2026-04-01' } },
          { key: 'metrics', value: { openIssues: 15, velocity: 23.5 } },
          { key: 'labels', value: ['bug', 'feature', 'docs', 'refactor'] },
          { key: 'last_sync', value: '2026-04-25T00:00:00Z' }
        ];
        for (var i = 0; i < projKeys.length; i++) {
          var res = httpPost(conn, projectBase + '/set', {
            block: '__test_project__', key: projKeys[i].key, value: projKeys[i].value, ttl: 0
          });
          if (res.error) return 'key=' + projKeys[i].key + ': ' + res.error;
          if (!res.ok) return 'key=' + projKeys[i].key + ': set не вернул ok';
        }
        return null;
      }
    },

    // 11. Project Get: чтение из project scope
    {
      name: 'Project Get: чтение из project scope',
      fn: function (conn) {
        if (!projectBase) return 'projectBase не задан';
        var res = httpGet(conn, projectBase + '/get?block=__test_project__&key=projKey');
        if (res.error) return res.error;
        if (res.value !== 'project-data') return 'значение не совпадает: ' + res.value;
        return null;
      }
    },

    // 12. Project Verify: данные на месте
    {
      name: 'Project Verify: данные на месте для admin panel',
      fn: function (conn) {
        if (!projectBase) return 'projectBase не задан';
        var blocks = httpGet(conn, projectBase + '/blocks');
        if (blocks.error) return blocks.error;
        var found = false;
        for (var i = 0; i < blocks.blocks.length; i++) {
          if (blocks.blocks[i].name === '__test_project__') { found = true; break; }
        }
        if (!found) return 'блок __test_project__ не найден в project scope';
        return null;
      }
    }
  ];
}

// --- Workflow rule ---

exports.rule = entities.Issue.action({
  title: 'KVStore: Run Tests',
  command: 'kvstore-test',

  guard: function (ctx) {
    return ctx.issue.isReported;
  },

  action: function (ctx) {
    if (!YOUTRACK_URL || !YOUTRACK_TOKEN) {
      workflow.message('<b>KVStore Test Error</b><br/>Не заданы YOUTRACK_URL и/или YOUTRACK_TOKEN в test-kvstore.js.');
      return;
    }
    // Убираем trailing slash
    var url = YOUTRACK_URL;
    if (url.charAt(url.length - 1) === '/') {
      url = url.substring(0, url.length - 1);
    }

    var conn = new http.Connection(url);
    conn.addHeader('Content-Type', 'application/json');
    conn.addHeader('Accept', 'application/json');
    conn.addHeader('Authorization', 'Bearer ' + YOUTRACK_TOKEN);

    // Получаем projectId из текущего issue для project scope тестов
    var project = ctx.issue.project;
    var projectId = project ? project.key : null;
    var projectBase = projectId ? makeProjectBase(projectId) : null;

    var result = runTests(conn, makeTests(projectBase));

    var msg = '<b>KVStore Test Results</b><br/>' +
      'Passed: ' + result.passed + ' / Failed: ' + result.failed + '<br/><br/>' +
      result.summary.split('\n').join('<br/>');

    workflow.message(msg);
  },

  requirements: {}
});

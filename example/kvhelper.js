/**
 * kvhelper.js — Helper script for Adv.KVStore.
 * Copy this file into your workflow package and add config.js with URL + TOKEN.
 *
 * Usage:
 *   var kv = require('./kvhelper');
 *   kv.set('config', 'apiUrl', 'https://api.example.com');
 *   var url = kv.get('config', 'apiUrl');
 *   kv.del('config', 'apiUrl');
 *
 *   var pk = ctx.issue.project.key;
 *   kv.project.set(pk, 'sync', 'lastRun', new Date().toISOString());
 *   var lastRun = kv.project.get(pk, 'sync', 'lastRun');
 */

var http = require('@jetbrains/youtrack-scripting-api/http');
var config = require('./config');

var YOUTRACK_URL = config.YOUTRACK_URL;
var YOUTRACK_TOKEN = config.YOUTRACK_TOKEN;

var GLOBAL_BASE = '/api/extensionEndpoints/axkvstore/be';
var PROJECT_BASE = '/api/admin/projects/{pid}/extensionEndpoints/axkvstore/be-project';

// --- Internals ---

var _conn = null;

function conn() {
  if (!_conn) {
    var url = YOUTRACK_URL;
    if (url.charAt(url.length - 1) === '/') {
      url = url.substring(0, url.length - 1);
    }
    _conn = new http.Connection(url);
    _conn.addHeader('Content-Type', 'application/json');
    _conn.addHeader('Accept', 'application/json');
    _conn.addHeader('Authorization', 'Bearer ' + YOUTRACK_TOKEN);
  }
  return _conn;
}

function parse(resp) {
  if (!resp) return { error: 'null response' };
  if (resp.exception) return { error: 'exception: ' + resp.exception };
  if (!resp.isSuccess) {
    var body = '';
    try { body = (resp.response || '').substring(0, 300); } catch (e) { body = '(unreadable)'; }
    return { error: 'HTTP ' + resp.code + ': ' + body };
  }
  try { return JSON.parse(resp.response || '{}'); } catch (e) { return { error: 'JSON parse: ' + e.message }; }
}

function pBase(projectKey) {
  return PROJECT_BASE.replace('{pid}', projectKey);
}

// --- Global scope ---

exports.get = function(block, key) {
  var data = parse(conn().getSync(
    GLOBAL_BASE + '/get?block=' + encodeURIComponent(block) + '&key=' + encodeURIComponent(key)
  ));
  return data.error ? null : data.value;
};

exports.set = function(block, key, value, ttl) {
  conn().postSync(GLOBAL_BASE + '/set', null, JSON.stringify({
    block: block, key: key, value: value, ttl: ttl || 0
  }));
};

exports.del = function(block, key) {
  conn().deleteSync(
    GLOBAL_BASE + '/delete?block=' + encodeURIComponent(block) + '&key=' + encodeURIComponent(key)
  );
};

// --- Project scope ---

exports.project = {
  get: function(projectKey, block, key) {
    var data = parse(conn().getSync(
      pBase(projectKey) + '/get?block=' + encodeURIComponent(block) + '&key=' + encodeURIComponent(key)
    ));
    return data.error ? null : data.value;
  },
  set: function(projectKey, block, key, value, ttl) {
    conn().postSync(pBase(projectKey) + '/set', null, JSON.stringify({
      block: block, key: key, value: value, ttl: ttl || 0
    }));
  },
  del: function(projectKey, block, key) {
    conn().deleteSync(
      pBase(projectKey) + '/delete?block=' + encodeURIComponent(block) + '&key=' + encodeURIComponent(key)
    );
  }
};

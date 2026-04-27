/**
 * example-usage.js — Example workflow using kvhelper.js
 *
 * Demonstrates how to use the KVStore helper in a real workflow.
 * Command "kvstore-demo" on any issue will:
 *   1. Write multiple keys to global and project scopes
 *   2. Read them back
 *   3. Delete only some keys (others remain for admin panel inspection)
 *   4. Show results via workflow.message()
 *
 * After running, the following data remains in storage:
 *   Global block "config": apiUrl, maxRetries
 *   Project block "state": lastRun
 *
 * Prerequisites:
 *   - Adv.KVStore (axkvstore) installed and configured
 *   - kvhelper.js in the same workflow package with URL + TOKEN set
 *   - ACL groups configured for global and project scopes
 */

var entities = require('@jetbrains/youtrack-scripting-api/entities');
var workflow = require('@jetbrains/youtrack-scripting-api/workflow');
var kv = require('./kvhelper');

exports.rule = entities.Issue.action({
  title: 'KVStore: Demo (helper)',
  command: 'kvstore-demo',

  guard: function (ctx) {
    return ctx.issue.isReported;
  },

  action: function (ctx) {
    var results = [];
    var pk = ctx.issue.project.key;

    // --- Global scope: write multiple keys to "config" block ---
    kv.set('config', 'apiUrl', 'https://api.example.com');
    kv.set('config', 'maxRetries', '5');
    kv.set('config', 'tempToken', 'abc123', 60); // expires in 60s

    // Read them back
    results.push('[Global] config/apiUrl = ' + (kv.get('config', 'apiUrl') || '(null)'));
    results.push('[Global] config/maxRetries = ' + (kv.get('config', 'maxRetries') || '(null)'));
    results.push('[Global] config/tempToken = ' + (kv.get('config', 'tempToken') || '(null)'));

    // --- Project scope: write to "state" block ---
    kv.project.set(pk, 'state', 'lastRun', new Date().toISOString());
    kv.project.set(pk, 'state', 'runBy', ctx.currentUser.login);
    kv.project.set(pk, 'state', 'counter', '1');

    // Read them back
    results.push('[Project] state/lastRun = ' + (kv.project.get(pk, 'state', 'lastRun') || '(null)'));
    results.push('[Project] state/runBy = ' + (kv.project.get(pk, 'state', 'runBy') || '(null)'));
    results.push('[Project] state/counter = ' + (kv.project.get(pk, 'state', 'counter') || '(null)'));

    // --- Delete only temporary keys (others stay for admin panel) ---
    kv.del('config', 'tempToken');
    results.push('[Global] deleted config/tempToken');

    kv.project.del(pk, 'state', 'counter');
    results.push('[Project] deleted state/counter');

    // --- Show results ---
    results.push('');
    results.push('Remaining data visible in Admin Panel:');
    results.push('  Global block "config": apiUrl, maxRetries');
    results.push('  Project block "state": lastRun, runBy');

    workflow.message(
      '<b>KVStore Demo</b><br/>' +
      results.join('<br/>')
    );
  },

  requirements: {}
});

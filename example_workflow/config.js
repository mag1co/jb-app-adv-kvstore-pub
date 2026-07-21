/**
 * config.js — Shared configuration for example workflows.
 * ⚠️ Set your token and URL before uploading.
 *
 * YOUTRACK_BASE_URL — full URL of your YouTrack instance.
 *   Use the actual network-accessible address (NOT localhost inside Docker).
 *   Examples:
 *     'http://192.168.1.10:8080'   — LAN IP
 *     'https://youtrack.mycompany.com' — DNS
 *     ''                           — same instance (works on some setups, may deadlock on others)
 *
 * YOUTRACK_TOKEN — permanent token (Profile → Account Security → Tokens → New token, scope: YouTrack)
 */

// var YOUTRACK_BASE_URL = '';
const YOUTRACK_BASE_URL = null; // SET YOUR URL // SET YOUR YOUTRACK URL

// var YOUTRACK_TOKEN = 'perm:YOUR_TOKEN_HERE';
const YOUTRACK_TOKEN = null; // SET YOUR TOKEN // SET YOUR TOKEN

exports.YOUTRACK_BASE_URL = YOUTRACK_BASE_URL;
exports.YOUTRACK_TOKEN = YOUTRACK_TOKEN;

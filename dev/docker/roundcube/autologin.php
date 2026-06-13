<?php
/**
 * Roundcube autologin endpoint for OpenCloud webmail integration.
 * see https://medium.com/@matthias2handy/from-seafile-to-opencloud-building-a-self-hosted-webmail-cloud-integration-on-kubernetes-a4f3bb795d6f
 *
 * Verifies HMAC-SHA256 signed tokens and authenticates users against IMAP.
 * Tokens contain: user ID, account ID, IMAP credentials, expiration.
 *
 * Query parameters:
 *   data - base64url-encoded JSON payload
 *   sig  - HMAC-SHA256 signature (base64url)
 *   ts   - Unix timestamp (seconds)
 */

define('SHARED_SECRET', getenv('ROUNDCUBE_SHARED_SECRET') ?: 'dev-shared-secret');
define('MAX_TOKEN_AGE', 120); // seconds

// base64url decode (RFC 4648 §5)
function base64url_decode(string $data): string|false {
    $padded = str_pad(strtr($data, '-_', '+/'), strlen($data) + (4 - strlen($data) % 4) % 4, '=');
    return base64_decode($padded);
}

// --- Validate request parameters ---

$data = $_GET['data'] ?? null;
$sig  = $_GET['sig'] ?? null;
$ts   = $_GET['ts'] ?? null;

if (!$data || !$sig || !$ts) {
    http_response_code(400);
    die('Missing parameters');
}

$tsInt = intval($ts);
$now   = time();

// Check timestamp freshness
if (abs($now - $tsInt) > MAX_TOKEN_AGE) {
    http_response_code(403);
    die('Token expired (timestamp)');
}

// Verify HMAC-SHA256 signature
$message       = $data . '.' . $ts;
$expectedSig   = base64url_decode($sig);
$calculatedSig = hash_hmac('sha256', $message, SHARED_SECRET, true);

if (!$expectedSig || !hash_equals($calculatedSig, $expectedSig)) {
    http_response_code(403);
    die('Invalid signature');
}

// Decode and validate payload
$payloadJson = base64url_decode($data);
if (!$payloadJson) {
    http_response_code(400);
    die('Invalid payload encoding');
}

$payload = json_decode($payloadJson, true);
if (!$payload) {
    http_response_code(400);
    die('Invalid payload JSON');
}

// Check payload expiration
if (!isset($payload['exp']) || $payload['exp'] < $now) {
    http_response_code(403);
    die('Token expired (payload)');
}

$imapUser = $payload['email'] ?? null;
$imapPass = $payload['imapPass'] ?? null;

if (!$imapUser || !$imapPass) {
    http_response_code(400);
    die('Missing credentials in payload');
}

// --- Bootstrap Roundcube and authenticate ---

define('INSTALL_PATH', realpath(__DIR__ . '/..') . '/');
require_once INSTALL_PATH . 'program/include/iniset.php';

$rcmail = rcmail::get_instance(0, 'xhr');

// Authenticate against IMAP
$auth = $rcmail->login($imapUser, $imapPass, $rcmail->config->get('default_host'), false);

if (!$auth) {
    http_response_code(401);
    die('IMAP authentication failed');
}

// Set session cookie and redirect to inbox
$rcmail->session->set_auth_cookie();

header('Location: ./');
exit;

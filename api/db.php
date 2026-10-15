<?php
declare(strict_types=1);
$CFG = require __DIR__ . '/config.php';

session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function out($data, int $code = 200): void { http_response_code($code); echo json_encode($data); exit; }
function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }
function cfg(string $k) { global $CFG; return $CFG[$k] ?? null; }

set_exception_handler(function (Throwable $e) { error_log($e->getMessage()); fail('Server error. Please try again.', 500); });

// Basic CSRF defence: every POST must come from our own JavaScript.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'syncshot') fail('Blocked request.', 403);

function pdo(): PDO {
  static $p = null;
  if ($p) return $p;
  $c = cfg('db');
  try {
    $p = new PDO("mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4", $c['user'], $c['pass'],
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  } catch (PDOException $e) { error_log($e->getMessage()); fail('Cannot connect to the database. Check api/config.php.', 500); }
  return $p;
}
function body(): array { $j = json_decode(file_get_contents('php://input') ?: '', true); return is_array($j) ? $j : []; }

function me(): ?array {
  if (empty($_SESSION['uid'])) return null;
  $s = pdo()->prepare('SELECT id, email, username, verified FROM users WHERE id = ?');
  $s->execute([$_SESSION['uid']]);
  $u = $s->fetch();
  return $u ? ['id' => (int)$u['id'], 'email' => $u['email'], 'username' => $u['username'], 'verified' => (bool)$u['verified']] : null;
}
function need_user(bool $verified = false): array {
  $u = me();
  if (!$u) fail('Please log in.', 401);
  if ($verified && !$u['verified']) fail('Verify your email first.', 403);
  return $u;
}

function send_verification(string $email, string $token): ?string {
  $scheme = !empty($_SERVER['HTTPS']) ? 'https' : 'http';
  $base = cfg('base_url') ?: $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME']))), '/');
  $link = $base . '/api/auth.php?action=verify&token=' . $token;
  $msg = "Welcome to SYNC SHOT!\n\nConfirm your email to save photos and use Sync rooms:\n$link\n";
  if (cfg('mail_mode') === 'mail') { @mail($email, 'Confirm your SYNC SHOT account', $msg, 'From: ' . cfg('mail_from')); return null; }
  file_put_contents(__DIR__ . '/mail.log', date('c') . " to $email\n$link\n\n", FILE_APPEND);
  return $link;
}

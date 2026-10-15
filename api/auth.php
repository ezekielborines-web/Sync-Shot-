<?php
require __DIR__ . '/db.php';
$action = $_GET['action'] ?? '';

switch ($action) {
  case 'me':
    out(['user' => me()]);

  case 'check': {
    $res = [];
    if (isset($_GET['email'])) { $s = pdo()->prepare('SELECT 1 FROM users WHERE email = ?'); $s->execute([strtolower(trim($_GET['email']))]); $res['emailTaken'] = (bool)$s->fetch(); }
    if (isset($_GET['username'])) { $s = pdo()->prepare('SELECT 1 FROM users WHERE username = ?'); $s->execute([trim($_GET['username'])]); $res['usernameTaken'] = (bool)$s->fetch(); }
    out($res);
  }

  case 'register': {
    $b = body();
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $username = trim((string)($b['username'] ?? ''));
    $pw = (string)($b['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) fail('Enter a valid email address.');
    $domain = substr(strrchr($email, '@'), 1);
    if (cfg('check_mx') && !(checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A'))) fail('That email domain cannot receive mail.');
    if (!preg_match('/^[A-Za-z0-9_.]{3,20}$/', $username)) fail('Username must be 3–20 letters, numbers, dots or underscores.');
    if (strlen($pw) < 12 || strlen($pw) > 128 || !preg_match('/[A-Z]/', $pw) || !preg_match('/[a-z]/', $pw) || !preg_match('/\d/', $pw) || !preg_match('/[^A-Za-z0-9]/', $pw))
      fail('Password needs 12+ characters with upper, lower, number and symbol.');
    $token = bin2hex(random_bytes(32));
    try {
      $s = pdo()->prepare('INSERT INTO users (email, username, password_hash, verify_token) VALUES (?, ?, ?, ?)');
      $s->execute([$email, $username, password_hash($pw, PASSWORD_DEFAULT), $token]);
    } catch (PDOException $e) {
      if ($e->getCode() !== '23000') throw $e;
      $s = pdo()->prepare('SELECT 1 FROM users WHERE email = ?'); $s->execute([$email]);
      fail($s->fetch() ? 'This email already has an account.' : 'That username is taken.', 409);
    }
    $_SESSION = []; session_regenerate_id(true);
    $_SESSION['uid'] = (int)pdo()->lastInsertId();
    $link = send_verification($email, $token);
    out(['user' => me(), 'dev_link' => $link]);
  }

  case 'login': {
    $b = body();
    $s = pdo()->prepare('SELECT id, password_hash FROM users WHERE username = ?');
    $s->execute([trim((string)($b['username'] ?? ''))]);
    $u = $s->fetch();
    if (!$u || !password_verify((string)($b['password'] ?? ''), $u['password_hash'])) { usleep(500000); fail('Wrong username or password.', 401); }
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$u['id'];
    out(['user' => me()]);
  }

  case 'logout':
    $_SESSION = []; session_destroy();
    out(['ok' => true]);

  case 'verify': {
    $t = (string)($_GET['token'] ?? '');
    $ok = false;
    if (preg_match('/^[a-f0-9]{64}$/', $t)) {
      $s = pdo()->prepare('UPDATE users SET verified = 1, verify_token = NULL WHERE verify_token = ?');
      $s->execute([$t]);
      $ok = $s->rowCount() > 0;
    }
    header('Location: ../home.html?verified=' . ($ok ? '1' : '0'));
    exit;
  }

  case 'resend': {
    $u = need_user();
    if ($u['verified']) fail('Your email is already verified.');
    $token = bin2hex(random_bytes(32));
    pdo()->prepare('UPDATE users SET verify_token = ? WHERE id = ?')->execute([$token, $u['id']]);
    out(['dev_link' => send_verification($u['email'], $token)]);
  }

  default: fail('Unknown action.', 404);
}

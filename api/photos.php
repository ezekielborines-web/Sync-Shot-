<?php
require __DIR__ . '/db.php';
$action = $_GET['action'] ?? '';
const FRAME_KEYS = ['window', 'vertical', 'horizontal', 'single'];
$dir = dirname(__DIR__) . '/uploads';

switch ($action) {
  case 'list': {
    $u = need_user(true);
    $s = pdo()->prepare('SELECT id, frame, created_at FROM photos WHERE user_id = ? ORDER BY id DESC');
    $s->execute([$u['id']]);
    out(['photos' => array_map(fn($p) => ['id' => (int)$p['id'], 'frame' => $p['frame'], 'at' => $p['created_at']], $s->fetchAll())]);
  }

  case 'upload': {
    $u = need_user(true);
    $b = body();
    $frame = (string)($b['frame'] ?? '');
    $d = (string)($b['dataUrl'] ?? '');
    $prefix = 'data:image/jpeg;base64,';
    if (!in_array($frame, FRAME_KEYS, true)) fail('Unknown frame.');
    if (strncmp($d, $prefix, strlen($prefix)) !== 0) fail('Photo must be a JPEG.');
    $raw = base64_decode(substr($d, strlen($prefix)), true);
    if ($raw === false || strlen($raw) > cfg('max_photo_bytes')) fail('Photo is too large.', 413);
    $info = @getimagesizefromstring($raw);
    if (!$info || $info[2] !== IMAGETYPE_JPEG || $info[0] > 6000 || $info[1] > 6000) fail('Invalid image.');
    $c = pdo()->prepare('SELECT COUNT(*) FROM photos WHERE user_id = ?'); $c->execute([$u['id']]);
    if ((int)$c->fetchColumn() >= cfg('max_photos_per_user')) fail('Photo limit reached. Delete some photos first.', 409);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = bin2hex(random_bytes(16)) . '.jpg';
    file_put_contents("$dir/$name", $raw);
    pdo()->prepare('INSERT INTO photos (user_id, filename, frame) VALUES (?, ?, ?)')->execute([$u['id'], $name, $frame]);
    out(['id' => (int)pdo()->lastInsertId()]);
  }

  case 'get': {
    $u = need_user(true);
    $s = pdo()->prepare('SELECT filename FROM photos WHERE id = ? AND user_id = ?');
    $s->execute([(int)($_GET['id'] ?? 0), $u['id']]);
    $p = $s->fetch();
    if (!$p || !is_file("$dir/{$p['filename']}")) fail('Photo not found.', 404);
    header('Content-Type: image/jpeg');
    header('Cache-Control: private, max-age=86400');
    readfile("$dir/{$p['filename']}");
    exit;
  }

  case 'delete': {
    $u = need_user(true);
    $id = (int)(body()['id'] ?? 0);
    $s = pdo()->prepare('SELECT filename FROM photos WHERE id = ? AND user_id = ?');
    $s->execute([$id, $u['id']]);
    $p = $s->fetch();
    if (!$p) fail('Photo not found.', 404);
    pdo()->prepare('DELETE FROM photos WHERE id = ?')->execute([$id]);
    @unlink("$dir/{$p['filename']}");
    out(['ok' => true]);
  }

  default: fail('Unknown action.', 404);
}

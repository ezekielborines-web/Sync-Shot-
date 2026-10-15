<?php
require __DIR__ . '/db.php';
$action = $_GET['action'] ?? '';
const FRAME_KEYS = ['window', 'vertical', 'horizontal', 'single'];

function room_state(array $room, int $uid): array {
  $s = pdo()->prepare('SELECT u.id, u.username AS name FROM room_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = ? ORDER BY m.joined_at, u.id');
  $s->execute([$room['id']]);
  $members = array_map(fn($m) => ['id' => (int)$m['id'], 'name' => $m['name']], $s->fetchAll());
  return ['code' => $room['code'], 'frame' => $room['frame'], 'hostId' => (int)$room['host_id'], 'isHost' => (int)$room['host_id'] === $uid, 'members' => $members];
}
function find_room(string $code): ?array {
  $s = pdo()->prepare('SELECT * FROM rooms WHERE code = ?');
  $s->execute([strtoupper(trim($code))]);
  return $s->fetch() ?: null;
}
function leave_all(int $uid): void {
  pdo()->prepare('DELETE FROM rooms WHERE host_id = ?')->execute([$uid]);
  pdo()->prepare('DELETE FROM room_members WHERE user_id = ?')->execute([$uid]);
}
function member_of(array $room, int $uid): bool {
  $s = pdo()->prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?');
  $s->execute([$room['id'], $uid]);
  return (bool)$s->fetch();
}

switch ($action) {
  case 'create': {
    $u = need_user(true);
    pdo()->exec("DELETE FROM rooms WHERE created_at < (NOW() - INTERVAL 6 HOUR)");
    leave_all($u['id']);
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for ($try = 0; $try < 10; $try++) {
      $code = '';
      for ($i = 0; $i < 6; $i++) $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
      try { pdo()->prepare('INSERT INTO rooms (code, host_id) VALUES (?, ?)')->execute([$code, $u['id']]); break; }
      catch (PDOException $e) { if ($e->getCode() !== '23000' || $try === 9) throw $e; }
    }
    $room = find_room($code);
    pdo()->prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)')->execute([$room['id'], $u['id']]);
    out(room_state($room, $u['id']));
  }

  case 'join': {
    $u = need_user(true);
    $code = strtoupper(trim((string)(body()['code'] ?? '')));
    if (!preg_match('/^[A-Z0-9]{6}$/', $code)) fail('Enter the 6-character code.');
    $p = pdo();
    $p->beginTransaction();
    $s = $p->prepare('SELECT * FROM rooms WHERE code = ? FOR UPDATE');
    $s->execute([$code]);
    $room = $s->fetch();
    if (!$room) { $p->rollBack(); fail('No room found with that code.', 404); }
    $c = $p->prepare('SELECT COUNT(*) FROM room_members WHERE room_id = ?'); $c->execute([$room['id']]);
    if (!member_of($room, $u['id']) && (int)$c->fetchColumn() >= 2) { $p->rollBack(); fail('This room already has 2 people.', 409); }
    $p->prepare('DELETE FROM rooms WHERE host_id = ? AND id <> ?')->execute([$u['id'], $room['id']]);
    $p->prepare('DELETE FROM room_members WHERE user_id = ? AND room_id <> ?')->execute([$u['id'], $room['id']]);
    $p->prepare('INSERT IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)')->execute([$room['id'], $u['id']]);
    $p->commit();
    out(room_state($room, $u['id']));
  }

  case 'state': {
    $u = need_user(true);
    $room = find_room((string)($_GET['code'] ?? ''));
    if (!$room || !member_of($room, $u['id'])) fail('Room not found.', 404);
    out(room_state($room, $u['id']));
  }

  case 'frame': {
    $u = need_user(true);
    $b = body();
    $room = find_room((string)($b['code'] ?? ''));
    if (!$room || !member_of($room, $u['id'])) fail('Room not found.', 404);
    if ((int)$room['host_id'] !== $u['id']) fail('Only the host can choose the frame.', 403);
    if (!in_array($b['frame'] ?? '', FRAME_KEYS, true)) fail('Unknown frame.');
    pdo()->prepare('UPDATE rooms SET frame = ? WHERE id = ?')->execute([$b['frame'], $room['id']]);
    $room['frame'] = $b['frame'];
    out(room_state($room, $u['id']));
  }

  case 'leave': {
    $u = need_user();
    $room = find_room((string)(body()['code'] ?? ''));
    if ($room) {
      if ((int)$room['host_id'] === $u['id']) pdo()->prepare('DELETE FROM rooms WHERE id = ?')->execute([$room['id']]);
      else pdo()->prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?')->execute([$room['id'], $u['id']]);
    }
    out(['ok' => true]);
  }

  default: fail('Unknown action.', 404);
}

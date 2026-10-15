<?php
// Copy of config.sample.php with XAMPP defaults. Do NOT commit this file (it is in .gitignore).
return [
  'db' => ['host' => 'localhost', 'name' => 'sync_shot', 'user' => 'root', 'pass' => ''],
  // 'log'  = write the verification link to api/mail.log and show it on the home page (XAMPP / testing)
  // 'mail' = send a real email with PHP mail() (many free hosts block or limit this)
  'mail_mode' => 'log',
  'mail_from' => 'SYNC SHOT <no-reply@localhost>',
  // On a real host set this to your site address, e.g. 'https://syncshot.byet.org' (no trailing slash).
  'base_url' => '',
  // true on a real host: checks the email domain can receive mail. Needs internet access.
  'check_mx' => false,
  'max_photo_bytes' => 3 * 1024 * 1024,
  'max_photos_per_user' => 100,
];

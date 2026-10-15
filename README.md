# SYNC SHOT

Real-time photobooth website. Front end: plain HTML, CSS and JavaScript modules. Back end: PHP + MySQL.

## Run it on XAMPP (Windows)
1. Open the XAMPP Control Panel and start **Apache** and **MySQL**.
2. Copy this whole folder to `C:\xampp\htdocs\sync-shot`.
3. Open http://localhost/phpmyadmin, go to the **Import** tab, choose `sql/schema.sql`, and click Import. This creates the `sync_shot` database and its tables.
4. Open http://localhost/sync-shot/ . The camera works on `localhost`.

`api/config.php` already has the XAMPP defaults (user `root`, empty password). Change it if yours differ.

## Email verification
- **Test mode (default, `mail_mode` = `log`):** no email is sent. After sign-up the verification link appears on the home page and is written to `api/mail.log`.
- **Real hosting:** set `mail_mode` to `mail` and `base_url` to your site address in `api/config.php`. Many free hosts block `mail()`; if so, switch to SMTP later.
- Photos and Sync rooms only work for verified accounts.

## Putting it on a host (InfinityFree, etc.)
1. Create a MySQL database in the host's panel and import `sql/schema.sql` (delete its first two statements first).
2. Edit `api/config.php`: host, database name, user, password, `base_url`, `mail_mode`, and set `check_mx` to `true`.
3. Upload everything into `htdocs` over FTP. Keep the `uploads/` folder and its `.htaccess`.
4. Never commit `api/config.php` (it is in `.gitignore`).

## Structure
| Path | Purpose |
|---|---|
| `*.html`, `css/`, `js/` | The pages. `js/db.js` is the only file that talks to the server. |
| `api/auth.php` | Sign up, log in, log out, email verification |
| `api/photos.php` | Save, list, view and delete photos (stored in `uploads/`, private to the owner) |
| `api/rooms.php` | Sync rooms: create, join (max 2), frame choice, leave |
| `sql/schema.sql` | Database tables |

## Not built yet
Shared capture inside a Sync room (taking the sequence of photos together) and per-person window positions.

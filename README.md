# Пельменчук: сайт з адмінкою, замовленнями та онлайн-оплатою

Сайт (HTML/CSS/JS) лежить на GitHub Pages. Замовлення, меню, фото та вхід адміністратора працюють через **Supabase** (безкоштовний хмарний сервіс). Онлайн-оплата (Google Pay, Apple Pay, картка) йде через **WayForPay**.

Без налаштування Supabase сайт працює в демо-режимі: меню береться з `assets/js/data.js`, замовлення нікуди не надходять, адмінка не відкривається.

## 1. Завантажити сайт на GitHub (виправляє 404)

У корені репозиторію мають лежати **файли поруч із папкою `assets`**: `index.html`, `admin.html`, `privacy.html`, `robots.txt`, `sitemap.xml`, `README.md`, а також папки `assets` і `supabase`. Папки `css`, `img`, `js` у корені (якщо є) видаліть.

Add file → Upload files → перетягніть усе з розпакованого архіву → Commit. Settings → Pages → Deploy from a branch → `main` / `(root)`.

Адреса сайту: `https://WestWolf1994.github.io/Pelmenchyk/`. Адмінка: `.../Pelmenchyk/admin.html`.

## 2. Підключити Supabase (адмінка, замовлення, меню, фото)

1. Зареєструйтеся на supabase.com → **New project** (запам'ятайте пароль бази, регіон оберіть найближчий, напр. Frankfurt).
2. **SQL Editor → New query**: вставте весь вміст `supabase/schema.sql` → **Run**. Створяться таблиці, права доступу, сховище фото та стартове меню.
3. **Authentication → Users → Add user → Create new user**: ваш e-mail і надійний пароль (галочка Auto Confirm User). Відкрийте SQL Editor і виконайте, підставивши e-mail:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'ВАШ_EMAIL';
   ```
   Тільки той, кого додано в `admins`, потрапляє в адмінку.
4. **Authentication → Sign In / Providers (Email)**: вимкніть **Allow new users to sign up**, щоб ніхто сторонній не міг зареєструватися.
5. **Project Settings → API**: скопіюйте **Project URL** та ключ **anon / publishable**. Вставте в `assets/js/config.js`:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "ваш_anon_ключ",
   ```
   Ключ `service_role` сюди **не вставляйте**. Anon-ключ публічний за задумом, безпеку забезпечують правила доступу з `schema.sql`.
6. Збережіть `config.js` на GitHub. Через хвилину відкрийте `admin.html` і увійдіть.

### Що вміє адмінка
- **Замовлення**: список, ім'я, телефон, адреса, склад, сума, статус оплати; зміна статусу (нове → підтверджено → готується → виконано / скасовано); кнопка «Позначити оплаченим» для готівки; оновлюється кожні 20 с.
- **Меню**: додавання, редагування, видалення страв; назва, опис, ціна, вага, категорія, наявність; фото (завантаження файлу або посилання); керування категоріями.
- **Сайт**: телефон, Instagram/Telegram/Facebook, адреса, графік, тексти «Про нас».

Ціни при замовленні перераховуються на сервері з бази, тож підмінити їх у браузері не вийде.

## 3. Онлайн-оплата (Google Pay, Apple Pay) через WayForPay

Потрібен **акаунт WayForPay для вашого бізнесу (ФОП/ТОВ)** і підтверджений сайт. У кабінеті WayForPay увімкніть для вашого сайту Google Pay та Apple Pay (Apple Pay вимагає підтвердження домену в їхньому кабінеті).

1. Встановіть [Supabase CLI](https://supabase.com/docs/guides/cli) і виконайте в папці проєкту:
   ```
   supabase login
   supabase link --project-ref ВАШ_PROJECT_REF
   supabase secrets set WFP_MERCHANT_ACCOUNT=ваш_merchant WFP_SECRET_KEY=ваш_секретний_ключ WFP_DOMAIN=westwolf1994.github.io SITE_URL=https://WestWolf1994.github.io/Pelmenchyk/
   supabase functions deploy payment --no-verify-jwt
   ```
   `WFP_DOMAIN` має збігатися з доменом, який вказано в WayForPay.
2. У `assets/js/config.js` поставте `onlinePayment: true` і збережіть.
3. На сайті в оформленні з'явиться вибір «Онлайн (Google Pay, Apple Pay, картка)». Після оплати WayForPay повідомляє сервер, і замовлення в адмінці отримує статус «Оплачено».

Номери карток ми не бачимо й не зберігаємо: оплата відбувається на сторінці WayForPay.

Якщо ви використовуєте інший сервіс (Fondy, LiqPay, Stripe), потрібно переписати `supabase/functions/payment/index.ts` під його підпис.

## Важливо

- **Інтеграцію з Supabase та WayForPay я перевірив лише на імітації** (тестовий сервер з тими самими адресами запитів). На реальних сервісах вона не запускалась. Обов'язково зробіть тестове замовлення (готівка) і тестову оплату в режимі тестових карток WayForPay, перш ніж приймати справжні гроші.
- Фото страв, які я додав (`assets/img`), лежать на GitHub. Фото, завантажені з адмінки, зберігаються в Supabase Storage.
- Безкоштовний план Supabase призупиняє проєкт після тижня без активності. Зайдіть у кабінет і відновіть, якщо таке станеться.
- Тексти `privacy.html` та умови оплати/повернення перегляньте з юристом.
- Адресу `WestWolf1994/Pelmenchyk` уже вписано в `index.html`, `robots.txt`, `sitemap.xml`. Якщо змінете назву репозиторію, оновіть її там.

## Структура

```
index.html, admin.html, privacy.html
assets/css/        style.css, admin.css
assets/js/         config.js, api.js, data.js, illustrations.js, app.js, admin.js
assets/img/        фото, логотип, іконки
supabase/          schema.sql (база), functions/payment (оплата)
robots.txt, sitemap.xml, .nojekyll
```

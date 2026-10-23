# Hekpixle Website

وب‌سایت رسمی ایجنت **Hekpixle** — ایجنت هوش مصنوعی شخصی دسکتاپ، ساخته‌شده در ایران.

## ✨ امکانات

- 🎨 **تم دوگانه**: لایت مود (استخوانی/سیاه) و دارک مود (سیاه/استخوانی)
- 🎲 **هیرو سه‌بعدی**: لوگوی H ساخته‌شده از پیکسل‌های مکعبی + میدان ذرات با Three.js
- 👤 **سیستم ثبت‌نام/ورود**: هرکسی می‌تواند ثبت‌نام کند
- 🔐 **پنل مدیریت مبتنی بر ایمیل**: هرکسی با ایمیل ادمین (پیش‌فرض: `admin@hekpixle.ir`) ثبت‌نام کند، خودکار ادمین می‌شود
- 📦 **آپلود نسخه‌ی ایجنت**: ادمین می‌تواند فایل نصب‌کننده + توضیحات نسخه را آپلود کند
- ⬇️ **دانلود عمومی**: هر بازدیدکننده می‌تواند آخرین نسخه را دانلود کند
- 🌐 **راست‌چین (RTL)**: کاملاً فارسی، با فونت Vazirmatn
- 🗃️ **بدون دیتابیس خارجی**: ذخیره‌سازی JSON (فایل-based) — بدون نیاز به کامپایل native module

## 🚀 شروع به کار

### پیش‌نیازها
- Node.js نسخه ۱۶ یا بالاتر (برای `npm run watch` به ۱۸.۱۱+ نیاز دارید)

### نصب و اجرا

```bash
# 1. نصب پکیج‌ها (الزامی قبل از اجرا)
npm install

# 2. کپی فایل env و تنظیم آن
cp .env.example .env
# فایل .env را ویرایش کنید و ADMIN_EMAIL را به ایمیل خودتان تغییر دهید

# 3. اجرای سرور (یکی از سه حالت):
npm start          # اجرای عادی
npm run dev        # اجرای عادی (با pre-check)
npm run watch      # اجرا با auto-reload (نیاز به Node 18.11+)
```

سایت روی `http://localhost:3000` در دسترس خواهد بود.

> **اگه `npm run dev` خطا داد:** احتمالاً `npm install` رو اجرا نکردید. سرور خودش این رو تشخیص می‌ده و پیام واضح نمایش می‌ده. کافیه `npm install` بزنید و دوباره تلاش کنید.

### تنظیم ادمین

فایل `.env` را باز کنید و مقدار `ADMIN_EMAIL` را به ایمیل خودتان تغییر دهید:

```
ADMIN_EMAIL=your-email@example.com
JWT_SECRET=a-long-random-secret-please-change-this
```

سپس سرور را **ری‌استارت** کنید و در صفحهٔ `/register` با همان ایمیل (و یک رمز دلخواه) ثبت‌نام کنید. پسورد پیش‌فرضی وجود ندارد؛ رمز را خودتان هنگام ثبت‌نام تعیین می‌کنید.
اگر قبلاً با آن ایمیل ثبت‌نام کرده‌اید، کافی است وارد شوید (خودکار ادمین می‌شوید). اگر رمز را فراموش کرده‌اید:

```bash
npm run create-admin -- you@example.com رمز-جدید
```

کاربری که با ایمیل ادمین ثبت‌نام کند، دسترسی ادمین می‌گیرد و می‌تواند:
- فایل نصب‌کننده‌ی ایجنت را آپلود کند
- توضیحات نسخه (release notes) را وارد کند
- لیست کاربران ثبت‌نام‌شده را ببیند
- نسخه‌های قبلی را حذف کند

## 📁 ساختار پروژه

```
hekpixle-site/            ← همه‌چیز در یک پوشه، بدون زیرپوشه
├── server.js             # ورودی Express (فقط فایل‌های لیست‌شده عمومی‌اند)
├── auth-lib.js           # JWT + bcrypt        (قبلاً lib/auth.js)
├── db.js                 # ذخیره‌سازی JSON      (قبلاً lib/db.js)
├── middleware.js         # requireAuth / requireAdmin
├── auth-routes.js        # /api/auth/*         (قبلاً routes/auth.js)
├── agent-routes.js       # /api/agent          (قبلاً routes/agent.js)
├── admin-routes.js       # /api/admin/*        (قبلاً routes/admin.js)
├── check-deps.js         # چک وابستگی‌ها
├── create-admin.js       # ساخت/ریست ادمین
├── index.html  login.html  register.html  admin.html
├── api.js  theme.js  landing.js
├── auth-page.js          # اسکریپت صفحه‌های login/register (قبلاً js/auth.js)
├── admin-page.js         # اسکریپت پنل ادمین           (قبلاً js/admin.js)
├── tokens.css  base.css  landing.css  auth.css  admin.css
├── three.min.js
├── *.woff2               # فونت‌ها
├── hekpixle.json         # دیتابیس (خودکار ساخته می‌شود)
└── uploads/              # فایل‌های آپلودی (خودکار ساخته می‌شود)
```

> امنیت: چون فایل‌ها کنار هم‌اند، `server.js` فقط فایل‌های لیست‌شده در `PUBLIC_PAGES` / `PUBLIC_ASSETS` را سرو می‌کند؛ `.env`، کد سرور و دیتابیس هرگز در دسترس نیستند. اگر فایل استاتیک جدیدی اضافه کردید، اسمش را به آن لیست اضافه کنید.

## 🛠️ معماری

### بک‌اند (Node.js + Express)
- **JSON file storage** — ذخیره‌سازی ساده و قابل‌حمل (بدون نیاز به کامپایل native module)
- **JWT** در کوکی httpOnly برای امنیت (۷ روز اعتبار)
- **bcrypt** برای هش کردن رمز عبور
- **multer** برای آپلود فایل با محدودیت حجم و فیلتر پسوند
- **مسیرهای API**:
  - `POST /api/auth/register` — ثبت‌نام
  - `POST /api/auth/login` — ورود
  - `POST /api/auth/logout` — خروج
  - `GET /api/auth/me` — کاربر فعلی
  - `GET /api/agent` — متادیتای آخرین نسخه (عمومی)
  - `GET /api/agent/download` — دانلود فایل (عمومی)
  - `GET /api/admin/users` — لیست کاربران (ادمین)
  - `GET /api/admin/releases` — لیست نسخه‌ها (ادمین)
  - `POST /api/admin/upload` — آپلود نسخه (ادمین)
  - `DELETE /api/admin/releases/:id` — حذف نسخه (ادمین)

### فرانت‌اند (HTML/CSS/JS خالص)
- **بدون فریم‌ورک** — فقط HTML, CSS, JavaScript vanilla
- **Three.js** برای هیرو سه‌بعدی (لوکال، بدون CDN)
- **CSS Custom Properties** برای تم پویا (light/dark)
- **RTL** با `dir="rtl"` روی `<html>` و فونت Vazirmatn
- **drag-and-drop** برای آپلود فایل
- **localStorage** برای ذخیره‌ی تم انتخاب‌شده

### سیستم دسترسی
- **کاربر عادی**: می‌تواند ثبت‌نام کند، وارد شود، ایجنت را دانلود کند
- **ادمین**: اضافه بر کاربر عادی، به `/admin` دسترسی دارد و می‌تواند فایل آپلود کند
- **تشخیص ادمین**: بر اساس تطبیق ایمیل با `ADMIN_EMAIL` در `.env` (هنگام ثبت‌نام، فیلد `is_admin` در دیتابیس set می‌شود)

## 🎨 تم

متغیرهای تم در `tokens.css`:

| متغیر | لایت مود | دارک مود |
|---|---|---|
| `--bg` (پس‌زمینه) | `#ece7dc` (استخوانی) | `#0c0c0d` (سیاه) |
| `--text` (متن) | `#25282c` (طوسی مایل به سیاه) | `#ece7dc` (استخوانی) |
| `--accent` | `#25282c` (مشکی) | `#ece7dc` (استخوانی) |
| `--accent-text` | `#ece7dc` (استخوانی) | `#0c0c0d` (مشکی) |

## 🚀 deploy

برای deploy روی سرور:

```bash
# روی سرور
git clone <your-repo>
cd hekpixle-site
npm install --production
cp .env.example .env
# ویرایش .env با مقادیر واقعی (مخصوصاً JWT_SECRET و ADMIN_EMAIL)
npm start

# برای اجرای دائمی با PM2:
npm install -g pm2
pm2 start server.js --name hekpixle-site
pm2 save
pm2 startup
```

برای پشت Nginx (reverse proxy):

```nginx
server {
    listen 80;
    server_name hekpixle.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📝 یادداشت‌ها

- دیتابیس JSON در `data/hekpixle.json` ساخته می‌شود — برای backup همین فایل را کپی کنید
- فایل‌های آپلودشده در `uploads/` ذخیره می‌شوند
- برای production حتماً `NODE_ENV=production` تنظیم کنید تا کوکی‌ها secure شوند
- برای تغییر حجم آپلود، `MAX_UPLOAD_MB` را در `.env` تغییر دهید
- **اگه `npm run dev` خطا داد:** اول مطمئن شوید `npm install` رو اجرا کرده‌اید. سرور خودش این رو چک می‌کنه و پیام واضح می‌ده.
- **سه حالت اجرا:**
  - `npm start` — اجرای عادی
  - `npm run dev` — اجرای عادی (با pre-check وابستگی‌ها)
  - `npm run watch` — اجرا با auto-reload هنگام تغییر فایل‌ها (نیاز به Node 18.11+)

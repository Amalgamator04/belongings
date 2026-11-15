# Belongings

A React/Vite storefront backed by Django REST Framework for curated gifts and custom hampers.

## Development

### Environment files

The repository includes templates, not populated environment files: credentials and database passwords must stay local or in your hosting provider's secret environment. Copy `backend/.env.example` to `backend/.env` for Django, and copy `frontend/.env.example` to `frontend/.env.local` for Vite. Django loads `backend/.env` first; the root `.env` is supported only as a legacy fallback.

### Backend

From `backend`:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

For local development, the backend uses SQLite whenever `DATABASE_URL` is empty. To connect to PostgreSQL, set a non-empty `DATABASE_URL` in `backend/.env`; this takes precedence over the local SQLite fallback. With `DJANGO_DEBUG=false`, a non-empty `DATABASE_URL` is required. Run migrations after changing database settings. The API is available at `http://localhost:8000`. Create an administrator with `python manage.py createsuperuser`, then add catalog categories and products in the Django admin at `/admin/`. Builder-only selections are managed separately and do not appear in the public shop.

Set `EMAIL_HOST_PASSWORD` in the local `.env` to a Gmail App Password to send real mail; the backend removes formatting spaces from Gmail app passwords. Keep it private and do not commit it. Until configured, email delivery will fail explicitly in the checkout response; tests use Django's in-memory email backend.

To populate the development catalog, run `python manage.py seed_demo_catalog` from `backend`. The command is safe to rerun and creates 12 marked demo shop products plus 35 builder-only selection options. Builder-only items have no customer price and cannot be ordered until configured in Django admin. Replace or remove demo records before launch; they are not real inventory.

### Frontend

From `frontend`:

```powershell
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env.local` to the backend origin for local development. Production builds use `frontend/.env.production` by default; Vercel project environment variables override it. The API origin is public configuration, not a secret.

## Configuration

`DATABASE_URL` selects PostgreSQL; without it, local debug mode uses SQLite. `DJANGO_DEBUG=false` requires a non-development `DJANGO_SECRET_KEY` and a configured `DATABASE_URL`.

The product catalog is loaded from the API. Order totals are calculated from current database prices on the server; the browser's displayed totals are estimates only. Customers can adjust quantities or remove items from the checkout summary before submitting an order. New orders are created with payment status `pending`. Django sends an order-received email after the order is committed, including customer and delivery details, item quantities and totals, hamper selections, personalisation, and payment/order status. In development, it writes to the console; in production, it uses configured SMTP. JWT registration/login, profiles, saved addresses, owner-checked order history, and staff-only admin order management are available. Payment collection/verification, email verification/password reset, and other production readiness checks remain before accepting live orders.
The order email includes a signed, expiring tracking link for guest orders. Customers can also track signed-in orders from their account. The customer-facing progress uses three stages: Pending, Taken, and Delivered; cancellation is shown separately. Staff can use the protected admin dashboard to filter orders, change detailed fulfillment statuses, and review order counts, status breakdowns, and daily order-value charts.
Staff can manage categories and products from the storefront's **Manage products** page, including descriptions, price, images, stock, availability, and builder-only visibility.

## Implemented API routes

- `GET /api/`, `GET /api/categories/`
- `POST /api/newsletter/`
- `GET /api/products/` (search, category, price range, ordering, pagination)
- `GET /api/builder-items/` (builder-only selections without customer prices)
- `GET /api/products/{id}/` and `GET /api/products/{slug}/`
- `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/refresh/`, `POST /api/auth/logout/`
- `GET/PATCH /api/profile/`, `GET/POST /api/addresses/`
- `GET/POST /api/orders/` (authenticated order history; guest checkout creation)
- `GET /api/orders/{id}/` (owner or staff only)
- `GET /api/orders/track/?token=...` (signed guest-order tracking link)
- `GET /api/admin/orders/`, `GET /api/admin/dashboard/` (staff only; status, date, and search filters)
- `PATCH /api/admin/orders/{id}/status/` (staff only)
- `GET/POST /api/admin/categories/`, `GET/POST /api/admin/products/`, `GET/PATCH/DELETE /api/admin/products/{id}/` (staff only)

The Django admin provides catalog and order management. The API does not yet include Razorpay payment creation/webhook verification, password reset/email verification, coupon CRUD, or a full inventory API.

## Production deployment

The app is not ready to accept real paid orders yet: Razorpay verification/webhooks, password reset/email verification, reliable transactional email delivery, Cloudinary uploads, and production operations still need implementation and testing.

### Django API (Render or Railway)

1. Push the project to a Git provider and create a managed PostgreSQL database.
2. Create a Python web service with `backend` as its root directory.
3. Use build command: `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`.
4. Use start command: `gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`.
5. Add environment variables in the host dashboard (do not upload `.env`):
   - `DATABASE_URL`: the managed database's private/internal connection URL; on Render, use the database's **Internal Database URL**.
   - `DJANGO_SECRET_KEY`: generate a unique key with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`.
   - `DJANGO_DEBUG=false`
   - `DJANGO_ALLOWED_HOSTS=belongings-1.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://belongings-eight.vercel.app`
   - `CSRF_TRUSTED_ORIGINS=https://belongings-eight.vercel.app`
   - `FRONTEND_BASE_URL=https://belongings-eight.vercel.app`
   - `DJANGO_SECURE_SSL_REDIRECT=true`
   - `DJANGO_HSTS_SECONDS=31536000` (enable only after HTTPS is confirmed)
   - `EMAIL_HOST`, `EMAIL_PORT=587`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
   - `EMAIL_USE_TLS=true`, `EMAIL_USE_SSL=false`, `DEFAULT_FROM_EMAIL`
6. Run `python manage.py createsuperuser` from the provider's shell, then add real catalog records in `/admin/`.

The Django settings enable PostgreSQL, proxy-aware HTTPS, secure cookies, HSTS, and WhiteNoise static files when production mode is selected. Configure database backups with the database host.

Use the SMTP credentials/app password from your email provider. For Gmail, enable two-step verification and create an app password; use `smtp.gmail.com`, port `587`, and TLS. Put the app password only in the host's secret environment variable—never in Git or frontend variables. Local development uses Django's console mail backend, so the order email appears in the backend terminal.

### React storefront (Vercel)

1. Import the repository and set the project root to `frontend`.
2. Build command: `npm run build`; output directory: `dist`.
3. Set `VITE_API_BASE_URL=https://belongings-1.onrender.com` in the Vercel project environment, then redeploy. The same value is the default in `frontend/.env.production`.
4. Add the final Vercel domain to the Django `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` values.

## Checks

```powershell
Set-Location backend
python manage.py test
python manage.py check

Set-Location ..\frontend
npm run lint
npm run build
```

# Backend API Status

Last updated: 2026-04-16

## Live Route Groups

- Health
  - `GET /api/health`
- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/facebook/verify`
  - `GET /api/auth/me`
- Users
  - `POST /api/users`
  - `GET /api/users`
  - `GET /api/users/:id`
  - `PUT /api/users/:id`
  - `DELETE /api/users/:id`
- Platform posts
  - `/api/facebook-posts`
  - `/api/instagram-posts`
  - `/api/tiktok-posts`
  - `/api/linkedin-posts`
  - `/api/threads-posts`
  - `/api/x-posts`
  - `/api/youtube-posts`
  - `/api/pinterest-posts`
  - Each supports: list, create, scheduled list, detail, update, delete, schedule, publish
- OAuth
  - Facebook, Instagram, Threads, TikTok, LinkedIn, X, YouTube, Pinterest
  - Base: `/api/oauth/*`
- Scheduler
  - `POST /api/schedule`
  - `GET /api/schedule`
  - `GET /api/cron`

## Current Behavior

- JWT auth middleware protects private endpoints.
- Post `publish` routes currently update DB state to `published`.
- OAuth routes handle redirect + callback token exchange flow.

## DB Schema Coverage

Implemented post tables:

- `facebook_posts`
- `instagram_posts`
- `tiktok_posts`
- `linkedin_posts`
- `threads_posts`
- `x_posts`
- `youtube_posts`
- `pinterest_posts`

Also includes:

- `users` table
- indexes for `user_id` and scheduling lookup
- `updated_at` triggers

# Postman Guide (Backend)

Last updated: 2026-04-16

## Base Setup

- Base URL: `http://localhost:5000`
- JSON header: `Content-Type: application/json`
- Protected routes header: `Authorization: Bearer {{token}}`

## Suggested Environment Variables

```text
baseUrl=http://localhost:5000
token=
userId=
facebookPostId=
instagramPostId=
tiktokPostId=
linkedinPostId=
threadsPostId=
xPostId=
youtubePostId=
pinterestPostId=
```

## Auth Requests

- `POST {{baseUrl}}/api/auth/register`
- `POST {{baseUrl}}/api/auth/login`
- `POST {{baseUrl}}/api/auth/forgot-password`
- `GET {{baseUrl}}/api/auth/me`

Save token from login/register in `{{token}}`.

## User Requests

- `POST {{baseUrl}}/api/users`
- `GET {{baseUrl}}/api/users`
- `GET {{baseUrl}}/api/users/{{userId}}`
- `PUT {{baseUrl}}/api/users/{{userId}}`
- `DELETE {{baseUrl}}/api/users/{{userId}}`

## Platform Post Requests

Use the same CRUD/schedule/publish pattern for each base:

- `{{baseUrl}}/api/facebook-posts`
- `{{baseUrl}}/api/instagram-posts`
- `{{baseUrl}}/api/tiktok-posts`
- `{{baseUrl}}/api/linkedin-posts`
- `{{baseUrl}}/api/threads-posts`
- `{{baseUrl}}/api/x-posts`
- `{{baseUrl}}/api/youtube-posts`
- `{{baseUrl}}/api/pinterest-posts`

Available operations per platform:

- `GET /`
- `POST /`
- `GET /scheduled`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `POST /:id/schedule`
- `POST /:id/publish`

### Example Create Body

```json
{
  "title": "Campaign Post",
  "caption": "Caption is required",
  "media_url": "https://example.com/image.jpg",
  "platform_account_id": "acct-001",
  "scheduled_at": "2026-04-20T10:00:00.000Z",
  "ai_prompt": "Generate social copy",
  "metadata": {
    "campaign": "q2"
  }
}
```

### Example Schedule Body

```json
{
  "scheduled_at": "2026-04-22T09:30:00.000Z"
}
```

### Example Publish Body

```json
{
  "published_at": "2026-04-22T09:35:00.000Z",
  "platform_account_id": "acct-001"
}
```

## OAuth Requests

- `GET {{baseUrl}}/api/oauth/facebook`
- `GET {{baseUrl}}/api/oauth/instagram`
- `GET {{baseUrl}}/api/oauth/threads`
- `GET {{baseUrl}}/api/oauth/tiktok`
- `GET {{baseUrl}}/api/oauth/linkedin`
- `GET {{baseUrl}}/api/oauth/x`
- `GET {{baseUrl}}/api/oauth/youtube`
- `GET {{baseUrl}}/api/oauth/pinterest`

Callback endpoints are handled by the backend and called by providers.

## Scheduler Requests

- `POST {{baseUrl}}/api/schedule` (protected)
- `GET {{baseUrl}}/api/schedule` (protected)
- `GET {{baseUrl}}/api/cron` (Vercel cron/manual trigger)

### Schedule Create Body

```json
{
  "platform": "pinterest",
  "content": {
    "title": "My Pin Title",
    "description": "Pin description here",
    "media_url": "https://example.com/pin.jpg"
  },
  "scheduled_at": "2026-04-22T09:30:00.000Z"
}
```

Notes:

- `scheduled_at` must include timezone (`Z` or `+00:00`)
- New items are stored with `status = "pending"`
- Cron endpoint processes due `pending` jobs in batches (default `10`)

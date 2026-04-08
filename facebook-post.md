# Facebook Post API Guide

This file focuses on creating, scheduling, and publishing a Facebook post from the backend API.

## 1. Login First

`POST /api/auth/login`

```json
{
  "email": "admin@paintoutlet.ai",
  "password": "Password123!"
}
```

Copy the returned JWT token and send it as:

```http
Authorization: Bearer YOUR_TOKEN_HERE
```

## 2. Create A Facebook Post

`POST /api/facebook-posts`

```json
{
  "title": "Paint Outlet Product Feature",
  "caption": "This Facebook post is ready for AI-assisted scheduling and autonomous publishing.",
  "media_url": "https://example.com/media/facebook-post.jpg",
  "platform_account_id": "fb-page-001",
  "scheduled_at": "2026-03-29T09:30:00.000Z",
  "ai_prompt": "Write an engaging Facebook caption for a product feature launch.",
  "metadata": {
    "campaign": "product-feature",
    "tags": ["launch", "paint", "automation"]
  }
}
```

Expected response:

```json
{
  "id": "generated-post-id",
  "user_id": "your-user-id",
  "title": "Paint Outlet Product Feature",
  "caption": "This Facebook post is ready for AI-assisted scheduling and autonomous publishing.",
  "media_url": "https://example.com/media/facebook-post.jpg",
  "platform_account_id": "fb-page-001",
  "status": "scheduled",
  "scheduled_at": "2026-03-29T09:30:00.000Z",
  "published_at": null,
  "ai_prompt": "Write an engaging Facebook caption for a product feature launch.",
  "metadata": {
    "campaign": "product-feature",
    "tags": ["launch", "paint", "automation"]
  }
}
```

## 3. Schedule An Existing Facebook Post

Use this when a post already exists as `draft`.

`POST /api/facebook-posts/:id/schedule`

```json
{
  "scheduled_at": "2026-03-29T11:00:00.000Z"
}
```

## 4. Publish A Facebook Post

Use this when you want to mark the content as published.

`POST /api/facebook-posts/:id/publish`

```json
{
  "published_at": "2026-03-29T11:05:00.000Z",
  "platform_account_id": "fb-page-001"
}
```

## 5. Get Scheduled Facebook Posts

`GET /api/facebook-posts/scheduled`

## 6. Update Facebook Post

`PUT /api/facebook-posts/:id`

```json
{
  "caption": "Updated Facebook caption after AI refinement.",
  "metadata": {
    "campaign": "product-feature",
    "objective": "engagement"
  }
}
```

## 7. Delete Facebook Post

`DELETE /api/facebook-posts/:id`

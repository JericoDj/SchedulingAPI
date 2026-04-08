# Postman Testing Guide

This file gives you ready-to-use API requests for the Express backend in this project.

## Base Setup

- Base URL: `http://localhost:5000`
- Headers for JSON requests:

```http
Content-Type: application/json
```

- Protected routes also need:

```http
Authorization: Bearer {{token}}
```

## Recommended Postman Environment Variables

Create a Postman environment with these values:

```text
baseUrl = http://localhost:5000
token = 
userId = 
instagramPostId = 
facebookPostId = 
tiktokPostId = 
linkedinPostId = 
```

## 1. Register User

`POST {{baseUrl}}/api/auth/register`

```json
{
  "name": "Paint Outlet Admin",
  "email": "admin@paintoutlet.ai",
  "password": "Password123!",
  "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
}
```

Save the returned `token` and `user.id` into your Postman environment.

## 2. Login User

`POST {{baseUrl}}/api/auth/login`

```json
{
  "email": "admin@paintoutlet.ai",
  "password": "Password123!"
}
```

## 3. Get Current User

`GET {{baseUrl}}/api/auth/me`

## 4. Create User

`POST {{baseUrl}}/api/users`

```json
{
  "name": "Scheduler User",
  "email": "scheduler@paintoutlet.ai",
  "password": "Password123!",
  "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
}
```

## 5. Get Users

`GET {{baseUrl}}/api/users`

## 6. Get User By ID

`GET {{baseUrl}}/api/users/{{userId}}`

## 7. Update User

`PUT {{baseUrl}}/api/users/{{userId}}`

```json
{
  "name": "Paint Outlet Updated User",
  "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80"
}
```

## 8. Delete User

`DELETE {{baseUrl}}/api/users/{{userId}}`

## 9. Create Instagram Post

`POST {{baseUrl}}/api/instagram-posts`

```json
{
  "title": "New Spring Colors",
  "caption": "Fresh paint inspiration for spring launches.",
  "media_url": "https://example.com/media/instagram-spring.jpg",
  "platform_account_id": "ig-account-001",
  "scheduled_at": "2026-03-25T09:00:00.000Z",
  "ai_prompt": "Create a vibrant Instagram caption for a spring paint campaign.",
  "metadata": {
    "hashtags": ["paint", "spring", "brandlaunch"],
    "cta": "Shop the collection"
  }
}
```

## 10. Create Facebook Post

`POST {{baseUrl}}/api/facebook-posts`

```json
{
  "title": "Weekend Promo",
  "caption": "Our AI assistant prepared this Facebook promo post for the weekend campaign.",
  "media_url": "https://example.com/media/facebook-promo.jpg",
  "platform_account_id": "fb-page-001",
  "scheduled_at": "2026-03-26T12:30:00.000Z",
  "ai_prompt": "Write a conversion-focused Facebook caption for a paint promo.",
  "metadata": {
    "campaign": "weekend-promo",
    "objective": "engagement"
  }
}
```

## 11. Create TikTok Post

`POST {{baseUrl}}/api/tiktok-posts`

```json
{
  "title": "Behind The Scenes",
  "caption": "Watch the paint transformation from prep to final coat.",
  "media_url": "https://example.com/media/tiktok-bts.mp4",
  "platform_account_id": "tt-account-001",
  "scheduled_at": "2026-03-27T15:00:00.000Z",
  "ai_prompt": "Create a short TikTok caption with a strong hook.",
  "metadata": {
    "duration_seconds": 22,
    "sound": "trending-audio-01"
  }
}
```

## 12. Create LinkedIn Post

`POST {{baseUrl}}/api/linkedin-posts`

```json
{
  "title": "AI Scheduling Platform",
  "caption": "We are building an AI workflow that schedules and publishes branded content autonomously.",
  "media_url": "https://example.com/media/linkedin-product.png",
  "platform_account_id": "li-company-001",
  "scheduled_at": "2026-03-28T08:00:00.000Z",
  "ai_prompt": "Write a professional LinkedIn post about social automation.",
  "metadata": {
    "audience": "b2b",
    "topic": "automation"
  }
}
```

Save each response `id` into the matching Postman variable.

## 13. Get All Posts Per Platform

- `GET {{baseUrl}}/api/instagram-posts`
- `GET {{baseUrl}}/api/facebook-posts`
- `GET {{baseUrl}}/api/tiktok-posts`
- `GET {{baseUrl}}/api/linkedin-posts`

## 14. Get Scheduled Posts Per Platform

- `GET {{baseUrl}}/api/instagram-posts/scheduled`
- `GET {{baseUrl}}/api/facebook-posts/scheduled`
- `GET {{baseUrl}}/api/tiktok-posts/scheduled`
- `GET {{baseUrl}}/api/linkedin-posts/scheduled`

## 15. Get One Post Per Platform

- `GET {{baseUrl}}/api/instagram-posts/{{instagramPostId}}`
- `GET {{baseUrl}}/api/facebook-posts/{{facebookPostId}}`
- `GET {{baseUrl}}/api/tiktok-posts/{{tiktokPostId}}`
- `GET {{baseUrl}}/api/linkedin-posts/{{linkedinPostId}}`

## 16. Update One Post Per Platform

Example for Facebook:

`PUT {{baseUrl}}/api/facebook-posts/{{facebookPostId}}`

```json
{
  "caption": "Updated Facebook caption generated for a stronger campaign result.",
  "status": "draft",
  "metadata": {
    "campaign": "weekend-promo",
    "objective": "traffic"
  }
}
```

Use the same payload style for Instagram, TikTok, and LinkedIn by changing the path.

## 17. Schedule A Post

These routes mark a post as `scheduled`.

- `POST {{baseUrl}}/api/instagram-posts/{{instagramPostId}}/schedule`
- `POST {{baseUrl}}/api/facebook-posts/{{facebookPostId}}/schedule`
- `POST {{baseUrl}}/api/tiktok-posts/{{tiktokPostId}}/schedule`
- `POST {{baseUrl}}/api/linkedin-posts/{{linkedinPostId}}/schedule`

Body:

```json
{
  "scheduled_at": "2026-03-30T10:00:00.000Z"
}
```

## 18. Publish A Post

These routes mark a post as `published`.

- `POST {{baseUrl}}/api/instagram-posts/{{instagramPostId}}/publish`
- `POST {{baseUrl}}/api/facebook-posts/{{facebookPostId}}/publish`
- `POST {{baseUrl}}/api/tiktok-posts/{{tiktokPostId}}/publish`
- `POST {{baseUrl}}/api/linkedin-posts/{{linkedinPostId}}/publish`

Body:

```json
{
  "published_at": "2026-03-30T10:05:00.000Z",
  "platform_account_id": "connected-account-001"
}
```

## 19. Delete A Post

- `DELETE {{baseUrl}}/api/instagram-posts/{{instagramPostId}}`
- `DELETE {{baseUrl}}/api/facebook-posts/{{facebookPostId}}`
- `DELETE {{baseUrl}}/api/tiktok-posts/{{tiktokPostId}}`
- `DELETE {{baseUrl}}/api/linkedin-posts/{{linkedinPostId}}`

## Suggested Postman Test Script For Login/Register

Put this in the Tests tab for login or register requests:

```javascript
const response = pm.response.json();

if (response.token) {
  pm.environment.set('token', response.token);
}

if (response.user && response.user.id) {
  pm.environment.set('userId', response.user.id);
}
```

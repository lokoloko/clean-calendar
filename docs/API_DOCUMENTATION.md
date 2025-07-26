# Clean Calendar API Documentation

## Overview
Clean Calendar API provides endpoints for managing cleaning schedules, listings, cleaners, and assignments.

## Authentication
Currently using development mode with a mock user ID. Production will use Supabase Auth with JWT tokens.

### Headers
```
Authorization: Bearer <token> (future)
Content-Type: application/json
```

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Endpoints

### Health Check

#### `GET /api/health`
General health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00Z",
  "environment": "production",
  "version": "0.1.0",
  "checks": {
    "database": "healthy (15ms)",
    "memory": "healthy (45MB/512MB)"
  },
  "uptime": 3600
}
```

#### `GET /api/health/ready`
Readiness probe - checks if app is ready to receive traffic.

#### `GET /api/health/live`
Liveness probe - checks if app is alive.

---

### Listings

#### `GET /api/listings`
Get all listings for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Beach House",
    "ics_url": "https://airbnb.com/calendar/ical/...",
    "cleaning_fee": 150,
    "timezone": "America/New_York",
    "is_active_on_airbnb": true,
    "created_at": "2024-01-20T10:00:00Z"
  }
]
```

#### `POST /api/listings`
Create a new listing.

**Request Body:**
```json
{
  "name": "Beach House",
  "ics_url": "https://airbnb.com/calendar/ical/...",
  "cleaning_fee": 150,
  "timezone": "America/New_York"
}
```

#### `PUT /api/listings/[id]`
Update a listing.

#### `DELETE /api/listings/[id]`
Delete a listing.

#### `POST /api/listings/[id]/sync`
Sync calendar data from Airbnb for a specific listing.

---

### Cleaners

#### `GET /api/cleaners`
Get all cleaners.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "created_at": "2024-01-20T10:00:00Z"
  }
]
```

#### `POST /api/cleaners`
Create a new cleaner.

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com"
}
```

---

### Schedule

#### `GET /api/schedule`
Get cleaning schedule with optional filters.

**Query Parameters:**
- `cleaner_id` - Filter by cleaner
- `listing_id` - Filter by listing
- `date_from` - Start date (YYYY-MM-DD)
- `date_to` - End date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "uuid",
    "listing_id": "uuid",
    "listing_name": "Beach House",
    "cleaner_id": "uuid",
    "cleaner_name": "John Doe",
    "check_in": "2024-01-20",
    "check_out": "2024-01-25",
    "checkout_time": "11:00",
    "status": "confirmed",
    "guest_name": "Jane Smith",
    "notes": "Late checkout requested"
  }
]
```

#### `PATCH /api/schedule/[id]`
Update a schedule item (status or cleaner assignment).

**Request Body:**
```json
{
  "status": "completed",
  "cleaner_id": "new-cleaner-uuid"
}
```

---

### Assignments

#### `GET /api/assignments`
Get all cleaner-listing assignments.

#### `POST /api/assignments`
Create a new assignment.

**Request Body:**
```json
{
  "listing_id": "uuid",
  "cleaner_id": "uuid"
}
```

---

### Manual Schedules

#### `POST /api/manual-schedules/one-time`
Create a one-time manual cleaning.

**Request Body:**
```json
{
  "listing_id": "uuid",
  "cleaner_id": "uuid",
  "check_out": "2024-01-25",
  "checkout_time": "11:00",
  "notes": "Deep clean requested"
}
```

---

### Schedule Sharing

#### `POST /api/schedule/share`
Create a shareable link for schedules.

**Request Body:**
```json
{
  "name": "January Schedule",
  "cleaner_id": "uuid",
  "listing_ids": ["uuid1", "uuid2"],
  "date_from": "2024-01-01",
  "date_to": "2024-01-31",
  "expires_in_days": 30
}
```

**Response:**
```json
{
  "token": "share-token",
  "url": "https://your-domain.com/share/share-token",
  "expires_at": "2024-02-20T10:00:00Z"
}
```

---

### Cleaner Authentication

#### `POST /api/cleaner/auth/send-code`
Send SMS verification code to cleaner.

**Request Body:**
```json
{
  "phone_number": "+1234567890"
}
```

#### `POST /api/cleaner/auth/verify`
Verify SMS code and create session.

**Request Body:**
```json
{
  "phone_number": "+1234567890",
  "code": "123456"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API rate limits (when implemented):
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

## Webhooks (Future)

Planned webhook events:
- `booking.created` - New booking from Airbnb
- `booking.cancelled` - Booking cancelled
- `cleaning.completed` - Cleaner marked cleaning as complete

## SDK Support

TypeScript types are available in `/src/types/api.ts`
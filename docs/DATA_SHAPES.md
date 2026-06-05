# Data Shapes

Reference examples of every implemented API response shape. One example per endpoint.

---

## Health

### `GET /health`

```json
{
  "ok": true,
  "db": "connected",
  "uptime": 42.3
}
```

---

## Auth

### `GET /api/v1/auth/me`

```json
{
  "id": "clxyz123",
  "email": "dev@iiitdmj.ac.in",
  "name": "Dev User",
  "picture": null,
  "phone": null,
  "thumbsUp": 0,
  "thumbsDown": 0
}
```

### `POST /api/v1/auth/dev-login`

```json
{ "id": "clxyz123", "email": "dev@iiitdmj.ac.in", "name": "Dev User" }
```

---

## Rides

### `POST /api/v1/rides` → 201

```json
{
  "id": "clride01",
  "posterId": "clxyz123",
  "direction": "FROM_CAMPUS",
  "otherPoint": "RAILWAY_STATION",
  "departureTime": "2026-05-24T10:00:00.000Z",
  "seatsTotal": 3,
  "seatsAvailable": 2,
  "farePerHead": 50,
  "notes": null,
  "status": "OPEN",
  "createdAt": "2026-05-24T06:00:00.000Z",
  "updatedAt": "2026-05-24T06:00:00.000Z",
  "deletedAt": null
}
```

### `GET /api/v1/rides/:id`

```json
{
  "id": "clride01",
  "direction": "FROM_CAMPUS",
  "otherPoint": "RAILWAY_STATION",
  "departureTime": "2026-05-24T10:00:00.000Z",
  "seatsTotal": 3,
  "seatsAvailable": 2,
  "farePerHead": 50,
  "notes": null,
  "status": "OPEN",
  "createdAt": "2026-05-24T06:00:00.000Z",
  "poster": {
    "id": "clxyz123",
    "name": "Dev User",
    "picture": null,
    "thumbsUp": 0,
    "thumbsDown": 0
  },
  "participants": [
    {
      "userId": "clxyz123",
      "joinedAt": "2026-05-24T06:00:00.000Z",
      "user": { "id": "clxyz123", "name": "Dev User", "picture": null, "thumbsUp": 0, "thumbsDown": 0 }
    }
  ],
  "matches": [
    { "id": "clmatch1", "intentId": "clint01", "posterConfirmed": false, "seekerConfirmed": false, "createdAt": "2026-05-24T06:01:00.000Z" }
  ]
}
```

### `DELETE /api/v1/rides/:id`

```json
{ "ok": true }
```

### `POST /api/v1/rides/:id/join`

Same shape as `POST /api/v1/rides` response (the updated ride row).

### `DELETE /api/v1/rides/:id/leave`

```json
{ "ok": true }
```

---

## Intents

### `POST /api/v1/intents` → 201

```json
{
  "id": "clint01",
  "userId": "clxyz456",
  "direction": "FROM_CAMPUS",
  "otherPoint": "RAILWAY_STATION",
  "earliestTime": "2026-05-24T08:00:00.000Z",
  "latestTime": "2026-05-24T11:00:00.000Z",
  "maxFare": 80,
  "active": true,
  "createdAt": "2026-05-24T06:00:00.000Z"
}
```

### `GET /api/v1/intents`

Array of active intents for the current user, each with a `matchCount` field:

```json
[
  {
    "id": "clint01",
    "userId": "clxyz456",
    "direction": "FROM_CAMPUS",
    "otherPoint": "RAILWAY_STATION",
    "earliestTime": "2026-05-24T08:00:00.000Z",
    "latestTime": "2026-05-24T11:00:00.000Z",
    "maxFare": 80,
    "active": true,
    "createdAt": "2026-05-24T06:00:00.000Z",
    "matchCount": 2
  }
]
```

### `DELETE /api/v1/intents/:id`

```json
{ "ok": true }
```

---

## Matches

### `GET /api/v1/matches`

```json
[
  {
    "id": "clmatch1",
    "rideId": "clride01",
    "intentId": "clint01",
    "posterConfirmed": false,
    "seekerConfirmed": false,
    "myRole": "poster",
    "createdAt": "2026-05-24T06:01:00.000Z",
    "ride": {
      "id": "clride01",
      "direction": "FROM_CAMPUS",
      "otherPoint": "RAILWAY_STATION",
      "departureTime": "2026-05-24T10:00:00.000Z",
      "seatsTotal": 3,
      "seatsAvailable": 2,
      "farePerHead": 50,
      "notes": null,
      "status": "OPEN"
    },
    "otherUser": {
      "id": "clxyz456",
      "name": "Alice",
      "picture": null,
      "thumbsUp": 3,
      "thumbsDown": 0
    }
  }
]
```

Note: `otherUser.phone` is only included when both `posterConfirmed` and `seekerConfirmed` are `true`.

### `POST /api/v1/matches/:id/confirm`

```json
{
  "id": "clmatch1",
  "rideId": "clride01",
  "intentId": "clint01",
  "posterConfirmed": true,
  "seekerConfirmed": false,
  "createdAt": "2026-05-24T06:01:00.000Z"
}
```

### `DELETE /api/v1/matches/:id`

```json
{ "ok": true }
```

---

## Ratings

### `POST /api/v1/ratings` → 201

```json
{
  "id": "clrating1",
  "fromUserId": "clxyz123",
  "toUserId": "clxyz456",
  "rideId": "clride01",
  "thumbsUp": true,
  "createdAt": "2026-05-24T12:00:00.000Z"
}
```

---

## Users

### `GET /api/v1/users/:id`

```json
{
  "id": "clxyz456",
  "name": "Alice",
  "picture": null,
  "thumbsUp": 3,
  "thumbsDown": 0,
  "createdAt": "2026-05-01T00:00:00.000Z"
}
```

Note: `email` and `phone` are never included in this response.

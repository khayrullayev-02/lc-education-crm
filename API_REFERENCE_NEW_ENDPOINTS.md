# CRM Backend API - New Endpoints Quick Reference

## Summary
All missing endpoints are now implemented and ready for use. These are the 4 critical features required by the frontend.

---

## 1. Close Group Endpoint

**Endpoint:** `PATCH /api/groups/{id}/close`

**Purpose:** Close a group to prevent new students from being added

**Example Request:**
```bash
curl -X PATCH https://api.example.com/api/groups/6970716601829c5a5e678453/close \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Success Response (200 OK):**
```json
{
  "_id": "6970716601829c5a5e678453",
  "name": "Frontend Basics - Group A",
  "isClosed": true,
  "message": "Guruh muvaffaqiyatli yopildi. Yangi o'quvchi qo'shib bo'lmaydi."
}
```

**Error Responses:**
- `400` - Invalid group ID format
- `404` - Group not found
- `403` - Unauthorized (not Director/Manager/Admin)

**Authorization:** Director, Manager, Admin

---

## 2. Transfer Student Endpoint

**Endpoint:** `POST /api/students/{id}/transfer`

**Purpose:** Move a student from one group to another

**Example Request:**
```bash
curl -X POST https://api.example.com/api/students/69703f8b9c36d8287db3f0a1/transfer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group": "6970716601829c5a5e678453"
  }'
```

**Request Body:**
```json
{
  "group": "new_group_id_here"
}
```

**Success Response (200 OK):**
```json
{
  "_id": "69703f8b9c36d8287db3f0a1",
  "firstName": "Ali",
  "lastName": "Karimov",
  "group": {
    "_id": "6970716601829c5a5e678453",
    "name": "Frontend Basics - Group B"
  },
  "previousGroup": {
    "_id": "6970716601829c5a5e678454",
    "name": "Frontend Basics - Group A"
  },
  "message": "O'quvchi muvaffaqiyatli boshqa guruhga o'tkazildi"
}
```

**Error Responses:**
- `400` - New group not found or is closed
- `404` - Student not found
- `403` - Unauthorized (not Director/Manager/Teacher/Admin for that group)

**Authorization:** Director, Manager, Admin, Teacher (own group only)

**Business Logic:**
- Cannot transfer to a closed group
- Automatically updates student counts
- Records both old and new group info

---

## 3. Edit Payment Endpoint

**Endpoint:** `PATCH /api/payments/{id}`

**Purpose:** Edit a payment record (amount, date, type, note)

**Example Request:**
```bash
curl -X PATCH https://api.example.com/api/payments/60d5ec49c1234567890abc12 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 600000,
    "date": "2024-01-15",
    "type": "bank_transfer",
    "note": "Payment for January"
  }'
```

**Request Body (all fields optional):**
```json
{
  "amount": 600000,          // Payment amount
  "date": "2024-01-15",      // Format: YYYY-MM-DD
  "type": "cash",            // Type of payment
  "note": "Any notes"        // Optional notes
}
```

**Success Response (200 OK):**
```json
{
  "_id": "60d5ec49c1234567890abc12",
  "student": {
    "_id": "69703f8b9c36d8287db3f0a1",
    "firstName": "Ali",
    "lastName": "Karimov"
  },
  "group": {
    "_id": "6970716601829c5a5e678453",
    "name": "Frontend Basics - Group A"
  },
  "amount": 600000,
  "type": "bank_transfer",
  "paymentDate": "2024-01-15T00:00:00.000Z",
  "note": "Payment for January",
  "updatedAt": "2024-01-22T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid date format (must be YYYY-MM-DD)
- `404` - Payment not found
- `403` - Unauthorized (not Director/Manager/Admin)

**Authorization:** Director, Manager, Admin

**Features:**
- Automatically recalculates student debt if amount changes
- Validates date format
- Updates timestamp

---

## 4. Get Attendance Table Endpoint

**Endpoint:** `GET /api/attendance/table/{groupId}?month=YYYY-MM`

**Purpose:** Get attendance table with monthly breakdown

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/attendance/table/6970716601829c5a5e678453?month=2024-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
- `month` (optional): Format YYYY-MM (e.g., "2024-01")

**Success Response (200 OK):**
```json
{
  "students": [
    {
      "studentId": "69703f8b9c36d8287db3f0a1",
      "fullName": "Ali Karimov",
      "attendance": {
        "2024-01-10": {
          "status": "present",
          "reason": ""
        },
        "2024-01-11": {
          "status": "absent",
          "reason": "Illness"
        },
        "2024-01-12": {
          "status": "present",
          "reason": ""
        }
      }
    },
    {
      "studentId": "69703f8b9c36d8287db3f0a2",
      "fullName": "Zarina Nasirova",
      "attendance": {
        "2024-01-10": {
          "status": "present",
          "reason": ""
        },
        "2024-01-11": {
          "status": "present",
          "reason": ""
        },
        "2024-01-12": {
          "status": "absent",
          "reason": "Vacation"
        }
      }
    }
  ],
  "month": "2024-01",
  "totalDays": 31
}
```

**Error Responses:**
- `404` - Group not found
- `403` - Unauthorized (not Teacher of group or Admin/Director/Manager)

**Authorization:** Teacher (own group), Director, Manager, Admin

**Response Fields:**
- `students` - Array of students with their attendance records
- `month` - The month in YYYY-MM format
- `totalDays` - Total number of days in the month

---

## Important Implementation Notes

### Group Closure Behavior
- When a group is closed (`isClosed: true`):
  - ✅ Existing students remain in the group
  - ❌ New students cannot be added
  - ✅ Students can be transferred out
  - ✅ Closed group appears in listings

### Student Transfer
- Automatically updates:
  - Student's group reference
  - Old group's student count (-1)
  - New group's student count (+1)
- Cannot transfer to a closed group
- Both old and new group info returned in response

### Payment Updates
- Changing the payment amount automatically adjusts student debt
- Date format must be YYYY-MM-DD
- All fields are optional (only specified fields are updated)

### Attendance Table
- Returns only active students (status ≠ 'Dropped')
- Month calculated as:
  - From query parameter if provided
  - From first attendance record if not
  - null if no month or records available
- Total days calculated based on calendar month

---

## Common Error Codes

| Status | Error | Solution |
|--------|-------|----------|
| 400 | "Guruh yopilgan" | Cannot add/transfer to closed group |
| 404 | "topilmadi" (not found) | Check ID format and existence |
| 403 | "Sizga ruxsat berilmagan" | Check user role/authorization |
| 400 | "Sana formati noto'g'ri" | Use YYYY-MM-DD format for dates |

---

## Migration Guide from Old API

If migrating from previous endpoints:

```javascript
// OLD: PUT /api/students/:id (for transfer)
// NEW: POST /api/students/:id/transfer
const transferStudent = async (studentId, newGroupId) => {
  const response = await fetch(`/api/students/${studentId}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group: newGroupId })
  });
  return response.json();
};

// NEW: Attendance format includes month and totalDays
const getAttendance = async (groupId, month) => {
  const response = await fetch(`/api/attendance/table/${groupId}?month=${month}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  // Now includes: data.month, data.totalDays, data.students
  return data;
};
```

---

## Testing the Endpoints

### Using Postman/Insomnia:

1. **Close Group:**
   - Method: `PATCH`
   - URL: `/api/groups/{groupId}/close`
   - Auth: Bearer token
   - Body: Empty

2. **Transfer Student:**
   - Method: `POST`
   - URL: `/api/students/{studentId}/transfer`
   - Auth: Bearer token
   - Body: `{ "group": "newGroupId" }`

3. **Edit Payment:**
   - Method: `PATCH`
   - URL: `/api/payments/{paymentId}`
   - Auth: Bearer token
   - Body: Partial update fields

4. **Get Attendance:**
   - Method: `GET`
   - URL: `/api/attendance/table/{groupId}?month=2024-01`
   - Auth: Bearer token

---

**All endpoints ready for production use as of January 22, 2026**

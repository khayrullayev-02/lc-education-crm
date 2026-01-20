# Vue 3 Frontend Development Prompt

SEN senior Vue 3 developer (Composition API). Menda backend Node/Express tayyor va to'liq RBAC bilan himoyalangan. Frontend Vue'da barcha modullarni ADMIN PANEL ko'rinishida chiqaring va APIga ulang.

## Base URL
```
API_URL = http://localhost:8080
```

## Auth (Token Management)
- **Login**: `POST /api/users/login`
  - Body: `{ "identifier": "username_or_email", "password": "..." }`
  - Response: `{ token, role, _id, firstName, lastName, username, email }`
- **Profile**: `GET /api/users/profile` (Authorization: Bearer <token>)
- **Token Storage**: `localStorage.setItem('token', token)`
- **Token Header**: Har bir protected requestda `Authorization: Bearer <token>`
- **401 Handling**: 401 bo'lsa tokenni o'chirib `/login` ga redirect

## Tech Stack Requirements
- Vue 3 + Composition API
- Vue Router (route guards bilan)
- Pinia (state management)
- Axios (API calls)
- Axios instance: baseURL=API_URL, request interceptor token qo'shsin
- Loading/error UI bo'lsin
- Responsive design

## ROLE-Based Access Control (RBAC)

### Director/Admin
- **Hammasini ko'ra oladi**: Groups, Students, Teachers, Managers, Payments, Attendance, Finance, Stats, Notifications

### Manager
- **Ko'ra oladi**: Finance, Attendance, Notifications, Payments, Groups (read), Students (read)
- **Yozib qo'ya oladi**: Attendance, Payments

### Teacher
- **Faqat o'z guruhlarini/o'quvchilarini ko'radi** (backend avtomatik filter qiladi)
- **Ko'ra oladi**: O'z guruhlari, O'z guruhlaridagi o'quvchilar, O'z guruhlarining attendance, O'z guruhlaridagi payments, Notifications, O'z statistikasi
- **Yozib qo'ya oladi**: O'z guruhlariga attendance, O'z guruhlaridagi o'quvchilar uchun payment

### Student
- **Faqat**: Notifications (read-only), O'zining paymentlarini ko'rish (agar backend ruxsat bersa)

**Muhim**: Menu va route guard role bo'yicha ishlasin. Teacher uchun boshqa o'qituvchilarning guruh/o'quvchi ma'lumotlari ko'rinmasligi kerak (backend avtomatik filter qiladi).

---

## API Endpoints va Field Contracts

### 1. ATTENDANCE

#### POST /api/attendance
**Body (majburiy)**:
```json
{
  "group": "GROUP_ID",
  "date": "YYYY-MM-DD",
  "records": [
    { "student": "STUDENT_ID", "status": "Present" },
    { "student": "STUDENT_ID", "status": "Absent" },
    { "student": "STUDENT_ID", "status": "Late" }
  ]
}
```
- `status` faqat: `Present | Absent | Late`
- `chargedAmount` yuborilmaydi (backend hisoblaydi)

**Response**: `{ message, attendance }`

#### GET /api/attendance/:groupId
**Response**: Array of attendance records

**UI**:
- AttendanceCreatePage: group select + date picker + dynamic table (student, status dropdown)
- AttendanceListByGroupPage: group tanlanganda GET bilan list

---

### 2. PAYMENTS

#### POST /api/payments
**Body (majburiy)**:
```json
{
  "student": "STUDENT_ID",
  "group": "GROUP_ID",
  "amount": 500000,
  "type": "Cash"
}
```
- `type` faqat: `Cash | Card | Transfer`

**Response**: `{ message, payment, newDebt }`

#### GET /api/payments
**Response**: Array of payments (Teacher uchun faqat o'z guruhlaridagi)

#### DELETE /api/payments/:id
**Access**: Faqat Director/Manager

**UI**:
- PaymentsListPage (table: student, group, amount, type, date)
- PaymentCreateModal/Form (student select, group select, amount input, type select)

---

### 3. FINANCE

#### GET /api/finance/income?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
**Query params**: `startDate`, `endDate` (optional)
**Access**: Director, Admin, Manager

**Response**:
```json
{
  "total": 5000000,
  "detailedIncome": [...],
  "message": "..."
}
```

#### GET /api/finance/outcome?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
**Query params**: `startDate`, `endDate` (required)
**Access**: Director, Admin

**Response**:
```json
{
  "total": 2000000,
  "detailedOutcome": [
    { "id": "...", "name": "...", "role": "Teacher (Ulush)", "totalAmount": 500000, "lessonCount": 4 },
    { "id": "...", "name": "...", "role": "Manager (Oylik)", "totalAmount": 3000000, "monthlySalary": 3000000 }
  ],
  "message": "..."
}
```

#### GET /api/finance/debt
**Access**: Director, Admin, Manager

**Response**:
```json
{
  "totalDebt": 1500000,
  "studentsWithDebt": [
    { "_id": "...", "firstName": "...", "lastName": "...", "debtAmount": 500000, "phoneNumber": "..." }
  ],
  "message": "..."
}
```

**UI**:
- FinanceDashboardPage: date range filter, cards (total income/outcome/debt), tables

---

### 4. STATISTICS (YANGI)

#### GET /api/stats/teacher/:teacherId
**Access**: Teacher o'zi yoki Director/Manager/Admin

**Response**:
```json
{
  "teacher": { "_id": "...", "name": "...", "email": "..." },
  "summary": {
    "totalGroups": 3,
    "totalStudents": 100,
    "paidStudents": 85,
    "unpaidStudents": 15,
    "totalExpectedPayment": 12000000,
    "totalPaidAmount": 10200000,
    "totalRemainingAmount": 1800000
  },
  "groupStats": [
    {
      "groupId": "...",
      "groupName": "Frontend 101",
      "courseName": "Frontend Development",
      "coursePrice": 1000000,
      "totalStudents": 30,
      "paidStudents": 25,
      "unpaidStudents": 5,
      "expectedPayment": 30000000,
      "paidAmount": 25000000,
      "remainingAmount": 5000000
    }
  ]
}
```

#### GET /api/stats/group/:groupId
**Access**: Teacher o'z guruhini, Director/Manager/Admin hammasini

**Response**:
```json
{
  "group": { "_id": "...", "name": "...", "courseName": "...", "coursePrice": 1000000, "teacher": "..." },
  "summary": {
    "totalStudents": 30,
    "paidStudents": 25,
    "unpaidStudents": 5,
    "totalExpectedPayment": 30000000,
    "totalPaidAmount": 25000000,
    "totalRemainingAmount": 5000000
  },
  "students": [
    {
      "_id": "...",
      "firstName": "...",
      "lastName": "...",
      "phoneNumber": "...",
      "debt": -50000,
      "totalPaid": 950000,
      "expectedPayment": 1000000,
      "remainingAmount": 50000,
      "status": "paid"
    }
  ]
}
```

#### GET /api/stats/employees
**Access**: Director, Admin

**Response**:
```json
{
  "summary": {
    "totalEmployees": 15,
    "totalTeachers": 10,
    "totalManagers": 3,
    "totalAdmins": 2,
    "totalMonthlySalary": 50000000
  },
  "employees": {
    "teachers": [...],
    "managers": [...],
    "admins": [...]
  }
}
```

**UI**:
- TeacherStatsPage: Teacher tanlanganda stats ko'rsatish (yashil/qizil ranglar bilan)
- GroupStatsPage: Group tanlanganda stats ko'rsatish
- EmployeeStatsPage: Xodimlar maoshlari statistikasi (Director/Admin)

---

### 5. NOTIFICATIONS

#### GET /api/notifications/debt-warning
**Access**: Director, Manager, Admin

**Response**:
```json
{
  "message": "...",
  "students": [
    { "_id": "...", "firstName": "...", "lastName": "...", "phoneNumber": "...", "debt": -50000, "group": {...} }
  ]
}
```

#### GET /api/notifications/absent-students
**Access**: Director, Manager, Teacher, Admin

**Response**:
```json
{
  "message": "...",
  "absentList": [
    { "firstName": "...", "lastName": "...", "phoneNumber": "...", "groupName": "...", "teacherName": "...", "attendanceDate": "..." }
  ]
}
```

**UI**:
- NotificationsPage: 2 ta tab (Debt Warning / Absent Students)

---

### 6. MANAGERS

#### GET /api/managers
**Access**: Director

#### POST /api/managers
**Access**: Director
**Body**: `{ "userId": "USER_ID(role=Manager)", "salary": 3000000, "hiringDate": "YYYY-MM-DD" }`

#### GET /api/managers/:id
**Access**: Director yoki owner

#### PUT /api/managers/:id
**Access**: Director yoki owner (cheklangan)

#### DELETE /api/managers/:id
**Access**: Director

**UI**:
- ManagersListPage (Director)
- ManagerDetailPage
- Create form (Director)

---

### 7. GROUPS

#### GET /api/groups
**Access**: Teacher faqat o'z guruhlarini, Director/Manager/Admin hammasini

#### POST /api/groups
**Access**: Director, Manager
**Body**: `{ "name": "...", "course": "...", "teacher": "...", "startDate": "YYYY-MM-DD", "status": "Pending|Active|Completed|Canceled", "schedule": [{ "day": "Dushanba", "startTime": "14:00", "endTime": "16:00" }], "room": "..." }`

#### GET /api/groups/:id
**Access**: Teacher faqat o'z guruhini, Director/Manager/Admin hammasini

#### PUT /api/groups/:id
**Access**: Director, Manager

#### DELETE /api/groups/:id
**Access**: Director

---

### 8. STUDENTS

#### GET /api/students
**Access**: Teacher faqat o'z guruhlaridagi o'quvchilarni, Director/Manager/Admin hammasini

#### POST /api/students
**Access**: Director, Manager
**Body**: `{ "firstName": "...", "lastName": "...", "birthDate": "YYYY-MM-DD", "phoneNumber": "...", "group": "...", "status": "Active|Pending|Dropped|Graduated" }`

#### GET /api/students/:id
**Access**: Teacher faqat o'z guruhidagi o'quvchini, Director/Manager/Admin hammasini

#### PUT /api/students/:id
**Access**: Director, Manager

#### DELETE /api/students/:id
**Access**: Director, Manager

---

### 9. TEACHERS

#### GET /api/teachers
**Access**: Barcha kirganlar

#### POST /api/teachers
**Access**: Director, Manager
**Body**: `{ "userId": "USER_ID(role=Teacher)", "phone": "...", "salary": 2000000, "experience": 5, "certificates": [...], "subjects": [...] }`

#### GET /api/teachers/:id
**Access**: Teacher o'zi yoki Director/Manager

#### PUT /api/teachers/:id
**Access**: Teacher o'zi yoki Director/Manager

#### DELETE /api/teachers/:id
**Access**: Director, Manager

---

## Frontend Structure

```
src/
├── api/
│   ├── axios.js (axios instance + interceptors)
│   ├── auth.js
│   ├── attendance.js
│   ├── payments.js
│   ├── finance.js
│   ├── stats.js
│   ├── notifications.js
│   ├── managers.js
│   ├── groups.js
│   ├── students.js
│   └── teachers.js
├── stores/
│   ├── auth.js (Pinia store: user, token, role)
│   └── ...
├── router/
│   └── index.js (route guards bilan)
├── views/
│   ├── Attendance/
│   ├── Payments/
│   ├── Finance/
│   ├── Stats/
│   ├── Notifications/
│   ├── Managers/
│   ├── Groups/
│   ├── Students/
│   └── Teachers/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.vue (role-based menu)
│   │   └── Topbar.vue
│   └── ...
└── App.vue
```

## UI Requirements

1. **Sidebar Menu** (role-based):
   - Director/Admin: Dashboard, Groups, Students, Teachers, Managers, Payments, Attendance, Finance, Stats, Notifications
   - Manager: Finance, Attendance, Notifications, Payments, Groups (read), Students (read)
   - Teacher: My Groups, My Students, Attendance, Payments, Notifications, My Stats
   - Student: Notifications

2. **Color Coding**:
   - Paid students: **Green** (status: paid)
   - Unpaid students: **Red** (status: unpaid)
   - Debt warning: **Yellow/Orange**

3. **Stats Cards**:
   - Teacher stats: Total students, Paid (green), Unpaid (red), Expected payment, Paid amount, Remaining
   - Group stats: Same as teacher stats but per group
   - Employee stats: Total employees, Total monthly salary

4. **Forms**:
   - Validation bo'lsin
   - Loading state bo'lsin
   - Error handling bo'lsin

## Output

- Qaysi fayllar qo'shiladi/yangilanadi (tree)
- To'liq ishlaydigan minimal kod: axios instance, router guards, pinia auth store, har modul uchun api+page
- Role-based menu va route guards
- Barcha API endpointlar to'g'ri ulangan
- Teacher faqat o'z ma'lumotlarini ko'radi (backend avtomatik filter qiladi)

---

## Muhim Eslatmalar

1. **Backend avtomatik RBAC filter qiladi**: Teacher so'rov yuborganida backend faqat o'z guruhlarini/o'quvchilarini qaytaradi. Frontendda qo'shimcha filter qilish shart emas.

2. **Field validation**: Har bir formda backend kutgan fieldlar to'liq yuborilishi kerak. Enum qiymatlar to'g'ri bo'lishi kerak.

3. **Error handling**: 401 bo'lsa logout, 403 bo'lsa "Ruxsat yo'q" xabari, 404 bo'lsa "Topilmadi" xabari.

4. **Loading states**: Har bir API call uchun loading state bo'lsin.

5. **Responsive**: Mobile va desktop uchun moslashuvchan dizayn.

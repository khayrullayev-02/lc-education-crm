## Frontend ←→ Backend Contract (Ready to Use)

Base URL: `http://localhost:8080`

Auth header (all protected routes): `Authorization: Bearer <token>`

---

### Auth
- **POST** `/api/auth/login` (alias `/api/users/login`)
  - Body: `{ "identifier": "username_or_email", "password": "..." }`
  - Response: `{ token, user: { _id, firstName, lastName, role } }`
- **POST** `/api/users/logout` → `{ "message": "Muvaffaqiyatli chiqildi" }`

### Users / Managers
- **GET** `/api/users` (Admin/Director) → includes `plainPassword` if present.
- **POST** `/api/users/register` (Admin/Director; public only Student) → create any role.
- **POST** `/api/managers`
  - Body: `{ "userId": "USER_ID", "salary": 3000000, "hiringDate": "YYYY-MM-DD" }`

---

### Attendance
- **POST** `/api/attendance/bulk`
  - Body:
    ```json
    {
      "groupId": "GROUP_ID",
      "date": "YYYY-MM-DD",
      "records": [
        { "studentId": "STUDENT_ID", "status": "present|absent|late|excused", "reason": "" }
      ]
    }
    ```
  - Upsert by `(groupId + studentId + date)`, never 500 for valid input.
- **GET** `/api/attendance/table/:groupId?month=YYYY-MM`
  - Response:
    ```json
    {
      "students": [
        {
          "studentId": "...",
          "fullName": "Ism Familiya",
          "attendance": {
            "YYYY-MM-DD": { "status": "present", "reason": "" }
          }
        }
      ]
    }
    ```
- **GET** `/api/attendance/group/:groupId/date/:date` → list with populated student.

---

### Dashboards
- **GET** `/api/dashboard/admin`
  - Fields: `totalUsers,totalGroups,totalStudents,totalTeachers,totalManagers,totalIncome,totalExpense,profit,studentStats,groupStats,recentPayments[{_id,student{name},amount,date,type}],monthlyIncome[{month,amount}]`
- **GET** `/api/dashboard/manager`
  - Fields: `totalGroups,totalStudents,totalIncome,pendingPayments[],debtStudents[]`
- **GET** `/api/dashboard/teacher`
  - Fields: `myGroups[{_id,name,totalStudents}], myStudents, todayAttendance, pendingPayments, myStats{totalGroups,totalStudents,paidStudents,unpaidStudents}`
- **GET** `/api/dashboard/accountant`
  - Fields: `totalIncome,totalExpense,profit,totalStudents`
- **GET** `/api/dashboard/student`
  - Fields: `myGroups[{_id,name}], myDebt, myPayments, myAttendance`

---

### Stats
- **GET** `/api/stats/teacher/:teacherId`
  - `teacher { _id,name,email }`, `summary { totalGroups,totalStudents,paidStudents,unpaidStudents,totalExpectedPayment,totalPaidAmount,totalRemainingAmount }`, `groupStats[]`
- **GET** `/api/stats/group/:groupId`
  - `group { _id,name,courseName,coursePrice,teacher }`, `summary { totalStudents,paidStudents,unpaidStudents,totalExpectedPayment,totalPaidAmount,totalRemainingAmount }`, `students[]` with `status: paid|unpaid`

---

### Payments
- **POST** `/api/payments`
  - Body: `{ "student": "STUDENT_ID", "group": "GROUP_ID", "amount": 500000, "type": "Cash|Card|Transfer", "date": "YYYY-MM-DD?" }`
  - Response: `{ message, payment, newDebt }`
- **GET** `/api/payments`
  - Query: `student, group, from, to, page, limit`
  - Response: `{ items: [ { _id, student{_id,firstName,lastName}, group{_id,name}, amount, type, date/paymentDate } ], total }`
- **DELETE** `/api/payments/:id` (Director/Manager)

---

### Accountant Module
- **GET** `/api/accountant/income?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Response: `[ { "_id": { "day": "YYYY-MM-DD", "month": "YYYY-MM" }, "total": 0 } ]`
- **GET** `/api/accountant/expense?month=YYYY-MM`
  - Response: `{ month, totalExpense, categories { teacherSalary, managerSalary, adminSalary, rent, advertising, other }, employeePayments: [...] }`
- **GET** `/api/accountant/teachers/salary?month=YYYY-MM`
  - Response: `[ { teacherId, teacherName, groupsCount, studentsCount, lessonsCount, baseSalary, payments[], totalPaid, remainingSalary } ]`
- **GET** `/api/accountant/students/payments?month=YYYY-MM`
  - Response: `[ { studentName, groupName, coursePrice, paidAmount, debt, paymentStatus } ]`
- **POST** `/api/accountant/employee-payment`
  - Body: `{ employeeId, employeeType: "Teacher|Manager|Admin", amount, paymentDate?, description?, category: "teacherSalary|managerSalary|adminSalary" }`

---

### Groups & Students (RBAC)
- **GET** `/api/groups` → Teacher only own groups; others see all.
- **GET** `/api/groups/:id` → Teacher only own; others all.
- **GET** `/api/students` → Teacher only students in own groups; others all.
- **POST** `/api/students` → Teacher only into own group; Manager/Admin/Director any.
- **DELETE** `/api/students/:id` → only Director/Manager (Teacher blocked).

---

### Role Routing (frontend)
- Roles: `Director | Admin | Manager | Teacher | Accountant | Student`
- After login redirect `/dashboard` per role (frontend guard).
- Teacher sees only own groups/students/payments/attendance automatically via backend filters.

const express = require('express');
const router = express.Router();

const {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deleteUser,
  getUserById,
  updateUser,
} = require('../controllers/userController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ============================
// PUBLIC ROUTES
// ============================

// Login
router.post('/login', authUser);

// Faqat Director/Admin register qilishi kerak — shuning uchun protect + authorize qo‘shildi
router.post('/register', protect, authorizeRoles('Director', 'Admin'), registerUser);

// ============================
// PROFILE ROUTES
// ============================
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// ============================
// ADMIN ROUTES
// ============================

// Barcha userlarni olish
router.get('/', protect, authorizeRoles('Director', 'Admin'), getAllUsers);

// ID bo‘yicha boshqaruv (eng oxirida turishi kerak!)
router
  .route('/:id')
  .get(protect, authorizeRoles('Director', 'Admin'), getUserById)
  .put(protect, authorizeRoles('Director', 'Admin'), updateUser)
  .delete(protect, authorizeRoles('Director', 'Admin'), deleteUser);

module.exports = router;


// {
//   "firstName": "Ogabek",
//   "lastName": "Ibragimov",
//   "username": "director_ogabek",
//   "password": "supersecretpassword123",
//   "role": "Director", 
//   "branch": "69289f37321d636257f5365d"
// }


// Profile true
// {
//   "_id": "6928a049a66f2a8bfc16f512",
//   "firstName": "Ogabek",
//   "lastName": "Ibragimov",
//   "username": "director_ogabek",
//   "role": "Director",
//   "branch": "69289f37321d636257f5365d",
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MjhhMDQ5YTY2ZjJhOGJmYzE2ZjUxMiIsImlhdCI6MTc2NDMxMTUzNiwiZXhwIjoxNzY2OTAzNTM2fQ.utuGR3TwyycdztMHTvAtoLiMPnYLKTo8pCtWfz-fuXA"
// }
// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MjhhMDQ5YTY2ZjJhOGJmYzE2ZjUxMiIsImlhdCI6MTc2NDMxMTUzNiwiZXhwIjoxNzY2OTAzNTM2fQ.utuGR3TwyycdztMHTvAtoLiMPnYLKTo8pCtWfz-fuXA


// Student Post
// {
//   "firstName": "Og'abek",
//   "lastName": "Ibragimov",
//   "birthDate": "2000-05-15",          // Talabaning tug'ilgan sanasi (YYYY-MM-DD)
//   "phoneNumber": "+998901234567",     // Telefon raqami, unique bo'lishi kerak
//   "group": "66289f37321d63e257f536d", // Guruh ID (optional, null bo'lishi mumkin)
//   "status": "Active",                 // Enum: Active, Pending, Dropped, Graduated
//   "isActive": true                     // Optional: boolean (modelga qo'shish tavsiya etiladi)
// }
// Room Post
// {
//   "name": "101",
//   "capacity": 30,
//   "isActive": true,
//   "branch": "66289f37321d63e257f536d" 
// }
// Branch Post
// {
//   "name": "Farg‘ona Filiali",
//   "address": "Farg‘ona sh., Bog‘ishamol ko'chasi, 5",
//   "phone": "+998933456789",
//   "isActive": false
// }
// Teachers Post
// {
//   "userId": "64f1c2b3a1e9d5f8c1234567",
//   "salary": 2500,
//   "experience": 5,
//   "certificates": [
//     "Teaching Excellence Certificate",
//     "Advanced Math Training"
//   ],
//   "subjects": [
//     "Mathematics",
//     "Physics"
//   ],
//   "branch": "64f1a9d2b4e2f8c123abcd12"
// }
// {
//   "userId": "66fb123abc...",
//   "phone": "+998901234567",
//   "salary": 2000000,
//   "experience": 3,
//   "certificates": ["IELTS", "CEFR B2"],
//   "subjects": ["Math", "Physics"]
// }
// {
//   "_id": "69294b5d9068a79e427e7e08",
//   "firstName": "Ali",
//   "lastName": "Valiyev",
//   "username": "alivaliyev",
//   "email": "ali@example.com",
//   "role": "Teacher",
//   "branch": "65fd3c8e8a0d24312c7c8331",
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Mjk0YjVkOTA2OGE3OWU0MjdlN2UwOCIsImlhdCI6MTc2NDMxMzk0OSwiZXhwIjoxNzY2OTA1OTQ5fQ.Y76MaZJgffWw_THqQKe-xudLoAVfCxxsJbKCv2xh6TI"
// }

// Group Post
// {
//   "name": "Frontend 101",
//   "branch": "40e07bb8-0ba8-4f37-9d6b-560350cb1a6d",
//   "course": "c2279a27-5e3c-4c01-9ab8-82e1d9a87e11",
//   "teacher": "4eab72e0-3b2e-4ced-9dfe-c99ca2b7c812",
//   "room": "a8898dcf-8df7-41d5-a9e1-e24ff6fc9a0a",

//   "schedule": [
//     {
//       "day": "monday",
//       "start_time": "09:00",
//       "end_time": "11:00"
//     },
//     {
//       "day": "wednesday",
//       "start_time": "09:00",
//       "end_time": "11:00"
//     }
//   ],
//   "start_date": "2025-01-15",
//   "end_date": "2025-06-15",
//   "max_students": 20,
//   "status": "active",
//   "price": 1200000,
//   "payment_type": "monthly",
//   "description": "Frontend boshlang'ich guruh"
// }

// Course Post
// {
//   "name": "Frontend Development",
//   "durationMonths": 6,
//   "price": 1200000,
//   "isActive": true
// }

// AdminProfile Post 
// {
//   "userId": "675c1c9f3a2f894ab4e6a123",
//   "salary": 4500000,
//   "hiringDate": "2024-11-20",
//   "primaryOffice": "675c1dbf48a8da820f92b945"
// }
// DirectorProfile Post 
// {
//   "userId": "64f8b2d8c9a1b2f3d4e5f678",
//   "salary": 5000,
//   "hiringDate": "2025-11-01",
// {
//   "user": "6928a049a66f2a8bfc16f512",
//   "salary": 5000,
//   "hiringDate": "2025-11-01T00:00:00.000Z",
//   "primaryBranch": "69289f37321d636257f5365d",
//   "isActive": true,
//   "_id": "692d5049814b1b00aac64ce4",
//   "createdAt": "2025-12-01T08:22:33.232Z",
//   "updatedAt": "2025-12-01T08:22:33.232Z",
//   "__v": 0
// }
// }
// ManagerProfile Post
// {
//   "userId": "64f8b2d8c9a1b2f3d4e5f789",
//   "salary": 3000,
//   "hiringDate": "2025-10-15",
// }

// Payment Post
// {
//   "message": "To'lov muvaffaqiyatli amalga oshirildi va talaba qarzi yangilandi.",
//   "payment": {
//     "_id": "64c0f0b2c3d4e5f678901236",
//     "student": "64b8f1a2c3d4e5f678901234",
//     "group": "64b8f2b3c3d4e5f678901235",
//     "amount": 500000,
//     "type": "Card",
//     "paymentDate": "2025-11-28T07:50:23.123Z",
//     "branch": "64b8e9d1c3d4e5f678901222",
//     "paidBy": "64b8e8f1c3d4e5f678901221",
//     "createdAt": "2025-11-28T07:50:23.123Z",
//     "updatedAt": "2025-11-28T07:50:23.123Z",
//     "__v": 0
//   },
//   "newDebt": 150000
// }








// {
//   "name": "Frontend - 101",
//   "course": "Mavjud_Kurs_ID_si",       
//   "teacher": "Mavjud_O'qituvchi_ID_si", 
//   "startDate": "2025-12-01",
//   "status": "Pending",
//   "schedule": [
//     {
//       "day": "Dushanba",
//       "startTime": "14:00",
//       "endTime": "16:00"
//     },
//     {
//       "day": "Chorshanba",
//       "startTime": "14:00",
//       "endTime": "16:00"
//     }
//   ]
// }


// Director Information
// {
//   "_id": "6928a049a66f2a8bfc16f512",
//   "firstName": "Ogabek",
//   "lastName": "Ibragimov",
//   "username": "director_ogabek",
//   "role": "Director",
//  "password": "supersecretpassword123"
//   "branch": "69289f37321d636257f5365d",
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MjhhMDQ5YTY2ZjJhOGJmYzE2ZjUxMiIsImlhdCI6MTc2NDM0ODQ4OCwiZXhwIjoxNzY2OTQwNDg4fQ.waVsda_S7l87_2YsLzVJtoDQ0479z_fRt_iqhFn7lzU"
// }
// Branches information
// [
//   {
//       "_id": "69289f37321d636257f5365d",
//       "name": "Markaziy Filial",
//       "address": "Toshkent sh., Chilonzor tumani, 5-uy",
//       "phone": "+998901230001",
//       "isActive": true,
//       "createdAt": "2025-11-27T18:57:59.501Z",
//       "updatedAt": "2025-11-27T18:57:59.501Z",
//       "__v": 0
//   }
// ]
// Rooms Information
// {
//   "name": "101",
//   "capacity": 30,
//   "branch": "69289f37321d636257f5365d",
//   "isActive": true,
//   "_id": "6929d33aad54fee72c15a0ea",
//   "createdAt": "2025-11-28T16:52:10.494Z",
//   "updatedAt": "2025-11-28T16:52:10.494Z",
//   "__v": 0
// }
// Courses Information
// [
//   {
//       "_id": "6928a9200fc2df6eebba2d9c",
//       "name": "Frontend Development (React)",
//       "durationMonths": 6,
//       "price": 950000,
//       "branch": {
//           "_id": "69289f37321d636257f5365d",
//           "name": "Markaziy Filial"
//       },
//       "isActive": true,
//       "createdAt": "2025-11-27T19:40:16.546Z",
//       "updatedAt": "2025-11-27T19:40:16.546Z",
//       "__v": 0
//   }
// ]

// Teacher Information 
// {
//   "_id": "6929d6bc2ae114763ea83cec",
//   "firstName": "Ogabek",
//   "lastName": "Ibragimov",
//   "username": "ogabek_ibragimov",
//   "email": "ogabekibragimov20@gmail.com",
//   "role": "Teacher",
//   "branch": "69289f37321d636257f5365d",
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MjlkNmJjMmFlMTE0NzYzZWE4M2NlYyIsImlhdCI6MTc2NDM0OTYyOCwiZXhwIjoxNzY2OTQxNjI4fQ.4vo37hRw2FzdQHyUEbgcaW4ErjEmryORWdZg1N2opX8"
// }
// {
//   "_id": "692a93679b94d85e17e7d559",
//   "firstName": "Ogabek",
//   "lastName": "Ibragimov",
//   "username": "ibragimov_ogabek",
//   "email": "ogabekibragimov020@gmail.com",
// "password": "ogabek07",
//   "role": "Teacher",
//   "branch": "69289f37321d636257f5365d",
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MmE5MzY3OWI5NGQ4NWUxN2U3ZDU1OSIsImlhdCI6MTc2NDM5NzkyOCwiZXhwIjoxNzY2OTg5OTI4fQ.mM9rOc92QsBW_FskhnfSA6zfaefJbOv7UkWOvyX7eXg"
// }
// {
//   "_id": "6929da1131faec46a950264f",
//   "user": {
//       "_id": "6929d6bc2ae114763ea83cec",
//       "firstName": "Ogabek",
//       "lastName": "Ibragimov",
//       "username": "ogabek_ibragimov",
//       "email": "ogabekibragimov20@gmail.com",
//       "role": "Teacher",
//       "branch": {
//           "_id": "69289f37321d636257f5365d",
//           "name": "Markaziy Filial"
//       },
//       "salary": 0,
//       "isActive": true,
//       "createdAt": "2025-11-28T17:07:08.141Z",
//       "updatedAt": "2025-11-28T17:07:08.141Z",
//       "__v": 0
//   },
//   "salary": 1500000,
//   "experience": 5,
//   "certificates": [
//       "Cambridge English"
//   ],
//   "subjects": [
//       "Math",
//       "Physics"
//   ],
//   "createdAt": "2025-11-28T17:21:21.545Z",
//   "updatedAt": "2025-11-28T17:21:21.545Z",
//   "__v": 0
// }

// Group Post
// {
//   "name": "A1 Guruh",
//   "course": "64a1f2d9f1234abc56789034",
//   "teacher": "64a1f2d9f1234abc56789056",
//   "startDate": "2025-12-10",
//   "status": "Pending",
//   "schedule": [
//     {
//       "day": "Dushanba",
//       "startTime": "14:00",
//       "endTime": "16:00"
//     },
//     {
//       "day": "Chorshanba",
//       "startTime": "14:00",
//       "endTime": "16:00"
//     }
//   ],
//   "room": "64a1f2d9f1234abc56789078",
//   "students": [
//     "64a1f2d9f1234abc56789090",
//     "64a1f2d9f1234abc56789091"
//   ]
// }

// [
//   {
//       "_id": "6929de33c0906174782d4837",
//       "name": "Mathematics Advanced",
//       "course": {
//           "_id": "6928a9200fc2df6eebba2d9c",
//           "name": "Frontend Development (React)"
//       },
//       "teacher": {
//           "_id": "6929da1131faec46a950264f",
//           "user": {
//               "_id": "6929d6bc2ae114763ea83cec",
//               "firstName": "Ogabek",
//               "lastName": "Ibragimov",
//               "username": "ogabek_ibragimov"
//           }
//       },
//       "startDate": "2025-12-01T09:00:00.000Z",
//       "status": "Pending",
//       "schedule": [
//           {
//               "day": "Dushanba",
//               "startTime": "14:00",
//               "endTime": "16:00",
//               "_id": "6929de33c0906174782d4838"
//           },
//           {
//               "day": "Chorshanba",
//               "startTime": "14:00",
//               "endTime": "16:00",
//               "_id": "6929de33c0906174782d4839"
//           },
//           {
//               "day": "Juma",
//               "startTime": "14:00",
//               "endTime": "16:00",
//               "_id": "6929de33c0906174782d483a"
//           }
//       ],
//       "branch": {
//           "_id": "69289f37321d636257f5365d",
//           "name": "Markaziy Filial"
//       },
//       "room": null,
//       "students": [],
//       "createdAt": "2025-11-28T17:38:59.670Z",
//       "updatedAt": "2025-11-28T17:38:59.670Z",
//       "__v": 0
//   }
// ]

// Students Post
// [
//   {
//     "_id": "6929df3d9a818968edb01803",
//     "firstName": "Ali",
//     "lastName": "Valiyev",
//     "birthDate": "2005-04-12T00:00:00.000Z",
//     "phoneNumber": "+998901234567",
//     "group": {
//         "_id": "6929de33c0906174782d4837",
//         "name": "Mathematics Advanced"
//     },
//     "debt": 0,
//     "status": "Active",
//     "isActive": true,
//     "branch": "69289f37321d636257f5365d",
//     "lastPaymentDate": "2025-11-28T17:43:25.928Z",
//     "createdAt": "2025-11-28T17:43:25.932Z",
//     "updatedAt": "2025-11-28T17:43:25.932Z"
// }
// ]
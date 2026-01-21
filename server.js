require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware'); 
const swaggerUi = require('swagger-ui-express'); 
const YAML = require('yamljs'); 
const path = require('path'); 

// --- Route fayllarini import qilish ---
const courseRoutes = require('./routes/courseRoutes');
const groupRoutes = require('./routes/groupRoutes');   
const studentRoutes = require('./routes/studentRoutes'); 
// const branchRoutes = require('./routes/branchRoutes');
const userRoutes = require('./routes/userRoutes');    
const roomRoutes = require('./routes/roomRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const financeRoutes = require('./routes/financeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const teachersRoutes = require('./routes/teachersRoutes');
const managerRoutes = require('./routes/managerRoutes');
const directorRoutes = require('./routes/directorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes'); // 🔹 Auth route
const statsRoutes = require('./routes/statsRoutes'); // 🔹 Stats route
const accountantRoutes = require('./routes/accountantRoutes'); // 🔹 Accountant reports
const dashboardRoutes = require('./routes/dashboardRoutes'); // 🔹 Dashboard routes

// --- MongoDB ulanishi ---
connectDB(); 

const app = express();
const PORT = process.env.PORT || 8080; 

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

// --- Auth route (login/register) ---
app.use('/api/auth', authRoutes);

// --- Swagger Hujjatini yuklash ---
const swaggerPath = path.join(__dirname, 'swagger.yaml');
let swaggerDocument;

try {
  swaggerDocument = YAML.load(swaggerPath);
  console.log('✅ swagger.yaml fayli muvaffaqiyatli yuklandi.');
} catch (e) {
  console.error('❌ swagger.yaml faylini yuklashda xato:', e.message);
  swaggerDocument = {
    openapi: '3.0.0',
    info: { title: 'Swagger Yuklashda Xato', version: '1.0.0' },
    paths: {},
  };
}

// --- Swagger UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Asosiy yo'nalish ---
app.get('/', (req, res) => {
  res.send('CRM Backend Serveri Ishlamoqda! API hujjatlari uchun <a href="/api-docs">/api-docs</a> ga o‘ting.');
});

// --- API Yo'nalishlari ---
app.use('/api/users', userRoutes);     
app.use('/api/courses', courseRoutes); 
app.use('/api/groups', groupRoutes);   
app.use('/api/students', studentRoutes); 
app.use('/api/rooms', roomRoutes); 
app.use('/api/payments', paymentRoutes); 
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/finance', financeRoutes); 
app.use('/api/notifications', notificationRoutes); 
app.use('/api/teachers', teachersRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/directors', directorRoutes); 
app.use('/api/admins', adminRoutes);
app.use('/api/stats', statsRoutes); // 🔹 Stats endpoints
app.use('/api/accountant', accountantRoutes); // 🔹 Accountant reports
app.use('/api/dashboard', dashboardRoutes); // 🔹 Dashboard endpoints

// --- Xato Boshqarish Middleware ---
app.use(notFound);   
app.use(errorHandler); 

// --- Serverni ishga tushirish ---
app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} manzilida ishga tushdi.`);
  console.log(`📘 Swagger hujjatlari: http://localhost:${PORT}/api-docs`);
});

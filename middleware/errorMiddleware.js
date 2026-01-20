// Mavjud bo'lmagan yo'nalish (404 Not Found) uchun
const notFound = (req, res, next) => {
    const error = new Error(`Topilmadi - ${req.originalUrl}`);
    res.status(404);
    next(error); // Keyingi xato ishlovchiga yuborish
  };
  
  // Global xato ishlovchi (Express avtomatik tanib oladi)
  const errorHandler = (err, req, res, next) => {
    // Agar status 200 bo'lsa, uni 500 ga o'zgartirish (Server Error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode; 
    res.status(statusCode);
  
    res.json({
      message: err.message,
      // Faqat development rejimida stackni ko'rsatamiz
      stack: process.env.NODE_ENV === 'production' ? null : err.stack, 
    });
  };
  
  module.exports = {
    notFound,
    errorHandler,
  };
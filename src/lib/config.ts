// Environment configuration for different deployment scenarios
export const ENV_CONFIG = {
  // Current environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Storage type: 'filesystem' for development, 'database' for production
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'filesystem',
  
  // Database configuration (for production)
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG,
  
  // File upload settings
  UPLOAD_PROVIDER: process.env.UPLOAD_PROVIDER || 'local', // 'local', 'cloudinary', 's3'
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  
  // API settings
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002',
  
  // Feature flags
  ENABLE_BULK_DELETE: process.env.ENABLE_BULK_DELETE !== 'false',
  ENABLE_EXPORT: process.env.ENABLE_EXPORT !== 'false',
  ENABLE_AI_FEATURES: process.env.ENABLE_AI_FEATURES !== 'false',
  
  // Limits
  MAX_PROPERTIES: parseInt(process.env.MAX_PROPERTIES || '10000'),
  MAX_UPLOAD_SIZE: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760'), // 10MB
  
  // Production checks
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isServerless: () => process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME,
};

// Validate required environment variables for production
export const validateProductionConfig = () => {
  const errors: string[] = [];
  
  if (ENV_CONFIG.isProduction()) {
    if (ENV_CONFIG.STORAGE_TYPE === 'database' && !ENV_CONFIG.DATABASE_URL && !ENV_CONFIG.MONGODB_URI) {
      errors.push('DATABASE_URL or MONGODB_URI is required for production database storage');
    }
    
    if (!ENV_CONFIG.BASE_URL || ENV_CONFIG.BASE_URL.includes('localhost')) {
      errors.push('NEXT_PUBLIC_BASE_URL must be set to production domain');
    }
    
    if (ENV_CONFIG.UPLOAD_PROVIDER !== 'local' && !ENV_CONFIG.CLOUDINARY_URL && !ENV_CONFIG.AWS_S3_BUCKET) {
      errors.push('Cloud storage configuration required for production file uploads');
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Production Configuration Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid production configuration');
  }
  
  console.log('✅ Production configuration validated');
};

// Export configuration object
export default ENV_CONFIG;

// Set Firebase configuration with all required fields (must be before any imports)
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'fr-toolv2';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'fr-toolv2.firebasestorage.app';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'AIzaSyD2ScfODrkVf0zWaJdsjy_Mw4c09k0oM8Y';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'fr-toolv2.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '540549710523';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:540549710523:web:10bb1f099b5e684b019f9e';
process.env.UPLOAD_PROVIDER = 'firebase';

// Reset the imageStorageInstance singleton before using getImageStorage
import * as imageStorageModule from '../src/lib/image-storage';
(imageStorageModule as any).imageStorageInstance = null;
import { getImageStorage } from '../src/lib/image-storage';

async function testFirebaseUpload() {
  console.log('🧪 Testing Firebase Storage upload...');
  
  console.log('📦 Firebase Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('📦 Firebase Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  console.log('📦 Upload Provider:', process.env.UPLOAD_PROVIDER);
  
  try {
    // Get the storage adapter
    const storage = getImageStorage();
    console.log('✅ Storage adapter created successfully');
    
    // Create a test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xCF, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    console.log('📤 Uploading test image to Firebase...');
    
    // Upload test image
    const firebaseUrl = await storage.uploadImage(
      testImageBuffer,
      'test-property',
      0,
      'image/png'
    );
    
    console.log('✅ Test upload successful!');
    console.log('🔗 Firebase URL:', firebaseUrl);
    
    // Test if the URL is accessible
    if (firebaseUrl.includes('firebasestorage.googleapis.com')) {
      console.log('✅ URL appears to be a valid Firebase Storage URL');
    } else {
      console.log('⚠️ URL does not appear to be a Firebase Storage URL');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testFirebaseUpload().catch(console.error);
}

export { testFirebaseUpload }; 
// Set Firebase configuration with all required fields (must be before any imports)
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'fr-toolv2';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'fr-toolv2.firebasestorage.app';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'AIzaSyD2ScfODrkVf0zWaJdsjy_Mw4c09k0oM8Y';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'fr-toolv2.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '540549710523';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:540549710523:web:10bb1f099b5e684b019f9e';
process.env.UPLOAD_PROVIDER = 'firebase';

import { promises as fs } from 'fs';
import path from 'path';
// Reset the imageStorageInstance singleton before using getImageStorage
import * as imageStorageModule from '../src/lib/image-storage';
(imageStorageModule as any).imageStorageInstance = null;
import { getImageStorage } from '../src/lib/image-storage';

interface Property {
  id: string;
  image_url: string;
  image_urls: string[];
  [key: string]: any;
}

async function uploadImagesToFirebase() {
  console.log('🚀 Starting Firebase Storage upload...');
  
  console.log(`📦 Firebase Project ID: fr-toolv2`);
  console.log(`📦 Firebase Storage Bucket: fr-toolv2.firebasestorage.app`);
  console.log(`📦 Firebase Auth Domain: fr-toolv2.firebaseapp.com`);
  
  // Read properties data
  const dataPath = path.join(process.cwd(), 'data', 'properties.json');
  const properties: Property[] = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
  
  console.log(`📊 Found ${properties.length} properties to process`);
  
  // Get Firebase storage adapter
  const storage = getImageStorage();
  
  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // Process each property
  for (const property of properties) {
    console.log(`\n🏠 Processing property: ${property.id}`);
    
    const propertyDir = path.join(process.cwd(), 'public', 'uploads', 'properties', property.id);
    
    try {
      // Check if property directory exists
      const dirExists = await fs.access(propertyDir).then(() => true).catch(() => false);
      
      if (!dirExists) {
        console.log(`  ⚠️  No local images found for ${property.id}`);
        skippedCount++;
        continue;
      }
      
      // Read all image files in the property directory
      const files = await fs.readdir(propertyDir);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file)
      );
      
      console.log(`  📁 Found ${imageFiles.length} local images`);
      
      const firebaseUrls: string[] = [];
      
      // Upload each image to Firebase
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        const imagePath = path.join(propertyDir, imageFile);
        
        try {
          // Read image file
          const imageBuffer = await fs.readFile(imagePath);
          
          // Determine content type from file extension
          const ext = path.extname(imageFile).toLowerCase();
          const contentType = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp'
          }[ext] || 'image/jpeg';
          
          console.log(`    📤 Uploading ${imageFile} (${imageBuffer.length} bytes)`);
          
          // Upload to Firebase Storage
          const firebaseUrl = await storage.uploadImage(
            imageBuffer,
            property.id,
            i,
            contentType
          );
          
          firebaseUrls.push(firebaseUrl);
          console.log(`    ✅ Uploaded to Firebase: ${firebaseUrl}`);
          
        } catch (error) {
          console.error(`    ❌ Failed to upload ${imageFile}:`, error);
          errorCount++;
        }
      }
      
      // Update property with Firebase URLs
      if (firebaseUrls.length > 0) {
        property.image_urls = firebaseUrls;
        property.image_url = firebaseUrls[0]; // Set first image as primary
        uploadedCount++;
        console.log(`  ✅ Updated property with ${firebaseUrls.length} Firebase URLs`);
      } else {
        console.log(`  ⚠️  No images uploaded for ${property.id}`);
        skippedCount++;
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing property ${property.id}:`, error);
      errorCount++;
    }
  }
  
  // Save updated properties data
  await fs.writeFile(dataPath, JSON.stringify(properties, null, 2));
  
  console.log('\n📊 UPLOAD SUMMARY:');
  console.log('==================');
  console.log(`✅ Successfully uploaded: ${uploadedCount} properties`);
  console.log(`⚠️  Skipped: ${skippedCount} properties`);
  console.log(`❌ Errors: ${errorCount} properties`);
  console.log(`📈 Total properties processed: ${properties.length}`);
  
  // Show sample Firebase URLs
  const propertiesWithFirebaseUrls = properties.filter(p => 
    p.image_urls && p.image_urls.some(url => url.includes('firebase'))
  );
  
  if (propertiesWithFirebaseUrls.length > 0) {
    console.log('\n🔗 Sample Firebase URLs:');
    propertiesWithFirebaseUrls.slice(0, 3).forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.id}: ${prop.image_urls?.[0] || 'No URL'}`);
    });
  }
  
  console.log('\n🎉 Firebase upload complete!');
}

// Run the script
if (require.main === module) {
  uploadImagesToFirebase().catch(console.error);
}

export { uploadImagesToFirebase }; 
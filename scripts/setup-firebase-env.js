#!/usr/bin/env node

/**
 * Setup Firebase Environment and Upload Images
 * This script sets up the Firebase environment and uploads all local images to Firebase Storage
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const FIREBASE_CONFIG = {
  PROJECT_ID: 'fr-toolv1',
  STORAGE_BUCKET: 'fr-toolv1.appspot.com'
};

async function setupFirebaseEnvironment() {
  console.log('🔧 Setting up Firebase environment...');
  
  // Set environment variables
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = FIREBASE_CONFIG.PROJECT_ID;
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = FIREBASE_CONFIG.STORAGE_BUCKET;
  process.env.UPLOAD_PROVIDER = 'firebase';
  process.env.STORAGE_TYPE = 'filesystem';
  process.env.NODE_ENV = 'development';
  
  console.log(`✅ Firebase Project ID: ${FIREBASE_CONFIG.PROJECT_ID}`);
  console.log(`✅ Firebase Storage Bucket: ${FIREBASE_CONFIG.STORAGE_BUCKET}`);
  console.log(`✅ Upload Provider: firebase`);
  
  // Check if Firebase CLI is installed
  try {
    const { execSync } = require('child_process');
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI is installed');
  } catch (error) {
    console.error('❌ Firebase CLI not found. Please install it with: npm install -g firebase-tools');
    console.error('   Then run: firebase login');
    return false;
  }
  
  return true;
}

async function uploadImagesToFirebase() {
  console.log('\n🚀 Starting Firebase Storage upload...');
  
  try {
    // Import and run the upload script
    const { uploadImagesToFirebase } = require('./upload-to-firebase.ts');
    await uploadImagesToFirebase();
    return true;
  } catch (error) {
    console.error('❌ Error during upload:', error);
    return false;
  }
}

async function main() {
  console.log('🔥 Firebase Storage Setup and Upload');
  console.log('====================================');
  
  // Setup environment
  const envSetup = await setupFirebaseEnvironment();
  if (!envSetup) {
    console.log('\n❌ Environment setup failed. Please check Firebase CLI installation.');
    process.exit(1);
  }
  
  // Upload images
  const uploadSuccess = await uploadImagesToFirebase();
  if (!uploadSuccess) {
    console.log('\n❌ Upload failed. Please check Firebase configuration.');
    process.exit(1);
  }
  
  console.log('\n🎉 Firebase setup and upload completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Check Firebase Console to verify uploaded images');
  console.log('2. Update your application to use Firebase Storage URLs');
  console.log('3. Test the application with Firebase-hosted images');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupFirebaseEnvironment, uploadImagesToFirebase }; 
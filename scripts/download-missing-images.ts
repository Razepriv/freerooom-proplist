import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

interface Property {
  id: string;
  images?: string[];
  image_urls?: string[];
  page_link?: string;
}

const PROPERTIES_DIR = 'public/uploads/properties';
const MAX_CONCURRENT = 5; // Limit concurrent downloads
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url: string, localPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(localPath);
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${path.basename(localPath)}`);
          resolve(true);
        });
        
        file.on('error', (err) => {
          fs.unlink(localPath, () => {});
          console.log(`❌ Error writing file: ${err.message}`);
          resolve(false);
        });
      } else {
        console.log(`❌ HTTP ${response.statusCode} for: ${url}`);
        resolve(false);
      }
    });

    request.on('error', (err) => {
      console.log(`❌ Request error: ${err.message}`);
      resolve(false);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      console.log(`❌ Timeout for: ${url}`);
      resolve(false);
    });
  });
}

function getImageExtension(url: string): string {
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath).toLowerCase();
  return ext || '.jpg'; // Default to .jpg if no extension found
}

async function downloadMissingImages() {
  console.log('🚀 Starting comprehensive image download...');
  
  const propertiesPath = path.join(process.cwd(), 'data/properties.json');
  const properties: Property[] = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
  
  let downloadQueue: { url: string; localPath: string; propertyId: string }[] = [];
  let updatedProperties: Property[] = [];
  
  // Build download queue
  for (const property of properties) {
    const propertyDir = path.join(process.cwd(), PROPERTIES_DIR, property.id);
    let propertyImages: string[] = [];
    let hasValidImages = false;
    
    // Check existing images first
    if (property.images && property.images.length > 0) {
      for (const imagePath of property.images) {
        const fullPath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          propertyImages.push(imagePath);
          hasValidImages = true;
        }
      }
    }
    
    // Check image_urls for external images to download
    if (property.image_urls && property.image_urls.length > 0) {
      for (let i = 0; i < property.image_urls.length; i++) {
        const imageUrl = property.image_urls[i];
        
        // Skip local paths and placeholders
        if (!imageUrl.startsWith('http') || imageUrl.includes('placehold')) {
          continue;
        }
        
        const ext = getImageExtension(imageUrl);
        const filename = `image_${i}${ext}`;
        const localPath = path.join(propertyDir, filename);
        const webPath = `/uploads/properties/${property.id}/${filename}`;
        
        // Check if already downloaded
        if (!fs.existsSync(localPath)) {
          downloadQueue.push({
            url: imageUrl,
            localPath,
            propertyId: property.id
          });
        } else {
          hasValidImages = true;
        }
        
        propertyImages.push(webPath);
      }
    }
    
    // If no valid images found, keep placeholder
    if (!hasValidImages && propertyImages.length === 0) {
      propertyImages.push(`/uploads/properties/${property.id}/placeholder.svg`);
    }
    
    updatedProperties.push({
      ...property,
      images: propertyImages
    });
  }
  
  console.log(`📦 Found ${downloadQueue.length} images to download`);
  
  if (downloadQueue.length === 0) {
    console.log('✅ All images are already available!');
    return;
  }
  
  // Download images in batches
  let downloaded = 0;
  let failed = 0;
  
  for (let i = 0; i < downloadQueue.length; i += MAX_CONCURRENT) {
    const batch = downloadQueue.slice(i, i + MAX_CONCURRENT);
    
    console.log(`\n📥 Downloading batch ${Math.floor(i / MAX_CONCURRENT) + 1}/${Math.ceil(downloadQueue.length / MAX_CONCURRENT)}`);
    
    const promises = batch.map(async (item) => {
      await sleep(Math.random() * 1000); // Random delay to avoid rate limiting
      const success = await downloadImage(item.url, item.localPath);
      return success;
    });
    
    const results = await Promise.all(promises);
    
    results.forEach((success) => {
      if (success) downloaded++;
      else failed++;
    });
    
    console.log(`Progress: ${downloaded} downloaded, ${failed} failed, ${downloadQueue.length - downloaded - failed} remaining`);
    
    // Delay between batches
    if (i + MAX_CONCURRENT < downloadQueue.length) {
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
  }
  
  // Update properties.json with new image paths
  fs.writeFileSync(propertiesPath, JSON.stringify(updatedProperties, null, 2));
  
  console.log('\n📊 DOWNLOAD SUMMARY:');
  console.log('==================');
  console.log(`✅ Successfully downloaded: ${downloaded} images`);
  console.log(`❌ Failed downloads: ${failed} images`);
  console.log(`📱 Total properties updated: ${properties.length}`);
  console.log(`💾 Database updated with new image paths`);
  
  if (downloaded > 0) {
    console.log('\n🎉 Images successfully downloaded and mapped!');
  }
}

downloadMissingImages().catch(console.error);

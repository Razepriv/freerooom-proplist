import { promises as fs } from 'fs';
import path from 'path';

interface Property {
  id: string;
  image_urls: string[];
  image_url?: string;
  [key: string]: any;
}

async function mapAndFixImages() {
  const dataPath = path.join(process.cwd(), 'data', 'properties.json');
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads', 'properties');
  
  console.log('📁 Reading properties database...');
  const data = await fs.readFile(dataPath, 'utf-8');
  const properties: Property[] = JSON.parse(data);
  
  console.log('📁 Reading uploads directory...');
  const uploadsContents = await fs.readdir(uploadsPath);
  
  // Separate files and directories
  const files: string[] = [];
  const directories: string[] = [];
  
  for (const item of uploadsContents) {
    const itemPath = path.join(uploadsPath, item);
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory()) {
      directories.push(item);
    } else {
      files.push(item);
    }
  }
  
  console.log(`📊 Found ${files.length} loose files and ${directories.length} organized directories`);
  
  // Create a map of available images
  const availableImages: Map<string, string> = new Map();
  
  // Add loose files
  files.forEach(file => {
    const filename = path.parse(file).name;
    availableImages.set(filename, `/uploads/properties/${file}`);
    availableImages.set(file, `/uploads/properties/${file}`);
  });
  
  // Add organized directory files
  for (const dir of directories) {
    const dirPath = path.join(uploadsPath, dir);
    const dirFiles = await fs.readdir(dirPath);
    dirFiles.forEach(file => {
      const filename = path.parse(file).name;
      availableImages.set(filename, `/uploads/properties/${dir}/${file}`);
      availableImages.set(file, `/uploads/properties/${dir}/${file}`);
    });
  }
  
  console.log(`🗺️  Mapped ${availableImages.size} available images`);
  
  let fixedCount = 0;
  let missingCount = 0;
  
  // Fix properties with missing or broken image paths
  for (const property of properties) {
    let hasChanges = false;
    const validImageUrls: string[] = [];
    
    if (property.image_urls && Array.isArray(property.image_urls)) {
      for (const imageUrl of property.image_urls) {
        if (typeof imageUrl === 'string') {
          // Check if the image exists
          const fullPath = path.join(process.cwd(), 'public', imageUrl);
          try {
            await fs.access(fullPath);
            validImageUrls.push(imageUrl);
          } catch {
            // Image doesn't exist, try to find it
            const imageName = path.basename(imageUrl);
            const imageNameWithoutExt = path.parse(imageName).name;
            
            if (availableImages.has(imageName)) {
              validImageUrls.push(availableImages.get(imageName)!);
              hasChanges = true;
            } else if (availableImages.has(imageNameWithoutExt)) {
              validImageUrls.push(availableImages.get(imageNameWithoutExt)!);
              hasChanges = true;
            } else {
              console.log(`❌ Missing image: ${imageUrl} for property ${property.id}`);
              missingCount++;
            }
          }
        }
      }
    }
    
    // If no valid images found, try to find images by property ID or timestamp
    if (validImageUrls.length === 0 && property.id) {
      const propId = property.id.replace('prop-', '');
      const matchingImages = Array.from(availableImages.entries()).filter(([key, value]) => 
        key.includes(propId) || value.includes(propId)
      );
      
      if (matchingImages.length > 0) {
        validImageUrls.push(...matchingImages.map(([, value]) => value));
        hasChanges = true;
        console.log(`🔄 Found ${matchingImages.length} images for property ${property.id} by ID matching`);
      }
    }
    
    if (hasChanges || validImageUrls.length !== property.image_urls?.length) {
      property.image_urls = validImageUrls;
      property.image_url = validImageUrls.length > 0 ? validImageUrls[0] : 'https://placehold.co/600x400.png';
      fixedCount++;
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} properties`);
  console.log(`❌ ${missingCount} images are missing`);
  
  // Save the updated database
  await fs.writeFile(dataPath, JSON.stringify(properties, null, 2));
  console.log('💾 Database updated successfully!');
  
  // Generate a report
  const report = {
    totalProperties: properties.length,
    propertiesWithImages: properties.filter(p => p.image_urls && p.image_urls.length > 0).length,
    propertiesWithoutImages: properties.filter(p => !p.image_urls || p.image_urls.length === 0).length,
    totalAvailableImages: availableImages.size,
    looseFiles: files.length,
    organizedDirectories: directories.length,
    fixedProperties: fixedCount,
    missingImages: missingCount
  };
  
  console.log('\n📊 MAPPING REPORT:');
  console.log('==================');
  console.log(`Total Properties: ${report.totalProperties}`);
  console.log(`Properties with Images: ${report.propertiesWithImages}`);
  console.log(`Properties without Images: ${report.propertiesWithoutImages}`);
  console.log(`Total Available Images: ${report.totalAvailableImages}`);
  console.log(`Loose Files: ${report.looseFiles}`);
  console.log(`Organized Directories: ${report.organizedDirectories}`);
  console.log(`Fixed Properties: ${report.fixedProperties}`);
  console.log(`Missing Images: ${report.missingImages}`);
  
  return report;
}

// Run the script
if (require.main === module) {
  mapAndFixImages().catch(console.error);
}

export { mapAndFixImages };

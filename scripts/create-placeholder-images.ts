import fs from 'fs';
import path from 'path';

const PROPERTIES_DIR = 'public/uploads/properties';
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTUwSDIyNVYxNzVIMTc1VjE1MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTE1MCAyMDBIMjUwVjI1MEgxNTBWMjAwWiIgZmlsbD0iI0QxRDVEQiIvPgo8cGF0aCBkPSJNMTAwIDEwMEgzMDBWMTc1SDEwMFYxMDBaIiBmaWxsPSIjOTNBNkIyIi8+CjxtYXNrIGlkPSJtYXNrMF8xXzEiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjEwMCIgeT0iMTAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9Ijc1Ij4KPHBhdGggZD0iTTEwMCAxMDBIMzAwVjE3NUgxMDBWMTAwWiIgZmlsbD0id2hpdGUiLz4KPC9tYXNrPgo8ZyBtYXNrPSJ1cmwoI21hc2swXzFfMSkiPgo8cGF0aCBkPSJNMTI1IDEyNUMxMzguODA3IDEyNSAxNTAgMTM2LjE5MyAxNTAgMTUwQzE1MCAxNjMuODA3IDEzOC44MDcgMTc1IDEyNSAxNzVDMTExLjE5MyAxNzUgMTAwIDE2My44MDcgMTAwIDE1MEMxMDAgMTM2LjE5MyAxMTEuMTkzIDEyNSAxMjUgMTI1WiIgZmlsbD0iI0Y5RkFGQiIvPgo8cGF0aCBkPSJNMjc1IDEyNUMyODguODA3IDEyNSAzMDAgMTM2LjE5MyAzMDAgMTUwQzMwMCAxNjMuODA3IDI4OC44MDcgMTc1IDI3NSAxNzVDMjYxLjE5MyAxNzUgMjUwIDE2My44MDcgMjUwIDE1MEMyNTAgMTM2LjE5MyAyNjEuMTkzIDEyNSAyNzUgMTI1WiIgZmlsbD0iI0Y5RkFGQiIvPgo8L2c+CjwvZz4KPC9zdmc+';

async function createPlaceholderImages() {
  console.log('🖼️  Creating placeholder images for missing properties...');
  
  // Read properties data
  const propertiesPath = path.join(process.cwd(), 'data/properties.json');
  const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
  
  let createdPlaceholders = 0;
  
  for (const property of properties) {
    if (!property.images || property.images.length === 0) {
      // Create property directory
      const propertyDir = path.join(process.cwd(), PROPERTIES_DIR, property.id);
      
      if (!fs.existsSync(propertyDir)) {
        fs.mkdirSync(propertyDir, { recursive: true });
      }
      
      // Create placeholder image
      const placeholderPath = path.join(propertyDir, 'placeholder.svg');
      const svgContent = Buffer.from(PLACEHOLDER_IMAGE.split(',')[1], 'base64').toString();
      
      fs.writeFileSync(placeholderPath, svgContent);
      
      // Update property with placeholder image
      property.images = [`/uploads/properties/${property.id}/placeholder.svg`];
      createdPlaceholders++;
    }
  }
  
  // Save updated properties
  fs.writeFileSync(propertiesPath, JSON.stringify(properties, null, 2));
  
  console.log(`✅ Created ${createdPlaceholders} placeholder images`);
  console.log('📂 Properties directory structure updated');
  console.log('💾 Database updated with placeholder images');
}

createPlaceholderImages().catch(console.error);

import { promises as fs } from 'fs';
import path from 'path';

interface Property {
  id: string;
  [key: string]: any;
}

async function fixJsonFile() {
  const dataPath = path.join(process.cwd(), 'data', 'properties.json');
  const backupPath = path.join(process.cwd(), 'data', 'properties_backup.json');
  
  console.log('🔧 Fixing corrupted JSON file...');
  
  try {
    // Read the corrupted file
    const corruptedData = await fs.readFile(dataPath, 'utf-8');
    
    // Find all valid property objects
    const propertyMatches = corruptedData.match(/\{[^{}]*"id"\s*:\s*"[^"]*"[^{}]*\}/g);
    
    if (!propertyMatches) {
      console.log('❌ No valid properties found');
      return;
    }
    
    console.log(`📊 Found ${propertyMatches.length} potential property objects`);
    
    const validProperties: Property[] = [];
    const seenIds = new Set<string>();
    
    for (const match of propertyMatches) {
      try {
        // Try to parse each potential property object
        const property = JSON.parse(match);
        
        // Validate it has required fields
        if (property.id && typeof property.id === 'string' && !seenIds.has(property.id)) {
          seenIds.add(property.id);
          validProperties.push(property);
        }
      } catch (error) {
        // Skip invalid JSON objects
        continue;
      }
    }
    
    console.log(`✅ Extracted ${validProperties.length} valid properties`);
    
    // Create clean JSON file
    const cleanJson = JSON.stringify(validProperties, null, 2);
    await fs.writeFile(dataPath, cleanJson);
    
    console.log('💾 Clean JSON file saved successfully!');
    console.log(`📈 Total properties: ${validProperties.length}`);
    
    // Show sample of fixed properties
    console.log('\n📋 Sample properties:');
    validProperties.slice(0, 3).forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.title || 'Untitled'} (${prop.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing JSON:', error);
  }
}

// Run the script
if (require.main === module) {
  fixJsonFile().catch(console.error);
}

export { fixJsonFile }; 
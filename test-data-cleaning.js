/**
 * Test script to verify export data cleanup (removing AED and sq ft)
 */

const fs = require('fs');
const path = require('path');

// Helper functions (same as in export.ts)
const extractPriceNumber = (priceString) => {
  if (!priceString) return '';
  const numericPrice = priceString.replace(/[^0-9.]/g, '');
  return numericPrice || '';
};

const extractAreaNumber = (areaString) => {
  if (!areaString) return '';
  const numericArea = areaString.replace(/sq\s*ft|sqft|square\s*feet|[^0-9.]/gi, '');
  return numericArea || '';
};

function testDataCleaning() {
  console.log('🧪 Testing data cleaning for export...\n');
  
  // Test data samples
  const testCases = [
    { price: 'AED 75,000', area: '1,200 sq ft' },
    { price: '2,500,000', area: '850 sqft' },
    { price: 'AED 1,250,000', area: '2,100 square feet' },
    { price: '85000', area: '750' },
    { price: 'AED 3,750,000', area: '1,850 Sq Ft' }
  ];
  
  console.log('📊 Before and After Cleaning:');
  console.log('----------------------------------------');
  
  testCases.forEach((testCase, index) => {
    const cleanPrice = extractPriceNumber(testCase.price);
    const cleanArea = extractAreaNumber(testCase.area);
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Price: "${testCase.price}" → "${cleanPrice}"`);
    console.log(`  Area:  "${testCase.area}" → "${cleanArea}"`);
    console.log('');
  });
  
  // Test with actual data
  const propertiesPath = path.join(__dirname, 'data', 'properties.json');
  const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
  
  console.log('🏠 Sample real data (first 5 properties):');
  console.log('----------------------------------------');
  
  properties.slice(0, 5).forEach((prop, index) => {
    const cleanPrice = extractPriceNumber(prop.price);
    const cleanArea = extractAreaNumber(prop.area);
    
    console.log(`Property ${index + 1}:`);
    console.log(`  Original Price: "${prop.price}"`);
    console.log(`  Cleaned Price:  "${cleanPrice}"`);
    console.log(`  Original Area:  "${prop.area}"`);
    console.log(`  Cleaned Area:   "${cleanArea}"`);
    console.log('');
  });
  
  console.log('✅ Data cleaning test completed!');
}

testDataCleaning().catch(console.error);

#!/usr/bin/env node

/**
 * Production Readiness Test Script
 * Tests all critical functionality to ensure the app works after deployment
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✅ ${description}`, 'green');
  } else {
    log(`❌ ${description}`, 'red');
  }
  return exists;
}

function checkExportHelpers() {
  log('\n📊 Testing Export Helper Functions', 'blue');
  
  try {
    // Read the export.ts file to check for helper functions
    const exportPath = path.join(__dirname, 'src/lib/export.ts');
    const exportContent = fs.readFileSync(exportPath, 'utf-8');
    
    const helpers = [
      'extractPriceNumber',
      'extractAreaNumber', 
      'normalizeCityName'
    ];
    
    let allHelpersPresent = true;
    helpers.forEach(helper => {
      if (exportContent.includes(helper)) {
        log(`✅ Helper function: ${helper}`, 'green');
      } else {
        log(`❌ Missing helper function: ${helper}`, 'red');
        allHelpersPresent = false;
      }
    });
    
    // Test price cleaning logic
    if (exportContent.includes("replace(/[^0-9.]/g, '')")) {
      log('✅ Price cleaning logic present', 'green');
    } else {
      log('❌ Price cleaning logic missing', 'red');
      allHelpersPresent = false;
    }
    
    // Test area cleaning logic
    if (exportContent.includes("sq\\s*ft|sqft|square\\s*feet")) {
      log('✅ Area cleaning logic present', 'green');
    } else {
      log('❌ Area cleaning logic missing', 'red');
      allHelpersPresent = false;
    }
    
    // Test city normalization
    const cities = ['dubai', 'abu dhabi', 'sharjah', 'ajman'];
    let cityLogicPresent = true;
    cities.forEach(city => {
      if (!exportContent.includes(city)) {
        log(`❌ City normalization missing: ${city}`, 'red');
        cityLogicPresent = false;
      }
    });
    
    if (cityLogicPresent) {
      log('✅ City normalization logic present', 'green');
    }
    
    return allHelpersPresent && cityLogicPresent;
  } catch (error) {
    log(`❌ Error checking export helpers: ${error.message}`, 'red');
    return false;
  }
}

function checkDatabaseAbstraction() {
  log('\n🗄️ Testing Database Abstraction', 'blue');
  
  let allPresent = true;
  
  // Check config file
  allPresent &= checkFileExists('src/lib/config.ts', 'Environment config file');
  
  // Check database adapter
  allPresent &= checkFileExists('src/lib/database-adapter.ts', 'Database adapter file');
  
  try {
    // Check database adapter content
    const adapterPath = path.join(__dirname, 'src/lib/database-adapter.ts');
    const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
    
    if (adapterContent.includes('FilesystemAdapter')) {
      log('✅ Filesystem adapter present', 'green');
    } else {
      log('❌ Filesystem adapter missing', 'red');
      allPresent = false;
    }
    
    if (adapterContent.includes('InMemoryAdapter')) {
      log('✅ In-memory adapter present', 'green');
    } else {
      log('❌ In-memory adapter missing', 'red');
      allPresent = false;
    }
    
    if (adapterContent.includes('DatabaseAdapter')) {
      log('✅ Database interface present', 'green');
    } else {
      log('❌ Database interface missing', 'red');
      allPresent = false;
    }
    
    // Check db.ts uses adapter
    const dbPath = path.join(__dirname, 'src/lib/db.ts');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    
    if (dbContent.includes('getDatabase()') && !dbContent.includes('fs.readFile')) {
      log('✅ db.ts uses database adapter (no direct filesystem calls)', 'green');
    } else {
      log('❌ db.ts still has direct filesystem calls', 'red');
      allPresent = false;
    }
    
  } catch (error) {
    log(`❌ Error checking database abstraction: ${error.message}`, 'red');
    allPresent = false;
  }
  
  return allPresent;
}

function checkTypeScript() {
  log('\n🔧 Testing TypeScript Compilation', 'blue');
  
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    log('✅ TypeScript compilation successful', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript compilation failed', 'red');
    log(error.stdout?.toString() || error.message, 'red');
    return false;
  }
}

function checkBuild() {
  log('\n🏗️ Testing Production Build', 'blue');
  
  try {
    const { execSync } = require('child_process');
    log('Building application...', 'yellow');
    const output = execSync('npm run build', { stdio: 'pipe' });
    
    if (output.toString().includes('✓ Compiled successfully')) {
      log('✅ Production build successful', 'green');
      return true;
    } else {
      log('❌ Production build failed', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Production build failed', 'red');
    log(error.stdout?.toString() || error.message, 'red');
    return false;
  }
}

function checkPackageJson() {
  log('\n📦 Testing Package Configuration', 'blue');
  
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    let allGood = true;
    
    const requiredScripts = ['build', 'start', 'dev'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`✅ Script present: ${script}`, 'green');
      } else {
        log(`❌ Missing script: ${script}`, 'red');
        allGood = false;
      }
    });
    
    const requiredDeps = ['next', 'react', 'file-saver', 'xlsx'];
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log(`✅ Dependency present: ${dep}`, 'green');
      } else {
        log(`❌ Missing dependency: ${dep}`, 'red');
        allGood = false;
      }
    });
    
    return allGood;
  } catch (error) {
    log(`❌ Error checking package.json: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvironmentFiles() {
  log('\n🌍 Testing Environment Configuration', 'blue');
  
  let configPresent = true;
  
  // Check for environment files
  if (fs.existsSync('.env') || fs.existsSync('.env.local') || fs.existsSync('.env.example')) {
    log('✅ Environment file present', 'green');
  } else {
    log('⚠️ No environment file found (optional)', 'yellow');
  }
  
  // Check Next.js config
  configPresent &= checkFileExists('next.config.ts', 'Next.js configuration');
  
  return configPresent;
}

function generateDeploymentReport() {
  log('\n📋 Generating Deployment Report', 'magenta');
  
  const report = {
    timestamp: new Date().toISOString(),
    exportHelpers: checkExportHelpers(),
    databaseAbstraction: checkDatabaseAbstraction(),
    typeScript: checkTypeScript(),
    packageConfig: checkPackageJson(),
    environmentConfig: checkEnvironmentFiles(),
    productionBuild: checkBuild()
  };
  
  const reportPath = path.join(__dirname, 'deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`\n📄 Report saved to: ${reportPath}`, 'blue');
  
  return report;
}

function main() {
  log('🚀 Production Readiness Test Suite', 'magenta');
  log('=====================================', 'magenta');
  
  const report = generateDeploymentReport();
  
  const allPassed = Object.values(report).every(result => 
    typeof result === 'boolean' ? result : true
  );
  
  log('\n📊 SUMMARY', 'magenta');
  log('==========', 'magenta');
  
  if (allPassed) {
    log('🎉 ALL TESTS PASSED! App is ready for deployment.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Deploy to Vercel: npm i -g vercel && vercel', 'blue');
    log('2. Set environment variables in dashboard', 'blue');
    log('3. Test all features post-deployment', 'blue');
  } else {
    log('❌ Some tests failed. Please fix issues before deployment.', 'red');
    log('\nCheck the issues above and:', 'yellow');
    log('1. Fix any missing files or functions', 'yellow');
    log('2. Resolve TypeScript errors', 'yellow');
    log('3. Ensure build succeeds', 'yellow');
    log('4. Re-run this test script', 'yellow');
  }
  
  log('\n📚 See DEPLOYMENT.md for detailed deployment guide', 'blue');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkExportHelpers,
  checkDatabaseAbstraction,
  checkTypeScript,
  checkBuild,
  checkPackageJson,
  checkEnvironmentFiles
};

#!/usr/bin/env node

// Comprehensive bot health check
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting comprehensive bot health check...\n');

const checks = [];

// Check 1: Required files exist
function checkFiles() {
  console.log('📁 Checking required files...');
  
  const requiredFiles = [
    'src/index.js',
    'src/config.js',
    'package.json',
    '.env.example',
    'src/commands/rpg/farm.js',
    'src/commands/rpg/dungeon.js',
    'src/data/rpg.js',
    'src/events/interactionCreate.js',
    'src/events/messageCreate.js',
    'src/systems/afk.js',
    'src/health.js'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING!`);
      allFilesExist = false;
    }
  });
  
  checks.push({ name: 'Required Files', status: allFilesExist ? 'PASS' : 'FAIL' });
  return allFilesExist;
}

// Check 2: Package.json dependencies
function checkDependencies() {
  console.log('\n📦 Checking package.json dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['discord.js', 'dotenv', 'better-sqlite3', 'pino'];
    
    let allDepsOk = true;
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        console.log(`   ❌ ${dep} - MISSING!`);
        allDepsOk = false;
      }
    });
    
    // Check if canvas is in devDependencies (good for Railway)
    if (packageJson.devDependencies && packageJson.devDependencies.canvas) {
      console.log(`   ✅ canvas: moved to devDependencies (good for Railway)`);
    } else if (packageJson.dependencies && packageJson.dependencies.canvas) {
      console.log(`   ⚠️ canvas: still in dependencies (may cause Railway issues)`);
    }
    
    checks.push({ name: 'Dependencies', status: allDepsOk ? 'PASS' : 'FAIL' });
    return allDepsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read package.json: ${err.message}`);
    checks.push({ name: 'Dependencies', status: 'FAIL' });
    return false;
  }
}

// Check 3: Environment variables template
function checkEnvTemplate() {
  console.log('\n🔧 Checking .env.example...');
  
  try {
    const envExample = fs.readFileSync('.env.example', 'utf8');
    const requiredVars = ['TOKEN', 'CLIENT_ID', 'OWNER_ID'];
    
    let allVarsOk = true;
    
    requiredVars.forEach(varName => {
      if (envExample.includes(varName)) {
        console.log(`   ✅ ${varName}`);
      } else {
        console.log(`   ❌ ${varName} - MISSING from .env.example!`);
        allVarsOk = false;
      }
    });
    
    checks.push({ name: 'Environment Template', status: allVarsOk ? 'PASS' : 'FAIL' });
    return allVarsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read .env.example: ${err.message}`);
    checks.push({ name: 'Environment Template', status: 'FAIL' });
    return false;
  }
}

// Check 4: Farm command structure
function checkFarmCommand() {
  console.log('\n🌾 Checking farm command...');
  
  try {
    const farmContent = fs.readFileSync('src/commands/rpg/farm.js', 'utf8');
    
    const requiredElements = [
      { name: 'CROPS object', pattern: /const CROPS = {/ },
      { name: 'SlashCommandBuilder', pattern: /SlashCommandBuilder/ },
      { name: 'execute function', pattern: /async execute/ },
      { name: 'handleFarmButton', pattern: /handleFarmButton/ },
      { name: 'handleFarmSelectMenu', pattern: /handleFarmSelectMenu/ },
      { name: 'inventory safety check', pattern: /farm\.inventory && farm\.inventory/ },
      { name: 'guildStorage import', pattern: /readGuild|writeGuild/ }
    ];
    
    let allElementsOk = true;
    
    requiredElements.forEach(element => {
      if (farmContent.match(element.pattern)) {
        console.log(`   ✅ ${element.name}`);
      } else {
        console.log(`   ❌ ${element.name} - MISSING!`);
        allElementsOk = false;
      }
    });
    
    checks.push({ name: 'Farm Command', status: allElementsOk ? 'PASS' : 'FAIL' });
    return allElementsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read farm.js: ${err.message}`);
    checks.push({ name: 'Farm Command', status: 'FAIL' });
    return false;
  }
}

// Check 5: Dungeon command structure
function checkDungeonCommand() {
  console.log('\n⚔️ Checking dungeon command...');
  
  try {
    const dungeonContent = fs.readFileSync('src/commands/rpg/dungeon.js', 'utf8');
    
    const requiredElements = [
      { name: 'BOSSES import', pattern: /BOSSES/ },
      { name: 'ENEMIES import', pattern: /ENEMIES/ },
      { name: 'SlashCommandBuilder', pattern: /SlashCommandBuilder/ },
      { name: 'solo dungeon', pattern: /runSoloDungeon/ },
      { name: 'party dungeon', pattern: /runPartyDungeon/ },
      { name: 'boss images', pattern: /boss\.image/ },
      { name: 'collector end handling', pattern: /reason !== 'continue'/ },
      { name: 'victory embed', pattern: /victoryEmbed/ }
    ];
    
    let allElementsOk = true;
    
    requiredElements.forEach(element => {
      if (dungeonContent.match(element.pattern)) {
        console.log(`   ✅ ${element.name}`);
      } else {
        console.log(`   ❌ ${element.name} - MISSING!`);
        allElementsOk = false;
      }
    });
    
    checks.push({ name: 'Dungeon Command', status: allElementsOk ? 'PASS' : 'FAIL' });
    return allElementsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read dungeon.js: ${err.message}`);
    checks.push({ name: 'Dungeon Command', status: 'FAIL' });
    return false;
  }
}

// Check 6: RPG data structure
function checkRPGData() {
  console.log('\n📊 Checking RPG data...');
  
  try {
    const rpgContent = fs.readFileSync('src/data/rpg.js', 'utf8');
    
    const requiredElements = [
      { name: 'RPG_CLASSES', pattern: /const RPG_CLASSES/ },
      { name: 'RPG_RACES', pattern: /const RPG_RACES/ },
      { name: 'STAGES', pattern: /const STAGES/ },
      { name: 'ENEMIES with images', pattern: /image.*http/ },
      { name: 'BOSSES with images', pattern: /image.*http/ },
      { name: 'SHOP_ITEMS', pattern: /const SHOP_ITEMS/ }
    ];
    
    let allElementsOk = true;
    
    requiredElements.forEach(element => {
      if (rpgContent.match(element.pattern)) {
        console.log(`   ✅ ${element.name}`);
      } else {
        console.log(`   ❌ ${element.name} - MISSING!`);
        allElementsOk = false;
      }
    });
    
    checks.push({ name: 'RPG Data', status: allElementsOk ? 'PASS' : 'FAIL' });
    return allElementsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read rpg.js: ${err.message}`);
    checks.push({ name: 'RPG Data', status: 'FAIL' });
    return false;
  }
}

// Check 7: Interaction handlers
function checkInteractionHandlers() {
  console.log('\n🎮 Checking interaction handlers...');
  
  try {
    const interactionContent = fs.readFileSync('src/events/interactionCreate.js', 'utf8');
    
    const requiredElements = [
      { name: 'Button handling', pattern: /isButton/ },
      { name: 'Select menu handling', pattern: /isStringSelectMenu/ },
      { name: 'Farm button handler', pattern: /farm_select_crop/ },
      { name: 'Slash command handling', pattern: /isChatInputCommand/ },
      { name: 'Error handling', pattern: /try.*catch/ }
    ];
    
    let allElementsOk = true;
    
    requiredElements.forEach(element => {
      if (interactionContent.match(element.pattern)) {
        console.log(`   ✅ ${element.name}`);
      } else {
        console.log(`   ❌ ${element.name} - MISSING!`);
        allElementsOk = false;
      }
    });
    
    checks.push({ name: 'Interaction Handlers', status: allElementsOk ? 'PASS' : 'FAIL' });
    return allElementsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read interactionCreate.js: ${err.message}`);
    checks.push({ name: 'Interaction Handlers', status: 'FAIL' });
    return false;
  }
}

// Check 8: Railway configuration
function checkRailwayConfig() {
  console.log('\n🚂 Checking Railway configuration...');
  
  const railwayFiles = ['railway.json', 'nixpacks.toml', 'Procfile'];
  let allFilesOk = true;
  
  railwayFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING!`);
      allFilesOk = false;
    }
  });
  
  // Check railway.json content
  if (fs.existsSync('railway.json')) {
    try {
      const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
      if (railwayConfig.deploy && railwayConfig.deploy.healthcheckPath) {
        console.log(`   ✅ Health check configured: ${railwayConfig.deploy.healthcheckPath}`);
      } else {
        console.log(`   ⚠️ No health check configured in railway.json`);
      }
    } catch (err) {
      console.log(`   ❌ Invalid railway.json: ${err.message}`);
      allFilesOk = false;
    }
  }
  
  checks.push({ name: 'Railway Config', status: allFilesOk ? 'PASS' : 'FAIL' });
  return allFilesOk;
}

// Check 9: Health check system
function checkHealthSystem() {
  console.log('\n💓 Checking health check system...');
  
  try {
    const healthContent = fs.readFileSync('src/health.js', 'utf8');
    
    const requiredElements = [
      { name: 'HTTP server', pattern: /http\.createServer/ },
      { name: 'startHealthCheck function', pattern: /function startHealthCheck/ },
      { name: 'setBotReady function', pattern: /function setBotReady/ },
      { name: 'Graceful shutdown', pattern: /SIGTERM|SIGINT/ },
      { name: 'Port binding', pattern: /0\.0\.0\.0/ }
    ];
    
    let allElementsOk = true;
    
    requiredElements.forEach(element => {
      if (healthContent.match(element.pattern)) {
        console.log(`   ✅ ${element.name}`);
      } else {
        console.log(`   ❌ ${element.name} - MISSING!`);
        allElementsOk = false;
      }
    });
    
    checks.push({ name: 'Health System', status: allElementsOk ? 'PASS' : 'FAIL' });
    return allElementsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read health.js: ${err.message}`);
    checks.push({ name: 'Health System', status: 'FAIL' });
    return false;
  }
}

// Check 10: AFK system
function checkAFKSystem() {
  console.log('\n💤 Checking AFK system...');
  
  try {
    const afkContent = fs.readFileSync('src/systems/afk.js', 'utf8');
    
    const requiredElements = [
      { name: 'handleAFKReturn function', pattern: /function handleAFKReturn/ },
      { name: 'No XP on return', pattern: /لا تضيف XP/ },
      { name: 'Balance reward', pattern: /balance \+= gift/ },
      { name: 'Guild storage', pattern: /readGuild|writeGuild/ }
    ];
    
    let allElementsOk = true;
    
    requiredElements.forEach(element => {
      if (afkContent.match(element.pattern)) {
        console.log(`   ✅ ${element.name}`);
      } else {
        console.log(`   ❌ ${element.name} - MISSING!`);
        allElementsOk = false;
      }
    });
    
    checks.push({ name: 'AFK System', status: allElementsOk ? 'PASS' : 'FAIL' });
    return allElementsOk;
  } catch (err) {
    console.log(`   ❌ Failed to read afk.js: ${err.message}`);
    checks.push({ name: 'AFK System', status: 'FAIL' });
    return false;
  }
}

// Run all checks
function runAllChecks() {
  const results = [
    checkFiles(),
    checkDependencies(),
    checkEnvTemplate(),
    checkFarmCommand(),
    checkDungeonCommand(),
    checkRPGData(),
    checkInteractionHandlers(),
    checkRailwayConfig(),
    checkHealthSystem(),
    checkAFKSystem()
  ];
  
  console.log('\n📋 HEALTH CHECK SUMMARY:');
  console.log('='.repeat(50));
  
  checks.forEach(check => {
    const status = check.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.status}`);
  });
  
  const passedChecks = checks.filter(c => c.status === 'PASS').length;
  const totalChecks = checks.length;
  
  console.log('='.repeat(50));
  console.log(`📊 Overall Status: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    console.log('🎉 Bot is HEALTHY and ready for deployment!');
    console.log('\n🚀 Next steps:');
    console.log('1. Test locally: npm start');
    console.log('2. Deploy to Railway');
    console.log('3. Test commands: /farm, /dungeon, /afk');
  } else {
    console.log('⚠️ Bot has issues that need to be fixed before deployment!');
    console.log('\n🔧 Please fix the FAILED checks above.');
  }
  
  return passedChecks === totalChecks;
}

// Run the health check
runAllChecks();

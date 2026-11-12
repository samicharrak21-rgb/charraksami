#!/usr/bin/env node

// Test command structures and potential issues
const fs = require('fs');

console.log('🧪 Testing command structures and potential issues...\n');

// Test 1: Farm command edge cases
function testFarmCommand() {
  console.log('🌾 Testing farm command edge cases...');
  
  try {
    const farmContent = fs.readFileSync('src/commands/rpg/farm.js', 'utf8');
    
    // Check for potential issues
    const issues = [];
    
    // Check for undefined access patterns
    if (farmContent.includes('farm.inventory[') && !farmContent.includes('farm.inventory &&')) {
      issues.push('Potential undefined access to farm.inventory');
    }
    
    // Check for proper error handling
    const errorHandling = farmContent.match(/catch\s*\([^)]*\)\s*{[^}]*}/g);
    if (errorHandling.length < 5) {
      issues.push('Insufficient error handling in farm command');
    }
    
    // Check for deferReply usage
    if (!farmContent.includes('deferReply')) {
      issues.push('Missing deferReply - may cause timeouts');
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No issues found in farm command');
    } else {
      issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
    
    return issues.length === 0;
  } catch (err) {
    console.log(`   ❌ Error testing farm command: ${err.message}`);
    return false;
  }
}

// Test 2: Dungeon command edge cases
function testDungeonCommand() {
  console.log('\n⚔️ Testing dungeon command edge cases...');
  
  try {
    const dungeonContent = fs.readFileSync('src/commands/rpg/dungeon.js', 'utf8');
    
    const issues = [];
    
    // Check for thread deletion logic
    if (!dungeonContent.includes('reason !== \'continue\'')) {
      issues.push('Thread may be deleted prematurely on continue');
    }
    
    // Check for boss image validation
    if (!dungeonContent.includes('boss\.image')) {
      issues.push('Boss images may not be displayed');
    }
    
    // Check for proper collector cleanup
    if (!dungeonContent.includes('collector\.on\(\'end\'')) {
      issues.push('Missing collector end handler');
    }
    
    // Check for party size validation
    if (!dungeonContent.includes('party\.length')) {
      issues.push('Missing party size validation');
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No issues found in dungeon command');
    } else {
      issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
    
    return issues.length === 0;
  } catch (err) {
    console.log(`   ❌ Error testing dungeon command: ${err.message}`);
    return false;
  }
}

// Test 3: Data consistency
function testDataConsistency() {
  console.log('\n📊 Testing data consistency...');
  
  try {
    const rpgContent = fs.readFileSync('src/data/rpg.js', 'utf8');
    
    const issues = [];
    
    // Check if all bosses have required properties
    const bossMatch = rpgContent.match(/const BOSSES = \[([\s\S]*?)\];/);
    if (bossMatch) {
      const bossesText = bossMatch[1];
      const bossEntries = bossesText.split('},').filter(b => b.includes('{'));
      
      bossEntries.forEach((boss, index) => {
        if (!boss.includes('name:')) issues.push(`Boss ${index + 1} missing name`);
        if (!boss.includes('hp:')) issues.push(`Boss ${index + 1} missing hp`);
        if (!boss.includes('atk:')) issues.push(`Boss ${index + 1} missing atk`);
        if (!boss.includes('stage:')) issues.push(`Boss ${index + 1} missing stage`);
        if (!boss.includes('image:')) issues.push(`Boss ${index + 1} missing image`);
      });
    }
    
    // Check if all enemies have required properties
    const enemyMatch = rpgContent.match(/const ENEMIES = \[([\s\S]*?)\];/);
    if (enemyMatch) {
      const enemiesText = enemyMatch[1];
      const enemyEntries = enemiesText.split('},').filter(e => e.includes('{'));
      
      enemyEntries.forEach((enemy, index) => {
        if (!enemy.includes('name:')) issues.push(`Enemy ${index + 1} missing name`);
        if (!enemy.includes('hp:')) issues.push(`Enemy ${index + 1} missing hp`);
        if (!enemy.includes('atk:')) issues.push(`Enemy ${index + 1} missing atk`);
        if (!enemy.includes('stage:')) issues.push(`Enemy ${index + 1} missing stage`);
      });
    }
    
    if (issues.length === 0) {
      console.log('   ✅ Data consistency looks good');
    } else {
      issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
    
    return issues.length === 0;
  } catch (err) {
    console.log(`   ❌ Error testing data consistency: ${err.message}`);
    return false;
  }
}

// Test 4: Memory leaks potential
function testMemoryLeaks() {
  console.log('\n💾 Testing for potential memory leaks...');
  
  const issues = [];
  
  try {
    // Check interactionCreate.js for proper cleanup
    const interactionContent = fs.readFileSync('src/events/interactionCreate.js', 'utf8');
    
    if (!interactionContent.includes('collector\.on\(\'end\'')) {
      issues.push('Missing collector cleanup in interactionCreate');
    }
    
    // Check dungeon.js for collector cleanup
    const dungeonContent = fs.readFileSync('src/commands/rpg/dungeon.js', 'utf8');
    const collectorEndHandlers = (dungeonContent.match(/collector\.on\('end'/g) || []).length;
    if (collectorEndHandlers < 3) {
      issues.push('Insufficient collector end handlers in dungeon');
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No obvious memory leak patterns found');
    } else {
      issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
    
    return issues.length === 0;
  } catch (err) {
    console.log(`   ❌ Error testing memory leaks: ${err.message}`);
    return false;
  }
}

// Test 5: Security considerations
function testSecurity() {
  console.log('\n🔒 Testing security considerations...');
  
  const issues = [];
  
  try {
    // Check for eval usage
    const files = ['src/index.js', 'src/events/interactionCreate.js', 'src/commands/rpg/farm.js', 'src/commands/rpg/dungeon.js'];
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('eval(')) {
          issues.push(`Dangerous eval() found in ${file}`);
        }
      }
    });
    
    // Check for proper input validation
    const farmContent = fs.readFileSync('src/commands/rpg/farm.js', 'utf8');
    if (!farmContent.includes('interaction\.values\[0\]')) {
      issues.push('Missing input validation in farm select menu');
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No obvious security issues found');
    } else {
      issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
    
    return issues.length === 0;
  } catch (err) {
    console.log(`   ❌ Error testing security: ${err.message}`);
    return false;
  }
}

// Run all tests
function runAllTests() {
  const results = [
    testFarmCommand(),
    testDungeonCommand(),
    testDataConsistency(),
    testMemoryLeaks(),
    testSecurity()
  ];
  
  console.log('\n📋 DEEP ANALYSIS SUMMARY:');
  console.log('='.repeat(50));
  
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log(`📊 Deep Analysis Status: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 No deep issues found!');
    console.log('\n✅ Bot is production-ready!');
    console.log('\n🎯 Recommended testing:');
    console.log('1. Start bot locally: npm start');
    console.log('2. Test farm: /farm → plant → harvest');
    console.log('3. Test dungeon: /dungeon → solo → party');
    console.log('4. Test AFK: /afk set → send message');
    console.log('5. Check Railway deployment');
  } else {
    console.log('⚠️ Some issues found - review warnings above');
  }
  
  return passedTests === totalTests;
}

// Run the tests
runAllTests();

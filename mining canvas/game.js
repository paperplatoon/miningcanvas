import {
  initEnemies,
  updateEnemies,
  renderEnemies,
  checkLaserEnemyCollision
} from './enemies.js';


const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Responsive canvas sizing
        function resizeCanvas() {
            const container = document.querySelector('.game-container');
            const maxWidth = container.clientWidth - 40; // Account for padding
            const maxHeight = container.clientHeight - 40;
            
            // Calculate the aspect ratio based on visible blocks
            const aspectRatio = game.VISIBLE_BLOCKS_X / game.VISIBLE_BLOCKS_Y;
            
            let width = maxWidth;
            let height = width / aspectRatio;
            
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Update block size based on visible blocks, not world width
            game.BLOCK_SIZE = Math.floor(width / game.VISIBLE_BLOCKS_X);
        }

        // Simple config
        const game = {
            BLOCK_SIZE: 40,
            WORLD_WIDTH: 20,
            BASE_WORLD_HEIGHT: 50,
            VISIBLE_BLOCKS_X: 12,  // How many blocks wide the viewport is
            VISIBLE_BLOCKS_Y: 10,  // How many blocks tall the viewport is
            
            // Level system
            currentLevel: 1,
            currentWorldHeight: 50,
            
            // Ore generation settings
            oreGeneration: {
                oreChance: 0.2,
                platinumChance: 0.01,
                goldChance: 0.04,
                silverChance: 0.08,
            },
            
            // Player movement and action settings
            playerStats: {
                moveAcceleration: 0.5,
                thrustPower: 0.8,
                drillSpeed: 1.5,
                drillTime: 30,
            },

            physics: {
                gravity: 0.5,              // Was 0.3 - higher = fall faster
                airFriction: 0.96,         // Was 0.98 - lower = less air resistance  
                groundFriction: 0.85,      // Was 0.92 - lower = less ground friction
                maxSpeed: 5,               // Was 3 - higher = faster movement
            },
            
            // Shop pricing settings
            shopPricing: {
                fuelCostModifier: 0.05,
                hullCostModifier: 1.0,
            },

            orePrices: {
                bronze: 5, 
                silver: 10, 
                gold: 20, 
                platinum: 50 
            },
            
            player: {
                x: 100,  // Start more centered in viewport
                y: 100,
                vx: 0,
                vy: 0,
                width: 18,
                height: 18,
                fuel: 100,
                maxFuel: 100,
                hull: 100,
                maxHull: 100,
                ore: 0,
                bronzeOre: 0,
                silverOre: 0,
                goldOre: 0,
                platinumOre: 0,
                maxInventory: 12,
                ammo: 5,
                credits: 0,
                onGround: false,
                drilling: false,
                drillProgress: 0,
                drillDirection: '',
                lastMoveDirection: 'right'
            },
            camera: {
                x: 0,
                y: 0
            },
            showInventory: false,
            showShop: false,
            maxFuelUpgradeCost: 50,
            MaxHullUpgradeCost: 50,
            shopTab: 'sell',
            nearShop: false,
            terrain: [],
            keys: {},
            lastTime: 0,
            lasers: [],
            explosions: [],
            shop: { x: 0, y: 4, width: 2, height: 2 },

            enemies: [],
            enemyGeneration: {
                baseEnemyCount: 5,        // 5-8 enemies on level 1
                enemyCountVariation: 4,   // Random 0-3 additional  
                enemyIncreasePerLevel: 2, // Base increase per level
                enemyIncreaseVariation: 2, // Random 0-1 additional increase
            },
        };

        // Create simple terrain
        function generateTerrain() {
            game.terrain = [];
            
            for (let y = 0; y < game.currentWorldHeight; y++) {
                game.terrain[y] = [];
                for (let x = 0; x < game.WORLD_WIDTH; x++) {
                    if (y >= 6) {
                        let blockType = 'dirt';
                        let blockChance = Math.random()
                        if (blockChance > 0.95) {
                            game.terrain[y][x] = { type: 'air', exists: false };
                        } else if (blockChance < game.oreGeneration.oreChance) {
                            const oreRoll = Math.random();
                            if (oreRoll < game.oreGeneration.platinumChance) blockType = 'platinum';
                            else if (oreRoll < game.oreGeneration.goldChance) blockType = 'gold';
                            else if (oreRoll < game.oreGeneration.silverChance) blockType = 'silver';
                            else blockType = 'bronze';
                            game.terrain[y][x] = { type: blockType, exists: true };
                        } else {
                            game.terrain[y][x] = { type: blockType, exists: true };
                        }
        
                    } else if (y >= game.shop.y && y < game.shop.y + game.shop.height && 
                               x >= game.shop.x && x < game.shop.x + game.shop.width) {
                        game.terrain[y][x] = { type: 'shop', exists: true };
                    } else {
                        game.terrain[y][x] = { type: 'air', exists: false };
                    }
                }
            }
            const enemyCount = game.enemyGeneration.baseEnemyCount + 
                               Math.floor(Math.random() * game.enemyGeneration.enemyCountVariation) + 
                               (game.currentLevel - 1) * (game.enemyGeneration.enemyIncreasePerLevel + 
                               Math.floor(Math.random() * game.enemyGeneration.enemyIncreaseVariation));
            game.enemies = initEnemies(game.terrain, game.currentLevel, game.BLOCK_SIZE, enemyCount);
        }

        // Input
        document.addEventListener('keydown', (e) => {
            game.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'i') {
                toggleInventory();
            }
            if (e.key.toLowerCase() === 'e' && game.nearShop) {
                toggleShop();
            }
            if (e.key === ' ') {
                e.preventDefault();
                if (!game.showInventory && !game.showShop) {
                    fireLaser();
                }
            }
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        document.addEventListener('keyup', (e) => {
            game.keys[e.key.toLowerCase()] = false;
        });

        // Modal management
        function toggleInventory() {
            game.showInventory = !game.showInventory;
            if (game.showInventory) {
                game.showShop = false;
                updateInventoryUI();
                document.getElementById('inventoryModal').classList.add('show');
                document.getElementById('shopModal').classList.remove('show');
            } else {
                document.getElementById('inventoryModal').classList.remove('show');
            }
        }

        function toggleShop() {
            game.showShop = !game.showShop;
            if (game.showShop) {
                game.showInventory = false;
                updateShopUI();
                document.getElementById('shopModal').classList.add('show');
                document.getElementById('inventoryModal').classList.remove('show');
            } else {
                document.getElementById('shopModal').classList.remove('show');
            }
        }

        function closeAllModals() {
            game.showInventory = false;
            game.showShop = false;
            document.getElementById('inventoryModal').classList.remove('show');
            document.getElementById('shopModal').classList.remove('show');
        }

        // Click outside to close modals
        document.getElementById('inventoryModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeAllModals();
            }
        });

        document.getElementById('shopModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeAllModals();
            }
        });

        // Shop tabs
        document.getElementById('sellTab').addEventListener('click', () => {
            game.shopTab = 'sell';
            document.getElementById('sellTab').classList.add('active');
            document.getElementById('buyTab').classList.remove('active');
            updateShopUI();
        });

        document.getElementById('buyTab').addEventListener('click', () => {
            game.shopTab = 'buy';
            document.getElementById('buyTab').classList.add('active');
            document.getElementById('sellTab').classList.remove('active');
            updateShopUI();
        });

        // Inventory UI
        function updateInventoryUI() {
            const currentCount = getCurrentOreCount();
            document.getElementById('invCount').textContent = `${currentCount}/${game.player.maxInventory}`;
            
            const content = document.getElementById('inventoryContent');
            content.innerHTML = '';
            
            // Bronze ore
            if (game.player.bronzeOre > 0 || true) {
                const row = createInventoryRow('Bronze Ore', game.player.bronzeOre, 'bronze');
                if (game.player.bronzeOre > 0) {
                    addButton(row, 'Make Fuel (+15)', () => craftFuel());
                }
                if (game.player.bronzeOre >= 3) {
                    addButton(row, 'Convert to Silver', () => convertOre('bronze', 'silver'), 'convert');
                }
                content.appendChild(row);
            }
            
            // Silver ore
            if (game.player.silverOre > 0 || true) {
                const row = createInventoryRow('Silver Ore', game.player.silverOre, 'silver');
                if (game.player.silverOre > 0) {
                    addButton(row, 'Make Ammo (1)', () => craftAmmo());
                }
                if (game.player.silverOre >= 3) {
                    addButton(row, 'Convert to Gold', () => convertOre('silver', 'gold'), 'convert');
                }
                content.appendChild(row);
            }
            
            // Gold ore
            if (game.player.goldOre > 0 || true) {
                const row = createInventoryRow('Gold Ore', game.player.goldOre, 'gold');
                if (game.player.goldOre > 0) {
                    addButton(row, 'Upgrade Cargo (+1)', () => upgradeInventory());
                }
                if (game.player.goldOre >= 3) {
                    addButton(row, 'Convert to Platinum', () => convertOre('gold', 'platinum'), 'convert');
                }
                content.appendChild(row);
            }
            
            // Platinum ore
            const platRow = createInventoryRow('Platinum Ore', game.player.platinumOre, 'platinum');
            content.appendChild(platRow);
        }

        function createInventoryRow(label, count, oreType) {
            const row = document.createElement('div');
            row.className = 'ore-row';
            
            const info = document.createElement('div');
            info.className = `ore-info ore-${oreType}`;
            info.textContent = `${label}: ${count}`;
            row.appendChild(info);
            
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            row.appendChild(buttonGroup);
            
            return row;
        }

        function addButton(row, text, onClick, className = '') {
            const button = document.createElement('button');
            button.className = `game-button ${className}`;
            button.textContent = text;
            
            // Use addEventListener instead of onclick for better scope handling
            button.addEventListener('click', onClick);
            
            row.querySelector('.button-group').appendChild(button);
            return button;
        }

        // Shop UI
        function updateShopUI() {
            document.getElementById('shopCredits').textContent = game.player.credits;
            const content = document.getElementById('shopContent');
            content.innerHTML = '';
            
            if (game.shopTab === 'sell') {
                const prices = {...game.orePrices};
                
                if (game.player.bronzeOre > 0) {
                    const row = createShopRow(`Bronze Ore: ${game.player.bronzeOre} (${prices.bronze} credits each)`, 'bronze');
                    addButton(row, 'Sell One', () => sellOre('bronze'));
                    content.appendChild(row);
                }
                
                if (game.player.silverOre > 0) {
                    const row = createShopRow(`Silver Ore: ${game.player.silverOre} (${prices.silver} credits each)`, 'silver');
                    addButton(row, 'Sell One', () => sellOre('silver'));
                    content.appendChild(row);
                }
                
                if (game.player.goldOre > 0) {
                    const row = createShopRow(`Gold Ore: ${game.player.goldOre} (${prices.gold} credits each)`, 'gold');
                    addButton(row, 'Sell One', () => sellOre('gold'));
                    content.appendChild(row);
                }
                
                if (game.player.platinumOre > 0) {
                    const row = createShopRow(`Platinum Ore: ${game.player.platinumOre} (${prices.platinum} credits each)`, 'platinum');
                    addButton(row, 'Sell One', () => sellOre('platinum'));
                    content.appendChild(row);
                }
                
                const totalOre = getCurrentOreCount();
                if (totalOre > 0) {
                    const totalValue = game.player.bronzeOre * prices.bronze + 
                                     game.player.silverOre * prices.silver + 
                                     game.player.goldOre * prices.gold + 
                                     game.player.platinumOre * prices.platinum;
                    
                    const totalRow = document.createElement('div');
                    totalRow.style.textAlign = 'center';
                    totalRow.style.marginTop = '20px';
                    totalRow.innerHTML = `<p style="color: white; margin-bottom: 10px;">Total value: ${totalValue} credits</p>`;
                    
                    const sellAllBtn = document.createElement('button');
                    sellAllBtn.className = 'game-button sell-all';
                    sellAllBtn.textContent = 'SELL ALL';
                    sellAllBtn.onclick = sellAllOre;
                    totalRow.appendChild(sellAllBtn);
                    
                    content.appendChild(totalRow);
                }
            } else {
                // Buy tab
                const missingFuel = Math.ceil(game.player.maxFuel - game.player.fuel);
                const fuelCost = Math.ceil(missingFuel * game.shopPricing.fuelCostModifier);
                if (missingFuel > 0) {
                    const row = createShopRow(`Refill Fuel (${missingFuel} units) - ${fuelCost} credits`);
                    const btn = addButton(row, 'Buy', () => buyFuel());
                    if (game.player.credits < fuelCost) btn.disabled = true;
                    content.appendChild(row);
                }
                
                const missingHull = game.player.maxHull - game.player.hull;
                const hullCost = Math.ceil(missingHull * game.shopPricing.hullCostModifier);
                if (missingHull > 0) {
                    const row = createShopRow(`Repair Hull (${missingHull} points) - ${hullCost} credits`);
                    const btn = addButton(row, 'Buy', () => buyHullRepair());
                    if (game.player.credits < hullCost) btn.disabled = true;
                    content.appendChild(row);
                }
                
                const upgradesTitle = document.createElement('div');
                upgradesTitle.style.color = '#AAA';
                upgradesTitle.style.marginTop = '20px';
                upgradesTitle.textContent = 'UPGRADES:';
                content.appendChild(upgradesTitle);
                
                const fuelUpgradeRow = createShopRow(`Upgrade Max Fuel (+20) - 50 credits`);
                const fuelBtn = addButton(fuelUpgradeRow, 'Buy', () => buyMaxFuelUpgrade());
                if (game.player.credits < 50) fuelBtn.disabled = true;
                content.appendChild(fuelUpgradeRow);
                
                const hullUpgradeRow = createShopRow(`Upgrade Max Hull (+10) - 100 credits`);
                const hullBtn = addButton(hullUpgradeRow, 'Buy', () => buyMaxHullUpgrade());
                if (game.player.credits < 100) hullBtn.disabled = true;
                content.appendChild(hullUpgradeRow);
            }
        }

        function createShopRow(text, oreType = '') {
            const row = document.createElement('div');
            row.className = 'shop-item';
            
            const info = document.createElement('div');
            info.className = `shop-info ${oreType ? 'ore-' + oreType : ''}`;
            info.textContent = text;
            row.appendChild(info);
            
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            row.appendChild(buttonGroup);
            
            return row;
        }

        // Update stats display
        function updateStatsDisplay() {
            document.getElementById('fuel').textContent = `${Math.floor(game.player.fuel)}/${Math.floor(game.player.maxFuel)}`;
            document.getElementById('hull').textContent = `${Math.floor(game.player.hull)}/${Math.floor(game.player.maxHull)}`;
            document.getElementById('level').textContent = game.currentLevel;
            document.getElementById('depth').textContent = Math.floor(Math.max(0, (game.player.y - 180) / game.BLOCK_SIZE));
            document.getElementById('inventory').textContent = `${getCurrentOreCount()}/${game.player.maxInventory}`;
            document.getElementById('ammo').textContent = game.player.ammo;
            document.getElementById('credits').textContent = game.player.credits;
        }

        // Inventory functions
        function craftFuel() {
            if (game.player.bronzeOre > 0) {
                game.player.bronzeOre -= 1;
                game.player.fuel = Math.min(game.player.maxFuel, game.player.fuel + 15);
                updateOreCount();
                updateInventoryUI();
                updateStatsDisplay();
            }
        }

        function craftAmmo() {
            if (game.player.silverOre > 0) {
                game.player.silverOre -= 1;
                game.player.ammo += 1;
                updateOreCount();
                updateInventoryUI();
                updateStatsDisplay();
            }
        }

        function upgradeInventory() {
            if (game.player.goldOre > 0) {
                game.player.goldOre -= 1;
                game.player.maxInventory += 1;
                updateOreCount();
                updateInventoryUI();
                updateStatsDisplay();
            }
        }

        function convertOre(fromType, toType) {
            if (fromType === 'bronze' && game.player.bronzeOre >= 3) {
                game.player.bronzeOre -= 3;
                game.player.silverOre += 1;
            } else if (fromType === 'silver' && game.player.silverOre >= 3) {
                game.player.silverOre -= 3;
                game.player.goldOre += 1;
            } else if (fromType === 'gold' && game.player.goldOre >= 3) {
                game.player.goldOre -= 3;
                game.player.platinumOre += 1;
            }
            updateOreCount();
            updateInventoryUI();
        }

        // Shop functions
        function sellOre(oreType) {
            const prices = {...game.orePrices}
            
            if (oreType === 'bronze' && game.player.bronzeOre > 0) {
                game.player.bronzeOre -= 1;
                game.player.credits += prices.bronze;
            } else if (oreType === 'silver' && game.player.silverOre > 0) {
                game.player.silverOre -= 1;
                game.player.credits += prices.silver;
            } else if (oreType === 'gold' && game.player.goldOre > 0) {
                game.player.goldOre -= 1;
                game.player.credits += prices.gold;
            } else if (oreType === 'platinum' && game.player.platinumOre > 0) {
                game.player.platinumOre -= 1;
                game.player.credits += prices.platinum;
            }
            updateOreCount();
            updateShopUI();
            updateStatsDisplay();
        }

        function sellAllOre() {
            const prices = {...game.orePrices}
            
            game.player.credits += game.player.bronzeOre * prices.bronze;
            game.player.credits += game.player.silverOre * prices.silver;
            game.player.credits += game.player.goldOre * prices.gold;
            game.player.credits += game.player.platinumOre * prices.platinum;
            
            game.player.bronzeOre = 0;
            game.player.silverOre = 0;
            game.player.goldOre = 0;
            game.player.platinumOre = 0;
            
            updateOreCount();
            updateShopUI();
            updateStatsDisplay();
        }

        function buyFuel() {
            const missingFuel = game.player.maxFuel - game.player.fuel;
            const fuelCost = Math.ceil(missingFuel * game.shopPricing.fuelCostModifier);
            
            if (game.player.credits >= fuelCost && missingFuel > 0) {
                game.player.credits -= fuelCost;
                game.player.fuel = game.player.maxFuel;
                updateShopUI();
                updateStatsDisplay();
            }
        }

        function buyHullRepair() {
            const missingHull = game.player.maxHull - game.player.hull;
            const hullCost = Math.ceil(missingHull * game.shopPricing.hullCostModifier);
            
            if (game.player.credits >= hullCost && missingHull > 0) {
                game.player.credits -= hullCost;
                game.player.hull = game.player.maxHull;
                updateShopUI();
                updateStatsDisplay();
            }
        }

        function buyMaxFuelUpgrade() {
            const upgradeCost = game.maxFuelUpgradeCost;
            
            if (game.player.credits >= upgradeCost) {
                game.player.credits -= upgradeCost;
                game.player.maxFuel += 20;
                game.maxFuelUpgradeCost *= 2;
                updateShopUI();
                updateStatsDisplay();
            }
        }

        function buyMaxHullUpgrade() {
            const upgradeCost = game.MaxHullUpgradeCost;
            
            if (game.player.credits >= upgradeCost) {
                game.player.credits -= upgradeCost;
                game.player.maxHull += 50;
                game.MaxHullUpgradeCost *= 2;
                updateShopUI();
                updateStatsDisplay();
            }
        }

        function updateOreCount() {
            game.player.ore = game.player.bronzeOre + (game.player.silverOre * 3) + 
                             (game.player.goldOre * 10) + (game.player.platinumOre * 30);
        }

        function getCurrentOreCount() {
            return game.player.bronzeOre + game.player.silverOre + game.player.goldOre + game.player.platinumOre;
        }

        // Level progression system
        function checkLevelProgression() {
            const player = game.player;
            const bottomRow = (game.currentWorldHeight - 1) * game.BLOCK_SIZE;
            
            if (player.y >= bottomRow) {
                advanceToNextLevel();
            }
        }

        function advanceToNextLevel() {
            game.currentLevel += 1;
            game.currentWorldHeight = game.BASE_WORLD_HEIGHT + ((game.currentLevel - 1) * 20);
            
            game.player.x = 100;
            game.player.y = 100;
            game.player.vx = 0;
            game.player.vy = 0;
            
            game.camera.x = 0;
            game.camera.y = 0;
            generateTerrain();
            // const enemyCount = game.enemyGeneration.baseEnemyCount + 
            //                    Math.floor(Math.random() * game.enemyGeneration.enemyCountVariation) + 
            //                    (game.currentLevel - 1) * (game.enemyGeneration.enemyIncreasePerLevel + 
            //                    Math.floor(Math.random() * game.enemyGeneration.enemyIncreaseVariation));
            // game.enemies = initEnemies(game.terrain, game.currentLevel, game.BLOCK_SIZE, enemyCount);
            
            console.log(`Advanced to Level ${game.currentLevel}! World height: ${game.currentWorldHeight}`);
        }

        // Laser System
        function fireLaser() {
            if (game.player.ammo > 0) {
                game.player.ammo -= 1;
                updateStatsDisplay();
                
                const laser = {
                    x: game.player.x + game.player.width / 2,
                    y: game.player.y + game.player.height / 2,
                    vx: game.player.lastMoveDirection === 'left' ? -8 : 8,
                    vy: 0,
                    active: true
                };
                
                game.lasers.push(laser);
            }
        }

        function updateLasers() {
            for (let i = game.lasers.length - 1; i >= 0; i--) {
                const laser = game.lasers[i];

                if (checkLaserEnemyCollision(game, laser)) {
                        explodeAt(Math.floor(laser.x / game.BLOCK_SIZE), Math.floor(laser.y / game.BLOCK_SIZE));
                        game.player.credits += 40;
                        game.lasers.splice(i, 1);
                        updateStatsDisplay();
                        continue;
                }
                
                if (!laser.active) {
                    game.lasers.splice(i, 1);
                    continue;
                }
                
                laser.x += laser.vx;
                laser.y += laser.vy;
                
                if (laser.x < 0 || laser.x > game.WORLD_WIDTH * game.BLOCK_SIZE || 
                    laser.y < 0 || laser.y > game.currentWorldHeight * game.BLOCK_SIZE) {
                    game.lasers.splice(i, 1);
                    continue;
                }
                
                const hitBlock = getBlockAt(laser.x, laser.y);
                if (hitBlock) {
                    explodeAt(hitBlock.x, hitBlock.y);
                    game.lasers.splice(i, 1);
                }
            }
        }

        function explodeAt(blockX, blockY) {
            // Create visual explosion
            game.explosions.push({
                x: blockX * game.BLOCK_SIZE + game.BLOCK_SIZE / 2,
                y: blockY * game.BLOCK_SIZE + game.BLOCK_SIZE / 2,
                radius: 5,
                maxRadius: game.BLOCK_SIZE * 1.5,
                opacity: 1.0
            });
            
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const targetX = blockX + dx;
                    const targetY = blockY + dy;
                    
                    if (targetY >= 0 && targetY < game.currentWorldHeight && 
                        targetX >= 0 && targetX < game.WORLD_WIDTH) {
                        
                        if (isShopBlock(targetX, targetY)) {
                            continue;
                        }
                        
                        const block = game.terrain[targetY] && game.terrain[targetY][targetX];
                        if (block && block.exists) {
                            game.terrain[targetY][targetX].exists = false;
                        }
                    }
                }
            }
        }

        function renderLasers() {
            for (const laser of game.lasers) {
                const screenX = laser.x - game.camera.x;
                const screenY = laser.y - game.camera.y;
                if (screenX > -10 && screenX < canvas.width + 10 &&
                    screenY > -10 && screenY < canvas.height + 10) {
                    
                    // Create gradient for laser
                    const gradient = ctx.createLinearGradient(
                        screenX - 4, screenY, 
                        screenX + 4, screenY
                    );
                    gradient.addColorStop(0, '#FF6600');
                    gradient.addColorStop(0.5, '#FFFF00');
                    gradient.addColorStop(1, '#FF6600');
                    
                    // Draw laser with border
                    ctx.fillStyle = '#FF0000';
                    ctx.fillRect(screenX - 4, screenY - 3, 8, 6); // Border
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(screenX - 3, screenY - 2, 6, 4); // Inner laser
                }
            }
        }

        function updateExplosions() {
            for (let i = game.explosions.length - 1; i >= 0; i--) {
                const explosion = game.explosions[i];
                explosion.radius += 3;
                explosion.opacity -= 0.05;
                
                if (explosion.opacity <= 0 || explosion.radius > explosion.maxRadius) {
                    game.explosions.splice(i, 1);
                }
            }
        }

        function renderExplosions() {
            for (const explosion of game.explosions) {
                const screenX = explosion.x - game.camera.x;
                const screenY = explosion.y - game.camera.y;
                
                if (screenX > -explosion.radius && screenX < canvas.width + explosion.radius &&
                    screenY > -explosion.radius && screenY < canvas.height + explosion.radius) {
                    
                    ctx.save();
                    ctx.globalAlpha = explosion.opacity;
                    
                    // Outer ring
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, explosion.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = '#FF6600';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    
                    // Inner glow
                    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, explosion.radius);
                    gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
                    gradient.addColorStop(0.5, 'rgba(255, 102, 0, 0.4)');
                    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, explosion.radius, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
        }

        // Game functions
        function isShopBlock(blockX, blockY) {
            return blockY >= game.shop.y && blockY < game.shop.y + game.shop.height && 
                   blockX >= game.shop.x && blockX < game.shop.x + game.shop.width;
        }

        function getBlockAt(worldX, worldY) {
            const blockX = Math.floor(worldX / game.BLOCK_SIZE);
            const blockY = Math.floor(worldY / game.BLOCK_SIZE);
            
            if (blockY < 0 || blockY >= game.currentWorldHeight || 
                blockX < 0 || blockX >= game.WORLD_WIDTH) {
                return null;
            }
            
            const block = game.terrain[blockY] && game.terrain[blockY][blockX];
            return (block && block.exists) ? { x: blockX, y: blockY, ...block } : null;
        }

        function removeBlock(blockX, blockY) {
            if (blockY >= 0 && blockY < game.currentWorldHeight && 
                blockX >= 0 && blockX < game.WORLD_WIDTH) {
                
                const block = game.terrain[blockY] && game.terrain[blockY][blockX];
                if (block && block.exists) {
                    const currentCount = getCurrentOreCount();
                    
                    if (currentCount < game.player.maxInventory) {
                        if (block.type === 'bronze') {
                            game.player.bronzeOre += 1;
                        } else if (block.type === 'silver') {
                            game.player.silverOre += 1;
                        } else if (block.type === 'gold') {
                            game.player.goldOre += 1;
                        } else if (block.type === 'platinum') {
                            game.player.platinumOre += 1;
                        }
                        updateOreCount();
                        updateStatsDisplay();
                    }
                    
                    game.terrain[blockY][blockX].exists = false;
                    return true;
                }
            }
            return false;
        }

        function checkCollision(x, y, width, height) {
            const corners = [
                { x: x + 2, y: y + 2 },
                { x: x + width - 2, y: y + 2 },
                { x: x + 2, y: y + height - 2 },
                { x: x + width - 2, y: y + height - 2 }
            ];
            
            for (let corner of corners) {
                if (getBlockAt(corner.x, corner.y)) {
                    return true;
                }
            }
            return false;
        }

        function getAdjacentBlock(direction) {
            const player = game.player;
            const centerX = player.x + player.width/2;
            const centerY = player.y + player.height/2;
            
            let targetBlock = null;
            switch(direction) {
                case 'down':
                    targetBlock = getBlockAt(centerX, player.y + player.height + 1);
                    break;
                case 'left':
                    targetBlock = getBlockAt(player.x - 1, centerY);
                    break;
                case 'right':
                    targetBlock = getBlockAt(player.x + player.width + 1, centerY);
                    break;
                default:
                    return null;
            }
            
            if (targetBlock && targetBlock.type === 'shop') {
                return null;
            }
            
            return targetBlock;
        }

        function updatePlayer() {
            const player = game.player;
            
            // Simple drilling
            let drillTarget = null;
            let drillDirection = '';
            
            if (game.keys['s']) {
                drillTarget = getAdjacentBlock('down');
                if (drillTarget) drillDirection = 'down';
            } else if (game.keys['a'] && getAdjacentBlock('left')) {
                drillTarget = getAdjacentBlock('left');
                if (drillTarget) drillDirection = 'left';
            } else if (game.keys['d'] && getAdjacentBlock('right')) {
                drillTarget = getAdjacentBlock('right');
                if (drillTarget) drillDirection = 'right';
            }
            
            if (drillTarget) {
                player.drilling = true;
                player.drillDirection = drillDirection;
                player.drillProgress += game.playerStats.drillSpeed;
                
                if (player.drillProgress >= game.playerStats.drillTime) {
                    removeBlock(drillTarget.x, drillTarget.y);
                    player.drillProgress = 0;
                    player.fuel = Math.max(0, player.fuel - 1);
                }
            } else {
                player.drilling = false;
                player.drillProgress = 0;
                player.drillDirection = '';
            }

            // Movement
            if (!player.drilling) {
                if (game.keys['a']) {
                    player.vx -= game.playerStats.moveAcceleration;
                    player.fuel = Math.max(0, player.fuel - 0.07);
                    player.lastMoveDirection = 'left';
                }
                if (game.keys['d']) {
                    player.vx += game.playerStats.moveAcceleration;
                    player.fuel = Math.max(0, player.fuel - 0.07);
                    player.lastMoveDirection = 'right';
                }
            }

            if (game.keys['w']) {
                player.vy -= game.playerStats.thrustPower;
                player.fuel = Math.max(0, player.fuel - 0.08);
            }

            // Physics
            player.vy += game.physics.gravity;
            player.vx *= game.physics.airFriction;
            player.vy *= game.physics.airFriction;

            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            if (speed > game.physics.maxSpeed) {
                player.vx = (player.vx / speed) * game.physics.maxSpeed;
                player.vy = (player.vy / speed) * game.physics.maxSpeed;
            }

            const oldX = player.x;
            const oldY = player.y;

            player.x += player.vx;
            player.y += player.vy;

            if (player.x < 0) {
                player.x = 0;
                player.vx = 0;
            }
            if (player.x + player.width > game.WORLD_WIDTH * game.BLOCK_SIZE) {
                player.x = game.WORLD_WIDTH * game.BLOCK_SIZE - player.width;
                player.vx = 0;
            }

            if (checkCollision(player.x, oldY, player.width, player.height)) {
                player.x = oldX;
                player.vx = 0;
            }
            
            if (checkCollision(oldX, player.y, player.width, player.height)) {
                player.y = oldY;
                player.vy = 0;
            }

            if (getAdjacentBlock('down')) {
                player.onGround = true;
                if (player.vy > 0) {
                    player.vy = 0;
                }
                player.vx *= game.physics.groundFriction;

            } else {
                player.onGround = false;
            }

            // Update camera to follow player
            const halfViewportWidth = (game.VISIBLE_BLOCKS_X * game.BLOCK_SIZE) / 2;
            const halfViewportHeight = (game.VISIBLE_BLOCKS_Y * game.BLOCK_SIZE) / 2;
            
            // Center camera on player
            game.camera.x = player.x + player.width/2 - halfViewportWidth;
            game.camera.y = player.y + player.height/2 - halfViewportHeight;
            
            // Clamp camera to world bounds
            game.camera.x = Math.max(0, Math.min(game.camera.x, game.WORLD_WIDTH * game.BLOCK_SIZE - game.VISIBLE_BLOCKS_X * game.BLOCK_SIZE));
            game.camera.y = Math.max(0, Math.min(game.camera.y, game.currentWorldHeight * game.BLOCK_SIZE - game.VISIBLE_BLOCKS_Y * game.BLOCK_SIZE));
            
            checkLevelProgression();
            
            // Check if player is near shop
            const playerCenterX = (player.x + player.width/2) / game.BLOCK_SIZE;
            const playerCenterY = (player.y + player.height/2) / game.BLOCK_SIZE;
            const shopCenterX = game.shop.x + game.shop.width/2;
            const shopCenterY = game.shop.y + game.shop.height/2;
            
            const distanceToShop = Math.sqrt(
                Math.pow(playerCenterX - shopCenterX, 2) + 
                Math.pow(playerCenterY - shopCenterY, 2)
            );
            
            game.nearShop = distanceToShop <= 3;
            
            // Update shop prompt visibility
            const shopPrompt = document.getElementById('shopPrompt');
            if (game.nearShop && !game.showShop && !game.showInventory) {
                shopPrompt.classList.add('show');
            } else {
                shopPrompt.classList.remove('show');
            }
            
            updateStatsDisplay();
        }

        function render() {
            ctx.fillStyle = '#001122';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate visible block range
            const startBlockX = Math.floor(game.camera.x / game.BLOCK_SIZE);
            const endBlockX = Math.ceil((game.camera.x + canvas.width) / game.BLOCK_SIZE);
            const startBlockY = Math.floor(game.camera.y / game.BLOCK_SIZE);
            const endBlockY = Math.ceil((game.camera.y + canvas.height) / game.BLOCK_SIZE);

            // Draw only visible terrain
            for (let y = startBlockY; y <= endBlockY && y < game.currentWorldHeight; y++) {
                if (y < 0) continue;
                for (let x = startBlockX; x <= endBlockX && x < game.WORLD_WIDTH; x++) {
                    if (x < 0) continue;
                    
                    const block = game.terrain[y] && game.terrain[y][x];
                    if (block && block.exists) {
                        const screenX = x * game.BLOCK_SIZE - game.camera.x;
                        const screenY = y * game.BLOCK_SIZE - game.camera.y;
                        
                        switch (block.type) {
                            case 'dirt':
                                ctx.fillStyle = '#8B4513';
                                break;
                            case 'bronze':
                                ctx.fillStyle = '#CD7F32';
                                break;
                            case 'silver':
                                ctx.fillStyle = '#C0C0C0';
                                break;
                            case 'gold':
                                ctx.fillStyle = '#FFD700';
                                break;
                            case 'platinum':
                                ctx.fillStyle = '#E5E4E2';
                                break;
                            case 'shop':
                                ctx.fillStyle = '#00AAFF';
                                break;
                        }
                        
                        ctx.fillRect(screenX, screenY, game.BLOCK_SIZE, game.BLOCK_SIZE);
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(screenX, screenY, game.BLOCK_SIZE, game.BLOCK_SIZE);
                        
                        if (block.type === 'shop') {
                            ctx.fillStyle = 'white';
                            ctx.font = `${Math.floor(game.BLOCK_SIZE * 0.25)}px Arial`;
                            ctx.textAlign = 'center';
                            ctx.fillText('SHOP', screenX + game.BLOCK_SIZE/2, screenY + game.BLOCK_SIZE/2 + 3);
                        }
                    }
                }
            }

            // Draw player relative to camera
            const playerScreenX = game.player.x - game.camera.x;
            const playerScreenY = game.player.y - game.camera.y;
            let playerColor = '#1cc941'
            if (game.player.fuel/game.player.maxFuel < 0.1 && getCurrentOreCount() == game.player.maxInventory) { 
                playerColor = '#c850e6'
            } else if (game.player.fuel/game.player.maxFuel < 0.3 && getCurrentOreCount() == game.player.maxInventory) { 
                playerColor = '#50b9e6'
            } else if (getCurrentOreCount() == game.player.maxInventory) {
                playerColor = '#1168f5'
            } else if (game.player.fuel/game.player.maxFuel < 0.1) {
                playerColor = '#e33636'
            } else if (game.player.fuel/game.player.maxFuel < 0.3) {
                playerColor = '#FFAA00'
            } else {
                playerColor = '#1cc941'
            }
            ctx.fillStyle = playerColor
            ctx.fillRect(playerScreenX, playerScreenY, game.player.width, game.player.height);

            // Draw drilling relative to camera
            if (game.player.drilling) {
                ctx.fillStyle = '#FF6600';
                let drillX = playerScreenX;
                let drillY = playerScreenY;
                
                if (game.player.drillDirection === 'down') {
                    drillX = playerScreenX + 2;
                    drillY = playerScreenY + game.player.height;
                    ctx.fillRect(drillX, drillY, game.player.width - 4, 4);
                } else if (game.player.drillDirection === 'left') {
                    drillX = playerScreenX - 4;
                    drillY = playerScreenY + 2;
                    ctx.fillRect(drillX, drillY, 4, game.player.height - 4);
                } else if (game.player.drillDirection === 'right') {
                    drillX = playerScreenX + game.player.width;
                    drillY = playerScreenY + 2;
                    ctx.fillRect(drillX, drillY, 4, game.player.height - 4);
                }
            }

            renderEnemies(game, ctx);

            renderLasers();
            
            renderExplosions();
        }

        function gameLoop() {
            updatePlayer();
            if (checkGameOver()) return;
            updateLasers();
            updateEnemies(game);
            updateExplosions();
            render();
            requestAnimationFrame(gameLoop);
        }

        


// Window resize handler
// Make necessary functions available globally for UI
window.gameAPI = {
    toggleInventory,
    toggleShop,
    closeAllModals,
    craftFuel,
    craftAmmo,
    upgradeInventory,
    convertOre,
    sellOre,
    sellAllOre,
    buyFuel,
    buyHullRepair,
    buyMaxFuelUpgrade,
    buyMaxHullUpgrade,
    // Also expose game state for debugging
    getGameState: () => game
};

// Initialize game when DOM is ready
function initGame() {
    // Initialize game state
    game.currentWorldHeight = game.BASE_WORLD_HEIGHT;
    game.enemies = []; // Initialize enemies array
    
    // Setup canvas and resize handler
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Generate initial terrain
    generateTerrain();
    
    // Start game loop
    gameLoop();
}

function checkGameOver() {
    if (game.player.hull <= 0 || game.player.fuel <= 0) {
        const cause = game.player.hull <= 0 ? "hull" : "fuel";
        alert(`Game Over! You ran out of ${cause}. Click OK to try again.`);
        location.reload()
        return true;
    }
    return false;
}

// Ensure DOM is loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
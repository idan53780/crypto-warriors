// Enhanced Canvas-based avatar generator with high randomness
function generateWarriorAvatar(tokenId, account, warriorClass = 'Knight') {
    const safeAccount = account ? account.toLowerCase() : 'default-account';
    const seed = `${safeAccount}-${tokenId.toString()}`;
    const hash = Math.abs(hashCode(seed));
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Generate random variations using different parts of the hash
    const rng = {
        bg: (hash % 1000) / 1000,
        primary: ((hash >> 10) % 1000) / 1000,
        secondary: ((hash >> 20) % 1000) / 1000,
        skin: ((hash >> 5) % 1000) / 1000,
        hair: ((hash >> 15) % 1000) / 1000,
        accent: ((hash >> 25) % 1000) / 1000,
        pattern: hash % 5,
        variant: (hash >> 8) % 4
    };
    
    // More color palettes for variety
    const bgColors = ['#2c3e50', '#34495e', '#1a252f', '#273c75', '#40407a', '#2c2c54'];
    const skinTones = ['#ffdab9', '#f0c9a6', '#d4a373', '#8d5524', '#c68642', '#e0ac69'];
    const hairColors = ['#000000', '#3d2817', '#6b4423', '#8b4513', '#d4af37', '#ffffff', '#8b0000', '#4a0e0e'];
    
    // Class-specific variations
    let armorColors, weaponColors, accentColors;
    
    if (warriorClass === 'Knight') {
        armorColors = ['#708090', '#a9a9a9', '#2f4f4f', '#556b2f', '#8b4513', '#cd853f'];
        weaponColors = ['#c0c0c0', '#ffd700', '#b87333', '#4682b4', '#000000', '#8b0000'];
        accentColors = ['#ff0000', '#ffd700', '#0000ff', '#00ff00', '#ff4500', '#8b008b'];
    } else if (warriorClass === 'Mage') {
        armorColors = ['#8e44ad', '#9b59b6', '#3498db', '#2980b9', '#1abc9c', '#16a085'];
        weaponColors = ['#8B4513', '#654321', '#daa520', '#000000', '#4b0082', '#8b008b'];
        accentColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff69b4', '#ff1493'];
    } else { // Archer
        armorColors = ['#228b22', '#2e8b57', '#8b4513', '#654321', '#556b2f', '#6b8e23'];
        weaponColors = ['#8B4513', '#654321', '#000000', '#2f4f4f', '#696969', '#a0522d'];
        accentColors = ['#ffa500', '#ff4500', '#32cd32', '#00ced1', '#ff8c00', '#dc143c'];
    }
    
    // Select colors based on random values
    const bgColor = bgColors[Math.floor(rng.bg * bgColors.length)];
    const skinColor = skinTones[Math.floor(rng.skin * skinTones.length)];
    const hairColor = hairColors[Math.floor(rng.hair * hairColors.length)];
    const primaryColor = armorColors[Math.floor(rng.primary * armorColors.length)];
    const secondaryColor = weaponColors[Math.floor(rng.secondary * weaponColors.length)];
    const accentColor = accentColors[Math.floor(rng.accent * accentColors.length)];
    
    // Draw background with gradient
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, adjustBrightness(bgColor, -30));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    // Draw class-specific warrior with variations
    if (warriorClass === 'Knight') {
        drawKnight(ctx, rng, skinColor, hairColor, primaryColor, secondaryColor, accentColor);
    } else if (warriorClass === 'Mage') {
        drawMage(ctx, rng, skinColor, hairColor, primaryColor, secondaryColor, accentColor);
    } else if (warriorClass === 'Archer') {
        drawArcher(ctx, rng, skinColor, hairColor, primaryColor, secondaryColor, accentColor);
    }
    
    // Add border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);
    
    const avatarImg = document.createElement('img');
    avatarImg.src = canvas.toDataURL();
    avatarImg.alt = `${warriorClass} Warrior #${tokenId}`;
    avatarImg.style.width = '128px';
    avatarImg.style.height = '128px';
    avatarImg.style.borderRadius = '12px';
    avatarImg.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    
    // Generate description with color variations
    const traits = generateClassTraits(warriorClass, rng, hairColor, primaryColor, secondaryColor);
    const description = `${traits.appearance}, ${traits.armor}, ${traits.weapon}`;
    
    return {
        image: avatarImg,
        description: description
    };
}

function drawKnight(ctx, rng, skin, hair, armor, weapon, accent) {
    const variant = rng.variant;
    
    // Body/Armor with pattern
    ctx.fillStyle = armor;
    ctx.fillRect(44, 60, 40, 50);
    
    // Armor pattern variations
    if (rng.pattern === 0) {
        // Vertical stripes
        ctx.fillStyle = adjustBrightness(armor, 20);
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(48 + i * 8, 60, 4, 50);
        }
    } else if (rng.pattern === 1) {
        // Chain mail pattern
        ctx.fillStyle = adjustBrightness(armor, -20);
        for (let y = 60; y < 110; y += 8) {
            for (let x = 44; x < 84; x += 8) {
                ctx.beginPath();
                ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Shoulders
    ctx.fillStyle = adjustBrightness(armor, -10);
    ctx.fillRect(38, 58, 15, 12);
    ctx.fillRect(75, 58, 15, 12);
    
    // Helmet base
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.arc(64, 45, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Helmet variations
    if (variant === 0 || variant === 1) {
        // Visor
        ctx.fillStyle = '#000';
        ctx.fillRect(50, 40, 28, 10);
        
        // Visor slit
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(52, 45);
        ctx.lineTo(76, 45);
        ctx.stroke();
    } else {
        // Open helmet - show face
        ctx.fillStyle = skin;
        ctx.fillRect(54, 38, 20, 16);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(58, 44, 4, 4);
        ctx.fillRect(66, 44, 4, 4);
    }
    
    // Plume variations
    if (variant === 0 || variant === 2) {
        ctx.fillStyle = accent;
        if (rng.pattern % 2 === 0) {
            // Single plume
            ctx.fillRect(60, 18, 8, 18);
        } else {
            // Double plume
            ctx.fillRect(56, 20, 6, 15);
            ctx.fillRect(66, 20, 6, 15);
        }
    } else if (variant === 1) {
        // Horns
        ctx.fillStyle = weapon;
        ctx.beginPath();
        ctx.moveTo(48, 38);
        ctx.lineTo(44, 28);
        ctx.lineTo(50, 35);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(80, 38);
        ctx.lineTo(84, 28);
        ctx.lineTo(78, 35);
        ctx.fill();
    }
    
    // Shield variations
    ctx.save();
    ctx.fillStyle = accent;
    if (variant % 2 === 0) {
        // Round shield
        ctx.beginPath();
        ctx.arc(30, 75, 14, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = armor;
        ctx.beginPath();
        ctx.arc(30, 75, 8, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Kite shield
        ctx.beginPath();
        ctx.moveTo(30, 60);
        ctx.lineTo(20, 70);
        ctx.lineTo(30, 90);
        ctx.lineTo(40, 70);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(26, 68, 8, 6);
    }
    ctx.restore();
    
    // Weapon variations
    ctx.strokeStyle = weapon;
    ctx.lineWidth = 5;
    if (variant === 0 || variant === 2) {
        // Sword
        ctx.beginPath();
        ctx.moveTo(95, 50);
        ctx.lineTo(95, 95);
        ctx.stroke();
        
        // Hilt
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(88, 53);
        ctx.lineTo(102, 53);
        ctx.stroke();
        
        // Pommel
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(95, 48, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Axe or Mace
        ctx.beginPath();
        ctx.moveTo(95, 55);
        ctx.lineTo(95, 95);
        ctx.stroke();
        
        // Axe head
        ctx.fillStyle = weapon;
        ctx.fillRect(88, 50, 14, 10);
    }
    
    // Belt
    ctx.fillStyle = accent;
    ctx.fillRect(44, 85, 40, 4);
}

function drawMage(ctx, rng, skin, hair, robe, staff, accent) {
    const variant = rng.variant;
    
    // Robe with variations
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(64, 50);
    ctx.lineTo(38, 110);
    ctx.lineTo(90, 110);
    ctx.closePath();
    ctx.fill();
    
    // Robe pattern
    if (rng.pattern === 0) {
        // Mystical symbols
        ctx.fillStyle = accent;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('✦', 52, 75);
        ctx.fillText('✧', 68, 85);
        ctx.fillText('✦', 58, 95);
    } else if (rng.pattern === 1) {
        // Trim
        ctx.fillStyle = accent;
        ctx.fillRect(38, 108, 52, 2);
        ctx.fillRect(38, 110, 2, -50);
        ctx.fillRect(90, 110, 2, -50);
    } else if (rng.pattern === 2) {
        // Stars pattern
        ctx.fillStyle = accent;
        for (let i = 0; i < 5; i++) {
            drawStar(ctx, 50 + i * 8, 70 + (i % 2) * 15, 2, 4);
        }
    }
    
    // Sleeves
    ctx.fillStyle = adjustBrightness(robe, -15);
    ctx.fillRect(35, 55, 10, 25);
    ctx.fillRect(83, 55, 10, 25);
    
    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(64, 45, 18, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair variations
    ctx.fillStyle = hair;
    if (variant === 0) {
        // Long hair
        ctx.fillRect(52, 35, 24, 20);
    } else if (variant === 1) {
        // Short hair
        ctx.beginPath();
        ctx.arc(64, 35, 18, Math.PI, 0);
        ctx.fill();
    } else {
        // Bald with beard
        ctx.beginPath();
        ctx.arc(64, 32, 18, Math.PI, 0);
        ctx.fill();
        
        // Beard
        ctx.fillRect(56, 52, 16, 8);
    }
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(56, 44, 4, 4);
    ctx.fillRect(68, 44, 4, 4);
    
    // Eye glow for mystical effect
    if (rng.pattern === 3) {
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(56, 44, 4, 4);
        ctx.fillRect(68, 44, 4, 4);
        ctx.globalAlpha = 1.0;
    }
    
    // Hat variations
    ctx.fillStyle = robe;
    if (variant === 0 || variant === 2) {
        // Wizard hat
        ctx.beginPath();
        ctx.moveTo(64, 5);
        ctx.lineTo(48, 33);
        ctx.lineTo(80, 33);
        ctx.closePath();
        ctx.fill();
        
        // Hat brim
        ctx.fillRect(43, 30, 42, 5);
        
        // Hat decorations
        ctx.fillStyle = accent;
        if (rng.pattern % 2 === 0) {
            for (let i = 0; i < 4; i++) {
                drawStar(ctx, 58 + i * 4, 12 + i * 4, 2, 3);
            }
        } else {
            ctx.fillRect(62, 15, 4, 15);
            ctx.fillRect(60, 15, 8, 3);
        }
    } else {
        // Hood
        ctx.beginPath();
        ctx.arc(64, 40, 22, Math.PI, 0);
        ctx.fill();
        
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(64, 40, 20, Math.PI, 0);
        ctx.fill();
    }
    
    // Staff variations
    ctx.strokeStyle = staff;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(92, 45);
    ctx.lineTo(92, 110);
    ctx.stroke();
    
    // Staff top variations
    if (variant === 0) {
        // Crystal orb
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(92, 40, 9, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = adjustBrightness(accent, 40);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(92, 40, 11, 0, Math.PI * 2);
        ctx.stroke();
    } else if (variant === 1) {
        // Crescent moon
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(88, 38, 8, 0.5 * Math.PI, 1.5 * Math.PI);
        ctx.fill();
    } else {
        // Skull or gem
        ctx.fillStyle = accent;
        ctx.fillRect(88, 35, 8, 10);
        ctx.beginPath();
        ctx.arc(92, 35, 4, Math.PI, 0);
        ctx.fill();
    }
    
    // Spell book
    if (variant === 2) {
        ctx.fillStyle = adjustBrightness(robe, -30);
        ctx.fillRect(28, 72, 12, 16);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(28, 72, 12, 16);
    }
}

function drawArcher(ctx, rng, skin, hair, leather, weapon, accent) {
    const variant = rng.variant;
    
    // Body
    ctx.fillStyle = leather;
    ctx.fillRect(48, 60, 32, 48);
    
    // Armor pattern
    if (rng.pattern === 0) {
        // Leather stitching
        ctx.strokeStyle = adjustBrightness(leather, -30);
        ctx.lineWidth = 2;
        for (let y = 65; y < 105; y += 8) {
            ctx.beginPath();
            ctx.moveTo(52, y);
            ctx.lineTo(76, y);
            ctx.stroke();
        }
    } else if (rng.pattern === 1) {
        // Scale pattern
        ctx.fillStyle = adjustBrightness(leather, 15);
        for (let y = 60; y < 108; y += 6) {
            for (let x = 48; x < 80; x += 8) {
                ctx.beginPath();
                ctx.arc(x + 4, y + 3, 3, 0, Math.PI);
                ctx.fill();
            }
        }
    }
    
    // Belt and buckle
    ctx.fillStyle = accent;
    ctx.fillRect(48, 88, 32, 5);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(62, 86, 8, 8);
    
    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(64, 45, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair variations
    ctx.fillStyle = hair;
    if (variant === 0) {
        // Short spiky hair
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(52 + i * 5, 28, 4, 8);
        }
    } else if (variant === 1) {
        // Ponytail
        ctx.beginPath();
        ctx.arc(64, 35, 16, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(62, 55, 4, 15);
    } else {
        // Messy hair
        ctx.fillRect(50, 30, 28, 10);
    }
    
    // Hood/Bandana variations
    if (variant === 0 || variant === 2) {
        // Hood
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(64, 38, 20, Math.PI, 0);
        ctx.fill();
    } else {
        // Bandana
        ctx.fillStyle = accent;
        ctx.fillRect(50, 32, 28, 6);
    }
    
    // Face covering (mask/scarf)
    if (rng.pattern % 2 === 0) {
        ctx.fillStyle = adjustBrightness(accent, -20);
        ctx.fillRect(54, 48, 20, 6);
    }
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(56, 44, 4, 3);
    ctx.fillRect(68, 44, 4, 3);
    
    // Quiver with arrows
    ctx.fillStyle = leather;
    ctx.fillRect(33, 58, 10, 28);
    
    // Arrows in quiver
    ctx.strokeStyle = weapon;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(36 + i * 3, 55);
        ctx.lineTo(36 + i * 3, 62);
        ctx.stroke();
    }
    
    // Arrow feathers
    ctx.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(35 + i * 3, 55, 3, 3);
    }
    
    // Bow variations
    ctx.strokeStyle = weapon;
    ctx.lineWidth = 4;
    if (variant === 0 || variant === 1) {
        // Recurve bow
        ctx.beginPath();
        ctx.moveTo(95, 42);
        ctx.quadraticCurveTo(108, 55, 105, 70);
        ctx.quadraticCurveTo(108, 85, 95, 98);
        ctx.stroke();
    } else {
        // Longbow
        ctx.beginPath();
        ctx.moveTo(96, 40);
        ctx.quadraticCurveTo(106, 70, 96, 100);
        ctx.stroke();
    }
    
    // Bowstring
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(95, 42);
    ctx.lineTo(95, 98);
    ctx.stroke();
    
    // Arrow nocked
    ctx.strokeStyle = weapon;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(82, 70);
    ctx.lineTo(95, 70);
    ctx.stroke();
    
    // Arrowhead color variation
    ctx.fillStyle = variant === 0 ? accent : adjustBrightness(weapon, -20);
    ctx.beginPath();
    ctx.moveTo(95, 70);
    ctx.lineTo(100, 67);
    ctx.lineTo(100, 73);
    ctx.closePath();
    ctx.fill();
    
    // Wrist guard
    ctx.fillStyle = adjustBrightness(leather, -15);
    ctx.fillRect(80, 68, 8, 6);
}

function drawStar(ctx, x, y, innerRadius, outerRadius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2) * outerRadius, 
                   Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) * outerRadius);
        ctx.lineTo(Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2 + Math.PI / 5) * innerRadius,
                   Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2 + Math.PI / 5) * innerRadius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function generateClassTraits(warriorClass, rng, hairColor, armorColor, weaponColor) {
    const hairNames = {
        '#000000': 'Black',
        '#3d2817': 'Dark Brown',
        '#6b4423': 'Brown',
        '#8b4513': 'Auburn',
        '#d4af37': 'Golden',
        '#ffffff': 'White',
        '#8b0000': 'Crimson',
        '#4a0e0e': 'Dark Red'
    };
    
    const hairName = hairNames[hairColor] || 'Mysterious';
    
    const traits = {
        'Knight': {
            appearance: ['Battle-scarred', 'Noble', 'Imposing', 'Stalwart'][rng.variant],
            armor: [`${getColorName(armorColor)} Plate Armor`, `${getColorName(armorColor)} Mail`, 'Dragon Scale', 'Steel Fortress'][rng.variant],
            weapon: [`${getColorName(weaponColor)} Greatsword`, `${getColorName(weaponColor)} Blade & Shield`, 'War Hammer', 'Battle Axe'][rng.variant]
        },
        'Mage': {
            appearance: [`Mystical ${hairName}-haired`, `Ancient ${hairName}-haired`, 'Ethereal', 'Wise'][rng.variant],
            armor: [`${getColorName(armorColor)} Enchanted Robes`, `${getColorName(armorColor)} Arcane Vestments`, 'Star Mantle', 'Mystic Cloak'][rng.variant],
            weapon: [`${getColorName(weaponColor)} Crystal Staff`, 'Ancient Grimoire', 'Wand of Power', 'Elemental Orb'][rng.variant]
        },
        'Archer': {
            appearance: [`Swift ${hairName}-haired`, `Keen-eyed ${hairName}-haired`, 'Agile', 'Silent'][rng.variant],
            armor: [`${getColorName(armorColor)} Leather`, `${getColorName(armorColor)} Ranger Garb`, 'Forest Cloak', 'Scout Vest'][rng.variant],
            weapon: [`${getColorName(weaponColor)} Longbow`, `${getColorName(weaponColor)} Crossbow`, 'Composite Bow', 'Dual Daggers'][rng.variant]
        }
    };
    
    return traits[warriorClass] || traits['Knight'];
}

function getColorName(hexColor) {
    const colorNames = {
        '#708090': 'Steel', '#a9a9a9': 'Silver', '#2f4f4f': 'Iron',
        '#556b2f': 'Bronze', '#8b4513': 'Copper', '#cd853f': 'Gold',
        '#8e44ad': 'Purple', '#9b59b6': 'Violet', '#3498db': 'Azure',
        '#2980b9': 'Cobalt', '#1abc9c': 'Turquoise', '#16a085': 'Teal',
        '#228b22': 'Forest', '#2e8b57': 'Emerald', '#654321': 'Oak',
        '#6b8e23': 'Olive', '#c0c0c0': 'Platinum', '#ffd700': 'Golden',
        '#b87333': 'Bronze', '#4682b4': 'Sapphire', '#8b0000': 'Crimson'
    };
    
    return colorNames[hexColor] || 'Enchanted';
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

window.generateWarriorAvatar = generateWarriorAvatar;
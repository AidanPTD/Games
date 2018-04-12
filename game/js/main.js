/// <reference path="../defs/p2.d.ts"/>
/// <reference path="./phaser.min.js"/>
/// <reference path="../defs/phaser.d.ts"/>
/// <reference path="../defs/pixi.d.ts"/>
/// <reference path="./phaser.js" />

// =============================================================================
// Sprites
// =============================================================================


//
// Hero
//
var SPEED = 200;
function Hero(game, x, y) {
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');
    // anchor
    this.anchor.set(0.5, 0.5);
    // physics properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;

    // animations
    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
    this.animations.add('die', [5, 6, 5, 6, 5, 6, 5, 6], 12); // 12fps no loop
    // starting animation
    this.animations.play('stop');
};

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction) {
    // guard
    if (this.isFrozen) { return; }
    this.body.velocity.x = direction * SPEED;

    // update image flipping & animations
    if (this.body.velocity.x < 0) {
        this.scale.x = -1;
    }
    else if (this.body.velocity.x > 0) {
        this.scale.x = 1;
    }
};

Hero.prototype.jump = function () {
    const JUMP_SPEED = 400;
    const DOUBLEJUMP_SPEED = 800;
    let canJump = this.body.touching.down && this.alive && !this.isFrozen;

    if ((canJump || this.isBoosting) || this.onWall) {
        this.body.velocity.y = -JUMP_SPEED;
        this.isBoosting = true;
        /* if (this.onWall) {
            if (this.keys.up.isDown && !canJump) {
                if (this.keys.right.isDown && this.body.touching.right) {
                    this.move(1);
                    this.body.velocity.y = -JUMP_SPEED;
                    console.log("Jumped off wall");
                }
                if (this.keys.left.isDown && this.body.touching.left) {
                    this.move(-1);
                    this.body.velocity.y = -JUMP_SPEED;
                    console.log("Jumped off wall");
                }
            }
        } */
        this.canDoubleJump = true;
        this.canJump = false;
        this.onWall = false;

    }
    else {
        if (this.canDoubleJump) {
            this.body.velocity.y = -DOUBLEJUMP_SPEED;
            this.canDoubleJump = false;
        }
    }

    return canJump;
};

Hero.prototype.stopJumpBoost = function () {
    this.isBoosting = false;
};

Hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 300;
    this.body.velocity.y = -BOUNCE_SPEED;
};
Hero.prototype.update = function () {
    // update sprite animation, if it needs changing
    let animationName = this._getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName);
    }
};

Hero.prototype.freeze = function () {
    this.body.enable = false;
    this.isFrozen = true;
};

Hero.prototype.die = function () {
    this.alive = false;
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};
Hero.prototype.hurt = function () {
    this.x -= 10;
    this.alive = false;
    this.body.enable = false;
    this.animations.play('die').onComplete.addOnce(function () {
        this.y -= 50;
        this.alive = true;
        this.body.enable = true;
        this.animations.play('stop');
    }, this);
};

// returns the animation name that should be playing depending on
// current circumstances
Hero.prototype._getAnimationName = function () {
    let name = 'stop'; // default animation

    // dying
    if (!this.alive) {
        name = 'die';
    }
    // frozen & not dying
    else if (this.isFrozen) {
        name = 'stop';
    }
    // jumping
    else if (this.body.velocity.y < 0) {
        name = 'jump';
    }
    // falling
    else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
        name = 'fall';
    }
    else if (this.body.velocity.x !== 0 && this.body.touching.down) {
        name = 'run';
    }

    return name;
};
Hero.prototype._bouncePad = function () {
    this.body.velocity.y = 800;
}
//
// Spider (enemy)
//

function Spider(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');

    // anchor
    this.anchor.set(0.5);
    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true);
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');

    // physic properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
};

Spider.SPEED = 100;

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function () {
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    }
    else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
};

Spider.prototype.die = function () {
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

// =============================================================================
// Loading state
// =============================================================================

LoadingState = {};

LoadingState.init = function () {
    // keep crispy-looking pixels
    this.game.renderer.renderSession.roundPixels = true;
};

LoadingState.preload = function () {
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');
    this.game.load.json('level:2', 'data/level02.json');
    this.game.load.tilemap('level:01', 'data/level1.json', null, Phaser.Tilemap.TILED_JSON);
    this.game.load.image('font:numbers', 'images/numbers.png');

    this.game.load.image('icon:coin', 'images/coin_icon.png');
    this.game.load.image('icon:life', 'images/life_hud.png');
    this.game.load.image('background', 'images/background.png');
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');
    this.game.load.image('copper-key', 'images/key_copper.png');
    this.game.load.image('silver-key', 'images/key_silver.png');
    this.game.load.image('gold-key', 'images/key_gold.png');
    this.game.load.image('brick', 'images/brick.png');
    this.game.load.image('tiles', 'images/tiles.png');
    this.game.load.image('star', 'images/star.png');
    this.game.load.image('life', 'images/lifeitem.png');
    this.game.load.image('brick', 'images/brick.png');
    this.game.load.spritesheet('itembox', 'images/itembox.png', 42, 42);
    this.game.load.spritesheet('coinbox', 'images/coinbox.png', 42, 42);
    this.game.load.spritesheet('hearts', 'images/hearts.png', 45, 38);
    this.game.load.spritesheet('decoration', 'images/decor.png', 42, 42);
    this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.spritesheet('door', 'images/door.png', 42, 66);
    this.game.load.spritesheet('icon:key_copper', 'images/key_icon_copper.png', 34, 30);
    this.game.load.spritesheet('icon:key_silver', 'images/key_icon_silver.png', 34, 30);
    this.game.load.spritesheet('icon:key_gold', 'images/key_icon_gold.png', 34, 30);
    this.game.load.spritesheet('spring', 'images/spring.png', 45, 32);
    this.game.load.spritesheet('tiles', 'images/tiles.png', 42, 42);

    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:key', 'audio/key.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
    this.game.load.audio('sfx:door', 'audio/door.wav');
    this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);
    this.game.load.audio('sfx:life', 'audio/life.wav');

};

LoadingState.create = function () {
    this.game.world.setBounds(0, 0, 5000, 1000);
    this.game.state.start('play', true, false, { level: 0 });
};

// =============================================================================
// Play state
// =============================================================================

PlayState = {};

const LEVEL_COUNT = 3;
const LEVEL = 1;
var LIVES = 3;
var COINS = 0;
var SCORE = 0;
const NUMBERS_STR = '0123456789X ';
PlayState.init = function (data) {
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP,
        speed: Phaser.KeyCode.SHIFT,
        wallJump: Phaser.KeyCode.SPACEBAR
    });
    this.hasCopperKey = false;
    this.hasSilverKey = false;
    this.hasGoldKey = false;
    this.level = (data.level || 0) % LEVEL_COUNT;
    this.health = 6;
    this.canDoubleJump = false;
    this.onWall = false;
    this.Invincible = false;
};

PlayState.create = function () {
    // fade in (from black)
    this.camera.flash('#000000');

    // create sound entities
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        key: this.game.add.audio('sfx:key'),
        stomp: this.game.add.audio('sfx:stomp'),
        door: this.game.add.audio('sfx:door'),
        life: this.game.add.audio('sfx:life')
    };
    this.bgm = this.game.add.audio('bgm');
    //this.bgm.loopFull();
    //this.map = this.game.add.tilemap('level:01');
    //this.map.addTilesetImage('tiles', 'tiles');

    /*this.groundLayer = map.createLayer('GroundLayer');
    this.groundLayer.resizeWorld();

    this.backgroundLayer = map.createLayer('BackgroundLayer');
    this.backgroundLayer.resizeWorld();*/
    // create level entities and decoration
    var bg = this.game.add.image(0, 0, 'background');
    bg.fixedToCamera = true;
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));
    // create the HUD for the game
    this._createHud();
};

PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();
    // update scoreboards
    this.coinFont.text = `x${COINS}`;
    this.lifeFont.text = `x${LIVES}`;
    this.copperKeyIcon.frame = this.hasCopperKey ? 1 : 0;
    this.silverKeyIcon.frame = this.hasSilverKey ? 1 : 0;
    if (COINS > 99) {
        LIVES += 1;
        COINS = 0;
    };
    this.goldKeyIcon.frame = this.hasGoldKey ? 1 : 0;
    this.game.camera.follow(this.hero, Phaser.Camera.FOLLOW_PLATFORMER);
    this._updateScoreText();
};

PlayState.shutdown = function () {
    this.bgm.stop();
};
PlayState._decreaseHealth = function () {
    this.health -= 1;
    if (this.health == 6) {
        this.heart1.frame = 0;
        this.heart2.frame = 0;
        this.heart3.frame = 0;
    }
    if (this.health == 5) {
        this.heart1.frame = 0;
        this.heart2.frame = 0;
        this.heart3.frame = 1;
    }
    if (this.health == 4) {
        this.heart1.frame = 0;
        this.heart2.frame = 0;
        this.heart3.frame = 2;
    }
    if (this.health == 3) {
        this.heart1.frame = 0;
        this.heart2.frame = 1;
        this.heart3.frame = 2;
    }
    if (this.health == 2) {
        this.heart1.frame = 0;
        this.heart2.frame = 2;
        this.heart3.frame = 2;
    }
    if (this.health == 1) {
        this.heart1.frame = 1;
        this.heart2.frame = 2;
        this.heart3.frame = 2;
    }
    if (this.health == 0) {
        this.heart1.frame = 2;
        this.heart2.frame = 2;
        this.heart3.frame = 2;
        this.hero.kill();
    }
};
PlayState._handleCollisions = function () {
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.spiders, this.springs);
    this.game.physics.arcade.collide(this.hero, this.tiles);
    this.game.physics.arcade.collide(this.hero, this.platforms);

    this.game.physics.arcade.collide(this.hero, this.itemboxes, this._onHeroVsItemBox, null, this);
    //this.game.physics.arcade.collide(this.hero, this.coinboxes, this._onHeroVsCoinBox, null, this);
    // hero vs coins (pick up)
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.oneups, this._onHeroVsLife,
        null, this);
    this.game.physics.arcade.collide(this.hero, this.springs, this._onHeroVsSprings, null, this);
    // hero vs keys (pick up)
    this.game.physics.arcade.overlap(this.hero, this.copperKey, this._onHeroVsCopperKey,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.stars, this._onHeroVsStar, null, this);
    this.game.physics.arcade.collide(this.stars, this.platforms);
    this.game.physics.arcade.collide(this.stars, this.tiles);
    this.game.physics.arcade.collide(this.stars, this.itemboxes);
    this.game.physics.arcade.collide(this.stars, this.coinboxes);
    this.game.physics.arcade.collide(this.stars, this.springs);
    this.game.physics.arcade.overlap(this.hero, this.silverKey, this._onHeroVsSilverKey,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.goldKey, this._onHeroVsGoldKey,
        null, this);
    // hero vs door (end level)
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
        // ignore if there is no key or the player is on air
        function (hero, door) {
            return this.hasCopperKey && this.hasSilverKey && this.hasGoldKey
                && hero.body.touching.down;
        }, this);
    // collision: hero vs enemies (kill or die)
    this.game.physics.arcade.overlap(this.hero, this.spiders,
        this._onHeroVsEnemy, null, this);
};
PlayState._handleInput = function () {
    if (this.keys.speed.isDown) {
        SPEED = 400;
    }
    else {
        SPEED = 200;
    }
    if (this.keys.left.isDown) { // move hero left
        this.hero.move(-1);
    }
    else if (this.keys.right.isDown) { // move hero right
        this.hero.move(1);
    }
    else { // stop
        this.hero.move(0);
    }
    // handle jump
    const JUMP_HOLD = 200; // ms
    if (this.keys.up.downDuration(JUMP_HOLD)) {
        let didJump = this.hero.jump();
        if (didJump) { this.sfx.jump.play(); }
    }
    else {
        this.hero.stopJumpBoost();
    }
};
PlayState._onHeroVsStar = function (hero, star) {
    var starTimer = this.game.time.create(false);
    var timeLimit = 5;
    timeLimit *= 10;
    starTimer.start(100, function () {
        if (timeLimit > 0) {
            hero.tint = Math.random() * 0xffffff;
            timeLimit -= 1;
            console.log(timeLimit);
        } else {
            hero.tint = 0xffffff;
            starTimer.destroy();
        }
    });
    SCORE += 1000;
    this._createScoreText(1000, star.x, star.y - (star.height * 1));
    star.kill();
};
PlayState._onHeroVsCopperKey = function (hero, copperkey) {
    this.sfx.key.play();
    copperkey.kill();
    this.hasCopperKey = true;
};
PlayState._onHeroVsSilverKey = function (hero, silverkey) {
    this.sfx.key.play();
    silverkey.kill();
    this.hasSilverKey = true;
};
PlayState._onHeroVsGoldKey = function (hero, goldkey) {
    this.sfx.key.play();
    goldkey.kill();
    this.hasGoldKey = true;
};
PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    this._createScoreText(100, coin.x, coin.y - (coin.height * 1));
    coin.kill();
    COINS++;
    SCORE += 100;
};
PlayState._onHeroVsLife = function (hero, life) {
    this.sfx.life.play();
    this._createScoreText(1000, life.x, life.y - (life.height * 1));
    life.kill();
    LIVES++;
    SCORE += 1000;
}
PlayState._onHeroVsItemBox = function (hero, itemboxes) {
    if (itemboxes.frame == 0) {
        var itemNumber = this.game.rnd.integerInRange(0, 5);
        if (itemNumber == 0) {
            console.log("Life appeared");
            this._spawnStar(itemboxes.x, itemboxes.y - (itemboxes.height * 3));
        };
        if (itemNumber == 1) {
            console.log("Coin appeared");
            this._spawnStar(itemboxes.x, itemboxes.y - (itemboxes.height * 3));
        };
        if (itemNumber == 2) {
            console.log("Life appeared");
            this._spawnStar(itemboxes.x, itemboxes.y - (itemboxes.height * 3));
        };
        if (itemNumber == 3) {
            console.log("Coin appeared");
            this._spawnStar(itemboxes.x, itemboxes.y - (itemboxes.height * 3));
        };
        if (itemNumber == 4) {
            console.log("Life appeared");
            this._spawnStar(itemboxes.x, itemboxes.y - (itemboxes.height * 3));
        };
    }
    //this._spawnStar(itemboxes.x, itemboxes.y - (itemboxes.height * 3));
    itemboxes.frame = 1;
    console.log("Item appeared");
};
PlayState._createScoreText = function (scoreValue, x, y) {
    let scoreFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);
    let scoreText = this.game.make.image(x, y, scoreFont);
    scoreText.text = `+ ${scoreValue}`;
    this.game.time.events.add(2000, function () { 
        this.game.add.tween(scoreText).to(
            { y: scoreText.y - 10}, 1500, 
            Phaser.Easing.Linear.None, true); 
        this.game.add.tween(scoreText).to({ alpha: 0 }, 1500, Phaser.Easing.Linear.None, true); 
    }, this);
};
PlayState._onHeroVsCoinBox = function (hero, coinbox) {
    var coinTimer = this.game.time.create(false)
    var coinlimit = Math.floor(Math.random() * 10) + 2;
    coinTimer.loop(100, function () {
        if (coinlimit >= 0 && coinbox.frame == 0) {
            COINS++;
            SCORE += 1000;
            coinlimit--;
            this.sfx.coin.play();
            if (coinlimit == 0) {
                coinbox.frame = 1;
                console.log("Coin timer destroyed");
                coinTimer.destroy();
                this._spawnStar(coinbox.x, coinbox.y - (coinbox.height * 2));
            }
        }
    }, this);
    coinTimer.start();
};
PlayState._onHeroVsSprings = function (hero, springs) {
    hero.body.velocity.y = -400 * 2;
    //this._spawnStar(springs.x, springs.y - (springs.height * 10));
    springs.animations.play('boost');
    //this._onHeroVsStar;
};
PlayState._onHeroVsEnemy = function (hero, enemy) {
    // the hero can kill enemies when is falling (after a jump, or a fall)
    if (hero.body.velocity.y > 0) {
        enemy.die();
        hero.bounce();
        this.sfx.stomp.play();
    }
    else { // game over -> play dying animation and restart the game

        this.sfx.stomp.play();
        if (this.health > 0) {
            hero.hurt();
            PlayState._decreaseHealth();
        }
        else {
            LIVES -= 1;
            hero.die();
            if (LIVES > 0) {
                hero.events.onKilled.addOnce(function () {
                    this.game.state.restart(true, false, { level: this.level });
                }, this);
            }
            else {
                hero.events.onKilled.addOnce(function () {
                    this.game.state.restart(true, false, { level: 0 });
                }, this);
                LIVES = 3;
            }
        }
        // NOTE: bug in phaser in which it modifies 'touching' when
        // checking for overlaps. This undoes that change so spiders don't
        // 'bounce' agains the hero
        enemy.body.touching = enemy.body.wasTouching;
    }
};
PlayState._updateScoreText = function () {
    if (SCORE < 100 & SCORE >= 10) {
        this.scoreFont.text = `0000000${SCORE}`;
    }
    else if (SCORE < 1000 & SCORE >= 100) {
        this.scoreFont.text = `000000${SCORE}`;
    }
    else if (SCORE < 10000 & SCORE >= 1000) {
        this.scoreFont.text = `00000${SCORE}`;
    }
    else if (SCORE < 100000 & SCORE >= 10000) {
        this.scoreFont.text = `0000${SCORE}`;
    }
    else if (SCORE < 1000000 & SCORE >= 100000) {
        this.scoreFont.text = `000${SCORE}`;
    }
    else if (SCORE < 10000000 & SCORE >= 1000000) {
        this.scoreFont.text = `00${SCORE}`;
    }
    else if (SCORE < 100000000 & SCORE >= 10000000) {
        this.scoreFont.text = `0${SCORE}`;
    }
    else if (SCORE < 1000000000 & SCORE >= 100000000) {
        this.scoreFont.text = `${SCORE}`;
    }
    else if (SCORE >= 999999999) {
        this.scoreFont.text = `999999999`;
    }
};
PlayState._onHeroVsDoor = function (hero, door) {
    // 'open' the door by changing its graphic and playing a sfx
    door.frame = 1;
    this.sfx.door.play();

    // play 'enter door' animation and change to the next level when it ends
    hero.freeze();
    this.game.add.tween(hero)
        .to({ x: this.door.x, alpha: 0 }, 500, null, true)
        .onComplete.addOnce(this._goToNextLevel, this);
};

PlayState._goToNextLevel = function () {
    this.camera.fade('#000000');
    this.camera.onFadeComplete.addOnce(function () {
        // change to next level
        this.game.state.restart(true, false, {
            level: this.level + 1
        });
    }, this);
};
PlayState._loadLevel = function (data) {
    // create all the groups/layers that we need
    this.bgDecoration = this.game.add.group();
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.bricks = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.itemboxes = this.game.add.group();
    this.coinboxes = this.game.add.group();
    this.oneups = this.game.add.group();
    this.springs = this.game.add.group();
    this.tiles = this.game.add.group();
    this.stars = this.game.add.group();
    this.enemyWalls.visible = true;
    // spawn hero and enemies
    this._spawnCharacters({ hero: data.hero, spiders: data.spiders });

    // spawn level decoration
    data.decoration.forEach(function (deco) {
        this.bgDecoration.add(
            this.game.add.image(deco.x, deco.y, 'decoration', deco.frame));
    }, this);
    data.bricks.forEach(function (brick) {
        let sprite = this.tiles.create(brick.x, brick.y, 'brick');
        this.game.physics.enable(sprite);
        sprite.body.allowGravity = false;
        sprite.body.immovable = true;

    }, this);
    data.tiles.forEach(function (greentile) {
        let sprite = this.tiles.create(greentile.x, greentile.y, 'tiles', greentile.frame);
        this.game.physics.enable(sprite);
        sprite.body.allowGravity = false;
        sprite.body.immovable = true;

    }, this);
    // spawn platforms
    data.platforms.forEach(this._spawnPlatform, this);

    // spawn important objects
    data.coins.forEach(this._spawnCoin, this);
    data.itemboxes.forEach(this._spawnItemBoxes, this);
    data.coinboxes.forEach(this._spawnCoinBoxes, this);
    data.springs.forEach(this._spawnSprings, this);
    this._spawnCopperKey(data.copperkey.x, data.copperkey.y);
    this._spawnSilverKey(data.silverkey.x, data.silverkey.y);
    this._spawnGoldKey(data.goldkey.x, data.goldkey.y);
    this._spawnDoor(data.door.x, data.door.y);
    // enable gravity
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;
};

PlayState._spawnCharacters = function (data) {
    // spawn spiders
    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);

    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);
};

PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(
        platform.x, platform.y, platform.image);

    // physics for platform sprites
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // spawn invisible walls at each side, only detectable by enemies
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    // anchor and y displacement
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);
    // physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};
PlayState._spawnItemBoxes = function (itembox) {
    let sprite = this.coinboxes.create(
        itembox.x, itembox.y, 'itembox');
    sprite.anchor.set(0.5, 0.5);
    this.game.physics.enable(sprite);

    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    sprite.animations.add('active', [0], 6);
    sprite.animations.add('inactive', [1]);
    sprite.animations.play('active');
};
PlayState._spawnCoinBoxes = function (coinbox) {
    let sprite = this.coinboxes.create(
        coinbox.x, coinbox.y, 'coinbox');
    sprite.anchor.set(0.5, 0.5);
    this.game.physics.enable(sprite);

    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    sprite.animations.add('active', [0]);
    sprite.animations.add('inactive', [1]);
    sprite.animations.play('active');
};
PlayState._spawnCoinItem = function (x, y, coin) {
    let sprite = this.coins.create(x, y, 'coin');
    sprite.anchor.set(0.5, 0.5);

    // physics (so we can detect overlap with the hero)
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;

    // animations
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
    sprite.animations.play('rotate');
};
PlayState._spawnStar = function (x, y, star) {
    let sprite = this.stars.create(x, y, 'star');
    sprite.anchor.set(0.5, 0.5);

    // physics (so we can detect overlap with the hero)
    this.game.physics.enable(sprite, Phaser.Physics.ARCADE);
    sprite.body.allowGravity = true;
    sprite.body.immovable = true;
    sprite.body.collideWorldBounds = true;
    sprite.body.bounce.set(1);
    //sprite.body.velocity.y = 200;
    sprite.body.velocity.x = 100;
};
PlayState._spawnLifeItem = function (x, y, life) {
    let sprite = this.oneups.create(x, y, 'life');
    sprite.anchor.set(0.5, 0.5);

    // physics (so we can detect overlap with the hero)
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;

    sprite.y -= 3;
    this.game.add.tween(sprite)
        .to({ y: sprite.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
}
PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);

    // physics (so we can detect overlap with the hero)
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    // animations
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
    sprite.animations.play('rotate');
};
PlayState._spawnSprings = function (spring) {
    let sprite = this.springs.create(spring.x, spring.y, 'spring');
    sprite.anchor.set(0.5, 0.5);

    // physics (so we can detect overlap with the hero)
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // animations
    sprite.animations.add('boost', [1, 0], 12, false); // 6fps, looped
    sprite.animations.add('idle', [0], 6);
    sprite.animations.play('idle');
};
PlayState._spawnCopperKey = function (x, y) {
    this.copperKey = this.bgDecoration.create(x, y, 'copper-key');
    this.copperKey.anchor.set(0.5, 0.5);
    // enable physics to detect collisions, so the hero can pick the key up
    this.game.physics.enable(this.copperKey);
    this.copperKey.body.allowGravity = false;

    // add a small 'up & down' animation via a tween
    this.copperKey.y -= 3;
    this.game.add.tween(this.copperKey)
        .to({ y: this.copperKey.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};
PlayState._spawnSilverKey = function (x, y) {
    this.silverKey = this.bgDecoration.create(x, y, 'silver-key');
    this.silverKey.anchor.set(0.5, 0.5);
    // enable physics to detect collisions, so the hero can pick the key up
    this.game.physics.enable(this.silverKey);
    this.silverKey.body.allowGravity = false;

    // add a small 'up & down' animation via a tween
    this.silverKey.y -= 3;
    this.game.add.tween(this.silverKey)
        .to({ y: this.silverKey.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};
PlayState._spawnGoldKey = function (x, y) {
    this.goldKey = this.bgDecoration.create(x, y, 'gold-key');
    this.goldKey.anchor.set(0.5, 0.5);
    // enable physics to detect collisions, so the hero can pick the key up
    this.game.physics.enable(this.goldKey);
    this.goldKey.body.allowGravity = false;

    // add a small 'up & down' animation via a tween
    this.goldKey.y -= 3;
    this.game.add.tween(this.goldKey)
        .to({ y: this.goldKey.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};
PlayState._spawnDoor = function (x, y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
};

PlayState._createHud = function () {
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR, 6);
    this.lifeFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);
    this.scoreFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);

    this.copperKeyIcon = this.game.make.image(0, 19, 'icon:key_copper');
    this.copperKeyIcon.anchor.set(0, 0.5);

    this.silverKeyIcon = this.game.make.image(this.copperKeyIcon.width + 7, 19, 'icon:key_silver');
    this.silverKeyIcon.anchor.set(0, 0.5);

    this.goldKeyIcon = this.game.make.image(this.silverKeyIcon.width + 49, 19, 'icon:key_gold');
    this.goldKeyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(0, this.copperKeyIcon.height + 12, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
        coinIcon.height * 1.5, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    let lifeIcon = this.game.make.image(0, coinIcon.height * 2.1, 'icon:life');
    let lifeCountImg = this.game.make.image(lifeIcon.x + lifeIcon.width,
        lifeIcon.height * 2.5, this.lifeFont);
    lifeCountImg.anchor.set(0, 0.5);
    let scoreCount = this.game.make.image(780, 0, this.scoreFont);
    this.heart1 = this.game.add.sprite(0, lifeIcon.y + 40, 'hearts');
    this.heart2 = this.game.add.sprite(this.heart1.x + this.heart1.width, this.heart1.y, 'hearts');
    this.heart3 = this.game.add.sprite(this.heart2.x + this.heart2.width, this.heart2.y, 'hearts');

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.add(lifeIcon);
    this.hud.add(lifeCountImg);
    this.hud.add(scoreCount);
    this.hud.add(this.copperKeyIcon);
    this.hud.add(this.silverKeyIcon);
    this.hud.add(this.goldKeyIcon);
    this.hud.add(this.heart1);
    this.hud.add(this.heart2);
    this.hud.add(this.heart3);
    //this.hud.add(this.debugText);
    this.hud.position.set(10, 10);
    this.hud.fixedToCamera = true;
};

// =============================================================================
// entry point
// =============================================================================
window.onload = function () {
    let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};


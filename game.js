const SCENES = {
  key: 'mochila',
};

const SPRITES = {
  ground: {
    key: 'ground',
    image: 'assets/128x128.png',
  },
  wall: {
    key: 'wall',
    image: 'assets/steelbox.png',
  },
  block: {
    key: 'block',
    image: 'assets/block.png',
  },
  player: {
    key: 'dude',
    image: 'assets/dude.png',
    frameWidth: 32,
    frameHeight: 48,
    velocity: 120,
  },
};

const DIRECTIONS = {
  left: 'left',
  right: 'right',
  up: 'up',
  down: 'down',
};

const TILE = {
  size: 40,
  halfSize: function () {
    return this.size / 2;
  },
  getPosition: function (x, y) {
    return {
      x: x * this.size + this.halfSize(),
      y: y * this.size + this.halfSize(),
    };
  },
};

const cols = Math.floor(window.innerWidth / TILE.size);
const rows = Math.floor(window.innerHeight / TILE.size);
const gameWidth = cols * TILE.size;
const gameHeight = rows * TILE.size;

const config = {
  type: Phaser.AUTO,
  width: gameWidth,
  height: gameHeight,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    key: SCENES.key,
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let cursors;
let walls;
let infoBlock;
let player;
let currentDirection = DIRECTIONS.down;
let xVelocity = 0;
let yVelocity = 0;

function preload() {
  this.load.image(SPRITES.ground.key, SPRITES.ground.image);
  this.load.image(SPRITES.wall.key, SPRITES.wall.image);
  this.load.image(SPRITES.block.key, SPRITES.block.image);
  this.load.spritesheet(SPRITES.player.key, SPRITES.player.image, {
    frameWidth: SPRITES.player.frameWidth,
    frameHeight: SPRITES.player.frameHeight,
  });
}

function create() {
  setupBackground(this);
  setupMaze(this);
  setupPlayer(this);
  setupAnimations(this);
  setupControls(this);
  setupJoystick();
}

function update() {
  handlePlayerMovement();
  handleAnimations();
}

function resetGame() {
  xVelocity = 0;
  yVelocity = 0;
  currentDirection = DIRECTIONS.down;

  game.scene.start(SCENES.key);
}

function hitInfoBlock() {
  const messageDiv = document.getElementById('messageDiv');
  messageDiv.style.display = 'block';

  document.getElementById('closeButton').onclick = function () {
    messageDiv.style.display = 'none';
    resetGame();
  };
}

function generateMaze(rows, cols) {
  // https://en.wikipedia.org/wiki/Depth-first_search
  let maze = Array.from({ length: rows }, () => Array(cols).fill(1));
  let stack = [];
  let currentCell = [1, 1];
  maze[1][1] = 0;

  const directions = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  stack.push(currentCell);

  while (stack.length > 0) {
    let [cx, cy] = currentCell;
    let neighbors = [];

    for (let [dx, dy] of directions) {
      let nx = cx + dx;
      let ny = cy + dy;

      if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && maze[ny][nx] === 1) {
        neighbors.push([nx, ny]);
      }
    }

    if (neighbors.length > 0) {
      let [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];

      maze[(cy + ny) / 2][(cx + nx) / 2] = 0;
      maze[ny][nx] = 0;
      stack.push([nx, ny]);
      currentCell = [nx, ny];
    } else {
      currentCell = stack.pop();
    }
  }

  return maze;
}

function createWalls(maze, wallsGroup) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (maze[y][x] === 1) {
        const tilePosition = TILE.getPosition(x, y);

        wallsGroup.create(tilePosition.x, tilePosition.y, SPRITES.wall.key).setScale(1).refreshBody();
      }
    }
  }
}

function handlePlayerMovement() {
  player.setVelocity(xVelocity, yVelocity);

  if (cursors.left.isDown) {
    xVelocity = -SPRITES.player.velocity;
    yVelocity = 0;
  } else if (cursors.right.isDown) {
    xVelocity = SPRITES.player.velocity;
    yVelocity = 0;
  } else if (cursors.up.isDown) {
    xVelocity = 0;
    yVelocity = -SPRITES.player.velocity;
  } else if (cursors.down.isDown) {
    xVelocity = 0;
    yVelocity = SPRITES.player.velocity;
  }
}

function handleAnimations() {
  if (yVelocity < -Math.abs(xVelocity)) {
    currentDirection = DIRECTIONS.up;
  } else if (yVelocity > Math.abs(xVelocity)) {
    currentDirection = DIRECTIONS.down;
  } else if (xVelocity < 0) {
    currentDirection = DIRECTIONS.left;
  } else if (xVelocity > 0) {
    currentDirection = DIRECTIONS.right;
  } else {
    currentDirection = DIRECTIONS.down;
  }

  player.anims.play(currentDirection, true);
}

function setupJoystick() {
  const joystick = nipplejs.create({
    zone: document.getElementById('joystick'),
    mode: 'dynamic',
    position: { left: '50%', bottom: '20%' },
    threshold: 1,
    size: 70,
    color: 'blue',
    fadeTime: 200,
    lockX: false,
    lockY: false,
  });

  joystick.on('move', (evt, data) => {
    const angle = data.angle.radian;

    xVelocity = Math.cos(angle) * SPRITES.player.velocity;
    yVelocity = -Math.sin(angle) * SPRITES.player.velocity;
  });

  joystick.on('end', () => {
    xVelocity = 0;
    yVelocity = 0;
  });
}

function setupBackground(scene) {
  scene.add.tileSprite(0, 0, gameWidth, gameHeight, SPRITES.ground.key).setOrigin(0);
}

function setupMaze(scene) {
  const maze = generateMaze(rows, cols);

  walls = scene.physics.add.staticGroup();

  createWalls(maze, walls);
  setupInfoBlock(scene, maze);
}

function setupControls(scene) {
  cursors = scene.input.keyboard.createCursorKeys();
}

function setupPlayer(scene) {
  const playerStartPosition = TILE.getPosition(1, 1);

  player = scene.physics.add.sprite(playerStartPosition.x, playerStartPosition.y, SPRITES.player.key);
  player.setCollideWorldBounds(true);
  player.setScale(0.8);
  player.body.enable = false;

  scene.time.delayedCall(500, () => {
    player.body.enable = true;
  });

  scene.physics.add.collider(player, walls);
  scene.physics.add.collider(player, infoBlock, hitInfoBlock, null, scene);
}

function setupAnimations(scene) {
  scene.anims.create({
    key: 'left',
    frames: scene.anims.generateFrameNumbers(SPRITES.player.key, {
      start: 0,
      end: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });

  scene.anims.create({
    key: 'right',
    frames: scene.anims.generateFrameNumbers(SPRITES.player.key, {
      start: 5,
      end: 8,
    }),
    frameRate: 10,
    repeat: -1,
  });

  scene.anims.create({
    key: 'up',
    frames: scene.anims.generateFrameNumbers(SPRITES.player.key, {
      start: 1,
      end: 4,
    }),
    frameRate: 10,
    repeat: -1,
  });

  scene.anims.create({
    key: 'down',
    frames: [{ key: SPRITES.player.key, frame: 4 }],
    frameRate: 20,
  });
}

function setupInfoBlock(scene, maze) {
  for (let y = maze.length - 2; y >= 0; y--) {
    let availablePositions = [];

    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 0) {
        availablePositions.push(x);
      }
    }

    if (availablePositions.length == 0) {
      continue;
    }

    const randomX = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const infoBlockPosition = TILE.getPosition(randomX, y);

    infoBlock = scene.physics.add.staticGroup();
    infoBlock.create(infoBlockPosition.x, infoBlockPosition.y, SPRITES.block.key);

    return;
  }
}

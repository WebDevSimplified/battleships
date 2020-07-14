document.addEventListener("DOMContentLoaded", () => {
  const setupButtons = document.getElementById('setup-buttons')
  const userGrid = document.querySelector(".grid-user");
  const enemyGrid = document.querySelector(".grid-computer");
  const displayGrid = document.querySelector(".grid-display");
  const ships = document.querySelectorAll(".ship");
  const destroyer = document.querySelector(".destroyer-container");
  const submarine = document.querySelector(".submarine-container");
  const cruiser = document.querySelector(".cruiser-container");
  const battleship = document.querySelector(".battleship-container");
  const carrier = document.querySelector(".carrier-container");
  const startButton = document.querySelector("#start");
  const rotateButton = document.querySelector("#rotate");
  const turnDisplay = document.querySelector("#whose-go");
  const infoDisplay = document.querySelector("#info");
  const userSquares = [];
  const enemySquares = [];
  const width = 10;
  let isGameOver = false;
  let currentPlayer = "user";
  let isHorizontal = true;
  let playerNum = 0;
  let ready = false;
  let enemyReady = false;
  let allShipsPlaced = false;
  let shotFired = -1;

  // Setup player boards
  createBoard(userGrid, userSquares, width);
  createBoard(enemyGrid, enemySquares, width);

  // Multi-Player
  function startTwoPlayer() {
    const socket = io();

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`);
      playerConnectedOrDisconnect(num);
    });

    // Get your player number
    socket.on('player-number', num => {
      if(num === -1) {
        infoDisplay.innerHTML = "Sorry, the server is full";
      } else {
        playerNum = parseInt(num);
        if(playerNum === 1) currentPlayer = "enemy";

        // Get other player status
        socket.emit('check-players');

        // Listen for player ready
        startButton.addEventListener("click", () => {
          if(allShipsPlaced) {
            playGameMulti(socket)
            setupButtons.style.display = 'none'
          } else {
            infoDisplay.innerHTML = "Please place all ships"
          }
        });
      }
    });

    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnect(i);
        if(p.ready) {
          playerReady(i);
          enemyReady = true;
        }
      });
    });

    socket.on('enemy-ready', (num) => {
      enemyReady = true;
      playerReady(num);
      if (ready) playGameMulti(socket);
    });

    // Setup event listeners for firing
    enemySquares.forEach((square) =>
      square.addEventListener("click", function (e) {
        if (currentPlayer === "user" && ready && enemyReady) {
          shotFired = square.dataset.id;
          socket.emit('fire', shotFired);
        }
      })
    );

    socket.on('fire', id => {
      enemyGo(id);
      const square = userSquares[id];
      socket.emit('fire-reply', square.classList);
      playGameMulti(socket);
    });

    socket.on('fire-reply', classList => {
      revealSquare(classList);
      playGameMulti(socket);
    });

    socket.on('timeout', () => {
      // return to main menu
      infoDisplay.innerHTML = "You have reached the 10 minute game limit";
    });
  }

  function playerConnectedOrDisconnect(num) {
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .connected`).classList.toggle('active');
    if (parseInt(num) === playerNum) document.querySelector(`${player}`).style.fontWeight = 'bold';
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .ready`).classList.toggle('active');
  }

  // Single Player
  function startOnePlayer() {
    generate(shipArray[0]);
    generate(shipArray[1]);
    generate(shipArray[2]);
    generate(shipArray[3]);
    generate(shipArray[4]);

    startButton.addEventListener("click", () => {
      setupButtons.style.display = 'none'
      playGameSingle()
    });
  }

  // Create Boards
  function createBoard(grid, squares, width) {
    for (let i = 0; i < width * width; i++) {
      const square = document.createElement("div");
      square.dataset.id = i;
      grid.appendChild(square);
      squares.push(square);
    }
  }

  // Ships
  const shipArray = [
    {
      name: "destroyer",
      directions: [
        [0, 1],
        [0, width],
      ],
    },
    {
      name: "submarine",
      directions: [
        [0, 1, 2],
        [0, width, width * 2],
      ],
    },
    {
      name: "cruiser",
      directions: [
        [0, 1, 2],
        [0, width, width * 2],
      ],
    },
    {
      name: "battleship",
      directions: [
        [0, 1, 2, 3],
        [0, width, width * 2, width * 3],
      ],
    },
    {
      name: "carrier",
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width * 2, width * 3, width * 4],
      ],
    },
  ];

  // Draw the computers ships in random locations
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length);
    let current = ship.directions[randomDirection];
    if (randomDirection === 0) direction = 1;
    if (randomDirection === 1) direction = 10;
    let randomStart = Math.abs(
      Math.floor(
        Math.random() * enemySquares.length -
          (ship.directions[0].length * direction),
      ),
    );

    const isTaken = current.some((index) =>
      enemySquares[randomStart + index].classList.contains("taken")
    );
    const isAtRightEdge = current.some((index) =>
      (randomStart + index) % width === width - 1
    );
    const isAtLeftEdge = current.some((index) =>
      (randomStart + index) % width === 0
    );

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) {
      current.forEach((position, index) => {
        const square = enemySquares[randomStart + position]
        const directionClass = randomDirection === 0 ? 'horizontal' : 'vertical'
        square.classList.add("taken", ship.name, directionClass)
        if (index === 0) square.classList.add('start')
        if (index === current.length - 1) square.classList.add('end')
      });
    } else generate(ship);
  }
  

  //Rotate the Ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle("destroyer-container-vertical");
      submarine.classList.toggle("submarine-container-vertical");
      cruiser.classList.toggle("cruiser-container-vertical");
      battleship.classList.toggle("battleship-container-vertical");
      carrier.classList.toggle("carrier-container-vertical");
      isHorizontal = false;
      return;
    }
    if (!isHorizontal) {
      destroyer.classList.toggle("destroyer-container-vertical");
      submarine.classList.toggle("submarine-container-vertical");
      cruiser.classList.toggle("cruiser-container-vertical");
      battleship.classList.toggle("battleship-container-vertical");
      carrier.classList.toggle("carrier-container-vertical");
      isHorizontal = true;
      return;
    }
  }
  rotateButton.addEventListener("click", rotate);

  // Move around user ship options
  ships.forEach((ship) => ship.addEventListener("dragstart", dragStart));
  
  userSquares.forEach((square) =>
    square.addEventListener("dragstart", dragStart)
  );
  userSquares.forEach((square) =>
    square.addEventListener("dragover", dragOver)
  );
  userSquares.forEach((square) =>
    square.addEventListener("dragenter", dragEnter)
  );
  userSquares.forEach((square) =>
    square.addEventListener("drageleave", dragLeave)
  );
  userSquares.forEach((square) => square.addEventListener("drop", dragDrop));
  userSquares.forEach((square) => square.addEventListener("dragend", dragEnd));

  let selectedShipIndex;
  let draggedShip;
  let draggedShipLength;

  ships.forEach((ship) =>
    ship.addEventListener("mousedown", (e) => {
      selectedShipIndex = e.target.id;
    })
  );

  function dragStart(e) {
    draggedShipNode = this.childNodes.item(e.target);
    draggedShip = this;
    draggedShipLength = this.childNodes.length;
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function dragEnter(e) {
    e.preventDefault();
  }

  function dragLeave() {
    console.log("dragLeave", this);
  }

  function dragDrop() {
    shipId = draggedShip.firstChild.id;
    shipClass = shipId.slice(0, -2);

    for (let offset = 0; offset <= 4; offset++) {
      if (
        draggedShip.childNodes[offset] &&
        selectedShipIndex === draggedShip.childNodes[offset].id
      ) {
        for (let i = 0; i < draggedShipLength; i++) {
          let square
          let directionClass
           
          if (isHorizontal) {
            square = userSquares[parseInt(this.dataset.id) + i - offset]
            directionClass = 'horizontal'
          } else {
            square = userSquares[parseInt(this.dataset.id) + width * i - offset]
            directionClass = 'vertical'
          }

          square.classList.add("taken", shipClass, directionClass);
          if (i === 0) square.classList.add('start')
          if (i === draggedShipLength - 1) square.classList.add('end')
        }
      }
    }

    displayGrid.removeChild(draggedShip);
    checkShipPlacement();
  }

  function dragEnd() {
    console.log("dragEnd", this);
  }

  // check if all ships have been placed
  function checkShipPlacement() {
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true;
  }

  // Game logic Single Player
  function playGameSingle() {
    if (isGameOver) return;
    if (currentPlayer === "user") {
      turnDisplay.innerHTML = "Your Go";
      enemySquares.forEach((square) => {
        square.addEventListener("click", function(e) {
          shotFired = square.dataset.id;
          revealSquare(square.classList);
        });
      });
    }
    if (currentPlayer === "enemy") {
      turnDisplay.innerHTML = "Enemy's Go";
      setTimeout(enemyGo, 1000);
    }
  }

  // Game logic Multi Player
  function playGameMulti(socket) {
    if (isGameOver) return;
    if (!ready) {
      socket.emit('player-ready');
      ready = true;
      playerReady(playerNum);
    }
    if (enemyReady) {
      if (currentPlayer === "user") {
        turnDisplay.innerHTML = "Your Go";
      }
      if (currentPlayer === "enemy") {
        turnDisplay.innerHTML = "Enemy's Go";
      }
    }
  }

  // Notify user of users wins
  let destroyerCount = 0;
  let submarineCount = 0;
  let cruiserCount = 0;
  let battleshipCount = 0;
  let carrierCount = 0;

  function revealSquare(classList) {
    const enemySquare = enemyGrid.querySelector(`div[data-id='${shotFired}']`);
    const obj = Object.values(classList);
    if (!enemySquare.classList.contains("boom") && currentPlayer === "user" && !isGameOver) {
      if ( obj.includes("destroyer") ) {
        destroyerCount++;
      }
      if ( obj.includes("submarine") ) {
        submarineCount++;
      }
      if ( obj.includes("cruiser") ) {
        cruiserCount++;
      }
      if ( obj.includes("battleship") ) {
        battleshipCount++;
      }
      if ( obj.includes("carrier") ) {
        carrierCount++;
      }
      
      if (obj.includes("taken")) {
        enemySquare.classList.add("boom");
      } else {
        enemySquare.classList.add("miss");
      }
      checkForWins();
      currentPlayer = "enemy";
      if (gameMode === 'onePlayer') playGameSingle();
    }
  }

  // Notify user of computers wins
  let enemyDestroyerCount = 0;
  let enemySubmarineCount = 0;
  let enemyCruiserCount = 0;
  let enemyBattleshipCount = 0;
  let enemyCarrierCount = 0;

  function enemyGo(square) {
    if (gameMode === "onePlayer") square = Math.floor(Math.random() * userSquares.length);
    if (!userSquares[square].classList.contains("boom")) {
      userSquares[square].classList.add("boom");
      if (
        userSquares[square].classList.contains("destroyer")
      ) {
        enemyDestroyerCount++;
      }
      if (
        userSquares[square].classList.contains("submarine")
      ) {
        enemySubmarineCount++;
      }
      if (userSquares[square].classList.contains("cruiser")) enemyCruiserCount++;
      if (
        userSquares[square].classList.contains("battleship")
      ) {
        enemyBattleshipCount++;
      }
      if (userSquares[square].classList.contains("carrier")) enemyCarrierCount++;
      checkForWins();
    } else if (gameMode === "onePlayer") enemyGo();
    currentPlayer = "user";
    turnDisplay.innerHTML = "Your Go";
  }

  // Check for wins
  function checkForWins() {
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = "You sunk the enemy's destroyer";
      destroyerCount = 10;
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = "You sunk the enemy's submarine";
      submarineCount = 10;
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = "You sunk the enemy's cruiser";
      cruiserCount = 10;
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = "You sunk the enemy's battleship";
      battleshipCount = 10;
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = "You sunk the enemy's carrier";
      carrierCount = 10;
    }
    if (enemyDestroyerCount === 2) {
      infoDisplay.innerHTML = "Enemy sunk the your destroyer";
      enemyDestroyerCount = 10;
    }
    if (enemySubmarineCount === 3) {
      infoDisplay.innerHTML = "Enemy sunk the your submarine";
      enemySubmarineCount = 10;
    }
    if (enemyCruiserCount === 3) {
      infoDisplay.innerHTML = "Enemy sunk the your cruiser";
      enemyCruiserCount = 10;
    }
    if (enemyBattleshipCount === 4) {
      infoDisplay.innerHTML = "Enemy sunk the your battleship";
      enemyBattleshipCount = 10;
    }
    if (enemyCarrierCount === 5) {
      infoDisplay.innerHTML = "Enemy sunk the your carrier";
      enemyCarrierCount = 10;
    }
    if (
      (destroyerCount + submarineCount + cruiserCount + battleshipCount +
        carrierCount) === 50
    ) {
      infoDisplay.innerHTML = "YOU WIN!";
      isGameOver = true;
    }
    if (
      (enemyDestroyerCount + enemySubmarineCount + enemyCruiserCount +
        enemyBattleshipCount + enemyCarrierCount) === 50
    ) {
      infoDisplay.innerHTML = "ENEMY WINS!";
      isGameOver = true;
    }
  }

  if (gameMode === 'onePlayer') {
    startOnePlayer()
  } else {
    startTwoPlayer()
  }
});

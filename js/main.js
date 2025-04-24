var popSize = 100
var newPopSize;
var moves = 100;
var instrument = 1; // 1 - block, 2 - spawnpoint, 3 - goal
var spawnpoint = [16, 5, 16];
var goal = [0, 0, 0];
var won = false;

var seeBest = false;

var increaseMovesBy = 5;
var evolutionSpeed = 1;

var evolutionStarted = false;

function choose(choices) {
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
}
// Створюємо сцену
const scene = new THREE.Scene();

// Створюємо камеру
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(16, 20, 40);

document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});


// Створюємо рендерер
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
// renderer.setClearColor(0x00ff00);
document.body.appendChild(renderer.domElement);

// Додаємо розсіяне світло (ambient light)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // м’яке біле світло
scene.add(ambientLight);

// Додаємо основне спрямоване світло
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(30, 50, 30); // позиція в сцені
directionalLight.castShadow = true; // якщо потрібні тіні
scene.add(directionalLight);

// Можна додати ще одне світло з іншого боку для кращої видимості
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-30, 20, -30);
scene.add(fillLight);

const world = new World();
world.generate();
scene.add(world);

// Створюємо гравця
const spectator = new Spectator(camera, renderer.domElement, world);
var population;
function setup() {
    // population = new Population(scene, world, 1);
}

// Анімація
function draw() {
    spectator.update();
    if (evolutionStarted) {
        for (var i = 0; i < evolutionSpeed; i++) {
            if (!population.allPlayersDead()) {
                population.update();
            } else {
                if (population.gen%5 == 0) {
                    population.increaseMoves();
                    document.querySelector("#moves").innerHTML = `${population.players[0].brain.directions.length}`;
                }
                population.calculateFitness();
                population.naturalSelection();
                population.mutate();
            };
        }
    }
    
    renderer.render(scene, camera);
}

function keyPressed() {
    if(keyCode == 49) { // 1
        instrument = 1
    }
    if(keyCode == 50) { // 2
        instrument = 2
    }
    if(keyCode == 51) { // 3
        instrument = 3
    }

    if (keyCode == 86) { // V
        seeBest = !seeBest;
    }
    if (keyCode == 84) { // T
        if (spectator.goalMarker) {
            if (evolutionStarted == false) {
                evolutionStarted = true;
                population = new Population(scene, world, popSize);
                world.clearInitialBlocks();
            } else {
                evolutionStarted = false;
                for (var player of population.players) {
                    player.dispose();
                }
                population = null;
                world.restoreInitialBlocks();
                won = false;
                document.querySelector("#won").innerHTML = ""
            }
        } else {
            alert("YOU HAVE TO ADD GOAL FIRST!");
        }
    }
}

document.getElementById('increaseMovesBy').addEventListener('input', function() {
    // increaseMovesBy = parseInt(this.value);
    document.getElementById('increaseMovesByValue').textContent = this.value;
});

// document.getElementById('evolutionSpeed').addEventListener('input', function() {
//     // evolutionSpeed = parseInt(this.value);
//     document.getElementById('evolutionSpeedValue').textContent = this.value;
// });

document.getElementById('popSize').addEventListener('input', function() {
    // popSize = parseInt(this.value);
    document.getElementById('popSizeValue').textContent = this.value;
});

function applySettings() {
    // evolutionSpeed = Number(document.getElementById('evolutionSpeed').value)
    increaseMovesBy = Number(document.getElementById('increaseMovesBy').value)
    if (Number(document.getElementById('popSize').value != popSize)) {
        popSize = Number(document.getElementById('popSize').value);
        if (evolutionStarted) {
            for (var player of population.players) {
                player.dispose();
            }
            population = new Population(scene, world, popSize);
        }
    }
}
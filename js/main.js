
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
document.body.appendChild(renderer.domElement);

// Додаємо базове світло
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

const world = new World();
world.generate();
scene.add(world);

// Створюємо гравця
// const spectator = new Spectator(camera, renderer.domElement, world);
var player;
function setup() {
    player = new Player(scene, world);
    player.attachCamera(camera);
}

// Анімація
function draw() {
    // requestAnimationFrame(animate);
    // spectator.update();
    player.update();
    renderer.render(scene, camera);
}

// animate();
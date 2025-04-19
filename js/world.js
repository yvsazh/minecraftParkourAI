const textureLoader = new THREE.TextureLoader();
const TEXTURE_PATHS = {
  grass: '../assets/grass.webp',
  stone: '../assets/stone.webp'
};

// Load the textures into a lookup object
const textures = {};
Object.entries(TEXTURE_PATHS).forEach(([type, url]) => {
  textures[type] = textureLoader.load(url);
});

class Block extends THREE.Mesh {
  constructor(type = 'grass', size = 1, position = new THREE.Vector3()) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      map: textures[type] || textures.grass
    });
    super(geometry, material);
    this.type = type;
    this.position.copy(position);
  }
}

class World extends THREE.Group {
  constructor(size = 32) {
    super();
    this.size = size;
  }
  generate(typeMap = {}) {
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const key = `${x},${z}`;
        const blockType = typeMap[key] || 'grass'; // or "stone"
        const block = new Block(blockType, 1, new THREE.Vector3(x, 0, z));
        this.add(block);
      }
    }
  }
}

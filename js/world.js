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
    this.meshes = [];
    // Will hold the initially generated blocks for restoration
    this.initialMeshes = [];
  }

  addBlock(blockMesh) {
    this.add(blockMesh);
    this.meshes.push(blockMesh);
  }

  removeBlock(mesh) {
    this.remove(mesh);
    const idx = this.meshes.indexOf(mesh);
    if (idx !== -1) this.meshes.splice(idx, 1);
  }

  save() {
    return this.meshes.map(m => ({
      type: m.userData.type,
      scale: m.userData.scale,
      position: m.position.clone().toArray()
    }));
  }

  load(dataArray) {
    this.meshes.forEach(m => this.remove(m));
    this.meshes = [];

    dataArray.forEach(item => {
      if (item.type === 'block') {
        const block = new Block(item.type, item.scale, new THREE.Vector3(...item.position));
        block.userData = { type: 'block', scale: item.scale };
        this.addBlock(block);
      }
    });

    // Update initialMeshes if needed
    this.initialMeshes = [...this.meshes];
  }

  generate(typeMap = {}) {
    // Remove any existing blocks
    this.meshes.forEach(m => this.remove(m));
    this.meshes = [];

    // Generate new blocks
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const key = `${x},${z}`;
        const blockType = typeMap[key] || 'grass';
        const block = new Block(blockType, 1, new THREE.Vector3(x, 0, z));
        block.userData = { type: 'block', scale: 1 };
        this.addBlock(block);
      }
    }

    // Save the initial generation for later restoration
    this.initialMeshes = [...this.meshes];
  }

  /**
   * Удаляє всі початкові згенеровані блоки з сцени
   */
  clearInitialBlocks() {
    this.initialMeshes.forEach(mesh => {
      this.removeBlock(mesh);
    });
  }

  /**
   * Повертає всі початкові згенеровані блоки на сцену
   */
  restoreInitialBlocks() {
    this.initialMeshes.forEach(mesh => {
      this.addBlock(mesh);
    });
  }
}

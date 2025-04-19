class Player {
  constructor(scene, world) {
    // ————— ваші вихідні поля —————
    this.fitness = 0;
    this.vision = [];
    this.decision = [];
    this.unadjustedFitness;
    this.lifespan = 0;
    this.bestScore = 0;
    this.dead = false;
    this.score = 0;
    this.gen = 0;

    this.genomeInputs = 5;
    this.genomeOutputs = 2;
    this.brain = new Genome(this.genomeInputs, this.genomeOutputs);

    // ————— нові для фізики —————
    this.scene = scene;
    this.world = world;

    this.speed       = 5;    // блоків/с
    this.jumpSpeed   = 10;
    this.gravity     = -30;
    this.velocity    = new THREE.Vector3();
    this.onGround    = false;

    this.moveState = { forward:false, backward:false, left:false, right:false, jump:false };
    this.clock     = new THREE.Clock();

    // створюємо базовий «бігунок» (потім замінимо на Стіва)
    const geom = new THREE.BoxGeometry(1, 2, 1);
    const mat  = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.set(0, 5, 0);
    scene.add(this.mesh);

    this.yaw = 0;    // горизонтальне обертання (вліво-вправо)
    this.pitch = 0;  // вертикальне обертання (вгору-вниз)
  
    this.camera = null; // ← камера прикріпиться тут

    this.initControls();
  }

  attachCamera(camera) {
    this.camera = camera;
    this.mesh.add(camera);
    camera.position.set(0, 1.5, 0); // висота "очей" над підлогою гравця
  }

  initControls() {
    window.addEventListener('click', () => {
      if (document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
      }
    });
  
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === document.body) {
        const sensitivity = 0.002;
        this.yaw   -= e.movementX * sensitivity;
        this.pitch -= e.movementY * sensitivity;
  
        // обмежуємо кут підйому/нахилу
        const limit = Math.PI / 2 - 0.1;
        this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
      }
    });
  
    // клавіші як було
    window.addEventListener('keydown', e => {
      switch (e.code) {
        case 'KeyW': this.moveState.forward  = true; break;
        case 'KeyS': this.moveState.backward = true; break;
        case 'KeyA': this.moveState.left     = true; break;
        case 'KeyD': this.moveState.right    = true; break;
        case 'Space': this.moveState.jump    = true; break;
      }
    });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW': this.moveState.forward  = false; break;
        case 'KeyS': this.moveState.backward = false; break;
        case 'KeyA': this.moveState.left     = false; break;
        case 'KeyD': this.moveState.right    = false; break;
        case 'Space': this.moveState.jump    = false; break;
      }
    });
  }
  

  show() {
    this.mesh.visible = true;
  }

  move(delta) {
    const dir = new THREE.Vector3();
    if (this.moveState.forward)  dir.z -= 1;
    if (this.moveState.backward) dir.z += 1;
    if (this.moveState.left)     dir.x -= 1;
    if (this.moveState.right)    dir.x += 1;
    dir.normalize();
  
    // Повертаємо за напрямком гравця
    const moveDirection = dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    moveDirection.multiplyScalar(this.speed * delta);
  
    this.mesh.position.add(moveDirection);
  }
  

  update() {
    const delta = this.clock.getDelta();
  
    // 1) Поворот гравця
    this.mesh.rotation.y = this.yaw;
  
    // 2) Поворот камери по вертикалі
    if (this.camera) {
      this.camera.rotation.x = this.pitch;
    }
  
    // 3) Рух, гравітація, колізії
    this.move(delta);
  
    if (this.moveState.jump && this.onGround) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }
  
    this.velocity.y += this.gravity * delta;
    this.mesh.position.y += this.velocity.y * delta;
  
    // колізії
    const px = Math.floor(this.mesh.position.x + 0.5);
    const pz = Math.floor(this.mesh.position.z + 0.5);
    let blockBelow = null;
    for (let block of this.world.children) {
      if (block.position.x === px && block.position.z === pz) {
        blockBelow = block;
        break;
      }
    }
  
    if (blockBelow) {
      const blockTopY = blockBelow.position.y + 0.5;
      const halfH = 1;
      const feetY = this.mesh.position.y - halfH;
      if (feetY <= blockTopY) {
        this.mesh.position.y = blockTopY + halfH;
        this.velocity.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }
  
    this.lifespan += delta;
  }
  

  look() { /* без змін */ }

  think() {
    var max = 0, maxIndex = 0;
    this.decision = this.brain.feedForward(this.vision);
    for (let i = 0; i < this.decision.length; i++) {
      if (this.decision[i] > max) {
        max = this.decision[i];
        maxIndex = i;
      }
    }
    // тут буде конвертація maxIndex→дії
  }

  clone() {
    const clone = new Player(this.scene, this.world);
    clone.brain = this.brain.clone();
    clone.fitness = this.fitness;
    clone.brain.generateNetwork();
    clone.gen = this.gen;
    clone.bestScore = this.score;
    return clone;
  }

  cloneForReplay() {
    const clone = new Player(this.scene, this.world);
    clone.brain = this.brain.clone();
    clone.fitness = this.fitness;
    clone.brain.generateNetwork();
    clone.gen = this.gen;
    clone.bestScore = this.score;
    return clone;
  }

  calculateFitness() {
    this.fitness = random(10);
  }

  crossover(parent2) {
    const child = new Player(this.scene, this.world);
    child.brain = this.brain.crossover(parent2.brain);
    child.brain.generateNetwork();
    return child;
  }
}

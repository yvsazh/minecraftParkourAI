
  class Player {
    constructor(scene, world) {
        // ————— ваші вихідні поля —————
        this.speed = 5;
        this.jumpSpeed = 10;
        this.gravity = -30;

        this.position = 1;
        this.dead = false;
        this.isPlayer = false;
        this.best = false;
        this.fitness = 0;
        this.lifeTime = 0;
        this.score = 0;
        this.deadOnStep = 0;

        this.brain = new Brain(moves);

        // ————— нові для фізики —————
        this.scene = scene;
        this.world = world;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;

        this.moveState = { forward:false, backward:false, left:false, right:false, jump:false };
        this.clock = new THREE.Clock();

        // створюємо базовий «бігунок» (потім замінимо на Стіва)
        const geom = new THREE.BoxGeometry(1, 2, 1);
        const mat  = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geom, mat);
        this.mesh.position.set(16, 2, 16);
        scene.add(this.mesh);

        // Bounding boxes
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);

        this.yaw = 0;    // горизонтальне обертання (вліво-вправо)
        this.pitch = 0;  // вертикальне обертання (вгору-вниз)
        this.camera = null;

        // не ініціалізуємо контролі тут, щоб можна було окремо викликати
        // this.initControls();
    }

    attachCamera(camera) {
        this.camera = camera;
        this.mesh.add(camera);
        camera.position.set(0, 1.5, 0);
    }

    initControls() {
        window.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
            }
        });
        window.addEventListener('mousemove', e => {
            if (document.pointerLockElement === document.body) {
                const sensitivity = 0.002;
                this.yaw   -= e.movementX * sensitivity;
                this.pitch -= e.movementY * sensitivity;
                const limit = Math.PI / 2 - 0.1;
                this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
            }
        });
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

    updateBoundingBox() {
        this.boundingBox.setFromObject(this.mesh);
    }

    checkCollision() {
        for (let block of this.world.children) {
            if (!block.boundingBox) {
                block.boundingBox = new THREE.Box3().setFromObject(block);
            }
            if (this.boundingBox.intersectsBox(block.boundingBox)) {
                return true;
            }
        }
        return false;
    }

    move(delta) {
        const dir = new THREE.Vector3();
        if (this.moveState.forward)  dir.z -= 1;
        if (this.moveState.backward) dir.z += 1;
        if (this.moveState.left)     dir.x -= 1;
        if (this.moveState.right)    dir.x += 1;
        dir.normalize();
        return dir.applyAxisAngle(new THREE.Vector3(0,1,0), this.yaw).multiplyScalar(this.speed * delta);
    }

    think(delta) {
        const dir = new THREE.Vector3();
        if(this.best) {
            push();
            stroke(0, 255, 0);
            noFill();
            rectMode(CENTER);
            rect(this.sprite.x, this.sprite.y, this.sprite.width+10, this.sprite.height+10);
            pop();
        }
        this.lifeTime++;
        if (this.brain.directions.length > this.brain.step) {
            var direction = this.brain.directions[this.brain.step];
            if (direction == 1) {
                dir.z -= 1
            }
            if (direction == 2) {
                dir.z += 1;
            }
            if (direction == 3) {
                dir.x -= 1;
            }
            if (direction == 4) {
                dir.x += 1;
            }
            if (direction == 5) {
                this.moveState.jump    = true;
            }
            this.brain.step++;
        } else {
            this.dead = true;
            console.log("all good");
        }
        dir.normalize();
    
        // Повертаємо за напрямком гравця
        const moveDirection = dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        moveDirection.multiplyScalar(this.speed * delta);
      
        this.mesh.position.add(moveDirection);
    }

    update() {
        const delta = this.clock.getDelta();

        // повороти
        this.mesh.rotation.y = this.yaw;
        if (this.camera) this.camera.rotation.x = this.pitch;

        // кроки по осях
        const moveStep = this.move(delta);
        const oldPos = this.mesh.position.clone();

        // X
        this.mesh.position.x += moveStep.x;
        this.updateBoundingBox();
        if (this.checkCollision()) this.mesh.position.x = oldPos.x;

        // Z
        this.mesh.position.z += moveStep.z;
        this.updateBoundingBox();
        if (this.checkCollision()) this.mesh.position.z = oldPos.z;

        // вертикаль
        if (this.moveState.jump && this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
        }
        this.velocity.y += this.gravity * delta;
        this.mesh.position.y += this.velocity.y * delta;
        this.updateBoundingBox();
        if (this.checkCollision()) {
            this.mesh.position.y = oldPos.y;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // логіка мозку
        this.think(delta);
    }

    show() {
        this.mesh.visible = true;
    }

    calculateFitness() {
        this.fitness = random(10);
    }

    giveBaby(partner) {
        const child = new Player(this.scene, this.world);
        child.brain = this.brain.crossover(partner.brain);
        return child;
    }

    copy() {
        const baby = new Player(this.scene, this.world);
        baby.brain = this.brain.clone();
        baby.deadBySpider = this.deadBySpider;
        return baby;
    }
}

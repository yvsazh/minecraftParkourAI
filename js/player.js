class Player {
    constructor(scene, world) {
        this.speed = 5;
        this.jumpSpeed = 10;
        this.gravity = -30;
        this.turnSpeed = Math.PI * 1.5;

        this.position = 1;
        this.dead = false;
        this.isPlayer = false;
        this.best = false;
        this.fitness = 0;
        this.lifeTime = 0;
        this.score = 0;
        this.deadOnStep = 0;
        this.fall = false;
        this.won = false;

        this.brain = new Brain(moves);

        this.scene = scene;
        this.world = world;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;

        this.moveState = { forward: false, backward: false, jump: false };
        this.clock = new THREE.Clock();

        this.yaw = 0;
        this.pitch = 0;
        this.targetYaw = 0;
        this.camera = null;

        // Hitbox toggle
        this.showHitbox = false;
        this.hitboxHelper = null;
        window.addEventListener('keydown', this._onKeyDown.bind(this));

        this.mesh = null;
        this.boundingBox = new THREE.Box3();
        this.modelLoaded = false;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;

        this.ANIMATION_NAMES = {
            RUN: 'animation.steve.walk',
            DEATH: 'animation.steve.idle',
            IDLE: null
        };

        this._loadModel();
        if (this.isPlayer) this.initControls();
    }

    _loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load(
            "../minecraftParkourAI/assets/steve (1).glb",
            (gltf) => {
                this.mesh = gltf.scene;
                this.scene.add(this.mesh);
                this.mesh.position.set(spawnpoint[0], spawnpoint[1], spawnpoint[2]);
                this.mesh.rotation.y = this.yaw;

                // Compute initial bounding box
                this.updateBoundingBox();

                this.mixer = new THREE.AnimationMixer(this.mesh);
                const clips = gltf.animations;
                let runAction = null;
                clips.forEach(clip => {
                    const action = this.mixer.clipAction(clip);
                    this.animations[clip.name] = action;
                    if (clip.name === this.ANIMATION_NAMES.RUN) {
                        action.loop = THREE.LoopRepeat;
                        runAction = action;
                    } else if (clip.name === this.ANIMATION_NAMES.DEATH) {
                        action.loop = THREE.LoopOnce;
                        action.clampWhenFinished = true;
                    } else {
                        action.loop = THREE.LoopRepeat;
                    }
                });
                if (runAction) { runAction.play(); this.currentAction = runAction; }

                this.modelLoaded = true;
                if (this.camera) this._attachCameraInternal();
            },
            undefined,
            (error) => console.error("Error loading model:", error)
        );
    }

    _attachCameraInternal() {
        this.camera.position.set(0, 1.6, 0);
        this.camera.rotation.set(0, 0, 0);
        this.mesh.add(this.camera);
    }

    attachCamera(camera) {
        this.camera = camera;
        if (this.modelLoaded) this._attachCameraInternal();
    }

    _onKeyDown(e) {
        if (e.code === 'KeyG') {
            this.showHitbox = !this.showHitbox;
            if (!this.showHitbox && this.hitboxHelper) {
                this.scene.remove(this.hitboxHelper);
                this.hitboxHelper = null;
            }
        }
    }

    initControls() {
        if (!this.isPlayer) return;
        const onMouseMove = (e) => {
            if (document.pointerLockElement === document.body) {
                const sensitivity = 0.002;
                this.yaw -= e.movementX * sensitivity;
                this.pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, this.pitch - e.movementY * sensitivity));
                this.targetYaw = this.yaw;
            }
        };
        const onKD = (e) => {
            switch(e.code) {
                case 'KeyW': case 'ArrowUp': this.moveState.forward = true; break;
                case 'KeyS': case 'ArrowDown': this.moveState.backward = true; break;
                case 'KeyA': case 'ArrowLeft': this.targetYaw += Math.PI*0.1; break;
                case 'KeyD': case 'ArrowRight': this.targetYaw -= Math.PI*0.1; break;
                case 'Space': this.moveState.jump = true; break;
            }
        };
        const onKU = (e) => {
            if (['KeyW','ArrowUp'].includes(e.code)) this.moveState.forward = false;
            if (['KeyS','ArrowDown'].includes(e.code)) this.moveState.backward = false;
            if (e.code === 'Space') this.moveState.jump = false;
        };
        document.addEventListener('pointerlockchange', ()=>{}, false);
        window.addEventListener('click', ()=>{ if (document.pointerLockElement !== document.body) document.body.requestPointerLock(); });
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('keydown', onKD);
        window.addEventListener('keyup', onKU);
    }

    updateBoundingBox() {
        this.mesh.updateMatrixWorld(true);
        this.boundingBox.setFromObject(this.mesh, true);
    }

    checkCollision() {
        if (!this.boundingBox || !this.world?.children) return false;
        for (const block of this.world.children) {
            if (!block.visible || block === this.mesh) continue;
            if (!block.boundingBox) {
                block.geometry.computeBoundingBox();
                block.boundingBox = block.geometry.boundingBox.clone().applyMatrix4(block.matrixWorld);
            } else if (!this.world.isStatic) {
                block.boundingBox.copy(block.geometry.boundingBox).applyMatrix4(block.matrixWorld);
            }
            if (this.boundingBox.intersectsBox(block.boundingBox)) return true;
        }
        return false;
    }

    _normalizeAngle(a) { while(a <= -Math.PI) a += 2*Math.PI; while(a > Math.PI) a -= 2*Math.PI; return a; }
    _shortestAngleDifference(a1, a2) { return this._normalizeAngle(this._normalizeAngle(a1) - this._normalizeAngle(a2)); }

    _transitionToAnimation(name, dur = 0.2) {
        const newA = this.animations[name], oldA = this.currentAction;
        if (!newA) return console.warn(`No animation: ${name}`);
        if (oldA === newA) {
            if (!newA.isRunning() || newA.getEffectiveWeight() < 1) newA.reset().setEffectiveWeight(1).fadeIn(dur).play();
            return;
        }
        oldA?.fadeOut(dur);
        newA.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(dur).play();
        this.currentAction = newA;
    }

    _calculateMoveDirection() {
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const dir = new THREE.Vector3();
        if (this.moveState.forward) dir.add(forward);
        if (this.moveState.backward) dir.sub(forward);
        return dir.normalize();
    }

    think() {
        if (this.dead || this.isPlayer) return;
        this.moveState = { forward: false, backward: false, jump: false };
        this.lifeTime++;
        if (this.brain.directions.length > this.brain.step) {
            const dir = this.brain.directions[this.brain.step++];
            switch (dir) {
                case 1: this.moveState.forward = true; break;
                case 2: this.moveState.backward = true; break;
                case 3: this.targetYaw = this._normalizeAngle(this.yaw + Math.PI/2); this.moveState.forward = true; break;
                case 4: this.targetYaw = this._normalizeAngle(this.yaw - Math.PI/2); this.moveState.forward = true; break;
                case 5: this.moveState.jump = true; break;
                default: this.targetYaw = this.yaw;
            }
        } else {
            this.dead = true; this.deadOnStep = this.brain.step; this.targetYaw = this.yaw;
        }
    }

    update() {
        if (!this.modelLoaded || !this.mesh) return;
        const delta = this.clock.getDelta() * evolutionSpeed;
        
        this.mixer?.update(delta);

        if (this.dead) {
            this._transitionToAnimation(this.ANIMATION_NAMES.DEATH, 0.1);
            return;
        }

        if (!this.isPlayer) this.think();
        if (!this.isPlayer) {
            const diff = this._shortestAngleDifference(this.targetYaw, this.yaw);
            this.yaw = this._normalizeAngle(this.yaw + diff * this.turnSpeed * delta);
        }
        this.mesh.rotation.y = this.yaw;
        if (this.camera) this.camera.rotation.x = this.isPlayer ? this.pitch : 0;

        // Movement X/Z
        const moveStep = this._calculateMoveDirection().multiplyScalar(this.speed * delta);
        const oldPos = this.mesh.position.clone();
        this.mesh.position.x += moveStep.x; this.updateBoundingBox(); if (this.checkCollision()) this.mesh.position.x = oldPos.x;
        this.mesh.position.z += moveStep.z; this.updateBoundingBox(); if (this.checkCollision()) this.mesh.position.z = oldPos.z;

        // Jump & gravity
        if (this.moveState.jump && this.onGround) { this.velocity.y = this.jumpSpeed; this.onGround = false; }
        this.velocity.y += this.gravity * delta;
        this.mesh.position.y += this.velocity.y * delta;
        this.updateBoundingBox();
        if (this.checkCollision()) {
            const falling = this.velocity.y <= 0;
            this.mesh.position.y = oldPos.y;
            this.velocity.y = 0;
            if (falling) this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Death plane
        if (this.boundingBox.min.y <= 0) { this.dead = true; this.deadOnStep = this.brain.step; this.fall = true; this.mesh.visible = false; }
        if (!this.dead) this.score = this.lifeTime;

        // Update hitbox helper by recreating if visible
        if (this.showHitbox) {
            if (this.hitboxHelper) this.scene.remove(this.hitboxHelper);
            this.updateBoundingBox();
            this.hitboxHelper = new THREE.Box3Helper(this.boundingBox, 0xff0000);
            this.scene.add(this.hitboxHelper);
        }
        const footPosition = new THREE.Vector3(
            this.mesh.position.x,
            this.boundingBox.min.y, // <<< нижня межа хитбоксу
            this.mesh.position.z
        );
        const dx = footPosition.x - goal[0];
        const dy = footPosition.y - goal[1];
        const dz = footPosition.z - goal[2];
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 1) {
            if (!won) {
                document.querySelector("#won").innerHTML = `AI WON IN ${population.gen} GENERATIONS`;
                won = true;
                this.won = true;
            }
        }
    }
    dispose() {
        // 1) Видаляємо модель із сцени
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    
        // 2) Зупиняємо анімації
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mesh);
            this.mixer = null;
        }
    
        // 3) Видаляємо хитбокс, якщо він існує
        if (this.hitboxHelper) {
            this.scene.remove(this.hitboxHelper);
            this.hitboxHelper.geometry.dispose();
            this.hitboxHelper.material.dispose();
            this.hitboxHelper = null;
        }
    
        // 4) Вивільняємо геометрію та матеріали всіх дочірніх Mesh-об’єктів
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    // Геометрія
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    // Матеріал (може бути масивом)
                    if (child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(mat => {
                            // Текстури в матеріалі
                            for (const key in mat) {
                                const value = mat[key];
                                if (value && value.isTexture) {
                                    value.dispose();
                                }
                            }
                            mat.dispose();
                        });
                    }
                }
            });
            this.boundingBox = null;
            this.mesh = null;
            this.modelMesh = null;
        }
    }
    
    show() {}
    calculateFitness() {
        if (!this.mesh || !this.boundingBox) { // Added check for mesh existence
            // If the mesh doesn't exist (e.g., loading failed or disposed prematurely),
            // assign a very low fitness.
            this.fitness = 0.00001;
            return;
        }

        // Get the position from the mesh itself, ensure bounding box is updated first
        this.updateBoundingBox(); // Ensure bounding box is current before using its min.y
        const currentPosition = this.mesh.position;

        // Use the bottom of the bounding box as the reference point, or just mesh position
        // Using the bottom (feet) makes sense for ground-based goals.
        const referencePosition = new THREE.Vector3(
            currentPosition.x,
            this.boundingBox.min.y, // Use the bottom of the bounding box
            currentPosition.z
        );

        // Calculate distance to the goal
        const dx = referencePosition.x - goal[0];
        const dy = referencePosition.y - goal[1]; // Consider if Y distance matters for your goal
        const dz = referencePosition.z - goal[2];

        // Using squared distance can sometimes be faster (avoids sqrt) and emphasizes closer distances
        // const distanceSq = dx * dx + dy * dy + dz * dz;
        // let distance = Math.sqrt(distanceSq);

        // Stick with regular distance for clarity unless performance is critical
        let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // --- FITNESS CALCULATION ---
        // Invert the distance: Smaller distance -> Higher fitness
        // Add a small epsilon to prevent division by zero and handle distance=0 case
        this.fitness = 1 / (distance + 0.001); // Key change: Inverse relationship

        // --- REWARDS ---
        // Reward significantly for getting very close or reaching the goal
        if (distance < 1.0) { // Use a slightly larger radius maybe?
             // Make this a substantial boost
            this.fitness *= 5; // Example boost factor

            // If the 'won' flag logic is separate and reliable:
             if (!won) {
                // This logic seems more suited for the update loop or a global check,
                // but we ensure the 'won' player gets high fitness here.
                document.querySelector("#won").innerHTML = `AI WON IN ${population.gen} GENERATIONS`;
                won = true; // Be careful with global flags like this in OOP
                this.won = true; // Mark this specific player as having won this round
             }
        }

        // Further reward if the player is marked as having won
        // This helps maintain the winning solution via elitism
        if (this.won) {
             // Ensure the winning state gives a very high fitness
            this.fitness *= 10; // Example boost factor (cumulative with the distance<1 boost)
        }

        // --- PENALTIES (Optional but potentially useful) ---
        // Penalize for falling off (if this is undesirable behavior)
        // Uncomment if falling should be discouraged
        if (this.fall) {
            this.fitness *= 0.2; // Reduce fitness by half for falling
        }

        // Penalize for dying without reaching the goal (e.g., running out of moves)
        // Could add a small penalty if `this.dead && !this.won`
        // if (this.dead && !this.won) {
        //    this.fitness *= 0.8; // Slight penalty for dying prematurely
        // }


        // Ensure fitness is not NaN or Infinity, and apply a minimum floor if needed
        if (isNaN(this.fitness) || !isFinite(this.fitness) || this.fitness <= 0) {
             this.fitness = 0.00001; // Assign a tiny fitness value in case of issues
        }

         // Optional: Square the fitness to further emphasize better solutions
         this.fitness = this.fitness * this.fitness;
    }
    giveBaby(p) { const c = new Player(this.scene, this.world); c.brain = this.brain.crossover(p.brain); c.brain.mutate(); return c; }
    copy() { const b = new Player(this.scene, this.world); b.brain = this.brain.clone(); return b; }
    reset() {
        this.dead = false; this.lifeTime = 0; this.score = 0; this.fitness = 0; this.deadOnStep = 0; this.brain.step = 0;
        this.velocity.set(0, 0, 0); this.onGround = false;
        this.mesh.position.set(16, 5, 16);
        this.yaw = this.pitch = this.targetYaw = 0;
        this.mesh.rotation.set(0, this.yaw, 0);
        this.moveState = { forward: false, backward: false, jump: false };
        if (this.mixer) { this.mixer.stopAllAction(); const r = this.animations[this.ANIMATION_NAMES.RUN]; if (r) { r.reset().play(); this.currentAction = r; } }
        this.clock.getDelta();
    }
}

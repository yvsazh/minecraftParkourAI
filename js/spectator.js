class Spectator {
    constructor(camera, domElement, world) {
      this.camera = camera;
      this.domElement = domElement;
      this.world = world;             // Посилання на об’єкт World
      this.moveState = {
        forward: false, backward: false,
        left: false,    right: false,
        up: false,      down: false
      };
      this.moveSpeed = 0.2;
      this.rotationSpeed = 0.002;
      this.isRotating = false;
      this.mouse = { x: 0, y: 0 };    // Нормалізовані координати для Raycaster
      this.prevMouse = { x: 0, y: 0 }; // Попередні клікабельні координати для обертання
      this.raycaster = new THREE.Raycaster();
      this.highlighted = null;        // { object, origEmissive, intersect }
  
      this.initControls();
    }
  
    initControls() {
      // Клавіатура
      window.addEventListener('keydown',  e => this.onKeyDown(e));
      window.addEventListener('keyup',    e => this.onKeyUp(e));
      window.addEventListener('wheel',    e => this.onMouseWheel(e));
      window.addEventListener('resize',  () => this.onWindowResize());
  
      // Миша
      this.domElement.addEventListener('mousedown', e => this.onMouseDown(e));
      this.domElement.addEventListener('mouseup',   e => this.onMouseUp(e));
      this.domElement.addEventListener('mousemove', e => this.onMouseMove(e));
    }
  
    onKeyDown(event) {
      switch (event.code) {
        case 'KeyW': this.moveState.forward  = true; break;
        case 'KeyS': this.moveState.backward = true; break;
        case 'KeyA': this.moveState.left     = true; break;
        case 'KeyD': this.moveState.right    = true; break;
        case 'Space': this.moveState.up      = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.moveState.down = true; break;
      }
    }
  
    onKeyUp(event) {
      switch (event.code) {
        case 'KeyW': this.moveState.forward  = false; break;
        case 'KeyS': this.moveState.backward = false; break;
        case 'KeyA': this.moveState.left     = false; break;
        case 'KeyD': this.moveState.right    = false; break;
        case 'Space': this.moveState.up      = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.moveState.down = false; break;
      }
    }
  
    onMouseWheel(event) {
      this.camera.fov = THREE.MathUtils.clamp(
        this.camera.fov + event.deltaY * 0.05,
        30, 100
      );
      this.camera.updateProjectionMatrix();
    }
  
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  
    onMouseDown(event) {
      // Початок обертання правою кнопкою
      if (event.button === 2) {
        this.isRotating = true;
        this.prevMouse.x = event.clientX;
        this.prevMouse.y = event.clientY;
      }
      // Додавання блоку лівою кнопкою
      else if (event.button === 0) {
        if (this.highlighted) {
          const hit = this.highlighted.intersect;
          const normal = hit.face.normal.clone()
            .applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
          const pos = hit.object.position.clone().add(normal);
          const newBlock = new Block('stone', 1, pos);
          this.world.add(newBlock);
        }
      }
      // Видалення блоку середньою кнопкою
      else if (event.button === 1) {
        if (this.highlighted) {
          const obj = this.highlighted.object;
          this.world.remove(obj);
          obj.geometry.dispose();
          obj.material.dispose();
          this.highlighted = null;
        }
      }
    }
  
    onMouseUp(event) {
      if (event.button === 2) {
        this.isRotating = false;
      }
    }
  
    onMouseMove(event) {
      // Обчислюємо нормалізовані координати для Raycaster
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
      // Якщо зараз обертаємо камеру — оновлюємо оберт
      if (this.isRotating) {
        const dx = event.clientX - this.prevMouse.x;
        const dy = event.clientY - this.prevMouse.y;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y -= dx * this.rotationSpeed;
        this.camera.rotation.x -= dy * this.rotationSpeed;
        this.camera.rotation.x = THREE.MathUtils.clamp(
          this.camera.rotation.x,
          -Math.PI / 2,
          Math.PI / 2
        );
        this.prevMouse.x = event.clientX;
        this.prevMouse.y = event.clientY;
        return;
      }
  
      // Raycast по всіх блоках у світі
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.world.children);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const obj = intersect.object;
        // Якщо це новий об’єкт — знімаємо підсвітку з попереднього
        if (!this.highlighted || this.highlighted.object !== obj) {
          if (this.highlighted) {
            this.highlighted.object.material.emissive.setHex(this.highlighted.origEmissive);
          }
          const orig = obj.material.emissive.getHex();
          obj.material.emissive.setHex(0x444444);
          this.highlighted = { object: obj, origEmissive: orig, intersect };
        } else {
          // Оновлюємо дані про точку перетину (нормаль)
          this.highlighted.intersect = intersect;
        }
      } else if (this.highlighted) {
        // Знімаємо підсвітку, якщо нічого не під курсором
        this.highlighted.object.material.emissive.setHex(this.highlighted.origEmissive);
        this.highlighted = null;
      }
    }
  
    update() {
      const dir = new THREE.Vector3();
      if (this.moveState.forward)  dir.z -= this.moveSpeed;
      if (this.moveState.backward) dir.z += this.moveSpeed;
      if (this.moveState.left)     dir.x -= this.moveSpeed;
      if (this.moveState.right)    dir.x += this.moveSpeed;
      if (this.moveState.up)       dir.y += this.moveSpeed;
      if (this.moveState.down)     dir.y -= this.moveSpeed;
  
      dir.applyEuler(this.camera.rotation);
      this.camera.position.add(dir);
    }
  }
  
// index.html debe cargar este archivo con <script type="module" src="World.js"></script>

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/controls/OrbitControls.js';

export class World {
    constructor() {
        this._Initialize();
        this._LoadAnimatedModel();
    }

    _Initialize() {
        this._mixers = [];
        this._clock = new THREE.Clock();

        // Renderer con gamma y tonemapping, PERO exposición normal
        this._threejs = new THREE.WebGLRenderer({ antialias: true });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.toneMapping = THREE.ACESFilmicToneMapping;
        this._threejs.toneMappingExposure = 1.0; // exposición normal para no oscurecer el cielo
        this._threejs.physicallyCorrectLights = true;

        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this._threejs.domElement);

        // Cámara
        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 20, 0);

        // Escena
        this._scene = new THREE.Scene();

        // 4) Añade la única luz de luna aquí, controlada y suave
        const moonLight = new THREE.DirectionalLight(0x88aaff, 5.6);
        moonLight.position.set(50, 150, -50);
        moonLight.castShadow = true;
        moonLight.shadow.bias = -0.001;
        moonLight.shadow.mapSize.set(2048, 2048);
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 500.0;
        moonLight.shadow.camera.left = -100;
        moonLight.shadow.camera.right = 100;
        moonLight.shadow.camera.top = 100;
        moonLight.shadow.camera.bottom = -100;
        this._scene.add(moonLight);

        // Controles
        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 20, 0);
        controls.update();

        // Cielo
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            'js/resources/sky/vz_sinister_right.png',
            'js/resources/sky/vz_sinister_left.png',
            'js/resources/sky/vz_sinister_up.png',
            'js/resources/sky/vz_sinister_down.png',
            'js/resources/sky/vz_sinister_front.png',
            'js/resources/sky/vz_sinister_back.png',
        ]);
        texture.encoding = THREE.sRGBEncoding;
        this._scene.background = texture;

        // Suelo blanco
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                roughness: 1.0, // mate para que no queme
                metalness: 0.0
            })
        );
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        window.addEventListener('resize', () => this._OnWindowResize(), false);

        this._RAF();
    }

    _LoadAnimatedModel() {
        const loader = new FBXLoader();
        loader.setPath('js/resources/character/');
        loader.load('character_rigged.fbx', (fbx) => {
            fbx.scale.setScalar(0.3);
            fbx.traverse(c => {
                c.castShadow = true;
            });
            // 1) Eliminar luces internas del FBX
            const toRemove = [];
            fbx.traverse((o) => {
                if (o.isLight) toRemove.push(o);
            });
            for (const l of toRemove) {
                if (l.parent) l.parent.remove(l);
            }

            // 3) Animación
            const animLoader = new FBXLoader();
            animLoader.setPath('js/resources/character/');
            animLoader.load('Walking.fbx', (anim) => {
                const mixer = new THREE.AnimationMixer(fbx);
                this._mixers.push(mixer);
                const action = mixer.clipAction(anim.animations[0]);
                action.play();
            });

            this._scene.add(fbx);
        });
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame(() => this._RAF());

        const dt = this._clock.getDelta();
        for (const m of this._mixers) m.update(dt);

        this._threejs.render(this._scene, this._camera);
    }
}

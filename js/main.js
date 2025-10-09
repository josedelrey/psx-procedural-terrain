// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;

// Reloj para delta time
var clock;

// Referencias a nodos del brazo para los controles
var robot, base, brazo, antebrazo, mano, pinzas, pinza1, pinza2;

// Controles
var controls = {
    giroBase: 0,
    giroBrazo: 0,
    giroAntebrazoY: 0,
    giroAntebrazoZ: 0,
    giroPinza: 0,
    separacionPinza: 10,   // misma escala de interfaz
    alambre: false,        // wireframe on/off
    animar: startAnimation // botón en la GUI
};

// Teclado y movimiento
var teclas = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const VEL = 5.0;            // unidades por segundo
const LIMITE_PLANO = 24.0;  // media del tamaño del plano

// Estado de animación por keyframes
var isAnimating = false;
var kfIndex = 0;     // índice de segmento actual
var segTime = 0;     // tiempo consumido en el segmento actual

// Keyframes: [baseY, brazoZ, anteY, anteZ, muñecaZ, sepPinzaGUI]
var keyframes = [
    [0, 0, 0, 0, 0, 10],
    [-20, -25, -80, -40, 70, 15],
    [90, -20, -30, -25, 110, 7],
    [140, -35, -100, -35, 150, 10],
    [-150, -18, 95, -30, 40, 5],
    [0, -45, 17, 54, 148, 12],
    [15, 25, 30, 0, 0, 8],
    [0, 0, 0, 0, 0, 10]
];
// Duraciones por segmento (en segundos). Debe tener length = keyframes.length - 1
var keyTimes = [1.0, 1.0, 0.8, 1.3, 1.0, 1.0, 1.0];

// Llamada a las funciones principales
init();
loadScene();

// GUI
var gui = new dat.GUI();
var guiControlRobot = gui.addFolder('Controles Robot');
guiControlRobot.add(controls, 'giroBase', -180, 180).name("Giro Base");
guiControlRobot.add(controls, 'giroBrazo', -45, 45).name("Giro Brazo");
guiControlRobot.add(controls, 'giroAntebrazoY', -180, 180).name("Giro Antebrazo Y");
guiControlRobot.add(controls, 'giroAntebrazoZ', -90, 90).name("Giro Antebrazo Z");
guiControlRobot.add(controls, 'giroPinza', -40, 220).name("Giro Pinza");
guiControlRobot.add(controls, 'separacionPinza', 0, 15).step(1).name("Apertura Pinza");
guiControlRobot.add(controls, 'alambre').name('Alambre').onChange(setWireframe);
guiControlRobot.add(controls, 'animar').name('Animar');

render();

function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0xFFFFFF));
    document.getElementById('container').appendChild(renderer.domElement);

    scene = new THREE.Scene();

    var aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 100);
    camera.position.set(1, 1.5, 2);

    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);

    clock = new THREE.Clock();

    // Teclado
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });

    window.addEventListener('resize', updateAspectRatio);
}

function loadScene() {
    // Ejes
    let axes = new THREE.AxesHelper(20);
    scene.add(axes);

    // Raíz del robot
    robot = new THREE.Object3D();
    scene.add(robot);

    // Base
    let material_base = new THREE.MeshNormalMaterial();
    let geometria_base = new THREE.CylinderGeometry(5, 5, 1.5, 32);
    base = new THREE.Mesh(geometria_base, material_base);
    robot.add(base);

    // Brazo
    brazo = new THREE.Object3D();
    base.add(brazo);

    // Espárrago
    let material_esparrago = new THREE.MeshNormalMaterial();
    let geometria_esparrago = new THREE.CylinderGeometry(2, 2, 1.8, 32);
    let esparrago = new THREE.Mesh(geometria_esparrago, material_esparrago);
    esparrago.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    brazo.add(esparrago);

    // Eje vertical del brazo
    let material_eje = new THREE.MeshNormalMaterial();
    let geometria_eje = new THREE.BoxGeometry(1.8, 12, 1.2);
    let eje = new THREE.Mesh(geometria_eje, material_eje);
    eje.position.y = 6;
    brazo.add(eje);

    // Articulación
    let material_articulacion = new THREE.MeshNormalMaterial();
    let geometria_articulacion = new THREE.SphereGeometry(2, 12, 12);
    let articulacion = new THREE.Mesh(geometria_articulacion, material_articulacion);
    articulacion.position.y = 12;
    brazo.add(articulacion);

    // Antebrazo
    antebrazo = new THREE.Object3D();
    antebrazo.position.y = 12;
    brazo.add(antebrazo);

    // Base antebrazo
    let material_base_antebrazo = new THREE.MeshNormalMaterial();
    let geometria_base_antebrazo = new THREE.CylinderGeometry(2.2, 2.2, 0.6, 32);
    let base_antebrazo = new THREE.Mesh(geometria_base_antebrazo, material_base_antebrazo);
    antebrazo.add(base_antebrazo);

    // Cuatro nervios
    let posiciones = [
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1]
    ];
    let material_eje_antebrazo = new THREE.MeshNormalMaterial();
    for (let p of posiciones) {
        let geometria_eje_antebrazo = new THREE.BoxGeometry(0.4, 8, 0.4);
        let eje_antebrazo = new THREE.Mesh(geometria_eje_antebrazo, material_eje_antebrazo);
        eje_antebrazo.position.set(p[0], 4, p[1]);
        antebrazo.add(eje_antebrazo);
    }

    // Cilindro horizontal del antebrazo
    let material_cilindro_antebrazo = new THREE.MeshNormalMaterial();
    let geometria_cilindro_antebrazo = new THREE.CylinderGeometry(1.5, 1.5, 4, 32);
    let cilindro_antebrazo = new THREE.Mesh(geometria_cilindro_antebrazo, material_cilindro_antebrazo);
    cilindro_antebrazo.position.y = 8;
    antebrazo.add(cilindro_antebrazo);
    cilindro_antebrazo.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

    // Pivot de muñeca
    mano = new THREE.Object3D();
    mano.position.set(0, 8, 0);
    antebrazo.add(mano);

    // Geometría de una pinza
    let geometry = new THREE.BufferGeometry();
    let vertices_pinza = new Float32Array([
        0, 0, 0,   // 0
        0, 0, 0.4, // 1
        0, 2, 0.4, // 2
        0, 2, 0,   // 3
        1.9, 2, 0,   // 4
        1.9, 2, 0.4, // 5
        1.9, 0, 0,   // 6
        1.9, 0, 0.4, // 7
        3.8, 0.35, 0.1, // 8
        3.8, 1.55, 0.1, // 9
        3.8, 1.55, 0.3, // 10
        3.8, 0.35, 0.3  // 11
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices_pinza, 3));
    let indices = new Uint16Array([
        0, 3, 6, 3, 4, 6,
        1, 7, 2, 2, 7, 5,
        0, 6, 7, 0, 7, 1,
        6, 8, 11, 6, 11, 7,
        6, 4, 8, 4, 9, 8,
        5, 11, 10, 5, 7, 11,
        4, 10, 9, 4, 5, 10,
        2, 5, 3, 3, 5, 4,
        8, 10, 11, 8, 9, 10,
        3, 0, 1, 2, 3, 1
    ]);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Centrar la geometría en su origen y adelantarla 2 en X para alinear mordida
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const cx = (bb.min.x + bb.max.x) * 0.5;
    const cy = (bb.min.y + bb.max.y) * 0.5;
    const cz = (bb.min.z + bb.max.z) * 0.5;
    geometry.translate(-cx + 2, -cy, -cz);

    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    let materialPinza = new THREE.MeshNormalMaterial({ flatShading: true });

    // Grupo de pinzas colgado de la muñeca
    pinzas = new THREE.Object3D();
    mano.add(pinzas);

    pinza1 = new THREE.Mesh(geometry, materialPinza);
    pinza2 = new THREE.Mesh(geometry, materialPinza);
    pinzas.add(pinza1);
    pinzas.add(pinza2);

    // Separación inicial
    const gap0 = 10.0;
    pinza1.position.z = -gap0 * 0.5;
    pinza2.position.z = gap0 * 0.5;

    // Plano suelo
    const geometria_plano = new THREE.PlaneGeometry(50, 50);
    const material_plano = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    const plano = new THREE.Mesh(geometria_plano, material_plano);
    plano.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    plano.position.y = -0.75;
    scene.add(plano);

    // Wireframe inicial
    setWireframe(controls.alambre);
}

function setWireframe(flag) {
    scene.traverse(obj => {
        if (obj.isMesh) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => {
                    if (m && 'wireframe' in m) {
                        m.wireframe = flag;
                        m.needsUpdate = true;
                    }
                });
            } else if (obj.material && 'wireframe' in obj.material) {
                obj.material.wireframe = flag;
                obj.material.needsUpdate = true;
            }
        }
    });
}

// Teclado
function onKeyDown(e) {
    switch (e.code) {
        case 'ArrowUp': teclas.ArrowUp = true; e.preventDefault(); break;
        case 'ArrowDown': teclas.ArrowDown = true; e.preventDefault(); break;
        case 'ArrowLeft': teclas.ArrowLeft = true; e.preventDefault(); break;
        case 'ArrowRight': teclas.ArrowRight = true; e.preventDefault(); break;
    }
}
function onKeyUp(e) {
    switch (e.code) {
        case 'ArrowUp': teclas.ArrowUp = false; e.preventDefault(); break;
        case 'ArrowDown': teclas.ArrowDown = false; e.preventDefault(); break;
        case 'ArrowLeft': teclas.ArrowLeft = false; e.preventDefault(); break;
        case 'ArrowRight': teclas.ArrowRight = false; e.preventDefault(); break;
    }
}

// Animación por keyframes
function startAnimation() {
    if (keyframes.length < 2 || keyTimes.length !== keyframes.length - 1) return;
    isAnimating = true;
    kfIndex = 0;
    segTime = 0;
}

// Easing suave
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function applyPoseFromArray(arr) {
    // arr = [baseY, brazoZ, anteY, anteZ, muñecaZ, sepPinzaGUI]
    const d2r = Math.PI / 180;
    base.rotation.y = arr[0] * d2r;
    brazo.rotation.z = arr[1] * d2r;
    antebrazo.rotation.y = arr[2] * d2r;
    antebrazo.rotation.z = arr[3] * d2r;
    mano.rotation.z = arr[4] * d2r;

    // convertir la separación de GUI a unidades de escena
    const sepScene = arr[5] * 0.2;
    pinza1.position.z = -sepScene * 0.5;
    pinza2.position.z = sepScene * 0.5;
}

function update() {
    const dt = clock.getDelta();

    cameraControls.update();

    // Si hay animación, interpolar entre keyframes
    if (isAnimating) {
        const dur = keyTimes[kfIndex];
        segTime += dt;
        let t = segTime / dur;
        if (t > 1) t = 1;

        const a = keyframes[kfIndex];
        const b = keyframes[kfIndex + 1];

        const s = easeInOutCubic(t);

        // Interpolación componente a componente
        const pose = [
            a[0] + (b[0] - a[0]) * s,
            a[1] + (b[1] - a[1]) * s,
            a[2] + (b[2] - a[2]) * s,
            a[3] + (b[3] - a[3]) * s,
            a[4] + (b[4] - a[4]) * s,
            a[5] + (b[5] - a[5]) * s
        ];
        applyPoseFromArray(pose);

        if (segTime >= dur) {
            segTime = 0;
            kfIndex++;
            if (kfIndex >= keyframes.length - 1) {
                isAnimating = false;
            }
        }
    } else {
        // Sin animación, aplicar controles manuales
        const d2r = Math.PI / 180;
        base.rotation.y = controls.giroBase * d2r;
        brazo.rotation.z = controls.giroBrazo * d2r;
        antebrazo.rotation.y = controls.giroAntebrazoY * d2r;
        antebrazo.rotation.z = controls.giroAntebrazoZ * d2r;
        mano.rotation.z = controls.giroPinza * d2r;

        const sep = controls.separacionPinza * 0.2;
        pinza1.position.z = -sep * 0.5;
        pinza2.position.z = sep * 0.5;
    }

    // Movimiento del robot en el plano XZ con flechas
    if (robot) {
        let vx = 0, vz = 0;
        if (teclas.ArrowUp) vz -= VEL;
        if (teclas.ArrowDown) vz += VEL;
        if (teclas.ArrowLeft) vx -= VEL;
        if (teclas.ArrowRight) vx += VEL;

        robot.position.x += vx * dt;
        robot.position.z += vz * dt;

        robot.position.y = 0;
        robot.position.x = THREE.MathUtils.clamp(robot.position.x, -LIMITE_PLANO, LIMITE_PLANO);
        robot.position.z = THREE.MathUtils.clamp(robot.position.z, -LIMITE_PLANO, LIMITE_PLANO);
    }
}

function render() {
    requestAnimationFrame(render);
    update();
    renderer.render(scene, camera);
}

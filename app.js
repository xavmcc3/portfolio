import * as THREE from 'three';

const canvas = document.getElementById('bg');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// Track mouse
const targetMouse = new THREE.Vector2(0.5, 0.5);
const mouseVelocity = new THREE.Vector2(0, 0);
const mouse = new THREE.Vector2(0.5, 0.5);


const STIFFNESS = 0.15;
const DAMPING = 0.8;

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function updateMouse() {
	mouseVelocity.x += (targetMouse.x - mouse.x) * STIFFNESS;
	mouseVelocity.y += (targetMouse.y - mouse.y) * STIFFNESS;

	mouseVelocity.x *= DAMPING;
	mouseVelocity.y *= DAMPING;

	mouse.x += mouseVelocity.x;
	mouse.y += mouseVelocity.y;
}

window.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();

	targetMouse.x = (e.clientX - rect.left) / rect.width;
	targetMouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
});

canvas.addEventListener("touchstart", (e) => {
	const rect = canvas.getBoundingClientRect();
	const touch = e.touches[0];

	targetMouse.x = (touch.clientX - rect.left) / rect.width;
	targetMouse.y = 1.0 - (touch.clientY - rect.top) / rect.height;
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
	const rect = canvas.getBoundingClientRect();
	const touch = e.touches[0];

	targetMouse.x = (touch.clientX - rect.left) / rect.width;
	targetMouse.y = 1.0 - (touch.clientY - rect.top) / rect.height;
}, { passive: true });

const planeGeo = new THREE.PlaneGeometry(2, 2);

// Build shader material
const defaultVertexShader = `
void main() {
	gl_Position = vec4(position, 1.0);
}
`

async function getFragmentShader() {
    const response = await fetch('./res/fragment.glsl');
    const fragmentCode = await response.text();

    return fragmentCode;
}

async function getASCIIImage() {
	const loader = new THREE.TextureLoader();
	const texture = await loader.loadAsync('./res/background-pre-ascii.png');
	return texture;
}

function createAsciiAtlas() {
	const chars = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,\"^`'. ".split('').reverse().join('');
	const size = 64;
	const cols = chars.length;

	const canvas = document.createElement('canvas');
	canvas.width = size * cols;
	canvas.height = size;

	const ctx = canvas.getContext('2d');

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "white";
	ctx.font = `${size * 0.8}px monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	for (let i = 0; i < chars.length; i++) {
	ctx.fillText(chars[i], i * size + size / 2, size / 2);
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;

	return { texture, count: chars.length };
}

const atlas = createAsciiAtlas();
const asciiImage = await getASCIIImage();

const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: mouse },
    uResolution: { value: new THREE.Vector2(
			window.innerWidth * renderer.getPixelRatio(),
			window.innerHeight * renderer.getPixelRatio()
		) 
	},

	uCellSize: { value: 15.0 },
	uTexture: { value: asciiImage },
	uImageResolution: {
		value: new THREE.Vector2(asciiImage.image.width, asciiImage.image.height)
	},
	uAtlas: { value: atlas.texture },
	uCharCount: { value: atlas.count }
  },
  vertexShader: defaultVertexShader,
  fragmentShader: await getFragmentShader(),
  depthWrite: false,
  depthTest: false
});


// Build plane
const plane = new THREE.Mesh(planeGeo, shaderMaterial);
scene.add(plane);

plane.renderOrder = 1;

// Animate scene
const startTime = performance.now();

function animate() {
	requestAnimationFrame(animate);

	const elapsed = (performance.now() - startTime) / 1000;
	
	shaderMaterial.uniforms.uTime.value = elapsed;
	
	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;

	updateMouse();

	renderer.render(scene, camera);
}

animate();

// Handle resizing
function onResize() {
	const width = window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	
	renderer.setSize(width, height);
	
	const pixelRatio = renderer.getPixelRatio();
	
	// gl.uniform2f(uMouseLocation, mouse.x, mouse.y);

	shaderMaterial.uniforms.uResolution.value.set(
		window.innerWidth * pixelRatio,
		window.innerHeight * pixelRatio
	);
}

window.addEventListener('resize', onResize);

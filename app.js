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


// Set up scene
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ wireframe: true });
const cube = new THREE.Mesh(geometry, material);

// scene.add(cube);

// Track mouse
const mouse = new THREE.Vector2(0.5, 0.5);

window.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();

	mouse.x = (e.clientX - rect.left) / rect.width;
	mouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
});

const planeGeo = new THREE.PlaneGeometry(2, 2);

// Build shader material
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: mouse },
    uResolution: { value: new THREE.Vector2(
			window.innerWidth * renderer.getPixelRatio(),
			window.innerHeight * renderer.getPixelRatio()
		) 
	}
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec2 uResolution;

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;

      // visualize mouse influence
      float d = distance(uv, uMouse);

      float glow = exp(-10.0 * d);

      vec3 color = vec3(glow);

      gl_FragColor = vec4(color, 1.0);

	  // DEBUG: visualize UVs
	  gl_FragColor = vec4(uv, 0.0, 1.0);
    }
  `,
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

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

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

	shaderMaterial.uniforms.uResolution.value.set(
		window.innerWidth * pixelRatio,
		window.innerHeight * pixelRatio
	);
}

window.addEventListener('resize', onResize);

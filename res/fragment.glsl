uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uCellSize;

uniform sampler2D uTexture;
uniform sampler2D uAtlas;
uniform float uCharCount;
uniform vec2 uImageResolution;

vec2 getCoverUV(vec2 uv, vec2 screen, vec2 image) {
    float rs = screen.x / screen.y;
    float ri = image.x / image.y;

    vec2 newUV = uv;

    if (rs > ri) {
        // screen is wider → scale image height
        float scale = ri / rs;
        newUV.y = uv.y * scale + (1.0 - scale) * 0.5;
    } else {
        // screen is taller → scale image width
        float scale = rs / ri;
        newUV.x = uv.x * scale + (1.0 - scale) * 0.5;
    }

    return newUV;
}

void main() {
	vec2 uv = gl_FragCoord.xy / uResolution;

	vec2 pixel = gl_FragCoord.xy;

	// mouse in pixel space
	vec2 mousePx = uMouse * uResolution;

	// direction + distance
	vec2 dirM = pixel - mousePx;
	float distM = length(dirM);

	// falloff
	float radius = 100.0;
	float strength = 200.0;

	strength += sin(uTime) * 50.0;
	radius += cos(uTime * 0.5) * 50.0;

	// smooth falloff (strong near mouse, fades out)
	float influence = exp(-distM / radius);

	// push away
	pixel -= normalize(dirM) * influence * strength;

	vec2 grid = floor(pixel / uCellSize);

	vec2 snappedUV = (grid * uCellSize) / uResolution;

	vec2 cellUV = fract(pixel / uCellSize);
	cellUV += dirM * influence * 0.01;

	vec2 sampleUV = getCoverUV(snappedUV, uResolution, uImageResolution);

	vec4 texSample = texture2D(uTexture, sampleUV);
	vec3 tex = texSample.rgb;
	float alpha = texSample.a;

	float brightness = dot(tex, vec3(0.299, 0.587, 0.114)) * alpha;

	vec2 dir = uv - uMouse;
	float dist = length(dir);

	// Add subtle noise for more texture
	float noise = fract(sin(dot(grid, vec2(12.9898,78.233))) * 43758.5453);
	brightness += (noise - 0.5) * 0.05;

	// Add time-based gradient for dynamic effect
	float sweep = fract(uv.x + uTime * 0.1);
	float band = smoothstep(0.0, 0.2, sweep) * (1.0 - smoothstep(0.2, 0.5, sweep));
	brightness *= 0.8 + 0.4 * band;

	// Contrast boost
	brightness = pow(brightness, 0.9);

	// --- 🔤 Map brightness → character index ---
	float index = floor(brightness * (uCharCount - 1.0));

	// --- 🧭 Atlas lookup ---
	float charWidth = 1.0 / uCharCount;

	vec2 atlasUV;
	atlasUV.x = index * charWidth + cellUV.x * charWidth;
	atlasUV.y = cellUV.y;

	float charSample = texture2D(uAtlas, atlasUV).r;

	// --- 🎨 Color ---
	float avgCharBrightness = (index + 0.5) / uCharCount;
	vec3 color = vec3(avgCharBrightness, avgCharBrightness, avgCharBrightness) * charSample;

	// Fade based on mouse distance
	float mouseInfluence = exp(-dist * 5.0);
	color *= 0.8 + 0.2 * mouseInfluence;

	gl_FragColor = vec4(color, 1.0);

	// gl_FragColor = vec4(sampleUV, 0.0, 1.0);
}
'use client';
import { useEffect, useRef } from 'react';

const SEA_COLORS: readonly number[][] = [
  [0.00, 0.05, 0.12], [0.00, 0.08, 0.18], [0.00, 0.12, 0.24],
  [0.00, 0.16, 0.30], [0.00, 0.20, 0.36], [0.00, 0.26, 0.42],
  [0.00, 0.32, 0.48], [0.00, 0.38, 0.52], [0.00, 0.44, 0.57],
  [0.00, 0.50, 0.62], [0.00, 0.56, 0.65], [0.00, 0.62, 0.68],
  [0.00, 0.66, 0.71], [0.05, 0.70, 0.74], [0.10, 0.74, 0.77],
  [0.15, 0.78, 0.80], [0.20, 0.82, 0.83], [0.25, 0.86, 0.86],
  [0.30, 0.90, 0.89], [0.35, 0.94, 0.92],
];

function buildGlslNoiseFunctions() {
  return `vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float noise2D(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.792843 - 0.853734 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 10; i++) {
    value += amplitude * noise2D(st * freq);
    freq *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}`;
}

function buildGlslMainBody() {
  return `void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  uv *= 0.3;
  float t = uTime * 0.25;
  float waveAmp = 0.2 + 0.15 * noise2D(vec2(t, 27.7));
  float waveX = waveAmp * sin(uv.y * 4.0 + t);
  float waveY = waveAmp * sin(uv.x * 4.0 - t);
  uv.x += waveX;
  uv.y += waveY;
  float r = length(uv);
  float angle = atan(uv.y, uv.x);
  float swirlStrength = 1.2 * (1.0 - smoothstep(0.0, 1.0, r));
  angle += swirlStrength * sin(uTime + r * 5.0);
  uv = vec2(cos(angle), sin(angle)) * r;
  float n = fbm(uv);
  float swirlEffect = 0.2 * sin(t + n * 3.0);
  n += swirlEffect;
  float noiseVal = 0.5 * (n + 1.0);
  float idx = clamp(noiseVal, 0.0, 1.0) * float(NUM_COLORS - 1);
  int iLow = int(floor(idx));
  int iHigh = int(min(float(iLow + 1), float(NUM_COLORS - 1)));
  float f = fract(idx);
  vec3 colLow = seaColors[iLow];
  vec3 colHigh = seaColors[iHigh];
  vec3 color = mix(colLow, colHigh, f);
  if (iLow == 0 && iHigh == 0) {
    outColor = vec4(color, 0.0);
  } else {
    outColor = vec4(color, 0.15);
  }
}`;
}

function buildFragmentShader() {
  const colorArraySrc = SEA_COLORS
    .map((c) => `vec3(${c[0]}, ${c[1]}, ${c[2]})`)
    .join(",\n  ");

  return `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;

#define NUM_COLORS 20

vec3 seaColors[NUM_COLORS] = vec3[](
  ${colorArraySrc}
);

${buildGlslNoiseFunctions()}

${buildGlslMainBody()}`;
}

const vertexShaderSource = `#version 300 es
precision mediump float;
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const label = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    console.error(`${label} shader error:`, gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function createShaderProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  if (!vertexShader) return null;

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Could not link WebGL program:", gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

interface GlResources {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject | null;
  vbo: WebGLBuffer | null;
  uResolutionLoc: WebGLUniformLocation | null;
  uTimeLoc: WebGLUniformLocation | null;
}

function initWebGLResources(canvas: HTMLCanvasElement): GlResources | null {
  const fsSource = buildFragmentShader();
  const gl = canvas.getContext('webgl2', { alpha: true });
  if (!gl) {
    console.error('WebGL2 is not supported by your browser.');
    return null;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const program = createShaderProgram(gl, vertexShaderSource, fsSource);
  if (!program) return null;

  gl.useProgram(program);

  const quadVertices = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPositionLoc);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

  return {
    gl,
    program,
    vao,
    vbo,
    uResolutionLoc: gl.getUniformLocation(program, 'uResolution'),
    uTimeLoc: gl.getUniformLocation(program, 'uTime'),
  };
}

function renderFrame(
  canvas: HTMLCanvasElement,
  res: GlResources,
  startTime: number,
  state: { destroyed: boolean },
) {
  if (state.destroyed) return;
  const elapsed = (performance.now() - startTime) * 0.001;

  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  res.gl.viewport(0, 0, canvas.width, canvas.height);
  res.gl.clear(res.gl.COLOR_BUFFER_BIT);
  res.gl.useProgram(res.program);
  res.gl.bindVertexArray(res.vao);
  res.gl.uniform2f(res.uResolutionLoc, canvas.width, canvas.height);
  res.gl.uniform1f(res.uTimeLoc, elapsed);
  res.gl.drawArrays(res.gl.TRIANGLES, 0, 6);

  if (!state.destroyed) {
    requestAnimationFrame(() => renderFrame(canvas, res, startTime, state));
  }
}

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function startRenderLoop(
  canvas: HTMLCanvasElement,
  res: GlResources,
): () => void {
  const startTime = performance.now();
  const state = { destroyed: false };

  renderFrame(canvas, res, startTime, state);

  const onResize = () => resizeCanvas(canvas, res.gl);
  window.addEventListener('resize', onResize);

  return () => {
    state.destroyed = true;
    window.removeEventListener('resize', onResize);
    if (!res.gl.isContextLost()) {
      try {
        res.gl.deleteProgram(res.program);
        res.gl.deleteBuffer(res.vbo);
        res.gl.deleteVertexArray(res.vao);
      } catch (e) {
        console.warn('Error cleaning up WebGL resources:', e);
      }
    }
  };
}

export default function HalftoneWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const res = initWebGLResources(canvas);
    if (!res) return;

    return startRenderLoop(canvas, res);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ background: 'transparent', zIndex: 1 }}
    />
  );
}

/* "The reach" — the Creation-of-Adam hands rendered as live ASCII art.
 *
 * Technique (the one award-winning sites use): a WebGL2 fragment shader downsamples the image
 * into cells, reads luminance per cell, and stamps a bit-encoded ASCII glyph (denser glyph =
 * brighter cell) — glyphs generated on the GPU, no font needed. Classic ASCII-art shader
 * (movAX13h) adapted with a cursor glow and an edges→fingertips reveal. Falls back to a canvas
 * renderer where WebGL2 is unavailable. Honors prefers-reduced-motion.
 *
 * Source image: assets/hands.png (any hands-on-dark image works — it's cover-fit + luminance-mapped).
 */
(function () {
  var canvas = document.getElementById("asciiHands");
  if (!canvas) return;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var mouse = { x: -1e4, y: -1e4, on: false };
  canvas.addEventListener("mousemove", function (e) {
    var b = canvas.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; mouse.on = true;
  });
  canvas.addEventListener("mouseleave", function () { mouse.on = false; });

  var inView = false, revealStart = 0;
  new IntersectionObserver(function (es) {
    inView = es[0].isIntersecting;
    if (inView && !revealStart) revealStart = performance.now();
  }, { threshold: 0.15 }).observe(canvas);

  var img = new Image();
  img.onload = function () { start(img); };
  img.onerror = function () { canvas.style.display = "none"; };   // no source → hide the band gracefully
  img.src = "assets/hands.png";

  function start(image) {
    var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
    if (gl) { try { return webgl(gl, image); } catch (e) { /* fall through */ } }
    canvas2d(image);
  }

  /* ------------------------------------------------------------------ WebGL2 */
  function webgl(gl, image) {
    var VS = "#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.,1.);}";
    var FS = "#version 300 es\n" +
      "precision highp float;\n" +
      "uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uMouse;\n" +
      "uniform float uReveal, uTime, uCell, uImgA, uCanA, uMotion;\n" +
      "out vec4 frag;\n" +
      "float character(int n, vec2 p){\n" +
      "  p = floor(p*vec2(4.0,-4.0)+2.5);\n" +
      "  if(clamp(p.x,0.0,4.0)==p.x && clamp(p.y,0.0,4.0)==p.y){\n" +
      "    int a = int(round(p.x)+5.0*round(p.y));\n" +
      "    if(((n>>a)&1)==1) return 1.0;\n" +
      "  } return 0.0;\n" +
      "}\n" +
      "vec2 cover(vec2 uv){ vec2 s = uCanA>uImgA ? vec2(uCanA/uImgA, 1.0) : vec2(1.0, uImgA/uCanA); return (uv-0.5)*s+0.5; }\n" +
      "void main(){\n" +
      "  vec2 pix = gl_FragCoord.xy;\n" +
      "  vec2 cellPix = floor(pix/uCell)*uCell + uCell*0.5;\n" +
      "  vec2 uv = cover(cellPix/uRes);\n" +
      "  float g = 0.0;\n" +
      "  if(uv.x>0.0 && uv.x<1.0 && uv.y>0.0 && uv.y<1.0){ vec3 c=texture(uTex,uv).rgb; g=0.3*c.r+0.59*c.g+0.11*c.b; }\n" +
      "  // cursor glow\n" +
      "  float md = distance(pix, uMouse); g += smoothstep(150.0,0.0,md)*0.45*uMotion;\n" +
      "  // idle shimmer\n" +
      "  g += sin(uTime*1.6 + cellPix.x*0.05 + cellPix.y*0.04)*0.03*uMotion;\n" +
      "  // reveal: outer columns first, the fingertip gap (centre) last\n" +
      "  float edge = 1.0 - abs(uv.x-0.5)*2.0;\n" +
      "  float rev = mix(1.0, smoothstep(edge-0.06, edge+0.02, uReveal), uMotion);\n" +
      "  g = clamp(g*rev, 0.0, 1.0);\n" +
      "  int n = 4096;\n" +
      "  if(g>0.12) n=65600;\n" +      // :
      "  if(g>0.22) n=163153;\n" +     // *
      "  if(g>0.34) n=15255086;\n" +   // o
      "  if(g>0.46) n=13121101;\n" +   // &
      "  if(g>0.58) n=15252014;\n" +   // 8
      "  if(g>0.70) n=13195790;\n" +   // @
      "  if(g>0.82) n=11512810;\n" +   // #
      "  vec2 pp = mod(pix/(uCell*0.5), 2.0) - 1.0;\n" +
      "  float ch = character(n, pp);\n" +
      "  vec3 col = vec3(0.957,0.961,0.969) * ch * (0.30 + g*0.85);\n" +
      "  frag = vec4(col, 1.0);\n" +
      "}";

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindVertexArray(gl.createVertexArray());   // attribute-less draw needs a bound VAO on strict drivers

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var U = {}; ["uRes", "uMouse", "uReveal", "uTime", "uCell", "uImgA", "uCanA", "uMotion", "uTex"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    var dpr = 1, imgA = image.width / image.height;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize); resize();

    var t0 = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!inView) return;
      var reveal = RM ? 1 : Math.min(1, (now - revealStart) / 1600);
      gl.uniform1i(U.uTex, 0);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uMouse, mouse.on ? mouse.x * dpr : -1e4, mouse.on ? canvas.height - mouse.y * dpr : -1e4);
      gl.uniform1f(U.uReveal, reveal);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.uniform1f(U.uCell, Math.max(6, Math.round(8 * dpr)));
      gl.uniform1f(U.uImgA, imgA);
      gl.uniform1f(U.uCanA, canvas.width / canvas.height);
      gl.uniform1f(U.uMotion, RM ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    })(performance.now());
  }

  /* ------------------------------------------------------------------ Canvas 2D fallback */
  function canvas2d(image) {
    var ctx = canvas.getContext("2d");
    var RAMP = " .:-=+*oa#W@";
    var buf = document.createElement("canvas"), bctx = buf.getContext("2d", { willReadFrequently: true });
    var CELL = 8, LH = 1.6, cols = 0, rows = 0, cw = 0, ch = 0, dpr = 1, lum = null, t0 = performance.now();
    function sample() {
      buf.width = cols; buf.height = rows;
      bctx.fillStyle = "#000"; bctx.fillRect(0, 0, cols, rows);
      var scale = Math.min(cols / image.width, rows / image.height);   // contain
      var dw = image.width * scale, dh = image.height * scale;
      bctx.drawImage(image, 0, 0, image.width, image.height, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      var d = bctx.getImageData(0, 0, cols, rows).data; lum = new Float32Array(cols * rows);
      for (var i = 0; i < cols * rows; i++) lum[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
    }
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1); cw = canvas.clientWidth; ch = canvas.clientHeight; if (!cw || !ch) return;
      canvas.width = cw * dpr; canvas.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(20, Math.floor(cw / CELL)); rows = Math.max(12, Math.floor(ch / (CELL * LH))); sample();
    }
    window.addEventListener("resize", resize); resize();
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!lum || !inView) return;
      var reveal = RM ? 1 : Math.min(1, (now - revealStart) / 1600), time = (now - t0) / 1000;
      ctx.clearRect(0, 0, cw, ch); ctx.font = CELL + "px ui-monospace,Menlo,Consolas,monospace"; ctx.textBaseline = "top";
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var v = lum[y * cols + x]; if (v < 0.06) continue;
        var edge = 1 - Math.abs(x / cols - 0.5) * 2; if (!RM && reveal < edge - 0.05) continue;
        var b = v; if (!RM) b += Math.sin(time * 1.6 + x * 0.5 + y * 0.4) * 0.04;
        if (mouse.on) { var dx = x * CELL - mouse.x, dy = y * CELL * LH - mouse.y, dd = Math.sqrt(dx * dx + dy * dy); if (dd < 120) b += (1 - dd / 120) * 0.4; }
        b = Math.max(0, Math.min(1, b)); var g = RAMP[Math.min(RAMP.length - 1, Math.floor(b * (RAMP.length - 1)))]; if (g === " ") continue;
        ctx.fillStyle = "rgba(244,245,247," + (0.3 + b * 0.7) + ")"; ctx.fillText(g, x * CELL, y * CELL * LH);
      }
    })(performance.now());
  }
})();

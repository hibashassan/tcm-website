// Shared: rotating mesh gradient (bright hero + dark sections) + scroll reveal.
(function () {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = 'precision highp float;uniform vec2 R;uniform float T;uniform vec2 M;uniform float A;uniform float D;' +
    'const vec3 VIO=vec3(.694,.604,.996),MAG=vec3(.949,.267,.776),BLU=vec3(.141,.671,1.),MIN=vec3(.627,1.,.910);' +
    'vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}' +
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);' +
    'return mix(mix(dot(hash(i),f),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}' +
    'float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}' +
    'float blob(vec2 u,vec2 c,float k){vec2 d=u-c;return exp(-k*dot(d,d));}' +
    'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;float t=T*.30;' +
    'vec2 w=vec2(fbm(uv*1.8+vec2(0,t*.5)),fbm(uv*1.8+vec2(7.3,-t*.5)))-.5;vec2 sp=uv+w*.28;' +
    'vec2 p0=vec2(.28+.20*sin(t*.70),.34+.22*cos(t*.53+1.3));vec2 p1=vec2(.74+.22*sin(t*.47+2.1),.30+.20*cos(t*.81+.4));' +
    'vec2 p2=vec2(.68+.21*sin(t*.62+4.2),.72+.23*cos(t*.44+2.7));vec2 p3=vec2(.30+.23*sin(t*.86+3.1),.70+.21*cos(t*.67+5.));' +
    'vec2 a=vec2(asp,1.);vec2 cA=.5*a;float ang=T*.85;mat2 Rm=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));' +
    'vec2 q0=cA+Rm*(p0*a-cA),q1=cA+Rm*(p1*a-cA),q2=cA+Rm*(p2*a-cA),q3=cA+Rm*(p3*a-cA);' +
    'vec2 mA=M*a;q0=mix(q0,mA,A*.62);q1=mix(q1,mA,A*.62);q2=mix(q2,mA,A*.62);q3=mix(q3,mA,A*.62);' +
    'float k=5.0;float w0=blob(sp*a,q0,k),w1=blob(sp*a,q1,k),w2=blob(sp*a,q2,k),w3=blob(sp*a,q3,k);' +
    'float s=w0+w1+w2+w3+1e-4;vec3 col=(w0*MAG+w1*VIO+w2*BLU+w3*MIN)/s;' +
    'float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,1.32)*1.06;' +
    'float vig=smoothstep(1.7,.55,length((uv-.5)*a));col*=mix(.97,1.,vig);' +
    'if(D>0.5){col*=0.42;}' + // dark variant: deep jewel-tone mesh, still dancing
    'gl_FragColor=vec4(col,1.);}';

  function setup(cv) {
    var dark = cv.hasAttribute('data-gradient-dark');
    var gl = cv.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) { cv.style.background = dark ? '#13101d' : 'radial-gradient(120% 120% at 20% 10%,#b19afe,#f244c6 35%,#24abff 70%,#15101f 100%)'; return null; }
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr); gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'),
        uM = gl.getUniformLocation(pr, 'M'), uA = gl.getUniformLocation(pr, 'A'), uD = gl.getUniformLocation(pr, 'D');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var st = { gl: gl, cv: cv, pr: pr, dark: dark, uR: uR, uT: uT, uM: uM, uA: uA, uD: uD, dpr: dpr, mx: .5, my: .6, tx: .5, ty: .6, act: 0, tact: 0 };
    if (!dark) {
      window.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        st.tx = (e.clientX - r.left) / r.width; st.ty = 1 - (e.clientY - r.top) / r.height; st.tact = 1;
      });
      window.addEventListener('pointerout', function () { st.tact = 0; });
    }
    return st;
  }

  function draw(s, t) {
    var gl = s.gl, cv = s.cv;
    var w = cv.clientWidth * s.dpr | 0, h = cv.clientHeight * s.dpr | 0;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    s.mx += (s.tx - s.mx) * .06; s.my += (s.ty - s.my) * .06; s.tact *= .94; s.act += (s.tact - s.act) * .06;
    gl.useProgram(s.pr);
    gl.uniform2f(s.uR, cv.width, cv.height); gl.uniform1f(s.uT, t);
    gl.uniform2f(s.uM, s.mx, s.my); gl.uniform1f(s.uA, s.act); gl.uniform1f(s.uD, s.dark ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var states = [];
  document.querySelectorAll('canvas[data-gradient],canvas[data-gradient-dark]').forEach(function (cv) {
    var s = setup(cv); if (s) states.push(s);
  });
  if (!states.length) return;
  var start = 0;
  function frame(now) { if (!start) start = now; var t = (now - start) / 1000; for (var i = 0; i < states.length; i++) draw(states[i], t); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();


const BG_COUNT = 27;              // 背景图片数量
const BG_SIZE  = { w: 120, h: 90 };
const BG_MARGIN = 5;              
const FLOAT_AMPLITUDE = { x: [4, 14], y: [4, 14] }; 
const FLOAT_SPEED = [0.12, 0.35]; 
const MANY_VISIBLE_THRESHOLD = 28;

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));


window.addEventListener('DOMContentLoaded', () => {
  buildNet();               
  initBackgroundPhotos();  
  enableStickyClear();     
});


async function buildNet() {
  try {
    const res = await fetch('nodes.json');
    const data = await res.json(); 
    const svg = document.getElementById('net');
    const gLines = document.getElementById('lines');
    const gJoints = document.getElementById('joints');

    const W = svg.clientWidth;
    const H = svg.clientHeight;

    // 像素
    const pts = data.nodes.map(n => ({
      id: n.id,
      x0: n.x, y0: n.y,
      x: n.x * W, y: n.y * H,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      ampX: rand(3, 10),
      ampY: rand(3, 10),
      speed: rand(0.006, 0.02)
    }));

    // 画线
    const linkPaths = data.links.map(([a, b]) => {
      const pa = pts[a], pb = pts[b];
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.dataset.a = String(a);
      path.dataset.b = String(b);
      path.setAttribute('d', `M${pa.x},${pa.y} L${pb.x},${pb.y}`);
      gLines.appendChild(path);
      return path;
    });

    // 画点
    const circles = pts.map(p => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '2.2');
      c.setAttribute('cx', `${p.x}`);
      c.setAttribute('cy', `${p.y}`);
      gJoints.appendChild(c);
      return c;
    });

    // 交点微动动画
    function tick() {
      const w = svg.clientWidth, h = svg.clientHeight;

      pts.forEach(p => {
        p.phaseX += p.speed;
        p.phaseY += p.speed * 0.9;
        p.x = p.x0 * w + Math.sin(p.phaseX) * p.ampX;
        p.y = p.y0 * h + Math.cos(p.phaseY) * p.ampY;
      });

      // 更新线
      linkPaths.forEach(path => {
        const a = +path.dataset.a, b = +path.dataset.b;
        const pa = pts[a], pb = pts[b];
        path.setAttribute('d', `M${pa.x},${pa.y} L${pb.x},${pb.y}`);
      });

      // 更新点
      circles.forEach((c, i) => {
        const p = pts[i];
        c.setAttribute('cx', `${p.x}`);
        c.setAttribute('cy', `${p.y}`);
      });

      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error('buildNet error:', err);
  }
}


function initBackgroundPhotos() {
  const stage   = document.getElementById('stage');
  const net     = document.getElementById('net');
  const bgLayer = document.getElementById('bg-layer');

  // 不同层
  if (bgLayer.parentElement !== stage) {
    stage.insertBefore(bgLayer, net);
  }

  const stickySet = new Set(); 

  for (let i = 1; i <= BG_COUNT; i++) {
    const fig = document.createElement('figure');
    fig.className = 'node bg';
    fig.style.setProperty('--w', `${BG_SIZE.w}px`);
    fig.style.setProperty('--h', `${BG_SIZE.h}px`);

    
    const left = BG_MARGIN + Math.random() * (100 - BG_MARGIN * 2);
    const top  = BG_MARGIN + Math.random() * (100 - BG_MARGIN * 2);
    fig.style.left = `${left}%`;
    fig.style.top  = `${top}%`;

    // 图片
    const img = document.createElement('img');
    img.src = `assets/bg-${i}.jpg`;
    img.alt = `Background ${i}`;
    fig.appendChild(img);

    // 首次 hover 后保持可见
    fig.addEventListener('mouseenter', () => {
      if (!fig.classList.contains('sticky')) {
        fig.classList.add('sticky');
        stickySet.add(fig);
        if (stickySet.size >= MANY_VISIBLE_THRESHOLD) {
          document.body.classList.add('many-visible');
        }
      }
    });

   
    const float = {
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      ampX: rand(FLOAT_AMPLITUDE.x[0], FLOAT_AMPLITUDE.x[1]),
      ampY: rand(FLOAT_AMPLITUDE.y[0], FLOAT_AMPLITUDE.y[1]),
      speed: rand(FLOAT_SPEED[0], FLOAT_SPEED[1])
    };
    fig.dataset.float = JSON.stringify(float);

    
    bgLayer.appendChild(fig);
  }

  function floatTick() {
    const nodes = bgLayer.children;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const f = JSON.parse(el.dataset.float);
      f.phaseX += f.speed;
      f.phaseY += f.speed * 0.85;

      const dx = Math.sin(f.phaseX) * f.ampX;
      const dy = Math.cos(f.phaseY) * f.ampY;

     
      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--dy', `${dy}px`);

     
      el.dataset.float = JSON.stringify(f);
    }
    requestAnimationFrame(floatTick);
  }
  floatTick();
}


function enableStickyClear() {
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      document.querySelectorAll('.node.sticky').forEach(el => el.classList.remove('sticky'));
      document.body.classList.remove('many-visible');
    }
  });
}
const stage   = document.getElementById('stage');
const net     = document.getElementById('net');
const linesEl = document.getElementById('lines');
const jointsEl= document.getElementById('joints');

const nodeMap = new Map();   
const edgeList = [];         
const basePos  = new Map();  

function hueFrom(str){
  let h=0; for(let i=0;i<str.length;i++) h=(h*31 + str.charCodeAt(i))>>>0;
  return h % 360;
}
function pairHash(a,b){
  const s = a < b ? `${a}|${b}` : `${b}|${a}`;
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return (h%1000)/1000; 
}
function centerPctFromEl(nodeEl){
  const s=stage.getBoundingClientRect(), r=nodeEl.getBoundingClientRect();
  return {
    x: ((r.left + r.width/2) - s.left)/s.width*100,
    y: ((r.top  + r.height/2) - s.top )/s.height*100
  };
}
function inUpperLeft(p){ return p.x < 33 && p.y < 33; }


function recalcBasePositions(){
  nodeMap.forEach(({data, el})=>{
    basePos.set(data.id, centerPctFromEl(el));
  });
}
function wanderOffset(id, t){
  const seed = (hueFrom(id) / 57.3);
  const dx = Math.sin(t * 0.8 + seed) * 0.8;
  const dy = Math.cos(t * 1.1 + seed * 1.3) * 0.8;
  return {dx, dy};
}
function animatedPct(id, t){
  const base = basePos.get(id);
  if(!base) return null;
  const {dx,dy} = wanderOffset(id, t);
  return { x: base.x + dx, y: base.y + dy };
}


(async function init(){
  const nodes = await (await fetch('nodes.json')).json();  

  const fgNodes = nodes.filter(n => n.type !== 'background');
  fgNodes.forEach(addNode);

  buildLinksAndJoints();
  window.addEventListener('resize', recalcBasePositions);
  document.addEventListener('keydown', e => { if(e.key==='Escape') clearSticky(); });

  recalcBasePositions();
  requestAnimationFrame(animateNet);
})();

function addNode(n){
  const el = document.createElement('figure');
  el.className = 'node'; el.id = `node-${n.id}`;
  el.style.left = `${n.x}%`; el.style.top = `${n.y}%`;
  el.style.setProperty('--w', `${n.w || 100}px`);
  el.style.setProperty('--h', `${n.h || 75}px`);

  const img = document.createElement('img');
  if(n.src) img.src = n.src;
  img.alt = n.label || n.id;

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = n.label || n.id;
  label.style.setProperty('--label-bg', `hsla(${hueFrom(n.label||n.id)},70%,45%,0.9)`);

  el.append(img, label);
  el.addEventListener('mouseenter', () => el.classList.add('sticky'));

  stage.appendChild(el);
  nodeMap.set(n.id, { el, data: n });
}


function buildLinksAndJoints(){
  linesEl.innerHTML = '';
  jointsEl.innerHTML = '';
  edgeList.length = 0;
  recalcBasePositions();

  const drawn = new Set();
  nodeMap.forEach(({data})=>{
    (data.links || []).forEach(targetId=>{
      const key = data.id < targetId ? `${data.id}|${targetId}` : `${targetId}|${data.id}`;
      if(drawn.has(key)) return;
      drawn.add(key);

      const A = nodeMap.get(data.id), B = nodeMap.get(targetId);
      if(!A || !B) return;

      const p1 = basePos.get(data.id), p2 = basePos.get(targetId);
      if(inUpperLeft(p1) && inUpperLeft(p2)){
        if(pairHash(data.id, targetId) < 0.5) return;
      }

      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.classList.add('link');
      line.dataset.a = data.id;
      line.dataset.b = targetId;
      linesEl.appendChild(line);
      edgeList.push({ aId: data.id, bId: targetId, lineEl: line });
    });
  });

  nodeMap.forEach(({data})=>{
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.id = `joint-${data.id}`;
    c.classList.add('joint');
    c.setAttribute('r', '3');
    const hue = hueFrom(data.label || data.id);
    c.style.setProperty('--joint-fill',   `hsla(${hue},70%,55%,.9)`);
    c.style.setProperty('--joint-stroke', `hsla(${hue},75%,70%,.9)`);
    jointsEl.appendChild(c);
  });
}


function animateNet(){
  const t = performance.now() * 0.001;
  const visible = new Set(
    [...nodeMap.values()]
      .filter(o => o.el.matches(':hover') || o.el.classList.contains('sticky'))
      .map(o => o.data.id)
  );

  nodeMap.forEach(({data, el})=>{
    const id = data.id;
    const joint = document.getElementById(`joint-${id}`);
    if(!joint) return;

    if(!basePos.has(id)) basePos.set(id, centerPctFromEl(el));
    const pos = animatedPct(id, t);
    if(!pos) return;

    joint.setAttribute('cx', `${pos.x}%`);
    joint.setAttribute('cy', `${pos.y}%`);
    el.style.left = `${pos.x}%`;
    el.style.top  = `${pos.y}%`;
    if(visible.has(id)) joint.classList.add('on'); else joint.classList.remove('on');
  });

  for(const edge of edgeList){
    const {aId,bId,lineEl} = edge;
    const a = animatedPct(aId, t), b = animatedPct(bId, t);
    if(!a || !b) continue;
    lineEl.setAttribute('x1', `${a.x}%`);
    lineEl.setAttribute('y1', `${a.y}%`);
    lineEl.setAttribute('x2', `${b.x}%`);
    lineEl.setAttribute('y2', `${b.y}%`);
    if(visible.has(aId) || visible.has(bId)) lineEl.classList.add('visible');
    else lineEl.classList.remove('visible');
  }

  requestAnimationFrame(animateNet);
}

function clearSticky(){
  nodeMap.forEach(({el}) => el.classList.remove('sticky'));
}

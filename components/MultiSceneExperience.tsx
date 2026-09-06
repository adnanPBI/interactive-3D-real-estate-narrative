'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type SceneSpec = {
  id: string;
  label: string;
  kicker: string;
  title: string;
  body: string;
  side?: 'left' | 'right';
  camera: [number, number, number];
  target: [number, number, number];
  background: number;
  accent: number;
};

const scenes: SceneSpec[] = [
  { id:'hero', label:'Integrated platform', kicker:'01 — Convalt Energy', title:'Powering a more resilient future.', body:'A cinematic 3D journey through manufacturing, power generation, data infrastructure and circular-energy systems.', camera:[9.6,6.4,15.2], target:[0,1,0], background:0x09100c, accent:0xd29549 },
  { id:'manufacturing', label:'Solar manufacturing', kicker:'02 — Manufacturing', title:'Built at industrial scale.', body:'A purpose-built solar manufacturing hall reveals production cells, material flow, inspection stations and line infrastructure.', side:'right', camera:[8.2,4.8,11.3], target:[0.8,1.2,0], background:0x0d110e, accent:0xc57a2f },
  { id:'generation', label:'Power generation', kicker:'03 — Power generation', title:'Generation meets landscape.', body:'A dedicated energy field combines solar arrays, wind turbines and grid infrastructure in a broad outdoor composition.', camera:[-9.2,5.8,13.8], target:[0,1,0], background:0x09110f, accent:0xd4a45e },
  { id:'data', label:'Data centers', kicker:'04 — Data centers', title:'Infrastructure for the digital economy.', body:'A separate data-center environment exposes server aisles, cooling infrastructure and an energy-fed operations spine.', side:'right', camera:[7.5,3.8,10.2], target:[0.4,1.4,0], background:0x080d0c, accent:0xb66f31 },
  { id:'recycling', label:'Recycling', kicker:'05 — Recycling', title:'Materials return to the system.', body:'The recycling scene visualizes intake, sorting, processing and recovered-material loops as a distinct industrial layout.', camera:[-7.8,4.5,11.8], target:[-0.2,1,0], background:0x0a100c, accent:0xbd7a2d },
  { id:'close', label:'Connected ecosystem', kicker:'06 — Connected platform', title:'One connected energy platform.', body:'The closing scene recombines the visual language of all four pillars into a single energy-campus composition.', side:'right', camera:[0.9,6.6,15.5], target:[0,1.3,0], background:0x090d0b, accent:0xd0a05f }
];

type Diagnostics = { fps:number; averageFps:number; activeScene:number; sceneId:string; drawCalls:number; triangles:number; webgl:boolean; dpr:number; timestamp:number };

declare global { interface Window { __CONVALT_DIAGNOSTICS__?: Diagnostics } }

function addBox(group:THREE.Group, size:[number,number,number], pos:[number,number,number], mat:THREE.Material, rotY=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.rotation.y=rotY;group.add(m);return m;
}
function addCylinder(group:THREE.Group,r:number,h:number,pos:[number,number,number],mat:THREE.Material,segments=16){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);m.position.set(...pos);group.add(m);return m}
function material(color:number,metalness=.35,roughness=.68,emissive=0,emissiveIntensity=0){return new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity,transparent:true})}

function buildHero(){
  const g=new THREE.Group();
  const ground=material(0x18231c,.1,.95), dark=material(0x1e2924,.55,.6), glass=material(0x183847,.7,.3), copper=material(0xb66f31,.7,.38), green=material(0x536d59,.2,.86);
  addBox(g,[28,.6,22],[0,-.65,0],ground);
  addBox(g,[7,2.8,5],[4,1,-3],dark); addBox(g,[5.8,.08,3.8],[4,2.45,-3],glass);
  for(let z=-7;z<=7;z+=2.5)for(let x=-10;x<=-2;x+=2.3){const p=addBox(g,[1.8,.08,1.1],[x,.05,z],glass);p.rotation.x=-.18}
  for(let i=0;i<6;i++) addBox(g,[.42,2.3,1.1],[2+i*.75,.75,3.5],dark);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;addBox(g,[.7,.7,.7],[Math.cos(a)*7,.0,Math.sin(a)*7+5],green,a)}
  for(let i=0;i<5;i++)addBox(g,[.55,.12,.55],[-1+i*.7,.1,-4.8],copper);
  return g;
}
function buildManufacturing(){
  const g=new THREE.Group();const floor=material(0x202824,.15,.86),steel=material(0x7f8984,.75,.38),dark=material(0x1b211e,.5,.62),copper=material(0xb86f2d,.7,.4),glass=material(0x193842,.65,.32),yellow=material(0xd59b4b,.45,.5,0x5b3510,.5);
  addBox(g,[25,.45,15],[0,-.55,0],floor);
  for(const x of [-10,-6,-2,2,6,10]){addBox(g,[.22,5,.22],[x,1.8,-6.4],steel);addBox(g,[.22,5,.22],[x,1.8,6.4],steel)}
  addBox(g,[22,.2,.2],[0,4.2,-6.4],steel);addBox(g,[22,.2,.2],[0,4.2,6.4],steel);
  for(let i=0;i<10;i++){addBox(g,[1.45,.2,1.1],[-8+i*1.75,.05,0],glass);addBox(g,[.1,.7,1.35],[-8+i*1.75,.38,0],steel)}
  for(const x of [-6,-2,2,6]){addBox(g,[1.4,1.4,2.2],[x,.7,-3.2],dark);addBox(g,[.5,.12,.7],[x,1.45,-3.2],yellow)}
  for(let i=0;i<8;i++)addCylinder(g,.14,.7,[-7+i*2,.0,3.4],copper,12);
  return g;
}
function buildGeneration(){
  const g=new THREE.Group();const earth=material(0x1d2a20,.05,.98),solar=material(0x173b4b,.72,.28),steel=material(0x9da4a0,.8,.32),grid=material(0x39453f,.55,.55),copper=material(0xc07a35,.65,.4);
  addBox(g,[34,.5,24],[0,-.7,0],earth);
  for(let z=-8;z<=6;z+=2.6)for(let x=-12;x<=1;x+=2.2){const p=addBox(g,[1.8,.07,1.15],[x,.05,z],solar);p.rotation.x=-.22;p.rotation.y=.05}
  const turbine=(x:number,z:number,s=1)=>{addCylinder(g,.11*s,6*s,[x,2.35*s,z],steel,12);const hub=new THREE.Mesh(new THREE.SphereGeometry(.24*s,12,12),steel);hub.position.set(x,5.35*s,z);g.add(hub);for(let i=0;i<3;i++){const blade=addBox(g,[2.5*s,.08*s,.13*s],[x+1.15*s,5.35*s,z],steel);blade.geometry.translate(0,0,0);blade.rotation.z=i*Math.PI*2/3}}
  turbine(7,-6,1);turbine(10,1,.9);turbine(6,7,.8);
  addBox(g,[5,2.5,3],[8,.55,6],grid);for(let i=0;i<5;i++)addBox(g,[.28,.9,.28],[6.5+i*.7,.85,4.35],copper);
  return g;
}
function buildData(){
  const g=new THREE.Group();const floor=material(0x181d1b,.1,.9),rack=material(0x1d2522,.65,.45),frame=material(0x727a76,.75,.32),led=material(0x3f6f57,.2,.5,0x57d58a,2.1),copper=material(0xb96a29,.7,.36),cool=material(0x283f46,.62,.38);
  addBox(g,[24,.45,15],[0,-.6,0],floor);
  for(const side of [-1,1])for(let i=0;i<7;i++){const x=side*4.1,z=-5.2+i*1.7;addBox(g,[1.2,2.8,1.25],[x,1,z],rack);for(let y=0;y<5;y++)addBox(g,[.05,.08,.45],[x-side*.62,.15+y*.48,z],led)}
  addBox(g,[2.4,2.8,10],[0,1,0],cool);for(let i=0;i<6;i++)addBox(g,[.22,.22,8],[-1+i*.4,3,-.5],frame);
  for(let i=0;i<8;i++)addBox(g,[.18,.08,.7],[-1.4+i*.4,.05,5.6],copper);
  return g;
}
function buildRecycling(){
  const g=new THREE.Group();const floor=material(0x232a24,.08,.94),steel=material(0x777f79,.76,.42),dark=material(0x202720,.48,.63),orange=material(0xb96e2d,.62,.44),green=material(0x45624d,.25,.75,0x244f31,.45),scrap=material(0x5f655e,.78,.5);
  addBox(g,[27,.45,17],[0,-.6,0],floor);addBox(g,[8,2.8,5],[-5,1,-3],dark);addBox(g,[7,2.2,4],[5,.7,3],dark);
  for(let i=0;i<8;i++)addCylinder(g,.34,.7,[-8+i*1.1,.0,2.5],scrap,10);
  addBox(g,[11,.35,1.5],[0,.2,0],steel,.12);for(let i=0;i<6;i++)addBox(g,[.65,.5,.75],[-3+i*1.3,.58,0],orange,i*.1);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;addBox(g,[.6,.6,.6],[6+Math.cos(a)*3,.0,-3+Math.sin(a)*3],green,a)}
  return g;
}
function buildClose(){
  const g=new THREE.Group();const base=material(0x1a241e,.1,.94),dark=material(0x202a25,.55,.58),solar=material(0x173a48,.7,.3),copper=material(0xbe7732,.72,.38),green=material(0x4f6954,.25,.82),steel=material(0x8c9490,.78,.34);
  addBox(g,[30,.5,22],[0,-.65,0],base);addBox(g,[6,2.4,5],[0,.8,0],dark);
  for(let x=-11;x<=-4;x+=2.2)for(let z=-7;z<=4;z+=2.4){const p=addBox(g,[1.7,.07,1.05],[x,.03,z],solar);p.rotation.x=-.2}
  for(let i=0;i<6;i++)addBox(g,[.5,2.1,1],[4+i*.7,.65,-2],dark);
  addCylinder(g,.1,5.5,[9,2.1,5],steel,12);addBox(g,[2.1,.07,.12],[10,4.85,5],steel);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;addBox(g,[.55,.55,.55],[Math.cos(a)*5,.0,Math.sin(a)*5+6],green,a)}
  for(let i=0;i<7;i++)addBox(g,[.18,.08,.55],[-1.1+i*.36,.08,-3.2],copper);
  return g;
}

const builders=[buildHero,buildManufacturing,buildGeneration,buildData,buildRecycling,buildClose];

export function MultiSceneExperience(){
  const mount=useRef<HTMLDivElement>(null); const chapterRefs=useRef<(HTMLElement|null)[]>([]); const [active,setActive]=useState(0); const [diag,setDiag]=useState<Diagnostics>({fps:0,averageFps:0,activeScene:0,sceneId:scenes[0].id,drawCalls:0,triangles:0,webgl:false,dpr:1,timestamp:0});
  useEffect(()=>{
    const host=mount.current;if(!host)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{host.classList.add('fallback');return}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setSize(window.innerWidth,window.innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;host.appendChild(renderer.domElement);
    const world=new THREE.Scene();world.background=new THREE.Color(scenes[0].background);world.fog=new THREE.Fog(scenes[0].background,12,36);
    const camera=new THREE.PerspectiveCamera(40,window.innerWidth/window.innerHeight,.1,100);camera.position.set(...scenes[0].camera);
    world.add(new THREE.HemisphereLight(0xdde4df,0x111713,1.45));const sun=new THREE.DirectionalLight(0xffe6c1,2.8);sun.position.set(8,12,7);world.add(sun);const rim=new THREE.PointLight(scenes[0].accent,11,25);rim.position.set(-6,5,-5);world.add(rim);
    const groups=builders.map((fn,i)=>{const g=fn();g.visible=i<2;g.traverse(o=>{if((o as THREE.Mesh).isMesh){const m=o as THREE.Mesh;m.castShadow=false;m.receiveShadow=false}});world.add(g);return g});
    const bg=new THREE.Color(),bgA=new THREE.Color(),bgB=new THREE.Color();const accentA=new THREE.Color(),accentB=new THREE.Color();const target=new THREE.Vector3(),camGoal=new THREE.Vector3();const targetA=new THREE.Vector3(),targetB=new THREE.Vector3();let raf=0,last=performance.now(),fpsFrames=0,fpsTime=last,fps=60,totalFrames=0,totalTime=0;
    const update=()=>{
      const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);const p=Math.max(0,Math.min(1,window.scrollY/max));const pos=p*(scenes.length-1);const from=Math.floor(pos),to=Math.min(scenes.length-1,from+1),local=pos-from,t=local*local*(3-2*local);setActive(v=>v===Math.round(pos)?v:Math.round(pos));
      groups.forEach((g,i)=>{const near=Math.abs(i-pos);g.visible=near<1.08;if(g.visible){const w=Math.max(0,1-near);g.position.y=-(1-w)*.35;g.rotation.y=(i%2?-.03:.03)*(1-w);g.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];mats.forEach(m=>{if('opacity'in m){const mm=m as THREE.MeshStandardMaterial;mm.opacity=.12+.88*w;mm.transparent=w<.995;mm.depthWrite=w>.55}})})}});
      const a=scenes[from],b=scenes[to];camGoal.fromArray(a.camera).lerp(new THREE.Vector3(...b.camera),t);camera.position.lerp(camGoal,.075);targetA.fromArray(a.target);targetB.fromArray(b.target);target.copy(targetA).lerp(targetB,t);camera.lookAt(target);bgA.setHex(a.background);bgB.setHex(b.background);bg.copy(bgA).lerp(bgB,t);(world.background as THREE.Color).lerp(bg,.07);if(world.fog instanceof THREE.Fog)world.fog.color.lerp(bg,.07);accentA.setHex(a.accent);accentB.setHex(b.accent);rim.color.copy(accentA).lerp(accentB,t);rim.position.x=THREE.MathUtils.lerp(-6,6,t);
      renderer.render(world,camera);const now=performance.now(),dt=now-last;last=now;fpsFrames++;totalFrames++;totalTime+=dt;if(now-fpsTime>=500){fps=Math.round(fpsFrames*1000/(now-fpsTime));fpsFrames=0;fpsTime=now;const d={fps,averageFps:Math.round(totalFrames*1000/Math.max(1,totalTime)),activeScene:Math.round(pos),sceneId:scenes[Math.round(pos)].id,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,webgl:true,dpr:renderer.getPixelRatio(),timestamp:Date.now()};window.__CONVALT_DIAGNOSTICS__=d;setDiag(d)}raf=requestAnimationFrame(update)
    };update();
    const resize=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5))};window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);groups.forEach(g=>g.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.geometry.dispose();const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(x=>x.dispose())}));renderer.dispose();renderer.domElement.remove()}
  },[]);
  const qa=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('qa')==='1';
  return <>
    <header className="site-nav"><a className="brand" href="#hero">CONVALT <b>ENERGY</b></a><nav className="navlinks"><a href="#projects">Projects</a><a href="#team">Team</a><a href="#media">Media</a><a href="#resources">Resources</a><a href="#contact">Contact</a></nav></header>
    <div className="experience"><div className="canvas-shell" ref={mount}><div className="fallback"/></div><div className="veil"/><div className="hud"><span>{String(active+1).padStart(2,'0')} / 06</span><strong>{scenes[active].label}</strong></div><div className={'diag '+(qa?'show':'')}><div>FPS: {diag.fps}</div><div>AVG: {diag.averageFps}</div><div>SCENE: {diag.sceneId}</div><div>DRAWS: {diag.drawCalls}</div><div>TRIS: {diag.triangles}</div><div>DPR: {diag.dpr.toFixed(2)}</div><div>WEBGL: {diag.webgl?'PASS':'WAIT'}</div></div><div className="progress">{scenes.map((s,i)=><button key={s.id} className={i===active?'active':''} aria-label={'Go to '+s.label} onClick={()=>chapterRefs.current[i]?.scrollIntoView({behavior:'smooth'})}/>)}</div><main className="story">{scenes.map((s,i)=><section id={s.id} key={s.id} ref={n=>{chapterRefs.current[i]=n}} className={'chapter '+(s.side==='right'?'right':'')}><div className="copy"><div className="kicker">{s.kicker}</div>{i===0?<h1>{s.title}</h1>:<h2>{s.title}</h2>}<p>{s.body}</p><span className="cue">{i<5?'Scroll to explore':'Continue to project portfolio'}</span></div></section>)}</main></div>
    <section id="projects" className="below"><div className="kicker">Projects</div><h2>Energy infrastructure across four connected pillars.</h2><p>The conventional content layer follows the immersive sequence with fast, accessible information architecture.</p><div className="grid"><article className="card"><small>Manufacturing</small><div><h3>Solar manufacturing</h3><p>Integrated production and domestic supply-chain infrastructure.</p></div></article><article className="card"><small>Generation</small><div><h3>Power projects</h3><p>Utility-scale renewable generation and supporting grid systems.</p></div></article><article className="card"><small>Compute</small><div><h3>Data centers</h3><p>Energy-aligned digital infrastructure.</p></div></article></div></section>
    <section id="team" className="below dark"><div className="kicker">Team</div><h2>Built by operators.</h2><p>Leadership, development, operations and advisors presented through a clean, responsive directory layer.</p></section>
    <section id="media" className="below"><div className="kicker">Media</div><h2>News and announcements.</h2><p>Media, press releases and company updates remain semantic and indexable outside the immersive canvas.</p></section>
    <section id="resources" className="below dark"><div className="kicker">Resources</div><h2>Industry references.</h2><p>Manufacturing, policy, raw-material and supply-chain resources.</p></section>
    <section id="contact" className="below"><div className="kicker">Contact</div><h2>Start a conversation.</h2><p>Contact delivery credentials are configured independently of the public WebGL experience.</p></section>
    <footer className="footer"><span>Convalt Energy — Stage 6</span><span>Six-scene Next.js / Three.js runtime</span></footer>
  </>;
}

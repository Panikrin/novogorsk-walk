import * as THREE from './vendor/three.module.js';
import { RGBELoader } from './vendor/RGBELoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const $=id=>document.getElementById(id);
const canvas=$('world');
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('fatal').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5,Math.sqrt(2800000/(innerWidth*innerHeight))));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b8d0d8');
scene.fog=new THREE.Fog('#bbc7c9',48,105);
const camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.08,220);
camera.rotation.order='YXZ';
const colliders=[], doors=[], vehicles=[];
const materials={};
function mat(name,color,extra={}){return materials[name]=new THREE.MeshStandardMaterial({color,roughness:.78,...extra});}
const plaster=mat('plaster','#e5e4d9'),inside=mat('inside','#e9e4d7'),dark=mat('dark','#252c2a',{roughness:.46,metalness:.4}),cedar=mat('cedar','#a47747'),wood=mat('wood','#b88c5c'),oak=mat('oak','#b9a17d'),floorMat=mat('floor','#c9b291'),stone=mat('stone','#adb0a5'),linen=mat('linen','#c5c0ad'),sage=mat('sage','#7c8974'),white=mat('white','#eee9dc'),black=mat('black','#282e2d'),metal=mat('metal','#6a695c',{metalness:.8,roughness:.35}),soil=mat('soil','#423d2d'),grass=mat('grass','#76815a'),leaves=mat('leaves','#516a48'),glass=(materials.glass=new THREE.MeshPhysicalMaterial({color:'#a8b8bd',roughness:.065,metalness:.42,transmission:0,thickness:.025,ior:1.52,transparent:true,opacity:.40,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:1.15,depthWrite:false})),warm=mat('warm','#fff0cc',{emissive:'#ffcc80',emissiveIntensity:.5});
let seed=433;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
if(kind==='cedar'){x.fillStyle='#aa8053';x.fillRect(0,0,512,512);for(let y=0;y<512;y+=32){x.fillStyle=`rgba(50,31,16,${.05+rand()*.12})`;x.fillRect(0,y,512,30);x.fillStyle='#604c36';x.fillRect(0,y+30,512,2);for(let i=0;i<85;i++){x.fillStyle=`rgba(57,32,12,${rand()*.13})`;x.fillRect(rand()*512,y+rand()*29,12+rand()*160,.5+rand());}}}
if(kind==='floor'){x.fillStyle='#c8b496';x.fillRect(0,0,512,512);for(let row=0;row<8;row++){x.fillStyle=`rgba(73,46,18,${rand()*.12})`;x.fillRect(0,row*64,512,64);x.fillStyle='#9d8d73';x.fillRect(0,row*64,512,1);let split=rand()*350+80;x.fillRect(split,row*64,1,64);for(let i=0;i<140;i++){x.fillStyle=`rgba(85,62,32,${rand()*.08})`;x.fillRect(rand()*512,row*64+rand()*62,rand()*80,1);}}}
if(kind==='grass'){x.fillStyle='#7c8659';x.fillRect(0,0,512,512);for(let i=0;i<28000;i++){x.fillStyle=`rgba(${40+rand()*85},${60+rand()*70},${25+rand()*60},.23)`;x.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*4);}}
if(kind==='stone'){x.fillStyle='#aaa99c';x.fillRect(0,0,512,512);for(let i=0;i<18000;i++){x.fillStyle=rand()>.5?'#ffffff12':'#141b1710';x.fillRect(rand()*512,rand()*512,rand()*3+1,rand()*3+1);}x.fillStyle='#7d81762b';x.fillRect(0,0,512,2);x.fillRect(0,0,2,512);}
const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
// Local photographic PBR maps and a real daylight panorama, all CC0.
const assetLoader=new THREE.TextureLoader();
const pending=[];
function loadTex(name,color=false){const tex=assetLoader.load('./assets/'+name,undefined,undefined,()=>{console.warn('Material unavailable:',name);});tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)tex.colorSpace=THREE.SRGBColorSpace;return tex;}
function pbr(m,prefix,scale,normal=.4){m.map=loadTex(prefix+'-color.jpg',true);m.normalMap=loadTex(prefix+'-normal.jpg');m.roughnessMap=loadTex(prefix+'-roughness.jpg');m.normalScale.set(normal,normal);m.worldUV=scale;m.color.set('#ffffff');}
pbr(cedar,'cedar',[6,1.4],.22);for(const t of [cedar.map,cedar.normalMap,cedar.roughnessMap]){t.center.set(.5,.5);t.rotation=Math.PI/2;}cedar.color.set('#ffffff');cedar.roughness=.96;cedar.roughnessMap=null;cedar.envMapIntensity=.25;
cedar.onBeforeCompile=shader=>{shader.vertexShader='varying float vCladY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCladY=(modelMatrix*vec4(transformed,1.0)).y;');shader.fragmentShader='varying float vCladY;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat luma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(luma),diffuseColor.rgb,.5)*vec3(1.12,1.0,.85);float seam=fract(vCladY/0.105);diffuseColor.rgb*=mix(.28,1.0,smoothstep(.003,.026,seam));');};
pbr(grass,'lawn',[3.8,3.8],.65);grass.color.set('#59754b');grass.roughness=1;grass.roughnessMap=null;grass.envMapIntensity=.15;grass.normalScale.set(.25,.25);grass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat turf=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.045,.095,.025)*(.75+3.5*turf);');};
pbr(stone,'asphalt',[3.5,3.5],.4);stone.color.set('#9c9c92');stone.roughness=.95;
floorMat.map=texture('floor');floorMat.worldUV=[4,4];floorMat.color.set('#ffffff');
plaster.color.set('#eeeae2');plaster.roughness=.96;inside.color.set('#e5e1d5');
dark.color.set('#191b1b');dark.roughness=.32;dark.metalness=.65;
let environmentReady=false;
const environmentPromise=Promise.all([new Promise(resolve=>new RGBELoader().load('./assets/field-light.hdr',hdr=>{hdr.mapping=THREE.EquirectangularReflectionMapping;scene.environment=hdr;scene.environmentIntensity=.65;scene.environmentRotation.y=2.8;resolve();},undefined,()=>resolve())),new Promise(resolve=>assetLoader.load('./assets/field-background.jpg',bg=>{bg.colorSpace=THREE.SRGBColorSpace;bg.mapping=THREE.EquirectangularReflectionMapping;scene.background=bg;scene.backgroundIntensity=1;scene.backgroundRotation.y=2.8;environmentReady=true;resolve();},undefined,()=>resolve()))]);
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(w,h,d,x,y,z,m=inside,collision=false,parent=scene){let geo=boxGeo;if(m.worldUV){geo=boxGeo.clone();const uv=geo.attributes.uv,n=geo.attributes.normal,pos=geo.attributes.position,[su,sv]=m.worldUV;for(let i=0;i<uv.count;i++){let a,b;if(Math.abs(n.getX(i))>.5){a=pos.getZ(i)*d+z;b=pos.getY(i)*h+y;}else if(Math.abs(n.getY(i))>.5){a=pos.getX(i)*w+x;b=pos.getZ(i)*d+z;}else{a=pos.getX(i)*w+x;b=pos.getY(i)*h+y;}uv.setXY(i,a/su,b/sv);}uv.needsUpdate=true;}const mesh=new THREE.Mesh(geo,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=m!==glass;mesh.receiveShadow=true;parent.add(mesh);if(collision)colliders.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});return mesh;}
function cyl(r1,r2,h,x,y,z,m,parent=scene,segments=12){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function wallZ(a,b,z,y=0.2,h=3.1,m=inside){if(b>a)box(b-a,h,.22,(a+b)/2,y+h/2,z,m,true);}
function wallX(x,a,b,y=.2,h=3.1,m=inside){if(b>a)box(.22,h,b-a,x,y+h/2,(a+b)/2,m,true);}
function windowZ(x,z,w,h,sill,base=0.2,m=cedar){const top=base+3.1;box(w,sill,.22,x,base+sill/2,z,m,true);box(w,top-base-sill-h,.22,x,base+sill+h+(top-base-sill-h)/2,z,m,true);const cy=base+sill+h/2;box(w,h,.035,x,cy,z,glass,true);for(const xx of [x-w/2,x+w/2])box(.055,h,.13,xx,cy,z,dark);for(const yy of [cy-h/2,cy+h/2])box(w,.055,.13,x,yy,z,dark);if(w>1.8)for(let i=1;i<Math.ceil(w/1.5);i++)box(.045,h,.12,x-w/2+i*w/Math.ceil(w/1.5),cy,z,dark);}
function windowX(x,z,w,h,sill,base=.2,m=cedar){box(.22,sill,w,x,base+sill/2,z,m,true);const above=3.1-sill-h;box(.22,above,w,x,base+sill+h+above/2,z,m,true);const cy=base+sill+h/2;box(.035,h,w,x,cy,z,glass,true);for(const zz of [z-w/2,z+w/2])box(.13,h,.055,x,cy,zz,dark);for(const yy of [cy-h/2,cy+h/2])box(.13,.055,w,x,yy,z,dark);if(w>1.8)box(.12,h,.045,x,cy,z,dark);}
function door({name,x,z,w=1.15,h=2.5,y=.2,angle=0,sign=1,glazed=false,lift=false}){const pivot=new THREE.Group();pivot.position.set(x,y,z);pivot.rotation.y=angle;scene.add(pivot);const leaf=new THREE.Group();pivot.add(leaf);const m=glazed?glass:lift?dark:wood;box(w,h,.075,w/2,h/2,0,m,false,leaf);for(const xx of [.035,w-.035])box(.065,h,.10,xx,h/2,0,glazed?dark:oak,false,leaf);for(const yy of [.04,h-.04])box(w,.07,.10,w/2,yy,0,glazed?dark:oak,false,leaf);
if(!lift){box(.055,.33,.14,w-.16,1.12,.07,metal,false,leaf);box(.055,.33,.14,w-.16,1.12,-.07,metal,false,leaf);}
else{for(let yy=.3;yy<h;yy+=.38)box(w,.012,.085,w/2,yy,0,dark,false,leaf);}
const d={name,pivot,leaf,x,z,w,h,y,base:angle,sign,open:false,t:0,lift,glazed};doors.push(d);return d;}
function doorwayZ(a,z,w,name,base=.2,glazed=false,sign=1,h=2.5){box(w+.14,.10,.30,a+w/2,base+h+.05,z,dark);box(w,3.1-h-.1,.22,a+w/2,base+h+.1+(3.1-h-.1)/2,z,base>1?plaster:inside,true);return door({name,x:a,z,w,y:base,glazed,sign,h});}
function doorwayX(x,a,w,name,base=.2,sign=1){box(.30,.10,w+.14,x,base+2.55,a+w/2,dark);box(.22,.5,w,x,base+2.85,a+w/2,inside,true);return door({name,x,z:a,w,y:base,angle:-Math.PI/2,sign});}

scene.add(new THREE.HemisphereLight('#c8ddeb','#636c4d',.48));
scene.add(new THREE.AmbientLight('#ddd8ce',.08));
const sun=new THREE.DirectionalLight('#fff4df',2.5);sun.position.set(-25,30,22);sun.castShadow=true;sun.shadow.mapSize.set(matchMedia('(max-width:600px)').matches?2048:4096,matchMedia('(max-width:600px)').matches?2048:4096);Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:90});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
const sky=new THREE.Mesh(new THREE.SphereGeometry(190,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#8bb5d1')},bottom:{value:new THREE.Color('#e9e8d9')}},vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vPos;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(vPos).y*.9+.15,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.65)),1.);}'}));sky.material.fog=false;// A gradient remains only as a fallback if the HDR cannot load.
scene.add(sky);environmentPromise.then(()=>{if(environmentReady)scene.remove(sky);});
box(512,.20,512,0,-.18,0,grass);
box(48,.06,42,0,-.04,-1,grass);
// Large asphalt apron and a narrow entrance path, as in the reference.
box(48,.065,8,0,-.008,24,stone);
box(4.0,.055,17,5.05,.015,13.5,stone);
box(10.5,.055,16.0,11.25,.018,16,stone);
box(15,.055,1.15,0,.015,-5.65,stone);
box(.8,.055,10.9,-7.4,.015,0,stone);
const fence=mat('fence','#302e26');
wallZ(-24,24,-20,0,1.75,fence);wallX(-24,-20,20,0,1.75,fence);wallX(24,-20,20,0,1.75,fence);
// Narrow vertical joints make the fence read as metal panels.
for(let x=-24;x<24;x+=.8)box(.012,1.72,.02,x,.88,-19.88,dark);
for(let z=-20;z<20;z+=.8){box(.02,1.72,.012,-23.88,.88,z,dark);box(.02,1.72,.012,23.88,.88,z,dark);}
// The first floor is cedar, while the wider white volume overhangs it.
box(14,.2,10,0,.1,0,dark);box(7.5,.2,11,10.75,.1,2.5,dark);
box(13.8,.06,9.8,0,.23,0,floorMat);box(7.3,.06,10.8,10.75,.23,2.5,stone);
wallZ(-7,-3.5,5,.2,3.1,cedar);windowZ(-3.2,5,.6,2.65,.08);wallZ(-2.9,-.7,5,.2,3.1,cedar);windowZ(1.3,5,4,2.65,.08);wallZ(3.3,3.9,5,.2,3.1,cedar);doorwayZ(3.9,5,1.25,'Входная дверь',.2,true,1,2.65);windowZ(5.875,5,1.45,2.65,.08);wallZ(6.6,7,5,.2,3.1,cedar);
// Rear elevation includes tall and horizontal glazing.
windowZ(-6.15,-5,1.7,2.65,.08);wallZ(-5.3,-4.5,-5,.2,3.1,cedar);windowZ(-2.2,-5,4.6,2.55,.1);wallZ(.1,.4,-5,.2,3.1,cedar);doorwayZ(.4,-5,1.25,'Дверь в сад',.2,true,1);wallZ(1.65,7,-5,.2,3.1,cedar);
// The left end has two slender windows and corner glazing.
windowX(-7,-4.65,.7,2.65,.08);wallX(-7,-4.3,-.7,.2,3.1,cedar);windowX(-7,-.4,.6,2.65,.08);wallX(-7,-.1,.8,.2,3.1,cedar);windowX(-7,1.1,.6,2.65,.08);wallX(-7,1.4,5,.2,3.1,cedar);
wallX(7,-5,-3,.2,3.1,cedar);wallX(7,-3,1.2);doorwayX(7,1.2,1.2,'Дверь в гараж',.2,1);wallX(7,2.4,8,.2,3.1,cedar);
// A deeper garage projects towards the driveway and forms the entry alcove.
wallZ(7,14.5,-3,.2,3.1,cedar);wallX(14.5,-3,-1.3,.2,3.1,cedar);windowX(14.5,.15,2.9,1.2,1.08);wallX(14.5,1.6,2.1,.2,3.1,cedar);windowX(14.5,2.4,.6,2.45,.1);wallX(14.5,2.7,3.35,.2,3.1,cedar);windowX(14.5,3.65,.6,2.45,.1);wallX(14.5,3.95,8,.2,3.1,cedar);
wallZ(7,8.8,8,.2,3.1,cedar);wallZ(13.2,14.5,8,.2,3.1,cedar);box(4.4,.55,.22,11,3.025,8,cedar,true);door({name:'Гаражные ворота',x:8.8,z:8,w:4.4,h:2.55,y:.2,lift:true});
box(7.72,.12,11.2,10.75,3.37,2.5,cedar);box(7.7,.045,11.2,10.75,3.45,2.5,dark);
for(const [xx,ww] of [[1.3,4],[5.875,1.45]])box(ww,.048,.14,xx,2.52,5.035,dark);
// Ground floor partitions: living room, bedroom, study and hall.
wallZ(-7,-4.9,-.6);doorwayZ(-4.9,-.6,1.2,'Дверь спальни');wallZ(-3.7,.1,-.6);doorwayZ(.1,-.6,1.2,'Дверь кабинета');wallZ(1.3,2.8,-.6);
wallX(-2,-5,-.6);wallX(2.8,-5,-2.5);doorwayX(2.8,-2.5,1.2,'Дверь кабинета из холла',.2,-1);wallX(2.8,-1.3,-.6);
// Upper floor: no balcony. The stair opening is preserved.
box(10.6,.20,10.7,-2.0,3.39,.1,plaster,true);box(3.1,.20,10.7,6.95,3.39,.1,plaster,true);
box(2.1,.20,1.3,4.35,3.39,-4.65,plaster,true);box(2.1,.20,4.05,4.35,3.39,3.425,plaster,true);
box(10.5,.035,10.5,-2,3.51,.1,floorMat);box(3,.035,10.5,6.95,3.51,.1,floorMat);box(2.05,.035,1.2,4.35,3.51,-4.65,floorMat);box(2.05,.035,3.95,4.35,3.51,3.425,floorMat);
// Deep dark reveals and alternating cedar infills define the characteristic front strip.
function bandZ(z,start,width,pattern,base=3.5){const left=-7.3,right=8.5,sill=.78,h=1.82;wallZ(left,start,z,base,3.1,plaster);wallZ(start+width,right,z,base,3.1,plaster);box(width,sill,.24,start+width/2,base+sill/2,z,plaster,true);box(width,3.1-sill-h,.24,start+width/2,base+sill+h+(3.1-sill-h)/2,z,plaster,true);const sign=z>0?1:-1;const sum=pattern.reduce((a,b)=>a+b[1],0);let cursor=start;for(const [type,len] of pattern){const w=len/sum*width,cy=base+sill+h/2;if(type==='wood')box(w,h,.13,cursor+w/2,cy,z+sign*.025,cedar,true);else{box(w,h,.035,cursor+w/2,cy,z,glass,true);if(w>1.8)box(.047,h,.13,cursor+w*.72,cy,z+sign*.055,dark);box(w,.045,.13,cursor+w/2,base+sill+.30,z+sign*.055,dark);}box(.055,h+.10,.18,cursor,cy,z+sign*.045,dark);cursor+=w;}box(.06,h+.10,.18,cursor,base+sill+h/2,z+sign*.045,dark);for(const yy of [base+sill,base+sill+h])box(width+.10,.065,.22,start+width/2,yy,z+sign*.05,dark);}
bandZ(5.45,-5.8,11.2,[['glass',2.4],['wood',.65],['glass',1.25],['wood',.7],['glass',1.2],['wood',.65],['glass',1.85],['wood',1.7],['glass',.55]]);
bandZ(-5.25,-5.8,11.2,[['glass',1.5],['wood',.75],['glass',2.0],['wood',.6],['glass',1.4],['wood',.6],['glass',2.2]]);
// Cedar shutters and a slim centre light on the two short ends.
function endWall(x){wallX(x,-5.25,-1.9,3.5,3.1,plaster);wallX(x,1.3,5.45,3.5,3.1,plaster);windowX(x,-.3,3.2,1.82,.78,3.5,plaster);const side=x<0?-1:1;box(.13,1.78,1.03,x+side*.045,5.19,-1.355,cedar,true);box(.13,1.78,1.56,x+side*.045,5.19,.52,cedar,true);box(.16,1.84,.06,x+side*.055,5.19,-.76,dark);box(.16,1.84,.06,x+side*.055,5.19,-.23,dark);}
endWall(-7.3);endWall(8.5);
box(16.05,.16,10.9,.6,6.68,.1,plaster,true);box(16.08,.045,10.93,.6,6.785,.1,dark);
wallX(-1,-5,.2,3.5);doorwayX(-1,.2,1.2,'Дверь большой спальни',3.5,-1);wallX(-1,1.4,5.45,3.5);
wallZ(-1,.2,-1.3,3.5);doorwayZ(.2,-1.3,1.2,'Дверь комнаты отдыха',3.5);wallZ(1.4,3.1,-1.3,3.5);
// Stairs: eighteen shallow treads, walking height follows their slope.
for(let i=0;i<18;i++){const z=1.4-(i+.5)*.3;const top=.26+(i+1)*3.24/18;box(1.8,.13,.32,4.35,top-.065,z,oak);box(1.8,top-.26,.045,4.35,.26+(top-.26)/2,z+.145,inside);}
function railingX(x,z1,z2,base,h=1.02){for(let z=z1;z<=z2;z+=.68)cyl(.017,.017,h,x,base+h/2,z,dark);box(.045,.045,z2-z1,x,base+h,(z1+z2)/2,dark);colliders.push({minX:x-.06,maxX:x+.06,minY:base,maxY:base+h,minZ:z1,maxZ:z2});}
function railingZ(z,x1,x2,base,h=1.02){for(let x=x1;x<=x2;x+=.75)cyl(.017,.017,h,x,base+h/2,z,dark);box(x2-x1,.045,.045,(x1+x2)/2,base+h,z,dark);colliders.push({minX:x1,maxX:x2,minY:base,maxY:base+h,minZ:z-.06,maxZ:z+.06});}
railingX(3.28,-3.95,1.4,3.5);railingX(5.43,-3.95,1.4,3.5);

// A sloping handrail follows the stairs.
for(let i=0;i<=9;i++){let z=1.4-i*.6, y=.26+i*.36;cyl(.014,.014,.9,3.4,y+.45,z,dark);}
const rail=box(.035,.035,6.35,3.4,2.79,-1.3,dark);rail.rotation.x=-Math.atan(3.24/5.4);
// Furniture is deliberately schematic, with warm materials and clear walking routes.
function plant(x,z,y=.26,scale=1){cyl(.22*scale,.16*scale,.42*scale,x,y+.21*scale,z,stone);cyl(.032*scale,.045*scale,.9*scale,x,y+.75*scale,z,wood);for(let i=0;i<7;i++){const a=i*2.4;const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),leaves);mesh.scale.set(.19*scale,.42*scale,.10*scale);mesh.position.set(x+Math.sin(a)*.17*scale,y+(.85+i*.05)*scale,z+Math.cos(a)*.17*scale);mesh.rotation.z=Math.sin(a)*.65;mesh.rotation.x=Math.cos(a)*.65;mesh.castShadow=true;scene.add(mesh);}}
function rug(x,z,w,d,y=.27){box(w,.018,d,x,y,z,linen);for(let i=0;i<9;i++)box(w-.12,.003,.013,x,y+.011,z-d/2+.16+i*(d-.32)/8,sage);}
function sofa(x,z,y=.26){box(3,.42,1.05,x,y+.28,z,linen,true);box(3,.65,.22,x,y+.7,z-.46,sage);box(.22,.64,1.08,x-1.42,y+.48,z,sage);box(.22,.64,1.08,x+1.42,y+.48,z,sage);for(let i=0;i<3;i++){box(.83,.18,.83,x-.9+i*.9,y+.54,z+.02,white);const p=box(.43,.43,.15,x-.95+i*.95,y+.86,z-.24,linen);p.rotation.z=i%2?.18:-.15;}for(let dx of [-1.18,1.18])for(let dz of [-.34,.34])cyl(.025,.025,.18,x+dx,y+.09,z+dz,dark);}
function chair(x,z,y=.26,angle=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;scene.add(g);box(.58,.1,.58,0,.48,0,oak,false,g);box(.58,.53,.075,0,.75,-.25,sage,false,g);for(let xx of [-.22,.22])for(let zz of [-.22,.22])box(.035,.48,.035,xx,.24,zz,dark,false,g);}
function table(x,z,w=1.5,d=.8,y=.26){box(w,.09,d,x,y+.75,z,oak,true);for(let xx of [-w*.4,w*.4])for(let zz of [-d*.36,d*.36])box(.045,.7,.045,x+xx,y+.35,z+zz,dark);}
function bed(x,z,y=.26,w=2){box(w,.33,2.3,x,y+.26,z,wood,true);box(w+.08,.84,.10,x,y+.55,z-1.13,sage);box(w-.07,.2,2.17,x,y+.51,z,white);box(w-.04,.045,1.3,x,y+.64,z+.36,linen);for(let dx of [-w*.24,w*.24])box(w*.4,.14,.44,x+dx,y+.67,z-.7,white);for(let dx of [-w*.72,w*.72]){box(.42,.47,.42,x+dx,y+.24,z-.84,oak);cyl(.11,.13,.20,x+dx,y+.73,z-.84,warm);cyl(.018,.018,.14,x+dx,y+.56,z-.84,dark);}}
function art(x,z,y,w=1.1,h=.8,orientation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=orientation;scene.add(g);box(w+.06,h+.06,.045,0,0,0,oak,false,g);box(w,h,.016,0,0,.028,white,false,g);box(w*.42,h*.62,.01,-w*.15,0,.04,sage,false,g);const circle=new THREE.Mesh(new THREE.CircleGeometry(h*.21,30),new THREE.MeshBasicMaterial({color:'#bd8c5f'}));circle.position.set(w*.17,h*.1,.048);g.add(circle);}
function ceilingLamp(x,z,y=3.24){const mesh=cyl(.40,.46,.17,x,y-.13,z,white);cyl(.37,.40,.02,x,y-.22,z,warm);const light=new THREE.PointLight('#ffe8c4',5,7,2);light.position.set(x,y-.32,z);scene.add(light);return mesh;}
// Living and dining.
rug(-3.8,2.5,4.1,3.4);sofa(-3.7,1.05);box(1.5,.11,.72,-3.65,.7,2.7,oak,true);for(let xx of [-4.2,-3.1])box(.04,.35,.46,xx,.48,2.7,dark);cyl(.16,.20,.1,-3.9,.8,2.65,stone);box(.36,.04,.26,-3.2,.79,2.7,sage);
box(2.4,.48,.4,-5.3,.5,4.52,oak,true);box(1.6,.94,.06,-5.3,1.43,4.65,black);box(.09,.25,.10,-5.3,.91,4.63,dark);plant(-6.25,4.35);plant(-6.35,.1,.26,.85);
table(.9,2.3,1.65,.86);for(let xx of [.37,1.4]){chair(xx,1.55);chair(xx,3.05,.26,Math.PI);}cyl(.12,.10,.32,.9,1.2,2.3,stone);plant(2.1,4.45,.26,.8);
// Kitchen against a solid partition, leaving the study doorway clear.
box(3,.85,.62,-1.9,.685,-.14,white,true);box(3.08,.055,.69,-1.9,1.14,-.14,stone);for(let xx of [-3.05,-2.4,-1.75,-1.1,-.5])box(.01,.65,.02,xx,.69,.18,oak);box(.55,.015,.4,-2.6,1.18,-.10,dark);for(let xx of [-2.76,-2.44])for(let zz of [-.2,.02])cyl(.075,.075,.008,xx,1.19,zz,black);box(.6,.015,.36,-1.2,1.18,-.12,metal);cyl(.025,.025,.25,-1,1.31,-.25,metal);box(.20,.035,.035,-1.08,1.44,-.25,metal);
// Ground floor bedroom and study.
bed(-5,-3.25,.26,1.75);box(1.55,2.45,.6,-2.45,1.49,-3.7,oak,true);for(let zz of [-4.05,-3.34])box(.03,.38,.03,-2.13,1.55,zz,dark);art(-5,-.73,1.8,1.2,.75,Math.PI);plant(-6.3,-4.2,.26,.8);
table(-.65,-3.95,1.7,.7);chair(-.65,-3.05,.26,Math.PI);box(.75,.45,.045,-.65,1.46,-4.02,dark);box(.06,.18,.08,-.65,1.14,-4.02,dark);box(.5,.025,.17,-.65,1.07,-3.74,dark);box(.7,1.8,.3,2.24,1.16,-4,oak,true);for(let yy of [.6,1.15,1.75]){box(.7,.04,.3,2.24,yy,-4,wood);for(let j=0;j<4;j++)box(.08,.3,.18,2+j*.14,yy+.17,-4,j%2?white:sage);}plant(-1.45,-4.4,.26,.65);
// Entry hall.
box(.38,.6,1.55,6.54,.56,3.7,oak,true);art(6.84,3.5,1.82,1.0,1.25,-Math.PI/2);plant(6.3,-4.25);rug(4.5,3.5,1.6,1.8);ceilingLamp(4.55,3.3);ceilingLamp(-3.5,2.1);ceilingLamp(.3,-3.1);
// Upstairs, two invented rooms and a sitting area.
bed(-4.2,-2.55,3.52,2.15);rug(-4.1,-1.8,3.7,3.6,3.54);box(.6,2.2,2.5,-6.5,4.62,.9,oak,true);art(-3.4,-4.86,5.0,1.65,1.0,0);plant(-1.65,-4.25,3.52,.9);table(-3.2,2.45,1.2,.6,3.52);chair(-3.2,1.7,3.52,0);
sofa(1.05,.5,3.52);rug(1,1.4,3.2,2.2,3.54);box(1.15,.08,.65,.9,4.02,1.65,oak,true);box(.65,.5,1.8,2.6,3.8,-3.35,oak,true);box(.66,.1,1.8,2.6,4.11,-3.35,white);art(.65,-4.86,5.2,1.0,.8);plant(1.9,2.9,3.52,.8);ceilingLamp(-4,-1.5,6.55);ceilingLamp(.7,1.2,6.55);
// Terrace furniture.
table(-3.5,-7.3,1.65,.85,.08);chair(-3.5,-6.45,.08,0);chair(-3.5,-8.1,.08,Math.PI);plant(-6.5,-6.9,.08,1.3);plant(2.5,-7.5,.08,1.3);
// Fine geometric grass sits on top of the photographic ground material.
const bladeGeo=new THREE.BufferGeometry();
bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.012,0,0,.012,0,0,-.008,.56,.025,.008,.56,.025,.002,1,.065],3));
bladeGeo.setAttribute('color',new THREE.Float32BufferAttribute([.23,.34,.16,.23,.34,.16,.44,.55,.28,.44,.55,.28,.64,.69,.43],3));
bladeGeo.setIndex([0,1,2,1,3,2,2,3,4]);bladeGeo.computeVertexNormals();
const bladeMat=new THREE.MeshStandardMaterial({color:'#a9b88c',roughness:.98,side:THREE.DoubleSide,vertexColors:true});
const bladeLimit=matchMedia('(max-width:600px)').matches?65000:160000;const blades=new THREE.InstancedMesh(bladeGeo,bladeMat,bladeLimit);const bladeDummy=new THREE.Object3D();let bladeCount=0;
for(let i=0;i<220000&&bladeCount<bladeLimit;i++){const x=-23.6+rand()*47.2,z=-19.5+rand()*42.5;
const main=x>-7.6&&x<7.3&&z>-5.9&&z<5.35,garage=x>6.8&&x<14.9&&z>-3.3&&z<8.3,drive=z>20||(x>3.0&&x<7.1&&z>5)||(x>6.0&&x<16.7&&z>7.95),rear=x>-7.8&&x<7.8&&z>-6.3&&z<-5.0,side=x>-7.9&&x<-6.9&&z>-5.7&&z<5.4;
if(main||garage||drive||rear||side)continue;bladeDummy.position.set(x,.005,z);bladeDummy.rotation.set(0,rand()*Math.PI*2,0);bladeDummy.scale.set(.65+rand()*.9,.10+rand()*.13,.7+rand()*.6);bladeDummy.updateMatrix();blades.setMatrixAt(bladeCount,bladeDummy.matrix);blades.setColorAt(bladeCount,new THREE.Color().setHSL(.22+rand()*.06,.16+rand()*.18,.45+rand()*.13));bladeCount++;}
blades.count=bladeCount;blades.receiveShadow=true;blades.castShadow=false;blades.computeBoundingSphere();scene.add(blades);
// Soft local contact shadows strengthen the connection with the ground.
const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;const aoCtx=aoCanvas.getContext('2d'),aoGrad=aoCtx.createRadialGradient(64,64,12,64,64,64);aoGrad.addColorStop(0,'rgba(0,0,0,.58)');aoGrad.addColorStop(.52,'rgba(0,0,0,.27)');aoGrad.addColorStop(1,'rgba(0,0,0,0)');aoCtx.fillStyle=aoGrad;aoCtx.fillRect(0,0,128,128);const aoTex=new THREE.CanvasTexture(aoCanvas);
function contact(x,z,w,d,opacity=.35){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:aoTex,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));o.rotation.x=-Math.PI/2;o.position.set(x,.055,z);scene.add(o);return o;}
contact(0,0,18,13,.4);contact(10.75,2.5,10.5,13.5,.35);
// Two dark parked vehicles reproduce the scale and placement seen in the source.
const carPaint=new THREE.MeshPhysicalMaterial({color:'#171c20',metalness:.78,roughness:.22,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:1.2});
const carWindow=new THREE.MeshPhysicalMaterial({color:'#233137',metalness:.18,roughness:.07,clearcoat:1,envMapIntensity:1.7});
const rubber=new THREE.MeshStandardMaterial({color:'#161719',roughness:.93});
const silver=new THREE.MeshStandardMaterial({color:'#8e9498',metalness:1,roughness:.25});
const lightLens=new THREE.MeshPhysicalMaterial({color:'#d7e2df',roughness:.10,metalness:.3,clearcoat:1});
const tailLens=new THREE.MeshStandardMaterial({color:'#8e1914',roughness:.28,metalness:.15});
function rounded(w,h,d,x,y,z,m,parent,r=.08){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function parkedCar(x,z,suv=false,angle=0){const g=new THREE.Group();g.position.set(x,.08,z);g.rotation.y=angle;scene.add(g);const lift=suv?.15:0;
rounded(1.90,.50,4.35,0,.62+lift,0,carPaint,g,.16);rounded(1.88,.28,4.15,0,.91+lift,-.02,carPaint,g,.15);rounded(1.88,.14,1.10,0,1.04+lift,1.35,carPaint,g,.08);
// Sloped greenhouse, with separate reflective glass faces and painted roof.
const roof=suv?1.85:1.58,back=suv?-1.30:-.97;
const v=[[-.91,1.0+lift,-1.5],[.91,1.0+lift,-1.5],[.91,1.0+lift,1.1],[-.91,1.0+lift,1.1],[-.72,roof,back],[.72,roof,back],[.72,roof,.50],[-.72,roof,.50]];
for(const [face,m] of [[[0,1,5,4],carWindow],[[1,2,6,5],carWindow],[[2,3,7,6],carWindow],[[4,5,6,7],carPaint]]){const geo=new THREE.BufferGeometry();const a=face.flatMap(i=>v[i]);geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;g.add(mesh);}
for(const sx of [-1,1]){box(.035,.52,.07,sx*.84,1.29+lift,-.25,carPaint,false,g);box(.04,.025,2.40,sx*.935,1.0+lift,-.1,silver,false,g);rounded(.20,.12,.32,sx*1.04,1.13+lift,.68,carPaint,g,.04);box(.13,.025,.05,sx*.95,.92+lift,.15,silver,false,g);box(.11,.025,.05,sx*.95,.92+lift,-.84,silver,false,g);}
const wheelRoots=[],wheelSpins=[];
for(const xx of [-.99,.99])for(const zz of [-1.35,1.35]){const root=new THREE.Group();root.position.set(xx,.37+lift,zz);g.add(root);const spin=new THREE.Group();root.add(spin);wheelRoots.push({root,front:zz>0});wheelSpins.push(spin);const tyre=cyl(.345,.345,.23,0,0,0,rubber,spin,28);tyre.rotation.z=Math.PI/2;const rim=cyl(.235,.235,.245,0,0,0,silver,spin,28);rim.rotation.z=Math.PI/2;const hub=cyl(.065,.065,.255,0,0,0,dark,spin,16);hub.rotation.z=Math.PI/2;for(let k=0;k<7;k++){const a=k*Math.PI*2/7;const spoke=box(.25,.025,.18,0,Math.sin(a)*.105,Math.cos(a)*.105,dark,false,spin);spoke.rotation.x=-a;}}
rounded(1.48,.19,.025,0,.62+lift,2.185,dark,g,.03);for(const xx of [-.67,.67]){rounded(.46,.12,.035,xx,.91+lift,2.17,lightLens,g,.03);rounded(.51,.11,.035,xx,.91+lift,-2.17,tailLens,g,.025);}box(.46,.11,.02,0,.55+lift,2.21,white,false,g);box(.52,.025,.035,0,.82+lift,2.2,silver,false,g);
if(suv){for(const xx of [-.65,.65])box(.04,.05,1.7,xx,roof+.055,-.28,silver,false,g);}
// Door and cabin remain in the vehicle's own coordinate system.
const doorPivot=new THREE.Group();doorPivot.position.set(-.97,0,1.02);g.add(doorPivot);
rounded(.065,.49,1.67,-.01,.80+lift,-.81,carPaint,doorPivot,.035);
const driverGlass=new THREE.BufferGeometry();driverGlass.setAttribute('position',new THREE.Float32BufferAttribute([.055,1.0+lift,-1.66,.055,1.0+lift,.05,.25,roof,.50-1.02,.25,roof,-.38-1.02],3));driverGlass.setIndex([0,1,2,0,2,3]);driverGlass.computeVertexNormals();doorPivot.add(new THREE.Mesh(driverGlass,carWindow));
box(.055,.035,1.67,-.025,1.01+lift,-.81,silver,false,doorPivot);box(.06,.42,.055,.15,1.22+lift,-1.61,carPaint,false,doorPivot);box(.08,.035,.18,-.055,.94+lift,-1.28,silver,false,doorPivot);
// Rear fixed side glazing fills the space behind the opening door.
const rearGlass=new THREE.BufferGeometry();rearGlass.setAttribute('position',new THREE.Float32BufferAttribute([-.91,1.0+lift,-1.5,-.91,1.0+lift,-.6,-.72,roof,-.38,-.72,roof,back],3));rearGlass.setIndex([0,1,2,0,2,3]);rearGlass.computeVertexNormals();g.add(new THREE.Mesh(rearGlass,carWindow));
const leather=new THREE.MeshStandardMaterial({color:'#202423',roughness:.7});
for(const seatX of [-.42,.42]){rounded(.61,.17,.72,seatX,.73+lift,-.12,leather,g,.07);const backrest=rounded(.61,.63,.17,seatX,1.11+lift,-.52,leather,g,.07);backrest.rotation.x=-.10;rounded(.35,.23,.15,seatX,1.51+lift,-.55,leather,g,.05);}
rounded(1.65,.28,.35,0,1.02+lift,.77,leather,g,.07);box(.28,.22,.65,0,.69+lift,.12,leather,false,g);cyl(.022,.022,.16,.04,.91+lift,.14,silver,g);rounded(.07,.07,.09,.04,1.00+lift,.14,leather,g,.02);
const steering=new THREE.Group();steering.position.set(-.42,1.04+lift,.40);steering.rotation.x=-.20;g.add(steering);const wheel=new THREE.Mesh(new THREE.TorusGeometry(.18,.018,10,32),leather);steering.add(wheel);for(let k=0;k<3;k++){const a=k*Math.PI*2/3;const spoke=box(.025,.15,.025,Math.sin(a)*.08,Math.cos(a)*.08,0,silver,false,steering);spoke.rotation.z=-a;}cyl(.045,.045,.05,-.42,1.04+lift,.40,leather,g);
box(1.43,.035,1.15,0,roof-.035,-.22,leather,false,g);
const screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=192;const screenCtx=screenCanvas.getContext('2d'),screenTex=new THREE.CanvasTexture(screenCanvas);screenTex.colorSpace=THREE.SRGBColorSpace;const screen=new THREE.Mesh(new THREE.PlaneGeometry(.46,.17),new THREE.MeshBasicMaterial({map:screenTex}));screen.position.set(-.42,1.09+lift,.575);screen.rotation.y=Math.PI;g.add(screen);
g.userData.dynamicVehicle=true;

const vehicle={id:vehicles.length,name:suv?'Внедорожник':'Купе',group:g,doorPivot,doorOpen:false,doorT:0,steering,wheelRoots,wheelSpins,screenCtx,screenTex,suv,lift,x,z,heading:angle,initial:{x,z,heading:angle},speed:0,steer:0,distance:0,lastImpact:0,halfW:1.06,halfL:2.32};
vehicle.collider={minX:x-1.6,maxX:x+1.6,minY:0,maxY:2.1,minZ:z-2.6,maxZ:z+2.6,vehicleId:vehicle.id};colliders.push(vehicle.collider);vehicles.push(vehicle);vehicle.shadow=contact(x,z,3.3,5.8,.35);return vehicle;}
parkedCar(9.4,12.5,false,-.27);parkedCar(13.25,12.7,true,-.27);

// Batch static geometry by material. Moving door leaves remain separate.
scene.updateMatrixWorld(true);
function batchVehiclePart(root,exclude=new Set()){root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),groups=new Map();function skip(m){for(let p=m;p&&p!==root;p=p.parent)if(exclude.has(p))return true;return false;}root.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||m.material.transparent||skip(m))return;const k=m.material.uuid+'|'+Object.keys(m.geometry.attributes).sort().join(',');if(!groups.has(k))groups.set(k,{material:m.material,meshes:[]});groups.get(k).meshes.push(m);});for(const {material,meshes} of groups.values()){if(meshes.length<2)continue;const geos=meshes.map(m=>{const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld));return g;}),g=mergeGeometries(geos,false);if(g){const merged=new THREE.Mesh(g,material);merged.castShadow=true;merged.receiveShadow=true;root.add(merged);meshes.forEach(m=>m.removeFromParent());}geos.forEach(g=>g.dispose());}}
for(const v of vehicles){batchVehiclePart(v.group,new Set([v.doorPivot,v.steering,...v.wheelRoots.map(w=>w.root)]));for(const spin of v.wheelSpins)batchVehiclePart(spin);batchVehiclePart(v.doorPivot);batchVehiclePart(v.steering);}
const movingRoots=new Set([...doors.map(d=>d.pivot),...vehicles.map(v=>v.group)]),batches=new Map();
function movingMesh(m){for(let p=m;p;p=p.parent)if(movingRoots.has(p))return true;return false;}
scene.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||m===sky||movingMesh(m)||Array.isArray(m.material)||m.material.transparent||m.material.isShaderMaterial)return;const key=m.material.uuid+'|'+Object.keys(m.geometry.attributes).sort().join(',');if(!batches.has(key))batches.set(key,{material:m.material,objects:[]});batches.get(key).objects.push(m);});
for(const {material,objects} of batches.values()){if(objects.length<2)continue;const geos=objects.map(m=>{const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);return g;});const g=mergeGeometries(geos,false);if(g){const merged=new THREE.Mesh(g,material);merged.castShadow=true;merged.receiveShadow=true;scene.add(merged);for(const m of objects)m.removeFromParent();}for(const g of geos)g.dispose();}

// Walking, collision and interaction.
let activeVehicle=null,nearVehicle=null,chaseView=false,brakeHeld=false;
let playing=false,yaw=.25,pitch=-.01,walkFloor=.26,currentDoor=null,sound=false,stepPhase=0;
const player=new THREE.Vector3(13,.26,19),keys=new Set(),joy={x:0,y:0};
const spawn={x:-13,z:25,yaw:Math.atan2(-17.525,20),pitch:.025};
let toastTimer=0,last=performance.now(),startedAt=0;
function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function reset(){sun.position.set(-25,30,22);sun.target.position.set(0,0,0);sun.target.updateMatrixWorld();renderer.shadowMap.needsUpdate=true;activeVehicle=null;nearVehicle=null;chaseView=false;brakeHeld=false;document.body.classList.remove('driving');$('drivePanel').hidden=true;camera.fov=61;camera.updateProjectionMatrix();for(const v of vehicles){v.x=v.initial.x;v.z=v.initial.z;v.heading=v.initial.heading;v.speed=0;v.steer=0;v.doorOpen=false;v.doorT=0;v.group.position.set(v.x,.08,v.z);v.group.rotation.y=v.heading;v.doorPivot.rotation.y=0;v.group.updateMatrixWorld(true);updateVehicleCollider(v);drawDashboard(v);}player.set(spawn.x,.26,spawn.z);yaw=spawn.yaw;pitch=spawn.pitch;walkFloor=.26;keys.clear();joy.x=joy.y=0;for(const d of doors){d.open=false;d.t=0;updateDoor(d);}camera.position.set(player.x,player.y+1.66,player.z);camera.rotation.set(pitch,yaw,0);updateHUD();}
function hitDoor(d,x,z,r,y){if(y+1.45<d.y||y>d.y+d.h)return false;if(d.lift){if(d.t>.83)return false;return x>d.x-r&&x<d.x+d.w+r&&Math.abs(z-d.z)<r+.055;}
const a=d.base+d.sign*(d.t*d.t*(3-2*d.t))*Math.PI/2,c=Math.cos(a),s=Math.sin(a),dx=x-d.x,dz=z-d.z,lx=c*dx-s*dz,lz=s*dx+c*dz;return lx>-r&&lx<d.w+r&&Math.abs(lz)<r+.055;}
function blocked(x,z,y){const r=.24;if(x<-205||x>205||z<-205||z>205)return true;for(const b of colliders){if(y+.15>=b.maxY||y+1.55<=b.minY)continue;if(x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)return true;}return doors.some(d=>hitDoor(d,x,z,r,y));}
function floorAt(x,z){if(x>3.4&&x<5.3&&z>-4.12&&z<1.55)return .26+THREE.MathUtils.clamp((1.4-z)/5.4,0,1)*3.24;const upstairs=walkFloor>2.0;if(upstairs){if(x>=-7.3&&x<=8.5&&z>=-5.25&&z<=5.45)return 3.5;return null;}return .26;}
function tryMove(dx,dz){for(const axis of ['x','z']){const nx=player.x+(axis==='x'?dx:0),nz=player.z+(axis==='z'?dz:0),f=floorAt(nx,nz);if(f===null||Math.abs(f-walkFloor)>.45)continue;if(!blocked(nx,nz,f)){player.x=nx;player.z=nz;walkFloor=f;player.y=f;}}}
function updateDoor(d){renderer.shadowMap.needsUpdate=true;const ease=d.t*d.t*(3-2*d.t);if(d.lift){d.leaf.position.y=ease*d.h;d.leaf.scale.y=Math.max(.025,1-ease);}else d.pivot.rotation.y=d.base+d.sign*ease*Math.PI/2;}
let audioCtx;
function doorSound(open){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(open?170:130,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(open?80:55,audioCtx.currentTime+.2);g.gain.setValueAtTime(.025,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.22);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.24);}catch{}}
function updateVehicleCollider(v){const c=Math.abs(Math.cos(v.heading)),s=Math.abs(Math.sin(v.heading)),ex=c*v.halfW+s*v.halfL,ez=s*v.halfW+c*v.halfL;Object.assign(v.collider,{minX:v.x-ex,maxX:v.x+ex,minZ:v.z-ez,maxZ:v.z+ez});}
function drawDashboard(v){const c=v.screenCtx;c.fillStyle='#0c1414';c.fillRect(0,0,512,192);c.strokeStyle='#84a99e';c.lineWidth=4;for(const x of [91,420]){c.beginPath();c.arc(x,112,65,Math.PI*.8,Math.PI*2.2);c.stroke();}c.fillStyle='#e3eee7';c.textAlign='center';c.font='bold 72px Arial';c.fillText(Math.round(Math.abs(v.speed)*3.6),256,107);c.font='21px Arial';c.fillStyle='#91b5a5';c.fillText('km/h',256,143);c.font='24px Arial';c.fillText(v.speed<-.3?'R':Math.abs(v.speed)<.1?'P':'D',91,120);c.fillText('433',420,120);v.screenTex.needsUpdate=true;}
function driverPoint(v,offset=-1.24){v.group.updateMatrixWorld(true);return v.group.localToWorld(new THREE.Vector3(offset,0,.15));}
function goToCar(){if(activeVehicle)return;const v=vehicles[0],p=driverPoint(v,-2.25);player.set(p.x,.26,p.z);walkFloor=.26;yaw=Math.atan2(p.x-v.x,p.z-v.z);pitch=-.12;keys.clear();joy.x=joy.y=0;if(!playing){playing=true;document.body.classList.add('playing');$('welcome').hidden=true;}notify('Откройте дверь машины, затем садитесь за руль');updateHUD();}
function enterVehicle(v){activeVehicle=v;nearVehicle=null;v.speed=0;v.doorOpen=false;chaseView=false;yaw=0;pitch=.025;keys.clear();joy.x=joy.y=0;brakeHeld=false;document.body.classList.add('driving');$('drivePanel').hidden=false;$('viewBtn').textContent='Вид снаружи';camera.fov=73;camera.updateProjectionMatrix();notify(matchMedia('(max-width:600px), (pointer:coarse)').matches?'Джойстик — газ и руль. Зажмите «Тормоз», чтобы остановиться.':'W — газ · S — тормоз / назад · A/D — руль · пробел — тормоз');updateHUD();}
function exitVehicle(){const v=activeVehicle;if(!v)return;if(Math.abs(v.speed)>.55){notify('Сначала остановите машину — S или пробел');return;}const candidates=[[-2.25,.15],[2.25,.15],[-2.3,-2.4],[2.3,-2.4]];let place=null;for(const [x,z] of candidates){const p=v.group.localToWorld(new THREE.Vector3(x,0,z));if(!blocked(p.x,p.z,.26)){place=p;break;}}if(!place){notify('Рядом нет места для выхода. Отъедьте от препятствия.');return;}v.speed=0;v.doorOpen=true;activeVehicle=null;nearVehicle=v;document.body.classList.remove('driving');$('drivePanel').hidden=true;player.set(place.x,.26,place.z);walkFloor=.26;yaw=Math.atan2(place.x-v.x,place.z-v.z);pitch=-.12;keys.clear();joy.x=joy.y=0;brakeHeld=false;camera.fov=61;camera.updateProjectionMatrix();notify('Вы вышли из машины');updateHUD();}
function toggleCarView(){if(!activeVehicle)return;chaseView=!chaseView;yaw=0;pitch=.025;$('viewBtn').textContent=chaseView?'Вид из салона':'Вид снаружи';}
// Test an oriented vehicle rectangle against the scene's axis-aligned colliders.
function carHitsBox(v,x,z,heading,b){const ux=Math.cos(heading),uz=-Math.sin(heading),vx=Math.sin(heading),vz=Math.cos(heading),ex=(b.maxX-b.minX)/2,ez=(b.maxZ-b.minZ)/2,dx=x-(b.minX+b.maxX)/2,dz=z-(b.minZ+b.maxZ)/2;return Math.abs(dx)<=v.halfW*Math.abs(ux)+v.halfL*Math.abs(vx)+ex&&Math.abs(dz)<=v.halfW*Math.abs(uz)+v.halfL*Math.abs(vz)+ez&&Math.abs(dx*ux+dz*uz)<=v.halfW+ex*Math.abs(ux)+ez*Math.abs(uz)&&Math.abs(dx*vx+dz*vz)<=v.halfL+ex*Math.abs(vx)+ez*Math.abs(vz);}
function carBlocked(v,x,z,heading){if(Math.abs(x)>200||Math.abs(z)>200)return true;for(const b of colliders){if(b.vehicleId===v.id||b.minY>1.65+v.lift||b.maxY<.22)continue;if(carHitsBox(v,x,z,heading,b))return true;}for(const d of doors){if(d.y>1.7)continue;if(d.lift&&d.t>.83)continue;const a=d.base+d.sign*(d.t*d.t*(3-2*d.t))*Math.PI/2,ex=d.x+Math.cos(a)*d.w,ez=d.z-Math.sin(a)*d.w,b={minX:Math.min(d.x,ex)-.06,maxX:Math.max(d.x,ex)+.06,minZ:Math.min(d.z,ez)-.06,maxZ:Math.max(d.z,ez)+.06};if(carHitsBox(v,x,z,heading,b))return true;}return false;}
function asphaltAt(x,z){return (Math.abs(x)<24&&z>20&&z<28)||(x>3.05&&x<7.05&&z>5&&z<22)||(x>6&&x<16.5&&z>8&&z<24)||(x>7&&x<14.5&&z>-3&&z<8);}
function updateVehicles(dt,now){for(const v of vehicles){const target=v.doorOpen?1:0;const next=THREE.MathUtils.damp(v.doorT,target,7,dt);if(Math.abs(next-v.doorT)>.0005){v.doorT=Math.abs(next-target)<.003?target:next;v.doorPivot.rotation.y=v.doorT*1.12;renderer.shadowMap.needsUpdate=true;}
if(v===activeVehicle&&!$('help').open){const throttle=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy.y,turn=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;const braking=brakeHeld||keys.has('Space');const max=v.suv?13:16;v.steer=THREE.MathUtils.damp(v.steer,-THREE.MathUtils.clamp(turn,-1,1)*.48,7,dt);
if(braking)v.speed=THREE.MathUtils.damp(v.speed,0,7,dt);else if(v.doorT<.12&&throttle>.12)v.speed+=throttle*(v.speed<0?11:5.2)*dt;else if(v.doorT<.12&&throttle<-.12)v.speed+=throttle*(v.speed>0?12:3.4)*dt;else v.speed=THREE.MathUtils.damp(v.speed,0,.65,dt);v.speed=THREE.MathUtils.clamp(v.speed,-4.3,max);if(Math.abs(v.speed)<.045)v.speed=0;
const steps=Math.max(1,Math.ceil(Math.abs(v.speed)*dt/.20)),sub=dt/steps;for(let i=0;i<steps;i++){const heading=v.heading+v.speed/2.7*Math.tan(v.steer)*sub,nx=v.x+Math.sin(heading)*v.speed*sub,nz=v.z+Math.cos(heading)*v.speed*sub;if(carBlocked(v,nx,nz,heading)){if(Math.abs(v.speed)>1&&now-v.lastImpact>1700){notify('Впереди препятствие');v.lastImpact=now;}v.speed=0;break;}const distance=v.speed*sub;v.x=nx;v.z=nz;v.heading=heading;v.distance+=distance;}
if(Math.abs(v.speed)>.01){sun.target.position.set(v.x,0,v.z);sun.position.set(v.x-25,30,v.z+22);sun.target.updateMatrixWorld();renderer.shadowMap.needsUpdate=true;}player.x=v.x;player.z=v.z;player.y=.26;walkFloor=.26;
}else if(v===activeVehicle)v.speed=0;
v.group.position.x=v.x;v.group.position.z=v.z;v.group.position.y=THREE.MathUtils.damp(v.group.position.y,asphaltAt(v.x,v.z)?.08:-.045,12,dt);v.group.rotation.y=v.heading;for(const wheel of v.wheelRoots)wheel.root.rotation.y=wheel.front?v.steer:0;for(const spin of v.wheelSpins)spin.rotation.x=v.distance/.345;v.steering.rotation.z=v.steer*2.8;v.group.updateMatrixWorld(true);updateVehicleCollider(v);if(v.shadow){v.shadow.position.set(v.x,asphaltAt(v.x,v.z)?.056:-.07,v.z);v.shadow.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),v.heading);v.shadow.rotateX(-Math.PI/2);}}
}
function vehicleCamera(dt){const v=activeVehicle;if(!v)return;if(chaseView){const a=v.heading+yaw,target=new THREE.Vector3(v.x-Math.sin(a)*6.8,3.0+pitch*1.7,v.z-Math.cos(a)*6.8);camera.position.lerp(target,1-Math.exp(-7*dt));camera.lookAt(v.x,1.0,v.z);}else{const seat=v.group.localToWorld(new THREE.Vector3(-.42,1.31+v.lift,-.03));camera.position.copy(seat);camera.rotation.set(pitch,v.heading+Math.PI+yaw,0);}}
function drivingMap(){const c=mapCtx;c.clearRect(0,0,240,180);c.fillStyle='#dfe5d3';c.fillRect(0,0,240,180);const v=activeVehicle,s=1.1,px=x=>120+(x-v.x)*s,pz=z=>100+(z-v.z)*s;c.fillStyle='#b4b8ad';c.fillRect(px(-24),pz(20),48*s,8*s);c.fillStyle='#f8f4e9';c.fillRect(px(-7.3),pz(-5.25),15.8*s,10.7*s);c.fillStyle='#c9cbbd';c.fillRect(px(7),pz(-3),7.5*s,11*s);c.strokeStyle='#9aa58d';c.strokeRect(px(-24),pz(-20),48*s,40*s);c.save();c.translate(120,100);c.rotate(Math.PI-v.heading);c.fillStyle='#2f5240';c.beginPath();c.moveTo(0,-8);c.lineTo(5,5);c.lineTo(0,3);c.lineTo(-5,5);c.closePath();c.fill();c.restore();c.font='9px Arial';c.fillStyle='#77866b';c.fillText('ПОЛЕ',12,20);}
$('carBtn').onclick=goToCar;$('viewBtn').onclick=toggleCarView;
$('brakeBtn').addEventListener('pointerdown',e=>{brakeHeld=true;$('brakeBtn').setPointerCapture(e.pointerId);});for(const e of ['pointerup','pointercancel','lostpointercapture'])$('brakeBtn').addEventListener(e,()=>brakeHeld=false);
addEventListener('keydown',e=>{if(activeVehicle&&e.code==='KeyC'&&!e.repeat){e.preventDefault();toggleCarView();}});

function interact(){if(!playing)return;if(activeVehicle){exitVehicle();return;}if(nearVehicle){if(!nearVehicle.doorOpen){nearVehicle.doorOpen=true;doorSound(true);notify('Дверь машины открыта. Можно сесть за руль.');}else enterVehicle(nearVehicle);updateHUD();return;}if(!currentDoor){notify('Подойдите ближе к двери');return;}const d=currentDoor;if(d.open&&hitDoor({...d,t:0},player.x,player.z,.32,walkFloor)){notify('Отойдите немного от проёма, чтобы закрыть дверь');return;}d.open=!d.open;doorSound(d.open);notify(`${d.name}: ${d.lift?(d.open?'открыты':'закрыты'):(d.open?'открыта':'закрыта')}`);updateHUD();}
function start(){playing=true;startedAt=performance.now();document.body.classList.add('playing');$('welcome').hidden=true;notify(matchMedia('(pointer:coarse), (max-width:600px)').matches?'Джойстик слева — идти, свайп справа — обзор':'WASD — идти · E — дверь · перетаскивание — обзор');}
$('startBtn').addEventListener('click',start);$('actionBtn').addEventListener('click',e=>{e.stopPropagation();interact();});$('resetBtn').addEventListener('click',()=>{reset();notify('Вы снова перед домом');});
function help(){document.exitPointerLock?.();keys.clear();$('help').showModal();}
$('helpBtn').onclick=help;$('closeHelp').onclick=()=>$('help').close();$('resumeBtn').onclick=()=>$('help').close();$('help').addEventListener('close',()=>{last=performance.now();});
$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').classList.toggle('active',sound);$('soundBtn').setAttribute('aria-label',sound?'Выключить звук':'Включить звук');notify(sound?'Звук дверей включён':'Звук выключен');};
$('mapBtn').onclick=()=>{$('mapPanel').classList.toggle('collapsed');const off=$('mapPanel').classList.contains('collapsed');$('mapBtn').textContent=off?'+':'−';$('mapBtn').setAttribute('aria-label',off?'Показать карту':'Скрыть карту');};
addEventListener('keydown',e=>{if($('help').open)return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyR','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='KeyR'&&!e.repeat&&playing)reset();if(e.code==='Escape')keys.clear();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0;brakeHeld=false;if(activeVehicle)activeVehicle.speed=0;});
let drag=null,lookPointer=null,lastTouch=null;
canvas.addEventListener('pointerdown',e=>{if(!playing||$('help').open)return;if(e.pointerType==='touch'){if(e.clientX<innerWidth*.32)return;lookPointer=e.pointerId;lastTouch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}else if(document.pointerLockElement!==canvas){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(!playing||$('help').open)return;if(document.pointerLockElement===canvas){yaw-=e.movementX*.0021;pitch-=e.movementY*.0021;}else if(e.pointerType==='touch'&&lookPointer===e.pointerId&&lastTouch){yaw-=(e.clientX-lastTouch.x)*.004;pitch-=(e.clientY-lastTouch.y)*.004;lastTouch={x:e.clientX,y:e.clientY};}else if(drag){yaw-=(e.clientX-drag.x)*.003;pitch-=(e.clientY-drag.y)*.003;drag={x:e.clientX,y:e.clientY};}pitch=THREE.MathUtils.clamp(pitch,-1.2,1.2);});
function endLook(e){drag=null;if(lookPointer===e.pointerId){lookPointer=null;lastTouch=null;}}
canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);$('lookBtn').onclick=()=>{if(!playing)return;if(document.pointerLockElement===canvas){document.exitPointerLock?.();return;}try{const p=canvas.requestPointerLock?.();if(p?.catch)p.catch(()=>notify('Перетаскивайте сцену для обзора'));}catch{notify('Перетаскивайте сцену для обзора');}};
const joyEl=$('joystick');let joyPointer=null;
function updateJoy(e){const b=joyEl.getBoundingClientRect(),dx=e.clientX-(b.left+b.width/2),dy=e.clientY-(b.top+b.height/2),len=Math.hypot(dx,dy),scale=Math.min(1,38/Math.max(1,len));joy.x=dx*scale/38;joy.y=dy*scale/38;$('stick').style.transform=`translate(${joy.x*34}px,${joy.y*34}px)`;}
joyEl.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joyEl.setPointerCapture(e.pointerId);updateJoy(e);e.preventDefault();});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)updateJoy(e);});for(const evt of ['pointerup','pointercancel','lostpointercapture'])joyEl.addEventListener(evt,()=>{joyPointer=null;joy.x=joy.y=0;$('stick').style.transform='';});
const mapCtx=$('map').getContext('2d');
function drawMap(){if(activeVehicle){drivingMap();return;}const c=mapCtx;c.clearRect(0,0,240,180);const s=6.4,ox=94,oz=83;const px=x=>ox+x*s,pz=z=>oz+z*s;
c.fillStyle='#e4e6d9';c.fillRect(0,0,240,180);c.fillStyle='#f6f4eb';c.fillRect(px(-7),pz(-5),14*s,10*s);c.fillStyle='#deded1';c.fillRect(px(7),pz(-3),7.5*s,11*s);c.strokeStyle='#707c69';c.lineWidth=2;c.strokeRect(px(-7),pz(-5),14*s,10*s);c.strokeRect(px(7),pz(-3),7.5*s,11*s);
c.lineWidth=1;c.beginPath();if(walkFloor<2){c.moveTo(px(-7),pz(-.6));c.lineTo(px(2.8),pz(-.6));c.moveTo(px(-2),pz(-5));c.lineTo(px(-2),pz(-.6));c.moveTo(px(2.8),pz(-5));c.lineTo(px(2.8),pz(-.6));}else{c.moveTo(px(-1),pz(-5));c.lineTo(px(-1),pz(3.5));c.moveTo(px(-1),pz(-1.3));c.lineTo(px(3.2),pz(-1.3));}c.stroke();c.strokeStyle='#c1c4b3';for(let i=0;i<10;i++){c.beginPath();c.moveTo(px(3.4),pz(1.4-i*.54));c.lineTo(px(5.3),pz(1.4-i*.54));c.stroke();}c.font='7px Arial';c.fillStyle='#8d9686';c.fillText('ДОМ',px(-4.9),pz(2.6));c.fillText('ГАРАЖ',px(7.9),pz(.3));c.fillStyle='#637d60';for(const d of doors){if((d.y>2)!==(walkFloor>2))continue;c.beginPath();c.arc(px(d.x),pz(d.z),2,0,Math.PI*2);c.fill();}
let x=px(player.x),z=pz(player.z);c.save();c.translate(x,z);c.rotate(-yaw);c.fillStyle='#7e9a6930';c.beginPath();c.moveTo(0,0);c.arc(0,0,20,-Math.PI*.70,-Math.PI*.30);c.closePath();c.fill();c.fillStyle='#2f5240';c.beginPath();c.moveTo(0,-6);c.lineTo(4,4);c.lineTo(0,2);c.lineTo(-4,4);c.closePath();c.fill();c.restore();}
function roomName(){const x=player.x,z=player.z;if(x>7&&x<14.5&&z>-3&&z<8)return 'Гараж';if(x>-7&&x<7&&z>-5&&z<5){if(walkFloor>2){if(x<-1)return 'Большая спальня';if(z<-1.3&&x<3.25)return 'Комната отдыха';return 'Холл второго этажа';}if(x>3.3&&x<5.4&&z<1.5)return 'Лестница';if(z<-.6&&x<-2)return 'Спальня';if(z<-.6&&x<2.8)return 'Кабинет';if(x>2.8)return 'Входной холл';return 'Гостиная и кухня';}if(z<-5)return 'Сад и терраса';return 'Перед домом';}
function updateHUD(){let best=null,dist=2.5;nearVehicle=null;if(!activeVehicle){for(const d of doors){if(Math.abs(d.y-walkFloor)>1.1)continue;const midx=d.x+Math.cos(d.base)*d.w/2,midz=d.z-Math.sin(d.base)*d.w/2,distance=Math.hypot(player.x-midx,player.z-midz);if(distance<dist){best=d;dist=distance;}}if(walkFloor<1)for(const v of vehicles){const p=driverPoint(v),distance=Math.hypot(player.x-p.x,player.z-p.z);if(distance<dist){nearVehicle=v;best=null;dist=distance;}}}currentDoor=best;const active=!!(best||nearVehicle||activeVehicle);$('interaction').hidden=!active||!playing;if(activeVehicle){$('doorHint').textContent=activeVehicle.name+' · вы за рулём';$('actionText').textContent='Выйти из машины';$('actionBtn').setAttribute('aria-label','Выйти из машины');$('driveSpeed').textContent=Math.round(Math.abs(activeVehicle.speed)*3.6);$('driveGear').textContent=activeVehicle.speed<-.3?'R':Math.abs(activeVehicle.speed)<.1?'P':'D';drawDashboard(activeVehicle);}else if(nearVehicle){$('doorHint').textContent=nearVehicle.name;$('actionText').textContent=nearVehicle.doorOpen?'Сесть за руль':'Открыть машину';$('actionBtn').setAttribute('aria-label',nearVehicle.doorOpen?'Сесть за руль':'Открыть машину');}else if(best){$('doorHint').textContent=best.name;$('actionText').textContent=best.open?'Закрыть':'Открыть';$('actionBtn').setAttribute('aria-label',`${best.open?'Закрыть':'Открыть'}: ${best.name}`);}$('crosshair').classList.toggle('near',active);$('location').textContent=activeVehicle?'За рулём · '+activeVehicle.name:roomName();$('location').dataset.position=JSON.stringify({x:+player.x.toFixed(3),z:+player.z.toFixed(3),floor:+walkFloor.toFixed(3),yaw:+yaw.toFixed(3),mode:activeVehicle?'driving':'walking',speed:activeVehicle?+activeVehicle.speed.toFixed(3):0});$('level').textContent=activeVehicle?(player.z>28||Math.abs(player.x)>24?'Поле':'Участок'):walkFloor>2?'2 этаж':(roomName()!=='Перед домом'&&roomName()!=='Сад и терраса')?'1 этаж':'Участок';const n=doors.filter(d=>d.open).length;$('doorsCount').textContent=activeVehicle?'E — выйти · C — сменить вид':`Открыто дверей: ${n} / ${doors.length}`;drawMap();}
let hudTime=0,fpsFrames=0,fpsTime=performance.now();
function tick(now){const dt=Math.min((now-last)/1000,.065);last=now;fpsFrames++;if(now-fpsTime>=1000){$('location').dataset.fps=Math.round(fpsFrames*1000/(now-fpsTime));fpsFrames=0;fpsTime=now;}
if(playing&&!activeVehicle&&!$('help').open){let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy.y,strafe=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;const len=Math.hypot(forward,strafe);if(len>.05){const speed=(keys.has('ShiftLeft')?3.8:2.5)*dt/Math.max(1,len);const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed;tryMove(dx,dz);stepPhase+=dt*9;}
for(const d of doors){const target=d.open?1:0;if(Math.abs(d.t-target)>.001){const prev=d.t;d.t=THREE.MathUtils.damp(d.t,target,6,dt);if(Math.abs(d.t-target)<.003)d.t=target;if(!d.open&&hitDoor(d,player.x,player.z,.28,walkFloor)){d.t=prev;d.open=true;notify('Дверь оставлена открытой: отойдите от створки');}updateDoor(d);}}
}
updateVehicles(dt,now);if(activeVehicle){vehicleCamera(dt);}else{camera.position.x=player.x;camera.position.z=player.z;camera.position.y=THREE.MathUtils.damp(camera.position.y,player.y+1.66,16,dt);camera.rotation.set(pitch,yaw,0);}if(now-hudTime>110){updateHUD();hudTime=now;}
renderer.render(scene,camera);requestAnimationFrame(tick);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5,Math.sqrt(2800000/(innerWidth*innerHeight))));renderer.setSize(innerWidth,innerHeight);});
addEventListener('visibilitychange',()=>{last=performance.now();keys.clear();joy.x=joy.y=0;});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();notify('Графика приостановлена. Обновите страницу.');});
// Public, read-only status makes the current visible scene easier to inspect.
const status=$('location');status.dataset.scene='ready';document.body.dataset.engine='three-webgl';
await environmentPromise;
reset();renderer.compile(scene,camera);renderer.render(scene,camera);
$('startBtn').disabled=false;$('startBtn').innerHTML='Начать прогулку <span>↗</span>';
requestAnimationFrame(tick);

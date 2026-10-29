import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// A CC0 anatomical mesh and real skinning replace the initial primitive mannequin.
export async function createHeroine(scene){
 const root=new THREE.Group();root.name='Героиня';scene.add(root);
 const gltf=await new GLTFLoader().loadAsync('./assets/heroine-rig.glb');const human=gltf.scene;human.scale.setScalar(1.06);human.position.y=.10;root.add(human);human.updateMatrixWorld(true);
 const face=new THREE.TextureLoader().load('./assets/heroine-face.png');face.colorSpace=THREE.SRGBColorSpace;face.anisotropy=8;
 const skin=new THREE.MeshPhysicalMaterial({color:'#eac2af',roughness:.58,clearcoat:.07,clearcoatRoughness:.8});
 skin.onBeforeCompile=shader=>{shader.uniforms.faceMap={value:face};shader.vertexShader='varying vec3 vBody;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBody=position;');shader.fragmentShader='varying vec3 vBody;uniform sampler2D faceMap;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 faceUV=vec2(.5+vBody.x/.225,(vBody.y-1.365)/.23);
 float mask=smoothstep(.065,.100,vBody.z)*smoothstep(1.375,1.400,vBody.y)*(1.-smoothstep(.080,.103,abs(vBody.x)));
 vec3 portrait=texture2D(faceMap,clamp(faceUV,vec2(.001),vec2(.999))).rgb;
 diffuseColor.rgb=mix(diffuseColor.rgb,portrait,mask);
 float pores=sin(vBody.x*10430.)*sin(vBody.y*7940.)*sin(vBody.z*9870.);roughnessFactor+=pores*.025;`);};
 // Roughness noise is applied after Three.js declares roughnessFactor.
 const compileSkin=skin.onBeforeCompile;skin.onBeforeCompile=shader=>{compileSkin(shader);shader.fragmentShader=shader.fragmentShader.replace('roughnessFactor+=pores*.025;','');shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor+=sin(vBody.x*10430.)*sin(vBody.y*7940.)*.018;');};
 const eyes=new THREE.MeshPhysicalMaterial({color:'#eee8de',roughness:.24,clearcoat:1});
 human.traverse(o=>{if(o.isMesh){o.material=o.name.includes('high-poly')?eyes:skin;o.castShadow=true;o.receiveShadow=true;}});
 const bone=n=>human.getObjectByName(n);
 function rotateWorld(o,axis,angle){human.updateMatrixWorld(true);const q=o.getWorldQuaternion(new THREE.Quaternion()),p=o.parent.getWorldQuaternion(new THREE.Quaternion()).invert();q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));o.quaternion.copy(p.multiply(q));human.updateMatrixWorld(true);}
 const arms=[],legs=[];
 for(const side of [-1,1]){const suffix=side>0?'L':'R',arm=bone('upperarm01'+suffix),leg=bone('upperleg01'+suffix),knee=bone('lowerleg01'+suffix),foot=bone('foot'+suffix);
 rotateWorld(arm,new THREE.Vector3(0,0,1),-side*.69);rotateWorld(leg,new THREE.Vector3(0,0,1),-side*.08);rotateWorld(foot,new THREE.Vector3(1,0,0),.40);
 const axis=o=>new THREE.Vector3(1,0,0).applyQuaternion(o.parent.getWorldQuaternion(new THREE.Quaternion()).invert());arms.push({bone:arm,base:arm.quaternion.clone(),axis:axis(arm),side});legs.push({bone:leg,base:leg.quaternion.clone(),axis:axis(leg),knee,kneeBase:knee.quaternion.clone(),kneeAxis:axis(knee),foot,side});}
 const red=new THREE.MeshPhysicalMaterial({color:'#b40c29',roughness:.38,sheen:.8,sheenColor:new THREE.Color('#d84356'),sheenRoughness:.7,side:THREE.DoubleSide});
 red.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor+=sin(vViewPosition.x*1250.)*sin(vViewPosition.y*1250.)*.018;');};
 const darkRed=new THREE.MeshStandardMaterial({color:'#650e20',roughness:.55}),hair=new THREE.MeshPhysicalMaterial({color:'#332018',roughness:.48,anisotropy:.5}),hairLight=new THREE.MeshStandardMaterial({color:'#513628',roughness:.55}),patent=new THREE.MeshPhysicalMaterial({color:'#141316',roughness:.2,clearcoat:1,clearcoatRoughness:.13});
 function mesh(g,m,parent=root){const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function sphere(x,y,z,sx,sy,sz,m,parent=root){const o=mesh(new THREE.SphereGeometry(1,32,24),m,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 // Tailored dress with an oval cross-section and small folds at the hem.
 const rings=[[.64,.255,.155],[.69,.248,.151],[.77,.227,.147],[.87,.219,.144],[.98,.218,.148],[1.07,.183,.126],[1.15,.147,.108],[1.22,.160,.116],[1.30,.187,.155],[1.37,.185,.165],[1.42,.174,.15],[1.465,.151,.127]],vertices=[],uv=[],idx=[],segments=80;
 for(let i=0;i<rings.length;i++){const [y,rx,rz]=rings[i];for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,fold=1+Math.cos(a*12)*.012*Math.max(0,1-(y-.64)/.35);vertices.push(Math.sin(a)*rx*fold,y,Math.cos(a)*rz*fold+.035);uv.push(j/segments,(y-.64)/.8);if(i<rings.length-1&&j<segments){const k=i*(segments+1)+j;idx.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}}}
 const dressGeo=new THREE.BufferGeometry();dressGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));dressGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));dressGeo.setIndex(idx);dressGeo.computeVertexNormals();const dress=mesh(dressGeo,red);
 for(const x of [-.122,.122]){const strap=mesh(new THREE.BoxGeometry(.040,.075,.105),red);strap.position.set(x,1.48,.035);}
 const belt=mesh(new THREE.TorusGeometry(.147,.004,8,80),darkRed);belt.rotation.x=Math.PI/2;belt.scale.y=.74;belt.position.set(0,1.15,.035);
 // Hair follows the anatomical head. Fine curved strands replace the old bulb shapes.
 const hairGroup=new THREE.Group();human.add(hairGroup);const hp=[],hi=[],rows=28,cols=80;
 function hairPoint(t,a,extra=0){const front=Math.cos(a),edge=front>.3?1.03+.22*Math.sin(a):2.25;const theta=t*edge;return new THREE.Vector3(Math.sin(theta)*Math.sin(a)*(.096+extra),1.490+Math.cos(theta)*(.122+extra),.043+Math.sin(theta)*Math.cos(a)*(.101+extra));}
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){hp.push(...hairPoint(i/rows,j/cols*Math.PI*2).toArray());if(i<rows&&j<cols){const k=i*(cols+1)+j;hi.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}}
 const hairGeo=new THREE.BufferGeometry();hairGeo.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));hairGeo.setIndex(hi);hairGeo.computeVertexNormals();const shell=mesh(hairGeo,hair,hairGroup);shell.material.side=THREE.DoubleSide;
 for(let i=0;i<170;i++){const a=i/170*Math.PI*2,points=[];for(let j=0;j<9;j++)points.push(hairPoint(.10+j*.11,a+.07*Math.sin(j*.22),.0015));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.00065,3,false),i%5===0?hairLight:hair,hairGroup);}
 for(let i=0;i<42;i++){const f=i/41;const points=[new THREE.Vector3(.018+f*.017,1.596,.053),new THREE.Vector3(-.025-f*.035,1.58,.103),new THREE.Vector3(-.078-f*.01,1.526,.105),new THREE.Vector3(-.091-f*.002,1.456,.062)];mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),25,.0012,4),i%4?hair:hairLight,hairGroup);}
 // Merge the hair strands into two draw calls, preserving their geometry.
 hairGroup.updateMatrixWorld(true);for(const material of [hair,hairLight]){const objects=hairGroup.children.filter(o=>o.isMesh&&o.material===material),geos=objects.map(o=>{const g=o.geometry.clone();g.deleteAttribute('uv');g.applyMatrix4(o.matrix);return g;}),g=mergeGeometries(geos,false);if(g){objects.forEach(o=>o.removeFromParent());mesh(g,material,hairGroup);}geos.forEach(g=>g.dispose());}
 // Eye whites and small irises provide a real highlight in close views.
 for(const x of [-.027,.027]){sphere(x,1.490,.121,.010,.009,.006,eyes,human);sphere(x,1.490,.127,.0044,.0044,.0018,new THREE.MeshPhysicalMaterial({color:'#6f929e',roughness:.23,clearcoat:1}),human);sphere(x,1.490,.1285,.002,.002,.001,new THREE.MeshStandardMaterial({color:'#101c20',roughness:.18}),human);}
 // Shoes are attached to the skinned feet, so heels travel with each stride.
 for(const leg of legs){human.updateMatrixWorld(true);const footPos=leg.foot.getWorldPosition(new THREE.Vector3());root.worldToLocal(footPos);const shoeGroup=new THREE.Group();root.add(shoeGroup);shoeGroup.position.set(footPos.x,0,footPos.z);
 sphere(0,.047,.115,.049,.035,.104,patent,shoeGroup);sphere(0,.133,-.016,.043,.043,.046,patent,shoeGroup);
 const heel=mesh(new THREE.CylinderGeometry(.017,.010,.105,16),patent,shoeGroup);heel.position.set(0,.064,-.026);
 const solePath=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.026,.19),new THREE.Vector3(0,.028,.10),new THREE.Vector3(0,.08,.034),new THREE.Vector3(0,.110,-.026)]);mesh(new THREE.TubeGeometry(solePath,22,.016,8),patent,shoeGroup);leg.shoe=shoeGroup;leg.shoeRest=footPos.clone();}
 const ring=mesh(new THREE.RingGeometry(.29,.31,64),new THREE.MeshBasicMaterial({color:'#fff0d5',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.012;ring.castShadow=false;
 let heading=.28,phase=0;
 function update(dt,position,dx,dz,visible=true){root.visible=visible;if(!visible)return;root.position.copy(position);const speed=Math.hypot(dx,dz)/Math.max(dt,.001),moving=speed>.06,gait=moving?Math.min(1,speed/2.5):0;if(moving){const goal=Math.atan2(dx,dz);heading+=Math.atan2(Math.sin(goal-heading),Math.cos(goal-heading))*(1-Math.exp(-12*dt));phase+=dt*9;}root.rotation.y=heading;
 for(const a of arms)a.bone.quaternion.copy(a.base).premultiply(new THREE.Quaternion().setFromAxisAngle(a.axis,Math.sin(phase+(a.side>0?0:Math.PI))*.18*gait));
 for(const l of legs){const step=Math.sin(phase+(l.side>0?0:Math.PI));l.bone.quaternion.copy(l.base).premultiply(new THREE.Quaternion().setFromAxisAngle(l.axis,step*.24*gait));l.knee.quaternion.copy(l.kneeBase).premultiply(new THREE.Quaternion().setFromAxisAngle(l.kneeAxis,Math.max(0,-step)*.32*gait));}
 human.updateMatrixWorld(true);for(const l of legs){const p=l.foot.getWorldPosition(new THREE.Vector3());root.worldToLocal(p);l.shoe.position.set(p.x,p.y-l.shoeRest.y,p.z);l.shoe.rotation.x=Math.sin(phase+(l.side>0?0:Math.PI))*.12*gait;}dress.rotation.z=Math.sin(phase)*.009*gait;}
 return {root,update,reset(){heading=.28;phase=0;},get heading(){return heading;}};
}

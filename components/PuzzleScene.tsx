
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PuzzleParams, PuzzleStats, ShapeType } from '../types';

export interface PuzzleSceneHandle {
  exportSTL: () => void;
}

interface PuzzleSceneProps {
  params: PuzzleParams;
  onStatsUpdate: (stats: PuzzleStats) => void;
  onPhysicsUpdate: (currentExplode: number, currentNoise: number) => void;
}

// -- Pure Math Functions --

// Check if a point (local space) is inside the shape definition
const isPointInShape = (shape: ShapeType, p: THREE.Vector3, radius: number = 0.9): boolean => {
    let inside = false;
                    
    if (shape === 'Sphere') {
      inside = p.length() <= radius;
    } else if (shape === 'Box') {
      const limit = radius * 0.8;
      inside = Math.abs(p.x) <= limit && Math.abs(p.y) <= limit && Math.abs(p.z) <= limit;
    } else if (shape === 'Torus') {
      const R = 0.8;
      const r = 0.32;
      const qx = Math.sqrt(p.x * p.x + p.z * p.z) - R;
      const qy = p.y;
      inside = (qx * qx + qy * qy) <= r * r;
    } else if (shape === 'Gyroid') {
      const s = 3.5;
      const val = Math.sin(p.x * s) * Math.cos(p.y * s) + 
                  Math.sin(p.y * s) * Math.cos(p.z * s) + 
                  Math.sin(p.z * s) * Math.cos(p.x * s);
      inside = Math.abs(val) < 0.35 && p.length() < radius * 1.3; 
    } else if (shape === 'SchwarzP') {
      const s = 3.0;
      const val = Math.cos(p.x * s) + Math.cos(p.y * s) + Math.cos(p.z * s);
      inside = Math.abs(val) < 0.3 && p.length() < radius * 1.2;
    } else if (shape === 'Mandelbulb') {
      let zx = p.x, zy = p.y, zz = p.z;
      let n = 8;
      let iter = 0;
      const maxIter = 6;
      let bounded = true;
      
      if (p.length() > 1.2) {
          inside = false;
      } else {
          for(; iter < maxIter; iter++) {
              const r2 = zx*zx + zy*zy + zz*zz;
              if(r2 > 4) { bounded = false; break; }
              const r = Math.sqrt(r2);
              if (r < 0.0001) break;
              
              const theta = Math.acos(zz/r) * n;
              const phi = Math.atan2(zy, zx) * n;
              const rn = Math.pow(r, n);
              
              zx = rn * Math.sin(theta) * Math.cos(phi) + p.x;
              zy = rn * Math.sin(theta) * Math.sin(phi) + p.y;
              zz = rn * Math.cos(theta) + p.z;
          }
          inside = bounded;
      }
    } else if (shape === 'Julia') {
        let qw = p.x * 1.5;
        let qx = p.y * 1.5;
        let qy = p.z * 1.5;
        let qz = 0;
        const cw = -0.2;
        const cx = 0.6;
        const cy = 0.0;
        const cz = 0.0;
        let iter = 0;
        const maxIter = 7;
        let bounded = true;
        if (p.length() > 1.2) {
            inside = false;
        } else {
            for(; iter < maxIter; iter++) {
                const r2 = qw*qw + qx*qx + qy*qy + qz*qz;
                if(r2 > 4) { bounded = false; break; }
                const nw = qw*qw - qx*qx - qy*qy - qz*qz;
                const nx = 2*qw*qx;
                const ny = 2*qw*qy;
                const nz = 2*qw*qz;
                qw = nw + cw;
                qx = nx + cx;
                qy = ny + cy;
                qz = nz + cz;
            }
            inside = bounded;
        }
    } else if (shape === 'Heart') {
        const sx = p.x * 1.3;
        const sy = p.y * 1.3 + 0.1; 
        const sz = p.z * 1.3;
        const a = sx*sx + (2.25)*sz*sz + sy*sy - 1;
        const val = a*a*a - sx*sx*sy*sy*sy - (0.1125)*sz*sz*sy*sy*sy;
        inside = val <= 0;
    } else if (shape === 'Star') {
        const s = 0.6;
        const limit = 1.2;
        const val = Math.pow(Math.abs(p.x), s) + Math.pow(Math.abs(p.y), s) + Math.pow(Math.abs(p.z), s);
        inside = val <= limit;
    } else if (shape === 'Twist') {
        const twistAmount = 2.5;
        const angle = p.y * twistAmount;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const tx = p.x * ca - p.z * sa;
        const tz = p.x * sa + p.z * ca;
        inside = Math.abs(tx) < 0.4 && Math.abs(tz) < 0.4 && Math.abs(p.y) < 0.85;
    } else if (shape === 'Atom') {
        const R = 0.7;
        const r = 0.12;
        const d1 = Math.sqrt(p.x*p.x + p.y*p.y) - R;
        const t1 = d1*d1 + p.z*p.z;
        const d2 = Math.sqrt(p.y*p.y + p.z*p.z) - R;
        const t2 = d2*d2 + p.x*p.x;
        const d3 = Math.sqrt(p.x*p.x + p.z*p.z) - R;
        const t3 = d3*d3 + p.y*p.y;
        
        inside = t1 < r*r || t2 < r*r || t3 < r*r;
        if (p.length() < 0.25) inside = true;
    }
    return inside;
}

const PuzzleScene = forwardRef<PuzzleSceneHandle, PuzzleSceneProps>(({ params, onStatsUpdate }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const paramsRef = useRef(params);
    const physicsState = useRef({
        currentExplode: params.explode,
        currentNoise: params.noise,
        targetExplode: params.explode,
        targetNoise: params.noise,
    });

    useEffect(() => {
        paramsRef.current = params;
        physicsState.current.targetExplode = params.explode;
        physicsState.current.targetNoise = params.noise;
    }, [params]);

    const sceneData = useRef<any>(null);

    // -- STL Export Logic --
    useImperativeHandle(ref, () => ({
        exportSTL: () => {
            if (!sceneData.current || !sceneData.current.puzzleMesh) return;
            
            const { puzzleMesh, pieceData } = sceneData.current;
            const geometries: THREE.BufferGeometry[] = [];
            const matrix = new THREE.Matrix4();
            const dummy = new THREE.Object3D();
            
            // Re-use the base geometry
            const baseGeo = puzzleMesh.geometry.clone();
            
            // Iterate all visible particles
            // NOTE: This captures the CURRENT animation state (exploded/noisy).
            // If user wants clean shape, they should stop scramble/noise.
            // But usually "Print what you see" is preferred.
            for (let i = 0; i < pieceData.length; i++) {
                puzzleMesh.getMatrixAt(i, matrix);
                // Apply instance matrix to geometry
                const instanceGeo = baseGeo.clone();
                instanceGeo.applyMatrix4(matrix);
                geometries.push(instanceGeo);
            }

            if (geometries.length === 0) return;

            // Merge all tiny cubes into one massive mesh
            // Note: High resolution (40^3 = 64000) might crash browser memory.
            // We hope BufferGeometryUtils is efficient enough or resolution is managed.
            const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
            const mesh = new THREE.Mesh(mergedGeo, new THREE.MeshBasicMaterial());
            
            const exporter = new STLExporter();
            const stlString = exporter.parse(mesh);
            
            // Trigger download
            const blob = new Blob([stlString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = 'puzzle-lab-design.stl';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Cleanup
            mesh.geometry.dispose();
            geometries.forEach(g => g.dispose());
        }
    }));

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = null;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(3.0, 2.4, 4.0);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.9;
        controls.minDistance = 2.0;
        controls.maxDistance = 10.0;

        const ambient = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(ambient);
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
        keyLight.position.set(3, 5, 2);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x88aaff, 0.7);
        rimLight.position.set(-4, 3, -3);
        scene.add(rimLight);

        const puzzleGroup = new THREE.Group();
        scene.add(puzzleGroup);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const dummy = new THREE.Object3D();
        const clock = new THREE.Clock();

        sceneData.current = {
            scene, camera, renderer, controls, puzzleGroup, 
            raycaster, mouse, dummy, clock, 
            pieceData: [], hoveredId: -1,
            puzzleMesh: null
        };

        // --- Core Reconstruction Logic ---
        const rebuildPuzzle = () => {
             const { puzzleGroup, puzzleMesh: oldMesh } = sceneData.current;
             const pParams = paramsRef.current;
             const resolution = pParams.resolution;
             
             if (oldMesh) {
                 puzzleGroup.remove(oldMesh);
                 oldMesh.geometry.dispose();
                 if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach((m: any) => m.dispose());
                 } else {
                    oldMesh.material.dispose();
                 }
             }

             // Grid setup
             const size = 2.0; // Bounding box size (-1 to 1)
             const half = size / 2;
             const step = size / resolution;
             const positions: THREE.Vector3[] = [];
             const p = new THREE.Vector3();
             const tempInvMatrix = new THREE.Matrix4();

             // Precompute matrices for elements in Designer Mode
             const designElements = pParams.mode === 'DESIGNER' 
                ? pParams.elements.map(el => {
                    const obj = new THREE.Object3D();
                    obj.position.set(...el.position);
                    obj.rotation.set(...el.rotation);
                    obj.scale.setScalar(el.scale);
                    obj.updateMatrix();
                    return {
                        ...el,
                        invMatrix: obj.matrix.invert()
                    };
                }) 
                : [];

             for (let ix = 0; ix < resolution; ix++) {
                const x = -half + (ix + 0.5) * step;
                for (let iy = 0; iy < resolution; iy++) {
                  const y = -half + (iy + 0.5) * step;
                  for (let iz = 0; iz < resolution; iz++) {
                    const z = -half + (iz + 0.5) * step;
                    p.set(x, y, z);
        
                    let inside = false;
                    
                    if (pParams.mode === 'SINGLE') {
                        // Standard single shape centered at origin
                        inside = isPointInShape(pParams.shape, p);
                    } else {
                        // Designer mode: Union of multiple transformed shapes
                        for (const el of designElements) {
                            if (!el.enabled) continue;
                            
                            // Transform world grid point into local shape space
                            // pLocal = invMatrix * pWorld
                            const pLocal = p.clone().applyMatrix4(el.invMatrix);
                            
                            if (isPointInShape(el.type, pLocal)) {
                                inside = true;
                                break; // Union found
                            }
                        }
                    }
        
                    if (inside) positions.push(p.clone());
                  }
                }
              }

              const count = positions.length;
              sceneData.current.pieceData = new Array(count);
              
              const geom = new THREE.BoxGeometry(step * 0.92, step * 0.92, step * 0.92);
              const mat = new THREE.MeshStandardMaterial({
                color: 0x8fd3ff,
                metalness: 0.45,
                roughness: 0.32,
                vertexColors: true
              });

              const mesh = new THREE.InstancedMesh(geom, mat, count);
              mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
              const color = new THREE.Color();
              let maxDist = 0;
              positions.forEach(pos => { if(pos.length() > maxDist) maxDist = pos.length(); });

              for (let i = 0; i < count; i++) {
                  const pos = positions[i];
                  const outward = pos.clone().normalize();
                  if (outward.lengthSq() < 1e-6) outward.set(0,1,0);
                  
                  const randomDir = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize();
                  // Simple color gradient based on distance from origin
                  const t = maxDist > 0 ? pos.length() / maxDist : 0;
                  color.setHSL(0.58 + 0.12 * t, 0.7, 0.5 + 0.12 * t);

                  sceneData.current.pieceData[i] = {
                      position: pos, outward, randomDir,
                      randPhase: Math.random() * Math.PI * 2,
                      randAmp: 0.5 + Math.random() * 0.7,
                      picked: false, baseColor: color.clone()
                  };
                  
                  dummy.position.copy(pos);
                  dummy.scale.set(1,1,1);
                  dummy.updateMatrix();
                  mesh.setMatrixAt(i, dummy.matrix);
                  mesh.setColorAt(i, color);
              }
              
              if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
              sceneData.current.puzzleMesh = mesh;
              puzzleGroup.add(mesh);
        };

        sceneData.current.rebuildPuzzle = rebuildPuzzle;
        rebuildPuzzle();

        const onPointerMove = (event: PointerEvent) => {
             const rect = renderer.domElement.getBoundingClientRect();
             mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
             mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
             
             const { puzzleMesh, hoveredId, pieceData, raycaster, camera } = sceneData.current;
             if (!puzzleMesh) return;
             
             raycaster.setFromCamera(mouse, camera);
             const intersects = raycaster.intersectObject(puzzleMesh, false);
             let newId = -1;
             if (intersects.length > 0 && typeof intersects[0].instanceId === 'number') newId = intersects[0].instanceId;
             
             if (newId !== hoveredId) {
                 if (hoveredId >= 0 && hoveredId < pieceData.length) puzzleMesh.setColorAt(hoveredId, pieceData[hoveredId].baseColor);
                 sceneData.current.hoveredId = newId;
                 if (newId >= 0 && newId < pieceData.length) puzzleMesh.setColorAt(newId, new THREE.Color(1,1,1));
                 if (puzzleMesh.instanceColor) puzzleMesh.instanceColor.needsUpdate = true;
             }
        };

        const onPointerDown = () => {
             const { hoveredId, pieceData } = sceneData.current;
             if (hoveredId >= 0 && hoveredId < pieceData.length) {
                 pieceData[hoveredId].picked = !pieceData[hoveredId].picked;
             }
        };

        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerdown', onPointerDown);

        let animationId = 0;
        const animate = () => {
             animationId = requestAnimationFrame(animate);
             const { renderer, scene, camera, controls, clock, puzzleGroup, puzzleMesh, pieceData, dummy, analyser, audioDataArray } = sceneData.current;
             const pState = paramsRef.current;
             const delta = clock.getDelta();
             const time = clock.getElapsedTime();

             // Audio Analysis
             let audioLevel = 0;
             if (pState.audioEnabled && analyser && audioDataArray) {
                 analyser.getByteTimeDomainData(audioDataArray);
                 let sum = 0;
                 for(let i=0; i<audioDataArray.length; i++) {
                     const v = (audioDataArray[i] - 128) / 128.0;
                     sum += v*v;
                 }
                 const rms = Math.sqrt(sum / audioDataArray.length);
                 audioLevel = Math.min(rms * 4.0, 1.0);
             } else if (pState.audioEnabled && !analyser && !sceneData.current.audioContext) {
                 initAudio();
             }

             // Physics & Animation
             let { targetExplode, targetNoise } = physicsState.current;
             if (pState.audioEnabled && audioLevel > 0) {
                 targetExplode = Math.min(targetExplode + audioLevel * 0.9, 1.5);
                 targetNoise = Math.min(targetNoise + audioLevel * 0.8, 1.0);
             }
             const lerp = 0.08;
             physicsState.current.currentExplode += (targetExplode - physicsState.current.currentExplode) * lerp;
             physicsState.current.currentNoise += (targetNoise - physicsState.current.currentNoise) * lerp;
             
             if (renderer.info.render.frame % 15 === 0) {
                 onStatsUpdate({ pieceCount: pieceData.length, audioLevel });
             }

             if (pState.autoRotate) puzzleGroup.rotation.y += delta * 0.25;
             
             if (puzzleMesh) {
                 const { currentExplode, currentNoise } = physicsState.current;
                 const animTime = time * (0.2 + pState.speed * 1.3);
                 
                 for(let i=0; i<pieceData.length; i++) {
                     const data = pieceData[i];
                     const orig = data.position;
                     const exp = currentExplode * 1.5;
                     
                     let fx = orig.x + data.outward.x * exp;
                     let fy = orig.y + data.outward.y * exp;
                     let fz = orig.z + data.outward.z * exp;

                     const phase = data.randPhase;
                     const n = Math.sin(animTime * 1.1 + orig.x * 3.1 + phase) +
                               Math.cos(animTime * 0.8 + orig.y * 4.3 - phase) +
                               Math.sin(animTime * 1.7 + orig.z * 5.3 + phase * 0.5);
                     
                     const ns = 0.12 * currentNoise * data.randAmp;
                     fx += data.randomDir.x * n * ns;
                     fy += data.randomDir.y * n * ns;
                     fz += data.randomDir.z * n * ns;

                     if (data.picked) {
                         const wobble = 0.15 * Math.sin(animTime * 2.1 + phase);
                         const pVal = 0.5 + wobble;
                         fx += data.outward.x * pVal;
                         fy += data.outward.y * pVal;
                         fz += data.outward.z * pVal;
                         const pulse = 1.25 + 0.15 * Math.sin(animTime * 4.0 + phase);
                         dummy.scale.set(pulse, pulse, pulse);
                     } else {
                         dummy.scale.set(1,1,1);
                     }
                     
                     dummy.position.set(fx, fy, fz);
                     dummy.rotation.y = (animTime * 0.15 + phase) * currentNoise;
                     dummy.rotation.x = 0.2 * currentNoise * Math.sin(animTime * 0.5 + phase);
                     dummy.updateMatrix();
                     puzzleMesh.setMatrixAt(i, dummy.matrix);
                 }
                 puzzleMesh.instanceMatrix.needsUpdate = true;
             }

             controls.update();
             renderer.render(scene, camera);
        };
        animate();

        const initAudio = () => {
             try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContextClass();
                navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                     const source = ctx.createMediaStreamSource(stream);
                     const analyser = ctx.createAnalyser();
                     analyser.fftSize = 1024;
                     const bufferLength = analyser.fftSize;
                     const dataArray = new Uint8Array(bufferLength);
                     source.connect(analyser);
                     if(sceneData.current) {
                         sceneData.current.audioContext = ctx;
                         sceneData.current.analyser = analyser;
                         sceneData.current.audioDataArray = dataArray;
                     }
                }).catch(e => console.warn(e));
             } catch(e) { console.error(e); }
        };

        const onResize = () => {
             const w = window.innerWidth;
             const h = window.innerHeight;
             camera.aspect = w/h;
             camera.updateProjectionMatrix();
             renderer.setSize(w,h);
        };
        window.addEventListener('resize', onResize);

        return () => {
             cancelAnimationFrame(animationId);
             window.removeEventListener('resize', onResize);
             renderer.domElement.removeEventListener('pointermove', onPointerMove);
             renderer.domElement.removeEventListener('pointerdown', onPointerDown);
             if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
             renderer.dispose();
             if (sceneData.current?.audioContext) sceneData.current.audioContext.close();
        };

    }, []);

    // Rebuild puzzle when relevant params change
    useEffect(() => {
        if(sceneData.current?.rebuildPuzzle) {
            sceneData.current.rebuildPuzzle();
        }
    }, [params.shape, params.resolution, params.mode, params.elements]);

    return <div ref={mountRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />;
});

export default PuzzleScene;

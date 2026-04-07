import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import * as fflate from 'fflate';

interface ModelViewerProps {
  url: string;
  backgroundUrl?: string;
}

export default function ModelViewer({ url, backgroundUrl }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    
    // Set background image if provided, otherwise default to gray
    if (backgroundUrl) {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(backgroundUrl, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture; // Provide image-based lighting
      });
    } else {
      scene.background = new THREE.Color(0x1a1a1a);
    }

    // --- Camera Setup ---
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 20000);
    camera.position.set(400, 400, 400);

    // --- Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 400, 200);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 1;
    controls.maxDistance = 10000;

    // --- Loader ---
    const manager = new THREE.LoadingManager();
    
    // Handle texture errors gracefully
    manager.onChildError = (url) => {
      console.warn(`Failed to load texture/resource: ${url}. The model will render with a fallback material.`);
    };

    // Use fflate for FBX compression support
    (window as any).fflate = fflate; 
    
    const loader = new FBXLoader(manager);
    // Tell the loader to look in our uploads directory for any external textures
    loader.setResourcePath('/uploads/'); 
    
    loader.load(
      url,
      (object) => {
        if (!mounted) return;

        // Traverse model to fix materials and textures
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Convert to Standard Material for better lighting/texture support
            if (mesh.material) {
              const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              const newMaterials = oldMaterials.map((oldMat: any) => {
                // If it already has a texture, ensure the base color is white so it's visible
                const hasTexture = !!oldMat.map;
                return new THREE.MeshStandardMaterial({
                  map: oldMat.map,
                  color: hasTexture ? 0xffffff : 0xcccccc,
                  side: THREE.DoubleSide,
                  roughness: 0.7,
                  metalness: 0.2
                });
              });
              mesh.material = Array.isArray(mesh.material) ? newMaterials : newMaterials[0];
            }
          }
        });

        // Auto-scale and center the model
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 250 / maxDim; // Slightly larger base scale
          object.scale.setScalar(scale);
          
          // Recalculate center after scaling
          box.setFromObject(object);
          box.getCenter(center);
          object.position.sub(center);
        }

        scene.add(object);
        setLoading(false);

        // Adjust camera to fit
        const distance = 500; 
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);
        controls.update();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          setProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.error('FBX Load Error:', err);
        if (mounted) setError('Failed to load 3D model. The file might be too large, missing textures, or uses an unsupported FBX version.');
        setLoading(false);
      }
    );

    // --- Animation Loop ---
    function animate() {
      if (!mounted) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // --- Resize Handler ---
    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [url]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        cursor: 'grab',
        background: '#0a0a0a'
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 10,
          gap: '1rem'
        }}>
          <FiLoader className="spinner" size={40} color="hsl(var(--primary))" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>Initializing 3D Engine</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Loading Model: {progress}%</span>
          </div>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.9)',
          zIndex: 10,
          gap: '1.5rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <FiAlertCircle size={48} color="var(--danger)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>Visualization Failed</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: '400px' }}>{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              background: 'hsl(var(--primary))', 
              color: 'white', 
              border: 'none', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Retry Loading
          </button>
        </div>
      )}
    </div>
  );
}

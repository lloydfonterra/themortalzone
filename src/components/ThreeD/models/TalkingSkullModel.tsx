/*
Initially auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useGLTF, RenderTexture, PerspectiveCamera } from '@react-three/drei';
import { useSpring, a, config, SpringValue } from '@react-spring/three';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector2 } from 'three';
import useToneStore from '../../../stores/toneStore';
import { useCameraStore } from '../../../stores/cameraStore';
import { usePlaneStore } from '../../../stores/planeStore';
import PlaneComponent from '../plane/PlaneComponent';
import { ThreeEvent } from '@react-three/fiber';
import { useThreeDStore } from '../../../stores/threeDStore';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

// Define the structure of your skull model
interface SkullGLTF extends GLTF {
  nodes: {
    defaultMaterial: THREE.Mesh;
    defaultMaterial_1: THREE.Mesh;
    defaultMaterial_2: THREE.Mesh;
    defaultMaterial_3: THREE.Mesh;
  };
  materials: {
    DefaultMaterial: THREE.Material;
  };
}

// Update the SkullMeshes props interface
interface SkullMeshesProps {
  nodes: SkullGLTF['nodes'];
  materials: SkullGLTF['materials'];
  talkSpring: {
    rotationX: SpringValue<number>;
  };
}

// Existing SkullMeshes component remains unchanged
const SkullMeshes: React.FC<SkullMeshesProps> = ({
  nodes,
  materials,
  talkSpring,
}) => (
  <>
    <mesh
      castShadow
      receiveShadow
      geometry={nodes.defaultMaterial.geometry}
      material={materials.DefaultMaterial}
    />
    <a.mesh
      castShadow
      receiveShadow
      geometry={nodes.defaultMaterial_1.geometry}
      material={materials.DefaultMaterial}
      rotation-x={talkSpring.rotationX}
    />
    <a.mesh
      castShadow
      receiveShadow
      geometry={nodes.defaultMaterial_2.geometry}
      material={materials.DefaultMaterial}
      rotation-x={talkSpring.rotationX}
    />
    <mesh
      castShadow
      receiveShadow
      geometry={nodes.defaultMaterial_3.geometry}
      material={materials.DefaultMaterial}
    />
  </>
);

export const TalkingSkull: React.FC<{
  renderAs2D?: boolean;
  cpuScreenRef?: React.RefObject<THREE.Mesh>;
  zPosition?: number;
  showTerminal?: boolean;
  showChat?: boolean;
}> = ({
  renderAs2D = false,
  cpuScreenRef,
  zPosition = -1.8,
  showTerminal = false,
  showChat = false,
  ...props
}) => {
  const { nodes, materials } = useGLTF(
    '/models/talkingskull/talkingskull-v2.glb',
  ) as unknown as SkullGLTF;
  const {
    getWaveformData,
    getActiveAudioSource,
    initializeAudio,
    setMasterGain,
    setVisualizerMode,
  } = useToneStore();
  const { planePositions, currentPositionKey, flipTexture, splitTexture } =
    usePlaneStore();
  const { toggleElement, showLeva } = useThreeDStore();
  const groupRef = useRef<THREE.Group>(null);
  const lookRef = useRef<THREE.Group>(null);
  const { gl, camera, size } = useThree();
  const sceneRef = useRef<THREE.Scene>(null);
  const maxAmplitudeRef = useRef(0);

  const currentPosition = planePositions[currentPositionKey];

  const planeRef = useRef<THREE.Mesh>(null);
  const planeWidth = 3.15;
  const planeHeight = 2.21;
  const planeAspect = planeWidth / planeHeight;

  const renderSize = useMemo(() => {
    const baseSize = 1080;
    return new Vector2(baseSize * planeAspect, baseSize);
  }, [planeAspect]);

  const { cycleCameraPosition, skullRotationSpeed, lookTrack, hoverIdle } =
    useCameraStore();

  const skullBounceClick = 'true';

  const [lookSpring, lookApi] = useSpring(() => ({
    rotationX: 0,
    rotationY: 0,
    config: { mass: 0.4, tension: 120, friction: 8 },
  }));

  const [talkSpring, talkApi] = useSpring(() => ({
    rotationX: 0,
    config: { mass: 0.1, tension: 2000, friction: 25 },
  }));

  const [hoverSpring, hoverApi] = useSpring(() => ({
    positionY: 0,
    rotationZ: 0,
    config: { mass: 1, tension: 180, friction: 12 },
  }));

  const [clickSpring, clickApi] = useSpring(() => ({
    positionY: 0,
    config: { tension: 180, friction: 10 },
  }));

  const [skullPosition, skullApi] = useSpring(() => ({
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    config: { mass: 0.4, tension: 300, friction: 25 },
  }));

  const [isTracking, setIsTracking] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  const X_ROTATION_OFFSET = -0.15;

  const skullCameraRef = useRef<THREE.PerspectiveCamera>(null);

  const handlePointerMove = useCallback(
    (event: MouseEvent | THREE.Event) => {
      if (isTracking && groupRef.current && lookTrack) {
        const { clientX, clientY } =
          event instanceof MouseEvent ? event : (event as any);
        const x = (clientX / gl.domElement.clientWidth) * 2 - 1;
        const y = -(clientY / gl.domElement.clientHeight) * 2 + 0.4;

        const baseRotationX = skullPosition.rotationX.get();
        const baseRotationY = skullPosition.rotationY.get();

        const skullPos = new THREE.Vector3(
          skullPosition.x.get(),
          skullPosition.y.get(),
          skullPosition.z.get(),
        );
        const skullRotation = new THREE.Euler(baseRotationX, baseRotationY, 0);
        const skullQuaternion = new THREE.Quaternion().setFromEuler(
          skullRotation,
        );

        const targetPosition = new THREE.Vector3(x, y, 1)
          .applyQuaternion(skullQuaternion)
          .add(skullPos);
        const direction = targetPosition.sub(skullPos).normalize();

        const rotationX =
          Math.asin(-direction.y) * 0.95 - baseRotationX + X_ROTATION_OFFSET;
        const rotationY =
          Math.atan2(direction.x, direction.z) * 0.95 - baseRotationY;

        lookApi.start({ rotationX, rotationY });
      }
    },
    [isTracking, lookTrack, groupRef, lookApi, gl.domElement, skullPosition],
  );

  const showVideoOnPlane = usePlaneStore((state) => state.showVideoOnPlane);
  const setShowVideoOnPlane = usePlaneStore(
    (state) => state.setShowVideoOnPlane,
  );

  // Video handling
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));

  useEffect(() => {
    const video = videoRef.current;
    video.src = '/media/lineglitch-rgb.mp4';
    video.crossOrigin = 'Anonymous';
    video.loop = false;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onended = handleVideoEnded;

    if (showVideoOnPlane) {
      video.play().catch((error) => {
        console.error('Video playback failed:', error);
        setShowVideoOnPlane(false);
      });
    }

    return () => {
      video.pause();
      video.src = '';
      video.onended = null;
    };
  }, [showVideoOnPlane, setShowVideoOnPlane]);

  const handleVideoEnded = () => {
    setShowVideoOnPlane(false);
    toggleElement('showLeva');
    cycleCameraPosition('next');
    initializeAudio();
    setMasterGain(1); // Set initial master gain to 1 (0dB)
  };

  const videoTexture = useMemo(() => {
    const video = videoRef.current;
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    return texture;
  }, []);

  useEffect(() => {
    let xOffset = 0;
    let yOffset = 0;
    let zOffset = 0;
    let rotationXOffset = 0;
    let rotationYOffset = 0;
    let rotationZOffset = 0;

    if (showTerminal) {
      // Terminal view offsets
      xOffset = -7.45;
      zOffset = -27.0;
      yOffset = 4.55;
      rotationXOffset = 0.25;
      rotationYOffset = 0.75;
      rotationZOffset = -0.08;
    } else if (showChat) {
      // Chat view offsets - adjusted for better visibility
      xOffset = 0.865;
      yOffset = 0;
      zOffset = 0.12;
      rotationXOffset = 0;
      rotationYOffset = -0.2;
      rotationZOffset = 0;
    }

    // Use spring animation for smooth transitions
    skullApi.start({
      x: xOffset,
      y: yOffset,
      z: zOffset,
      rotationX: rotationXOffset,
      rotationY: rotationYOffset,
      rotationZ: rotationZOffset,
      config: { mass: 0.4, tension: 300, friction: 25 },
    });
  }, [showTerminal, showChat, skullApi]);

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [handlePointerMove]);

  const updateAudioReactivity = useCallback(() => {
    const { getWaveformData, getActiveAudioSource } = useToneStore.getState();
    const activeSource = getActiveAudioSource();
    if (activeSource && activeSource.analyser) {
      const values = getWaveformData();
      const maxAmplitude = Math.max(...Array.from(values).map(Math.abs));

      const isAudioActive = maxAmplitude > 0.005;

      if (isAudioActive && maxAmplitude !== maxAmplitudeRef.current) {
        maxAmplitudeRef.current = maxAmplitude;
        const rotationValue = maxAmplitude * 1.25;
        talkApi.start({ rotationX: -rotationValue });
      } else if (!isAudioActive) {
        talkApi.start({ rotationX: 0 });
      }
    }
  }, [talkApi]);

  useFrame(() => {
    if (groupRef.current && hoverIdle) {
      const time = Date.now() / 1000;
      hoverApi.start({
        positionY: Math.sin(time) * 0.03,
        rotationZ: Math.sin(time * 1.5) * 0.03,
      });
    } else if (!hoverIdle) {
      hoverApi.start({ positionY: 0, rotationZ: 0 });
    }

    if (!renderAs2D) {
      updateAudioReactivity();
    }
  });

  useFrame((state, delta) => {
    if (skullRef.current && skullRotationSpeed !== 0) {
      skullRef.current.rotation.y += skullRotationSpeed * delta;
    }
  });

  useEffect(() => {
    if (renderAs2D) {
      const intervalId = setInterval(updateAudioReactivity, 1000 / 120);
      return () => clearInterval(intervalId);
    }
  }, [renderAs2D, updateAudioReactivity]);

  const handlePointerEnter = useCallback(() => {
    if (lookTrack) {
      setIsTracking(true);
      if (hoverTimer) clearTimeout(hoverTimer);
    }
  }, [lookTrack, hoverTimer]);

  const handlePointerLeave = useCallback(() => {
    if (lookTrack) {
      const timer = setTimeout(() => {
        setIsTracking(false);
        lookApi.start({ rotationX: 0, rotationY: 0 });
      }, 1200);
      setHoverTimer(timer);
    }
  }, [lookTrack, lookApi]);

  const handleClick = useCallback(() => {
    if (skullBounceClick) {
      clickApi.start({
        positionY: 0.08,
        config: { tension: 800, friction: 3 },
      });
      setTimeout(() => {
        clickApi.start({
          positionY: 0,
          config: { tension: 800, friction: 13 },
        });
      }, 10);
    }
  }, [skullBounceClick, clickApi]);

  const meshes = useMemo(
    () => (
      <SkullMeshes
        nodes={nodes}
        materials={materials}
        talkSpring={talkSpring}
      />
    ),
    [nodes, materials, talkSpring],
  );

  const { renderOpacity } = useSpring({
    renderOpacity: showVideoOnPlane ? 0 : 1,
    config: { duration: 2000 },
  });

  // Add a ref to track the previous state
  const prevVideoState = useRef(showVideoOnPlane);

  // Use an effect to detect the transition
  useEffect(() => {
    if (prevVideoState.current && !showVideoOnPlane) {
      // Video is transitioning from showing to not showing
      setVisualizerMode('butterchurn');
    }
    prevVideoState.current = showVideoOnPlane;
  }, [showVideoOnPlane, setVisualizerMode]);

  const { revealRotation } = useSpring({
    revealRotation: showVideoOnPlane ? Math.PI / 1.8 : 0,
    config: { tension: 345, friction: 125 },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'rotate' | 'move' | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialTransform = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
  });
  const skullRef = useRef<THREE.Group>(null);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (renderAs2D && showTerminal && groupRef.current) {
        event.stopPropagation();
        setIsDragging(true);
        setDragType(event.button === 0 ? 'rotate' : 'move');
        dragStart.current = { x: event.clientX, y: event.clientY };
        initialTransform.current.position.set(
          skullPosition.x.get(),
          skullPosition.y.get(),
          skullPosition.z.get(),
        );
        initialTransform.current.rotation.set(
          skullPosition.rotationX.get(),
          skullPosition.rotationY.get(),
          skullPosition.rotationZ.get(),
        );
      }
    },
    [renderAs2D, showTerminal, skullPosition],
  );

  const handlePointerMoveDrag = useCallback(
    (event: MouseEvent) => {
      if (isDragging && renderAs2D && showTerminal && groupRef.current) {
        event.preventDefault();
        const deltaX = event.clientX - dragStart.current.x;
        const deltaY = event.clientY - dragStart.current.y;

        if (dragType === 'rotate') {
          const rotationSensitivity = 0.01;
          skullApi.start({
            rotationX:
              initialTransform.current.rotation.x +
              deltaY * rotationSensitivity,
            rotationY:
              initialTransform.current.rotation.y +
              deltaX * rotationSensitivity,
          });
        } else if (dragType === 'move') {
          const positionSensitivity = 0.005;
          skullApi.start({
            x:
              initialTransform.current.position.x +
              deltaX * positionSensitivity,
            y:
              initialTransform.current.position.y -
              deltaY * positionSensitivity,
          });
        }
      }
    },
    [isDragging, renderAs2D, showTerminal, dragType, skullApi],
  );

  const handlePointerUpDrag = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMoveDrag);
      window.addEventListener('mouseup', handlePointerUpDrag);
    } else {
      window.removeEventListener('mousemove', handlePointerMoveDrag);
      window.removeEventListener('mouseup', handlePointerUpDrag);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMoveDrag);
      window.removeEventListener('mouseup', handlePointerUpDrag);
    };
  }, [isDragging, handlePointerMoveDrag, handlePointerUpDrag]);

  const skullContent = useMemo(
    () => (
      <a.group
        position-x={skullPosition.x}
        position-y={skullPosition.y.to((y) => y + 0.1)}
        position-z={renderAs2D ? skullPosition.z : zPosition}
        rotation-x={skullPosition.rotationX}
        rotation-y={skullPosition.rotationY}
        rotation-z={skullPosition.rotationZ}
      >
        <a.group
          ref={groupRef}
          dispose={null}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          position-y={clickSpring.positionY}
          rotation-x={revealRotation}
        >
          <a.group
            position-y={hoverSpring.positionY}
            rotation-z={hoverSpring.rotationZ}
          >
            <a.group
              ref={lookRef}
              rotation-x={lookSpring.rotationX}
              rotation-y={lookSpring.rotationY}
            >
              <group ref={skullRef}>
                <group rotation={[-Math.PI / 1.93, 0, 0]}>
                  <group rotation={[Math.PI / 2, 3.14, 0]}>
                    {meshes}
                    <PlaneComponent
                      key="main"
                      position={currentPosition.position}
                      rotation={currentPosition.rotation}
                      scale={currentPosition.scale}
                      geometry={currentPosition.geometry}
                      flipTexture={flipTexture}
                      splitTexture={splitTexture}
                      isLeftHalf={false}
                    />
                    <PlaneComponent
                      key="mirrored"
                      position={
                        currentPosition.position.map((v, i) =>
                          i === 0 ? -v : v,
                        ) as [number, number, number]
                      }
                      rotation={[
                        currentPosition.rotation[0],
                        -currentPosition.rotation[1],
                        -currentPosition.rotation[2],
                      ]}
                      scale={
                        currentPosition.scale.map((v, i) =>
                          i === 0 ? -v : v,
                        ) as [number, number, number]
                      }
                      geometry={currentPosition.geometry}
                      flipTexture={flipTexture}
                      splitTexture={splitTexture}
                      isLeftHalf={true}
                    />
                  </group>
                </group>
              </group>
            </a.group>
          </a.group>
        </a.group>
      </a.group>
    ),
    [
      groupRef,
      handlePointerEnter,
      handlePointerLeave,
      handleClick,
      handlePointerDown,
      clickSpring,
      hoverSpring,
      lookSpring,
      lookRef,
      meshes,
      currentPosition,
      flipTexture,
      splitTexture,
      zPosition,
      renderAs2D,
      skullPosition.x,
      skullPosition.y,
      skullPosition.z,
      skullPosition.rotationX,
      skullPosition.rotationY,
      skullPosition.rotationZ,
      revealRotation,
    ],
  );

  const { videoColor } = useSpring({
    videoColor: showVideoOnPlane ? 'white' : 'black',
    config: { duration: 180 },
  });

  return (
    <>
      {renderAs2D ? (
        <scene ref={sceneRef}>
          <mesh position={[0.025, 0, -0.99]} rotation={[-0.05, 0, 0]}>
            <planeGeometry args={[planeWidth, planeHeight]} />
            <a.meshBasicMaterial color={videoColor} transparent>
              <primitive attach="map" object={videoTexture} />
            </a.meshBasicMaterial>
          </mesh>

          <mesh position={[0.025, 0, -0.99]} rotation={[-0.05, 0, 0]}>
            <planeGeometry args={[planeWidth, planeHeight]} />
            <a.meshBasicMaterial opacity={renderOpacity} transparent>
              <RenderTexture
                attach="map"
                width={renderSize.x}
                height={renderSize.y}
              >
                <PerspectiveCamera
                  ref={skullCameraRef}
                  makeDefault
                  manual
                  aspect={planeAspect}
                  position={[0, -0.04, 3.8]}
                  fov={40}
                />
                <ambientLight intensity={1.2} />
                <directionalLight position={[0, -1.25, 0.75]} intensity={3} />
                <color attach="background" args={['#000']} />
                {React.cloneElement(skullContent, { renderAs2D: true })}
              </RenderTexture>
            </a.meshBasicMaterial>
          </mesh>
        </scene>
      ) : (
        skullContent
      )}
    </>
  );
};

export default TalkingSkull;

useGLTF.preload('/models/talkingskull/talkingskull-v2.glb');

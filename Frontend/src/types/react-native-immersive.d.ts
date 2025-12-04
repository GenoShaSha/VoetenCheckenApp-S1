declare module 'react-native-immersive' {
  const Immersive: {
    on: () => void;
    off: () => void;
    setImmersive: (immersive: boolean) => Promise<void>;
    getImmersive: () => Promise<boolean>;
    addImmersiveListener: (callback: () => void) => void;
    removeImmersiveListener: (callback: () => void) => void;
  };
  export default Immersive;
}

import { StatusBar } from 'expo-status-bar';
import ExploreScreen from './src/screens/ExploreScreen';

export default function App() {
  return (
    <>
      <ExploreScreen />
      <StatusBar style="auto" />
    </>
  );
}
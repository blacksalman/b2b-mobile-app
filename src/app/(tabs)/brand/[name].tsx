import { useLocalSearchParams } from 'expo-router';
import { StubScreen } from '@/components/shell/StubScreen';

export default function BrandScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <StubScreen title="Brand" detail={decodeURIComponent(name ?? '')} />;
}

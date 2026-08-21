import { useLocalSearchParams } from 'expo-router';
import { StubScreen } from '@/components/shell/StubScreen';

export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <StubScreen title="Category" detail={decodeURIComponent(name ?? '')} />;
}

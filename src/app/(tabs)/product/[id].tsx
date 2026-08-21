import { useLocalSearchParams } from 'expo-router';
import { StubScreen } from '@/components/shell/StubScreen';
import { productById } from '@/data/products';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = productById(Number(id));
  return <StubScreen title="Product detail" detail={product?.name ?? `Product #${id}`} />;
}

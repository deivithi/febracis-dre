import { useEffect, useState } from 'react';

const WIDE_QUERY = '(min-width: 1280px)';

/** Layout do dashboard comparativo: duas colunas a partir de 1280px. */
export function useDashboardWideLayout() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(WIDE_QUERY).matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return wide;
}

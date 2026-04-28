import { Component, type ErrorInfo, type ReactNode } from 'react';
import { OperationalErrorScreen } from './OperationalErrorScreen';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Evita tela preta por exceções não tratadas em árvore React.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[febracis-dre] AppErrorBoundary', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <OperationalErrorScreen
          title="Erro na interface do portal"
          message={err.message || 'Ocorreu um erro inesperado ao renderizar a aplicação.'}
          hint="Recarregue a página. Se o problema persistir, verifique o deploy mais recente na Vercel e variáveis VITE_SUPABASE_* em Production."
          detail={err.stack}
        />
      );
    }

    return this.props.children;
  }
}

import { Component } from 'react';

/** 模型 404 / 網路失敗 / glb 損毀時，改顯示 fallback，避免整個 Canvas 掛掉。 */
export class AvatarErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[Avatar] 模型載入失敗，改用占位角色：', error?.message ?? error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

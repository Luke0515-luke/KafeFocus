// 背景點擊關閉：只有「按下」與「放開」都落在背景上才關閉。
// 避免在視窗內按住滑鼠（選文字、拉滑桿、拖曳）拖到視窗外放開時，視窗被誤關。
let downOnBackdrop = false;

export function backdropProps(onClose) {
  return {
    onPointerDown: (e) => {
      downOnBackdrop = e.target === e.currentTarget;
    },
    onPointerUp: (e) => {
      if (downOnBackdrop && e.target === e.currentTarget) onClose?.();
      downOnBackdrop = false;
    },
  };
}

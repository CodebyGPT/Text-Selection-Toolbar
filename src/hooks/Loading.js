/**
 * 全局或者局部通用的 Loading 加载中 React 占位组件
 */
export default function Loading() {
  return (
    <center>
      <style>{`@keyframes kt-spin { to { transform: rotate(360deg); } }`}</style>
      <div>
        <a href={process.env.REACT_APP_HOMEPAGE}>
          {`Text Selection Toolbar v${process.env.REACT_APP_VERSION}`}
        </a>
      </div>
      <span
        className="kt-spinner"
        style={{
          display: "inline-block",
          width: 32,
          height: 32,
          marginTop: 12,
          border: "3px solid rgba(128,128,128,.3)",
          borderTopColor: "currentColor",
          borderRadius: "50%",
          animation: "kt-spin .7s linear infinite",
        }}
      />
    </center>
  );
}

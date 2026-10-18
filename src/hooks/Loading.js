import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";

/**
 * 全局或者局部通用的 Loading 加载中 React 占位组件
 * 显示 Text Selection Toolbar 名称、当前版本号以及一个圆形的 Material-UI 加载环 (CircularProgress)
 */
export default function Loading() {
  return (
    <center>
      <Divider>
        <Link
          href={process.env.REACT_APP_HOMEPAGE}
        >{`Text Selection Toolbar v${process.env.REACT_APP_VERSION}`}</Link>
      </Divider>
      <CircularProgress />
    </center>
  );
}

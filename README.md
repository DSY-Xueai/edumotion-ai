# Remotion AI

基于 Remotion 的自动视频生成项目。

当前第一版支持：
- 输入 `txt`、`md`、`docx`
- 可选传入图片路径
- 自动将原始文案转换为标准 JSON
- 输出 `1080x1920` 竖屏 `mp4`

## 安装

```bash
npm install
```

## 用法

### 从文案直接渲染视频

```bash
npm run render -- tests/fixtures/article.txt out/article.mp4
```

### 携带可选图片渲染

```bash
npm run render -- tests/fixtures/article.txt out/article.mp4 assets/cover.jpg assets/body-1.jpg
```

## 输出

渲染完成后会得到：
- `out/video-spec.json`：自动生成的标准 JSON
- `out/*.mp4`：最终视频文件

## 开发命令

```bash
npm test
npm run lint:types
npm run dev
```

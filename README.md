# UI 与交互设计作品集

这是一个纯静态站点。首页、案例页和关于页共享同一套样式。

## 本地预览

双击 `index.html` 即可预览。也可以在本目录用你已有的静态服务器预览整个目录。

## 补齐内容

1. 首页和关于页已填写姓名。需要更新联系电话时编辑 `about.html`，同时修改显示号码和 `tel:` 链接。
2. 首页以 CINIS 自律打卡为主案例，其余三个案例为西湖空间图志、孔雀神记和电竞椅设计。四个案例使用已有项目说明或你提供的图像。补充时写清本人职责、方案取舍、素材来源和实际验证情况。已另行发布原型的项目可以加入体验链接。
3. 添加案例时，复制 `cases/template.html`，完成内容、标题和封面后删除其中的 `noindex`。再复制首页的项目卡，更新案例链接。封面放在 `assets/`，首个项目用你最能讲清楚设计决策的作品。
4. 西湖图像使用已有三维模型的渲染，保留案例页的空间数据署名。

## 部署到 GitHub Pages

将站点文件放到仓库根目录，使 `index.html` 与 `assets/` 同级。在仓库的 **Settings → Pages** 选择 **Deploy from a branch**，设为 `main` 与 `/(root)`。纯静态部署可以在仓库根目录加入空的 `.nojekyll` 文件。

## 部署到 Cloudflare Pages

在 **Workers & Pages → Create application → Pages** 导入 GitHub 仓库。只要仓库里的站点文件仍放在 `portfolio/`，就按下表填写。若将该目录内的文件直接作为独立仓库的根目录提交，则 **Root directory** 留空。

| 字段 | 配置 |
| --- | --- |
| Production branch | 作品集所在的分支，通常是 `main` |
| Framework preset | None |
| Build command | 留空 |
| Build output directory | `.` |
| Root directory | `portfolio` |

部署后用项目的 `*.pages.dev` 地址打开首页，并检查案例页的直达链接和昼夜切换。

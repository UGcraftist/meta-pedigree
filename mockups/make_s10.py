#!/usr/bin/env python3
"""Render the S-10 数据录入与核验台 mockup as a PNG (D1 档案桌 tokens)."""
from PIL import Image, ImageDraw, ImageFont

S = 2
W, H = 1440, 900

PAPER = "#FAF8F4"
INK = "#1F2328"
RULE = "#D9D2C6"
BRASS = "#B07D3C"
MUTED = "#6B7280"
SOFT = "#FBF6EE"
WHITE = "#FFFFFF"
OK = "#3F7D5A"
ERR = "#B42318"

SANS = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
SANS_M = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"
SANS_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
SERIF = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
SERIF_SB = "/usr/share/fonts/opentype/noto/NotoSerifCJK-SemiBold.ttc"
MONO = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

_cache = {}


def F(path, size):
    key = (path, size)
    if key not in _cache:
        _cache[key] = ImageFont.truetype(path, int(size * S), index=2)
    return _cache[key]


img = Image.new("RGB", (W * S, H * S), PAPER)
d = ImageDraw.Draw(img)


def u(v):
    return int(round(v * S))


def text(x, y, s, font, fill=INK, anchor="la"):
    d.text((u(x), u(y)), s, font=font, fill=fill, anchor=anchor)


def tw(s, font):
    return d.textlength(s, font=font) / S


def rrect(x, y, w, h, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([u(x), u(y), u(x + w), u(y + h)], radius=u(r),
                        fill=fill, outline=outline, width=u(width) if width else 1)


def line(x1, y1, x2, y2, fill=RULE, width=1):
    d.line([u(x1), u(y1), u(x2), u(y2)], fill=fill, width=u(width))


def chip(x, y, label, fg=MUTED, bg=WHITE, border=RULE, h=22, font=None, padx=8, mk=1):
    font = font or F(SANS, 10.5)
    w = tw(label, font) + padx * 2
    rrect(x, y, w, h, h / 2, fill=bg, outline=border, width=1)
    text(x + padx, y + (h - 11) / 2 + 0.5, label, font, fill=fg)
    return w


def label(x, y, s, req=False):
    text(x, y, s, F(SANS, 10.5), MUTED)
    if req:
        text(x + tw(s, F(SANS, 10.5)) + 6, y, "必填", F(SANS, 9), BRASS)


def field(x, y, w, value, ph=False, h=38, focus=False):
    rrect(x, y, w, h, 6, fill=WHITE if not ph else "#FDFCF9",
          outline=BRASS if focus else RULE, width=1.5 if focus else 1)
    text(x + 10, y + 12, value, F(SANS, 12), INK if not ph else "#9AA0A6")


# ---------------- top bar ----------------
text(24, 8, "META PEDIGREE", F(SANS_M, 9), MUTED)
text(24, 20, "数据录入与核验台", F(SERIF_SB, 21), INK)

# search
rrect(520, 14, 300, 34, 6, fill=WHITE, outline=RULE)
text(532, 23, "搜索组织、人物、别名", F(SANS, 11.5), "#9AA0A6")
text(806, 22, "/", F(MONO, 10), MUTED, anchor="ra")

# view switcher
tabs = [("谱系树", True), ("时间轴", False), ("关系网", False)]
tx = 856
for name, active in tabs:
    f = F(SANS_M, 12) if active else F(SANS, 12)
    text(tx, 25, name, f, INK if active else MUTED)
    if active:
        line(tx, 46, tx + tw(name, f), 46, BRASS, 2)
    tx += tw(name, f) + 22

# right actions
text(1252, 26, "复制链接", F(SANS, 11.5), MUTED)
d.ellipse([u(1380), u(14), u(1412), u(46)], fill="#EDE3D3")
text(1396, 30, "UG", F(SANS_B, 9), BRASS, anchor="mm")

line(24, 58, 1416, 58, RULE)

# ---------------- filter bar ----------------
chip(24, 68, "时间 2015–2026  ×", INK, WHITE, RULE, 24)
chip(146, 68, "地区 欧盟  ×", INK, WHITE, RULE, 24)
chip(240, 68, "类型 控股  ×", INK, WHITE, RULE, 24)
chip(336, 68, "置信度 中  ×", INK, WHITE, RULE, 24)
chip(432, 68, "＋ 筛选", MUTED, PAPER, RULE, 24)
text(1330, 74, "重置 4 项", F(SANS, 10.5), MUTED, anchor="ra")
line(24, 102, 1416, 102, RULE)

# ---------------- left column: queue ----------------
rrect(24, 116, 316, 644, 8, fill=WHITE, outline=RULE)
text(40, 130, "待核验事实", F(SANS_B, 13.5), INK)
text(126, 132, "7", F(SANS_B, 12), BRASS)
text(300, 132, "按最近编辑", F(SANS, 10), MUTED, anchor="ra")
d.polygon([u(306), u(136), u(314), u(136), u(310), u(141)], fill=MUTED)

rows = [
    ("深智科技", "Atlas Robotics", "控股 60%", "2015", "年", True, "p.142"),
    ("Atlas Robotics", "Helio Labs", "分拆", "2018", "年", False, "p.77"),
    ("深智科技", "NovaSense", "更名（原 Nova AI）", "2019", "日", False, "官网"),
    ("Helio Labs", "Orbital Works", "联盟", "2021–", "区间", False, "p.31"),
    ("NovaSense", "深智科技", "合并", "2022", "未知", False, "无来源"),
]
y = 156
for a, b, rel, year, prec, sel, src in rows:
    if sel:
        rrect(28, y, 308, 78, 6, fill=SOFT)
        d.rectangle([u(28), u(y + 8), u(31), u(y + 70)], fill=BRASS)
    text(40, y + 10, f"{a} ↔ {b}", F(SANS_M if sel else SANS, 12), INK)
    cw = chip(40, y + 32, rel, BRASS, WHITE, "#E4D3B8", 20, F(SANS, 10), 7)
    text(40 + cw + 8, y + 35, year, F(MONO, 10), MUTED)
    text(40 + cw + 8 + tw(year, F(MONO, 10)) + 10, y + 35, prec, F(SANS, 9), MUTED)
    text(40, y + 56, ("来源 " + src) if src != "无来源" else "无来源 · 将标记为「无来源」",
         F(SANS, 9.5), MUTED if src != "无来源" else ERR)
    text(324, y + 34, "›", F(SANS, 14), MUTED, anchor="ra")
    y += 86

line(40, 590, 324, 590, RULE)
text(40, 604, "草稿 2 · 冲突 1 · 待核验 4", F(SANS, 10), MUTED)
text(40, 626, "Enter 保存并下一条 · Cmd+Enter 发布", F(SANS, 9.5), MUTED)
text(40, 660, "公开范围", F(SANS, 10), MUTED)
rrect(96, 656, 120, 22, 11, fill=WHITE, outline=RULE)
d.ellipse([u(100), u(659), u(114), u(673)], fill=BRASS)
text(120, 661, "全员可见", F(SANS, 9.5), INK)

# ---------------- centre column: form ----------------
rrect(356, 116, 664, 644, 8, fill=WHITE, outline=RULE)
text(372, 130, "新增关系", F(SERIF_SB, 16), INK)
text(1004, 133, "ORG-eu-012 ↔ ORG-us-004", F(MONO, 9.5), MUTED, anchor="ra")
text(372, 152, "草稿 · 未发布", F(SANS, 9.5), BRASS)
line(372, 172, 1004, 172, RULE)

label(372, 184, "主体组织")
field(372, 200, 300, "深智科技 · ORG-eu-012")
label(692, 184, "关联组织")
field(692, 200, 300, "Atlas Robotics · ORG-us-004")

label(372, 252, "关系类型")
rrect(372, 268, 210, 38, 6, fill=WHITE, outline=RULE)
text(382, 281, "控股", F(SANS, 12), INK)
chip(424, 277, "60%", BRASS, SOFT, "#E4D3B8", 20, F(SANS, 9.5), 6)
d.polygon([u(556), u(284), u(566), u(284), u(561), u(290)], fill=MUTED)

label(692, 252, "置信度")
line(692, 292, 980, 292, RULE, 3)
d.ellipse([u(790), u(285), u(804), u(299)], fill=BRASS)
text(692, 302, "低", F(SANS, 9), MUTED)
text(822, 302, "中 · 有出处、单源", F(SANS, 9), BRASS)
text(980, 302, "高", F(SANS, 9), MUTED, anchor="ra")

label(372, 326, "时间范围")
field(372, 342, 120, "2015")
text(500, 355, "→", F(SANS, 12), MUTED)
field(520, 342, 120, "—", ph=True)
seg = ["日", "月", "年", "区间", "未知"]
sx = 664
for i, s in enumerate(seg):
    active = s == "年"
    w = 62
    rrect(sx, 342, w, 38, 6, fill=SOFT if active else WHITE,
          outline=BRASS if active else RULE, width=1.5 if active else 1)
    text(sx + w / 2, 355, s, F(SANS_M if active else SANS, 11),
         BRASS if active else MUTED, anchor="mm")
    sx += w + 6
text(372, 388, "只知年份也合法（US-002）；精度会画成带子", F(SANS, 9.5), MUTED)

label(372, 414, "来源", req=True)
field(372, 430, 430, "《European Robotics Almanac 2016》")
label(814, 414, "定位")
field(814, 430, 190, "p.142")

rrect(372, 482, 632, 92, 6, fill=SOFT, outline="#E4D3B8")
d.rectangle([u(372), u(490), u(375), u(566)], fill=BRASS)
text(388, 492, "「深智科技于 2015 年以 60% 股权控股 Atlas Robotics，", F(SANS, 11.5), INK)
text(388, 512, "交易金额未披露。」", F(SANS, 11.5), INK)
text(388, 540, "引文随记录保存，详情页与导出附录复用（FR-003）", F(SANS, 9.5), MUTED)
text(988, 492, "已核对", F(SANS, 9.5), OK, anchor="ra")

# checkbox row
rrect(372, 586, 14, 14, 3, fill=BRASS)
text(377, 587, "✓", F(SANS_B, 8.5), WHITE)
text(392, 585, "可公开引用（出版物中署名引文）", F(SANS, 10.5), INK)
chip(576, 582, "单一来源", MUTED, PAPER, RULE, 20, F(SANS, 9), 7)

label(372, 614, "备注（可选）")
field(372, 630, 632, "2017 年增持至 100% —— 是否另建一条记录？", ph=False, h=34)

line(372, 686, 1004, 686, RULE)
text(372, 698, "保存即写入审计轨迹：修改人、时间、依据页（US-021）。", F(SANS, 9.5), MUTED)

# ---------------- right column ----------------
rrect(1036, 116, 380, 292, 8, fill=WHITE, outline=RULE)
text(1052, 130, "来源引用", F(SANS_B, 12.5), INK)
text(1200, 132, "1 条 · 已核验", F(SANS, 9.5), OK)
line(1052, 150, 1400, 150, RULE)
rrect(1052, 160, 348, 64, 6, fill=SOFT)
text(1064, 170, "《European Robotics Almanac 2016》p.142", F(SANS, 10), INK)
text(1064, 188, "「…a 60% stake in Atlas Robotics…」", F(SANS, 10), MUTED)
text(1064, 206, "可打开原文 · 短引文已收录", F(SANS, 9), MUTED)
meta = [("类型", "书籍 · 纸质"), ("定位", "p.142 · ISBN 978-3…"), ("截至", "2016-01-01"), ("许可", "可引用，不可再分发")]
my = 240
for k, v in meta:
    text(1052, my, k, F(SANS, 10), MUTED)
    text(1112, my, v, F(SANS, 10), INK)
    my += 20
rrect(1052, 330, 150, 30, 6, fill=WHITE, outline=RULE)
text(1064, 338, "在原文中打开 ↗", F(SANS, 10), INK)
rrect(1214, 330, 120, 30, 6, fill=WHITE, outline=RULE)
text(1226, 338, "查看历史 r12", F(SANS, 10), INK)

rrect(1036, 420, 380, 168, 8, fill=WHITE, outline="#E4D3B8")
text(1052, 434, "冲突检查", F(SANS_B, 12.5), INK)
d.ellipse([u(1104), u(440), u(1114), u(450)], fill=BRASS)
text(1122, 436, "1 处", F(SANS, 9.5), BRASS)
line(1052, 458, 1400, 458, RULE)
text(1052, 468, "2017 年的记录写「增持至 100%」，与本条", F(SANS, 10.5), INK)
text(1052, 486, "60% 不一致；两条并列显示，不覆盖。", F(SANS, 10.5), INK)
text(1052, 510, "来源：ORG-us-004 历史版本 v3（2017-08-02）", F(SANS, 9), MUTED)
rrect(1052, 534, 130, 28, 6, fill=WHITE, outline=RULE)
text(1064, 541, "并列显示两值", F(SANS, 9.5), INK)
rrect(1194, 534, 110, 28, 6, fill=WHITE, outline=RULE)
text(1206, 541, "标注为冲突", F(SANS, 9.5), INK)

rrect(1036, 600, 380, 160, 8, fill=WHITE, outline=RULE)
text(1052, 614, "词语表 · 关系类型", F(SANS_B, 12.5), INK)
text(1400, 616, "5 已注册 · 开放新增", F(SANS, 9), MUTED, anchor="ra")
line(1052, 636, 1400, 636, RULE)
cx = 1052
for name, active in [("合并", 0), ("分拆", 0), ("更名", 0), ("控股", 1), ("联盟", 0)]:
    w = chip(cx, 648, name, BRASS if active else INK, SOFT if active else WHITE,
             BRASS if active else RULE, 24, F(SANS, 10), 8)
    if active:
        # underline style cue for "selected"
        rrect(cx + 8, 668, w - 16, 2, 1, fill=BRASS)
    cx += w + 6
chip(cx, 648, "＋ 添加类型", MUTED, PAPER, RULE, 24, F(SANS, 10), 8)
text(1052, 692, "新增类型只加注册表条目，不改存储与接口；", F(SANS, 9.5), MUTED)
text(1052, 708, "政党域可追加「联盟 / 派系 / 继承」（US-024）。", F(SANS, 9.5), MUTED)

# ---------------- bottom bar ----------------
line(0, 772, W, 772, RULE)
rrect(0, 773, W, 63, 0, fill=WHITE)
text(24, 790, "UGcraftist · 2026-11-14 23:02 · 依据 p.142 · 版本 r12（草稿）", F(SANS, 10.5), MUTED)
text(24, 808, "无来源事实显示为「无来源」，不进入公开视图", F(SANS, 9.5), ERR)

btn = [("保存草稿", "#FDFCF9", RULE, INK), ("提交核验", WHITE, RULE, INK), ("保存并发布", BRASS, BRASS, WHITE)]
bx = 1400
for txt, bg, bd, fg in reversed(btn):
    f = F(SANS_M, 11.5)
    w = tw(txt, f) + 34
    bx -= w
    rrect(bx, 790, w, 32, 6, fill=bg, outline=bd)
    text(bx + w / 2, 798, txt, f, fg, anchor="ma")
    bx -= 10

text(24, 870, "S-10 数据录入与核验台 · 状态 ready · D1 档案桌 · 1440 × 900", F(SANS, 9), MUTED)

img = img.resize((W, H), Image.LANCZOS)
img.save("/home/vboxuser/AI-projects/meta-pedigree/mockups/s-10-data-entry.png")
print("saved")

# User stories: Meta Pedigree

> Who the users are and what they need, before any solution. Personas from the kickoff
> interview (2026-11-14, UGcraftist) and the two reference projects in `ref/`.

## Personas

| ID | Persona | Goal | Context | Source (who speaks for them) |
|---|---|---|---|---|
| P1 | 开源情报分析者 | 在有限时间内回答"这个党/公司/组织从哪来、和谁有关、关键人现在在哪"，并给出能核对的依据 | 常被要求几天内交一份某地区"组织与人事"简报；资料散在新闻、数据库、档案里；今天用关系图工具看"此刻的关系网"，但随时间分合只能靠表格加手工画图，每换一个问题就重画一次 | 发起人（2026-11-14 访谈）；具体工作细节为 assumption |
| P2 | 时政观察者 / 记者 | 热点发生时尽快看清某个组织的前身今身和关键人物去向，截一张能对读者负责的图 | 选题窗口短，要求一眼看懂；读者要能点开验证；图一旦没来源就不能用 | 发起人（2026-11-14 访谈）；写稿流程细节为 assumption |
| P3 | 文科研究人员 | 把一个地区的政党/企业/人物谱系做成可引用、可复现、能逐年追溯的图，写进论文和书稿 | 研究以年计，重视文献页码与史料争议，重视"不知道"与"有冲突"的区分；今天用人物传记类数据库加静态图，换一次数据就要重画 | 发起人（2026-11-14 访谈）；学术引用习惯细节为 assumption |
| P4 | 数据策展人（共同开发者 / 研究助理） | 把新事实与来源录进系统，纠错，决定谁能看，而不必每次改代码 | 与 P1–P3 合作，对数据质量负责；数据集中在一处，图直接读这份数据；今天手工改表再重新生成图 | 共同开发者（发起人转述，2026-11-14） |

## Epics

- E1 可信数据：每条事实可回溯到来源与时间，缺失和不确定显式呈现。
- E2 组织谱系：沿时间看清政党、企业、组织的前身今身与分合关系。
- E3 人物轨迹：看清一个人跨组织的任职与流动。
- E4 探索与对比：聚焦、筛选、比较、换视角，回答"这到底是怎么回事"。
- E5 发布与协作：把当前画面变成可分享、可引用、可协作的成果。

## Stories

### US-001 每条事实都能追到来源
- Epic: E1 · Persona: P3 · Status: draft
- Story: 作为文科研究人员，我想在图上点开任何一条关系或任职时看到它的出处（文献、页码或链接）和"截至何时"，以便我能在论文里安全引用。
- Acceptance criteria:
  - Given 一条组织分合关系，when 我打开它的详情，then 我看到的来源名称、定位（页码或链接）和数据截止日期。
  - Given 一条没有来源的事实，when 我查看它，then 它被明确标为"无来源"，而不是留空或被补全成看似确定的内容。
  - Given 一条可用的事实，when 我要引用它，then 我能复制一条写清作者、文献与定位的引文。
- Relations: 无
- Source: 访谈（P3 关切）；`ref/` 中尼泊尔示例以书中摘录作悬浮说明的做法

### US-002 缺失与不确定要显式标出
- Epic: E1 · Persona: P3 · Status: draft
- Story: 作为研究者，我想让"只知道年份""两份材料说法冲突""来源未载"各看起来不一样，以便我不会把推测当成事实。
- Acceptance criteria:
  - Given 一条只有年份的记录，when 它出现在图上，then 它不被画成精确到日的点，并且精度（年 / 月 / 日）可见。
  - Given 两份材料给出不同的年份，when 我查看这条事实，then 两种说法并列显示，并各自带来源。
  - Given 某个字段缺失，when 我筛选或导出，then 缺失被单独统计出来，而不是被当成零。
- Relations: depends-on US-001
- Source: 访谈（P3）+ 两个参考案例都把"缺失/低置信"显式标出

### US-003 更新数据后不必改代码
- Epic: E1 · Persona: P4 · Status: draft
- Story: 作为数据策展人，我想把新组织、新关系、新来源录入后，图立刻反映，以便我一天能录入很多条而不必等一次重新发布。
- Acceptance criteria:
  - Given 我新增一个组织和一条关系，when 我刷新图，then 它们出现在正确的时间位置和所在谱系里。
  - Given 我录入的关系指向一个不存在的组织，when 我保存，then 系统拒绝并指出是哪个引用有问题。
  - Given 我更正了一条已发布的事实，when 我保存，then 图上更新，并且留下"谁、何时、改了什么"的记录。
- Relations: depends-on US-001
- Source: 访谈（P4 的工作方式）

### US-004 沿时间看一个组织的谱系
- Epic: E2 · Persona: P1 · Status: draft
- Story: 作为分析者，我想从一个组织出发，沿时间看到它的前身、后继与分支，以便回答"这个党/公司是怎么来的"。
- Acceptance criteria:
  - Given 一个组织，when 我聚焦它，then 图上高亮它和与它直接相连的组织链，其余内容淡出。
  - Given 一条谱系分成多支，when 我沿其中一支继续看，then 其余支仍然可见但不抢注意力。
  - Given 组织在时间上有断档，when 我看断档处，then 明确写着"记载中断"，而不是用虚线把两端接起来。
- Relations: 无
- Source: 访谈（P1 的核心问题）；参考案例的"组织列 + 分合线"结构

### US-005 五种组织关系不混
- Epic: E2 · Persona: P1 · Status: draft
- Story: 作为分析者，我想一眼区分改名、整体合并、分裂、部分并入和共同组建，以便不把派系分离写成继承。
- Acceptance criteria:
  - Given 一条关系，when 我查看它，then 它属于五种类型之一，并且类型在图例和详情里写法一致。
  - Given 一条"部分并入"关系，when 我查看它，then 明确说明原组织或其他派别可能继续存在。
  - Given 同名组织之间没有记载关系，when 图上并排出现，then 它们之间不画关系线。
- Relations: depends-on US-004
- Source: 访谈（P1 的典型误判）；尼泊尔示例的 `partial_merge` 区分

### US-006 同名不等于同一组织
- Epic: E2 · Persona: P1 · Status: draft
- Story: 作为分析者，我想让同名但不同来源的组织在图上各自独立（例如两个不同时期的同名委员会），以便我不把两段历史接成一条。
- Acceptance criteria:
  - Given 两个同名组织，when 我查看它们的详情，then 各自有独立的标识和区分线索（成立时间、前身组织）。
  - Given 我在图上看到一个名字，when 它存在多个同名实体，then 名字旁能看出正在看的是哪一个。
- Relations: depends-on US-005; related US-012
- Source: 访谈（P1）；尼泊尔示例中同名"团结中心"的处理

### US-007 企业集团的控制结构
- Epic: E2 · Persona: P1 · Status: assumption
- Story: 作为分析者，我想看清公司集团里的母子关系、控股与改名，以便判断一个企业背后谁在控制。
- Acceptance criteria:
  - Given 一个母公司，when 我聚焦它，then 子公司和参股关系以不同于"时间谱系"的方式呈现。
  - Given 一家公司改了名，when 我沿时间看，then 它保持同一个身份，而不是被当成两家公司。
  - Given 股权比例未知，when 我查看关系，then 只画"持股"而不编造百分比。
- Relations: refines US-004
- Source: 假设——用户提到"企业"；P1 是否需要股权比例待确认

### US-008 跨地区并置比较
- Epic: E2 · Persona: P1 · Status: assumption
- Story: 作为分析者，我想把两个国家或地区的同类谱系放在同一条时间轴上并排看，以便比较它们的分合节奏。
- Acceptance criteria:
  - Given 两个地区的谱系，when 我并置它们，then 时间轴是同一把尺子，各列的编号与人物互不混淆。
  - Given 并置后画面过密，when 我隐藏其中一侧，then 另一侧自动占满，不需要重新加载。
- Relations: depends-on US-004
- Source: 假设——用户提到"各地"

### US-009 一个人跨组织的完整轨迹
- Epic: E3 · Persona: P1 · Status: draft
- Story: 作为分析者，我想把一个人在各组织的任职、转任、退出按时间串成一条线，以便看出他是正常转任还是被排挤出局。
- Acceptance criteria:
  - Given 一个人，when 我聚焦他，then 他在每个组织的任职时段相连，跨组织的位置变化可见。
  - Given 一段任职，when 我悬停它，then 我看到职务、起止时间与来源。
  - Given 两段任职之间有空档，when 我看空档，then 空档是可见的，不被画成连续任职。
- Relations: depends-on US-004
- Source: 访谈（P1 的核心用例）

### US-010 某组织某时期有哪些人
- Epic: E3 · Persona: P1 · Status: draft
- Story: 作为分析者，我想选定一个组织和一段时间，看到当时在里面的人和职务，以便还原某一年的班底。
- Acceptance criteria:
  - Given 一个组织和一个时间段，when 我确认，then 我看到当时任职的人、职务和起止时间，并能按职务排序。
  - Given 一个人同时挂两个组织，when 我在这个时段查看，then 两处都显示他，且不重复计数。
  - Given 该时段只有部分人员有记载，when 我查看，then 明确提示"人员记载不完整"。
- Relations: depends-on US-009
- Source: 访谈（P1）；尼泊尔示例按时间锁定人员

### US-011 人物现在在哪
- Epic: E3 · Persona: P2 · Status: draft
- Story: 作为写稿的观察者，我想看到某人最新的已知身份与所在组织，以及这条信息截至哪一天，以便不在稿子里写一个过时的头衔。
- Acceptance criteria:
  - Given 一个人，when 我打开摘要，then 我看到最新一条任职、所在组织和数据截止日期。
  - Given 他已去世、退休或去向不明，when 我查看，then 状态被明确标出，而不是显示一个旧职务。
  - Given 两份材料对当前职位说法不同，when 我查看，then 冲突被标出并附来源。
- Relations: depends-on US-009
- Source: 访谈（P2）

### US-012 同名人物分开
- Epic: E3 · Persona: P1 · Status: draft
- Story: 作为分析者，我想让同名或名字相近的人物各自独立并给出区分线索，以便我不把两个人的履历合成一份。
- Acceptance criteria:
  - Given 两个同名人物，when 我搜索这个名字，then 结果各自列出区分线索（出生年、地区、所属组织）。
  - Given 我确认他们是同一个人，when 我合并，then 记录合并依据，并且合并可撤回。
- Relations: related US-006
- Source: 访谈（P1）；尼泊尔示例中三个"维迪亚"的区分

### US-013 聚焦一个对象
- Epic: E4 · Persona: P2 · Status: draft
- Story: 作为观察者，我想点一个人或一个组织，就把它和它的一切关系提亮、其余淡出，以便一眼看清重点。
- Acceptance criteria:
  - Given 我在看一张信息很密的图，when 我点一个人，then 他和他的轨迹最突出，其余内容淡出但不是消失。
  - Given 我已经聚焦了一个组织，when 我再聚焦一个人，then 两种聚焦可以叠加，并按优先级显示。
  - Given 我想回到全貌，when 我按一次明确的"全部"，then 所有对象恢复同样的可见度，且当前时间范围不变。
- Relations: 无
- Source: 两个参考案例都以此为主要交互

### US-014 比较 2–3 个对象
- Epic: E4 · Persona: P1 · Status: draft
- Story: 作为分析者，我想同时锁定最多三个人（或组织）放在一起看，以便回答"这几个人在哪些时期同属一个组织"。
- Acceptance criteria:
  - Given 我按住修饰键（或进入比较模式），when 我点第二、第三个人，then 他们同时被锁定，超出上限时给出提示。
  - Given 三个人已锁定，when 我查看对比，then 列出共同组织、重叠时段和各自独有的一段。
  - Given 我不想再比较某人，when 我移除他，then 其余两人的状态不受影响。
- Relations: depends-on US-013
- Source: 两个参考案例的比较模式（上限 3 / 6）

### US-015 按条件筛选
- Epic: E4 · Persona: P1 · Status: draft
- Story: 作为分析者，我想按时间、地区、组织类型、人物角色筛选，以便只看与我当前问题相关的部分。
- Acceptance criteria:
  - Given 我设了几个条件，when 它们被同时应用，then 结果是交集，并显示命中了多少。
  - Given 条件把画面筛空，when 我查看，then 空状态说明是哪个条件太严，并提供一键放宽。
  - Given 我切换焦点，when 我继续操作，then 筛选条件仍然保留。
- Relations: conflicts-with US-002（按时间筛选时，只有年份的记录落在哪一段？需要决定）
- Source: 两个参考案例的筛选面板

### US-016 搜索定位
- Epic: E4 · Persona: P2 · Status: draft
- Story: 作为观察者，我想输入名字就定位到那个人或组织，以便在陌生的数据集里不用手工翻找。
- Acceptance criteria:
  - Given 我输入几个字，when 有多个匹配，then 候选列表给出足够的区分信息。
  - Given 我选定一个结果，when 它出现在图外，then 画面自动移动并把目标放到可见位置。
  - Given 没有匹配，when 我提交搜索，then 明确告诉我没有结果，并保留我输入的词。
- Relations: depends-on US-013
- Source: 参考案例的人物搜索

### US-017 同一份数据换视角
- Epic: E4 · Persona: P1 · Status: draft
- Story: 作为分析者，我想在谱系树、时间轴、关系网这几种视角之间切换而不用重新录入数据，以便同一批事实能回答不同的问题。
- Acceptance criteria:
  - Given 我在谱系视角选中了一个人，when 我切到关系网视角，then 选中状态和时间范围还在。
  - Given 我在一个视角里缩放、隐藏了某些内容，when 我切走再切回，then 这个视角的摆位不丢。
  - Given 两种视角对同一事实给出不同呈现，when 我核对，then 它们指向同一条数据，而不是两份副本。
- Relations: depends-on US-004, US-009
- Source: 访谈（"重点在于灵活的可视化"）

### US-018 大图仍能顺畅操作
- Epic: E4 · Persona: P1 · Status: draft
- Story: 作为分析者，我想在 100 个组织、数百人的图上缩放、悬停、聚焦都不卡，以便我不必把一张图拆成很多小图。
- Acceptance criteria:
  - Given 数据量达到 v1 约定规模（100 个组织、≤500 人、≤1500 条关系），when 我平移缩放，then 画面跟手，不会每次操作都停顿数秒。
  - Given 数据超出约定规模，when 我打开图，then 系统先给出汇总视图并提示"已折叠明细"，而不是直接假死。
  - Given 我在慢网络环境，when 图在加载，then 我能看到进度和当前可用部分。
- Relations: conflicts-with US-017（每多一种视角，渲染成本叠加，需要为视角切换定预算）
- Source: 参考案例（数千节点）与访谈中的规模预期

### US-019 分享当前视图
- Epic: E5 · Persona: P2 · Status: draft
- Story: 作为观察者，我想把现在这个画面（聚焦谁、筛了什么、看到哪段时间）复制成一个链接发出去，以便同事打开就是同一张图。
- Acceptance criteria:
  - Given 我处于某个聚焦与筛选状态，when 我复制链接，then 对方打开后看到相同的聚焦、筛选和时间范围。
  - Given 我分享的是公开数据，when 未登录的人打开，then 能直接看到，不被要求注册。
  - Given 数据后来改了，when 我打开旧链接，then 链接显示它对应的数据时点，而不是悄悄变成新内容。
- Relations: depends-on US-013, US-015
- Source: 参考案例的对外链接；P2 的发稿场景

### US-020 导出用于报告
- Epic: E5 · Persona: P3 · Status: draft
- Story: 作为研究者，我想把当前画面导出成高清图片或矢量文件，并带上图例、来源和"截至日期"，以便直接放进报告和论文。
- Acceptance criteria:
  - Given 我调好画面，when 我导出，then 得到高清位图和可无级放大的矢量两种结果。
  - Given 图上带着来源，when 我导出，then 来源清单和截止日期一起进入图片边缘或随附说明。
  - Given 我改了焦点或筛选，when 我再次导出，then 结果反映当前状态，文件名带日期。
- Relations: depends-on US-013
- Source: 访谈（P2/P3 都要把图放进成品）

### US-021 公网发布
- Epic: E5 · Persona: P2 · Status: draft
- Story: 作为观察者，我想在浏览器里直接打开一个稳定网址看图，不用安装任何东西，以便随时把它引用给读者。
- Acceptance criteria:
  - Given 我只打开浏览器，when 我访问网址，then 几秒内看到可交互的图，而不是空白页或报错。
  - Given 我用常见的桌面浏览器，when 我操作，then 核心交互一致，不出现"只有某个浏览器能用"。
  - Given 网址被引用一次，when 我再次访问，then 它仍然指向同一个发布版本。
- Relations: depends-on US-022
- Source: 访谈（"web 部署"）；两个参考案例都是网页

### US-022 公开与受限数据
- Epic: E5 · Persona: P4 · Status: draft
- Story: 作为数据策展人，我想把数据集标成公开或仅成员可见，以便未核实的数据不被外人看到，公开数据仍可被引用。
- Acceptance criteria:
  - Given 一份受限数据，when 未登录的人访问，then 他只看到公开部分，受限部分不可见。
  - Given 我改变一份数据的可见性，when 对方刷新，then 变化立即生效。
  - Given 一个指向受限内容的分享链接，when 未登录的人打开，then 提示登录，而不是报错或泄露内容。
- Relations: 无
- Source: 访谈（远程数据 + 公网部署）；参考案例的账号与管理员界面

### US-023 协作录入与审核
- Epic: E5 · Persona: P4 · Status: assumption
- Story: 作为数据策展人，我想让合作者提交草稿、由我审核后再发布，以便多人录入时质量不失控。
- Acceptance criteria:
  - Given 合作者提交一条草稿，when 我查看，then 我看到它改动了什么、依据是什么。
  - Given 我审核通过，when 我发布，then 它出现在公开图上，并记录审核人与时间。
  - Given 我驳回，when 合作者查看，then 他看到驳回理由并可以修改重提。
- Relations: depends-on US-003, US-022
- Source: 假设——两位开发者，是否需要审核流程待确认

### US-024 领域可移植：换一个领域只加词表，不重写模型
- Epic: E1 · Persona: P4 · Status: draft
- Story: 作为数据策展人，我想在把系统从"企业谱系"迁到"政党谱系"时只新增关系类型与字段定义、不改动存储和接口，以便同一套底子能服务两类完全不同的组织。
- Acceptance criteria:
  - Given 现有模型只有企业关系（分拆、收购、控股、改名），when 引入政党关系（派系分离、 coalition、选举联盟、继承），then 不需要迁移已有的组织、人物、任职、来源数据。
  - Given 一个关系类型，when 我查看它的定义，then 它能声明自己的端点类型（组织→组织 / 人→组织 / 时间点）和附加字段，而不是被写死在代码里。
  - Given 某字段只在企业域有意义（如股权比例），when 用于政党域，then 它可以是空，而空值不被当成错误，也不逼政党域编造数据（同 US-002）。
  - Given 我要验证移植可行性，when 用同一份数据模型分别导入企业样例与政党样例，then 两种都能存下、都能画出来。
- Relations: refines US-005; depends-on US-003
- Source: 发起人 2026-11-14："后面生产部署首先用于政党组织等"；当前测试集为企业谱系

## Relationship map

| Story | Relation | Story | Note |
|---|---|---|---|
| US-002 | depends-on | US-001 | 不确定性的展示依赖来源存在 |
| US-003 | depends-on | US-001 | 录入时就必须带来源 |
| US-005 | depends-on | US-004 | 五种关系只有在谱系视图里才有意义 |
| US-006 | depends-on | US-005 | 同名区分依赖关系类型不混 |
| US-006 | related | US-012 | 组织与人物两条同名的处理要一致 |
| US-007 | refines | US-004 | 企业的控制结构是谱系的一种特例 |
| US-008 | depends-on | US-004 | 并置的是谱系列 |
| US-009 | depends-on | US-004 | 人物轨迹画在组织列之间 |
| US-010 | depends-on | US-009 | 班底视图依赖任职数据 |
| US-011 | depends-on | US-009 | "现在在哪"是轨迹的最后一段 |
| US-012 | related | US-006 | 同上 |
| US-014 | depends-on | US-013 | 比较建立在聚焦之上 |
| US-015 | conflicts-with | US-002 | 按时间筛选时，只有年份或日期不明的记录落在哪一段仍待决定；两种需求都要，但呈现规则必须统一 |
| US-016 | depends-on | US-013 | 定位后要能聚焦 |
| US-017 | depends-on | US-004, US-009 | 换视角换的是同一批谱系与轨迹数据 |
| US-018 | conflicts-with | US-017 | 视角越多，渲染与缓存成本越高；需要在视角数量与流畅度之间定预算 |
| US-019 | depends-on | US-013, US-015 | 链接要恢复聚焦与筛选 |
| US-020 | depends-on | US-013 | 导出反映当前聚焦 |
| US-021 | depends-on | US-022 | 公开发布要以可见性模型为前提 |
| US-023 | depends-on | US-003, US-022 | 审核建立在录入与权限之上 |
| US-024 | depends-on | US-003 | 可移植性建立在录入模型可扩展之上 |
| US-024 | refines | US-005 | 五种关系只是企业/组织域的一组取值，不是封闭枚举 |

## Bugs

暂无。

## Open questions and assumptions

| ID | Question | Owner | Due |
|---|---|---|---|
| Q1 | ~~首发范围~~ **已定（2026-11-14）**：测试集用欧美具身智能技术企业，组织数 ≤100，人物数按可采集到的信息决定；生产部署首先面向政党组织，因此模型必须领域中立（见 US-024）。US-018 的规模目标暂定 100 组织 / ≤500 人 / ≤1500 条关系，采集后修订 | UGcraftist | 已关闭 |
| Q2 | 数据结构尚未设计，当前仍是最基础的文本信息（名字、时间、关系、来源）。通用性与灵活性直接决定 Q1 能否移植——此问题转入 stage 2 作为数据需求，schema 在 stage 3 决策记录里定 | 共同开发者 | stage 2 结束前 |
| Q3 | ~~首批视角~~ **已定（2026-11-14）**：谱系树、时间轴、关系网三种视角都进第一版（US-017） | UGcraftist | 已关闭 |
| Q4 | 哪些数据公开、哪些需要登录？访客能否纠错或提交线索（US-022、US-023） | UGcraftist | 需求阶段 |
| Q5 | 引用要求到哪一步：只需要"截至日期"，还是必须能打开当天的快照（US-019） | UGcraftist | 需求阶段 |
| Q6 | 目标设备只有桌面，还是也要能看手机（US-021） | 共同开发者 | 需求阶段 |
| Q7 | 企业股权比例是否需要（US-007） | UGcraftist | 需求阶段 |
| Q8 | 假设：P1–P3 的详细工作方式来自参考案例与常识推断，尚未逐一访谈 | UGcraftist | 本阶段结束前 |
| Q9 | 政党域需要哪些企业域没有的关系与字段（派系、联盟、选举、意识形态立场）？需要一份"政党样例"来验证 US-024 | UGcraftist + 共同开发者 | stage 2 结束前 |

## Not doing (and why)

- 不自动抓取新闻或自动抽取关系。首批先保证"每条事实有人负责、能查到来源"，自动抽取会把无来源的推测混进来。
- 不做通用图数据库或任意实体关系编辑画布。先只做"谱系 + 轨迹"两类视图，避免变成什么都画得出来的工具，反而没有一个问题答得好。
- 不做移动端原生应用。分析工作发生在桌面上，先保证网页在桌面可用。
- 不做多人同时实时编辑。先做草稿与审核，避免冲突合并没有意义。

## 参考案例（不是需求）

- [Nepal History Network](https://hyhml.github.io/Nepal-History-Network/)：固定组织列 + 自上而下的时间 + 人物跨列轨迹 + 紫色分合线 + 书中摘录悬浮。代表"组织谱系 + 人物轨迹"这一路做法。
- [家族森林 · 关系流场](https://lineage-forest.buyixiao.xyz/)：姓氏列 + 家族森林 + 姻亲与社交关系流 + 关系吸附场 + 证据下钻。代表"密集关系网络 + 证据追溯"这一路做法。
- 两者都有的共性（聚焦、比较、筛选、来源悬浮、缺失标注）被吸收成故事；它们各自的专有做法（重力井、姓氏容器）不直接成为需求。
- 资料入口：`ref/examples.txt`、`ref/Nepal-History-Network/`。

# Risks

| ID | Risk or assumption | Source (US/FR/TH/DR) | Likelihood | Impact | Response | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | 单人持有全部知识与凭据；生病/离开即停摆 | DR-0005, security.md | 中 | 高 | 文档为唯一事实源（本仓库）；R2 前补第二名 admin 持有人 | UGcraftist | open |
| R-002 | 无第二人评审架构与 API 契约，错误成本单人承担 | DR-0005 评审表 | 中 | 中 | R1 后用外部评审补一次；契约先写便于事后审 | UGcraftist | open |
| R-003 | 政党域字段（对华/对美立场）在真实数据里可能需要多目标/多事件粒度，当前 stance 单主体单轴 | DR-0003, Q9 | 低 | 中 | stance 已带 target 与时间；若需事件级，加 fact 行不改表 | UGcraftist | open |
| R-004 | Supabase/Cloudflare 免费层限制（项目空闲暂停、Pages 构建分钟数） | DR-0005 | 中 | 低 | R2 前测一次空闲恢复；构建只在合并时触发 | UGcraftist | open |
| R-005 | RLS 策略一旦写错即泄漏或锁死；无第二人复核 | DR-0005, TH-11 | 中 | 高 | RLS 负例测试纳入 T-008/T-018；R2 公开前外部复核 | UGcraftist | open |

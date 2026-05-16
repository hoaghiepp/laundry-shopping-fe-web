## 主要功能清单 (MASTER FEATURE LIST)

系统基于以下思维运营：**统一商业（Unified Commerce - 商品与服务一体化）** + **预付优先（Prepaid Priority - 优先扣除资产）。**

---

### 1. 客户端应用 (User App)
*统合界面：购物、服务预订及资产管理。*

**A. 购物与预订功能 (Unified Booking):**
* **统合目录 (Unified Catalog):** 在搜索流程中同时显示 3 类项目:
    1.  **服务 (Service):** 西装干洗，洗棉被。
    2.  **商品 (Physical):** 洗衣液，衣架。
    3.  **虚拟资产 (Assets - 新):** 充值包 (Top-up)，洗衣次卡 (Package)。
* **智能购物车 (Smart Cart):**
    * 自动导向结账表单（若含服务 $\rightarrow$ 选择取件时间；若仅含商品 $\rightarrow$ 选择配送）。
    * **多层级支付逻辑 (Priority Payment - 新):** 结账时系统按优先级自动扫描扣款:
        1.  **扣除次卡 (Deduct Package):** (例如：洗棉被 $\rightarrow$ 扣除棉被次卡 1 次)。
        2.  **扣除优惠券 (Deduct Voucher):** (若有折扣码)。
        3.  **扣除余额 (Deduct Wallet/Credit):** (若钱包有余额)。
        4.  **货到付款 (Collect COD):** (最后剩余的应付金额)。
* **物流选项 (Logistics Options):**
    * *默认 (Default):* **合并配送 (Consolidated Shipping)** - 购买的商品将在归还洗好的衣物时一并送达。
    * *选项 (Option):* 商品立即单独配送（需另付运费）。

**B. 会员与资产功能 (Membership & Assets - 新):**
* **套餐商店 (Package Store):** 销售充值包（现金兑换含优惠的虚拟余额）和服务套餐（购买廉价使用次数）的界面。
* **我的资产 (My Assets):**
    * 显示 **可用余额 (Credit Balance)**。
    * 显示已拥有的**服务套餐**及有效期。
    * 按钮 **充值 (Top-up)**: 集成支付网关（QR/银行卡）以购买余额。
    * 交易历史 (Transaction History): 余额变动，套餐使用记录。

**C. 追踪与互动功能 (Core):**
* **双层追踪 (2-Layer Tracking):** 服务 (5 步：下单-取件-工厂-分拣-归还) & 商品 (3 步：分拣-打包-配送)。
* **异常处理 (Exception Handling - USP):**
    * 当工厂报错（附照片）时接收推送通知。
    * 决定：**“同意洗涤”** 或 **“退还”**。
    * **自动退款 (Auto-Refund - 新):** 若客户选择“退还”，系统自动将服务费退回**钱包余额 (Credit)**（不退现金）。

### 2. 门店员工应用 (Store App)
*中转枢纽兼订单财务控制点。*

**A. 服务流程 (Service Ops):**
* **收件 (Inbound):** 扫描客户订单 QR 码。
* **身份识别 (Tagging):** 自动生成 ID $\rightarrow$ 连接蓝牙打印机 $\rightarrow$ 将耐水条形码标签打在衣物上。
* **称重与调价 (Update Order - 财务更新):**
    * 员工输入实际数量（例：客户申报 2kg $\rightarrow$ 称重为 5kg）。
    * 系统重新计算总额 $\rightarrow$ **自动从客户余额 (Credit) 中扣除**。
    * 若钱包没钱 $\rightarrow$ 门店 App 大声播报：**“需补收 COD：xxx 盾”**。
* **发往工厂 (Outbound):** 生成移交卡车的货单。

**B. 零售流程 (Retail Ops):**
* **配货 (Order Picking):** 线上订单需从货架上拿取的商品清单。
* **库存管理 (Inventory):** 进货入库，盘点数量，缺货报告 (Out of stock report)。

**C. 归还与财务 (Final Mile):**
* **合并 (Consolidation):** 提醒合并打包 *[工厂送回的洁衣]* + *[货架购买的商品]*。
* **财务视图 (Financial View - 新):**
    * 订单上清晰显示状态：**“已预付”** (用套餐/钱包) 或 **“需收 COD”**。

### 3. 工厂员工应用 (Factory App)
*专注于：质量控制 (QC)，工业规模处理，以及状态追踪。*

#### 1. 入库 (Inbound) - 输入
* **扫码收袋 (Receive Bags):** 扫描麻袋 QR 码 $\rightarrow$ 显示信息（来自哪家店？预计数量？）。
* **确认清单 (Verify Manifest):** 核对实际袋数与系统 $\rightarrow$ 确认“已收齐”。

#### 2. 质检与处理 (QC & Processing) - 内部拆解
* **单件扫码 (Item Scan):** 拆袋 $\rightarrow$ 扫描单件条码 $\rightarrow$ 确认衣物上线。
* **报错 (Incident Report):** 发现瑕疵 $\rightarrow$ 拍照 $\rightarrow$ 发送报告（挂起订单等客户确认）。
* **更新进度 (Progress Update):** 批量状态切换按钮：**洗涤中 (Washing) $\rightarrow$ 烘干中 (Drying) $\rightarrow$ 折叠中 (Folding)**。

#### 3. 查询与追踪状态 (Search & Query Status)
* **智能搜索 (Smart Search):** 输入单号/件号或重扫标签寻物。
* **查看详细状态 (Detail Status):** 显示物品所在环节（新入库/待确认/已出库）。
* **目的:** 协助在“黑盒”工厂中寻找失物。

#### 4. 出库 (Outbound) - 输出
* **扫码打包 (Scan to Pack):** 扫描折叠好的洁衣。
* **导向 (Routing):** 屏幕清晰显示目标门店名称（例如：**回 A 店**）。
* **移交卡车 (Handover):** 扫描洁衣筐/袋 $\rightarrow$ 更新状态“正在运回门店”。

---

### 4. 中央管理后台 (Web Admin)
*统一商业系统的调度中枢。*

* **统合产品管理 (Unified Product Management):**
    * 配置类型: `PHYSICAL` (商品), `SERVICE` (服务)。
    * **新类型配置:** `PACKAGE` (次卡 - 例如：3 次洗涤), `CREDIT` (充值包 - 例如：充 500k)。
* **客户资产管理 (Customer Asset Management - 新):**
    * 查询余额 (Balance)，充值/消费记录，持有套餐。
    * 余额手动调整工具 (Manual Adjustment)，用于处理投诉。
* **物流管理 (Logistics):** 管理各店库存，调度卡车流。
* **Dashboard & 报表:**
    * 实收现金流报表 (Cash flow)。
    * “未实现营收”报表 (Liability - 客户存入但未使用的钱)。

---

### 5. 自动化系统 - 后端 (Automation - Backend) - 新
* **Cron Job (提醒):** 定期扫描快过期的服务套餐 $\rightarrow$ 发送推送通知提醒客户使用。
* **自动退款逻辑 (Auto Refund Logic):** 订单取消或物品退还时，自动退款至钱包的逻辑（避免会计手工操作）。

### 对照表：MVP版 vs 完整版 (已更新)

| 模块                     | 功能            | **MVP版 (优先发布)**                                  | **完整版 (后续升级)**       |
| :----------------------- | :-------------- | :---------------------------------------------------- | :-------------------------- |
| **客户端 (User App)**    | **购物车**      | 统一下单，统一支付 (1 个购物车)。                     | 拆单，赠送亲友。            |
|                          | **支付**        | **优先：套餐 $\rightarrow$ 余额 $\rightarrow$ COD。** | 支付网关，绑定 Visa 卡。    |
|                          | **资产 (钱包)** | **充值 (买余额)，买次卡。**                           | 转赠积分，会员等级 (Tier)。 |
|                          | **物流**        | **合并配送** (商品等洗好一起送)。                     | **可选配送** (立即配送)。   |
| **门店端 (Store App)**   | **财务**        | **超重自动扣余额 + 提示收 COD。**                     | 柜台现金营收统计。          |
|                          | **识别**        | 打印 & 钉条形码。                                     | RFID 芯片。                 |
|                          | **配货**        | 手工清单。                                            | 货架位置指引。              |
| **工厂端 (Factory App)** | **流程**        | 扫入库 $\rightarrow$ QC $\rightarrow$ 扫出库 + 查询。 | 自动化分拣 (Auto Sorting)。 |
|                          | **管理**        | ❌ 不做 (黑盒)。                                       | ❌ 不做。                    |
| **后台 (Admin)**         | **套餐管理**    | **创建充值包 / 服务套餐。**                           | 复杂的促销配置。            |
|                          | **物流**        | 手工 (叫外卖配送)。                                   | 司机端 App，自动派单。      |
| **后端 (Backend)**       | **自动化**      | **Cron Job 提醒过期。**                               | AI 推荐合适的充值包。       |

此版本已包含完整的**旧细节**（仓库/工厂流程）+ **新细节**（财务/钱包/套餐逻辑）。您可以将此版本作为正式需求文档交给开发人员。

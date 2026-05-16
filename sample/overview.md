# Tổng quan ứng dụng Laundry Management / 洗衣管理应用程序概览
## 1. Mục tiêu phát triển / 开发目标

- Ứng dụng desktop apps (on Windows OS): phục vụ cho dịch vụ giặt là, là phần mềm quản trị tại xưởng giặt là → Low priority (cần làm rõ thêm flow sử dụng và các tính năng kèm theo) / Windows 桌面管理软件：用于洗衣工厂管理 → 当前优先级较低（需进一步明确使用流程与功能）
- Ứng dụng mobile apps (Android, iOS): Bao gồm 2 phần / 移动应用（Android / iOS）：包含两个模块
  - Quản trị dịch vụ giặt là: phục vụ cho quá trình tương tác giữa người dùng cuối - tiệm giặt là - xưởng giặt là / 洗衣服务管理：支持终端用户—洗衣店—洗衣工厂的完整业务流  
  - Bán hàng online: bán các mặt hàng hữu hình như quần áo, khăn, giày dép... hoặc vô hình như voucher, thẻ hội viên / 在线商城：销售实体商品（衣物、毛巾、鞋子等）及虚拟商品（优惠券、会员卡等）
- Web apps quản trị, vận hành: dùng cho người quản trị vận hành có thể cập nhật các nội dung trên ứng dụng, các gói khuyến mại cũng như các item hàng hóa / Web 管理后台：运营人员可在后台更新应用内容、商品及促销方案
- Hệ thống backend: là hệ thống cốt lõi của các ứng dụng trên, bao gồm các cơ sở dữ liệu lưu trữ thông tin người dùng, đơn hàng, các mặt hàng, trạng thái hàng hóa. Đồng thời cũng là kênh giao tiếp với bên thứ ba để kiểm tra tự động thanh toán, truy vết vận đơn... / 后端核心系统：集中管理用户、订单、商品与物流状态，并对接支付及物流服务，实现自动支付与物流追踪。

## 2. Bức tranh người dùng / 用户角色图谱

### Người dùng cuối / 终端用户
- Đăng ký, mua hàng (đồ mang mặc, hoặc các sản phẩm như gói giặt là, voucher, hội viên), thanh toán / 注册、下单（服饰商品及洗衣服务）、支付  
- Theo dõi tiến trình đơn hàng (trạng thái đơn hàng, trạng thái vận chuyển, các feedback của xưởng giặt là) / 跟踪订单进度（洗衣状态、配送状态，以及工厂反馈）

### Nhân viên tiệm giặt là (là nhân viên của Owner) / 洗衣店员工（店主方）
- Sử dụng ứng dụng để quản trị người dùng cuối, quản trị hội viên, quản trị hàng hóa (bao gồm gói hội viên, voucher) / 使用系统管理终端客户、会员及商品（含会员包、优惠券）
- Quản trị đơn hàng, theo dõi quá trình vận chuyển / 管理订单并跟踪物流状态

### Nhân viên xưởng giặt / 洗衣工厂员工
- Sử dụng ứng dụng để feedback hiện trạng của đồ cần giặt là, cập nhật trạng thái (nhận đồ → feedback → confirmed → giặt là, đóng gói → gửi trả) / 使用系统反馈衣物状况并更新处理进度  /（接收 → 反馈确认 → 清洗 → 包装 → 回送）

## 3. Kịch bản sử dụng / 使用场景

### 3.1 Đối với dịch vụ giặt là / 3.1 洗衣服务流程

- Nhân viên tiệm giặt là có thể đến nhận tại nhà của khách hàng; hoặc khách hàng đến gửi trực tiếp tại tiệm / 洗衣店可上门取衣或客户到店送衣  
- Khách hàng đăng ký thông tin cá nhân qua ứng dụng mobile apps, thanh toán và theo dõi trạng thái dịch vụ / 用户通过移动端注册、支付并跟踪服务进度  
- Đồ cần giặt được chuyển đến xưởng → nhân viên cập nhật trạng thái dịch vụ / 向工厂运送 → 员工更新处理状态  
- Kiểm tra đồ cần giặt → chụp hình vấn đề → upload → notify khách hàng → khách confirm / 检查衣物 → 拍照记录 → 上传通知 → 用户确认  
- Thực hiện giặt → trả về tiệm giặt → thông báo khách hàng đến lấy/ship tận nơi → hoàn tất / 清洗 → 回店 → 通知客户取件/配送 → 服务完成  

- Nếu khách hàng không confirm → gửi trả hàng cho tiệm giặt → tiệm giặt thông báo khách → hoàn tất dịch vụ  / 若用户拒绝确认 → 直接退回洗衣店 → 通知客户取件 → 服务结束

### 3.2 Đối với thương mại điện tử  / 在线商城流程

- Admin cập nhật thông tin hàng hóa (đặt hàng, gỡ hàng, chỉnh sửa thông tin, chỉnh sửa giá, thêm voucher) / 管理员维护商品（上/下架、编辑信息、调整价格、配置优惠券）  
- Khách hàng đăng ký, xem hàng → lên đơn hàng → thanh toán / 用户注册、浏览商品 → 下单 → 支付  
- Admin xử lý đơn → ship hàng → hoàn tất / 管理员处理订单 → 配送 → 完成订单

## 4. Các nội dung chính trong hợp đồng / 合同主要内容

### Các sản phẩm bàn giao / 交付成果
- 01 ứng dụng mobile apps / 移动端应用（Android / iOS）  
- 01 hệ thống backend / 后端核心系统  
- 01 web apps cho vận hành / Web 管理后台  
- Desktop apps chưa rõ người dùng → đề xuất dùng mobile apps thay thế / 桌面端用户与场景未明 → 建议使用移动端替代  
- Source code và tài liệu kèm theo / 随附源码及技术文档

### Thời gian hoàn thành hợp đồng / 完成周期
- **45 ngày làm việc** tính từ ngày ký / 自签署之日起 **45 个工作日**

### Dịch vụ hậu mãi / 售后与维护
- Hỗ trợ vận hành thử nghiệm **03–06 tháng** / 提供 **3–6 个月**试运行与技术支持  
- Sửa lỗi & cải thiện trải nghiệm / 修复缺陷并优化体验  

### Giá trị hợp đồng / 合同金额
- **70 triệu VND** / **7000 万越南盾**

### Thanh toán  
### 付款方式
- **50%** lúc ký hợp đồng / 签署合同时支付 **50%**  
- **40%** bàn giao hoàn thiện hệ thống / 系统交付后支付 **40%**  
- **10%** sau khi hoàn thành hỗ trợ vận hành / 支持结束后支付 **10%**

## 5. Chi phí phát sinh bao gồm / 5. 甲方需承担额外费用

- Tài khoản GG Play, Apple Store / Google Play Apple 开发者账号费用  
- Tên miền trang web vận hành / 网站域名  
- VPS (~300 nghìn VND/tháng) / 服务器服务（约 300k/月）  
- API thanh toán và truy vết vận đơn / 支付服务及物流追踪 API 成本

## 6. Thông tin bên A cần cung cấp / 6. 甲方需提供信息

- Chi tiết các dịch vụ, luồng sử dụng, nhóm người dùng, phân quyền / 服务范围、流程定义、用户角色与权限  
- Nếu chưa xác định hết → cần khoanh phạm vi (freeze scope) để thực hiện hợp đồng / 若未完全明确 → 需冻结范围后执行项目  

- Danh mục sản phẩm phục vụ bán hàng online / 在线商品内容

    - Hình ảnh, văn bản mô tả sản phẩm / 商品图片与文字描述  
    - Giá cả từng sản phẩm / 商品价格  
    - Nội dung quảng bá thương hiệu và sản phẩm (checklist các tiệm, use case...) / 品牌与营销内容（门店检查表、典型应用案例等）
    - Trong trường hợp chưa xác định danh mục: bên B sẽ tạo data mẫu để hoàn thành thông lượng ứng dụng / 若尚未确定目录：乙方将先构建示例数据以确保应用运行完整

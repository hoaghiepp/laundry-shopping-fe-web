## MASTER FEATURE LIST

Hệ thống vận hành theo tư duy: **Unified Commerce (Hàng & Dịch vụ là một)** + **Prepaid Priority (Ưu tiên trừ tài sản trước).**

---

### 1. Ứng dụng cho Khách hàng (User App)
*Giao diện hợp nhất: Mua sắm, Đặt dịch vụ và Quản lý tài sản.*

**A. Tính năng Mua sắm & Đặt chỗ (Unified Booking):**
* **Danh mục hợp nhất:** Hiển thị chung 3 loại item trong luồng tìm kiếm:
    1.  **Dịch vụ (Service):** Giặt Vest, Giặt chăn.
    2.  **Hàng hóa (Physical):** Nước giặt, móc áo.
    3.  **Tài sản ảo (Assets - MỚI):** Gói nạp tiền (Top-up), Gói lượt giặt (Package).
* **Giỏ hàng thông minh (Smart Cart):**
    * Tự động điều hướng form checkout (Nếu có dịch vụ $\rightarrow$ Chọn giờ lấy đồ; Nếu chỉ có hàng $\rightarrow$ Chọn ship).
    * **Logic Thanh toán Đa tầng (Priority Payment - MỚI):** Hệ thống tự động quét theo thứ tự ưu tiên khi Checkout:
        1.  **Trừ Gói lượt:** (Ví dụ: Giặt chăn $\rightarrow$ Trừ 1 lượt trong Gói chăn).
        2.  **Trừ Voucher:** (Nếu có mã giảm giá).
        3.  **Trừ Số dư (Credit):** (Nếu ví còn tiền).
        4.  **Thu COD:** (Số tiền còn thiếu cuối cùng).
* **Tùy chọn Giao vận:**
    * *Mặc định:* **Giao gộp (Consolidated Shipping)** - Hàng mua giao cùng lúc trả đồ giặt.
    * *Tùy chọn:* Giao hàng mua riêng ngay lập tức (Tính phí ship riêng).

**B. Tính năng Hội viên & Tài sản (Membership & Assets - MỚI):**
* **Cửa hàng Gói (Package Store):** Màn hình bán các gói Nạp tiền (đổi tiền thật lấy số dư ảo có khuyến mãi) và Gói Dịch vụ (mua lượt dùng giá rẻ).
* **Ví của tôi (My Assets):**
    * Hiển thị **Số dư khả dụng (Credit Balance)**.
    * Hiển thị **Các gói dịch vụ** đang sở hữu & Hạn sử dụng.
    * Nút **Nạp tiền**: Tích hợp cổng thanh toán (QR/Thẻ) để mua Credit.
    * Lịch sử giao dịch (Transaction History): Biến động số dư, lịch sử dùng gói.

**C. Tính năng Theo dõi & Tương tác (Core):**
* **Tracking 2 lớp:** Dịch vụ (5 bước: Đặt-Lấy-Xưởng-Soạn-Trả) & Hàng hóa (3 bước: Soạn-Gói-Giao).
* **Xử lý sự cố (Exception Handling - USP):**
    * Nhận Push Notification khi Xưởng báo lỗi (kèm ảnh).
    * Quyết định: **"Đồng ý giặt"** hoặc **"Trả lại"**.
    * **Auto-Refund (MỚI):** Nếu khách chọn "Trả lại", hệ thống tự động hoàn tiền dịch vụ về **Số dư Ví (Credit)** (không hoàn tiền mặt).

### 2. Ứng dụng cho Nhân viên Tiệm (Store App)
*Hub trung chuyển kiêm điểm kiểm soát tài chính đơn hàng.*

**A. Luồng Dịch vụ (Service Ops):**
* **Nhận đồ (Inbound):** Quét QR đơn của khách.
* **Định danh (Tagging):** Auto-Gen ID $\rightarrow$ Kết nối máy in Bluetooth $\rightarrow$ Bắn tem mã vạch chịu nước vào đồ.
* **Cân & Điều chỉnh giá (Update Order - CẬP NHẬT TÀI CHÍNH):**
    * Nhân viên nhập số lượng thực tế (VD: Khách khai 2kg $\rightarrow$ Cân được 5kg).
    * Hệ thống tính lại tổng tiền $\rightarrow$ **Tự động trừ tiếp vào Số dư (Credit)** của khách.
    * Nếu Ví hết tiền $\rightarrow$ App Tiệm báo to rõ: **"Cần thu thêm COD: xxx đ"**.
* **Giao đi Xưởng:** Tạo Manifest bàn giao xe tải.

**B. Luồng Bán lẻ (Retail Ops):**
* **Soạn hàng (Order Picking):** List hàng cần lấy từ kệ cho các đơn online.
* **Quản lý Tồn kho:** Nhập hàng mới về tiệm, kiểm kê số lượng, báo hết hàng (Out of stock report).

**C. Luồng Trả hàng & Tài chính (Final Mile):**
* **Hợp nhất (Consolidation):** Nhắc nhở gom *[Đồ sạch từ Xưởng]* + *[Hàng mua từ Kệ]* vào chung 1 gói.
* **Hiển thị Tài chính (Financial View - MỚI):**
    * Trên đơn hàng hiển thị rõ trạng thái: **"Đã thanh toán trước"** (bằng Gói/Ví) hay **"Cần thu COD"**.

### 3. Ứng dụng cho Nhân viên Xưởng (Factory App)
*Tập trung vào: Kiểm soát chất lượng (QC), Xử lý quy mô công nghiệp, và Truy vết trạng thái.*

#### 1. Nhập kho (Inbound) - Đầu vào
* **Quét nhận bao (Receive Bags):** Quét mã QR bao tải $\rightarrow$ Hiển thị thông tin (Từ Tiệm nào? Số lượng dự kiến?).
* **Xác nhận Biên bản (Verify Manifest):** Đối chiếu số lượng bao thực tế vs hệ thống $\rightarrow$ Xác nhận "Đã nhận đủ".

#### 2. Kiểm soát & Xử lý (QC & Processing) - Mổ xẻ bên trong
* **Check-in từng món (Item Scan):** Cắt bao $\rightarrow$ Quét mã vạch từng món $\rightarrow$ Xác nhận đồ đã lên dây chuyền.
* **Báo lỗi (Incident Report):** Phát hiện lỗi $\rightarrow$ Chụp ảnh $\rightarrow$ Gửi báo cáo (Treo đơn chờ khách confirm).
* **Cập nhật Tiến độ:** Nút bấm chuyển trạng thái lô lớn: **Đang giặt $\rightarrow$ Đang sấy $\rightarrow$ Đang gấp**.

#### 3. Tra cứu & Truy vết (Search & Query Status)
* **Tìm kiếm thông minh:** Nhập mã đơn/mã món hoặc quét lại tem để tìm đồ.
* **Xem trạng thái chi tiết:** Cho biết món đồ đang ở khâu nào (Mới nhập/Đang chờ khách confirm/Đã xuất).
* **Mục đích:** Hỗ trợ tìm đồ thất lạc trong xưởng đen (Blackbox).

#### 4. Xuất kho (Outbound) - Đầu ra
* **Quét xuất (Scan to Pack):** Quét mã món đồ sạch sau khi gấp.
* **Điều hướng (Routing):** Màn hình hiện to rõ tên Tiệm đích (Ví dụ: **VỀ TIỆM A**).
* **Bàn giao xe tải:** Quét mã sọt/bao đồ sạch $\rightarrow$ Update trạng thái "Đang vận chuyển về Tiệm".

---

### 4. Web Admin (Quản trị Trung tâm)
*Bộ não điều phối toàn bộ hệ thống Unified Commerce.*

* **Quản lý Sản phẩm Hợp nhất:**
    * Cấu hình Type: `PHYSICAL` (Hàng), `SERVICE` (Dịch vụ).
    * **Cấu hình Type Mới:** `PACKAGE` (Gói lượt - VD: 3 lần giặt), `CREDIT` (Gói nạp - VD: Nạp 500k).
* **Quản lý Tài sản Khách hàng (MỚI):**
    * Tra cứu Số dư (Balance), Lịch sử nạp/tiêu, Các gói đang sở hữu.
    * Công cụ điều chỉnh số dư (Manual Adjustment) để xử lý khiếu nại.
* **Quản lý Kho vận:** Quản lý tồn kho hàng hóa tại từng Tiệm, Điều phối luồng xe tải.
* **Dashboard & Báo cáo:**
    * Báo cáo Doanh thu thực thu (Cash flow).
    * Báo cáo "Doanh thu chưa thực hiện" (Liability - Tiền khách nạp nhưng chưa dùng).

---

### 5. Hệ thống Tự động (Automation - Backend) - MỚI
* **Cron Job (Nhắc nhở):** Quét định kỳ các Gói dịch vụ sắp hết hạn $\rightarrow$ Gửi Push Notification nhắc khách dùng.
* **Auto Refund Logic:** Logic tự động hoàn tiền về Ví khi đơn bị hủy hoặc món đồ bị trả lại (Tránh thao tác thủ công của kế toán).

### Bảng đối chiếu: MVP vs Full Version (Đã cập nhật đầy đủ)

| Phân hệ         | Tính năng        | **Bản MVP (Ra mắt trước)**                                 | **Bản Full (Nâng cấp sau)**            |
| :-------------- | :--------------- | :--------------------------------------------------------- | :------------------------------------- |
| **User App**    | **Giỏ hàng**     | Mua chung, thanh toán chung (1 giỏ).                       | Tách giỏ, Gửi tặng người thân.         |
|                 | **Thanh toán**   | **Ưu tiên: Gói $\rightarrow$ Số dư $\rightarrow$ COD.**    | Cổng thanh toán, Thẻ Visa liên kết.    |
|                 | **Tài sản (Ví)** | **Nạp tiền (Mua Credit), Mua gói lượt.**                   | Chuyển điểm, Hạng thành viên (Tier).   |
|                 | **Giao nhận**    | **Giao gộp** (Hàng mua đợi đồ giặt).                       | **Giao tùy chọn** (Giao ngay lập tức). |
| **Store App**   | **Tài chính**    | **Tự động trừ ví khi tăng cân + Báo thu COD.**             | Thống kê doanh thu tiền mặt tại quầy.  |
|                 | **Định danh**    | In & Bắn tem mã vạch.                                      | Chip RFID.                             |
|                 | **Soạn hàng**    | List thủ công.                                             | Chỉ dẫn vị trí kệ hàng.                |
| **Factory App** | **Quy trình**    | Quét In $\rightarrow$ QC $\rightarrow$ Quét Out + Tra cứu. | Tự động hóa phân loại (Auto Sorting).  |
|                 | **Quản trị**     | ❌ Không làm (Blackbox).                                    | ❌ Không làm.                           |
| **Admin**       | **Quản lý Gói**  | **Tạo Gói Nạp / Gói Dịch vụ.**                             | Cấu hình Promotion phức tạp.           |
|                 | **Logistics**    | Thủ công (Gọi ship ngoài).                                 | Driver App riêng, Auto-assign.         |
| **Backend**     | **Automation**   | **Cron Job nhắc hết hạn.**                                 | AI gợi ý gói nạp phù hợp.              |

Bản này đã bao gồm đầy đủ **chi tiết cũ** (quy trình kho/xưởng) + **chi tiết mới** (logic tài chính/ví/gói). Bạn có thể dùng bản này làm đề bài chính thức cho Dev.
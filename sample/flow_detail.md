# Flow Detail
## High Level Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Khách Hàng
    participant UserApp as User App
    participant BE as Backend (Logic Tài Sản)
    actor Shipper as Shipper
    participant StoreApp as Store App (Tiệm)
    participant FactoryApp as Factory App (Xưởng)

    Note over User, BE: GIAI ĐOẠN 1: ĐẶT HÀNG & TRỪ TÀI SẢN (Booking & Deduction)
    User->>UserApp: Chọn Giặt (Dịch vụ) + Mua (Hàng hóa)
    UserApp->>BE: Gửi đơn + Request dùng Gói/Ví
    
    rect rgba(230, 255, 230, 0.5)
        Note right of BE: LOGIC TÀI CHÍNH 1
        BE->>BE: Ưu tiên trừ: Gói Lượt -> Voucher -> Số dư Ví
        BE->>BE: Tính phần tiền còn thiếu (nếu có)
    end
    
    BE-->>UserApp: Xác nhận đơn & Báo số tiền COD tạm tính (nếu thiếu)

    Note over User, StoreApp: GIAI ĐOẠN 2: LẤY ĐỒ & CẬP NHẬT THỰC TẾ
    Shipper->>User: Đến lấy đồ bẩn
    Shipper->>StoreApp: Mang đồ về Tiệm
    StoreApp->>BE: Check-in Đồ bẩn & In Tem (Tagging)
    
    rect rgba(255, 240, 230, 0.5)
        Note right of StoreApp: ĐIỂM CẬP NHẬT QUAN TRỌNG
        StoreApp->>BE: Cập nhật Cân nặng/Số lượng thực tế
        
        Note right of BE: LOGIC TÀI CHÍNH 2
        BE->>BE: Tính lại tổng tiền
        BE->>BE: Tự động trừ tiếp vào Ví (nếu giá tăng & ví còn tiền)
        BE-->>UserApp: Noti: "Giá thay đổi theo thực tế. COD mới là: XXX đ"
    end
    
    StoreApp->>BE: Soạn hàng bán lẻ (Picking)
    StoreApp->>FactoryApp: Chuyển đồ bẩn đi Xưởng (Xe tải)

    Note over FactoryApp, BE: GIAI ĐOẠN 3: XỬ LÝ TẠI XƯỞNG (Blackbox)
    FactoryApp->>BE: Quét nhập kho (Inbound)
    FactoryApp->>BE: QC & Giặt (Processing)
    
    opt Xảy ra sự cố (Exception)
        FactoryApp->>BE: Báo lỗi -> User chọn "Trả lại"
        BE->>BE: Auto-Refund (Hoàn tiền về Ví)
    end
    
    FactoryApp->>BE: Quét xuất kho (Outbound)
    FactoryApp->>StoreApp: Trả đồ sạch về Tiệm

    Note over StoreApp, User: GIAI ĐOẠN 4: HỢP NHẤT & THANH TOÁN CUỐI
    StoreApp->>StoreApp: Gom [Đồ sạch] + [Hàng mua]
    StoreApp->>Shipper: Bàn giao gói hàng
    
    alt Đã trả hết bằng Ví/Gói
        Shipper->>User: Giao hàng (Không thu tiền)
    else Còn thiếu tiền (Dư nợ)
        Shipper->>User: Giao hàng & Thu COD phần còn thiếu
    end
    
    User->>UserApp: Đánh giá dịch vụ
```


## Low Level Flow
### Luồng 1: Đặt hàng hợp nhất (User Booking Flow)
Việc thêm tính năng **Quản lý Tài sản (Ví/Gói)** sẽ làm thay đổi **cốt lõi** của Luồng 1 (Đặt hàng).

**Thay đổi lớn nhất:** Trước khi "Chốt đơn", hệ thống cần thêm một bước **"Tính toán & Trừ thử" (Simulation/Preview)**. Khách hàng cần nhìn thấy: *"Tổng 100k, trừ gói còn 50k, trừ ví còn 20k, tôi chỉ cần trả 20k thôi"* trước khi bấm nút Đặt hàng.

Dưới đây là **Sequence Diagram Cập nhật** và **Bảng Mã lỗi bổ sung** cho phần tài chính này.

-----

### SEQUENCE DIAGRAM CẬP NHẬT: ĐẶT HÀNG & TRỪ TÀI SẢN (Full Logic)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as User App
    participant Cart as Logic Giỏ Hàng
    participant Pricing as Pricing Engine (MỚI)
    participant BE as Backend
    participant DB as Database

    Note over User, App: GIAI ĐOẠN 1: MUA SẮM (Giữ nguyên)
    User->>App: Add "Nước giặt" + Add "Giặt Chăn"
    App->>Cart: Update Cart
    
    Note over User, App: GIAI ĐOẠN 2: CHUẨN BỊ CHECKOUT (Giữ nguyên)
    User->>App: Bấm "Thanh toán"
    App->>BE: Validate Stock (Tồn kho)
    BE-->>App: Stock OK

    Note over User, App: GIAI ĐOẠN 3: LOGIC FORM ĐỘNG (Giữ nguyên)
    App->>Cart: Check Service Item? -> YES
    App->>User: Yêu cầu chọn Giờ lấy đồ (Time Slot)
    User->>App: Chọn 10:00 AM

    rect rgba(255, 245, 230, 0.5)
        Note over User, DB: GIAI ĐOẠN 4: TÍNH TOÁN TÀI CHÍNH & ƯU TIÊN TRỪ (MỚI)
        
        App->>Pricing: Request: "Preview Order Price"
        Pricing->>DB: Get User Assets (Package, Voucher, Wallet)
        
        Note right of Pricing: -- BẮT ĐẦU LOGIC ƯU TIÊN --
        
        Pricing->>Pricing: 1. Quét Item "Giặt Chăn" vs "Gói Chăn (còn 2 lượt)"
        Note right of Pricing: -> Trừ 1 lượt. Giá món Chăn = 0đ
        
        Pricing->>Pricing: 2. Quét Voucher (nếu có)
        
        Pricing->>Pricing: 3. Quét Ví (Dư 50k) vs Tổng còn lại (60k)
        Note right of Pricing: -> Trừ hết 50k Ví. Còn thiếu 10k.
        
        Pricing-->>App: Trả về Preview:
        Note right of App: { Total: 120k, Package: -60k, Wallet: -50k, COD: 10k }
        
        App->>User: Hiển thị Breakdown: "Bạn được trừ gói và ví. Cần trả thêm 10k"
    end

    Note over User, DB: GIAI ĐOẠN 5: CHỐT ĐƠN & KHÓA TÀI SẢN (ATOMIC)

    User->>App: Bấm "Xác nhận Đặt hàng"
    App->>BE: Submit Order
    
    BE->>DB: START TRANSACTION
    
    par Xử lý song song
        BE->>DB: Insert Order (Status=PENDING)
        BE->>DB: Update Stock (Trừ Nước giặt)
        BE->>DB: Update User_Packages (Trừ 1 lượt)
        BE->>DB: Update User_Assets (Trừ 50k)
    end
    
    alt Lỗi Transaction (Exception E1-05/06)
        DB-->>BE: Error (Ví dụ: Gói vừa hết hạn tức thì)
        BE->>DB: ROLLBACK
        BE-->>App: Báo lỗi "Dữ liệu tài sản thay đổi, vui lòng thử lại"
    else Thành công
        BE->>DB: COMMIT
        BE-->>App: Success #DH001
    end
```

| Mã Lỗi | Tình huống (Scenario) | Xử lý của Hệ thống (System Handling) | Hành động hiển thị (UX/UI) |
| :--- | :--- | :--- | :--- |
| **E1-01** | **Hết hàng phút chót (Inventory Clash)**<br>Khách bỏ Nước giặt vào giỏ, nhưng lúc bấm Checkout thì Tiệm hết hàng (do người khác mua mất). | **Inventory Check:**<br>- Check tồn kho Real-time khi bấm "Thanh toán".<br>- Nếu `stock = 0` $\rightarrow$ Block Checkout. | Hiển thị Popup: *"Sản phẩm 'Nước giặt Omo' tạm hết tại cửa hàng phục vụ bạn. Vui lòng bỏ ra khỏi giỏ hoặc chọn sản phẩm khác."* |
| **E1-02** | **Quá tải dịch vụ (Slot Full)**<br>Khách chọn 10:00 AM, nhưng Shipper full lịch vào giờ đó. | **Capacity Check:**<br>- Check năng lực Shipper/Store.<br>- Ẩn/Khóa các Slot đã đầy. | Slot 10:00 AM bị làm mờ (Disabled), hiện chữ "Full". Gợi ý chọn 11:00 AM. |
| **E1-03** | **Xóa sạch Dịch vụ (Empty Service)**<br>Khách chọn Giặt + Mua $\rightarrow$ Chọn giờ lấy $\rightarrow$ Quay lại xóa món Giặt, chỉ để lại món Mua. | **UI Switch Logic:**<br>- Hệ thống detect trong giỏ không còn `Type=SERVICE`.<br>- Tự động Clear trường "Giờ lấy đồ". | Màn hình Checkout tự động ẩn phần "Chọn giờ lấy đồ", chuyển sang giao diện Giao hàng thương mại bình thường. |
| **E1-04** | **Ngoài vùng phục vụ (Out of Range)**<br>Địa chỉ khách quá xa Tiệm (Store) được chỉ định. | **Distance Check:**<br>- Tính khoảng cách User $\rightarrow$ Store.<br>- Nếu \> `Max_Distance` $\rightarrow$ Block. | Thông báo: *"Rất tiếc, địa chỉ của bạn chưa nằm trong vùng phục vụ của chúng tôi."* |
| **E1-05** | **Tài sản thay đổi phút chót (Asset Race Condition)**<br>Lúc xem Preview thì còn Gói giặt, nhưng 1 giây sau vợ của User dùng mất gói đó ở máy khác. Khi bấm "Đặt hàng" thì gói không đủ. | **Transaction Check:**<br>- Khi Commit, check lại số dư lần cuối.<br>- Nếu `remaining < required` $\rightarrow$ Rollback & Báo lỗi. | Popup: *"Gói dịch vụ hoặc Số dư ví của bạn vừa có thay đổi. Vui lòng tải lại trang thanh toán để cập nhật giá mới."* |
| **E1-06** | **Gói hết hạn đúng lúc đặt (Just Expired)**<br>Gói hết hạn lúc 10:00:00. Khách bấm đặt lúc 10:00:01. | **Time Validation:**<br>- Check `expiry_date` so với `server_time`.<br>- Nếu hết hạn $\rightarrow$ Không trừ gói, tính giá gốc. | Thông báo: *"Rất tiếc, Gói giặt chăn của bạn vừa hết hạn. Đơn hàng sẽ được tính theo giá niêm yết. Bạn có muốn tiếp tục?"* |
| **E1-07** | **Lỗi trừ tiền âm (Negative Balance)**<br>Do lỗi logic nào đó khiến Ví bị trừ quá số dư hiện có. | **Database Constraint:**<br>- Cột `balance` trong DB phải đặt constraint `UNSIGNED` (Không âm) hoặc Trigger chặn.<br>- Backend catch lỗi SQL. | Báo lỗi chung: *"Giao dịch thất bại (Lỗi E1-07). Vui lòng liên hệ CSKH."* |
| **E1-08** | **Không đủ điều kiện Voucher**<br>Voucher giảm 20k cho đơn 100k. Sau khi trừ Gói dịch vụ, tổng tiền đơn hàng tụt xuống còn 50k (dưới chuẩn Voucher). | **Re-validate Voucher:**<br>- Logic: `Total_After_Package` phải \>= `Min_Order_Value`.<br>- Nếu không đủ $\rightarrow$ Gỡ Voucher ra. | Toast message: *"Voucher đã bị gỡ do đơn hàng không đủ giá trị tối thiểu sau khi dùng Gói dịch vụ."* |

- Lưu ý kỹ thuật cho Dev Team:

  - **Database Transaction (Giai đoạn 5):** Đây là phần quan trọng nhất. Việc (Tạo đơn + Trừ kho + Trừ gói + Trừ tiền) phải nằm trong **cùng 1 Transaction**. Nếu 1 trong 4 cái thất bại, cả 3 cái kia phải quay lại từ đầu (Rollback). Tuyệt đối không để tình trạng "Trừ tiền rồi mà Đơn không tạo được".
  - **Concurrency (Đồng thời):** Chú ý xử lý trường hợp 1 tài khoản đăng nhập trên 2 điện thoại cùng đặt đơn 1 lúc để "hack" dùng 2 lần gói dịch vụ. (Giải pháp: Database Row Locking lúc update).

### Luồng 2: Xử lý tại Tiệm (Store Operations)
```mermaid
sequenceDiagram
    autonumber
    actor Staff as NV Tiệm
    participant App as Store App
    participant BE as Backend (Pricing & Wallet)
    participant DB as Database
    participant Printer as Máy in
    participant UserApp

    Note over Staff: Đơn #DH001: 2kg Giặt + 1 Nước giặt

    Staff->>App: Quét mã đơn #DH001
    BE-->>App: Load chi tiết & Trạng thái thanh toán (Đã trừ Ví/Gói)

    par XỬ LÝ DỊCH VỤ (Service Flow)
        Staff->>Staff: Cân đồ thực tế
        
        alt Sai lệch số lượng (Exception E2-01 - CẬP NHẬT)
            Note right of Staff: Khách khai 2kg, Cân được 5kg
            Staff->>App: Sửa số lượng: 5kg -> Submit
            
            rect rgba(255, 245, 230, 0.5)
                Note right of App: --- LOGIC TÀI CHÍNH TỰ ĐỘNG ---
                App->>BE: Recalculate Total (Giá tăng thêm 50k)
                BE->>DB: Check Wallet Balance
                
                alt Ví còn tiền (Ví dụ: dư 100k)
                    BE->>DB: Trừ tiếp 50k trong Ví
                    BE-->>App: Báo: "Đã trừ thêm 50k từ Ví khách"
                    BE->>UserApp: Noti: "Cân lại 5kg. Đã trừ thêm 50k vào số dư."
                else Ví hết tiền
                    BE->>DB: Update Order: COD_Amount += 50k
                    BE-->>App: Báo: "Ví không đủ. THU THÊM COD: 50.000đ"
                    BE->>UserApp: Noti: "Cân lại 5kg. Vui lòng thanh toán thêm 50k khi nhận."
                end
            end
            
        else Số lượng khớp
            Staff->>App: Xác nhận OK
        end
        
        Staff->>App: Bấm "In Tem"
        
        alt Lỗi máy in (Exception E2-04)
            App->>Printer: Lệnh in -> Fail
            App-->>Staff: Báo lỗi
            Staff->>Printer: Fix -> Bấm "In lại"
        else OK
            Printer-->>Staff: Nhả tem -> Bắn vào đồ
        end
        
    and XỬ LÝ BÁN LẺ (Retail Flow)
        Staff->>Staff: Đi lấy chai Nước giặt
        
        alt Không tìm thấy hàng (Exception E2-02 - CẬP NHẬT)
            Staff->>App: Bấm "Báo hết hàng"
            
            rect rgba(230, 255, 230, 0.5)
                Note right of App: --- AUTO REFUND ---
                App->>BE: Remove Item
                BE->>DB: Hoàn tiền món này về Ví (Refund Credit)
                BE->>UserApp: Noti: "Hết nước giặt. Đã hoàn 100k về Ví."
            end
            
        else Có hàng
            Staff->>App: Tick "Đã lấy"
        end
    end

    Staff->>App: Hoàn tất đơn -> Chờ xe tải
```

| Mã Lỗi | Tình huống (Scenario) | Xử lý của Hệ thống (System Handling) | Hành động (Store Staff Action) |
| :--- | :--- | :--- | :--- |
| **E2-01** | **Sai lệch số lượng (Giá Tăng)**<br>Khách đặt 2kg (40k), Cân thực tế 5kg (100k). Chênh lệch: +60k. | **Logic "Truy thu" (Charge):**<br>1. Check số dư Ví.<br>2. Nếu đủ: Trừ Ví 60k.<br>3. Nếu thiếu: Cộng 60k vào tiền COD cần thu.<br>4. Gửi Noti báo rõ nguồn tiền bị trừ. | - Nhập số thực tế.<br>- **Quan trọng:** Nhìn màn hình App xem có hiện dòng *"Cần thu thêm COD"* không để ghi chú cho Shipper. |
| **E2-01B**| **Sai lệch số lượng (Giá Giảm)**<br>Khách đặt 5kg, Cân thực tế 2kg. Chênh lệch: -60k. | **Logic "Hoàn tiền" (Refund):**<br>1. Tính số tiền thừa.<br>2. **Cộng ngược vào Ví (Credit Balance)**.<br>3. Tuyệt đối không hoàn tiền mặt qua Shipper. | Nhập số thực tế $\rightarrow$ Báo khách: *"Tiền thừa đã được hoàn về Ví để dùng lần sau"*. |
| **E2-02** | **Hết hàng (Out of Stock)**<br>Khách đã trả tiền mua Nước giặt (100k), nhưng Tiệm hết hàng. | **Logic "Auto Refund":**<br>1. Hủy item khỏi đơn.<br>2. Hoàn 100k vào Ví khách hàng.<br>3. Gửi Noti xin lỗi. | Bấm "Báo hết hàng" trên App. |
| **E2-03** | **Từ chối nhận đồ (Rejected)**<br>Áo da bị mốc, không nhận giặt. | **Logic "Void Service":**<br>1. Đổi trạng thái Item `REJECTED`.<br>2. Hoàn phí dịch vụ món đó về Ví. | Bấm "Từ chối" $\rightarrow$ Chọn lý do $\rightarrow$ Dán tem "TRẢ LẠI". |
| **E2-04** | **Lỗi máy in (Printer Error)**<br>*Mục này lấy từ bản cũ*<br>Bấm in tem nhưng máy in kẹt giấy/hết giấy/mất kết nối. | **Logic "Reprint":**<br>1. Không sinh mã định danh mới (tránh trùng lặp ID).<br>2. Cho phép gửi lại lệnh in cho mã cũ. | Kiểm tra giấy/Bluetooth $\rightarrow$ Bấm nút "In lại" (Reprint) trên App. |
| **E2-05** | **Khách hủy khi đang cân (User Cancel)**<br>Vừa nhận tin nhắn báo giá tăng, khách gọi điện đòi hủy luôn đơn hàng đang ở Tiệm. | **Logic "Force Cancel & Refund":**<br>1. Staff hủy đơn tại Tiệm.<br>2. Hệ thống hoàn toàn bộ tiền đã thanh toán về Ví.<br>3. Tính phí phạt (nếu có - tùy chính sách). | Bấm nút "Hủy đơn" trên App Store $\rightarrow$ Trả đồ lại cho Shipper mang về cho khách. |

- Điểm nhấn cho Dev:

  - **Không bao giờ hoàn tiền mặt (No Cash Refund):** Trong quy trình O2O này, nếu có bất kỳ sự cố nào làm giảm giá trị đơn hàng (cân nhẹ hơn, hết hàng, từ chối giặt), hệ thống mặc định **Hoàn về Ví (Credit)**. Điều này giúp đơn giản hóa quy trình cho Shipper (không phải móc túi trả lại tiền) và giữ chân khách hàng.

### Luồng 3: Xưởng vận hành & Truy vấn (Factory In/Out/Query)
```mermaid
sequenceDiagram
    autonumber
    actor Worker as NV Xưởng
    participant App as Factory App
    participant BE as Backend (Pricing & Wallet)
    participant UserApp

    Note over Worker: 1. NHẬP KHO & XỬ LÝ (Giữ nguyên)
    Worker->>App: Quét Nhập -> Quét Món -> Giặt
    
    Note over Worker: 2. XỬ LÝ SỰ CỐ & HOÀN TIỀN (CẬP NHẬT)
    
    opt Phát hiện lỗi (Rách/Hỏng)
        Worker->>App: Báo lỗi (Gửi ảnh)
        App->>BE: Treo đơn (Hold Item)
        BE->>UserApp: Push Noti xin ý kiến
        
        alt Khách chọn: TRẢ LẠI (Không giặt)
            UserApp->>BE: Confirm Return
            
            rect rgba(255, 245, 230, 0.5)
                Note right of BE: --- AUTO REFUND LOGIC ---
                BE->>BE: Tính giá trị dịch vụ món này (VD: 50k)
                BE->>BE: Hoàn 50k về Ví khách (Credit)
                BE->>UserApp: Noti: "Đã hoàn 50k về Ví do sự cố."
            end
            
            BE-->>App: Lệnh: "In tem TRẢ -> Đóng gói"
        else Khách chọn: GIẶT TIẾP
            BE-->>App: Lệnh: "Tiếp tục giặt"
        end
    end

    Note over Worker: 3. MẤT ĐỒ / THẤT LẠC (QUAN TRỌNG)
    
    opt Tra cứu không thấy đồ (Lost Item)
        Worker->>App: Báo cáo: Mất đồ
        
        rect rgba(255, 245, 230, 0.5)
            Note right of BE: --- AUTO COMPENSATION ---
            BE->>BE: Refund 100% phí dịch vụ
            BE->>BE: (Option) Cộng tiền đền bù vào Ví (theo chính sách)
        end
    end

    Note over Worker: 4. XUẤT KHO (Giữ nguyên)
    Worker->>App: Quét Xuất -> Bàn giao xe tải
```

| Mã Lỗi | Tình huống (Scenario) | Xử lý của Hệ thống (System Handling) | Hành động (Factory Staff Action) |
| :--- | :--- | :--- | :--- |
| E3-01  | **Thiếu bao (Missing Bag on Manifest)**<br><br>App báo xe tải có 10 bao, đếm thực tế chỉ có 9.                    | Logic "Dispute Inbound":<br>- Cho phép xác nhận số lượng thực tế (9/10).<br>- Tạo Ticket cảnh báo "Mất bao" gửi về Admin/Tiệm.                                | Staff nhập số thực tế: "9" → Hệ thống cảnh báo đỏ 🔴 → Bấm "Xác nhận thiếu" để tiếp tục.            |
| E3-02  | **Dư bao (Ghost Bag)**<br><br>App báo 10 bao, đếm ra 11 bao (Tiệm gửi thừa nhưng quên quét).                      | Logic "Force Inbound":<br>- Cho phép quét mã bao thừa.<br>- Hệ thống tự động add bao đó vào Manifest chuyến xe.                                               | Staff quét bao thừa → App báo: "Bao này chưa có trong chuyến, bạn muốn thêm vào?" → Chọn "Yes".    |
| E3-03  | **Tem không đọc được (Unreadable Tag)**<br><br>Mã vạch bị mờ do nước/hóa chất, máy quét không nhận.               | Logic "Manual Lookup":<br>- Cho phép nhập mã số (Human readable ID) in dưới mã vạch.<br>- Hoặc: Nếu mất cả số → Quy trình tìm đồ thất lạc (nhập đặc điểm áo). | Staff chọn "Nhập mã thủ công" (Manual Entry) → Gõ ID (ví dụ: 123-01).                              |
| E3-04  | **Bỏ nhầm sọt (Wrong Bin Sorting)**<br><br>Đồ của Tiệm A, nhưng nhân viên ném nhầm vào sọt Tiệm B khi xuất xưởng. | Logic "Sorting Validation":<br>- Nếu quét Item xong, quét tiếp Sọt (Bin ID).<br>- Nếu Bin ID không khớp với Item Destination → Báo lỗi Âm thanh lớn.          | Staff quét Áo → Quét Sọt Tiệm B → App kêu "TÍT TÍT TÍT" (Sai rồi) → Staff phải bỏ sang sọt Tiệm A. |
| **E3-05** | **Khách yêu cầu Trả lại (Customer Return)**<br>Sau khi xem ảnh lỗi, khách không đồng ý giặt. | **Logic "Void & Refund":**<br>1. Đổi trạng thái `RETURN_AS_IS`.<br>2. **Hoàn tiền dịch vụ về Ví (Credit)**.<br>3. Gửi Noti báo hoàn tiền. | Nhận lệnh trên App: "In tem TRẢ LẠI" $\rightarrow$ Dán tem đỏ $\rightarrow$ Để riêng. |
| **E3-06** | **Làm mất đồ (Lost Item)**<br>Quét nhập rồi nhưng tìm mãi không thấy để xuất. Xác nhận mất tại Xưởng. | **Logic "Compensate":**<br>1. Đổi trạng thái `LOST`.<br>2. **Hoàn tiền + Đền bù vào Ví**.<br>3. Trừ lương nhân viên/Xưởng (Tính sau ở module HR). | Bấm nút "Báo mất" (Report Lost) trên màn hình Tra cứu. |

### Luồng 4: Xử lý sự cố (Exception Handling)
```mermaid
sequenceDiagram
    autonumber
    actor NV as NV Xưởng
    participant FA as Factory App
    participant BE as Backend
    participant DB as Database (Wallet & Asset)
    participant UA as User App
    actor User as Khách Hàng

    Note over NV, User: PHẦN 1: PHÁT HIỆN & BÁO LỖI
    NV->>FA: Quét món đồ (Item A) -> Phát hiện rách
    NV->>FA: Chọn "Báo lỗi" -> Chụp ảnh -> Submit
    FA->>BE: Update Item A: EXCEPTION_HOLD
    BE->>UA: Push Noti: "Món đồ #123 bị rách, cần xác nhận!"
    
    UA->>User: Hiển thị ảnh & Option
    
    alt CASE 1: KHÁCH ĐỒNG Ý GIẶT (Chấp nhận rủi ro)
        User->>UA: Chọn "Vẫn giặt (Miễn trừ trách nhiệm)"
        UA->>BE: Confirm: WASH_WITH_RISK
        BE->>DB: Log xác nhận của khách (Evidence)
        BE->>FA: Push Task: "Tiếp tục giặt Item A"
        FA-->>NV: Màn hình xanh: "KHÁCH ĐỒNG Ý GIẶT"
        NV->>FA: Bấm "Đã đưa vào giặt"
        FA->>BE: Update Item A: PROCESSING

    else CASE 2: KHÁCH TỪ CHỐI (Trả lại, không giặt)
        User->>UA: Chọn "Không giặt / Trả lại"
        UA->>BE: Confirm: RETURN_AS_IS (Trả nguyên trạng)
        
        rect rgb(255, 245, 230)
            Note right of BE: --- LOGIC HOÀN TIỀN TỰ ĐỘNG (AUTO REFUND) ---
            BE->>DB: Get Item Price (VD: 50k)
            BE->>DB: UPDATE `User_Assets`: balance += 50000
            BE->>DB: Log Transaction: REFUND_SERVICE
            BE->>DB: Update Item A: CANCELLED_SERVICE
        end
        
        BE->>FA: Push Task: "DỪNG GIẶT -> CHUYỂN KHU TRẢ"
        FA-->>NV: Màn hình đỏ: "KHÁCH TỪ CHỐI!\nIn tem 'Hàng trả' & Để riêng"
        
        Note right of NV: XỬ LÝ HẬU CẦN
        NV->>FA: Bấm "In Tem Trả" -> Dán tem đỏ -> Để sọt chờ
        NV->>FA: Bấm "Xác nhận đã cách ly"
        
        FA->>BE: Update Item A: READY_TO_PACK_RETURN
        BE->>UA: Noti: "Đã xác nhận trả món đồ. Đã hoàn 50k vào Ví của bạn."
        
        opt Các món khác trong đơn
            Note over BE: Các món B, C vẫn giặt bình thường
        end
    end
```

| Mã Lỗi | Tình huống (Scenario) | Xử lý của Hệ thống (System Handling) | Hành động / Hiển thị (Action/UI) |
| :--- | :--- | :--- | :--- |
| **E4-01** | **Khách không phản hồi (Timeout)**<br>Quá 24h khách không xác nhận. | **Logic "Auto-Decision & Refund":**<br>1. Chuyển trạng thái `RETURN_AS_IS`.<br>2. **Tự động hoàn phí dịch vụ về Ví (Credit)**.<br>3. Gửi thông báo kết quả cho khách. | **App Khách:** Thông báo *"Đã quá hạn xác nhận. Hệ thống tự động chuyển sang chế độ TRẢ LẠI và đã hoàn tiền về Ví."*<br>**App Xưởng:** Hiện lệnh *"Hết hạn chờ → In tem TRẢ"* |
| **E4-02** | **Báo lỗi nhầm (Wrong Report)**<br>Nhân viên chụp nhầm ảnh/chọn nhầm lỗi. | **Logic "Recall Report":**<br>- Cho phép "Thu hồi báo cáo" nếu khách chưa phản hồi.<br>- Nếu khách đã phản hồi/đã hoàn tiền $\rightarrow$ Phải gọi Admin để Rollback giao dịch Ví. | **App Xưởng:** Nút "Hủy báo cáo" (Undo) khả dụng trong 5 phút đầu. |
| **E4-03** | **Vỡ điều kiện Voucher (Voucher Violation)**<br>Trả lại món làm đơn hàng tụt dưới mức tối thiểu của Voucher. | **Logic "Re-validate & Partial Refund":**<br>1. Tính lại giá trị đơn không có món lỗi.<br>2. Nếu mất Voucher $\rightarrow$ Số tiền hoàn về Ví = (Giá món lỗi) - (Giá trị Voucher bị mất).<br>3. Cảnh báo khách trước. | **App Khách:** Popup *"Nếu trả lại món này, Voucher 50k sẽ bị hủy. Số tiền thực hoàn về Ví là: 10k. Bạn đồng ý không?"* |
| **E4-04** | **Khách không dùng App (Offline Confirmation)**<br>Khách gọi điện xác nhận. | **Logic "Admin Override":**<br>- Admin thay mặt khách chọn phương án.<br>- Nếu chọn Trả lại $\rightarrow$ Hệ thống vẫn tự động hoàn tiền về Ví như bình thường. | **Web Admin:** Bấm nút "Force Accept/Return" trên trang chi tiết đơn. |
| **E4-05** | **Xử lý sai lệnh (Operation Conflict)**<br>Khách chọn TRẢ, Xưởng vẫn GIẶT. | **Logic "Outbound Alert":**<br>- Khi xuất kho, check trạng thái.<br>- Nếu thấy đồ Sạch mà trạng thái là `RETURN` $\rightarrow$ Cảnh báo & Không trừ tiền lại (coi như giặt khuyến mãi cho khách để xin lỗi). | **App Xưởng:** Cảnh báo đỏ *"Món này khách yêu cầu TRẢ. Hãy kiểm tra lại\!"* |
| **E4-06** | **Mất đồ tại xưởng (Lost Item)**<br>Tìm mãi không thấy đồ. | **Logic "Compensation":**<br>1. Xác nhận Mất.<br>2. **Hoàn 100% phí dịch vụ về Ví**.<br>3. **Cộng thêm tiền đền bù** (theo cấu hình Admin) vào Ví. | **App Xưởng:** Chức năng "Báo mất" (Report Lost).<br>**App Khách:** Noti *"Rất xin lỗi, chúng tôi đã làm thất lạc đồ. Đã đền bù xxx tiền vào Ví của bạn."* |

### Admin flows

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Web as Admin Dashboard
    participant BE as Backend
    participant DB as Database
    participant App as User/Staff Apps

    rect rgba(230, 240, 255, 0.5)
        Note over Admin, App: PHASE 1: THIẾT LẬP & TÀI NGUYÊN (Setup)
        Admin->>Web: 1. Tạo Sản phẩm / Dịch vụ / GÓI (Package/Credit)
        Web->>BE: Create Product (Physical/Service/Package/Credit)
        BE->>DB: Insert Data
        
        Admin->>Web: 2. Nhập kho (Input Stock)
        Web->>BE: Update Inventory
        BE->>DB: Save Stock
        
        Admin->>Web: 3. Tạo TK Nhân viên
        Web->>BE: Create Staff Account
        BE->>DB: Save Account & Role
    end

    rect rgba(255, 245, 230, 0.5)
        Note over Admin, App: PHASE 2: CAN THIỆP VẬN HÀNH (Operations - MVP)
        Note right of Admin: Khi có đơn hàng mới (Pending)
        
        Admin->>Web: 4. Điều phối Ship (Manual Dispatch)
        Web->>BE: Update Order: ASSIGNED_DRIVER
        BE-->>App: Noti: "Tài xế đang đến"

        alt Hủy đơn / Force Cancel
            Admin->>Web: Bấm "Hủy đơn"
            Web->>BE: Cancel Order & Trigger AUTO-REFUND Logic
            BE->>DB: Hoàn tiền về Ví Khách (Credit)
            BE->>Web: Báo thành công
        end
    end

    rect rgba(230, 255, 230, 0.5)
        Note over Admin, App: PHASE 3: MARKETING & NỘI DUNG
        Admin->>Web: 5. Tạo Banner / Push Noti
        Web->>BE: Save CMS & Broadcast
        BE->>App: 🔔 Ting!
    end

    rect rgba(255, 230, 230, 0.5)
        Note over Admin, App: PHASE 4: QUẢN TRỊ TÀI CHÍNH & TÀI SẢN (MỚI)
        
        Note right of Admin: Xử lý khiếu nại (VD: Khách báo nạp tiền lỗi)
        Admin->>Web: 6. Tra cứu Ví khách hàng
        Web->>BE: Get User Assets History
        BE->>DB: Query Transactions
        DB-->>Web: Show: "Số dư 500k, Gói Chăn còn 2 lượt"
        
        alt Điều chỉnh thủ công (Manual Adjustment)
            Admin->>Web: Bấm "Cộng tiền đền bù" (+50k)
            Web->>BE: Create Transaction (Type: ADJUSTMENT)
            BE->>DB: Update Wallet Balance
            BE-->>App: Noti: "Bạn nhận được 50k đền bù từ Admin"
        end
    end
```

| Mã Lỗi | Tình huống | Xử lý của Hệ thống | Hành động hiển thị (Admin UI) |
| :--- | :--- | :--- | :--- |
| **A-01** | **Trùng SKU**<br>Nhập mã SKU đã tồn tại. | Check Unique Constraint. | **Báo đỏ:** "Mã SKU 'NUOC-GIAT-01' đã tồn tại." |
| **A-02** | **Xung đột xóa (Active Constraint)**<br>Xóa món đang có đơn chạy. | Query Active Orders. | **Alert:** "Không thể ẩn. Còn 5 đơn hàng đang xử lý chứa sản phẩm này." |
| **A-03** | **Lỗi định dạng ảnh**<br>Upload ảnh sai quy định. | Validate File. | **Báo:** "Ảnh phải định dạng JPG/PNG \< 2MB." |
| **A-04** | **Điều chỉnh số dư Âm (Invalid Adjustment)**<br>Admin trừ tiền phạt quá tay khiến ví khách bị âm. | **Balance Check:**<br>- Check `Current Balance` + `Adjust Amount`.<br>- Nếu \< 0 $\rightarrow$ Block. | **Báo lỗi:** "Số dư hiện tại của khách là 20k. Không thể trừ 50k. Vui lòng kiểm tra lại." |
| **A-05** | **Gói cước không hợp lệ (Invalid Package Config)**<br>Tạo gói "3 lần giặt" nhưng quên chọn Dịch vụ áp dụng. | **Config Validation:**<br>- Bắt buộc chọn `Service_ID` khi tạo gói `COUNT_BASED`. | **Highlight:** "Vui lòng chọn Dịch vụ áp dụng cho gói này (VD: Giặt Chăn)." |
| **A-06** | **Hủy đơn đã hoàn tất (Completed Order Cancel)**<br>Cố gắng hủy một đơn đã giao thành công và đã đối soát. | **Status Check:**<br>- Nếu `Status = COMPLETED` $\rightarrow$ Block Hủy. | **Alert:** "Đơn hàng đã hoàn tất và ghi nhận doanh thu. Không thể hủy. Hãy dùng chức năng 'Hoàn tiền' nếu cần." |

### Asset management flows

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as User App
    participant BE as Backend
    participant PG as Payment Gateway
    participant DB as Database
    participant Cron as Cron Job (Hẹn giờ)
    participant Noti as Notification Service

    rect rgb(230, 245, 255)
        Note over User, DB: PHẦN A: QUY TRÌNH MUA TÀI SẢN (NẠP TIỀN HOẶC MUA GÓI)
        
        User->>App: Chọn mua: "Gói Giặt 3 Lần" HOẶC "Nạp 500k"
        App->>BE: Create Order (Type: ASSET_PURCHASE)
        BE->>PG: Request Payment Link/QR
        User->>PG: Thanh toán thành công
        PG->>BE: Webhook: Payment Success
        
        BE->>DB: Get Product Info
        
        alt Loại sản phẩm là TOP_UP (Nạp tiền)
            DB-->>BE: Info: Credit +550k
            BE->>DB: UPDATE `User_Assets`: balance += 550000
            BE-->>App: Noti: "Nạp tiền thành công! Số dư: 550k"
            
        else Loại sản phẩm là PACKAGE (Gói dịch vụ)
            DB-->>BE: Info: 3 Lượt Giặt Chăn, Hạn 30 ngày
            BE->>BE: Calculate Expiry (Today + 30)
            BE->>DB: INSERT `User_Packages`:
            Note right of DB: - Type: CHAN_BONG<br>- Count: 3<br>- Expire: 2024-12-31
            BE-->>App: Noti: "Mua gói thành công! Hạn dùng đến 31/12"
        end
    end

    rect rgb(255, 240, 230)
        Note over Cron, User: PHẦN B: QUY TRÌNH TỰ ĐỘNG NHẮC HẾT HẠN (DAILY CHECK)
        
        Note right of Cron: Chạy định kỳ 08:00 sáng mỗi ngày
        Cron->>BE: Trigger: Check_Expiring_Assets
        
        BE->>DB: Query: Tìm các Gói hết hạn trong 3 ngày tới
        DB-->>BE: List: [User A - Gói Chăn - Hết hạn 31/12]
        
        loop Với từng User sắp hết hạn
            BE->>Noti: Tạo thông báo nhắc nhở
            Noti->>App: 🔔 "Gói giặt chăn của bạn sắp hết hạn vào 31/12. Dùng ngay kẻo phí!"
            
            opt Nếu có Email
                Noti->>User: Gửi Email nhắc nhở
            end
        end
        
        BE->>DB: Query: Tìm các Gói ĐÃ hết hạn hôm qua
        BE->>DB: UPDATE `User_Packages`: status = EXPIRED
    end
```

| Mã Lỗi   | Tình huống                                                                                                                                               | Xử lý                                                                                                                                                                    |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset-01 | **Mua trùng gói (Duplicate)**<br><br>Khách đang còn gói Chăn (hạn 5 ngày), mua thêm gói Chăn mới (hạn 30 ngày).                                          | **Logic cộng dồn (Stacking):**<br>Tạo một dòng mới (New Record) trong DB. Khi Checkout, hệ thống tự động trừ vào gói có hạn dùng gần nhất trước (FIFO theo Expiry Date). |
| Asset-02 | **Quên dùng (Expired)**<br><br>Khách quên dùng, gói bị hết hạn. Khách gọi điện xin gia hạn.                                                              | **Admin Tool:**<br>Cho phép Admin vào sửa expiry_date để gia hạn thêm vài ngày cho khách (giữ chân khách hàng).                                                          |
| Asset-03 | **Cron Job chết (System Fail)**<br><br>Server bị lỗi, Cron job không chạy, khách không nhận được thông báo nhắc nhở -> Khách kiện vì không biết hết hạn. | **Fail-safe:**<br>Ghi log mỗi lần Cron chạy thành công. Nếu quá 24h không thấy log -> Bắn cảnh báo cho Admin/Dev để kiểm tra Server.                                     |

### Report flows

```mermaid
sequenceDiagram
    autonumber
    participant App as User/Staff App
    participant BE as Backend
    participant DB as Database
    participant Report as Reporting Service
    actor Admin

    rect rgba(230, 255, 230, 0.5)
        Note over App, DB: LUỒNG 1: GHI NHẬN DÒNG TIỀN (CASH IN)
        Note right of App: Khi khách Nạp tiền hoặc Mua Gói
        App->>BE: Payment Success (Top-up 500k)
        BE->>DB: Log Transaction:
        Note right of DB: Type: DEPOSIT<br>Amount: +500k<br>Method: Momo<br>Status: UN-REALIZED REVENUE (Doanh thu chưa thực hiện)
    end

    rect rgba(255, 245, 230, 0.5)
        Note over App, DB: LUỒNG 2: GHI NHẬN DOANH THU VẬN HÀNH (USAGE)
        Note right of App: Khi khách Hoàn tất đơn giặt (Dùng Ví/Gói)
        App->>BE: Order Completed (Total 100k)
        BE->>DB: Log Transaction:
        Note right of DB: Type: PAYMENT<br>Amount: 100k (Trừ Ví 80k, COD 20k)<br>Status: REALIZED REVENUE (Doanh thu thực hiện)
    end

    rect rgba(230, 240, 255, 0.5)
        Note over Report, Admin: TỔNG HỢP & BÁO CÁO (AGGREGATION)
        
        Admin->>Report: Xem Báo cáo Tài chính
        
        par Query Cash Flow (Tiền thực thu)
            Report->>DB: SUM(DEPOSIT) + SUM(COD_COLLECTED)
            DB-->>Report: Tổng tiền mặt về túi: 10tr
        and Query Revenue (Giá trị dịch vụ)
            Report->>DB: SUM(Order_Value) where Status=COMPLETED
            DB-->>Report: Tổng giá trị phục vụ: 8tr
        and Query Liability (Nợ khách)
            Report->>DB: SUM(User_Wallet_Balance) + Value(User_Packages)
            DB-->>Report: Dư nợ phải trả dịch vụ: 5tr
        end
        
        Report-->>Admin: Hiển thị Dashboard 3 chỉ số tách biệt
    end
```

| Mã Lỗi | Tình huống (Scenario) | Nguyên nhân | Xử lý & Hiển thị (Solution) |
| :--- | :--- | :--- | :--- |
| **R-01** | **Lệch tiền COD (Cash Mismatch)**<br>Shipper nộp thiếu tiền thu hộ. | Shipper làm mất hoặc gian lận. | **Manual Adjustment:** Kế toán tạo phiếu thu ghi nhận số thực nộp. Phần thiếu ghi vào "Công nợ Shipper" để trừ lương. |
| **R-02** | **Đơn hàng treo (Pending Orders)**<br>Doanh thu ước tính cao nhưng chưa hoàn tất. | Đơn bị kẹt ở trạng thái `PROCESSING`. | **Cảnh báo:** List ra các đơn quá hạn 48h chưa xong để Vận hành xử lý dứt điểm (Hoàn thành hoặc Hủy). |
| **R-03** | **Âm kho ảo / Âm ví ảo**<br>Báo cáo ghi nhận số dư ví khách hàng \< 0. | Lỗi logic khi trừ tiền phạt hoặc truy thu COD. | **Highlight Đỏ:** Cảnh báo Admin kiểm tra ngay các User ID bị âm tiền để fix bug hoặc truy thu. |
| **R-04** | **Doanh thu ảo (Double Counting)**<br>Tổng doanh thu cao bất thường (Cộng cả tiền nạp + tiền tiêu). | Code báo cáo cộng gộp cả `DEPOSIT` và `PAYMENT`. | **Tách báo cáo:**<br>1. **Báo cáo Dòng tiền (Cashflow):** Chỉ tính Tiền nạp + COD.<br>2. **Báo cáo Kinh doanh (P\&L):** Chỉ tính Giá trị đơn hàng hoàn tất. |
| **R-05** | **Lệch số dư tổng (Liability Mismatch)**<br>Tổng tiền nạp vào (100 đồng) - Tổng tiền đã tiêu (30 đồng) \!= Tổng số dư hiện tại của tất cả user (65 đồng?? Lệch 5 đồng). | Có giao dịch sửa số dư thủ công (Admin) hoặc lỗi hoàn tiền không ghi log. | **Audit Log:** Quét lại toàn bộ bảng `Wallet_Transactions` để tìm ra giao dịch nào làm lệch số dư tổng. |
| **R-06** | **Hoàn tiền ngoại lệ (Offline Refund)**<br>Khách nạp 1tr, muốn rút lại tiền mặt 500k (Cash out) vì không dùng nữa. | Hệ thống MVP không hỗ trợ rút tiền (Withdraw). | **Thao tác thủ công:**<br>1. Admin trừ 500k trong ví User (Type: `ADMIN_DEDUCT`).<br>2. Kế toán chi tiền mặt/CK ngoài luồng.<br>3. Note rõ lý do trong log. |

- Bạn cần yêu cầu Dev hiển thị 3 con số này to rõ trên màn hình Admin, không được gộp chung:

  1. **GMV (Gross Merchandise Value - Tổng giá trị giao dịch):**
      * Tổng giá trị các đơn hàng đã hoàn thành (Bất kể trả bằng Ví hay Tiền mặt).
      * *Ý nghĩa:* Cho biết quy mô vận hành, độ đắt khách của Tiệm.
  2. **Cash Collection (Thực thu tiền mặt):**
      * \= (Tổng tiền khách Nạp thẻ/Mua gói) + (Tổng tiền COD thu được).
      * *Ý nghĩa:* Tiền tươi thóc thật về túi doanh nghiệp hôm nay.
  3. **Outstanding Liability (Dư nợ khách hàng - Quan trọng cho chủ tiệm):**
      * \= Tổng số dư Ví của tất cả khách + Giá trị quy đổi các Gói chưa dùng.
      * *Ý nghĩa:* Đây là khoản tiền khách đã đưa trước nhưng mình chưa phục vụ. **Không được tiêu hết số tiền này**, phải giữ lại để duy trì hoạt động phục vụ khách sau này.

## Status changing
```mermaid
flowchart TD
    %% --- KHU VỰC 1: TAB MỚI VỀ ---
    Start((Đơn mới nổ)) --> NewTab[Tab: MỚI VỀ]
    NewTab -->|Shipper mang đồ về| Action1{Nhân viên làm gì?}
    
    Action1 -->|Quét QR Đơn hàng| ProcessingTab[Tab: ĐANG XỬ LÝ]
    
    %% --- KHU VỰC 2: TAB ĐANG XỬ LÝ ---
    subgraph "Tại Tiệm (Inbound)"
        ProcessingTab --> Step1["Cân lại & Nhập số liệu"]
        Step1 --> Step2["In Tem & Bắn vào áo"]
        Step2 --> Step3["Soạn hàng bán lẻ (nếu có)"]
        Step3 --> Button1["Bấm nút: Hoàn tất & Chờ giao"]
    end
    
    Button1 -->|API Update| ReadyToShip(Trạng thái: Chờ xe tải)
    
    %% --- KHU VỰC 3: TAB Ở XƯỞNG ---
    subgraph "Logistics & Xưởng (Blackbox)"
        ReadyToShip -->|Xe tải quét gom| AtFactory[Tab: Ở XƯỞNG]
        AtFactory --> FactoryOps(Xưởng giặt...)
        FactoryOps --> TruckBack(Xe tải trả hàng về)
    end
    
    %% --- KHU VỰC 4: TAB CHỜ TRẢ ---
    TruckBack -->|NV Tiệm quét mã Bao sạch| PickupTab[Tab: CHỜ TRẢ]
    
    PickupTab --> Action2{Khách đến lấy?}
    
    Action2 -->|Giao hàng & Thu COD| Button2["Bấm nút: Xác nhận Trả hàng"]
    
    Button2 --> End((COMPLETED))
    
    %% Styling
    style NewTab fill:#e0f2fe,stroke:#3b82f6,stroke-width:2px
    style ProcessingTab fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style AtFactory fill:#f3f4f6,stroke:#9ca3af,stroke-width:2px,stroke-dasharray: 5 5
    style PickupTab fill:#dcfce7,stroke:#22c55e,stroke-width:2px
```

```mermaid  
sequenceDiagram
    autonumber
    actor User
    participant App
    participant BE as Backend
    participant Store as Store App
    participant Shipper

    Note over User, BE: GIAI ĐOẠN 1: KHÁCH CHỌN TÁCH ĐƠN
    User->>App: Checkout (Giặt + Mua)
    User->>App: Chọn: "Giao hàng mua trước (+15k ship)"
    App->>BE: Submit Order (Split_Flag = True)
    
    Note over Store: GIAI ĐOẠN 2: XỬ LÝ TẠI TIỆM (TÁCH LUỒNG)
    Store->>BE: Nhận đơn #DH001
    
    par LUỒNG A: GIAO HÀNG NGAY (Retail)
        Store->>Store: Soạn nước giặt
        Store->>Shipper: Gọi Ship giao ngay
        Shipper->>User: Giao hàng & Thu tiền hàng (COD 1)
    and LUỒNG B: GIẶT LÀ (Service)
        Store->>Store: In tem -> Giao Xưởng -> Giặt -> Nhận về
        Store->>Shipper: Gọi Ship trả đồ
        Shipper->>User: Trả đồ & Thu tiền giặt (COD 2)
    end
```
## Notifications
```mermaid
sequenceDiagram
    autonumber
    
    participant User as 📱 Mobile App
    box "Internal System" #f9f9f9
        participant Order as Order Service
        participant Notif as 🔔 Notif Service
        participant DB as 🗄️ Database
        participant Queue as 📨 Message Queue
        participant Worker as ⚙️ Push Worker
    end
    participant FCM as ☁️ Firebase (FCM)

    %% --- GIAI ĐOẠN 1: TIẾP NHẬN & LƯU TRỮ (INGESTION) ---
    note over Order, DB: 1. Trigger & Lưu Lịch Sử
    Order->>Notif: notifyUser(userId, "ORDER_DONE", {id: 99})
    
    activate Notif
    Notif->>Notif: Render Template -> "Đơn hàng #99 xong"
    Notif->>DB: INSERT into notifications (is_read=false, is_sent=false)
    
    Notif->>DB: SELECT device_token FROM device_tokens WHERE user_id AND is_active=true
    DB-->>Notif: Return [Token_A, Token_B]
    
    alt No Tokens Found
        Notif-->>Order: 200 OK (Chỉ lưu lịch sử, không gửi Push)
    else Tokens Exist
        Notif->>Queue: Enqueue Job {notification_id, tokens, payload}
        Notif-->>Order: 200 OK (Đã tiếp nhận)
    end
    deactivate Notif

    %% --- GIAI ĐOẠN 2: XỬ LÝ GỬI (ASYNC PROCESSING) ---
    note over Queue, FCM: 2. Worker xử lý & Gửi
    
    loop Background Process
        Queue->>Worker: Consume Job
        activate Worker
        
        Worker->>FCM: sendMulticast(tokens, payload)
        activate FCM
        
        %% --- GIAI ĐOẠN 3: XỬ LÝ KẾT QUẢ & EXCEPTION ---
        note right of Worker: 3. Xử lý Exception quan trọng
        
        alt FCM Success (All Tokens)
            FCM-->>User: ⚡ Push Notification (Hiển thị trên máy)
            FCM-->>Worker: Return Success Count
            Worker->>DB: UPDATE notifications SET is_sent=true, sent_at=NOW()
        
        else Error: Token Invalid / NotRegistered (Partial)
            FCM-->>Worker: Return Results [{success: false, token: Token_A}, {success: true, token: Token_B}]
            Worker->>DB: UPDATE device_tokens SET is_active=false WHERE token IN (Token_A)
            note right of DB: Soft delete: đánh dấu token không dùng được
            Worker->>DB: UPDATE notifications SET is_sent=true, sent_at=NOW()
            note right of Worker: Vẫn đánh dấu sent vì có token thành công
            
        else Error: All Tokens Invalid
            FCM-->>Worker: Return All Failed
            Worker->>DB: UPDATE device_tokens SET is_active=false WHERE token IN (Token_A, Token_B)
            Worker->>DB: UPDATE notifications SET is_sent=true, sent_at=NOW()
            note right of DB: Đánh dấu sent nhưng không có device nào nhận được
            
        else Error: FCM Server Timeout / Quota Exceeded
            FCM-->>Worker: Return 5xx Error
            Worker->>Queue: Re-queue (Retry with Backoff)
            note right of Queue: Thử lại sau 5s, 10s... (max 3 lần)
        end
        
        deactivate FCM
        deactivate Worker
    end

    %% --- GIAI ĐOẠN 4: ĐỒNG BỘ TRẠNG THÁI (SYNC) ---
    note over User, DB: 4. User đọc tin & Đồng bộ
    
    User->>User: Click vào thông báo
    User->>Notif: PUT /api/notifications/{id}/read
    activate Notif
    Notif->>DB: UPDATE notifications SET is_read=true, read_at=NOW()
    DB-->>Notif: Success
    Notif-->>User: 200 OK
    deactivate Notif
```

**Lưu ý kỹ thuật:**

1. **Tên bảng đã sửa:**
   - `notification_history` → `notifications` (theo model thực tế)
   - `user_devices` → `device_tokens` (theo model thực tế)
   - `fcm_token` → `device_token` (theo column thực tế)

2. **Xử lý token lỗi:**
   - Không DELETE token, mà set `is_active=false` (soft delete) để giữ lịch sử
   - Xử lý trường hợp **partial success** (một số token thành công, một số lỗi)
   - Xử lý trường hợp **all tokens invalid** (tất cả đều lỗi)

3. **Tracking trạng thái:**
   - Cập nhật `is_sent=true` và `sent_at` sau khi gửi (thành công hoặc thất bại)
   - Cập nhật `read_at` khi user đọc notification

4. **Cải thiện có thể thêm:**
   - Check `notification_preferences.push_enabled` trước khi gửi
   - Check `quiet_hours` (không gửi trong giờ nghỉ, trừ URGENT)
   - Retry limit (max 3 lần) để tránh loop vô hạn
   - Logging/metrics cho monitoring
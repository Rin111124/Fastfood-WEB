# Hướng dẫn Test Nhận Đơn Hàng Real-time

## Vấn đề đã sửa

**Trước đây:** Khi tạo đơn COD, hệ thống chỉ assign staff nhưng KHÔNG emit Socket.IO events → Staff không nhận được thông báo

**Bây giờ:** Tất cả đơn confirmed/paid đều emit events → Staff nhận ngay lập tức

## Các thay đổi

### 1. `customer.service.js`
- Luôn gọi `prepareOrderForFulfillment()` cho mọi đơn hàng
- Đơn COD (confirmed) → emit events ngay
- Đơn online payment (pending) → bỏ qua, chờ thanh toán

### 2. `orderFulfillment.service.js`
- Thêm check: chỉ xử lý đơn "paid" hoặc "confirmed"
- Thêm logging chi tiết để debug
- Emit 2 events:
  - `order:assigned` → staff cụ thể (targeted)
  - `kds:tasks:created` → tất cả staff (broadcast)

### 3. Socket.IO logging (`io.js`)
- Log staff room size khi connect/disconnect
- Giúp kiểm tra có bao nhiêu staff đang online

## Cách Test

### Bước 1: Chuẩn bị
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Sẽ thấy logs: Socket connected, Staff room size

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Bước 2: Mở nhiều Staff Dashboard
```
Browser 1: http://localhost:5173/staff/dashboard
  - Login: staff4@example.com / password123
  - Mở DevTools Console (F12)

Browser 2 (Incognito): http://localhost:5173/staff/dashboard
  - Login: staff9@example.com / password123
  - Mở DevTools Console

Browser 3 (Chrome): http://localhost:5173/staff/dashboard
  - Login: staff10@example.com / password123
  - Mở DevTools Console
```

### Bước 3: Kiểm tra kết nối Socket
Trong console của mỗi browser, phải thấy:
```
✅ Socket connected: abc123def456
```

Trong server logs, phải thấy:
```
Socket connected { id: 'xxx', userId: 4, role: 'staff' }
📊 Staff room size: 1

Socket connected { id: 'yyy', userId: 9, role: 'staff' }
📊 Staff room size: 2

Socket connected { id: 'zzz', userId: 10, role: 'staff' }
📊 Staff room size: 3
```

### Bước 4: Tạo đơn COD
```bash
# Terminal 3 - Test script
cd backend
node test-cod-order-socket.js
```

### Bước 5: Kiểm tra kết quả

#### Server logs sẽ hiện:
```
📋 prepareOrderForFulfillment - Order #123, Status: confirmed
✅ Order #123 status changed to: preparing
👤 Assigned to staff ID: 4
📝 Created 2 station tasks
📤 Emitting "order:assigned" to staff 4: { order_id: 123, staff_id: 4, ... }
📡 Broadcasting "kds:tasks:created": { order_id: 123, station_codes: ['grill', 'fryer'], ... }
```

#### Browser của Staff được assign (ví dụ staff ID 4):
```javascript
🆕 New order assigned: {
  order_id: 123,
  staff_id: 4,
  total_amount: 150000,
  status: "preparing"
}
```
→ Hiện thông báo: "Don hang #123 moi duoc giao cho ban!"
→ Dashboard tự động reload sau 500ms

#### TẤT CẢ browsers (staff 4, 9, 10):
```javascript
🍳 New KDS tasks: {
  order_id: 123,
  station_codes: ["grill", "fryer"],
  assigned_staff_id: 4
}
```
→ Hiện thông báo: "Don hang #123 can chuan bi tai: grill, fryer"

### Bước 6: Tạo đơn qua Frontend
1. Mở trang customer: `http://localhost:5173`
2. Đăng nhập customer
3. Thêm sản phẩm vào giỏ
4. Checkout → Chọn COD
5. Xác nhận đơn hàng

→ Staff dashboard sẽ nhận thông báo ngay lập tức!

## Checklist Debug

Nếu không nhận được đơn:

### ❌ Không thấy socket connected
- Check browser console có lỗi không
- Check token có hợp lệ (logout/login lại)
- Check CORS settings

### ❌ Socket connected nhưng không thấy events
- Check server logs có emit events không
- Check browser console filter có đúng không
- Check staff ID có đúng không (assigned vs current)

### ❌ Thấy events nhưng dashboard không reload
- Check `handleOrderAssigned` logic
- Check `staffId === currentStaffId` comparison
- Check `loadStaffData` function

### ✅ Mọi thứ OK
```
1. Server logs: Socket connected → Staff room size: 3
2. Server logs: prepareOrderForFulfillment → Emitting events
3. Browser console: Socket connected → order:assigned received
4. Dashboard: Thông báo hiện → Auto reload → Đơn mới xuất hiện
```

## API Endpoints liên quan

```
POST /api/customer/orders
  - Tạo đơn hàng
  - Body: { payment_method: "cod", items: [...] }
  - Response: { order_id, status: "preparing", ... }

GET /api/staff/orders?staff_id=4
  - Lấy danh sách đơn của staff
  - Được gọi sau khi nhận event order:assigned

GET /api/staff/dashboard/:staffId
  - Lấy tổng quan dashboard
  - Được gọi khi trang load và sau khi nhận events
```

## Debugging Tools

### 1. Test Socket emit thủ công
```bash
node test-socket-emit.js
```

### 2. Kiểm tra staff on_duty
```bash
node check-all-staff.js
```

### 3. Tạo đơn COD test
```bash
node test-cod-order-socket.js
```

## Notes

- Event `order:assigned` chỉ gửi cho 1 staff cụ thể (targeted)
- Event `kds:tasks:created` gửi cho tất cả staff (broadcast)
- Staff cần giữ browser tab mở để duy trì WebSocket connection
- Mỗi tab/browser = 1 socket connection riêng
- Staff room size = số connections đang active, không phải số staff on_duty trong DB

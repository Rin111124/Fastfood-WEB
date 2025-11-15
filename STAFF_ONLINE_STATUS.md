# Hệ thống Trạng thái Nhân viên - Staff Online Status

## Hai loại trạng thái khác nhau

### 1. **Database Status** (on_duty - đang làm việc)
- Nhân viên đã check-in qua timeclock
- Được lưu trong bảng `staff_timeclock_entries`
- Có thể xem qua script: `node check-all-staff.js`

### 2. **Socket.IO Status** (online - đang kết nối)
- Nhân viên đang có tab trình duyệt mở StaffDashboard
- Có kết nối WebSocket đang hoạt động
- Được đếm qua `presence:staff-count` event

## Để nhân viên hiện "online", cần đủ:

✅ **Đăng nhập** với tài khoản staff
✅ **Mở trang StaffDashboard** trong trình duyệt
✅ **Giữ tab đang mở** (không đóng, không logout)
✅ **Token JWT hợp lệ** (có issuer field)

## Kiểm tra Socket.IO Connections

### Cách 1: Xem server logs
Sau khi khởi động server, mỗi khi staff mở StaffDashboard, sẽ thấy:
```
Socket connected { id: 'abc123', userId: 4, role: 'staff' }
📊 Staff room size: 1
```

Mỗi tab mới mở sẽ tăng số lượng lên.

### Cách 2: Kiểm tra trong Browser DevTools
1. Mở **DevTools** (F12)
2. Tab **Console**
3. Tìm dòng: `✅ Socket connected: [socket-id]`
4. Tab **Network** → tìm `websocket` connection

### Cách 3: Kiểm tra trong frontend
Mở StaffDashboard, trong console sẽ thấy:
```javascript
✅ Socket connected: abc123def456
```

## Tại sao chỉ thấy 1 staff online?

Có thể do:
1. **Chỉ có 1 trình duyệt đang mở StaffDashboard**
   - Giải pháp: Mở nhiều tab/browser với các tài khoản staff khác

2. **Token JWT thiếu issuer field**
   - Giải pháp: Logout và login lại để lấy token mới
   - Xem hướng dẫn: `FIX_CART_ERROR.md`

3. **Socket.IO connection bị lỗi**
   - Xem console browser có lỗi connect_error không
   - Kiểm tra CORS settings

## Test thử nghiệm

### Bước 1: Mở nhiều browser/tab
```bash
# Browser 1 - Staff ID 4
http://localhost:5173/staff/dashboard

# Browser 2 (Incognito) - Staff ID 9
http://localhost:5173/staff/dashboard

# Browser 3 (Chrome) - Staff ID 10
http://localhost:5173/staff/dashboard
```

### Bước 2: Đăng nhập từng tài khoản
- staff4@example.com / password123
- staff9@example.com / password123
- staff10@example.com / password123

### Bước 3: Kiểm tra server logs
Sẽ thấy:
```
Socket connected { id: 'xxx', userId: 4, role: 'staff' }
📊 Staff room size: 1

Socket connected { id: 'yyy', userId: 9, role: 'staff' }
📊 Staff room size: 2

Socket connected { id: 'zzz', userId: 10, role: 'staff' }
📊 Staff room size: 3
```

### Bước 4: Kiểm tra trong ChatWidget
Số lượng staff online sẽ hiển thị trong ChatWidget component.

## Code Flow

```
Frontend (StaffDashboard.jsx)
  ↓
useSocket({ autoConnect: true })
  ↓
Socket.IO Client connects với token
  ↓
Backend (io.js) - Auth middleware
  ↓
socket.join('staff') room
  ↓
io.emit('presence:staff-count', { count: roomSize })
  ↓
Frontend (ChatWidget.jsx) nhận event
  ↓
Hiển thị số staff online
```

## Debug Commands

```bash
# Xem staff on_duty trong database
node check-all-staff.js

# Khởi động server với logs
cd backend
npm run dev

# Khởi động frontend
cd frontend  
npm run dev
```

## Notes

- **on_duty status** = Nhân viên đã check-in (persistent trong DB)
- **online status** = Nhân viên đang có browser kết nối (real-time, tạm thời)

Một nhân viên có thể on_duty nhưng không online (đã check-in nhưng đóng browser).

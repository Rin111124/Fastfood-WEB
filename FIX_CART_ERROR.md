# ⚠️ LỖI ADD TO CART - HƯỚNG DẪN SỬA

## Nguyên nhân

Backend API hoạt động bình thường khi test trực tiếp, nhưng frontend bị lỗi 500 khi gọi API.

**Nguyên nhân:** JWT token trong session không có `issuer`, khiến backend từ chối token.

## Giải pháp

### ✅ Bước 1: Logout khỏi tài khoản hiện tại

1. Click vào icon user/profile (góc trên bên phải)
2. Click **Logout** / **Đăng xuất**

### ✅ Bước 2: Login lại

1. Vào trang login: `http://localhost:5173/login`
2. Nhập lại username và password
3. Click **Login**

### ✅ Bước 3: Test lại Add to Cart

1. Vào trang sản phẩm
2. Click "Add to Cart" trên bất kỳ sản phẩm nào
3. Cart sẽ hoạt động bình thường ✅

## Kiểm tra kỹ thuật

### Test backend trực tiếp (hoạt động tốt):

```powershell
# Tạo token mới
cd e:\NodeJS\backend
node generate-token.js

# Test GET cart
curl.exe -X GET "http://localhost:3000/api/customer/cart" -H "Authorization: Bearer <TOKEN>"

# Test POST add to cart
$token = "<TOKEN>"
Invoke-RestMethod -Uri "http://localhost:3000/api/customer/cart/items" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body (Get-Content "e:\NodeJS\backend\test-cart-payload.json" -Raw)
```

**Kết quả:** ✅ API trả về `success: true` với cart data

### Sự khác biệt:

| Thuộc tính | Token từ login cũ | Token mới (có issuer) |
|------------|-------------------|------------------------|
| `issuer` | ❌ Không có | ✅ `fatfood-api` |
| `user_id` | ❌ Chỉ có `userId` | ✅ Có cả `user_id` và `userId` |
| Backend accept | ❌ 401 Unauthorized | ✅ 200 OK |

## Lý do kỹ thuật

JWT token được verify bởi `jwt.verify()` với option `issuer: TOKEN_ISSUER`.

File: `backend/src/modules/auth/auth.service.js`
```javascript
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ensureJwtSecret(), { issuer: TOKEN_ISSUER });
  } catch (error) {
    throw new AuthError('Access token khong hop le hoac da het han', 401, 'INVALID_TOKEN');
  }
};
```

Token cũ không có `issuer` → verify failed → 401 error

## Đã fix

- ✅ Backend auth service đã có `issuer` khi tạo token
- ✅ Frontend session.js có `getToken()` helper
- ✅ useSocket hook đã import getToken đúng

## Vẫn còn lỗi?

Nếu sau khi logout/login lại vẫn lỗi:

1. **Clear browser cache:**
   - Press `Ctrl+Shift+Del`
   - Chọn "Cookies and site data"
   - Clear

2. **Clear localStorage manually:**
   - F12 → Console
   - Chạy: `localStorage.clear(); sessionStorage.clear();`
   - Reload page

3. **Kiểm tra console:**
   - F12 → Network tab
   - Tìm request POST `/api/customer/cart/items`
   - Xem Headers → Request Headers → `Authorization`
   - Token phải bắt đầu: `Bearer eyJhbGciOiJIUzI1NiIs...`

---

## Test Data

File: `backend/test-cart-payload.json`
```json
{
  "productId": 10,
  "quantity": 2
}
```

File: `backend/generate-token.js` đã được update để generate token với `issuer` đúng.

---

**TÓM TẮT:** Logout → Login lại → Hoạt động bình thường! 🎉

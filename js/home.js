// home.js - Xử lý logic cho trang chủ đơn giản và hiệu quả

// Đối tượng quản lý trang chủ
const HomeManager = {
    init: function() {
        console.log('Khởi tạo HomeManager...');
        
        // Kiểm tra phiên đăng nhập nếu cần thiết
        this.checkSession();
        
        // Thiết lập hiệu ứng cho các region card
        this.setupRegionCards();
    },
    
    checkSession: function() {
        // Kiểm tra nếu đã đăng nhập và cần chuyển hướng
        const session = localStorage.getItem('kmr_auth_session');
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                // Nếu muốn tự động chuyển hướng, bỏ comment dòng dưới
                // window.location.href = `webapp.html?team=${sessionData.teamId}&email=${encodeURIComponent(sessionData.email)}`;
            } catch (e) {
                console.warn('Lỗi đọc dữ liệu phiên:', e);
            }
        }
    },
    
    setupRegionCards: function() {
        // Thêm hiệu ứng khi hover và click vào region cards
        const regionCards = document.querySelectorAll('.region-card');
        
        regionCards.forEach(card => {
            // Tạo hiệu ứng ripple khi click
            card.addEventListener('click', function(e) {
                // Tạo hiệu ứng
                const ripple = document.createElement('div');
                ripple.className = 'ripple-effect';
                
                // Thiết lập vị trí cho hiệu ứng
                const rect = this.getBoundingClientRect();
                const posX = e.clientX - rect.left;
                const posY = e.clientY - rect.top;
                
                ripple.style.left = posX + 'px';
                ripple.style.top = posY + 'px';
                
                // Thêm vào card
                this.appendChild(ripple);
                
                // Xóa sau khi hoàn thành animation
                setTimeout(() => {
                    ripple.remove();
                }, 600);
                
                // Thêm class để hiển thị đang chọn
                regionCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                
                // Lưu region đã chọn vào localStorage để dùng sau này nếu cần
                const regionId = this.id.replace('region-', '');
                localStorage.setItem('last_selected_region', regionId);
                
                // Không cần prevent default vì đang dùng thẻ a với href
            });
        });
    }
};

// Khởi tạo khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', function() {
    HomeManager.init();
});

// Thêm sự kiện khi trang đã tải hoàn toàn để hiển thị hiệu ứng nếu cần
window.addEventListener('load', function() {
    // Ẩn indicator loading nếu có
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Thêm class để hiển thị hiệu ứng fade-in cho content
    document.querySelector('.content').classList.add('loaded');
});
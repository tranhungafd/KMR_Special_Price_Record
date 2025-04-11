// format-selection.js - Xử lý trang chọn định dạng đăng ký

const FormatSelectionManager = {
    init: function() {
        console.log('Khởi tạo FormatSelectionManager...');
        
        // Lấy tham số từ URL
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        const email = urlParams.get('email');
        
        if (!teamId || !email) {
            console.error('Thiếu thông tin team hoặc email');
            window.location.href = 'index.html';
            return;
        }
        
        // Cập nhật URL cho liên kết webapp
        const webappLink = document.getElementById('webappLink');
        if (webappLink) {
            webappLink.href = `webapp.html?team=${teamId}&email=${encodeURIComponent(email)}`;
        }
        
        // Thiết lập nút quay lại
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', this.goBack);
        }
        
        // Hiển thị thông tin người dùng nếu có
        this.displayUserInfo(email, teamId);
    },
    
    goBack: function() {
        // Lấy team_id từ URL
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        
        if (teamId) {
            // Tìm region id từ config
            let regionId = '';
            for (const region in CONFIG.REGIONS) {
                for (const team of CONFIG.REGIONS[region].teams) {
                    if (team.id === teamId) {
                        regionId = region;
                        break;
                    }
                }
                if (regionId) break;
            }
            
            if (regionId) {
                window.location.href = `region.html?region=${regionId}`;
            } else {
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    },
    
    displayUserInfo: function(email, teamId) {
        // Tìm thông tin team
        let teamName = '';
        for (const regionId in CONFIG.REGIONS) {
            const region = CONFIG.REGIONS[regionId];
            for (const team of region.teams) {
                if (team.id === teamId) {
                    teamName = team.name;
                    break;
                }
            }
            if (teamName) break;
        }
        
        // Thêm thẻ div hiển thị thông tin người dùng nếu cần
        const contentDiv = document.querySelector('.content');
        if (contentDiv) {
            const userInfoDiv = document.createElement('div');
            userInfoDiv.className = 'user-info-bar';
            userInfoDiv.innerHTML = `
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Team:</strong> ${teamName}</p>
            `;
            
            // Chèn vào đầu phần content
            contentDiv.insertBefore(userInfoDiv, contentDiv.firstChild);
        }
    }
};

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    FormatSelectionManager.init();
});
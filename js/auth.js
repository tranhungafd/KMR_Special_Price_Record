// auth.js - Xử lý logic xác thực với Google OAuth

// Quản lý xác thực
const AuthManager = {
    // Cấu hình Google OAuth
    googleConfig: {
        clientId: '252140887716-99uet6je2g4r4nouqdrom4jdp93cm9dc.apps.googleusercontent.com', // Client ID đã cập nhật
        hostedDomain: 'kamereo.vn', // Giới hạn domain đăng nhập
        autoSelect: false,
        prompt: 'select_account' // Luôn hiển thị màn hình chọn tài khoản
    },
    
    // Khởi tạo
    init: function() {
        console.log('Khởi tạo AuthManager với Google OAuth');
        console.log('URL hiện tại:', window.location.href);
        
        // Lấy thông tin từ URL
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        const region = urlParams.get('region');
        
        console.log('Thông số từ URL - Team ID:', teamId, 'Region:', region);
        
        if (!teamId) {
            console.error('Không tìm thấy tham số team trong URL');
            this.goBack();
            return;
        }
        
        // Lưu team ID vào biến toàn cục để dùng trong callback
        this.teamId = teamId;
        this.region = region;
        
        // Lấy thông tin team
        this.loadTeamInfo(teamId);
        
        // Thiết lập các sự kiện
        this.setupEventListeners();
        
        // Thêm nút debug khi chạy trên localhost
        this.addDebugButton();
        
        // Khởi tạo Google Sign-In
        this.initGoogleSignIn();
    },
    
    // Thêm nút debug khi chạy trên localhost
    addDebugButton: function() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const container = document.querySelector('.auth-body') || document.body;
            const debugBtn = document.createElement('button');
            debugBtn.textContent = 'Debug Auth (Local Dev Only)';
            debugBtn.style.marginTop = '20px';
            debugBtn.style.padding = '8px 12px';
            debugBtn.style.background = '#f8f9fa';
            debugBtn.style.border = '1px solid #ddd';
            debugBtn.style.borderRadius = '4px';
            
            debugBtn.addEventListener('click', () => {
                console.log('Forced auth bypass for development');
                // Sử dụng email test để bypass xác thực
                const testEmail = 'debug@kamereo.vn';
                this.createSession(this.teamId, testEmail);
                window.location.href = `webapp.html?team=${this.teamId}&email=${encodeURIComponent(testEmail)}`;
            });
            
            container.appendChild(debugBtn);
        }
    },
    
    // Thiết lập sự kiện
    setupEventListeners: function() {
        // Nút quay lại
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.goBack());
        }
    },
    
    // Khởi tạo Google Sign-In
    initGoogleSignIn: function() {
        // Kiểm tra nếu script Google đã được tải
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('Google API đã tải, thiết lập Google Sign-In...');
            this.setupGoogleSignIn();
        } else {
            console.log('Google API chưa tải, đang thiết lập event handler...');
            // Nếu chưa tải, đợi script load xong
            window.onGoogleLibraryLoad = () => {
                console.log('Google API đã tải xong (từ callback)');
                this.setupGoogleSignIn();
            };
            
            // Thêm script Google Sign-In nếu chưa có
            if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                console.log('Đang thêm script Google Sign-In...');
                const script = document.createElement('script');
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log('Script Google Sign-In đã tải xong');
                };
                script.onerror = (error) => {
                    console.error('Lỗi khi tải script Google Sign-In:', error);
                    this.showError('Không thể tải Google Sign-In. Vui lòng tải lại trang hoặc thử lại sau.');
                };
                document.head.appendChild(script);
            }
        }
    },
    
    // Thiết lập Google Sign-In
    setupGoogleSignIn: function() {
        try {
            console.log('Đang thiết lập Google Sign-In...');
            google.accounts.id.initialize({
                client_id: this.googleConfig.clientId,
                callback: this.handleCredentialResponse.bind(this),
                auto_select: this.googleConfig.autoSelect,
                cancel_on_tap_outside: true,
                prompt_parent_id: 'g_id_onload',
                hosted_domain: this.googleConfig.hostedDomain,
                ux_mode: 'popup',
                context: 'signin'
            });
            
            // Kiểm tra phần tử có tồn tại không
            const buttonContainer = document.getElementById('googleSignInButton');
            if (!buttonContainer) {
                console.error('Không tìm thấy phần tử có ID "googleSignInButton"');
                this.showError('Lỗi: Không tìm thấy container cho nút đăng nhập Google.');
                return;
            }
            
            // Render nút đăng nhập
            console.log('Render nút Google Sign-In...');
            google.accounts.id.renderButton(
                buttonContainer, 
                { 
                    theme: 'outline', 
                    size: 'large',
                    shape: 'rectangular',
                    text: 'signin_with',
                    logo_alignment: 'left'
                }
            );
            
            console.log('Google Sign-In đã được thiết lập thành công');
        } catch (error) {
            console.error('Lỗi khi thiết lập Google Sign-In:', error);
            this.showError(`Lỗi khi thiết lập Google Sign-In: ${error.message}`);
        }
    },
    
    // Xử lý phản hồi đăng nhập từ Google
    handleCredentialResponse: function(response) {
        console.log('Nhận được phản hồi từ Google');
        
        // Hiển thị đang xác thực
        document.getElementById('loading-message').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        
        try {
            // Giải mã JWT token để lấy thông tin người dùng
            const payload = this.parseJwt(response.credential);
            console.log("Google Auth Payload:", payload);
            
            // Lấy email từ payload
            const email = payload.email;
            console.log("Email người dùng:", email);
            console.log("Email verified:", payload.email_verified);
            
            // Kiểm tra email domain
            if (!email || !email.toLowerCase().endsWith('@kamereo.vn')) {
                console.error('Email không thuộc domain Kamereo:', email);
                this.showError('Chỉ tài khoản Kamereo (@kamereo.vn) mới được phép truy cập');
                return;
            }
            
            // Lưu thông tin người dùng
            const userInfo = {
                email: email,
                name: payload.name,
                picture: payload.picture,
                timestamp: new Date().getTime()
            };
            
            localStorage.setItem('kmr_user_info', JSON.stringify(userInfo));
            console.log('Đã lưu thông tin người dùng vào localStorage');
            
            // Xác thực quyền truy cập
            console.log('Bắt đầu xác thực quyền truy cập cho team:', this.teamId);
            this.verifyAccess(email);
        } catch (error) {
            console.error('Lỗi khi xử lý phản hồi đăng nhập từ Google:', error);
            this.showError(`Lỗi xác thực: ${error.message}`);
        }
    },
    
    // Giải mã JWT token
    parseJwt: function(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Lỗi khi giải mã JWT:', error);
            throw new Error('Không thể giải mã token đăng nhập: ' + error.message);
        }
    },
    
    // Xác thực quyền truy cập
    verifyAccess: function(email) {
        console.log('Đang xác thực quyền truy cập cho email:', email, 'và team:', this.teamId);
        
        try {
            // Kiểm tra xem email có phải admin không
            const isAdmin = CONFIG.ADMINS.includes(email);
            console.log('Là admin?', isAdmin);
            
            // Tìm team và kiểm tra quyền truy cập
            let hasAccess = false;
            let foundTeam = null;
            let emailTeam = null;
            
            // Tìm qua tất cả các khu vực và team
            for (const regionId in CONFIG.REGIONS) {
                const region = CONFIG.REGIONS[regionId];
                
                for (const team of region.teams) {
                    // Ghi nhận team đang kiểm tra
                    if (team.id === this.teamId) {
                        foundTeam = team;
                        console.log('Đã tìm thấy team:', team.name);
                    }
                    
                    // Kiểm tra xem email thuộc team nào
                    if (team.emails && team.emails.includes(email)) {
                        emailTeam = team;
                        console.log('Email thuộc team:', team.name);
                    }
                }
            }
            
            // Xử lý kết quả kiểm tra quyền
            if (isAdmin) {
                console.log('Admin có quyền truy cập tất cả team');
                hasAccess = true;
                this.successfulAuth(email);
            } else if (!foundTeam) {
                console.error('Không tìm thấy thông tin team:', this.teamId);
                this.showError('Không tìm thấy thông tin team');
            } else if (!emailTeam) {
                console.error('Email không thuộc bất kỳ team nào');
                this.showError('Bạn không thuộc team Sales nên không có quyền truy cập. Vui lòng liên hệ Admin.');
            } else if (emailTeam.id === this.teamId) {
                console.log('Email thuộc đúng team yêu cầu, cho phép truy cập');
                hasAccess = true;
                this.successfulAuth(email);
            } else {
                console.error('Email thuộc team khác:', emailTeam.name);
                this.showError(`Bạn không thuộc ${foundTeam.name}. Bạn chỉ có quyền truy cập vào ${emailTeam.name}.`);
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra quyền truy cập:', error);
            this.showError('Lỗi xác thực: ' + error.message);
        }
    },
    
    // Xử lý khi xác thực thành công
    successfulAuth: function(email) {
        console.log('Xác thực thành công, tạo phiên và chuyển hướng...');
        
        // Tạo phiên đăng nhập
        this.createSession(this.teamId, email);
        
        // Tạo URL chuyển hướng
        const redirectUrl = `webapp.html?team=${this.teamId}&email=${encodeURIComponent(email)}`;
        console.log('Chuyển hướng đến:', redirectUrl);
        
        // Chuyển hướng đến trang webapp
        window.location.href = redirectUrl;
    },
    
    // Tạo phiên làm việc với thông tin teams người dùng có quyền truy cập
    createSession: function(teamId, email) {
        console.log('Tạo phiên làm việc cho team:', teamId, 'và email:', email);
        
        // Kiểm tra xem email có phải admin không
        const isAdmin = CONFIG.ADMINS.includes(email);
        
        // Lấy tất cả các team mà user có quyền truy cập
        const userTeams = [];
        
        for (const regionId in CONFIG.REGIONS) {
            const region = CONFIG.REGIONS[regionId];
            
            for (const team of region.teams) {
                if (isAdmin || (team.emails && team.emails.includes(email))) {
                    userTeams.push({
                        id: team.id,
                        name: team.name,
                        region: regionId,
                        regionName: region.name
                    });
                }
            }
        }
        
        console.log('Người dùng có quyền truy cập vào', userTeams.length, 'team(s)');
        
        // Tạo thông tin phiên
        const session = {
            teamId: teamId,
            email: email,
            userTeams: userTeams,
            isAdmin: isAdmin,
            createdAt: new Date().getTime(),
            expiryTime: new Date(Date.now() + CONFIG.SESSION_DURATION * 60 * 60 * 1000).getTime()
        };
        
        // Lưu phiên vào localStorage
        localStorage.setItem('kmr_auth_session', JSON.stringify(session));
        
        // Lưu thêm vào sessionStorage để quản lý phiên
        sessionStorage.setItem('kmr_auth_session', JSON.stringify(session));
        
        console.log('Đã lưu phiên đăng nhập');
    },
    
    // Tải thông tin team
    loadTeamInfo: function(teamId) {
        console.log('Tải thông tin team:', teamId);
        
        // Mô phỏng tải thông tin team từ dữ liệu đã có
        let teamName = '';
        
        // Tìm team trong cấu hình
        for (const regionId in CONFIG.REGIONS) {
            const region = CONFIG.REGIONS[regionId];
            
            for (const team of region.teams) {
                if (team.id === teamId) {
                    teamName = team.name;
                    console.log('Tìm thấy team:', teamName);
                    break;
                }
            }
            
            if (teamName) break;
        }
        
        // Hiển thị thông tin
        const teamInfoElement = document.getElementById('team-info');
        if (teamInfoElement && teamName) {
            teamInfoElement.textContent = `Vui lòng đăng nhập bằng tài khoản Kamereo của bạn để truy cập: ${teamName}`;
        } else {
            console.error('Không tìm thấy phần tử team-info hoặc không tìm thấy tên team');
        }
    },
    
    // Hiển thị lỗi
    showError: function(message) {
        console.error('Hiển thị lỗi:', message);
        
        // Ẩn loading
        const loadingElement = document.getElementById('loading-message');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Hiển thị lỗi
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            console.error('Không tìm thấy phần tử có ID "error-message"');
            alert('Lỗi: ' + message);
        }
    },
    
    // Quay lại trang trước
    goBack: function() {
        console.log('Quay lại trang trước');
        
        const urlParams = new URLSearchParams(window.location.search);
        const region = urlParams.get('region');
        
        if (region) {
            console.log('Quay lại trang region với region:', region);
            window.location.href = `region.html?region=${region}`;
        } else {
            console.log('Quay lại trang chủ');
            window.location.href = 'index.html';
        }
    }
};

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM đã tải xong, khởi tạo AuthManager...');
    AuthManager.init();
});
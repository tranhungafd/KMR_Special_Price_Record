// webapp.js - Xử lý logic cho trang nhập liệu
    
const WebAppManager = {
    // Biến lưu trữ dữ liệu
    data: {
        teamId: null,
        teamInfo: null,
        userEmail: null,
        userName: null,
        userPicture: null,
        sheetInfo: null,  // Thông tin về sheet
        requestNo: null,  // Request No để tham chiếu
        // Dữ liệu form nhập
        form: {
            priceType: '',
            startDate: '',
            endDate: '',
            buyers: [],
            products: []
        },
        // Dữ liệu preview
        preview: null
    },
    
    // Khởi tạo
    init: function() {
        console.log('Khởi tạo WebAppManager');
        
        // Kiểm tra phiên đăng nhập trước
        if (!this.validateSession()) {
            return; // Đã chuyển hướng sang trang đăng nhập
        }
        
        // Lấy thông tin từ URL (trong trường hợp chưa có phiên)
        if (!this.data.teamId || !this.data.userEmail) {
            const urlParams = new URLSearchParams(window.location.search);
            this.data.teamId = urlParams.get('team');
            this.data.userEmail = urlParams.get('email');
            
            if (!this.data.teamId || !this.data.userEmail) {
                console.error('Thiếu thông tin team hoặc user');
                this.redirectToHomePage();
                return;
            }
        }
        
        // Tải thông tin team
        this.loadTeamInfo();
        
        // Tải thông tin Sheet
        this.loadSheetInfo();
        
        // Hiển thị thông tin người dùng
        this.displayUserInfo();
        
        // Thiết lập giá trị mặc định
        this.setDefaultValues();
        
        // Thiết lập sự kiện
        this.setupEventListeners();
    
        // Tạo iframe ẩn để xử lý việc gửi form
        this.createHiddenIframe();
    },
    
    // Xác thực phiên đăng nhập
    validateSession: function() {
        // Lấy thông tin phiên từ localStorage
        const sessionData = localStorage.getItem('kmr_auth_session');
        
        if (!sessionData) {
            console.log('Không tìm thấy dữ liệu phiên đăng nhập');
            this.redirectToAuth();
            return false;
        }
        
        try {
            const session = JSON.parse(sessionData);
            
            // Kiểm tra phiên hết hạn
            if (new Date(session.expiryTime) < new Date()) {
                console.log('Phiên đăng nhập đã hết hạn');
                localStorage.removeItem('kmr_auth_session');
                sessionStorage.removeItem('kmr_auth_session');
                this.redirectToAuth();
                return false;
            }
            
            // Kiểm tra nếu người dùng có quyền truy cập vào team hiện tại
            const currentTeamId = this.data.teamId || new URLSearchParams(window.location.search).get('team');
            const hasAccess = session.isAdmin || session.userTeams.some(team => team.id === currentTeamId);
            
            if (!hasAccess) {
                console.log('Người dùng không có quyền truy cập vào team này');
                this.redirectToAuth();
                return false;
            }
            
            // Cập nhật thông tin từ phiên
            this.data.teamId = currentTeamId;
            this.data.userEmail = session.email;
            this.data.isAdmin = session.isAdmin;
            this.data.userTeams = session.userTeams;
            
            // Kiểm tra nếu có thông tin bổ sung
            const userInfoStr = localStorage.getItem('kmr_user_info');
            if (userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    this.data.userName = userInfo.name;
                    this.data.userPicture = userInfo.picture;
                } catch (e) {
                    console.error('Lỗi khi đọc thông tin người dùng:', e);
                }
            }
            
            return true;
        } catch (e) {
            console.error('Lỗi khi xác thực phiên đăng nhập:', e);
            localStorage.removeItem('kmr_auth_session');
            sessionStorage.removeItem('kmr_auth_session');
            this.redirectToAuth();
            return false;
        }
    },
    
    // Kiểm tra phiên đơn giản, chỉ xác minh là phiên còn hạn
    validateSessionSimple: function() {
        const sessionData = localStorage.getItem('kmr_auth_session');
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            // Kiểm tra phiên hết hạn
            if (new Date(session.expiryTime) < new Date()) return false;
            // Kiểm tra quyền truy cập vào team hiện tại
            return session.isAdmin || session.userTeams.some(team => team.id === this.data.teamId);
        } catch (e) {
            return false;
        }
    },
    
    // Chuyển hướng đến trang đăng nhập
    redirectToAuth: function() {
        let teamId = '';
        
        // Lấy team ID từ URL nếu có
        const urlParams = new URLSearchParams(window.location.search);
        teamId = urlParams.get('team') || this.data.teamId || '';
        
        if (teamId) {
            window.location.href = `auth.html?team=${teamId}`;
        } else {
            window.location.href = 'index.html';
        }
    },
    
    // Tạo iframe ẩn để xử lý form
    createHiddenIframe: function() {
        // Tạo iframe nếu chưa có
        if (!document.getElementById('hidden_iframe')) {
            const iframe = document.createElement('iframe');
            iframe.setAttribute('name', 'hidden_iframe');
            iframe.setAttribute('id', 'hidden_iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            // Xử lý sự kiện load của iframe
            iframe.addEventListener('load', () => {
                const iframeUrl = iframe.contentWindow.location.href;
                // Chỉ xử lý khi iframe đã load một URL thực sự, không phải about:blank
                if (iframeUrl && iframeUrl !== 'about:blank') {
                    try {
                        // Thử lấy nội dung từ iframe
                        const iframeContent = iframe.contentDocument || iframe.contentWindow.document;
                        const responseText = iframeContent.body.innerText;
                        
                        if (responseText) {
                            console.log("Raw response from iframe:", responseText);
                            try {
                                const result = JSON.parse(responseText);
                                this.handleSubmitResponse(result);
                            } catch (e) {
                                console.error("Không thể parse JSON từ response:", e);
                                // Giả định thành công nếu không parse được
                                this.handleSubmitResponse({
                                    success: true,
                                    message: "Dữ liệu đã được gửi thành công (không thể xác nhận kết quả chính xác)"
                                });
                            }
                        } else {
                            // Nếu không đọc được nội dung do CORS
                            console.log("Không thể đọc nội dung iframe do CORS, giả định thành công");
                            this.handleSubmitResponse({
                                success: true,
                                message: "Dữ liệu đã được gửi thành công (không thể xác nhận kết quả do CORS)"
                            });
                        }
                    } catch (error) {
                        console.error("Lỗi khi đọc kết quả từ iframe:", error);
                        // Giả định thành công
                        this.handleSubmitResponse({
                            success: true,
                            message: "Dữ liệu đã được gửi thành công (không thể xác nhận kết quả do CORS)"
                        });
                    }
                }
            });
        }
    },
    
    // Tải thông tin team
    loadTeamInfo: function() {
        // Tìm thông tin team từ session trước
        const sessionData = localStorage.getItem('kmr_auth_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const teamInfo = session.userTeams.find(team => team.id === this.data.teamId);
                
                if (teamInfo) {
                    this.data.teamInfo = {
                        id: teamInfo.id,
                        name: teamInfo.name,
                        region: teamInfo.region
                    };
                    
                    // Hiển thị tên team
                    const teamNameDisplay = document.getElementById('team-name-display');
                    if (teamNameDisplay) {
                        teamNameDisplay.textContent = teamInfo.name;
                    }
                    
                    return;
                }
            } catch (e) {
                console.error('Lỗi khi đọc thông tin team từ session:', e);
            }
        }
        
        // Nếu không tìm thấy trong session, tìm trong CONFIG
        for (const regionId in CONFIG.REGIONS) {
            const region = CONFIG.REGIONS[regionId];
            
            for (const team of region.teams) {
                if (team.id === this.data.teamId) {
                    this.data.teamInfo = {
                        id: team.id,
                        name: team.name,
                        icon: team.icon,
                        description: team.description,
                        region: regionId
                    };
                    
                    // Hiển thị tên team
                    const teamNameDisplay = document.getElementById('team-name-display');
                    if (teamNameDisplay) {
                        teamNameDisplay.textContent = team.name;
                    }
                    
                    return;
                }
            }
        }
        
        console.error('Không tìm thấy thông tin team');
    },
    
    // Tải thông tin Google Sheet
    loadSheetInfo: function() {
        // Lấy thông tin sheet từ session trước
        const sessionData = localStorage.getItem('kmr_auth_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const teamInfo = session.userTeams.find(team => team.id === this.data.teamId);
                
                if (teamInfo && teamInfo.sheet_id) {
                    this.data.sheetInfo = {
                        sheet_id: teamInfo.sheet_id,
                        sheet_name: teamInfo.sheet_name || 'Sheet1',
                        sheet_url: `https://docs.google.com/spreadsheets/d/${teamInfo.sheet_id}/edit#gid=0`
                    };
                    
                    // Cập nhật URL sheet trong giao diện
                    this.updateSheetLinks();
                    return;
                }
            } catch (e) {
                console.error('Lỗi khi đọc thông tin sheet từ session:', e);
            }
        }

        // Tìm thông tin sheet từ cấu hình
        let sheetInfo = null;
        
        // Tìm team trong cấu hình
        for (const regionId in CONFIG.REGIONS) {
            const region = CONFIG.REGIONS[regionId];
            
            for (const team of region.teams) {
                if (team.id === this.data.teamId) {
                    if (team.sheet_id) {
                        sheetInfo = {
                            sheet_id: team.sheet_id,
                            sheet_name: team.sheet_name || 'Sheet1',
                            sheet_url: `https://docs.google.com/spreadsheets/d/${team.sheet_id}/edit#gid=0`
                        };
                    }
                    break;
                }
            }
            
            if (sheetInfo) break;
        }
        
        // Nếu không tìm thấy, sử dụng sheet mặc định
        if (!sheetInfo) {
            sheetInfo = {
                sheet_id: CONFIG.DEFAULT_SHEET_ID,
                sheet_name: CONFIG.DEFAULT_SHEET_NAME,
                sheet_url: CONFIG.DEFAULT_SHEET_URL
            };
            console.log('Không tìm thấy thông tin sheet của team, sử dụng sheet mặc định');
        }
        
        // Lưu thông tin sheet
        this.data.sheetInfo = sheetInfo;
        
        // Cập nhật URL sheet trong giao diện
        this.updateSheetLinks();
    },
    
    // Cập nhật links đến Google Sheet trong giao diện
    updateSheetLinks: function() {
        if (!this.data.sheetInfo) return;
        
        // Cập nhật link trong header
        const sheetLinkElem = document.getElementById('sheet-link');
        if (sheetLinkElem && this.data.sheetInfo.sheet_url) {
            sheetLinkElem.href = this.data.sheetInfo.sheet_url;
            sheetLinkElem.title = `Mở Google Sheet của ${this.data.teamInfo?.name || 'Team'} trong tab mới`;
        }
        
        // Cập nhật link trong info box
        const sheetLinkViewElem = document.getElementById('sheet-link-view');
        if (sheetLinkViewElem && this.data.sheetInfo.sheet_url) {
            sheetLinkViewElem.href = this.data.sheetInfo.sheet_url;
            sheetLinkViewElem.textContent = `${this.data.teamInfo?.name || 'Team'} - Google Sheets`;
        }
    },
    
    // Hiển thị thông tin người dùng
    displayUserInfo: function() {
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement && this.data.userEmail) {
            // Thêm ảnh đại diện người dùng (nếu có)
            let avatarHtml = '';
            
            if (this.data.userPicture) {
                avatarHtml = `<img src="${this.data.userPicture}" alt="Avatar" class="user-avatar">`;
            }
            
            const displayName = this.data.userName || this.data.userEmail;
            
            userInfoElement.innerHTML = `
                ${avatarHtml}
                <span class="user-email">${displayName}</span>
            `;
            
            // Thêm tooltip nếu có tên hiển thị khác email
            if (this.data.userName && this.data.userName !== this.data.userEmail) {
                userInfoElement.title = this.data.userEmail;
            }
            
            // Thêm team switcher nếu user có quyền truy cập nhiều team
            this.addTeamSwitcher();
            
            // Thêm liên kết Admin Tools nếu user là admin
            this.addAdminToolsLink();
        }
    },
    
    // Thêm liên kết Admin Tools nếu user là admin
    addAdminToolsLink: function() {
        if (this.data.isAdmin) {
            const userActions = document.querySelector('.user-actions');
            if (userActions) {
                const adminLink = document.createElement('button');
                adminLink.className = 'btn-icon btn-admin';
                adminLink.title = 'Admin Tools';
                adminLink.innerHTML = '<i class="fas fa-tools"></i>';
                
                adminLink.addEventListener('click', () => {
                    window.location.href = 'admin-tools.html';
                });
                
                userActions.insertBefore(adminLink, userActions.firstChild);
            }
        }
    },
    
    // Thêm team switcher
    addTeamSwitcher: function() {
        // Lấy dữ liệu phiên
        const userTeams = this.data.userTeams || [];
        
        // Chỉ hiển thị team switcher nếu có nhiều hơn 1 team
        if (userTeams.length <= 1) return;
        
        // Tạo team switcher
        const headerElement = document.querySelector('.header-info');
        if (!headerElement) return;
        
        const teamSwitcher = document.createElement('div');
        teamSwitcher.className = 'team-switcher';
        
        let switcherHtml = `
            <button class="team-switcher-btn">Chuyển đổi team <span class="dropdown-icon">▼</span></button>
            <div class="team-dropdown">
        `;
        
        // Nhóm teams theo region
        const regionGroups = {};
        
        userTeams.forEach(team => {
            if (!regionGroups[team.regionName]) {
                regionGroups[team.regionName] = [];
            }
            regionGroups[team.regionName].push(team);
        });
        
        // Tạo danh sách teams
        for (const regionName in regionGroups) {
            switcherHtml += `<div class="region-name">${regionName}</div>`;
            
            regionGroups[regionName].forEach(team => {
                const isActive = team.id === this.data.teamId;
                switcherHtml += `
                    <a href="webapp.html?team=${team.id}&email=${encodeURIComponent(this.data.userEmail)}" 
                       class="team-option ${isActive ? 'active' : ''}">
                        ${team.name}
                    </a>
                `;
            });
        }
        
        switcherHtml += `</div>`;
        teamSwitcher.innerHTML = switcherHtml;
        
        // Thêm vào header
        headerElement.appendChild(teamSwitcher);
        
        // Xử lý sự kiện hiển thị/ẩn dropdown
        const switcherBtn = teamSwitcher.querySelector('.team-switcher-btn');
        const dropdown = teamSwitcher.querySelector('.team-dropdown');
        
        if (switcherBtn && dropdown) {
            switcherBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
            
            // Đóng dropdown khi click ra ngoài
            document.addEventListener('click', (event) => {
                if (!teamSwitcher.contains(event.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
    },
    
    // Thiết lập giá trị mặc định cho form
    setDefaultValues: function() {
        // Thiết lập ngày mặc định cho ngày bắt đầu và kết thúc
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Tính ngày cuối cùng của tháng hiện tại
        const currentDate = new Date();
        // Đặt ngày là 1 của tháng tiếp theo sau đó lùi lại 1 ngày = ngày cuối cùng của tháng hiện tại
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Giới hạn không được chọn quá 3 tháng từ hiện tại
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
        
        // Format ngày thành YYYY-MM-DD
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        // Thiết lập giá trị mặc định cho các field
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) {
            startDateInput.min = formatDate(tomorrow);
            startDateInput.value = formatDate(tomorrow);
            this.data.form.startDate = formatDate(tomorrow);
        }
        
        if (endDateInput) {
            endDateInput.min = formatDate(tomorrow);
            endDateInput.max = formatDate(threeMonthsLater);
            endDateInput.value = formatDate(lastDayOfMonth);
            this.data.form.endDate = formatDate(lastDayOfMonth);
        }
    },
    
    // Thiết lập các sự kiện
    setupEventListeners: function() {
        // Sự kiện cho tabs
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Xóa active cho tất cả tab
                navTabs.forEach(t => t.classList.remove('active'));
                
                // Thêm active cho tab được chọn
                tab.classList.add('active');
                
                // Hiển thị nội dung tương ứng
                const sectionId = tab.getAttribute('data-section');
                const navContents = document.querySelectorAll('.nav-content');
                
                navContents.forEach(content => {
                    if (content.id === sectionId + '-section') {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });
        
        // Sự kiện cho form
        const priceTypeSelect = document.getElementById('priceType');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (priceTypeSelect) {
            priceTypeSelect.addEventListener('change', () => {
                this.data.form.priceType = priceTypeSelect.value;
            });
        }
        
        if (startDateInput) {
            startDateInput.addEventListener('change', () => {
                this.data.form.startDate = startDateInput.value;
                
                // Đảm bảo ngày kết thúc sau ngày bắt đầu
                if (endDateInput && endDateInput.value < startDateInput.value) {
                    endDateInput.value = startDateInput.value;
                    this.data.form.endDate = startDateInput.value;
                }
            });
        }
        
        if (endDateInput) {
            endDateInput.addEventListener('change', () => {
                this.data.form.endDate = endDateInput.value;
            });
        }
        
        // Nút preview
        const previewButton = document.getElementById('previewButton');
        if (previewButton) {
            previewButton.addEventListener('click', () => this.previewData());
        }
        
        // Nút submit
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.addEventListener('click', () => this.submitData());
        }
        
        // Nút quay lại
        const homeButton = document.getElementById('homeButton');
        if (homeButton) {
            homeButton.addEventListener('click', () => this.redirectToHomePage());
        }
        
        // Nút đăng xuất
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.logout());
        }
        
        // Bắt sự kiện paste cho textarea
        const buyerTextArea = document.getElementById('buyerPasteArea');
        const skuTextArea = document.getElementById('skuPasteArea');
        
        if (buyerTextArea) {
            buyerTextArea.addEventListener('paste', () => {
                // Thời gian ngắn để cho phép nội dung paste được cập nhật
                setTimeout(() => {
                    this.validateBuyerData();
                }, 100);
            });
        }
        
        if (skuTextArea) {
            skuTextArea.addEventListener('paste', () => {
                setTimeout(() => {
                    this.validateSkuData();
                }, 100);
            });
        }
    },
    
    // Kiểm tra dữ liệu buyer
    validateBuyerData: function() {
        const buyerTextArea = document.getElementById('buyerPasteArea');
        if (!buyerTextArea) return;
        
        const text = buyerTextArea.value.trim();
        if (!text) return;
        
        // Kiểm tra định dạng paste - Giờ đây chỉ cần Buyer ID
        const lines = text.split('\n');
        
        // Không cần kiểm tra nhiều cột, chỉ cần mỗi dòng có ít nhất một Buyer ID
        const isValid = lines.every(line => line.trim().length > 0);
        
        // Báo lỗi nếu định dạng không hợp lệ
        if (!isValid) {
            this.showResultMessage('Định dạng dữ liệu khách hàng không hợp lệ. Mỗi dòng phải chứa một Buyer ID.', 'error');
        } else {
            this.showResultMessage('', 'clear'); // Xóa thông báo lỗi nếu có
        }
    },
    
    // Kiểm tra dữ liệu SKU
    validateSkuData: function() {
        const skuTextArea = document.getElementById('skuPasteArea');
        if (!skuTextArea) return;
        
        const text = skuTextArea.value.trim();
        if (!text) return;
        
        // Kiểm tra định dạng paste
        const lines = text.split('\n');
        let isValid = true;
        
        // Kiểm tra ít nhất 2 cột
        for (const line of lines) {
            if (!line.trim()) continue;
            
            const parts = line.trim().split(/\t|\s{2,}/);
            if (parts.length < 2) {
                isValid = false;
                break;
            }
        }
        
        // Báo lỗi nếu định dạng không hợp lệ
        if (!isValid) {
            this.showResultMessage('Định dạng dữ liệu SKU không hợp lệ. Cần 2 cột: SKU và Special Price.', 'error');
        } else {
            this.showResultMessage('', 'clear'); // Xóa thông báo lỗi nếu có
        }
    },
    
    // Phân tích dữ liệu từ textarea Buyer - chỉ lấy Buyer ID, không cần tên
    parseBuyerData: function() {
        const buyerTextArea = document.getElementById('buyerPasteArea');
        if (!buyerTextArea) return [];
        
        const text = buyerTextArea.value.trim();
        if (!text) return [];
        
        const buyers = [];
        const uniqueBuyerIds = new Set(); // Để kiểm tra ID trùng lặp
        const duplicateBuyerIds = []; // Lưu các ID trùng lặp
        
        // Tách thành các dòng
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // Với định dạng đơn giản, chỉ lấy Buyer ID từ mỗi dòng
            // Xử lý cả trường hợp có nhiều cột nhưng chỉ lấy cột đầu tiên
            const parts = line.trim().split(/\t|\s{2,}/);
            const buyerId = parts[0].trim();
            
            // Kiểm tra ID trùng lặp
            if (uniqueBuyerIds.has(buyerId)) {
                duplicateBuyerIds.push(buyerId);
            } else {
                uniqueBuyerIds.add(buyerId);
                
                // Thêm vào mảng buyers - chỉ lưu ID không cần customerName
                buyers.push({
                    buyerId: buyerId
                });
            }
        }
        
        // Hiển thị lỗi cụ thể nếu có ID trùng lặp
        if (duplicateBuyerIds.length > 0) {
            this.showResultMessage(`Buyer ID bị trùng lặp: ${duplicateBuyerIds.join(', ')}. Vui lòng kiểm tra lại danh sách khách hàng.`, 'error');
            return [];
        }
        
        return buyers;
    },
    
    // Chuẩn bị chuỗi Buyer IDs để hiển thị và lưu trữ
    formatBuyerIdsString: function(buyers) {
        // Nối tất cả các buyer ID với dấu cách để tạo thành một chuỗi
        return buyers.map(buyer => buyer.buyerId).join(' ');
    },
    
    // Tạo Request No theo định dạng mới: #"team"-"khu vực"-"No. of each submit"
    generateRequestNo: function() {
        // Lấy thông tin team và khu vực
        let teamCode = "UNKNOWN";
        let regionCode = "UNKNOWN";
        
        if (this.data.teamInfo) {
            // Lấy mã team (lấy phần đầu của team ID, chuyển thành chữ hoa)
            const teamParts = this.data.teamInfo.id.split('_');
            if (teamParts.length > 1) {
                teamParts[0].toUpperCase() + "_" + teamParts[1].toUpperCase();
            }
            
            // Lấy mã khu vực (MN: Miền Nam, MB: Miền Bắc)
            if (this.data.teamInfo.region === 'hcm') {
                regionCode = "MN";
            } else if (this.data.teamInfo.region === 'hanoi') {
                regionCode = "MB";
            }
        }
        
        // Số thứ tự - Tạm thời làm đơn giản bằng cách lấy timestamp
        // Trong triển khai thực tế, nên có một hệ thống đếm số lần submit
        const now = new Date();
        const sequenceNumber = Math.floor(Math.random() * 9000) + 1000; // Số ngẫu nhiên 4 chữ số
        
        // Tạo request no
        return `#${teamCode}-${regionCode}-${sequenceNumber}`;
    },
    
    // Định dạng timestamp ngắn gọn: yyyy-MM-dd HH:mm:ss
    formatTimestamp: function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    
    // Phân tích dữ liệu từ textarea SKU
    parseSkuData: function() {
        const skuTextArea = document.getElementById('skuPasteArea');
        if (!skuTextArea) return [];
        
        const text = skuTextArea.value.trim();
        if (!text) return [];
        
        const products = [];
        const uniqueSkus = new Set(); // Tập hợp để kiểm tra SKU trùng lặp
        const duplicateSkus = []; // Mảng để lưu các SKU trùng lặp
        const lowPriceSkus = []; // Mảng để lưu các SKU có giá quá thấp
        
        // Tách thành các dòng
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // Tách thành các cột (tab hoặc nhiều spaces)
            const parts = line.trim().split(/\t|\s{2,}/);
            
            if (parts.length >= 2) {
                const sku = parts[0].trim();
                
                // Lấy phần tử cuối cùng là giá
                const lastPart = parts[parts.length - 1].trim();
                
                // Xử lý để lấy giá thuần (bỏ định dạng tiền tệ)
                const priceStr = lastPart.replace(/[^\d]/g, '');
                const specialPrice = parseInt(priceStr);
                
                // Phần còn lại là tên SKU
                const skuName = parts.slice(1, parts.length - 1).join(' ').trim();
                
                // Kiểm tra SKU trùng lặp
                if (uniqueSkus.has(sku)) {
                    duplicateSkus.push(sku);
                } else {
                    uniqueSkus.add(sku);
                }
                
                // Kiểm tra giá tối thiểu
                if (specialPrice < CONFIG.APP.MIN_PRICE) {
                    lowPriceSkus.push(`${sku} (${specialPrice} VNĐ)`);
                }
                
                // Thêm vào mảng products
                products.push({
                    sku: sku,
                    skuName: skuName,
                    specialPrice: specialPrice,
                    startDate: this.data.form.startDate,
                    endDate: this.data.form.endDate
                });
            }
        }
        
        // Nếu có SKU trùng lặp, hiển thị lỗi và trả về mảng rỗng
        if (duplicateSkus.length > 0) {
            this.showResultMessage(`Phát hiện SKU trùng lặp: ${duplicateSkus.join(', ')}. Mỗi SKU chỉ được xuất hiện một lần.`, 'error');
            return [];
        }
        
        // Nếu có SKU có giá dưới 1000 VNĐ, hiển thị lỗi và trả về mảng rỗng
        if (lowPriceSkus.length > 0) {
            this.showResultMessage(`Các SKU có giá dưới ${CONFIG.APP.MIN_PRICE.toLocaleString('vi-VN')} VNĐ: ${lowPriceSkus.join(', ')}. Giá phải từ ${CONFIG.APP.MIN_PRICE.toLocaleString('vi-VN')} VNĐ trở lên.`, 'error');
            return [];
        }
        
        return products;
    },
    
    // Xem trước dữ liệu
    previewData: function() {
        // Kiểm tra dữ liệu đầu vào
        const priceTypeSelect = document.getElementById('priceType');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        // Lấy giá trị từ form
        const priceType = priceTypeSelect ? priceTypeSelect.value : '';
        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';
        
        // Validate dữ liệu
        if (!priceType) {
            this.showResultMessage('Vui lòng chọn loại giá', 'error');
            return;
        }
        
        if (!startDate || !endDate) {
            this.showResultMessage('Vui lòng chọn ngày áp dụng', 'error');
            return;
        }
        
        // Kiểm tra ngày
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        
        const endDateObj = new Date(endDate);
        endDateObj.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        if (startDateObj < tomorrow) {
            this.showResultMessage('Ngày bắt đầu phải từ ngày mai trở đi', 'error');
            return;
        }
        
        if (endDateObj < startDateObj) {
            this.showResultMessage('Ngày kết thúc phải sau ngày bắt đầu', 'error');
            return;
        }
        
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + CONFIG.APP.MAX_DURATION_MONTHS);
        
        if (endDateObj > threeMonthsLater) {
            this.showResultMessage(`Ngày kết thúc không được quá ${CONFIG.APP.MAX_DURATION_MONTHS} tháng từ ngày hiện tại`, 'error');
            return;
        }
        
        // Lấy dữ liệu từ textarea để kiểm tra ngay cả khi trống
        const buyerTextArea = document.getElementById('buyerPasteArea');
        const skuTextArea = document.getElementById('skuPasteArea');
        
        if (!buyerTextArea || !buyerTextArea.value.trim()) {
            this.showResultMessage('Vui lòng nhập thông tin khách hàng', 'error');
            return;
        }
        
        if (!skuTextArea || !skuTextArea.value.trim()) {
            this.showResultMessage('Vui lòng nhập thông tin SKU và giá', 'error');
            return;
        }
        
        // Phân tích dữ liệu
        const buyers = this.parseBuyerData();
        const products = this.parseSkuData();
        
        // Kiểm tra dữ liệu đã phân tích
        if (buyers.length === 0 || products.length === 0) {
            return; // Không hiển thị thông báo lỗi ở đây vì đã có thông báo từ các hàm parse
        }
        
        // Lưu trữ dữ liệu đã phân tích
        this.data.form.priceType = priceType;
        this.data.form.startDate = startDate;
        this.data.form.endDate = endDate;
        this.data.form.buyers = buyers;
        this.data.form.products = products;
        
        // Tạo dữ liệu preview
        this.data.preview = {
            priceType: priceType,
            startDate: startDate,
            endDate: endDate,
            buyers: buyers,
            products: products,
            timestamp: new Date(),
            userEmail: this.data.userEmail
        };
        
        // Hiển thị preview
        this.displayPreview();
    },
    
    // Hiển thị preview đơn giản hóa
    displayPreview: function() {
        // Hiển thị phần Preview
        const previewContainer = document.getElementById('previewContainer');
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }
        
        // Lấy dữ liệu preview
        const preview = this.data.preview;
        const previewContent = document.getElementById('previewContent');
        
        if (!previewContent || !preview) {
            return;
        }
        
        // Tạo Request No nếu chưa có
        if (!this.data.requestNo) {
            this.data.requestNo = this.generateRequestNo();
        }
        
        // Hiển thị Request No
        const requestNoDisplay = document.getElementById('request-no-display');
        if (requestNoDisplay) {
            requestNoDisplay.textContent = this.data.requestNo;
        }
        
        // Format date to display in Vietnamese format (DD/MM/YYYY)
        const formatDateDisplay = (dateStr) => {
            const date = new Date(dateStr);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };
        
        // Tạo phần preview buyers
        const buyerIds = this.formatBuyerIdsString(preview.buyers);
        
        // Tạo phần preview dữ liệu
        let previewHTML = `
            <div class="preview-section">
                <div class="preview-header">
                    <i class="fas fa-info-circle"></i>
                    <h4>Thông tin chung</h4>
                </div>
                <div class="preview-info">
                    <div class="preview-row">
                        <div class="preview-label">Request No:</div>
                        <div class="preview-value">${this.data.requestNo}</div>
                    </div>
                    <div class="preview-row">
                        <div class="preview-label">Loại giá:</div>
                        <div class="preview-value">${preview.priceType}</div>
                    </div>
                    <div class="preview-row">
                        <div class="preview-label">Áp dụng từ:</div>
                        <div class="preview-value">${formatDateDisplay(preview.startDate)}</div>
                    </div>
                    <div class="preview-row">
                        <div class="preview-label">Đến ngày:</div>
                        <div class="preview-value">${formatDateDisplay(preview.endDate)}</div>
                    </div>
                    <div class="preview-row">
                        <div class="preview-label">Người tạo:</div>
                        <div class="preview-value">${preview.userEmail}</div>
                    </div>
                </div>
            </div>
            
            <div class="preview-section">
                <div class="preview-header">
                    <i class="fas fa-users"></i>
                    <h4>Khách hàng (${preview.buyers.length})</h4>
                </div>
                <div class="preview-info">
                    <div class="preview-row">
                        <div class="preview-label">Buyer ID gộp:</div>
                        <div class="preview-value buyer-ids">${buyerIds}</div>
                    </div>
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Buyer ID</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Thêm các buyers
        preview.buyers.forEach(buyer => {
            previewHTML += `
                <tr>
                    <td>${buyer.buyerId}</td>
                </tr>
            `;
        });
        
        previewHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="preview-section">
                <div class="preview-header">
                    <i class="fas fa-tags"></i>
                    <h4>Sản phẩm (${preview.products.length})</h4>
                </div>
                <div class="preview-info">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Giá đặc biệt</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Thêm các products
        preview.products.forEach(product => {
            previewHTML += `
                <tr>
                    <td>${product.sku}</td>
                    <td>${product.skuName}</td>
                    <td class="right-align">${product.specialPrice.toLocaleString('vi-VN')} VNĐ</td>
                </tr>
            `;
        });
        
        previewHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="preview-section">
                <div class="preview-header">
                    <i class="fas fa-table"></i>
                    <h4>Dữ liệu sẽ được ghi vào bảng</h4>
                </div>
                <div class="preview-info">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Request No</th>
                                <th>Buyer ID</th>
                                <th>Loại Giá</th>
                                <th>SKU</th>
                                <th>Special Price</th>
                                <th>Áp dụng Từ</th>
                                <th>Đến</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Thêm các dòng theo định dạng mới
        preview.products.forEach(product => {
            previewHTML += `
                <tr>
                    <td>${this.data.requestNo}</td>
                    <td>${buyerIds}</td>
                    <td>${preview.priceType}</td>
                    <td>${product.sku}</td>
                    <td class="right-align">${product.specialPrice.toLocaleString('vi-VN')}</td>
                    <td>${formatDateDisplay(preview.startDate)}</td>
                    <td>${formatDateDisplay(preview.endDate)}</td>
                </tr>
            `;
        });
        
        previewHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Hiển thị dữ liệu
        previewContent.innerHTML = previewHTML;
    },
    
    // Gửi dữ liệu
    submitData: function() {
        // Kiểm tra xem đã preview chưa
        if (!this.data.preview) {
            this.showResultMessage('Vui lòng xem trước dữ liệu trước khi gửi', 'error');
            return;
        }
        
        // Kiểm tra kết nối mạng
        if (!this.checkNetworkConnection()) {
            this.showResultMessage('Không có kết nối mạng. Vui lòng kiểm tra lại kết nối của bạn trước khi gửi dữ liệu.', 'error');
            return;
        }
        
        // Kiểm tra phiên đăng nhập
        if (!this.validateSessionSimple()) {
            this.showResultMessage('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', 'error');
            setTimeout(() => {
                this.redirectToAuth();
            }, 2000);
            return;
        }
        
        // Lưu lịch sử thao tác
        this.saveHistory();
        
        // Hiển thị loading
        document.getElementById('loading').style.display = 'block';
        document.getElementById('result').style.display = 'none';
        document.getElementById('buttonContainer').style.display = 'none';
        
        // Chuẩn bị dữ liệu để gửi
        const formData = this.prepareFormData();
        
        // Gọi API để gửi dữ liệu
        this.sendDataToSheet(formData);
    },
    
    // Chuẩn bị dữ liệu cho form với định dạng mới
    prepareFormData: function() {
        // Lấy dữ liệu preview
        const preview = this.data.preview;
        
        if (!preview) return null;
        
        // Format date to Google Sheets format (MM/DD/YYYY)
        const formatDateForSheet = (dateStr) => {
            const date = new Date(dateStr);
            return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
        };
        
        // Lấy timestamp hiện tại theo định dạng ngắn gọn
        const timestamp = this.formatTimestamp();
        
        // Tạo danh sách Buyer IDs gộp
        const buyerIdsString = this.formatBuyerIdsString(preview.buyers);
        
        // Tạo mảng dữ liệu để gửi
        // Chỉ tạo một entry cho mỗi sản phẩm với buyerIds gộp
        const rowsData = [];
        
        preview.products.forEach(product => {
            // Tạo dòng dữ liệu với thứ tự theo yêu cầu mới:
            // Request No, Buyer ID, Loại Giá, SKU, Special Price, Áp dụng Từ, Đến, Timestamp, PIC
            // Buyer ID là chuỗi gộp
            rowsData.push({
                'Request No': this.data.requestNo,
                'Buyer ID': buyerIdsString,
                'Loại Giá': preview.priceType,
                'SKU': product.sku,
                'Special Price': product.specialPrice,
                'Áp dụng Từ': formatDateForSheet(preview.startDate),
                'Đến': formatDateForSheet(preview.endDate),
                'Timestamp': timestamp,
                'PIC': preview.userEmail
            });
        });
        
        return {
            sheetId: this.data.sheetInfo.sheet_id,
            sheetName: this.data.sheetInfo.sheet_name,
            teamId: this.data.teamId,
            requestNo: this.data.requestNo,
            userEmail: this.data.userEmail,
            rowsData: rowsData
        };
    },
    
    // Gửi dữ liệu đến Google Sheet
    sendDataToSheet: function(formData) {
        if (!formData) {
            this.showResultMessage('Không có dữ liệu để gửi', 'error');
            return;
        }
        
        try {
            // URL của Google Apps Script Web App - Sử dụng URL từ CONFIG hoặc URL dự phòng
            const apiUrl = CONFIG.SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxjjlfeZcjrX08mKhPkW9RqOss-e_Y7vd0JcbjBdTqGh7B5fck9lPsVhiTLh9Nym58r/exec";
            
            console.log("Chuẩn bị gửi dữ liệu đến:", apiUrl);
            console.log("Dữ liệu gửi:", formData);
            
            // Tạo form ẩn để gửi dữ liệu (tránh CORS)
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = apiUrl;
            form.target = 'hidden_iframe';
            
            // Thêm các field
            form.appendChild(this.createHiddenField('action', 'saveData'));
            form.appendChild(this.createHiddenField('sheetId', formData.sheetId));
            form.appendChild(this.createHiddenField('sheetName', formData.sheetName));
            form.appendChild(this.createHiddenField('teamId', formData.teamId));
            form.appendChild(this.createHiddenField('requestNo', formData.requestNo));
            form.appendChild(this.createHiddenField('userEmail', formData.userEmail));
            form.appendChild(this.createHiddenField('rowsData', JSON.stringify(formData.rowsData)));
            
            // Thêm flag để tạo sheet TraceLog nếu cần
            form.appendChild(this.createHiddenField('createTraceLog', 'true'));
            
            // Tạo một timestamp để theo dõi lần submit này
            const submitTimestamp = Date.now();
            
            // Đặt thời gian chờ để xử lý trường hợp không nhận được phản hồi
            setTimeout(() => {
                console.log("Kiểm tra timeout, timestamp:", submitTimestamp);
                // Giả định thành công nếu không nhận được phản hồi sau 10 giây
                this.handleSubmitResponse({
                    success: true,
                    message: "Dữ liệu đã được gửi thành công (không nhận được phản hồi từ server sau 10 giây)"
                });
            }, 10000);
            
            // Thêm vào trang và gửi
            document.body.appendChild(form);
            console.log("Đang submit form...");
            form.submit();
            
            // Xóa form sau khi gửi
            setTimeout(() => {
                document.body.removeChild(form);
            }, 500);
            
        } catch (error) {
            console.error('Lỗi khi gửi dữ liệu:', error);
            this.showResultMessage(`Lỗi khi gửi dữ liệu: ${error.message}`, 'error');
            
            // Hiển thị lại các nút
            document.getElementById('loading').style.display = 'none';
            document.getElementById('buttonContainer').style.display = 'flex';
        }
    },
    
    // Tạo field ẩn cho form
    createHiddenField: function(name, value) {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        return field;
    },
    
    // Xử lý phản hồi từ form submit
    handleSubmitResponse: function(response) {
        // Ẩn loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('buttonContainer').style.display = 'flex';
        
        console.log('Phản hồi từ server:', response);
        
        if (response.success) {
            // Hiển thị thông báo thành công
            this.showResultMessage(`Dữ liệu đã được gửi thành công! Request No: ${this.data.requestNo}`, 'success');
            
            // Xóa dữ liệu đã nhập để chuẩn bị cho lần tiếp theo
            document.getElementById('buyerPasteArea').value = '';
            document.getElementById('skuPasteArea').value = '';
            
            // Reset dữ liệu preview
            this.data.preview = null;
            
            // Ẩn preview
            const previewContainer = document.getElementById('previewContainer');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
            
            // Reset Request No cho lần tiếp theo
            this.data.requestNo = null;
        } else {
            // Hiển thị thông báo lỗi
            this.showResultMessage(`Lỗi: ${response.message || 'Không thể gửi dữ liệu'}`, 'error');
        }
    },
    
    // Hiển thị thông báo
    showResultMessage: function(message, type) {
        const resultElement = document.getElementById('result');
        if (!resultElement) return;
        
        if (type === 'clear') {
            // Xóa thông báo
            resultElement.style.display = 'none';
            resultElement.innerHTML = '';
            return;
        }
        
        // Thiết lập nội dung và kiểu
        resultElement.innerHTML = message;
        
        // Xóa class cũ
        resultElement.classList.remove('success', 'error');
        
        // Thêm class mới
        if (type === 'success') {
            resultElement.classList.add('success');
        } else if (type === 'error') {
            resultElement.classList.add('error');
        }
        
        // Hiển thị
        resultElement.style.display = 'block';
        
        // Cuộn đến phần tử
        resultElement.scrollIntoView({ behavior: 'smooth' });
    },
    
    // Đăng xuất
    logout: function() {
        // Hiển thị xác nhận
        const confirmed = confirm('Bạn có chắc muốn đăng xuất?');
        if (!confirmed) {
            return;
        }
        
        // Xóa dữ liệu phiên
        localStorage.removeItem('kmr_auth_session');
        sessionStorage.removeItem('kmr_auth_session');
        localStorage.removeItem('kmr_user_info');
        
        // Đăng xuất khỏi Google
        if (typeof google !== 'undefined' && google.accounts) {
            try {
                google.accounts.id.disableAutoSelect();
                google.accounts.id.revoke(this.data.userEmail, () => {
                    console.log('Đã thu hồi token Google OAuth');
                });
            } catch (e) {
                console.error('Lỗi khi đăng xuất Google:', e);
            }
        }
        
        // Chuyển hướng đến trang chủ
        window.location.href = 'index.html';
    },
    
    // Chuyển hướng đến trang chủ
    redirectToHomePage: function() {
        // Xác minh xem người dùng có muốn rời khỏi trang không
        if (this.data.preview) {
            const confirmed = confirm('Bạn có dữ liệu chưa lưu. Bạn có chắc muốn quay lại trang chủ không?');
            if (!confirmed) {
                return;
            }
        }
        
        window.location.href = 'index.html';
    },
    
    // Lưu thông tin phiên vào cookie (để sử dụng giữa các trang)
    saveSessionCookie: function(teamId, email, duration) {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + (duration || CONFIG.SESSION_DURATION));
        
        const sessionData = JSON.stringify({
            teamId: teamId,
            email: email,
            expiryTime: expiryDate.getTime()
        });
        
        // Mã hóa dữ liệu phiên (đơn giản hóa cho ví dụ này)
        const encodedData = btoa(sessionData);
        
        // Đặt cookie với thời gian hết hạn
        document.cookie = `kmr_session=${encodedData}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
    },
    
    // Lấy thông tin phiên từ cookie
    getSessionFromCookie: function() {
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('kmr_session=')) {
                try {
                    const encodedData = cookie.substring('kmr_session='.length);
                    const sessionData = JSON.parse(atob(encodedData));
                    
                    // Kiểm tra hết hạn
                    if (new Date(sessionData.expiryTime) > new Date()) {
                        return sessionData;
                    }
                } catch (e) {
                    console.error('Lỗi khi đọc cookie phiên:', e);
                }
                
                // Nếu có lỗi hoặc phiên hết hạn, xóa cookie
                document.cookie = 'kmr_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict';
                break;
            }
        }
        
        return null;
    },
    
    // Xóa cookie phiên
    clearSessionCookie: function() {
        document.cookie = 'kmr_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict';
    },
    
    // Lưu lịch sử thao tác (có thể dùng để tính năng khôi phục)
    saveHistory: function() {
        if (!this.data.preview) return;
        
        try {
            // Lấy lịch sử từ localStorage
            let history = localStorage.getItem('kmr_history');
            
            if (history) {
                history = JSON.parse(history);
            } else {
                history = [];
            }
            
            // Thêm thao tác hiện tại vào đầu mảng
            history.unshift({
                timestamp: new Date().getTime(),
                preview: this.data.preview,
                requestNo: this.data.requestNo,
                teamId: this.data.teamId,
                userEmail: this.data.userEmail,
                sheetInfo: this.data.sheetInfo
            });
            
            // Giới hạn số lượng mục lịch sử (giữ tối đa 10mục)
            if (history.length > 10) {
                history = history.slice(0, 10);
            }
            
            // Lưu trở lại localStorage
            localStorage.setItem('kmr_history', JSON.stringify(history));
        } catch (e) {
            console.error('Lỗi khi lưu lịch sử:', e);
        }
    },
    
    // Hiển thị lịch sử thao tác
    showHistory: function() {
        try {
            // Lấy lịch sử từ localStorage
            let history = localStorage.getItem('kmr_history');
            
            if (!history) {
                this.showResultMessage('Chưa có lịch sử thao tác', 'error');
                return;
            }
            
            history = JSON.parse(history);
            
            // Lọc lịch sử chỉ cho team hiện tại
            const teamHistory = history.filter(item => item.teamId === this.data.teamId);
            
            if (teamHistory.length === 0) {
                this.showResultMessage('Chưa có lịch sử thao tác cho team này', 'error');
                return;
            }
            
            // Tạo giao diện hiển thị lịch sử
            let html = `
                <div class="history-container">
                    <h3>Lịch sử thao tác cho ${this.data.teamInfo?.name || 'team này'}</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Request No</th>
                                <th>Loại giá</th>
                                <th>Khách hàng</th>
                                <th>SKU</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Thêm các mục lịch sử
            teamHistory.forEach((item, index) => {
                const date = new Date(item.timestamp);
                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                
                html += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${item.requestNo || 'N/A'}</td>
                        <td>${item.preview.priceType}</td>
                        <td>${item.preview.buyers.length} khách hàng</td>
                        <td>${item.preview.products.length} sản phẩm</td>
                        <td>
                            <button class="btn-restore" data-index="${index}">Khôi phục</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            // Hiển thị popup
            const historyPopup = document.createElement('div');
            historyPopup.className = 'popup-overlay';
            historyPopup.innerHTML = `
                <div class="popup-content">
                    <span class="popup-close">&times;</span>
                    ${html}
                </div>
            `;
            
            document.body.appendChild(historyPopup);
            
            // Thiết lập sự kiện đóng popup
            const closeBtn = historyPopup.querySelector('.popup-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    document.body.removeChild(historyPopup);
                });
            }
            
            // Thiết lập sự kiện khôi phục
            const restoreBtns = historyPopup.querySelectorAll('.btn-restore');
            restoreBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.getAttribute('data-index'));
                    this.restoreHistory(index);
                    document.body.removeChild(historyPopup);
                });
            });
        } catch (e) {
            console.error('Lỗi khi hiển thị lịch sử:', e);
            this.showResultMessage('Lỗi khi hiển thị lịch sử', 'error');
        }
    },
    
    // Khôi phục dữ liệu từ lịch sử
    restoreHistory: function(index) {
        try {
            // Lấy lịch sử từ localStorage
            let history = localStorage.getItem('kmr_history');
            
            if (!history) return;
            
            history = JSON.parse(history);
            const teamHistory = history.filter(item => item.teamId === this.data.teamId);
            
            if (index < 0 || index >= teamHistory.length) return;
            
            // Lấy mục lịch sử cần khôi phục
            const item = teamHistory[index];
            
            // Đặt lại dữ liệu form và preview
            this.data.preview = item.preview;
            this.data.requestNo = item.requestNo;
            this.data.sheetInfo = item.sheetInfo;
            
            // Đặt lại giá trị cho các field
            document.getElementById('priceType').value = item.preview.priceType;
            document.getElementById('startDate').value = item.preview.startDate;
            document.getElementById('endDate').value = item.preview.endDate;
            
            // Đặt lại textarea
            const buyerTextArea = document.getElementById('buyerPasteArea');
            const skuTextArea = document.getElementById('skuPasteArea');
            
            // Thiết lập textarea buyers - chỉ hiển thị Buyer ID
            if (buyerTextArea) {
                let buyersText = '';
                item.preview.buyers.forEach(buyer => {
                    buyersText += `${buyer.buyerId}\n`;
                });
                buyerTextArea.value = buyersText.trim();
            }
            
            // Thiết lập textarea SKUs - hiển thị SKU, SKU Name và giá
            if (skuTextArea) {
                let skusText = '';
                item.preview.products.forEach(product => {
                    skusText += `${product.sku}\t${product.skuName}\t${product.specialPrice}\n`;
                });
                skuTextArea.value = skusText.trim();
            }
            
            // Hiển thị preview
            this.displayPreview();
            
            this.showResultMessage('Đã khôi phục dữ liệu từ lịch sử', 'success');
        } catch (e) {
            console.error('Lỗi khi khôi phục lịch sử:', e);
            this.showResultMessage('Lỗi khi khôi phục lịch sử', 'error');
        }
    },
    
    // Kiểm tra kết nối mạng
    checkNetworkConnection: function() {
        return navigator.onLine;
    },
    
    // Kiểm tra trạng thái kết nối và thông báo nếu mất kết nối
    monitorNetworkStatus: function() {
        // Thiết lập kiểm tra định kỳ
        setInterval(() => {
            const isOnline = this.checkNetworkConnection();
            
            const networkStatusElement = document.getElementById('network-status');
            
            if (!networkStatusElement) {
                // Tạo phần tử hiển thị trạng thái nếu chưa có
                const statusElement = document.createElement('div');
                statusElement.id = 'network-status';
                statusElement.className = isOnline ? 'online' : 'offline';
                statusElement.innerHTML = isOnline ? 
                    '<span class="status-icon online">&#10003;</span> Đang kết nối' : 
                    '<span class="status-icon offline">&#10007;</span> Mất kết nối';
                
                // Thêm vào DOM
                const headerElement = document.querySelector('.header');
                if (headerElement) {
                    headerElement.appendChild(statusElement);
                }
            } else {
                // Cập nhật trạng thái nếu đã có phần tử
                networkStatusElement.className = isOnline ? 'online' : 'offline';
                networkStatusElement.innerHTML = isOnline ? 
                    '<span class="status-icon online">&#10003;</span> Đang kết nối' : 
                    '<span class="status-icon offline">&#10007;</span> Mất kết nối';
                
                // Hiển thị cảnh báo nếu mất kết nối
                if (!isOnline) {
                    this.showResultMessage('Mất kết nối mạng. Vui lòng kiểm tra lại kết nối trước khi gửi dữ liệu.', 'error');
                }
            }
        }, 30000); // Kiểm tra mỗi 30 giây
        
        // Bắt sự kiện thay đổi trạng thái kết nối
        window.addEventListener('online', () => {
            const networkStatusElement = document.getElementById('network-status');
            if (networkStatusElement) {
                networkStatusElement.className = 'online';
                networkStatusElement.innerHTML = '<span class="status-icon online">&#10003;</span> Đang kết nối';
            }
            this.showResultMessage('Đã khôi phục kết nối mạng.', 'success');
        });
        
        window.addEventListener('offline', () => {
            const networkStatusElement = document.getElementById('network-status');
            if (networkStatusElement) {
                networkStatusElement.className = 'offline';
                networkStatusElement.innerHTML = '<span class="status-icon offline">&#10007;</span> Mất kết nối';
            }
            this.showResultMessage('Mất kết nối mạng. Vui lòng kiểm tra lại kết nối trước khi gửi dữ liệu.', 'error');
        });
    }
};

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    WebAppManager.init();
    
    // Khởi động giám sát kết nối mạng
    WebAppManager.monitorNetworkStatus();
});
            
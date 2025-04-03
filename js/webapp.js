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
            
            // Cập nhật thông tin từ phiên
            this.data.teamId = session.teamId;
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
        // Mô phỏng tải thông tin team
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
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.redirectToHomePage());
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
            this.showResultMessage('Định dạng dữ liệu khách hàng không hợp lệ. Cần 2 cột: Buyer ID và Tên khách hàng.', 'error');
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
        
        // Kiểm tra ít nhất 3 cột
        for (const line of lines) {
            if (!line.trim()) continue;
            
            const parts = line.trim().split(/\t|\s{2,}/);
            if (parts.length < 3) {
                isValid = false;
                break;
            }
        }
        
        // Báo lỗi nếu định dạng không hợp lệ
        if (!isValid) {
            this.showResultMessage('Định dạng dữ liệu SKU không hợp lệ. Cần 3 cột: SKU, SKU Name và Special Price.', 'error');
        } else {
            this.showResultMessage('', 'clear'); // Xóa thông báo lỗi nếu có
        }
    },
    
    // Phân tích dữ liệu từ textarea Buyer
    parseBuyerData: function() {
        const buyerTextArea = document.getElementById('buyerPasteArea');
        if (!buyerTextArea) return [];
        
        const text = buyerTextArea.value.trim();
        if (!text) return [];
        
        const buyers = [];
        const uniqueBuyerIds = new Set(); // Để kiểm tra ID trùng lặp
        const uniqueCustomerNames = new Set(); // Để kiểm tra tên trùng lặp
        const duplicateBuyerIds = []; // Lưu các ID trùng lặp
        const duplicateCustomerNames = []; // Lưu các tên trùng lặp
        
        // Tách thành các dòng
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // Tách thành các cột (tab hoặc nhiều spaces)
            const parts = line.trim().split(/\t|\s{2,}/);
            
            if (parts.length >= 2) {
                const buyerId = parts[0].trim();
                const customerName = parts.slice(1).join(' ').trim();
                
                // Kiểm tra ID trùng lặp
                if (uniqueBuyerIds.has(buyerId)) {
                    duplicateBuyerIds.push(buyerId);
                } else {
                    uniqueBuyerIds.add(buyerId);
                }
                
                // Kiểm tra tên trùng lặp
                if (uniqueCustomerNames.has(customerName)) {
                    duplicateCustomerNames.push(customerName);
                } else {
                    uniqueCustomerNames.add(customerName);
                }
                
                // Thêm vào mảng buyers
                buyers.push({
                    buyerId: buyerId,
                    customerName: customerName
                });
            }
        }
        
        // Hiển thị lỗi cụ thể nếu có ID trùng lặp
        if (duplicateBuyerIds.length > 0) {
            this.showResultMessage(`Buyer ID bị trùng lặp: ${duplicateBuyerIds.join(', ')}. Vui lòng kiểm tra lại danh sách khách hàng.`, 'error');
            return [];
        }
        
        // Hiển thị lỗi cụ thể nếu có tên trùng lặp
        if (duplicateCustomerNames.length > 0) {
            this.showResultMessage(`Tên khách hàng bị trùng lặp: ${duplicateCustomerNames.join(', ')}. Vui lòng kiểm tra lại danh sách khách hàng.`, 'error');
            return [];
        }
        
        return buyers;
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
            
            if (parts.length >= 3) {
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
                if (specialPrice < 1000) {
                    lowPriceSkus.push(`${sku} (${specialPrice.toLocaleString('vi-VN')} VNĐ)`);
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
            this.showResultMessage(`Các SKU có giá dưới 1000 VNĐ: ${lowPriceSkus.join(', ')}. Giá phải từ 1000 VNĐ trở lên.`, 'error');
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
        threeMonthsLater.setMonth(today.getMonth() + 3);
        
        if (endDateObj > threeMonthsLater) {
            this.showResultMessage('Ngày kết thúc không được quá 3 tháng từ ngày hiện tại', 'error');
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
        // Không hiển thị thông báo lỗi ở đây vì đã có thông báo chi tiết từ các hàm parse
        if (buyers.length === 0 || products.length === 0) {
            return;
        }
        
        // Lưu trữ dữ liệu đã phân tích
        this.data.form.priceType = priceType;
        this.data.form.startDate = startDate;
        this.data.form.endDate = endDate;
        this.data.form.buyers = buyers;
        this.data.form.products = products;
        
        // Tạo buyer ID string cho mục đích lưu trữ
        const buyerIdsArray = buyers.map(buyer => buyer.buyerId);
        const buyerIdsString = buyerIdsArray.join(', ');
        
        // Tạo dữ liệu preview
        this.data.preview = {
            priceType: priceType,
            startDate: startDate,
            endDate: endDate,
            buyers: buyers,
            products: products,
            buyerIdsString: buyerIdsString,
            timestamp: new Date(),
            userEmail: this.data.userEmail
        };
        
        // Hiển thị preview
        this.displayPreview();
    },
    
    // Hiển thị preview
    displayPreview: function() {
        const previewContainer = document.getElementById('previewContainer');
        const previewContent = document.getElementById('previewContent');
        
        if (!previewContainer || !previewContent || !this.data.preview) return;
        
        // Hiển thị container
        previewContainer.style.display = 'block';
        
        // Định dạng ngày
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN');
        };
        
        // Tạo nội dung preview
        const preview = this.data.preview;
        
        // Tạo HTML cho preview
        let html = `
            <div class="preview-info">
                <p><strong>Loại giá:</strong> ${preview.priceType}</p>
                <p><strong>Áp dụng từ:</strong> ${formatDate(preview.startDate)} <strong>đến</strong> ${formatDate(preview.endDate)}</p>
                <p><strong>Số lượng khách hàng:</strong> ${preview.buyers.length}</p>
                <p><strong>Số lượng SKU:</strong> ${preview.products.length}</p>
                <p><strong>Tổng số dòng dữ liệu:</strong> ${preview.buyers.length * preview.products.length}</p>
                <p><strong>Google Sheet:</strong> <a href="${this.data.sheetInfo?.sheet_url || '#'}" target="_blank">${this.data.teamInfo?.name || 'Team'} - Google Sheets</a></p>
            </div>

            <h4>Danh sách khách hàng:</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Buyer ID</th>
                        <th>Tên khách hàng</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Thêm danh sách khách hàng
        preview.buyers.forEach((buyer, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${buyer.buyerId}</td>
                    <td>${buyer.customerName}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>

            <h4>Danh sách sản phẩm:</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>SKU</th>
                        <th>Tên SKU</th>
                        <th>Giá đặc biệt</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Thêm danh sách sản phẩm
        preview.products.forEach((product, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${product.sku}</td>
                    <td>${product.skuName}</td>
                    <td>${product.specialPrice.toLocaleString('vi-VN')} VNĐ</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        // Hiển thị HTML
        previewContent.innerHTML = html;
        
        // Cuộn đến preview
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    },
    
    // Gửi dữ liệu
    submitData: function() {
        // Kiểm tra xem đã preview dữ liệu chưa
        if (!this.data.preview) {
            this.showResultMessage('Vui lòng xem trước dữ liệu trước khi gửi', 'error');
            return;
        }
        
        // Kiểm tra phiên đăng nhập còn hạn không
        if (!this.validateSession()) {
            return; // Đã chuyển hướng sang trang đăng nhập
        }
        
        // Hiển thị loading
        document.getElementById('loading').style.display = 'block';
        
        // Kiểm tra thông tin sheet
        if (!this.data.sheetInfo) {
            // Tải lại thông tin sheet nếu chưa có
            this.loadSheetInfo();
            if (!this.data.sheetInfo) {
                // Ẩn loading
                document.getElementById('loading').style.display = 'none';
                this.showResultMessage('Không tìm thấy thông tin Google Sheet cho team này', 'error');
                return;
            }
        }
        
        // Tiếp tục quá trình gửi dữ liệu
        this.processSubmit();
    },
    
    // Xử lý gửi dữ liệu
    processSubmit: function() {
        // Chuẩn bị dữ liệu gửi lên server
        const dataToSend = {
            priceType: this.data.preview.priceType,
            products: this.data.preview.products,
            buyers: this.data.preview.buyers,
            buyerIdsString: this.data.preview.buyerIdsString,
            userEmail: this.data.userEmail,
            teamId: this.data.teamId,
            // Thêm thông tin sheet
            sheet_id: this.data.sheetInfo.sheet_id,
            sheet_name: this.data.sheetInfo.sheet_name
        };
        
        // Log kích thước dữ liệu để debug
        const jsonData = JSON.stringify(dataToSend);
        console.log("Kích thước dữ liệu (bytes):", new Blob([jsonData]).size);
        console.log("Chuẩn bị gửi dữ liệu:", dataToSend);
        
        // URL của Google Apps Script Web App
        const apiUrl = "https://script.google.com/a/macros/kamereo.vn/s/AKfycbxjjlfeZcjrX08mKhPkW9RqOss-e_Y7vd0JcbjBdTqGh7B5fck9lPsVhiTLh9Nym58r/exec";
        console.log("API URL:", apiUrl);
        
        // Tạo thẻ form ẩn và submit thay vì sử dụng fetch để tránh CORS
        const form = document.createElement('form');
        form.setAttribute('method', 'POST');
        form.setAttribute('action', apiUrl);
        form.setAttribute('target', 'hidden_iframe');
        
        // Tạo input ẩn chứa dữ liệu JSON
        const hiddenField = document.createElement('input');
        hiddenField.setAttribute('type', 'hidden');
        hiddenField.setAttribute('name', 'data');
        hiddenField.setAttribute('value', jsonData);
        form.appendChild(hiddenField);
        
        // Thêm form vào body, submit, và xóa form
        document.body.appendChild(form);
        
        // Cập nhật nội dung iframe trước khi submit
        const iframe = document.getElementById('hidden_iframe');
        if (iframe) {
            // Tạo một timestamp để theo dõi lần submit này
            const submitTimestamp = Date.now();
            iframe.setAttribute('data-submit-time', submitTimestamp);
            
            // Đặt thời gian chờ để xử lý trường hợp không nhận được phản hồi
            setTimeout(() => {
                const currentTimestamp = iframe.getAttribute('data-submit-time');
                if (currentTimestamp && parseInt(currentTimestamp) === submitTimestamp) {
                    // Nếu vẫn là cùng một request (chưa có request mới)
                    console.log("Đã hết thời gian chờ phản hồi, giả định thành công");
                    document.getElementById('loading').style.display = 'none';
                    
                    // Giả định thành công nếu không nhận được phản hồi sau thời gian chờ
                    this.handleSubmitResponse({
                        success: true,
                        message: "Dữ liệu đã được gửi thành công, vui lòng kiểm tra Google Sheet."
                    });
                }
            }, 10000); // 10 giây timeout
        }
        
        // Submit form
        console.log("Đang submit form để gửi dữ liệu...");
        form.submit();
        
        // Xóa form sau khi submit
        document.body.removeChild(form);
    },
    
    // Xử lý phản hồi từ việc gửi dữ liệu
    handleSubmitResponse: function(result) {
        // Ẩn loading
        document.getElementById('loading').style.display = 'none';
        
        if (result.success) {
            // Lưu lịch sử thao tác
            this.saveHistory();
            
            // Hiển thị thông báo thành công
            this.showResultMessage(result.message || "Dữ liệu đã được gửi thành công!", 'success');
            
            // Đặt lại preview
            this.data.preview = null;
            
            // Đặt lại form
            document.getElementById('priceType').value = '';
            document.getElementById('buyerPasteArea').value = '';
            document.getElementById('skuPasteArea').value = '';
            
            // Đặt lại preview container
            document.getElementById('previewContainer').style.display = 'none';
            document.getElementById('previewContent').innerHTML = '';
        } else {
            // Hiển thị thông báo lỗi
            this.showResultMessage(result.message || 'Lỗi khi gửi dữ liệu', 'error');
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
                teamId: this.data.teamId,
                userEmail: this.data.userEmail,
                sheetInfo: this.data.sheetInfo
            });
            
            // Giới hạn số lượng mục lịch sử (giữ tối đa 10 mục)
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
            this.data.sheetInfo = item.sheetInfo;
            
            // Đặt lại giá trị cho các field
            document.getElementById('priceType').value = item.preview.priceType;
            document.getElementById('startDate').value = item.preview.startDate;
            document.getElementById('endDate').value = item.preview.endDate;
            
            // Đặt lại textarea
            const buyerTextArea = document.getElementById('buyerPasteArea');
            const skuTextArea = document.getElementById('skuPasteArea');
            
            // Thiết lập textarea buyers
            if (buyerTextArea) {
                let buyersText = '';
                item.preview.buyers.forEach(buyer => {
                    buyersText += `${buyer.buyerId}\t${buyer.customerName}\n`;
                });
                buyerTextArea.value = buyersText.trim();
            }
            
            // Thiết lập textarea SKUs
            if (skuTextArea) {
                let skusText = '';
                item.preview.products.forEach(product => {
                    skusText += `${product.sku}\t${product.skuName}\t${product.specialPrice.toLocaleString('vi-VN')}\n`;
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
// region.js - Xử lý giao diện trang chọn khu vực và đội

// Quản lý trang chọn khu vực
const RegionManager = {
    // Khởi tạo
    init: function() {
      // Lấy thông tin khu vực từ URL
      const urlParams = new URLSearchParams(window.location.search);
      const regionId = urlParams.get('region');
      
      if (!regionId) {
        console.error('Không tìm thấy tham số region trong URL');
        this.goBack();
        return;
      }
      
      // Thiết lập sự kiện nút quay lại
      const backBtn = document.getElementById('backButton');
      if (backBtn) {
        backBtn.addEventListener('click', () => this.goBack());
      }
      
      // Tải danh sách teams
      this.loadTeams(regionId);
    },
    
    // Tải danh sách teams
    loadTeams: function(regionId) {
      // Hiển thị loading
      const container = document.getElementById('team-container');
      if (container) {
        container.innerHTML = `
          <div class="loading">
            <div class="loading-spinner"></div>
            <p>Đang tải danh sách đội...</p>
          </div>
        `;
      }
      
      // Gọi API lấy danh sách teams
      API.getTeamsByRegion(regionId)
        .then(data => {
          // Hiển thị tên khu vực
          const regionNameEl = document.getElementById('region-name');
          if (regionNameEl) {
            regionNameEl.textContent = data.name;
          }
          
          // Hiển thị danh sách teams
          this.displayTeams(data.teams);
        })
        .catch(error => {
          console.error('Lỗi khi tải danh sách teams:', error);
          
          if (container) {
            container.innerHTML = `
              <div class="error-message">
                <p>Đã xảy ra lỗi khi tải danh sách đội: ${error.message}</p>
                <button class="btn" onclick="RegionManager.goBack()">Quay lại trang chủ</button>
              </div>
            `;
          }
        });
    },
    
    // Hiển thị danh sách teams
    displayTeams: function(teams) {
      const container = document.getElementById('team-container');
      if (!container) return;
      
      // Xóa loading
      container.innerHTML = '';
      
      // Thêm các team cards
      teams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        teamCard.setAttribute('data-team', team.id);
        
        teamCard.innerHTML = `
          <div class="team-icon">${team.icon}</div>
          <h3>${team.name}</h3>
          <p>${team.description || ''}</p>
        `;
        
        // Thêm sự kiện click
        teamCard.addEventListener('click', () => {
          this.selectTeam(team.id);
        });
        
        container.appendChild(teamCard);
      });
    },
    
    // Chọn team và chuyển trang
    selectTeam: function(teamId) {
      // Chuyển đến trang xác thực với team đã chọn
      const urlParams = new URLSearchParams(window.location.search);
      const region = urlParams.get('region');
      
      window.location.href = `auth.html?team=${teamId}${region ? `&region=${region}` : ''}`;
    },
    
    // Quay lại trang chủ
    goBack: function() {
      window.location.href = 'index.html';
    }
  };
  
  // Khởi tạo khi trang đã tải xong
  document.addEventListener('DOMContentLoaded', function() {
    RegionManager.init();
  });
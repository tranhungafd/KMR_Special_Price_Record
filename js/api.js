// api.js - Xử lý các tác vụ lấy dữ liệu

const API = {
  // Lấy thông tin các teams trong khu vực
  getTeamsByRegion: function(regionId) {
    return new Promise((resolve, reject) => {
      // Kiểm tra nếu regionId hợp lệ
      if (CONFIG.REGIONS[regionId]) {
        // Trả về thông tin khu vực (không bao gồm emails và thông tin sheet)
        const region = {
          name: CONFIG.REGIONS[regionId].name,
          teams: CONFIG.REGIONS[regionId].teams.map(team => ({
            id: team.id,
            name: team.name,
            icon: team.icon,
            description: team.description
          }))
        };
        
        // Giả lập độ trễ mạng
        setTimeout(() => {
          resolve(region);
        }, 500);
      } else {
        reject(new Error('Không tìm thấy thông tin khu vực'));
      }
    });
  },

  // Lấy thông tin của một team
  getTeamInfo: function(teamId) {
    return new Promise((resolve, reject) => {
      // Tìm team dựa trên ID
      for (const regionId in CONFIG.REGIONS) {
        const region = CONFIG.REGIONS[regionId];
        for (const team of region.teams) {
          if (team.id === teamId) {
            const teamInfo = {
              id: team.id,
              name: team.name,
              icon: team.icon,
              description: team.description,
              region: regionId
            };
            
            setTimeout(() => {
              resolve(teamInfo);
            }, 300);
            return;
          }
        }
      }
      
      reject(new Error('Không tìm thấy thông tin team'));
    });
  },

  // Kiểm tra quyền truy cập của email vào team - ĐÃ SỬA
  checkTeamAccess: function(teamId, email) {
    return new Promise((resolve, reject) => {
      // Nếu là admin, luôn cho phép truy cập
      if (CONFIG.ADMINS.includes(email)) {
        resolve({
          success: true,
          url: `webapp.html?team=${teamId}&email=${encodeURIComponent(email)}`
        });
        return;
      }
      
      // Tìm team và kiểm tra quyền
      let foundTeam = null;
      let userTeams = []; // Sửa: Thay đổi từ emailTeam thành mảng userTeams
      
      for (const regionId in CONFIG.REGIONS) {
        const region = CONFIG.REGIONS[regionId];
        
        for (const team of region.teams) {
          // Loại bỏ email trùng lặp trong cùng team
          if (team.emails) {
            team.emails = [...new Set(team.emails)];
          }
          
          // Ghi nhận team đang kiểm tra
          if (team.id === teamId) {
            foundTeam = team;
          }
          
          // Kiểm tra xem email thuộc team nào
          if (team.emails && team.emails.includes(email)) {
            userTeams.push(team); // Sửa: Thêm team vào mảng thay vì ghi đè
          }
        }
      }
      
      // Xử lý kết quả
      if (!foundTeam) {
        reject(new Error('Không tìm thấy thông tin team'));
      } else if (userTeams.length === 0) {
        resolve({
          success: false,
          message: 'Bạn không thuộc team Sales nên không có quyền truy cập. Vui lòng liên hệ Admin.'
        });
      } else {
        // Sửa: Kiểm tra xem team được yêu cầu có nằm trong danh sách team mà user có quyền không
        const hasTeamAccess = userTeams.some(team => team.id === teamId);
        
        if (hasTeamAccess) {
          // Email thuộc đúng team yêu cầu
          resolve({
            success: true,
            url: `webapp.html?team=${teamId}&email=${encodeURIComponent(email)}`
          });
        } else {
          // Email thuộc team khác
          const teamNames = userTeams.map(t => t.name).join(', ');
          resolve({
            success: false,
            message: `Bạn không thuộc ${foundTeam.name}. Bạn chỉ có quyền truy cập vào: ${teamNames}.`
          });
        }
      }
    });
  },

  // Lấy thông tin Google Sheet của team
  getTeamSheetInfo: function(teamId) {
    return new Promise((resolve, reject) => {
      // Tìm team dựa trên ID
      for (const regionId in CONFIG.REGIONS) {
        const region = CONFIG.REGIONS[regionId];
        
        for (const team of region.teams) {
          if (team.id === teamId) {
            // Kiểm tra nếu có thông tin sheet
            if (team.sheet_id) {
              const sheetInfo = {
                sheet_id: team.sheet_id,
                sheet_name: team.sheet_name || 'Sheet1',
                sheet_url: `https://docs.google.com/spreadsheets/d/${team.sheet_id}/edit#gid=0`
              };
              
              resolve(sheetInfo);
              return;
            }
          }
        }
      }
      
      // Nếu không tìm thấy, trả về sheet mặc định
      resolve({
        sheet_id: CONFIG.DEFAULT_SHEET_ID,
        sheet_name: CONFIG.DEFAULT_SHEET_NAME,
        sheet_url: CONFIG.DEFAULT_SHEET_URL
      });
    });
  },

  // Lấy tất cả các team mà user có quyền truy cập - Đã Sửa
  getUserAccessibleTeams: function(email) {
    return new Promise((resolve, reject) => {
      // Kiểm tra xem email có hợp lệ không
      if (!email) {
        reject(new Error('Email không được để trống'));
        return;
      }
      
      const accessibleTeams = [];
      const isAdmin = CONFIG.ADMINS.includes(email);
      
      // Duyệt qua tất cả các khu vực và teams
      for (const regionId in CONFIG.REGIONS) {
        const region = CONFIG.REGIONS[regionId];
        
        for (const team of region.teams) {
          // Loại bỏ email trùng lặp trong cùng team
          if (team.emails) {
            team.emails = [...new Set(team.emails)];
          }
          
          // Nếu là admin hoặc email có trong danh sách emails của team
          if (isAdmin || (team.emails && team.emails.includes(email))) {
            accessibleTeams.push({
              id: team.id,
              name: team.name,
              region: regionId,
              regionName: region.name
            });
          }
        }
      }
      
      resolve({
        teams: accessibleTeams,
        isAdmin: isAdmin
      });
    });
  }
};
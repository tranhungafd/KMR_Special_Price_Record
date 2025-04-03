// config.js - Dữ liệu cấu hình cho toàn bộ ứng dụng

const CONFIG = {
  // Dữ liệu các khu vực và teams
  REGIONS: {
    hanoi: {
      name: 'Khu vực Miền Bắc',
      teams: [
        { 
          id: 'sme_hn', 
          name: 'SME Miền Bắc', 
          icon: '👥', 
          description: 'Đội SME khu vực Miền Bắc', 
          emails: ['user1@kamereo.vn', 'admin@kamereo.vn'],
          sheet_id: '1Yib-LG1VBlXruGJcZgEmjE3Qf9Ct37wZKeefTfbtKMk', // ID Google Sheet SME Miền Bắc
          sheet_name: 'Sheet1' // Tên tab sheet trong Google Sheet
        },
        { 
          id: 'ka_hn', 
          name: 'KA Miền Bắc', 
          icon: '🏢', 
          description: 'Đội KA khu vực Miền Bắc', 
          emails: ['user2@kamereo.vn', 'ka.hanoi@kamereo.vn'],
          sheet_id: '1nRYjW0X5NWB5F-XmvMJsmQ-8mgr0UU8gm4ZGUYb5nSU', // ID Google Sheet KA Miền Bắc
          sheet_name: 'Sheet1'
        },
        { 
          id: 'mt_hn', 
          name: 'MT Miền Bắc', 
          icon: '🛒', 
          description: 'Đội MT khu vực Miền Bắc', 
          emails: ['user3@kamereo.vn', 'mt.hanoi@kamereo.vn'],
          sheet_id: '1YaI4aeh8mJ5i1g7fM2JJUSezVDISXAYFbQPH5NEbSUo', // ID Google Sheet MT Miền Bắc
          sheet_name: 'Sheet1'
        }
      ]
    },
    hcm: {
      name: 'Khu vực Miền Nam',
      teams: [
        { 
          id: 'sme_hcm', 
          name: 'SME Miền Nam', 
          icon: '👥', 
          description: 'Đội SME khu vực Miền Nam', 
          emails: ['user4@kamereo.vn', 'sme.hcm@kamereo.vn'],
          sheet_id: '1XkHZ_0PBzBLL-rhW5Ldb5YkxRfXm_WJKQrRYCgd7W5I', // ID Google Sheet SME Miền Nam
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_hcm', 
          name: 'KA Miền Nam', 
          icon: '🏢', 
          description: 'Đội KA khu vực Miền Nam', 
          // Thêm email của bạn vào đây nếu cần
          emails: ['user5@kamereo.vn', 'ka.hcm@kamereo.vn', 'your.email@kamereo.vn'],
          sheet_id: '1UIxh6YeaRgU85pa21nhpe15bUBtTywn5LoK8tafbSJ4', // ID Google Sheet KA Miền Nam
          sheet_name: 'Sheet1'
        },
        { 
          id: 'mt_hcm', 
          name: 'MT Miền Nam', 
          icon: '🛒', 
          description: 'Đội MT khu vực Miền Nam', 
          emails: ['user6@kamereo.vn', 'mt.hcm@kamereo.vn'],
          sheet_id: '1-6pZBacYy_OPhnKE7hMEnHxdXqcXLIkn_H7jdEDZIz0', // ID Google Sheet MT Miền Nam
          sheet_name: 'Sheet1'
        }
      ]
    }
  },

  // Danh sách admin có quyền truy cập mọi team
  // Thêm email của bạn vào đây để có quyền admin nếu cần
  ADMINS: ['viet.truong@kamereo.vn', 'dat.pham@kamereo.vn', 'admin@kamereo.vn', 'your.email@kamereo.vn'],

  // Thời gian phiên làm việc (giờ)
  SESSION_DURATION: 8,
  
  // URL sheet mặc định cho admin nếu cần
  DEFAULT_SHEET_URL: 'https://docs.google.com/spreadsheets/d/1MHrocjehDrOyYgg7sxAI1Coa1WWmu5xynbZGfgRek08/edit?gid=0#gid=0',
  DEFAULT_SHEET_ID: '1MHrocjehDrOyYgg7sxAI1Coa1WWmu5xynbZGfgRek08',
  DEFAULT_SHEET_NAME: 'Sheet1',
  
  // URL của Google Apps Script Web App
  SCRIPT_URL: 'https://script.google.com/a/macros/kamereo.vn/s/AKfycbxjjlfeZcjrX08mKhPkW9RqOss-e_Y7vd0JcbjBdTqGh7B5fck9lPsVhiTLh9Nym58r/exec',
  
  // Cấu hình Google OAuth
  GOOGLE_AUTH: {
    CLIENT_ID: '252140887716-99uet6je2g4r4nouqdrom4jdp93cm9dc.apps.googleusercontent.com',
    HOSTED_DOMAIN: 'kamereo.vn'  // Giới hạn domain đăng nhập
  },
  
  // Cấu hình ứng dụng
  APP: {
    NAME: '[BOS] KMR Special Price Record',
    VERSION: '1.0.0',
    REQUIRED_FIELDS: [
      'priceType', 
      'startDate', 
      'endDate', 
      'buyers', 
      'products'
    ],
    MIN_PRICE: 1000,  // Giá tối thiểu (VND)
    MAX_DURATION_MONTHS: 3  // Thời gian áp dụng tối đa (tháng)
  },
  
  // Cấu hình debug và phát triển
  DEBUG: {
    ENABLED: true,  // Đã bật chế độ debug để dễ dàng khắc phục lỗi
    LOG_LEVEL: 'info',  // error, warn, info, debug
    MOCK_API: false  // Giả lập API (không gọi thực sự)
  }
};
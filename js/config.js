// config.js - Dữ liệu cấu hình cho toàn bộ ứng dụng

const CONFIG = {
  // Dữ liệu các khu vực và teams
  REGIONS: {
    hanoi: {
      name: 'Khu vực Miền Bắc',
      teams: [
        { 
          id: 'sme_hn', 
          name: 'SME khu vực Miền Bắc', 
          icon: '👥', 
          description: 'Quản lý khách hàng SME tại khu vực miền Bắc', 
          emails: ['user1@kamereo.vn', 'user2@kamereo.vn'], 
          sheet_id: '1Yib-LG1VBlXruGJcZgEmjE3Qf9Ct37wZKeefTfbtKMk',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_mt_hn', 
          name: 'KA MT khu vực Miền Bắc', 
          icon: '🛒', 
          description: 'Quản lý khách hàng MT lớn tại miền Bắc',
          emails: ['user3@kamereo.vn', 'user4@kamereo.vn'],
          sheet_id: '1nRYjW0X5NWB5F-XmvMJsmQ-8mgr0UU8gm4ZGUYb5nSU',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_fc_hn', 
          name: 'KA FC khu vực Miền Bắc', 
          icon: '🏢', 
          description: 'Quản lý khách hàng FC tại miền Bắc',
          emails: ['user5@kamereo.vn', 'user6@kamereo.vn'],
          sheet_id: '1YaI4aeh8mJ5i1g7fM2JJUSezVDISXAYFbQPH5NEbSUo',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_school_hn', 
          name: 'KA School Factory khu vực Miền Bắc', 
          icon: '🏫', 
          description: 'Quản lý khách hàng trường học tại miền Bắc',
          emails: ['user7@kamereo.vn', 'user8@kamereo.vn'],
          sheet_id: '1nRYjW0X5NWB5F-XmvMJsmQ-8mgr0UU8gm4ZGUYb5nSU',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_hotel_hn', 
          name: 'KA Hotel Convention khu vực Miền Bắc', 
          icon: '🏨', 
          description: 'Quản lý khách hàng khách sạn tại miền Bắc',
          emails: ['user9@kamereo.vn', 'user10@kamereo.vn'],
          sheet_id: '1YaI4aeh8mJ5i1g7fM2JJUSezVDISXAYFbQPH5NEbSUo',
          sheet_name: 'Sheet1'
        }
      ]
    },
    hcm: {
      name: 'Khu vực Miền Nam',
      teams: [
        { 
          id: 'sme_hcm', 
          name: 'SME khu vực Miền Nam', 
          icon: '👥', 
          description: 'Quản lý khách hàng SME tại khu vực miền Nam',
          emails: ['user11@kamereo.vn', 'user12@kamereo.vn'],
          sheet_id: '1XkHZ_0PBzBLL-rhW5Ldb5YkxRfXm_WJKQrRYCgd7W5I',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_mt_hcm', 
          name: 'KA MT khu vực Miền Nam', 
          icon: '🛒', 
          description: 'Quản lý khách hàng MT lớn tại miền Nam',
          emails: ['user13@kamereo.vn', 'user14@kamereo.vn'],
          sheet_id: '1UIxh6YeaRgU85pa21nhpe15bUBtTywn5LoK8tafbSJ4',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_fc_hcm', 
          name: 'KA FC khu vực Miền Nam', 
          icon: '🏢', 
          description: 'Quản lý khách hàng FC tại miền Nam',
          emails: ['user15@kamereo.vn', 'user16@kamereo.vn'],
          sheet_id: '1-6pZBacYy_OPhnKE7hMEnHxdXqcXLIkn_H7jdEDZIz0',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_school_hcm', 
          name: 'KA School Factory khu vực Miền Nam', 
          icon: '🏫', 
          description: 'Quản lý khách hàng trường học tại miền Nam',
          emails: ['user17@kamereo.vn', 'user18@kamereo.vn'],
          sheet_id: '1UIxh6YeaRgU85pa21nhpe15bUBtTywn5LoK8tafbSJ4',
          sheet_name: 'Sheet1'
        },
        { 
          id: 'ka_hotel_hcm', 
          name: 'KA Hotel Convention khu vực Miền Nam', 
          icon: '🏨', 
          description: 'Quản lý khách hàng khách sạn tại miền Nam',
          emails: ['user19@kamereo.vn', 'user20@kamereo.vn'],
          sheet_id: '1-6pZBacYy_OPhnKE7hMEnHxdXqcXLIkn_H7jdEDZIz0',
          sheet_name: 'Sheet1'
        }
      ]
    }
  },

  // Danh sách admin có quyền truy cập mọi team - Giữ nguyên
  ADMINS: ['viet.truong@kamereo.vn', 'dat.pham@kamereo.vn', 'admin@kamereo.vn', 'khanh.le@kamereo.vn'],

  // Thời gian phiên làm việc (giờ) - Giữ nguyên
  SESSION_DURATION: 8,
  
  // URL sheet mặc định cho admin nếu cần - Giữ nguyên
  DEFAULT_SHEET_URL: 'https://docs.google.com/spreadsheets/d/1MHrocjehDrOyYgg7sxAI1Coa1WWmu5xynbZGfgRek08/edit?gid=0#gid=0',
  DEFAULT_SHEET_ID: '1MHrocjehDrOyYgg7sxAI1Coa1WWmu5xynbZGfgRek08',
  DEFAULT_SHEET_NAME: 'Sheet1',
  
  // URL của Google Apps Script Web App 
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz6UAGgPphZOfxbRJRoS37g_K7WW4xLa-VnVSFhwXw-HMomXjSDwlTQr_csBUXVBmSs/exec',
  
  // Cấu hình Google OAuth - Giữ nguyên
  GOOGLE_AUTH: {
    CLIENT_ID: '252140887716-99uet6je2g4r4nouqdrom4jdp93cm9dc.apps.googleusercontent.com',
    HOSTED_DOMAIN: 'kamereo.vn'
  },
  
  // Cấu hình ứng dụng - Giữ nguyên
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
    MIN_PRICE: 1000,
    MAX_DURATION_MONTHS: 3
  },
  
  // Cấu hình debug và phát triển
  DEBUG: {
    ENABLED: true,
    LOG_LEVEL: 'info',
    MOCK_API: false
  }
};
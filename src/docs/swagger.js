 import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Halo API Documentation',
      version: '1.0.0',
      description: 'API documentation for Halo application - Order Management System',
      contact: {
        name: 'Halo Support',
        email: 'support@halo.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.halo.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            fullName: {
              type: 'string',
              description: 'Full name of the user'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['admin', 'sale', 'in', 'catKhung', 'sanXuat', 'dongGoi', 'keToanDieuDon', 'keToanTaiChinh', 'thietKe', 'marketing']
              },
              description: 'User roles'
            },
            active: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Order ID'
            },
            orderCode: {
              type: 'string',
              description: 'Unique order code'
            },
            customerName: {
              type: 'string',
              description: 'Customer name'
            },
            customerPhone: {
              type: 'string',
              description: 'Customer phone number'
            },
            customerAddress: {
              type: 'string',
              description: 'Customer address'
            },
            orderType: {
              type: 'string',
              enum: ['thuong', 'gap', 'tiktok', 'shopee'],
              description: 'Type of order'
            },
            status: {
              type: 'string',
              enum: ['moi_tao', 'dang_xu_ly', 'cho_san_xuat', 'da_vao_khung', 'cho_dong_goi', 'da_dong_goi', 'cho_dieu_don', 'da_gui_di', 'hoan_thanh', 'khach_tra_hang', 'khach_yeu_cau_sua', 'da_nhan_lai_don', 'dong_goi_da_nhan_lai', 'gui_lai_san_xuat', 'cho_san_xuat_lai', 'huy'],
              description: 'Order status'
            },
            printingStatus: {
              type: 'string',
              enum: ['chua_in', 'dang_in', 'da_in'],
              description: 'Printing status'
            },
            frameCuttingStatus: {
              type: 'string',
              enum: ['chua_cat', 'dang_cat', 'da_cat_khung', 'khong_cat_khung'],
              description: 'Frame cutting status'
            },
            totalAmount: {
              type: 'number',
              description: 'Total order amount'
            },
            depositAmount: {
              type: 'number',
              description: 'Deposit amount'
            },
            note: {
              type: 'string',
              description: 'Order notes'
            },
            paintings: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Painting'
              }
            },
            createdBy: {
              $ref: '#/components/schemas/User'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Painting: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['tranh_khung', 'tranh_tron', 'tranh_dan', 'chi_in']
            },
            quantity: {
              type: 'number'
            },
            dimensions: {
              type: 'string'
            },
            frameType: {
              type: 'string'
            },
            image: {
              type: 'string',
              description: 'Image URL'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of image URLs'
            },
            files: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of file URLs'
            },
            note: {
              type: 'string'
            },
            printingStatus: {
              type: 'string',
              enum: ['chua_in', 'dang_in', 'da_in']
            },
            frameCuttingStatus: {
              type: 'string',
              enum: ['chua_cat', 'dang_cat', 'da_cat_khung', 'khong_cat_khung']
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            recipient: {
              type: 'string',
              description: 'Recipient user ID'
            },
            sender: {
              $ref: '#/components/schemas/User'
            },
            title: {
              type: 'string'
            },
            message: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['order', 'system']
            },
            read: {
              type: 'boolean'
            },
            link: {
              type: 'string'
            },
            orderId: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and user management endpoints'
      },
      {
        name: 'Orders',
        description: 'Order management endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin-only endpoints'
      },
      {
        name: 'Notifications',
        description: 'Notification management endpoints'
      },
      {
        name: 'Upload',
        description: 'File upload endpoints'
      },
      {
        name: 'User',
        description: 'User management endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

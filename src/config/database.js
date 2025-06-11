// src/config/database.js
const { PrismaClient } = require('@prisma/client');

class DatabaseManager {
    constructor() {
        this.prisma = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            this.prisma = new PrismaClient({
                log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
                errorFormat: 'pretty',
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL || "mysql://root:@localhost:3306/realestate"
                    }
                }
            });

            // تفعيل connection pooling
            await this.prisma.$connect();
            this.isConnected = true;

            console.log('✅ Database connected successfully via Prisma');
            
            // تشغيل health check
            await this.healthCheck();
            
            return this.prisma;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            await this.prisma.$queryRaw`SELECT 1 as test`;
            console.log('✅ Database health check passed');
            return true;
        } catch (error) {
            console.error('❌ Database health check failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.prisma) {
                await this.prisma.$disconnect();
                this.isConnected = false;
                console.log('✅ Database disconnected');
            }
        } catch (error) {
            console.error('❌ Error disconnecting database:', error);
        }
    }

    getPrisma() {
        if (!this.prisma || !this.isConnected) {
            throw new Error('Database not connected. Call initialize() first.');
        }
        return this.prisma;
    }

    // Transaction wrapper
    async transaction(callback) {
        return await this.prisma.$transaction(callback);
    }

    // Raw query wrapper with error handling
    async rawQuery(query, params = []) {
        try {
            return await this.prisma.$queryRawUnsafe(query, ...params);
        } catch (error) {
            console.error('Raw query error:', { query, params, error });
            throw error;
        }
    }

    // Batch operations
    async batch(operations) {
        return await this.prisma.$transaction(operations);
    }
}

// Singleton instance
const dbManager = new DatabaseManager();

// إعداد graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received, shutting down database connection...`);
    await dbManager.disconnect();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // لـ nodemon

module.exports = {
    dbManager,
    // تصدير الـ instance للاستخدام المباشر
    prisma: () => dbManager.getPrisma()
};


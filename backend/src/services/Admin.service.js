const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const { UserModel } = require("../models")
const ApiError = require("../utils/ApiError")
const { generatoken } = require("../utils/Token.utils")
const bcrypt = require("bcryptjs")

class AdminService {
    static async createTestUsers() {
        const testUsers = [
            {
                email: "admin@test.com",
                name: "Admin User",
                password: "admin123",
                role: "admin"
            },
            {
                email: "manager@test.com", 
                name: "Manager User",
                password: "manager123",
                role: "manager"
            },
            {
                email: "staff@test.com",
                name: "Staff User", 
                password: "staff123",
                role: "warehouse_staff"
            }
        ]

        const results = []
        
        for (const userData of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await UserModel.findOne({ email: userData.email })
                if (existingUser) {
                    results.push({ email: userData.email, status: "already exists", role: userData.role })
                    continue
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(userData.password, 10)

                // Create user
                const user = await UserModel.create({
                    email: userData.email,
                    name: userData.name,
                    password: hashedPassword,
                    role: userData.role
                })

                // Generate token
                const token = generatoken(user)

                results.push({ 
                    email: userData.email, 
                    status: "created", 
                    role: userData.role,
                    token: token.substring(0, 50) + "..." // Show partial token for testing
                })
            } catch (error) {
                results.push({ 
                    email: userData.email, 
                    status: "error", 
                    error: error.message 
                })
            }
        }

        return {
            message: "Test users creation completed",
            results
        }
    }

    static async getUsersByRole(role) {
        const users = await UserModel.find({ role })
            .select("name email role createdAt")
            .sort({ createdAt: -1 })

        return {
            role,
            count: users.length,
            users
        }
    }

    static async getAllUsers() {
        const users = await UserModel.find({})
            .select("name email role createdAt")
            .sort({ createdAt: -1 })

        return {
            total: users.length,
            users
        }
    }
}

module.exports = AdminService

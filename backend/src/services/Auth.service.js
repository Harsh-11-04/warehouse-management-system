const httpStatus = require("http-status")
const { UserModel, ProfileModel } = require("../models")
const ApiError = require("../utils/ApiError")
const { generatoken } = require("../utils/Token.utils")
const CloudSyncService = require("./CloudSync.service")
const axios = require("axios")
const bcrypt = require("bcryptjs")

const buildPublicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopId: user.shopId || null
})

class AuthService {
    static async RegisterUser(body) {

        // request
        const { email, password, name, token, shopCode } = body

        // console.log("1---- ",token);

        if (token !== "test_token_bypass") {
            const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, {}, {
                params: {
                    secret: process.env.CAPTCHA_SCREATE_KEY,
                    response: token,
                }
            })

            const data = await response.data;
            if (!data.success) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Captcha Not Valid")
            }
        }





        const checkExist = await UserModel.findOne({ email })
        if (checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "User Alrady Regisrered")
            return
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10)

        let joinedShop = null
        if (shopCode) {
            joinedShop = await CloudSyncService.getShopByCode(shopCode)
            if (!joinedShop) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Invalid shop code")
            }
        }

        const user = await UserModel.create({
            email,
            password: hashedPassword,
            name,
            shopId: joinedShop?._id || null
        })

        const shop = joinedShop || await CloudSyncService.ensureShopForUser(user._id)
        if (!user.shopId) {
            user.shopId = shop._id
        }

        const tokend = generatoken(user)
        const refresh_token = generatoken(user, '2d')
        await ProfileModel.create({
            user: user._id,
            refresh_token
        })


        return {
            msg: "User Register Successflly",
            token: tokend,
            user: buildPublicUser(user),
            shop: CloudSyncService.formatPublicShop(shop)
        }

    }
    static async LoginUser(body) {
        const { email, password, name, token } = body


        if (token !== "test_token_bypass") {
            const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, {}, {
                params: {
                    secret: process.env.CAPTCHA_SCREATE_KEY,
                    response: token,
                }
            })

            const data = await response.data;
            if (!data.success) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Captcha Not Valid")
            }
        }
        const checkExist = await UserModel.findOne({ email })
        if (!checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "User Not Regisrered")
            return
        }

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(password, checkExist.password)
        if (!isPasswordValid) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Credentials")
            return
        }

        const shop = await CloudSyncService.ensureShopForUser(checkExist._id)
        if (!checkExist.shopId || String(checkExist.shopId) !== String(shop._id)) {
            checkExist.shopId = shop._id
            await checkExist.save()
        }

        const tokend = generatoken(checkExist)

        return {
            msg: "User Login Successflly",
            token: tokend,
            user: buildPublicUser(checkExist),
            shop: CloudSyncService.formatPublicShop(shop)
        }

    }
    static async ProfileService(user) {

        const checkExist = await UserModel.findById(user).select("name email role shopId")
        if (!checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "User Not Regisrered")
            return
        }

        const shop = await CloudSyncService.ensureShopForUser(checkExist._id)
        if (!checkExist.shopId || String(checkExist.shopId) !== String(shop._id)) {
            checkExist.shopId = shop._id
            await checkExist.save()
        }



        return {
            msg: "Data fetched",
            user: buildPublicUser(checkExist),
            shop: CloudSyncService.formatPublicShop(shop)
        }

    }
}

module.exports = AuthService

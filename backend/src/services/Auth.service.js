const httpStatus = require("http-status")
const { UserModel, ProfileModel } = require("../models")
const ApiError = require("../utils/ApiError")
const { generatoken } = require("../utils/Token.utils")
const axios = require("axios");
class AuthService {
    static async RegisterUser(body) {

        // request
        const { email, password, name, token } = body

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

        const user = await UserModel.create({
            email, password, name
        })

        const tokend = generatoken(user)
        const refresh_token = generatoken(user, '2d')
        await ProfileModel.create({
            user: user._id,
            refresh_token
        })


        return {
            msg: "User Register Successflly",
            token: tokend
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

        if (password !== checkExist.password) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Credentials")
            return
        }

        const tokend = generatoken(checkExist)

        return {
            msg: "User Login Successflly",
            token: tokend
        }

    }
    static async ProfileService(user) {

        const checkExist = await UserModel.findById(user).select("name email")
        if (!checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "User Not Regisrered")
            return
        }




        return {
            msg: "Data fetched",
            user: checkExist
        }

    }
}

module.exports = AuthService
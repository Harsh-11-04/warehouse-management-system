const jwt = require("jsonwebtoken")
const { PUBLIC_DATA } = require("../../constant")

exports.generatoken = (user, expire = '1d') => {
    const token = jwt.sign({
        userId: user._id,
        role: user.role || 'warehouse_staff'
    }, PUBLIC_DATA.jwt_auth, {
        expiresIn: expire
    })
    return token
}


exports.validateToken = (token) => {
    const tokens = jwt.verify(token, PUBLIC_DATA.jwt_auth)
    return tokens
}